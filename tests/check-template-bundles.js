#!/usr/bin/env node
'use strict';

/**
 * 靜態檢查：內建公版 bundle（templates/<分類>/_bundle.js）與資料夾內的 JSON 是否同步。
 * 公版改為內建後（2026-11-05 自 18節 移植），工具頁開啟時由 core/bootstrap.js 讀 _bundle.js 載入公版，
 * 所以 JSON 改了但沒重跑 `npm run bundle:templates`，線上版就會用到舊公版。掛在 `npm run check` 裡擋下。
 */

const { checkBundles, listTemplateDirs } = require('./tools/bundle-templates');

const stale = checkBundles();
if (stale.length) {
  console.error(`✗ 公版 bundle 不同步（請跑 npm run bundle:templates）：${stale.join('、')}`);
  process.exit(1);
}
console.log(`✓ ${listTemplateDirs().length} 個公版資料夾的 _bundle.js 全部同步`);
