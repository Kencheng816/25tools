/* 手動上傳貼合 E2E（自 18節 移植：裁透明邊＋等比貼合、縮放後外框記回 override、「+上傳素材」文字置中）
 *
 * 每個案例（A 系＋B 系各抽）：產圖 → 第一張挑一個一般圖片圖層 → 用「上傳替換」餵一張 600×300、只有中間 300×100 不透明的 PNG：
 *   1. 登記進素材索引的檔案已裁成 300×100（透明邊去掉）；
 *   2. 圖層外框變成 3:1、中心維持在原外框中心；override 連外框一起記（box）；
 *   3. 把外框拉大 1.5 倍後重畫 → override.box 跟著更新（settleOverrideBoxes）；
 *   4. 模擬工單重新套版把框還原 → applyOverrides 套回 1.5 倍的框（不會被上傳當下的框蓋掉）；
 *   5. visibleLabelOffset：外框超出版面時提示文字移到看得見的那一塊中央。
 * 用法：node run-manual-fit.js [--case "<id>"]（環境變數同 run-golden.js）。 */
'use strict';

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, parseArgs, prepareWorkCopy, openWithProfile } = require('./run-golden');

const DEFAULT_CASE_IDS = ['正式BN/BN 正式', 'OM_w1/外廣_Wave1', '跨夜/425跨夜_線上宣傳圖'];

async function exercise(page) {
  return page.evaluate(async () => {
    const problems = [];
    const AppState = window.AppState;
    await window.BatchManager.selectGenerated(0);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const template = AppState.template;
    // 一般圖片圖層：不要智慧物件商品圖（A 系走 applyManualProductUpload）、不要規格素材／上傳槽（各分類自己的流程）。
    const key = Object.keys(template.layers).find((name) => {
      const layer = template.layers[name];
      return layer.type === 'image' && !layer.hidden && !layer.locked && !layer.__nonInteractive && !layer.smartAssetId && !layer.__assetSpec && !layer.__uploadSlot && String(layer.assetFilename || '').trim();
    });
    if (!key) return { problems: ['第一張圖沒有一般圖片圖層可測'] };
    const layer = template.layers[key];
    const before = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
    const beforeCenter = { x: before.x + before.width / 2, y: before.y + before.height / 2 };

    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 300;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ff00ff'; context.fillRect(150, 100, 300, 100);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'fit-test.png', { type: 'image/png' });

    const replaced = await window.ManualAssetControls.replaceLayerAsset(key, layer, file, template);
    if (!replaced) problems.push('上傳替換失敗');
    const entry = window.AssetStore.getFileEntries().find((item) => item.lookupName === layer.assetFilename || item.file.name === layer.assetFilename.split('/').pop());
    if (!entry) problems.push(`素材索引找不到 ${layer.assetFilename}`);
    else {
      const img = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = URL.createObjectURL(entry.file); });
      if (img.naturalWidth !== 300 || img.naturalHeight !== 100) problems.push(`登記的檔案沒有裁掉透明邊（${img.naturalWidth}×${img.naturalHeight}，預期 300×100）`);
    }
    const ratio = layer.width / layer.height;
    if (Math.abs(ratio - 3) > 0.05) problems.push(`外框比例 ${ratio.toFixed(2)}，預期 3:1`);
    const afterCenter = { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
    if (Math.abs(afterCenter.x - beforeCenter.x) > 1 || Math.abs(afterCenter.y - beforeCenter.y) > 1) problems.push(`外框中心偏移：(${beforeCenter.x},${beforeCenter.y}) → (${afterCenter.x},${afterCenter.y})`);
    if (!(layer.width <= before.width + 0.5 && layer.height <= before.height + 0.5)) problems.push('新圖沒有塞進原外框（contain）');
    const override = template.__manualAssetOverrides?.[key];
    if (!override?.box) problems.push('override 沒有記外框（box）');
    const fitted = { width: layer.width, height: layer.height };

    // 3. 拉大 1.5 倍 → 重畫 → override.box 更新
    window.Geometry.applyBox(key, layer, { x: layer.x, y: layer.y, width: layer.width * 1.5, height: layer.height * 1.5 }, { template });
    window.Renderer.render();
    const grown = { width: layer.width, height: layer.height };
    if (!(grown.width > fitted.width * 1.4)) problems.push(`拉大後外框沒有變（${fitted.width} → ${grown.width}）`);
    if (Math.abs((override?.box?.width || 0) - grown.width) > 0.5) problems.push(`重畫後 override.box.width=${override?.box?.width}，預期 ${grown.width}`);

    // 4. 模擬重新套版把框打回公版預設 → applyOverrides 套回
    Object.assign(layer, { x: before.x, y: before.y, width: before.width, height: before.height });
    window.ManualAssetUpload.applyOverrides(template);
    if (Math.abs(layer.width - grown.width) > 0.5 || Math.abs(layer.height - grown.height) > 0.5) problems.push(`套回後外框 ${layer.width}×${layer.height}，預期 ${grown.width}×${grown.height}`);

    // 5. 提示文字位置：外框 x=100 寬 400、版面寬 200 → 可見區 100..200 → 中心 150、外框中心 300 → 位移 -150
    const offset = window.ManualAssetUpload.visibleLabelOffset({ x: 100, y: 0, width: 400, height: 100 }, { canvas: { width: 200, height: 200 } });
    if (Math.abs(offset.x + 150) > 0.01 || Math.abs(offset.visibleWidth - 100) > 0.01) problems.push(`visibleLabelOffset 算錯：${JSON.stringify(offset)}`);
    const inside = window.ManualAssetUpload.visibleLabelOffset({ x: 10, y: 10, width: 50, height: 50 }, { canvas: { width: 200, height: 200 } });
    if (inside.x !== 0 || inside.y !== 0) problems.push('外框在版面內時位移應為 0');

    return { key, problems, before, fitted, grown };
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
      else console.log(`PASS  ${report.id}  圖層「${report.key}」：裁邊 300×100、外框 ${report.before.width}×${report.before.height} → ${report.fitted.width}×${report.fitted.height}（3:1 置中）→ 拉大 ${report.grown.width}×${report.grown.height} 記回 override、套回不被蓋`);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `run-manual-fit：${failures} 個失敗` : `run-manual-fit：${cases.length} 個案例全部通過`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
