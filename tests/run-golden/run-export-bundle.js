/* 下載流程 E2E（自 18節 移植：對話框條列＋「依工單規則（推薦）」、zip 附存檔與診斷報告）
 *
 * 每個案例（A 系、B 系、自帶診斷報告的 network 各抽）產圖後：
 *   1. 點「下載圖片」→ 對話框有條列說明（.v3-modal-notes）、主按鈕文字「依工單規則（推薦）」→ 關閉；
 *   2. 以「依工單規則」打包 → zip 內除圖片外，恰好一個 存檔/<…>.25tool.zip 與恰好一個 診斷報告.txt
 *      （network／鏡面／跨夜 原本就有自己的診斷報告 → 不重複附、內容維持原工具格式）；
 *   3. 診斷報告.txt（整合版格式者）含四級標題；
 *   4. 把 zip 內的存檔在全新分頁載回 → 再打包 → 圖片與第一次位元組相同。
 * 用法：node run-export-bundle.js [--case "<id>"]（環境變數同 run-golden.js）。 */
'use strict';

const JSZip = require('jszip');
const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, parseArgs, prepareWorkCopy, sha256, extractZip, openWithProfile } = require('./run-golden');

const DEFAULT_CASE_IDS = ['正式BN/BN 正式', 'OM_w1/外廣_Wave1', 'network/Network_5.19-5.25'];
const OWN_DIAGNOSTICS = new Set(['network', '鏡面', '跨夜']);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function restoreArchiveInPage(page, archiveBuffer) {
  return page.evaluate(async (data) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return window.SessionArchive.restoreArchive(new Blob([bytes], { type: 'application/zip' }));
  }, archiveBuffer.toString('base64'));
}

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const pageA = await browser.newPage();
  const errors = [];
  pageA.on('pageerror', (error) => errors.push(`pageerror: ${error.message.split('\n')[0]}`));
  pageA.on('dialog', (dialog) => dialog.dismiss());
  const problems = [];
  let pageB = null;
  let summary = '';
  try {
    await openWithProfile(pageA, server.origin, testCase.profile);
    await driver.uploadInputs(pageA, workDir, {
      uploads: { templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir }, assets: { inputId: 'assetInput', dir: testCase.assetsDir }, workbook: { inputId: 'excelInput' } },
      workbook: testCase.workbook,
    });
    const generated = await driver.generate(pageA, testCase.sheet, testCase.project || '');
    if (generated.error || !generated.generated) return { id: testCase.id, problems: [generated.error || generated.alerts.join(' | ')], errors };

    // 1. 對話框
    // 直接開對話框（按鈕在左欄「3. 輸出」面板內，headless 視窗裡可能被捲出畫面）；askImageFormat 回傳的 Promise 等使用者點按鈕，不 await。
    await pageA.evaluate(() => { window.ExportManager.askImageFormat(); });
    await sleep(300);
    const dialog = await pageA.evaluate(() => ({
      notes: document.querySelectorAll('.v3-modal .v3-modal-notes li').length,
      primary: document.querySelector('.v3-modal [data-format="auto"]')?.textContent?.trim(),
    }));
    if (dialog.notes < 4) problems.push(`對話框條列只有 ${dialog.notes} 條`);
    if (dialog.primary !== '依工單規則（推薦）') problems.push(`主按鈕文字「${dialog.primary}」`);
    await pageA.evaluate(() => document.querySelector('.v3-modal-backdrop')?.remove());

    // 2. zip 內容
    const zipBuffer = await driver.exportZip(pageA);
    const zip = await JSZip.loadAsync(zipBuffer);
    const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
    const archives = names.filter((name) => /^存檔\/.+\.25tool\.zip$/.test(name));
    const reports = names.filter((name) => /(^|\/)診斷報告\.txt$/.test(name));
    const images = names.filter((name) => /\.(png|jpe?g)$/i.test(name));
    if (archives.length !== 1) problems.push(`zip 內存檔 ${archives.length} 個：${archives.join('、')}`);
    if (reports.length !== 1) problems.push(`zip 內診斷報告 ${reports.length} 個：${reports.join('、')}`);
    if (!images.length) problems.push('zip 內沒有圖片');
    // 3. 診斷報告內容
    if (reports.length === 1) {
      const text = await zip.file(reports[0]).async('string');
      const integrated = /重要且緊急/.test(text) && /重要不緊急/.test(text) && /不重要但緊急/.test(text) && /■ 資訊/.test(text);
      if (OWN_DIAGNOSTICS.has(testCase.profile)) { if (integrated) problems.push('自帶診斷報告的工具被換成整合版格式'); }
      else if (!integrated) problems.push(`診斷報告沒有四級標題：${text.slice(0, 120).replace(/\n/g, ' ')}`);
    }
    summary = `${images.length} 張圖＋存檔＋診斷報告（${OWN_DIAGNOSTICS.has(testCase.profile) ? '原工具格式' : '四級'}）`;

    // 4. 存檔載回 → 再打包 → 圖片相同
    if (archives.length === 1) {
      const archiveBuffer = await zip.file(archives[0]).async('nodebuffer');
      pageB = await browser.newPage();
      pageB.on('pageerror', (error) => errors.push(`pageerror(B): ${error.message.split('\n')[0]}`));
      pageB.on('dialog', (dialog) => dialog.dismiss());
      await openWithProfile(pageB, server.origin, testCase.profile);
      await restoreArchiveInPage(pageB, archiveBuffer);
      const first = await extractZip(zipBuffer);
      const second = await extractZip(await driver.exportZip(pageB));
      const different = [...first.keys()].filter((name) => !second.has(name) || sha256(first.get(name)) !== sha256(second.get(name)));
      if (first.size !== second.size || different.length) problems.push(`zip 內存檔載回後再下載有差：${different.slice(0, 3).join('、')}（${first.size} vs ${second.size} 張）`);
    }
  } finally {
    await pageA.close();
    if (pageB) await pageB.close();
    server.close();
  }
  return { id: testCase.id, problems, errors, summary };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ids = args.case ? [args.case] : DEFAULT_CASE_IDS;
  const cases = CASES.filter((item) => ids.includes(item.id));
  const workDir = prepareWorkCopy();
  const { browser } = await launchBrowser();
  let failures = 0;
  try {
    for (const testCase of cases) {
      const report = await runCase(testCase, workDir, browser).catch((error) => ({ id: testCase.id, problems: [error.message], errors: [] }));
      const all = [...(report.problems || []), ...(report.errors || [])];
      if (all.length) { failures += 1; console.log(`FAIL  ${report.id}\n    ${all.join('\n    ')}`); }
      else console.log(`PASS  ${report.id}  對話框條列＋「依工單規則（推薦）」；zip：${report.summary}；存檔載回再下載相同`);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `run-export-bundle：${failures} 個失敗` : `run-export-bundle：${cases.length} 個案例全部通過`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
