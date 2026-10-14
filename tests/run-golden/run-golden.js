#!/usr/bin/env node
'use strict';

/**
 * 黃金樣本回歸器：用 headless Chromium 跑「整合版」工具頁（app.html?profile=<分類>；index.html 是入口頁），
 * 餵入與黃金樣本相同的公版／素材／工單，走同一條「預覽檔案 → 下載圖片」路徑，
 * 再把輸出逐張與 tests/golden/<工具>/<分頁>/images/ 比對。
 *
 * 判定：先比 sha256（位元組相同＝通過）；不同時解碼成像素做 pixelmatch，
 *       輸出差異圖到 tests/golden-diff/<case>/，並在結論列出差異像素數。
 *       `診斷報告.txt` 含產生時間，不列入比對（見 tests/golden/README.md）。
 *
 * 用法：node run-golden.js [--case "<id>"] [--batch <i>/<n>] [--threshold 0] [--click-thumbs]
 *       --batch 2/3：只跑第 2 批（案例依序均分成 3 批），供有單次執行時間上限的環境分段跑完。
 *       --click-thumbs：產圖後逐一點過每張縮圖再下載（模擬使用者互動），確認點選不會改變輸出（自 18節 移植：
 *       只走「產圖→下載」抓不到點縮圖時 after-hook 重跑之類的互動路徑）。
 * 環境變數：GOLDEN_WORK_DIR（純 ASCII 暫存路徑）、NODE_PATH（相依套件）。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8')).cases;
const DIFF_ROOT = path.join(REPO_ROOT, 'tests', 'golden-diff');
const SYNC_DIRS = ['core', 'renderers', 'modules', 'smart-assets', 'vendor', 'fonts', 'config', 'rules', 'templates', 'assets', 'launcher', 'tests/golden-inputs'];
const SYNC_FILES = ['index.html', 'app.html', 'style.css', 'theme-25.css'];

const BOOLEAN_FLAGS = ['--click-thumbs'];
function parseArgs(argv) {
  const args = {};
  const tokens = argv.filter((token) => !BOOLEAN_FLAGS.includes(token));
  for (let i = 0; i < tokens.length; i += 2) args[tokens[i].replace(/^--/, '')] = tokens[i + 1];
  BOOLEAN_FLAGS.forEach((flag) => { if (argv.includes(flag)) args[flag.replace(/^--/, '')] = true; });
  return args;
}

/** 模擬使用者逐一點過每張縮圖（點選會重載圖、重畫、可能補跑規則 after-hook），最後回到第一張再下載。 */
async function clickEveryThumb(page) {
  const count = await page.$$eval('.batch-thumb', (nodes) => nodes.length);
  for (let i = 0; i < count; i += 1) {
    await page.evaluate((index) => document.querySelectorAll('.batch-thumb')[index]?.click(), i);
    await page.waitForFunction((index) => window.AppState?.activeIndex === Number(document.querySelectorAll('.batch-thumb')[index]?.dataset.index), { timeout: 10000 }, i).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (count) await page.evaluate(() => document.querySelector('.batch-thumb')?.click());
}

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`缺少環境變數 ${name}`);
  return process.env[name];
}

/** 把整合版同步到純 ASCII 路徑（CDP 檔案上傳對 # 與中文路徑失效）。有 rsync 就增量同步。 */
function prepareWorkCopy() {
  const target = path.join(requireEnv('GOLDEN_WORK_DIR'), 'integrated');
  fs.mkdirSync(target, { recursive: true });
  const hasRsync = (() => { try { execFileSync('rsync', ['--version'], { stdio: 'ignore' }); return true; } catch (_) { return false; } })();
  for (const rel of [...SYNC_DIRS, ...SYNC_FILES]) {
    const source = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(source)) continue;
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (hasRsync) execFileSync('rsync', ['-a', '--delete', fs.statSync(source).isDirectory() ? `${source}/` : source, dest]);
    else { fs.rmSync(dest, { recursive: true, force: true }); fs.cpSync(source, dest, { recursive: true }); }
  }
  return target;
}

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

function listImages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listImages(full).map((rel) => `${entry.name}/${rel}`);
    return /\.(png|jpe?g)$/i.test(entry.name) ? [entry.name] : [];
  }).sort();
}

function decodeImage(buffer, name) {
  if (/\.png$/i.test(name)) {
    const { PNG } = require('pngjs');
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height, data: png.data };
  }
  const jpeg = require('jpeg-js');
  const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
  return { width: decoded.width, height: decoded.height, data: decoded.data };
}

function pixelDiff(goldenBuffer, actualBuffer, name, diffPath) {
  const pixelmatchModule = require('pixelmatch');
  const pixelmatch = pixelmatchModule.default || pixelmatchModule; // v7 為 ESM 套件
  const { PNG } = require('pngjs');
  const golden = decodeImage(goldenBuffer, name);
  const actual = decodeImage(actualBuffer, name);
  if (golden.width !== actual.width || golden.height !== actual.height) {
    return { mismatch: 'size', golden: `${golden.width}x${golden.height}`, actual: `${actual.width}x${actual.height}` };
  }
  const diff = new PNG({ width: golden.width, height: golden.height });
  const count = pixelmatch(golden.data, actual.data, diff.data, golden.width, golden.height, { threshold: 0 });
  if (count > 0) { fs.mkdirSync(path.dirname(diffPath), { recursive: true }); fs.writeFileSync(diffPath, PNG.sync.write(diff)); }
  return { mismatch: count > 0 ? 'pixels' : 'bytes-only', pixels: count, total: golden.width * golden.height };
}

async function extractZip(buffer) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const files = new Map();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir && /\.(png|jpe?g)$/i.test(name)) files.set(name, await entry.async('nodebuffer'));
  }
  return files;
}

/** 開頁並等到分類啟用 → 規則與 core 載入 → App.init 完成 → bootstrap 解除閘門（輸入框啟用）。 */
async function openWithProfile(page, origin, profileId) {
  await page.goto(`${origin}/app.html?profile=${encodeURIComponent(profileId)}`, { waitUntil: 'load' });
  // 注意：__appReady 是 Promise，waitForFunction 回傳它本身會被 await 成 undefined，所以先轉成布林。
  await page.waitForFunction(() => !!(window.ProfileLoader?.active && window.__rulesLoadResult && window.App && window.__appReady), { timeout: 60000 });
  await page.evaluate(() => window.__appReady);
  await page.waitForFunction(() => !document.getElementById('templateFolderInput').disabled, { timeout: 60000 });
}

async function runCase(testCase, workDir, browser, options = {}) {
  const server = await startStaticServer(workDir);
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('dialog', (dialog) => dialog.dismiss());
  try {
    await openWithProfile(page, server.origin, testCase.profile);

    const uploads = {
      templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir },
      assets: { inputId: 'assetInput', dir: testCase.assetsDir },
      workbook: { inputId: 'excelInput' },
    };
    await driver.uploadInputs(page, workDir, { uploads, workbook: testCase.workbook });
    const result = await driver.generate(page, testCase.sheet, testCase.project || '');
    if (result.error || !result.generated) return { id: testCase.id, status: 'error', detail: result.error || result.alerts.join(' | '), consoleErrors };

    if (options.clickThumbs) await clickEveryThumb(page);
    const zipBuffer = await driver.exportZip(page);
    const actual = await extractZip(zipBuffer);
    const goldenDir = path.join(REPO_ROOT, testCase.goldenDir, 'images');
    const goldenNames = listImages(goldenDir);
    const actualNames = [...actual.keys()].sort();

    const report = { id: testCase.id, status: 'pass', generated: result.generated, golden: goldenNames.length, actual: actualNames.length, identical: 0, mismatches: [], missing: [], extra: [], consoleErrors };
    // 刻意差異（見 tests/golden/README.md）：nameMap 把黃金檔名對映到整合版的新檔名；expectedExtra 是整合版多出的合法檔案。
    const nameMap = testCase.nameMap || {};
    const expectedExtra = new Set(testCase.expectedExtra || []);
    for (const name of goldenNames) {
      const actualName = nameMap[name] || name;
      if (!actual.has(actualName)) { report.missing.push(name); continue; }
      const goldenBuffer = fs.readFileSync(path.join(goldenDir, name));
      if (sha256(goldenBuffer) === sha256(actual.get(actualName))) { report.identical += 1; continue; }
      const diffPath = path.join(DIFF_ROOT, testCase.id, `${name}.diff.png`);
      report.mismatches.push({ name, actualName, ...pixelDiff(goldenBuffer, actual.get(actualName), name, diffPath) });
    }
    const mappedActualNames = new Set(goldenNames.map((name) => nameMap[name] || name));
    report.extra = actualNames.filter((name) => !mappedActualNames.has(name) && !expectedExtra.has(name));
    if (report.missing.length || report.extra.length || report.mismatches.some((m) => m.mismatch !== 'bytes-only')) report.status = 'fail';
    return report;
  } finally {
    await page.close();
    server.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let selected = args.case ? CASES.filter((c) => c.id === args.case) : CASES;
  if (!selected.length) throw new Error(`找不到案例：${args.case}`);
  const batch = /^(\d+)\/(\d+)$/.exec(String(args.batch || ''));
  if (batch) {
    const [index, total] = [Number(batch[1]), Number(batch[2])];
    selected = selected.filter((_, position) => position % total === index - 1);
  }

  const workDir = prepareWorkCopy();
  const { browser, version } = await launchBrowser();
  const reports = [];
  try {
    for (const testCase of selected) {
      const report = await runCase(testCase, workDir, browser, { clickThumbs: args['click-thumbs'] === true });
      reports.push(report);
      const summary = report.status === 'pass'
        ? `PASS  ${report.id}  ${report.identical}/${report.golden} 位元組相同${args['click-thumbs'] ? '（已逐張點縮圖）' : ''}`
        : `FAIL  ${report.id}  相同 ${report.identical}/${report.golden}，差異 ${report.mismatches?.length || 0}，缺 ${report.missing?.length || 0}，多 ${report.extra?.length || 0}${report.detail ? `：${report.detail}` : ''}`;
      console.log(summary);
    }
  } finally { await browser.close(); }

  fs.mkdirSync(DIFF_ROOT, { recursive: true });
  fs.writeFileSync(path.join(DIFF_ROOT, 'last-run.json'), JSON.stringify({ chrome: version, ranAt: new Date().toISOString(), reports }, null, 2));
  process.exit(reports.every((r) => r.status === 'pass') ? 0 : 1);
}

module.exports = { CASES, REPO_ROOT, parseArgs, prepareWorkCopy, sha256, listImages, pixelDiff, extractZip, openWithProfile };

if (require.main === module) main().catch((error) => { console.error(error); process.exit(1); });
