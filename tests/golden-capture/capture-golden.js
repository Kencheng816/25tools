#!/usr/bin/env node
'use strict';

/**
 * 黃金樣本擷取器：用 headless Chromium 跑「原工具」，走與使用者相同的操作路徑
 * （上傳公版 → 上傳素材 → 上傳工單 → 選分頁/專案 → 預覽檔案 → 下載圖片），
 * 把輸出圖與批次 JSON 存進 tests/golden/<工具>/。原工具檔案不做任何修改。
 *
 * 用法：
 *   node capture-golden.js discover --tool 正式BN
 *   node capture-golden.js capture  --tool 正式BN --sheet " BN 正式" [--project 名稱|__ALL__]
 *
 * 環境變數：
 *   GOLDEN_SOURCE_ROOT   #整合版本 資料夾（含 11 個工具）
 *   GOLDEN_WORK_DIR      工具複本暫存位置（路徑須為純 ASCII，CDP 檔案上傳對 # 與中文路徑失效）
 *   NODE_PATH            puppeteer-core / @sparticuz/chromium / jszip / xlsx 所在的 node_modules
 *                        （不在此資料夾 npm install，避免把 Chromium 二進位塞進 repo）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { startStaticServer } = require('./lib/static-server');
const { launchBrowser, interceptCdn } = require('./lib/browser');
const driver = require('./lib/tool-driver');

const HERE = __dirname;
const GOLDEN_DIR = path.join(HERE, '..', 'golden');
const CONFIG = JSON.parse(fs.readFileSync(path.join(HERE, 'tools.config.json'), 'utf8'));

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  const args = { mode };
  for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, '')] = rest[i + 1];
  return args;
}

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`缺少環境變數 ${name}`);
  return process.env[name];
}

/** 把工具複製到純 ASCII 路徑（內容不變），只為了讓 CDP 檔案上傳可用。 */
function prepareWorkCopy(toolName, config) {
  const source = path.join(requireEnv('GOLDEN_SOURCE_ROOT'), config.sourceDir);
  const target = path.join(requireEnv('GOLDEN_WORK_DIR'), asciiSlug(toolName));
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
  return target;
}

function asciiSlug(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 8);
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function listFilesRecursive(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFilesRecursive(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  }).sort();
}

function inputManifest(toolDir, config) {
  const { templates, assets } = config.uploads;
  const hashDir = (dir) => Object.fromEntries(listFilesRecursive(path.join(toolDir, dir)).map((rel) => [rel, sha256(path.join(toolDir, dir, rel))]));
  return {
    workbook: { file: config.workbook, sha256: sha256(path.join(toolDir, config.workbook)) },
    templates: hashDir(templates.dir),
    assets: hashDir(assets.dir),
  };
}

async function openTool(toolName, config) {
  const toolDir = prepareWorkCopy(toolName, config);
  const server = await startStaticServer(toolDir);
  const { browser, version } = await launchBrowser();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => { if (response.status() >= 400) consoleErrors.push(`HTTP ${response.status()} ${response.url()}`); });
  page.on('dialog', (dialog) => dialog.dismiss());
  await interceptCdn(page, config.cdn, (file) => require.resolve(file));
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  const rules = await driver.waitForAppReady(page);
  const uploaded = await driver.uploadInputs(page, toolDir, config);
  const close = async () => { await browser.close(); server.close(); };
  return { page, toolDir, version, rules, uploaded, consoleErrors, close };
}

async function discover(toolName, config) {
  const session = await openTool(toolName, config);
  try {
    const sheets = [];
    for (const sheetName of session.uploaded.sheetNames) {
      const projects = await driver.selectSheet(session.page, sheetName);
      sheets.push({ sheetName, projects });
    }
    return { chrome: session.version, rules: session.rules, uploaded: session.uploaded, sheets, consoleErrors: session.consoleErrors };
  } finally { await session.close(); }
}

async function capture(toolName, config, sheetName, project) {
  const session = await openTool(toolName, config);
  try {
    const result = await driver.generate(session.page, sheetName, project);
    if (!result.generated) return { ...result, chrome: session.version, exported: 0 };

    const zipBuffer = await driver.exportZip(session.page);
    const sessionDump = await driver.dumpSession(session.page);

    const caseDir = path.join(GOLDEN_DIR, toolName, caseFolderName(sheetName, project));
    const previousFiles = clearCaseDir(caseDir);
    fs.mkdirSync(path.join(caseDir, 'images'), { recursive: true });
    const exported = await extractZip(zipBuffer, path.join(caseDir, 'images'));
    const staleFiles = previousFiles.filter((rel) => !exported.includes(rel));
    fs.writeFileSync(path.join(caseDir, 'session.json'), JSON.stringify(sessionDump, null, 2));
    fs.writeFileSync(path.join(caseDir, 'capture-meta.json'), JSON.stringify({
      tool: toolName, sheetName, project: project || '', capturedAt: new Date().toISOString(),
      chrome: session.version, rules: session.rules, uploaded: session.uploaded,
      generated: result.generated, exported: exported.length, unmatched: result.unmatched, alerts: result.alerts,
      diagnostics: result.diagnostics, consoleErrors: session.consoleErrors,
      staleFiles,
      inputs: inputManifest(session.toolDir, config),
    }, null, 2));
    return { ...result, chrome: session.version, exported: exported.length, files: exported, staleFiles, caseDir };
  } finally { await session.close(); }
}

/**
 * 清空上一次的擷取結果。掛載磁碟可能不允許刪檔（EPERM）；此時改為就地覆寫，
 * 並回傳舊有 images 清單，讓呼叫端能標出「這次沒再產出」的殘留檔。
 */
function clearCaseDir(caseDir) {
  const imagesDir = path.join(caseDir, 'images');
  const previous = fs.existsSync(imagesDir) ? listFilesRecursive(imagesDir) : [];
  try { fs.rmSync(caseDir, { recursive: true, force: true }); return []; }
  catch (error) {
    if (error.code !== 'EPERM') throw error;
    return previous;
  }
}

function caseFolderName(sheetName, project) {
  const clean = (text) => String(text).trim().replace(/[\\/:*?"<>|]+/g, '_');
  return project ? `${clean(sheetName)}__${clean(project)}` : clean(sheetName);
}

async function extractZip(buffer, targetDir) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const written = [];
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const target = path.join(targetDir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, await entry.async('nodebuffer'));
    written.push(name);
  }
  return written.sort();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = CONFIG[args.tool];
  if (!config) throw new Error(`tools.config.json 沒有工具「${args.tool}」`);

  const output = args.mode === 'discover'
    ? await discover(args.tool, config)
    : await capture(args.tool, config, args.sheet, args.project === '__ALL__' ? driver.ALL_PROJECTS_VALUE : args.project);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
