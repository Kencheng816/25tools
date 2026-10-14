/* 換票券素材 → 價格重算 E2E（自 18節 移植的 modules/coupon-price-sync.js）
 *
 * 每個案例（正式BN／暖身BN，有規則價格的工具）產圖後，挑一張有規則價格（auto_price_v2）的版位，對價格錨點（商品圖1）依序「上傳替換」：
 *   1. 檔名含「雙券」的素材 → 價格層變 top／bottom 兩個；
 *   2. 檔名含「單券」的素材 → 只剩 single 一個；
 *   3. 名稱沒有「券」（免運車加蝦幣）→ 沒有價格層，提示「不是票券」；
 *   4. 「_有價格」素材 → 沒有價格層，提示「自帶價格」；
 *   5. 檔名沒寫單雙、靠圖形判讀：橘色票根佔圖高 78% 的合成 PNG → 雙券（依圖形判讀）；佔 40% → 單券；
 *   6. 素材庫預覽：單擊雙券素材 → 價格即時變 2 個；Esc 還原 → 回到原本的價格層數。
 * 整個過程不能有 pageerror；自動產圖（沒有手動換圖）不受影響由黃金回歸驗證。
 * 用法：node run-coupon-price.js [--case "<id>"]（環境變數同 run-golden.js）。 */
'use strict';

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, parseArgs, prepareWorkCopy, openWithProfile } = require('./run-golden');

const DEFAULT_CASE_IDS = ['正式BN/BN 正式', '暖身BN/BN 暖身'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function exercise(page) {
  return page.evaluate(async () => {
    const problems = [];
    const AppState = window.AppState;
    const priceKeys = (template) => Object.keys(template.layers).filter((key) => template.layers[key]?.source === 'auto_price_v2' || key.startsWith('__auto_price_v2_'));
    const slots = (template) => priceKeys(template).map((key) => key.replace('__auto_price_v2_', '')).sort();
    const index = AppState.templates.findIndex((item) => priceKeys(item.data).length && window.CouponPriceSync.canRebuild(item.data, window.PriceCouponManager.findAnchorLayerKey(item.data)));
    if (index < 0) return { problems: ['沒有可重算價格的版位'] };
    await window.BatchManager.selectGenerated(index);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const template = AppState.template;
    const anchorKey = window.PriceCouponManager.findAnchorLayerKey(template);
    const originalSlots = slots(template);
    const findAsset = (pattern) => window.AssetStore.getFileEntries().find((entry) => pattern.test(entry.filename))?.file || null;
    const replaceWith = async (file) => {
      const ok = await window.ManualAssetControls.replaceLayerAsset(anchorKey, template.layers[anchorKey], file, template);
      if (!ok) problems.push(`替換 ${file.name} 失敗`);
      return { slots: slots(template), status: document.getElementById('assetControlStatus')?.textContent || '' };
    };
    const makeTicket = (name, barRatio) => new Promise((resolve) => {
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 300;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff'; context.fillRect(40, 20, 320, 260);
      const barHeight = Math.round(300 * barRatio);
      context.fillStyle = '#ee4d2d'; context.fillRect(0, Math.round((300 - barHeight) / 2), 60, barHeight);
      canvas.toBlob((blob) => resolve(new File([blob], name, { type: 'image/png' })), 'image/png');
    });

    // 1. 雙券（檔名）
    const double = findAsset(/全站券_雙券\.png$/i) || findAsset(/雙券/i);
    if (!double) problems.push('素材裡找不到檔名含「雙券」的票券');
    else {
      const result = await replaceWith(double);
      if (JSON.stringify(result.slots) !== JSON.stringify(['bottom', 'top'])) problems.push(`換雙券後價格層 ${JSON.stringify(result.slots)}，預期 top／bottom`);
      if (!/雙券/.test(result.status)) problems.push(`換雙券的狀態列「${result.status}」`);
    }
    // 2. 單券（檔名）
    const single = findAsset(/全站券_單券\.png$/i) || findAsset(/單券/i);
    if (!single) problems.push('素材裡找不到檔名含「單券」的票券');
    else {
      const result = await replaceWith(single);
      if (JSON.stringify(result.slots) !== JSON.stringify(['single'])) problems.push(`換單券後價格層 ${JSON.stringify(result.slots)}，預期 single`);
    }
    // 3. 不是票券
    const notCoupon = findAsset(/免運車加蝦幣\.png$/i);
    if (!notCoupon) problems.push('素材裡找不到 免運車加蝦幣.png');
    else {
      const result = await replaceWith(notCoupon);
      if (result.slots.length) problems.push(`換非票券後仍有價格層 ${JSON.stringify(result.slots)}`);
      if (!/不是票券/.test(result.status)) problems.push(`非票券的狀態列「${result.status}」`);
    }
    // 4. _有價格
    const priced = await makeTicket('商城券_有價格.png', 0.4);
    {
      const result = await replaceWith(priced);
      if (result.slots.length) problems.push(`換「_有價格」後仍有價格層 ${JSON.stringify(result.slots)}`);
      if (!/自帶價格/.test(result.status)) problems.push(`「_有價格」的狀態列「${result.status}」`);
    }
    // 5. 圖形判讀
    {
      const tall = await makeTicket('測試券A.png', 0.78);
      const result = await replaceWith(tall);
      if (JSON.stringify(result.slots) !== JSON.stringify(['bottom', 'top'])) problems.push(`圖形判讀（票根 78%）後價格層 ${JSON.stringify(result.slots)}，預期 top／bottom`);
      if (!/依圖形判讀/.test(result.status)) problems.push(`圖形判讀的狀態列「${result.status}」`);
      const short = await makeTicket('測試券B.png', 0.4);
      const result2 = await replaceWith(short);
      if (JSON.stringify(result2.slots) !== JSON.stringify(['single'])) problems.push(`圖形判讀（票根 40%）後價格層 ${JSON.stringify(result2.slots)}，預期 single`);
    }
    // 6. 素材庫預覽即時重算 → Esc 還原
    if (double) {
      const before = slots(template);
      window.LayerManager.select(anchorKey); window.Inspector.render(); window.Renderer.render();
      window.AssetLibrary.open({ key: anchorKey, layer: template.layers[anchorKey], template, mode: 'layer' });
      const entries = window.AssetStore.getFileEntries();
      const tileIndex = [...document.querySelectorAll('#assetLibrary .al-tile')].map((tile) => Number(tile.dataset.index)).find((i) => /雙券/.test(document.querySelector(`#assetLibrary .al-tile[data-index="${i}"] .al-name`)?.textContent || ''));
      if (tileIndex === undefined) problems.push('素材庫裡沒有雙券可預覽');
      else {
        await window.AssetLibrary.select(tileIndex);
        await new Promise((resolve) => setTimeout(resolve, 600));
        const previewSlots = slots(template);
        if (JSON.stringify(previewSlots) !== JSON.stringify(['bottom', 'top'])) problems.push(`預覽雙券時價格層 ${JSON.stringify(previewSlots)}，預期 top／bottom`);
        window.AssetLibrary.close();
        const restored = slots(template);
        if (JSON.stringify(restored) !== JSON.stringify(before)) problems.push(`預覽還原後價格層 ${JSON.stringify(restored)}，預期 ${JSON.stringify(before)}`);
      }
      void entries;
    }
    return { problems, anchorKey, originalSlots, index };
  });
}

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message.split('\n')[0]}`));
  page.on('dialog', (dialog) => dialog.dismiss());
  try {
    await openWithProfile(page, server.origin, testCase.profile);
    await driver.uploadInputs(page, workDir, {
      uploads: { templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir }, assets: { inputId: 'assetInput', dir: testCase.assetsDir }, workbook: { inputId: 'excelInput' } },
      workbook: testCase.workbook,
    });
    const generated = await driver.generate(page, testCase.sheet, testCase.project || '');
    if (generated.error || !generated.generated) return { id: testCase.id, problems: [generated.error || generated.alerts.join(' | ')], errors };
    const result = await exercise(page);
    await sleep(300);
    return { id: testCase.id, ...result, errors };
  } finally {
    await page.close();
    server.close();
  }
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
      else console.log(`PASS  ${report.id}  第 ${report.index + 1} 張（原 ${report.originalSlots.join('／')}）：雙券→2、單券→1、非票券→0、_有價格→0、圖形判讀 78%→2／40%→1、素材庫預覽即時重算＋Esc 還原`);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `run-coupon-price：${failures} 個失敗` : `run-coupon-price：${cases.length} 個案例全部通過`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
