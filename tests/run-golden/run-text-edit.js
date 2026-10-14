/* 文字手動調整 E2E（回饋：文字改了要保留、縮圖要即時更新）
 *
 * 每個案例：產圖 → 下載 zip（A）→ 切到第一張、從 Inspector 的文字框改一個文字層 →
 *   1. 縮圖在 1.5 秒內自動更新（src 改變）；
 *   2. 切到別張再切回來，文字仍是改過的（沒被工單重新套版蓋掉）；
 *   3. 下載 zip（C）只有這一張的輸出跟 A 不同；
 *   4. 儲存存檔 → 全新分頁載回 → 下載 zip（D）與 C 位元組相同、文字仍是改過的。
 * 用法：node run-text-edit.js [--case "<id>"] [--batch <i>/<n>]（環境變數同 run-golden.js）。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, REPO_ROOT, parseArgs, prepareWorkCopy, sha256, extractZip, openWithProfile } = require('./run-golden');

const OUT_ROOT = path.join(REPO_ROOT, 'tests', 'golden-diff', 'text-edit');
const EDIT_SUFFIX = '【改】';

async function blobToBuffer(page, expression) {
  const base64 = await page.evaluate(async (code) => {
    const blob = await (new Function(`return (${code})`))();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }, expression);
  return Buffer.from(base64, 'base64');
}

async function editFirstTextLayer(page, suffix) {
  return page.evaluate(async (editSuffix) => {
    const AppState = window.AppState;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    // 找第一張有「可編輯文字層」的圖（KV 之類第一張可能只有圖片）。
    const editableKey = (template) => Object.keys(template.layers).find((name) => {
      const layer = template.layers[name];
      return layer.type === 'text' && layer.source !== 'auto_price_v2' && !layer.hidden && !layer.locked && String(layer.text || '').trim();
    });
    const index = AppState.templates.findIndex((item) => editableKey(item.data));
    if (index < 0) return { error: '沒有任何一張圖有可編輯的文字層' };
    await window.BatchManager.selectGenerated(index);
    await sleep(300);
    const template = AppState.template;
    const key = editableKey(template);
    const before = template.layers[key].text;
    const thumb = () => document.querySelector(`.batch-thumb[data-index="${index}"] img`)?.src || '';
    const thumbBefore = thumb();
    // 跟使用者一樣：選取圖層 → 在 Inspector 文字框打字（觸發 input 事件）。
    window.LayerManager.select(key);
    const input = document.getElementById('textInput');
    input.value = before + editSuffix;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(1500);
    const thumbUpdated = thumb() !== thumbBefore;
    await window.BatchManager.selectGenerated(index === 0 ? Math.min(1, AppState.templates.length - 1) : 0);
    await sleep(400);
    await window.BatchManager.selectGenerated(index);
    await sleep(600);
    return { index, key, before, after: AppState.template.layers[key].text, thumbUpdated, overrides: Object.keys(AppState.templates[index].data.__manualTextOverrides || {}) };
  }, suffix);
}

function compareZips(first, second) {
  const report = { identical: 0, different: [], missing: [], extra: [] };
  for (const name of new Set([...first.keys(), ...second.keys()])) {
    if (!first.has(name)) report.extra.push(name);
    else if (!second.has(name)) report.missing.push(name);
    else if (sha256(first.get(name)) === sha256(second.get(name))) report.identical += 1;
    else report.different.push(name);
  }
  return report;
}

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const pageA = await browser.newPage();
  const errors = [];
  pageA.on('pageerror', (error) => errors.push(`pageerror: ${error.message.split('\n')[0]}`));
  pageA.on('dialog', (dialog) => dialog.dismiss());
  let pageB = null;
  try {
    await openWithProfile(pageA, server.origin, testCase.profile);
    await driver.uploadInputs(pageA, workDir, {
      uploads: { templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir }, assets: { inputId: 'assetInput', dir: testCase.assetsDir }, workbook: { inputId: 'excelInput' } },
      workbook: testCase.workbook,
    });
    const generated = await driver.generate(pageA, testCase.sheet, testCase.project || '');
    if (generated.error || !generated.generated) return { id: testCase.id, status: 'error', detail: generated.error || generated.alerts.join(' | ') };
    const zipA = await extractZip(await driver.exportZip(pageA));

    const edit = await editFirstTextLayer(pageA, EDIT_SUFFIX);
    if (edit.error) return { id: testCase.id, status: 'error', detail: edit.error };
    const zipC = await extractZip(await driver.exportZip(pageA));
    const cVsA = compareZips(zipA, zipC);
    // 只匯出被改的那張 → 這一張的輸出檔名（同一張圖可能多個輸出）。
    await pageA.evaluate(async (index) => { await window.BatchManager.selectGenerated(index); }, edit.index);
    const touched = [...(await extractZip(await blobToBuffer(pageA, "window.ExportManager.buildZip('auto', false)"))).keys()];

    const archive = await blobToBuffer(pageA, 'window.SessionArchive.buildArchive()');
    fs.mkdirSync(path.join(OUT_ROOT, testCase.id), { recursive: true });
    fs.writeFileSync(path.join(OUT_ROOT, testCase.id, 'archive.25tool.zip'), archive);

    pageB = await browser.newPage();
    pageB.on('pageerror', (error) => errors.push(`pageerror(B): ${error.message.split('\n')[0]}`));
    pageB.on('dialog', (dialog) => dialog.dismiss());
    await openWithProfile(pageB, server.origin, testCase.profile);
    const restored = await pageB.evaluate(async (data, key, index) => {
      const binary = atob(data); const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      await window.SessionArchive.restoreArchive(new Blob([bytes], { type: 'application/zip' }));
      return { text: window.AppState.templates[index]?.data?.layers?.[key]?.text };
    }, archive.toString('base64'), edit.key, edit.index);
    const zipD = await extractZip(await driver.exportZip(pageB));
    const dVsC = compareZips(zipC, zipD);

    const checks = {
      textKept: edit.after === edit.before + EDIT_SUFFIX,
      thumbUpdated: edit.thumbUpdated === true,
      overrideRecorded: edit.overrides.includes(edit.key),
      onlyTouchedChanged: cVsA.different.length > 0 && cVsA.different.every((name) => touched.includes(name)) && !cVsA.missing.length && !cVsA.extra.length,
      restoredText: restored.text === edit.before + EDIT_SUFFIX,
      roundtripSame: !dVsC.different.length && !dVsC.missing.length && !dVsC.extra.length,
    };
    return { id: testCase.id, status: Object.values(checks).every(Boolean) ? 'pass' : 'fail', checks, edit, touched, changed: cVsA.different, errors };
  } finally {
    await pageA.close();
    if (pageB) await pageB.close();
    server.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let selected = args.case ? CASES.filter((c) => c.id === args.case) : CASES;
  if (!selected.length) throw new Error(`找不到案例：${args.case}`);
  const batch = /^(\d+)\/(\d+)$/.exec(String(args.batch || ''));
  if (batch) selected = selected.filter((_, position) => position % Number(batch[2]) === Number(batch[1]) - 1);

  const workDir = prepareWorkCopy();
  const { browser, version } = await launchBrowser();
  const reports = [];
  try {
    for (const testCase of selected) {
      const report = await runCase(testCase, workDir, browser);
      reports.push(report);
      if (report.status === 'pass') console.log(`PASS  ${report.id}  改「${report.edit.key}」→ 縮圖更新、切回仍保留、只有 ${report.changed.length} 張輸出改變、存檔往返一致`);
      else console.log(`FAIL  ${report.id}  ${report.detail || JSON.stringify({ checks: report.checks, edit: report.edit, changed: report.changed, touched: report.touched, errors: report.errors })}`.slice(0, 1200));
    }
  } finally { await browser.close(); }
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.writeFileSync(path.join(OUT_ROOT, 'last-run.json'), JSON.stringify({ chrome: version, ranAt: new Date().toISOString(), reports }, null, 2));
  process.exit(reports.every((r) => r.status === 'pass') ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
