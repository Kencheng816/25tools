'use strict';

const path = require('path');
const fs = require('fs');
const { setInputFiles, setInputFilesSorted } = require('./browser');

function listFilesRecursive(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFilesRecursive(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

const ALL_PROJECTS_VALUE = '__ALL__';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 等待 App 啟動完成（rules loader 跑完、App.init 執行過）。 */
async function waitForAppReady(page) {
  await page.waitForFunction(
    () => window.__rulesLoadResult && window.AppState && window.BatchManager && window.ExportManager,
    { timeout: 60000 },
  );
  const rules = await page.evaluate(() => window.__rulesLoadResult);
  if (rules.error) throw new Error(`規則檔載入失敗：${rules.error}`);
  return rules;
}

/**
 * 等待某個計數「大於 0 且連續 stableMs 毫秒不再變動」。
 * 部分工具（如 network）是逐檔 push 進 AppState.templates，只等 >0 會在載入途中就往下走。
 */
async function waitForStableCount(page, readCount, { stableMs = 1500, timeoutMs = 120000 } = {}) {
  const startedAt = Date.now();
  let last = -1;
  let stableSince = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const current = await page.evaluate(readCount);
    if (current !== last) { last = current; stableSince = Date.now(); }
    else if (current > 0 && Date.now() - stableSince >= stableMs) return current;
    await sleep(200);
  }
  throw new Error(`等待載入完成逾時（最後計數 ${last}）`);
}

/** 依原工具操作順序：上傳公版 → 上傳素材 → 上傳工單。 */
async function uploadInputs(page, toolDir, config) {
  const { templates, assets, workbook } = config.uploads;

  // 公版與素材以固定排序餵入（見 browser.js setInputFilesSorted），避免作業系統目錄順序影響模糊比對結果。
  // webkitRelativePath 的根資料夾名固定為 templates／assets（使用者實際選取的資料夾名），
  // 因為 B 系模糊比對會拿路徑跟公版名比對，根資料夾名不同（例如 assets/LineOA）會改變命中結果。
  await setInputFilesSorted(page, templates.inputId, templates.dir, listFilesRecursive(path.join(toolDir, templates.dir)), 'templates');
  await waitForStableCount(page, () => (window.AppState.templates || []).length);

  await setInputFilesSorted(page, assets.inputId, assets.dir, listFilesRecursive(path.join(toolDir, assets.dir)), 'assets');
  await waitForStableCount(page, () => window.AssetStore.getTotalFileCount());

  await setInputFiles(page, workbook.inputId, [path.join(toolDir, config.workbook)]);
  await page.waitForFunction(() => !!window.AppState.excelWorkbook, { timeout: 60000 });

  return page.evaluate(() => ({
    templateCount: window.AppState.templates.length,
    assetCount: window.AssetStore.getTotalFileCount(),
    sheetNames: window.AppState.excelWorkbook.SheetNames,
  }));
}

/** 切換分頁並回傳該分頁偵測到的矩陣式專案名稱（空陣列＝不需選專案）。 */
async function selectSheet(page, sheetName) {
  return page.evaluate((name) => {
    const select = document.getElementById('excelSheetSelect');
    select.value = name;
    // 部分工具（鏡面等）沒有矩陣式專案偵測，選分頁時不做任何事。
    window.BatchManager.detectAndOfferProjectsFromSheet?.(name);
    return [...(window.AppState.detectedExcelProjects || [])];
  }, sheetName);
}

/** 走「預覽檔案」同一條路徑產生批次，回傳產出數與診斷。 */
async function generate(page, sheetName, project) {
  await selectSheet(page, sheetName);
  return page.evaluate(async (projectValue) => {
    window.AppState.currentProject = projectValue || '';
    window.TemplateLoader.updateCurrentProjectDisplay?.();
    const alerts = [];
    const originalAlert = window.alert;
    window.alert = (message) => alerts.push(String(message));
    let error = null;
    try {
      await window.BatchManager.generateFromSelectedSheet();
    } catch (caught) {
      // 原工具在此會 alert 並停在「產生失敗」；這裡改為記錄，讓擷取器能回報而不是中斷。
      error = String(caught?.message || caught);
    } finally {
      window.alert = originalAlert;
    }
    return {
      error,
      generated: error ? 0 : (window.AppState.batchItems || []).length,
      unmatched: (window.AppState.unmatchedBatchItems || []).map((item) => item.name || item.reason || JSON.stringify(item)),
      alerts,
      diagnostics: window.AppState.batchDiagnostics || null,
    };
  }, project);
}

/**
 * 走「下載圖片 → 依規格表（推薦）」同一條路徑（ExportManager.buildZip('auto', true)），
 * 只是略過格式選擇的浮動視窗，直接取回 zip 內容。
 */
async function exportZip(page) {
  const base64 = await page.evaluate(async () => {
    const blob = await window.ExportManager.buildZip('auto', true);
    if (!blob) return null;
    const buffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  });
  return base64 ? Buffer.from(base64, 'base64') : null;
}

/** 取出批次的完整資料（座標/文字/顏色），作為 JSON 層級的黃金樣本。 */
async function dumpSession(page) {
  return page.evaluate(() => ({
    excelFileName: window.AppState.excelFileName,
    sheetName: document.getElementById('excelSheetSelect')?.value || '',
    currentProject: window.AppState.currentProject,
    templates: window.AppState.templates.map((item) => ({
      name: item.name, file: item.file, project: item.project || '', visible: item.visible, data: item.data,
    })),
    unmatched: window.AppState.unmatchedBatchItems || [],
    diagnostics: window.AppState.batchDiagnostics || null,
  }));
}

module.exports = { ALL_PROJECTS_VALUE, sleep, waitForAppReady, uploadInputs, selectSheet, generate, exportZip, dumpSession };
