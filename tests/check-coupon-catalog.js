/* 票券型錄一致性檢查（步驟 5.4，不開瀏覽器）
 *
 * 讀每個黃金樣本的 session.json，把所有工單自動流程產出的價格層（source=auto_price_v2）拿出來：
 *   1. 每個商品名都要在型錄找得到（沒有「不認識」的票券）。
 *   2. 型錄判的單／雙券（slots）要跟實際價格層一致。
 *   3. 型錄預設色 vs 實際顏色：一致者計數；不一致的只允許出現在 familyNote 有說明的項目（家族規則覆寫），否則失敗。
 * 用法：node tests/check-coupon-catalog.js */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GOLDEN_ROOT = path.join(REPO_ROOT, 'tests', 'golden');

// 型錄是瀏覽器用的 IIFE，掛在 window 上；這裡給它一個假的 window。
const sandbox = { window: {} };
new Function('window', fs.readFileSync(path.join(REPO_ROOT, 'config', 'coupon-catalog.js'), 'utf8'))(sandbox.window);
const CouponCatalog = sandbox.window.CouponCatalog;

function listSessions() {
  const result = [];
  for (const tool of fs.readdirSync(GOLDEN_ROOT, { withFileTypes: true })) {
    if (!tool.isDirectory()) continue;
    for (const sheet of fs.readdirSync(path.join(GOLDEN_ROOT, tool.name), { withFileTypes: true })) {
      const file = path.join(GOLDEN_ROOT, tool.name, sheet.name, 'session.json');
      if (sheet.isDirectory() && fs.existsSync(file)) result.push({ tool: tool.name, sheet: sheet.name, file });
    }
  }
  return result;
}

function main() {
  const unknown = new Map();
  const slotMismatch = [];
  const colorMismatch = [];
  const colorMatch = { same: 0, familyDeviation: 0 };
  let priceLayers = 0;

  for (const session of listSessions()) {
    const data = JSON.parse(fs.readFileSync(session.file, 'utf8'));
    for (const item of data.templates || []) {
      const layers = item.data?.layers || {};
      const priceEntries = Object.entries(layers).filter(([, layer]) => layer?.source === 'auto_price_v2');
      // 一張圖可能有多個商品（Mall Skinny BN 左／中／右），各自有價格層：依商品名分組判斷。
      const groups = new Map();
      priceEntries.forEach(([key, layer]) => {
        const name = String(layer.priceProductName || '');
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push([key, layer]);
      });
      for (const [name, group] of groups) {
        const actualSlots = group.some(([, layer]) => layer.priceSlot === 'top' || layer.priceSlot === 'bottom') ? 2 : 1;
        const classified = CouponCatalog.classify(name, item.data);
        if (!classified) { unknown.set(name, (unknown.get(name) || 0) + 1); continue; }
        priceLayers += group.length;
        if (classified.slots !== actualSlots) slotMismatch.push({ tool: session.tool, template: item.name, name, catalog: classified.slots, actual: actualSlots });
        for (const [, layer] of group) {
          const slot = layer.priceSlot || 'single';
          const expected = classified.colors[slot];
          if (String(layer.color).toLowerCase() === String(expected).toLowerCase()) { colorMatch.same += 1; continue; }
          const entry = CouponCatalog.match(name)?.entry;
          if (entry?.familyNote) { colorMatch.familyDeviation += 1; continue; }
          colorMismatch.push({ tool: session.tool, template: item.name, name, slot, catalog: expected, actual: layer.color });
        }
      }
    }
  }

  console.log(`價格層 ${priceLayers} 個；顏色與型錄預設一致 ${colorMatch.same}、家族規則覆寫（型錄已註明）${colorMatch.familyDeviation}`);
  if (unknown.size) { console.error('✗ 型錄不認識的商品名：'); unknown.forEach((count, name) => console.error(`   ${name} ×${count}`)); }
  if (slotMismatch.length) { console.error('✗ 單／雙券判斷不一致：'); slotMismatch.forEach((row) => console.error('   ', JSON.stringify(row))); }
  if (colorMismatch.length) { console.error('✗ 顏色不一致且型錄沒有註明：'); colorMismatch.forEach((row) => console.error('   ', JSON.stringify(row))); }
  const ok = !unknown.size && !slotMismatch.length && !colorMismatch.length;
  console.log(ok ? '✓ 型錄與 12 個黃金案例的票券判斷一致' : '✗ 型錄需要修正');
  process.exit(ok ? 0 : 1);
}

main();
