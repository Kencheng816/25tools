#!/usr/bin/env node
'use strict';

/**
 * 公版打包（npm run bundle:templates）
 *
 * 2026-11-05 自 18節 移植（18節 2026-10-29 封測回饋）：公版改為內建在工具裡（照 Circle 的做法），使用者不再自己上傳 templates 資料夾。
 * 雙擊 index.html（file://）開啟時瀏覽器不准 fetch JSON，所以把每個分類的公版打包成一支可用 <script> 載入的
 * templates/<分類>/_bundle.js，內容是「檔名 → 原始 JSON 文字」；工具頁開啟時由 core/bootstrap.js 讀進來，
 * 組成 File 物件走原本的 TemplateLoader.loadTemplateFolder()，跟手動上傳同一條路，輸出不變。
 *
 * 公版 JSON 有改就要重跑這支；npm run check（tests/check-template-bundles.js）會比對 bundle 內的 sha256 與資料夾內容，不同步就擋下。
 *
 * 用法：node tests/tools/bundle-templates.js            打包所有 config/profiles 用到的 templatesDir
 *       node tests/tools/bundle-templates.js --check    只檢查是否同步（給 check-tools 用），不寫檔
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const BUNDLE_NAME = '_bundle.js';
const GLOBAL_KEY = '__templateBundles';

/** 讀 config/profiles/*.profile.js 的 templatesDir（去重、排序）。 */
function listTemplateDirs() {
  const dir = path.join(ROOT, 'config', 'profiles');
  const dirs = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.profile.js')) continue;
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(dir, file), 'utf8'), sandbox);
    for (const profile of Object.values(sandbox.window.__profileRegistry || {})) {
      if (profile?.templatesDir) dirs.add(String(profile.templatesDir).replace(/\/+$/, ''));
    }
  }
  return [...dirs].sort();
}

/** 跟黃金擷取器 setInputFilesSorted 同一種排序（字串比較），讓內建載入與手動上傳的順序一致。 */
function listTemplateFiles(dirRel) {
  const abs = path.join(ROOT, dirRel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((name) => name.endsWith('.json') && name !== 'manifest.json')
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((name) => ({ name, text: fs.readFileSync(path.join(abs, name), 'utf8') }));
}

function digest(files) {
  const hash = crypto.createHash('sha256');
  for (const file of files) hash.update(file.name).update('\0').update(file.text).update('\0');
  return hash.digest('hex');
}

function renderBundle(dirRel, files) {
  const payload = { sha256: digest(files), files };
  return `/* 自動產生：node tests/tools/bundle-templates.js（公版 JSON 有改就重跑）— 勿手改。 */\n`
    + `window.${GLOBAL_KEY} = window.${GLOBAL_KEY} || {};\n`
    + `window.${GLOBAL_KEY}[${JSON.stringify(dirRel)}] = ${JSON.stringify(payload)};\n`;
}

function readBundleDigest(dirRel) {
  const file = path.join(ROOT, dirRel, BUNDLE_NAME);
  if (!fs.existsSync(file)) return null;
  const sandbox = { window: {} };
  try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox); } catch (_) { return null; }
  return sandbox.window[GLOBAL_KEY]?.[dirRel]?.sha256 || null;
}

/** 回傳不同步的資料夾清單（空＝全部同步）。 */
function checkBundles() {
  return listTemplateDirs().filter((dirRel) => readBundleDigest(dirRel) !== digest(listTemplateFiles(dirRel)));
}

function writeBundles() {
  for (const dirRel of listTemplateDirs()) {
    const files = listTemplateFiles(dirRel);
    fs.writeFileSync(path.join(ROOT, dirRel, BUNDLE_NAME), renderBundle(dirRel, files));
    console.log(`${dirRel}/${BUNDLE_NAME}  ${files.length} 個公版`);
  }
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const stale = checkBundles();
    if (stale.length) { console.error(`公版 bundle 不同步：${stale.join('、')}（請跑 npm run bundle:templates）`); process.exit(1); }
    console.log('公版 bundle 全部同步');
  } else {
    writeBundles();
  }
}

module.exports = { BUNDLE_NAME, GLOBAL_KEY, listTemplateDirs, listTemplateFiles, checkBundles };
