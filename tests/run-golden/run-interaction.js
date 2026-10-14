/* 互動六項 E2E（自 18節 移植的靜態模組：thumb-sync／layer-lock-defaults／inkFitAll／asset-link-sync／product-group-sync／multi-select）
 *
 * 每個案例（A 系＋B 系各抽）產圖後，在主畫布驗證：
 *   1. 縮圖同步：真實滑鼠拖曳一個圖層 → 拖曳中縮圖灰化（is-stale）、放開後 300ms 內縮圖重畫（src 改變）；
 *   2. KV_BG 預設鎖定：key／psdName 符合 *kv_bg* 的圖層第一次出現就 locked；手動解鎖後重畫不會鎖回；
 *   3. 選取框貼墨跡：文字層的 getSelectionBox 不大於圖層框且與圖層框不同（貼著實際文字）；
 *   4. 同素材連動：同版型另一張用同素材的圖層，拖主圖層後跟著動；把那張的「連動」關掉後不再跟；
 *   5. 商品組：商品圖移動後配對價格等比跟著（該案例沒有可配對的商品組就略過）；
 *   6. 多選：Shift 加選兩層後按方向鍵，兩層都位移 1px。
 * 整個過程不能有 pageerror。用法：node run-interaction.js [--case "<id>"]（環境變數同 run-golden.js）。 */
'use strict';

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, parseArgs, prepareWorkCopy, openWithProfile } = require('./run-golden');

const DEFAULT_CASE_IDS = ['正式BN/BN 正式', 'OM_w1/外廣_Wave1', 'network/Network_5.19-5.25'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 挑一個可拖曳的圖片圖層，捲進視窗並回傳螢幕中心點。 */
async function pickDraggableLayer(page) {
  return page.evaluate(async () => {
    const AppState = window.AppState;
    const pick = (template) => Object.keys(template.layers).find((name) => {
      const layer = template.layers[name];
      return layer.type === 'image' && !layer.hidden && !layer.locked && !layer.__nonInteractive && String(layer.assetFilename || '').trim() && layer.width < template.canvas.width * 0.6;
    });
    const index = AppState.templates.findIndex((item) => pick(item.data));
    if (index < 0) return { error: '沒有可拖曳的圖片圖層' };
    await window.BatchManager.selectGenerated(index);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const key = pick(AppState.template);
    const layer = AppState.template.layers[key];
    const screenRect = () => window.Geometry.screenRectForBox(window.Geometry.getLayerBox(key, layer));
    const shell = document.querySelector('.canvas-shell');
    const first = screenRect();
    if (shell) shell.scrollBy({ left: first.left + first.width / 2 - window.innerWidth / 2, top: first.top + first.height / 2 - window.innerHeight / 2, behavior: 'instant' });
    const rect = screenRect();
    return { index, key, center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, box: window.Geometry.getLayerBox(key, layer) };
  });
}

async function checkThumbSync(page, target, problems) {
  const thumbBefore = await page.evaluate((index) => document.querySelector(`.batch-thumb[data-index="${index}"] img`)?.src || '', target.index);
  await page.mouse.move(target.center.x, target.center.y);
  await page.mouse.down();
  await page.mouse.move(target.center.x + 15, target.center.y + 10, { steps: 4 });
  await page.mouse.move(target.center.x + 30, target.center.y + 20, { steps: 4 });
  await sleep(500);
  const duringDrag = await page.evaluate((index) => ({ stale: document.querySelector(`.batch-thumb[data-index="${index}"]`)?.classList.contains('is-stale'), src: document.querySelector(`.batch-thumb[data-index="${index}"] img`)?.src || '' }), target.index);
  if (!duringDrag.stale) problems.push('拖曳中縮圖沒有灰化（is-stale）');
  if (duringDrag.src !== thumbBefore) problems.push('拖曳中縮圖就被重畫了（應該放開才更新）');
  await page.mouse.up();
  await sleep(1200);
  const after = await page.evaluate((index) => ({ stale: document.querySelector(`.batch-thumb[data-index="${index}"]`)?.classList.contains('is-stale'), src: document.querySelector(`.batch-thumb[data-index="${index}"] img`)?.src || '' }), target.index);
  if (after.src === thumbBefore) problems.push('放開滑鼠後縮圖沒有更新');
  if (after.stale) problems.push('縮圖更新後 is-stale 沒有拿掉');
  const moved = await page.evaluate((key) => window.Geometry.getLayerBox(key, window.AppState.template.layers[key]), target.key);
  if (Math.abs(moved.x - target.box.x) < 5) problems.push(`拖曳沒有移動圖層（x ${target.box.x} → ${moved.x}）`);
}

async function checkInPage(page) {
  return page.evaluate(async () => {
    const problems = [];
    const skipped = [];
    const AppState = window.AppState;
    const Geometry = window.Geometry;
    const template = AppState.template;
    const layers = template.layers;

    // 2. KV_BG 預設鎖定
    const bgKeys = Object.keys(layers).filter((key) => /kv_bg/i.test(key) || /kv_bg/i.test(String(layers[key].psdName || '')));
    if (!bgKeys.length) skipped.push('這張沒有 kv_bg 圖層');
    else {
      if (!bgKeys.every((key) => layers[key].locked === true)) problems.push(`kv_bg 圖層沒有預設鎖定：${bgKeys.join('、')}`);
      if (template.__lockDefaultsApplied !== true) problems.push('template.__lockDefaultsApplied 沒有標記');
      layers[bgKeys[0]].locked = false;
      window.Renderer.render();
      if (layers[bgKeys[0]].locked === true) problems.push('解鎖後重畫又被鎖回去');
      layers[bgKeys[0]].locked = true;
    }

    // 3. 選取框貼墨跡（所有文字層）
    const textKey = Object.keys(layers).find((key) => layers[key].type === 'text' && !layers[key].hidden && String(layers[key].text || '').trim());
    if (!textKey) skipped.push('沒有文字層可驗選取框');
    else {
      window.LayerManager.select(textKey);
      window.Renderer.render();
      const box = Geometry.getLayerBox(textKey, layers[textKey]);
      const selection = Geometry.getSelectionBox(textKey, layers[textKey]);
      const sameAsLayer = Math.abs(selection.width - box.width) < 0.5 && Math.abs(selection.height - box.height) < 0.5;
      if (sameAsLayer) problems.push(`文字層「${textKey}」選取框沒有貼墨跡（仍等於圖層框 ${box.width}×${box.height}）`);
      if (selection.width > box.width + 24 || selection.height > box.height + 24) problems.push(`文字層「${textKey}」選取框 ${selection.width}×${selection.height} 比圖層框 ${box.width}×${box.height} 大太多`);
    }

    // 4. 同素材跨版位連動（同版型）
    const linkSync = window.AssetLinkSync;
    if (!linkSync) problems.push('AssetLinkSync 沒有掛進 AssetSyncHub（sync.assetLink）');
    else {
      let pair = null;
      for (const [key, layer] of Object.entries(layers)) {
        if (!linkSync.isEligible(key, layer, template) || layer.locked) continue;
        const usages = linkSync.usages(linkSync.materialKey(layer), { template, key, layer }).filter((usage) => usage.template !== template);
        if (usages.length) { pair = { key, layer, other: usages[0] }; break; }
      }
      if (!pair) skipped.push('沒有同版型其他張用同素材的圖層可驗連動');
      else {
        const otherBefore = Geometry.getLayerBox(pair.other.key, pair.other.layer);
        const start = Geometry.getLayerBox(pair.key, pair.layer);
        window.AssetSyncHub.begin(template, pair.key);
        Geometry.applyBox(pair.key, pair.layer, { ...start, x: start.x + 12 }, { template });
        window.AssetSyncHub.update(template, pair.key);
        window.AssetSyncHub.finish(template, pair.key);
        const otherAfter = Geometry.getLayerBox(pair.other.key, pair.other.layer);
        if (Math.abs(otherAfter.x - otherBefore.x - 12) > 0.6) problems.push(`連動：另一張「${pair.other.key}」x ${otherBefore.x} → ${otherAfter.x}，預期 +12`);
        // 關掉另一張的連動 → 不再跟
        window.LinkSync.setEnabled(pair.other.template, false);
        window.AssetSyncHub.begin(template, pair.key);
        Geometry.applyBox(pair.key, pair.layer, { ...Geometry.getLayerBox(pair.key, pair.layer), x: start.x + 24 }, { template });
        window.AssetSyncHub.update(template, pair.key);
        window.AssetSyncHub.finish(template, pair.key);
        const otherFinal = Geometry.getLayerBox(pair.other.key, pair.other.layer);
        if (Math.abs(otherFinal.x - otherAfter.x) > 0.6) problems.push('關掉連動後另一張仍跟著動');
        window.LinkSync.setEnabled(pair.other.template, true);
        // 還原
        Geometry.applyBox(pair.key, pair.layer, start, { template });
        Geometry.applyBox(pair.other.key, pair.other.layer, otherBefore, { template: pair.other.template });
      }
    }

    // 5. 商品組
    const productGroup = window.ProductGroupSync;
    if (!productGroup) problems.push('ProductGroupSync 沒有掛進 AssetSyncHub（sync.productGroup）');
    else {
      const productKey = Object.keys(layers).find((key) => !window.AssetSyncHub.shouldSkipProduct(template, key) && productGroup.pricesFor(template, key).length);
      if (!productKey) skipped.push('沒有可配對的商品圖↔價格（或商品圖由智慧物件引擎接管）');
      else {
        const price = productGroup.pricesFor(template, productKey)[0];
        const priceBefore = Geometry.getLayerBox(price.key, price.layer);
        const fontBefore = Number(price.layer.fontSizePx);
        const start = Geometry.getLayerBox(productKey, layers[productKey]);
        window.AssetSyncHub.begin(template, productKey);
        Geometry.applyBox(productKey, layers[productKey], { ...start, width: start.width * 1.5, height: start.height * 1.5 }, { template });
        window.AssetSyncHub.update(template, productKey);
        window.AssetSyncHub.finish(template, productKey);
        const priceAfter = Geometry.getLayerBox(price.key, price.layer);
        if (Math.abs(Number(price.layer.fontSizePx) / fontBefore - 1.5) > 0.05) problems.push(`商品組：價格字級 ${fontBefore} → ${price.layer.fontSizePx}，預期 ×1.5`);
        if (Math.abs(priceAfter.width / priceBefore.width - 1.5) > 0.1) problems.push(`商品組：價格框寬 ${priceBefore.width} → ${priceAfter.width}，預期 ×1.5`);
        Geometry.applyBox(productKey, layers[productKey], start, { template });
        Geometry.applyBox(price.key, price.layer, priceBefore, { template });
        price.layer.fontSizePx = fontBefore;
      }
    }
    window.Renderer.render();
    return { problems, skipped };
  });
}

async function checkMultiSelect(page, problems) {
  const result = await page.evaluate(async () => {
    const AppState = window.AppState; const Geometry = window.Geometry;
    const layers = AppState.template.layers;
    const keys = Object.keys(layers).filter((key) => !layers[key].locked && !layers[key].hidden && !layers[key].__nonInteractive && (layers[key].type === 'image' || layers[key].type === 'text')).slice(0, 2);
    if (keys.length < 2) return { error: '不到兩個可選圖層' };
    window.LayerManager.select(keys[0]);
    window.LayerManager.select(keys[1], true);
    window.Renderer.render();
    const before = keys.map((key) => Geometry.getLayerBox(key, layers[key]).x);
    if (document.activeElement?.blur) document.activeElement.blur();
    return { keys, before, selected: AppState.selectedLayers.slice() };
  });
  if (result.error) return;
  if (result.selected.length !== 2) { problems.push(`Shift 加選後 selectedLayers=${JSON.stringify(result.selected)}`); return; }
  await page.keyboard.press('ArrowRight');
  await sleep(200);
  const after = await page.evaluate((keys) => keys.map((key) => window.Geometry.getLayerBox(key, window.AppState.template.layers[key]).x), result.keys);
  result.keys.forEach((key, i) => { if (Math.abs(after[i] - result.before[i] - 1) > 0.01) problems.push(`多選方向鍵：「${key}」x ${result.before[i]} → ${after[i]}，預期 +1`); });
}

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 900 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message.split('\n')[0]}`));
  page.on('dialog', (dialog) => dialog.dismiss());
  const problems = [];
  let skipped = [];
  try {
    await openWithProfile(page, server.origin, testCase.profile);
    await driver.uploadInputs(page, workDir, {
      uploads: { templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir }, assets: { inputId: 'assetInput', dir: testCase.assetsDir }, workbook: { inputId: 'excelInput' } },
      workbook: testCase.workbook,
    });
    const generated = await driver.generate(page, testCase.sheet, testCase.project || '');
    if (generated.error || !generated.generated) return { id: testCase.id, problems: [generated.error || generated.alerts.join(' | ')], errors };
    const target = await pickDraggableLayer(page);
    if (target.error) return { id: testCase.id, problems: [target.error], errors };
    await checkThumbSync(page, target, problems);
    const inPage = await checkInPage(page);
    problems.push(...inPage.problems); skipped = inPage.skipped;
    await checkMultiSelect(page, problems);
  } finally {
    await page.close();
    server.close();
  }
  return { id: testCase.id, problems, skipped, errors };
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
      else console.log(`PASS  ${report.id}  縮圖同步／鎖定／選取框／連動／商品組／多選${report.skipped?.length ? `（略過：${report.skipped.join('；')}）` : ''}`);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `run-interaction：${failures} 個失敗` : `run-interaction：${cases.length} 個案例全部通過`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
