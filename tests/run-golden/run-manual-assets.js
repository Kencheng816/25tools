/* 手動素材 E2E（步驟 5.3）
 *
 * 每個案例：產圖 → 下載 zip（A）→ 在第一張圖挑一個圖片圖層「上傳替換」成測試用純色圖、
 * 再挑另一個圖片圖層「清除圖片」→ 下載 zip（C）→ 儲存存檔 → 全新分頁載回 → 下載 zip（D）。
 * 通過條件：
 *   1. C 裡被改的那張圖與 A 不同（替換／清除真的生效），其餘每張與 A 位元組相同（沒有波及別張）。
 *   2. D 與 C 每張位元組相同（手動結果經存檔往返不變）。
 *   3. 載回後，被改圖層的 __manualAssetOverrides 仍在。
 * 用法：node run-manual-assets.js [--case "<id>"] [--batch <i>/<n>]（環境變數同 run-golden.js）。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, REPO_ROOT, parseArgs, prepareWorkCopy, sha256, extractZip, openWithProfile } = require('./run-golden');

const OUT_ROOT = path.join(REPO_ROOT, 'tests', 'golden-diff', 'manual-assets');

/** 在頁面內：對第 0 張圖挑兩個不同的圖片圖層，一個替換成純色測試圖、一個清除。回傳動到的圖層與輸出名。 */
async function applyManualEdits(page) {
  return page.evaluate(async () => {
    const AppState = window.AppState;
    const entry = AppState.templates[0];
    const template = entry.data;
    // 切到第一張，讓 Inspector／Renderer 都以它為目前公版（跟使用者操作一致）。
    if (typeof window.BatchManager.selectGenerated === 'function') await window.BatchManager.selectGenerated(0);
    else { AppState.activeIndex = 0; AppState.template = template; }

    const imageKeys = Object.entries(template.layers || {})
      .filter(([, layer]) => layer?.type === 'image' && !layer.hidden && !layer.__nonInteractive && String(layer.assetFilename || '').trim())
      .map(([key]) => key);
    if (!imageKeys.length) return { error: '第一張圖沒有可操作的圖片圖層' };
    const replaceKey = imageKeys[0];
    const clearKey = imageKeys.length > 1 ? imageKeys[imageKeys.length - 1] : null;

    // 測試用純色圖（洋紅），用 canvas 產生，不依賴外部檔案。
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ff00ff'; context.fillRect(0, 0, 64, 64);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'manual-test.png', { type: 'image/png' });

    // 替換會同步到「同一同步群組」的其他版位（例如 network 同一列的六個尺寸共用一個 LOGO）；先記下這些張的索引。
    const indexesOfGroup = (layerKey) => window.ManualAssetUpload.groupUsages(template, layerKey, template.layers[layerKey])
      .map(({ template: usedTemplate }) => AppState.templates.findIndex((item) => item.data === usedTemplate))
      .filter((index) => index >= 0);
    const groupIndexes = [...new Set([0, ...indexesOfGroup(replaceKey), ...(clearKey ? indexesOfGroup(clearKey) : [])])].sort((a, b) => a - b);
    const replaced = await window.ManualAssetControls.replaceLayerAsset(replaceKey, template.layers[replaceKey], file, AppState.template);
    let cleared = false;
    if (clearKey) cleared = await window.ManualAssetControls.clearLayerAsset(clearKey, template.layers[clearKey], AppState.template);
    const layer = template.layers[replaceKey];
    return {
      replaceKey, clearKey, replaced, cleared, groupIndexes,
      outputName: String(template.batchRecord?.__outputName || template.templateId || entry.name || ''),
      overrides: Object.keys(template.__manualAssetOverrides || {}),
      replacedAssetFilename: layer.assetFilename,
    };
  });
}

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

async function restoreInPage(page, buffer) {
  return page.evaluate(async (data) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    await window.SessionArchive.restoreArchive(new Blob([bytes], { type: 'application/zip' }));
    const template = window.AppState.templates[0]?.data;
    return { overrides: Object.keys(template?.__manualAssetOverrides || {}) };
  }, buffer.toString('base64'));
}

/** 以「去副檔名」的檔名配對：清除背景後成品出現透明像素，`export.transparentToPng` 會把 .jpg 改存 .png（回饋 1，2026-09-15），
 *  同一張圖換了副檔名要算「被改」而不是「少一張＋多一張」。回報的名稱一律用 second（後一次輸出）的檔名。 */
function compareZips(first, second) {
  const stem = (name) => name.replace(/\.(png|jpe?g)$/i, '');
  const byStem = (zip) => new Map([...zip.keys()].map((name) => [stem(name), name]));
  const firstByStem = byStem(first);
  const secondByStem = byStem(second);
  const report = { identical: [], different: [], missing: [], extra: [] };
  for (const key of new Set([...firstByStem.keys(), ...secondByStem.keys()])) {
    const firstName = firstByStem.get(key);
    const secondName = secondByStem.get(key);
    if (!firstName) report.extra.push(secondName);
    else if (!secondName) report.missing.push(firstName);
    else if (firstName === secondName && sha256(first.get(firstName)) === sha256(second.get(secondName))) report.identical.push(secondName);
    else report.different.push(secondName);
  }
  return report;
}

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const pageA = await browser.newPage();
  const errors = [];
  pageA.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
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

    const edits = await applyManualEdits(pageA);
    if (edits.error) return { id: testCase.id, status: 'error', detail: edits.error };
    const zipC = await extractZip(await driver.exportZip(pageA));
    const cVsA = compareZips(zipA, zipC);
    // 被動到的輸出＝被改那張＋同步群組每一張「只匯出這一張」會產生的檔名（同一張圖可能多個輸出、或被規則改名）。
    const touched = [];
    for (const index of edits.groupIndexes) {
      await pageA.evaluate(async (i) => {
        if (typeof window.BatchManager.selectGenerated === 'function') await window.BatchManager.selectGenerated(i);
        else { window.AppState.activeIndex = i; window.AppState.template = window.AppState.templates[i].data; }
      }, index);
      touched.push(...(await extractZip(await blobToBuffer(pageA, "window.ExportManager.buildZip('auto', false)"))).keys());
    }
    const touchedChanged = touched.filter((name) => cVsA.different.includes(name));
    const untouchedChanged = cVsA.different.filter((name) => !touched.includes(name));

    const archive = await blobToBuffer(pageA, 'window.SessionArchive.buildArchive()');
    fs.mkdirSync(path.join(OUT_ROOT, testCase.id), { recursive: true });
    fs.writeFileSync(path.join(OUT_ROOT, testCase.id, 'archive.25tool.zip'), archive);

    pageB = await browser.newPage();
    pageB.on('pageerror', (error) => errors.push(`pageerror(B): ${error.message}`));
    pageB.on('dialog', (dialog) => dialog.dismiss());
    await openWithProfile(pageB, server.origin, testCase.profile);
    const restored = await restoreInPage(pageB, archive);
    const zipD = await extractZip(await driver.exportZip(pageB));
    const dVsC = compareZips(zipC, zipD);

    const checks = {
      replaced: edits.replaced === true,
      touchedChanged: touched.length > 0 && touchedChanged.length === touched.length,
      untouchedSame: untouchedChanged.length === 0 && !cVsA.missing.length && !cVsA.extra.length,
      roundtripSame: !dVsC.different.length && !dVsC.missing.length && !dVsC.extra.length,
      overridesRestored: restored.overrides.length === edits.overrides.length && edits.overrides.length > 0,
    };
    const status = Object.values(checks).every(Boolean) ? 'pass' : 'fail';
    for (const name of touchedChanged) fs.writeFileSync(path.join(OUT_ROOT, testCase.id, `C_${name.replace(/[\\/]/g, '__')}`), zipC.get(name));
    return { id: testCase.id, status, checks, edits, touched, touchedChanged, untouchedChanged, cVsA: { different: cVsA.different.slice(0, 5), missing: cVsA.missing.slice(0, 5), extra: cVsA.extra.slice(0, 5) }, dVsC: { different: dVsC.different, missing: dVsC.missing, extra: dVsC.extra }, errors };
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
      if (report.status === 'pass') {
        console.log(`PASS  ${report.id}  替換 ${report.edits.replaceKey}／清除 ${report.edits.clearKey || '（只有一個圖層，略過）'}；被改 ${report.touchedChanged.length} 張（同步群組 ${report.edits.groupIndexes.length} 張）、其餘不變；存檔往返一致`);
      } else {
        console.log(`FAIL  ${report.id}  ${report.detail || JSON.stringify({ checks: report.checks, touched: report.touched, touchedChanged: report.touchedChanged, untouchedChanged: report.untouchedChanged?.slice(0, 5), cVsA: report.cVsA, dVsC: report.dVsC, edits: report.edits })}`);
        if (report.errors?.length) console.log('   ', report.errors.slice(0, 5).join('\n    '));
      }
    }
  } finally { await browser.close(); }
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.writeFileSync(path.join(OUT_ROOT, 'last-run.json'), JSON.stringify({ chrome: version, ranAt: new Date().toISOString(), reports }, null, 2));
  process.exit(reports.every((r) => r.status === 'pass') ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
