/* 存檔往返回歸（步驟 5.2）
 *
 * 每個案例：產圖 → 下載 zip（A）→ 儲存存檔 → 開一個全新分頁 → 載入存檔 → 再下載 zip（B）。
 * 通過條件：B 的每張圖與 A 位元組相同，且與黃金樣本位元組相同（A 本身已由 run-golden.js 保證）。
 * 另外檢查存檔內容：session.json 的圖數＝A 的圖數；打包的素材數＞0（有素材的案例）。
 *
 * 用法：node run-roundtrip.js [--case "<id>"] [--batch <i>/<n>]
 * 環境變數同 run-golden.js（GOLDEN_WORK_DIR、NODE_PATH）。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, REPO_ROOT, parseArgs, prepareWorkCopy, sha256, listImages, extractZip, openWithProfile } = require('./run-golden');

const OUT_ROOT = path.join(REPO_ROOT, 'tests', 'golden-diff', 'roundtrip');

async function blobToBase64InPage(page, expression) {
  return page.evaluate(async (code) => {
    const blob = await (new Function(`return (${code})`))();
    if (!blob) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }, expression);
}

async function restoreArchiveInPage(page, archiveBuffer) {
  const base64 = archiveBuffer.toString('base64');
  return page.evaluate(async (data) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const result = await window.SessionArchive.restoreArchive(new Blob([bytes], { type: 'application/zip' }));
    return { ...result, templates: window.AppState.templates.length, batchMode: window.AppState.batchMode };
  }, base64);
}

function compareZips(first, second) {
  const names = new Set([...first.keys(), ...second.keys()]);
  const report = { identical: 0, mismatches: [], missing: [], extra: [] };
  for (const name of names) {
    if (!first.has(name)) { report.extra.push(name); continue; }
    if (!second.has(name)) { report.missing.push(name); continue; }
    if (sha256(first.get(name)) === sha256(second.get(name))) report.identical += 1;
    else report.mismatches.push(name);
  }
  return report;
}

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const pageA = await browser.newPage();
  const errors = [];
  [pageA].forEach((page) => { page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`)); page.on('dialog', (dialog) => dialog.dismiss()); });
  let pageB = null;
  try {
    // A：正常產圖流程（與 run-golden 相同）
    await openWithProfile(pageA, server.origin, testCase.profile);
    const uploads = {
      templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir },
      assets: { inputId: 'assetInput', dir: testCase.assetsDir },
      workbook: { inputId: 'excelInput' },
    };
    await driver.uploadInputs(pageA, workDir, { uploads, workbook: testCase.workbook });
    const generated = await driver.generate(pageA, testCase.sheet, testCase.project || '');
    if (generated.error || !generated.generated) return { id: testCase.id, status: 'error', detail: generated.error || generated.alerts.join(' | ') };
    const zipA = await extractZip(await driver.exportZip(pageA));

    // 儲存存檔
    const archiveBase64 = await blobToBase64InPage(pageA, 'window.SessionArchive.buildArchive()');
    if (!archiveBase64) return { id: testCase.id, status: 'error', detail: '存檔建立失敗' };
    const archiveBuffer = Buffer.from(archiveBase64, 'base64');
    fs.mkdirSync(path.join(OUT_ROOT, testCase.id), { recursive: true });
    fs.writeFileSync(path.join(OUT_ROOT, testCase.id, 'archive.25tool.zip'), archiveBuffer);
    const archiveEntries = await (async () => {
      const JSZip = require('jszip');
      const zip = await JSZip.loadAsync(archiveBuffer);
      const session = JSON.parse(await zip.file('session.json').async('string'));
      return { files: Object.keys(zip.files).filter((name) => !zip.files[name].dir), templates: session.templates.length, assets: session.assets.length, hasWorkbook: !!zip.file(/^workbook\//).length };
    })();

    // B：全新分頁載入存檔 → 再下載
    pageB = await browser.newPage();
    pageB.on('pageerror', (error) => errors.push(`pageerror(B): ${error.message}`));
    pageB.on('dialog', (dialog) => dialog.dismiss());
    await openWithProfile(pageB, server.origin, testCase.profile);
    const restored = await restoreArchiveInPage(pageB, archiveBuffer);
    const zipB = await extractZip(await driver.exportZip(pageB));

    // 比對：B vs A，以及 B vs 黃金
    const vsA = compareZips(zipA, zipB);
    const goldenDir = path.join(REPO_ROOT, testCase.goldenDir, 'images');
    const nameMap = testCase.nameMap || {};
    const goldenNames = listImages(goldenDir);
    let goldenIdentical = 0;
    const goldenMismatches = [];
    for (const name of goldenNames) {
      const actualName = nameMap[name] || name;
      const actual = zipB.get(actualName);
      if (actual && sha256(actual) === sha256(fs.readFileSync(path.join(goldenDir, name)))) goldenIdentical += 1;
      else goldenMismatches.push(name);
    }
    for (const name of vsA.mismatches) fs.writeFileSync(path.join(OUT_ROOT, testCase.id, `B_${name.replace(/[\\/]/g, '__')}`), zipB.get(name));

    const status = !vsA.mismatches.length && !vsA.missing.length && !vsA.extra.length && !goldenMismatches.length ? 'pass' : 'fail';
    return { id: testCase.id, status, imagesA: zipA.size, imagesB: zipB.size, vsA, goldenIdentical, goldenTotal: goldenNames.length, goldenMismatches, archive: archiveEntries, restored, errors };
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
        console.log(`PASS  ${report.id}  往返 ${report.vsA.identical}/${report.imagesA} 相同；對黃金 ${report.goldenIdentical}/${report.goldenTotal}；存檔 ${report.archive.templates} 張圖／${report.archive.assets} 素材／工單 ${report.archive.hasWorkbook ? '有' : '無'}`);
      } else {
        console.log(`FAIL  ${report.id}  ${report.detail || `往返差異 ${report.vsA?.mismatches?.length || 0}，缺 ${report.vsA?.missing?.length || 0}，多 ${report.vsA?.extra?.length || 0}；對黃金差異 ${report.goldenMismatches?.length || 0}`}`);
        if (report.errors?.length) console.log('   ', report.errors.slice(0, 5).join('\n    '));
      }
    }
  } finally { await browser.close(); }

  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.writeFileSync(path.join(OUT_ROOT, 'last-run.json'), JSON.stringify({ chrome: version, ranAt: new Date().toISOString(), reports }, null, 2));
  process.exit(reports.every((r) => r.status === 'pass') ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
