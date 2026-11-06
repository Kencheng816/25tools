#!/usr/bin/env node
/* 手動編輯流程回歸（2026-11-06 自 18節 移植；18節 2026-11-04 封測回饋）
 *
 * 黃金測試只比「工單自動產圖」的輸出；這支補使用者手動操作的路（每個分類各跑一次：正式BN／暖身BN 是 A 系、OM_w1 是 B 系）：
 *   1. 調整面板改主標（第一個文案欄位）→ 圖層文字是新字、縮圖更新、換到別張再回來還在、
 *      下載的圖跟黃金不同（規則每次重畫不能把字抄回工單；下載不能重套工單）、其他張跟黃金逐 byte 相同。
 *   2. 調整面板改副標顏色（色票）→ 圖層顏色是新色、下載的圖跟「只改字」的那版不同（25節 封測 P0-1：頭巾文字改不了顏色）。
 *   3. 存檔往返：儲存存檔 → 載回 → 再下載，與改過的那版逐 byte 相同（手動改過的東西要進存檔）。
 *   4. 商品合成（正式BN HBN_260525HBN20 商城券_雙券 $200，A 系智慧物件商品圖）：編輯商品把券縮到 0.6 倍 → 兩個價格層都在、字級等比、
 *      商品素材變 _compose.png、下載看得到；還原自動排版 → 素材／框／價格／智慧物件掛載全部回原狀（下載與黃金逐 byte 相同）。
 *   5. 多張商品（暖身BN，旗標 batch.multiProductSplit）：工單 HBN 第 1 列改「免運車 + SCS_雙券」→ 含「券」不拆（使用者 2026-11-06 決定）；
 *      第 2 列改「免運車 + 禮物盒icon」→ 拆兩層一大一小；編輯商品縮第 2 張 0.6 倍 → 烤成一張；還原 → 兩張回來。
 * MS 的輸出檔名由 work-order-export-planner 決定（與製作物名無關），這支對不回黃金檔名，所以預設不跑 MS（A 系由 正式BN／暖身BN 覆蓋）。
 * 券面範圍定義（18節 流程 4）：25節 尚未定義任何券，先不跑。
 *
 * 用法：node run-edit-flows.js [--case "<id>" | --case compose-single | --case compose-multi]   環境變數同 run-golden.js。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, REPO_ROOT, parseArgs, prepareWorkCopy, openWithProfile, extractZip, pixelDiff, sha256 } = require('./run-golden');

const DEFAULT_CASE_IDS = ['正式BN/BN 正式', '暖身BN/BN 暖身', 'OM_w1/外廣_Wave1'];
const XLSX = require('xlsx');
const near = (a, b, tolerance) => Math.abs(Number(a) - Number(b)) <= tolerance;
const DIFF_DIR = path.join(REPO_ROOT, 'tests/golden-diff/edit-flows');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openCase(browser, server, workDir, testCase) {
  const page = await browser.newPage();
  page.on('dialog', (dialog) => dialog.dismiss());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openWithProfile(page, server.origin, testCase.profile);
  await driver.uploadInputs(page, workDir, {
    uploads: { templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir }, assets: { inputId: 'assetInput', dir: testCase.assetsDir }, workbook: { inputId: 'excelInput' } },
    workbook: testCase.workbook,
  });
  const generated = await driver.generate(page, testCase.sheet, testCase.project || '');
  if (generated.error || !generated.generated) throw new Error(generated.error || generated.alerts.join(' | ') || '沒有產出');
  await page.waitForFunction(() => !document.getElementById('assetLoadingOverlay')?.classList.contains('is-open'), { timeout: 120000 }).catch(() => {});
  return { page, errors };
}

/** 選第一張「調整面板有至少兩個文案欄位」的製作物（主標＋副標），回傳 index 與面板欄位的圖層 key。 */
async function selectEditable(page) {
  const found = await page.evaluate(() => {
    const panel = window.AdjustPanel;
    for (let index = 0; index < window.AppState.templates.length; index += 1) {
      const keys = panel.textLayers(window.AppState.templates[index].data).map(([key]) => key);
      if (keys.length >= 2) return { index, keys };
    }
    return null;
  });
  if (!found) throw new Error('沒有任何一張製作物有兩個以上的文案欄位');
  await page.evaluate((i) => document.querySelectorAll('.batch-thumb')[i]?.click(), found.index);
  await sleep(800);
  const shown = await page.evaluate(() => [...document.querySelectorAll('#itemTextFields .item-text-field')].map((row) => row.dataset.layerKey));
  if (shown.join() !== found.keys.join()) throw new Error(`面板欄位 ${shown.join('、')}，預期 ${found.keys.join('、')}`);
  return found;
}

const fieldRow = (key) => `#itemTextFields .item-text-field[data-layer-key="${key}"]`;

async function typeInField(page, key, value) {
  await page.evaluate((selector, text) => {
    const input = document.querySelector(`${selector} textarea`);
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }, fieldRow(key), value);
  await sleep(1500);
}

async function pickColor(page, key, value) {
  await page.evaluate((selector, color) => {
    const swatch = document.querySelector(`${selector} .item-text-color`);
    swatch.value = color;
    swatch.dispatchEvent(new Event('input', { bubbles: true }));
    swatch.dispatchEvent(new Event('change', { bubbles: true }));
  }, fieldRow(key), value);
  await sleep(1500);
}

const layerProp = (page, key, prop) => page.evaluate((k, p) => window.AppState.template.layers[k]?.[p], key, prop);
const thumbSrc = (page, index) => page.evaluate((i) => document.querySelector(`.batch-thumb[data-index="${i}"] img`)?.src || '', index);

/** 下載 zip → { 圖名 → buffer }，並找出目前這張製作物在 zip 裡的檔名（用 AppState.templates[index].name 對）。 */
async function exportAll(page) { return extractZip(await driver.exportZip(page)); }
function findExported(files, itemName) {
  const base = String(itemName).replace(/\.(png|jpe?g)$/i, '');
  for (const name of files.keys()) if (name.replace(/\.(png|jpe?g)$/i, '').endsWith(base)) return name;
  return null;
}

async function runCase(testCase, browser, server, workDir) {
  const problems = [];
  const { page, errors } = await openCase(browser, server, workDir, testCase);
  try {
    const { index, keys } = await selectEditable(page);
    const [titleKey, subtitleKey] = keys;
    const itemName = await page.evaluate((i) => window.AppState.templates[i].name, index);
    const goldenDir = path.join(REPO_ROOT, testCase.goldenDir, 'images');

    // 1. 改主標
    const thumbBefore = await thumbSrc(page, index);
    await typeInField(page, titleKey, '測試改字ABC');
    if ((await layerProp(page, titleKey, 'text')) !== '測試改字ABC') problems.push(`改主標後圖層文字是「${await layerProp(page, titleKey, 'text')}」`);
    if ((await thumbSrc(page, index)) === thumbBefore) problems.push('改主標後縮圖沒更新');
    // 換到別張再回來
    await page.evaluate((i) => document.querySelectorAll('.batch-thumb')[i === 0 ? 1 : 0]?.click(), index);
    await sleep(500);
    await page.evaluate((i) => document.querySelectorAll('.batch-thumb')[i]?.click(), index);
    await sleep(800);
    if ((await layerProp(page, titleKey, 'text')) !== '測試改字ABC') problems.push('換張再回來，主標跳回工單');

    const textFiles = await exportAll(page);
    const exportedName = findExported(textFiles, itemName);
    if (!exportedName) { problems.push(`下載的 zip 找不到 ${itemName}`); return problems; }
    const goldenPath = path.join(goldenDir, exportedName);
    if (!fs.existsSync(goldenPath)) { problems.push(`黃金沒有 ${exportedName}`); return problems; }
    const textDiff = pixelDiff(fs.readFileSync(goldenPath), textFiles.get(exportedName), exportedName, path.join(DIFF_DIR, testCase.profile, 'text.png'));
    if (!(textDiff.pixels > 500)) problems.push(`改主標後下載的圖跟黃金一樣（手動改字沒進下載，差 ${textDiff.pixels} px）`);
    // 其他張不能受影響
    let touched = 0;
    for (const [name, buffer] of textFiles) {
      if (name === exportedName) continue;
      const golden = path.join(goldenDir, name);
      if (fs.existsSync(golden) && sha256(fs.readFileSync(golden)) !== sha256(buffer)) touched += 1;
    }
    if (touched) problems.push(`只改一張，卻有 ${touched} 張其他輸出跟黃金不同`);

    // 2. 改副標顏色（P0-1）
    const colorBefore = await layerProp(page, subtitleKey, 'color');
    const newColor = String(colorBefore).toLowerCase() === '#12ab34' ? '#ab1234' : '#12ab34';
    await pickColor(page, subtitleKey, newColor);
    const colorAfter = await layerProp(page, subtitleKey, 'color');
    if (String(colorAfter).toLowerCase() !== newColor) problems.push(`改顏色後圖層顏色是 ${colorAfter}（規則把顏色寫回去了）`);
    await page.evaluate((i) => document.querySelectorAll('.batch-thumb')[i === 0 ? 1 : 0]?.click(), index);
    await sleep(500);
    await page.evaluate((i) => document.querySelectorAll('.batch-thumb')[i]?.click(), index);
    await sleep(800);
    if (String(await layerProp(page, subtitleKey, 'color')).toLowerCase() !== newColor) problems.push('換張再回來，副標顏色跳回去');
    const colorFiles = await exportAll(page);
    const colorDiff = pixelDiff(textFiles.get(exportedName), colorFiles.get(exportedName), exportedName, path.join(DIFF_DIR, testCase.profile, 'color.png'));
    if (!(colorDiff.pixels > 100)) problems.push(`改副標顏色後下載的圖沒變（差 ${colorDiff.pixels} px）`);

    // 3. 存檔往返
    const archive = await page.evaluate(async () => {
      const blob = await window.SessionArchive.buildArchive();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    }).catch(() => null);
    if (!archive) problems.push('儲存存檔失敗（SessionArchive.buildArchive）');
    else {
      const restored = await page.evaluate(async (base64) => {
        const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
        await window.SessionArchive.restoreArchive(new Blob([bytes], { type: 'application/zip' }));
        return true;
      }, archive).catch((error) => error.message);
      if (restored !== true) problems.push(`載回存檔失敗：${restored}`);
      else {
        await sleep(1500);
        const roundFiles = await exportAll(page);
        const roundDiff = roundFiles.has(exportedName) ? pixelDiff(colorFiles.get(exportedName), roundFiles.get(exportedName), exportedName, path.join(DIFF_DIR, testCase.profile, 'roundtrip.png')) : null;
        if (!roundDiff) problems.push('載回存檔後下載的 zip 少了改過的那張');
        else if (roundDiff.pixels !== 0) problems.push(`載回存檔後再下載，改過的那張跟存檔前差 ${roundDiff.pixels} px（手動改過的東西沒進存檔）`);
      }
    }
  } finally { await page.close(); }
  if (errors.length) problems.push(`頁面錯誤：${errors.slice(0, 3).join(' | ')}`);
  return problems;
}

// ── 商品合成流程（第 4 批） ──

async function selectByName(page, namePattern) {
  const index = await page.evaluate((pattern) => window.AppState.templates.findIndex((item) => new RegExp(pattern).test(item.name)), namePattern);
  if (index < 0) throw new Error(`找不到製作物 ${namePattern}`);
  await page.evaluate((i) => document.querySelectorAll('.batch-thumb')[i]?.click(), index);
  await sleep(800);
  return index;
}

/** 目前製作物的商品層與價格層摘要 */
const layersOf = (page) => page.evaluate(() => {
  const out = {};
  Object.entries(window.AppState.template.layers).forEach(([key, layer]) => {
    if ((layer.type === 'image' && /product|商品/i.test(key)) || layer.source === 'auto_price_v2') out[key] = { asset: layer.assetFilename, x: layer.x, y: layer.y, width: layer.width, height: layer.height, fontSizePx: layer.fontSizePx, anchor: layer.anchor?.layerKey, text: layer.text, smartAssetId: layer.smartAssetId };
  });
  return out;
});
const priceKeys = (layers) => Object.keys(layers).filter((key) => key.startsWith('__auto_price_v2_'));

async function composeAndScale(page, itemId, scaleMul) {
  await page.evaluate(() => window.ProductComposer.open());
  await page.waitForFunction(() => !document.getElementById('productComposerModal')?.classList.contains('hidden'), { timeout: 30000 });
  await sleep(1200);
  await page.evaluate((id, k) => window.ProductComposer.setItemTransform(id, { scaleMul: k, dx: 60, dy: 30 }), itemId, scaleMul);
  await sleep(600);
  await page.evaluate(() => document.getElementById('composerApply').click());
  await page.waitForFunction(() => document.getElementById('productComposerModal')?.classList.contains('hidden'), { timeout: 60000 });
  await sleep(1500);
}
async function restoreCompose(page) { await page.evaluate(() => window.ProductComposer.restoreAuto()); await sleep(2500); }

async function flowSingleCoupon(browser, server, workDir) {
  const problems = [];
  const testCase = CASES.find((item) => item.id === '正式BN/BN 正式');
  const { page, errors } = await openCase(browser, server, workDir, testCase);
  try {
    const index = await selectByName(page, 'HBN_260525HBN20$');
    const itemName = await page.evaluate((i) => window.AppState.templates[i].name, index);
    const files0 = await exportAll(page);
    const exportedName = findExported(files0, itemName);
    const golden = fs.readFileSync(path.join(REPO_ROOT, testCase.goldenDir, 'images', exportedName));
    if (sha256(golden) !== sha256(files0.get(exportedName))) problems.push('合成前下載就跟黃金不同');

    const before = await layersOf(page);
    if (priceKeys(before).length !== 2) problems.push(`HBN_260525HBN20 應有 2 個價格層，實際 ${priceKeys(before).length}`);
    await composeAndScale(page, 'item0', 0.6);
    const after = await layersOf(page);
    if (priceKeys(after).length !== 2) problems.push(`合成後價格層剩 ${priceKeys(after).length} 個（價格消失）`);
    priceKeys(after).forEach((key) => {
      if (!before[key]) return;
      if (!near(after[key].fontSizePx, before[key].fontSizePx * 0.6, 1.5)) problems.push(`${key} 字級 ${after[key].fontSizePx}，應約為 ${before[key].fontSizePx} × 0.6`);
      const product = after.product; // 價格框是文字框（含左右留白），只檢查中心點落在合成後的商品框裡
      const cx = after[key].x + after[key].width / 2; const cy = after[key].y + after[key].height / 2;
      if (product && (cx < product.x || cx > product.x + product.width || cy < product.y || cy > product.y + product.height)) problems.push(`${key} 中心跑到商品框外`);
    });
    if (!/_compose\.png$/.test(after.product?.asset || '')) problems.push(`合成後商品素材是 ${after.product?.asset}`);
    const files1 = await exportAll(page);
    if (pixelDiff(files0.get(exportedName), files1.get(exportedName), exportedName, path.join(DIFF_DIR, '正式BN', 'compose.png')).pixels < 5000) problems.push('合成後下載的圖沒有變（合成沒進下載）');

    await restoreCompose(page);
    const restored = await layersOf(page);
    ['product', ...priceKeys(before)].forEach((key) => {
      ['x', 'y', 'width', 'height', 'fontSizePx', 'asset', 'smartAssetId'].forEach((prop) => {
        if (before[key] && String(before[key][prop]) !== String(restored[key]?.[prop])) problems.push(`還原後 ${key}.${prop} = ${restored[key]?.[prop]}（原本 ${before[key][prop]}）`);
      });
    });
    const files2 = await exportAll(page);
    if (sha256(files2.get(exportedName)) !== sha256(golden)) problems.push(`還原後下載的圖跟黃金不同（差 ${pixelDiff(golden, files2.get(exportedName), exportedName, path.join(DIFF_DIR, '正式BN', 'restored.png')).pixels} px）`);
  } finally { await page.close(); }
  if (errors.length) problems.push(`頁面錯誤：${errors.slice(0, 3).join(' | ')}`);
  return problems;
}

/** 暖身BN 黃金工單：HBN 區塊 第 1 列 商品圖1「VIP_單券_蝦幣_有皇冠」改「免運車 + SCS_雙券」（含券：不拆）、第 2 列「VIP_單券_折扣」改「免運車 + 禮物盒icon」（純商品：拆） */
function writeMultiProductWorkbook(workDir, testCase) {
  const wb = XLSX.readFile(path.join(REPO_ROOT, testCase.workbook), { cellStyles: false });
  const ws = wb.Sheets[testCase.sheet];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const targets = { 'VIP_單券_蝦幣_有皇冠': '免運車 + SCS_雙券', 'VIP_單券_折扣': '免運車 + 禮物盒icon' };
  const found = {};
  let inHbn = false;
  rows.forEach((row, r) => {
    if (row[0] && String(row[0]).trim() === 'HBN') inHbn = true;
    else if (row[0] && inHbn && String(row[0]).trim() !== 'HBN') inHbn = false;
    if (!inHbn) return;
    Object.keys(targets).forEach((name) => { if (!found[name]) { const c = row.findIndex((v) => v === name); if (c >= 0) found[name] = XLSX.utils.encode_cell({ r, c }); } });
  });
  Object.entries(targets).forEach(([name, next]) => {
    const cell = found[name] && ws[found[name]];
    if (!cell || cell.v !== name) throw new Error(`黃金工單 HBN 區塊找不到 商品圖1＝${name}（${found[name]}），測試要更新`);
    cell.v = next; delete cell.w; delete cell.r; delete cell.h;
  });
  const out = path.join(workDir, 'tests', 'mutation-tmp', 'edit-flows_multi_product.xlsx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  XLSX.writeFile(wb, out);
  return path.relative(workDir, out);
}

async function flowMultiProduct(browser, server, workDir) {
  const problems = [];
  const base = CASES.find((item) => item.id === '暖身BN/BN 暖身');
  const testCase = { ...base, workbook: writeMultiProductWorkbook(workDir, base) };
  const { page, errors } = await openCase(browser, server, workDir, testCase);
  try {
    // 5a. 含券的組合不拆：HBN 第 1 列「免運車 + SCS_雙券」→ 維持 25節 原本行為（整串去找素材；A 系 AssetLookup 判定模糊比對不明確，
    //     這一列進「未匹配」、診斷列「找不到公版」），不會出現拆開的複製層
    const couponRow = await page.evaluate(() => ({
      produced: window.AppState.templates.some((item) => /HBN_260525HBN01$/.test(item.name)),
      split: window.AppState.templates.some((item) => Object.values(item.data.layers).some((layer) => layer.__multiProductOf)
        && String(item.data.batchRecord?.['商品圖1'] || '').includes('SCS_雙券')),
      unmatched: (window.AppState.unmatchedBatchItems || []).some((item) => /免運車 \+ SCS_雙券/.test(String(item.reason || ''))),
    }));
    if (couponRow.split) problems.push('含「券」的組合不該拆成兩張');
    if (couponRow.produced || !couponRow.unmatched) problems.push(`含券組合應維持原本行為（整串找素材 → 未匹配）：${JSON.stringify(couponRow)}`);
    // 5b. 純商品組合：HBN 第 2 列「免運車 + 禮物盒icon」→ 拆兩層、一大一小，第 1 張免運車、第 2 張禮物盒
    await selectByName(page, 'HBN_260525HBN02$');
    const before = await layersOf(page);
    if (!before.product__multi1) problems.push('沒有拆成兩張（product__multi1 不存在）');
    if (!/免運車/.test(before.product?.asset || '')) problems.push(`第一張素材是 ${before.product?.asset}`);
    if (!/禮物盒/.test(before.product__multi1?.asset || '')) problems.push(`第二張素材是 ${before.product__multi1?.asset}`);
    if (before.product && before.product__multi1 && !(before.product.width > before.product__multi1.width)) problems.push('一大一小：第 1 張應比第 2 張大');

    await composeAndScale(page, 'item1', 0.6);
    const after = await layersOf(page);
    if (!/_compose\.png$/.test(after.product?.asset || '')) problems.push(`合成後商品素材是 ${after.product?.asset}`);
    if (after.product__multi1) problems.push('合成後複製層應移除');

    await restoreCompose(page);
    const restored = await layersOf(page);
    if (!/免運車/.test(restored.product?.asset || '')) problems.push('還原後第一張沒有回來');
    if (!/禮物盒/.test(restored.product__multi1?.asset || '')) problems.push('還原後第二張沒有回來');
    ['x', 'y', 'width', 'height'].forEach((prop) => { if (!near(restored.product__multi1?.[prop], before.product__multi1?.[prop], 1)) problems.push(`還原後第二張 ${prop} = ${restored.product__multi1?.[prop]}（原本 ${before.product__multi1?.[prop]}）`); });
  } finally { await page.close(); }
  if (errors.length) problems.push(`頁面錯誤：${errors.slice(0, 3).join(' | ')}`);
  return problems;
}

const COMPOSE_FLOWS = [
  { id: 'compose-single', name: '正式BN HBN_260525HBN20：單一票券合成 0.6 倍價格跟著縮／還原回黃金', run: flowSingleCoupon },
  { id: 'compose-multi', name: '暖身BN HBN：「免運車 + SCS_雙券」含券不拆／「免運車 + 禮物盒icon」拆兩張一大一小／合成／還原', run: flowMultiProduct },
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ids = args.case ? [args.case] : DEFAULT_CASE_IDS;
  const cases = args.case?.startsWith('compose-') ? [] : CASES.filter((item) => ids.includes(item.id));
  const workDir = prepareWorkCopy();
  const { browser } = await launchBrowser();
  const server = await startStaticServer(workDir);
  let failed = 0;
  try {
    for (const testCase of cases) {
      let problems;
      try { problems = await runCase(testCase, browser, server, workDir); } catch (error) { problems = [`例外：${error.message}`]; }
      if (problems.length) { failed += 1; console.log(`✗ ${testCase.id}`); problems.forEach((line) => console.log(`    ${line}`)); }
      else console.log(`✓ ${testCase.id}  改主標進下載／改副標顏色進下載／其他張不變／存檔往返一致`);
    }
    for (const flow of COMPOSE_FLOWS) {
      if (args.case && args.case !== flow.id) continue;
      let problems;
      try { problems = await flow.run(browser, server, workDir); } catch (error) { problems = [`例外：${error.message}`]; }
      if (problems.length) { failed += 1; console.log(`✗ ${flow.name}`); problems.forEach((line) => console.log(`    ${line}`)); }
      else console.log(`✓ ${flow.name}`);
    }
  } finally { await browser.close(); server.close(); }
  console.log(failed ? `run-edit-flows：${failed} 個失敗` : `run-edit-flows：${cases.length + COMPOSE_FLOWS.filter((flow) => !args.case || args.case === flow.id).length} 個案例全部通過`);
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main().catch((error) => { console.error(error); process.exit(1); });
