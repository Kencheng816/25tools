/* 票券型錄 E2E（步驟 5.4）— 只跑有價格層的案例（正式BN／暖身BN／OM_w2／OM_w1）
 *
 * 每個案例：產圖 → 找第一張「單價格槽、且錨定商品圖」的圖 →
 *   (a) 把商品圖手動替換成檔名「全站券_單券.png」的測試圖 → 價格層顏色應變成該分類下「全站」的顏色（PriceColorResolver）；
 *   (b) Inspector 手動指定「商城券_單券」→ 價格層顏色應變成「商城」的顏色；
 *   (c) 儲存存檔 → 全新分頁載回 → 手動指定仍在、價格層顏色一致 → 下載 zip 與載回前位元組相同。
 * 用法：node run-coupon.js [--case "<id>"]（環境變數同 run-golden.js）。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, REPO_ROOT, parseArgs, prepareWorkCopy, sha256, extractZip, openWithProfile } = require('./run-golden');

const OUT_ROOT = path.join(REPO_ROOT, 'tests', 'golden-diff', 'coupon');
const PRICE_CASES = ['正式BN/BN 正式', '暖身BN/BN 暖身', 'OM_w1/外廣_Wave1', 'OM_w2/外廣_wave2'];

async function blobToBuffer(page, expression) {
  const base64 = await page.evaluate(async (code) => {
    const blob = await (new Function(`return (${code})`))();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }, expression);
  return Buffer.from(base64, 'base64');
}

async function runScenario(page) {
  return page.evaluate(async () => {
    const AppState = window.AppState;
    const CouponControls = window.CouponControls;
    // 找第一張：有單價格槽群組、且該群組錨定到某個商品圖層。
    let pick = null;
    for (let index = 0; index < AppState.templates.length && !pick; index += 1) {
      const template = AppState.templates[index].data;
      for (const group of window.CouponCatalog.describeTemplate(template)) {
        if (group.slots !== 1) continue;
        const anchorKey = group.priceLayerKeys.map((key) => template.layers[key]?.anchor?.layerKey || template.layers[key]?.anchorLayerKey).find(Boolean);
        if (anchorKey && template.layers[anchorKey]?.type === 'image') { pick = { index, group, anchorKey }; break; }
      }
    }
    if (!pick) return { error: '找不到「單價格槽＋錨定商品圖」的圖' };
    if (typeof window.BatchManager.selectGenerated === 'function') await window.BatchManager.selectGenerated(pick.index);
    else { AppState.activeIndex = pick.index; AppState.template = AppState.templates[pick.index].data; }
    const template = AppState.template;
    const before = { name: pick.group.name, colors: { ...pick.group.colors } };

    // (a) 替換商品圖為「全站券_單券.png」
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d'); context.fillStyle = '#00ffff'; context.fillRect(0, 0, 64, 64);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], '全站券_單券.png', { type: 'image/png' });
    const replaced = await window.ManualAssetControls.replaceLayerAsset(pick.anchorKey, template.layers[pick.anchorKey], file, template);
    const expectedAllSite = window.PriceColorResolver.resolve('全站券_單券', template, '#EE4D2D', 'single');
    const afterReplace = window.CouponCatalog.describeTemplate(template).find((group) => group.priceLayerKeys.join() === pick.group.priceLayerKeys.join());

    // (b) 手動指定「商城券_單券」
    AppState.selectedLayers = [pick.group.priceLayerKeys[0]];
    const manual = CouponControls.setManual(template, afterReplace, '商城券_單券');
    const expectedMall = window.PriceColorResolver.resolve('商城券_單券', template, '#D0011B', 'single');
    const afterManual = window.CouponCatalog.describeTemplate(template).find((group) => group.priceLayerKeys.join() === pick.group.priceLayerKeys.join());
    const rangeColors = pick.group.priceLayerKeys.flatMap((key) => (template.layers[key].textStyleRanges || []).map((range) => range.color));

    return {
      index: pick.index, anchorKey: pick.anchorKey, priceKeys: pick.group.priceLayerKeys, before,
      replaced, expectedAllSite, afterReplaceColors: afterReplace?.colors, afterReplaceOverride: template.__couponOverrides?.[before.name] || template.__couponOverrides?.['全站券_單券'] || null,
      manualApplied: manual.applied, expectedMall, afterManualColors: afterManual?.colors, rangeColors,
      overrides: template.__couponOverrides || {},
    };
  });
}

async function restoreAndInspect(page, archive, scenario) {
  return page.evaluate(async (data, index, priceKeys) => {
    const binary = atob(data); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    await window.SessionArchive.restoreArchive(new Blob([bytes], { type: 'application/zip' }));
    const template = window.AppState.templates[index]?.data;
    return { overrides: template?.__couponOverrides || {}, colors: Object.fromEntries(priceKeys.map((key) => [key, template?.layers?.[key]?.color])) };
  }, archive.toString('base64'), scenario.index, scenario.priceKeys);
}

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const pageA = await browser.newPage();
  const errors = [];
  pageA.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  pageA.on('dialog', (dialog) => dialog.dismiss());
  let pageB = null;
  try {
    await openWithProfile(pageA, server.origin, testCase.profile);
    await driver.uploadInputs(pageA, workDir, {
      uploads: { templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir }, assets: { inputId: 'assetInput', dir: testCase.assetsDir }, workbook: { inputId: 'excelInput' } },
      workbook: testCase.workbook,
    });
    const generated = await driver.generate(pageA, testCase.sheet, testCase.project || '');
    if (generated.error || !generated.generated) return { id: testCase.id, status: 'error', detail: generated.error || generated.alerts.join(' | ') };

    const scenario = await runScenario(pageA);
    if (scenario.error) return { id: testCase.id, status: 'error', detail: scenario.error };
    const zipC = await extractZip(await driver.exportZip(pageA));
    const archive = await blobToBuffer(pageA, 'window.SessionArchive.buildArchive()');
    fs.mkdirSync(path.join(OUT_ROOT, testCase.id), { recursive: true });
    fs.writeFileSync(path.join(OUT_ROOT, testCase.id, 'archive.25tool.zip'), archive);

    pageB = await browser.newPage();
    pageB.on('pageerror', (error) => errors.push(`pageerror(B): ${error.message}`));
    pageB.on('dialog', (dialog) => dialog.dismiss());
    await openWithProfile(pageB, server.origin, testCase.profile);
    const restored = await restoreAndInspect(pageB, archive, scenario);
    const zipD = await extractZip(await driver.exportZip(pageB));

    const sameZip = zipC.size === zipD.size && [...zipC.keys()].every((name) => zipD.has(name) && sha256(zipC.get(name)) === sha256(zipD.get(name)));
    const lower = (value) => String(value || '').toLowerCase();
    const checks = {
      replaced: scenario.replaced === true,
      replaceRecolored: lower(scenario.afterReplaceColors?.single) === lower(scenario.expectedAllSite),
      manualRecolored: scenario.manualApplied > 0 && lower(scenario.afterManualColors?.single) === lower(scenario.expectedMall),
      rangesRecolored: scenario.rangeColors.every((color) => lower(color) === lower(scenario.expectedMall)),
      overrideRestored: Object.keys(restored.overrides).length === Object.keys(scenario.overrides).length && Object.keys(scenario.overrides).length > 0,
      colorsRestored: scenario.priceKeys.every((key) => lower(restored.colors[key]) === lower(scenario.expectedMall)),
      zipRoundtripSame: sameZip,
    };
    return { id: testCase.id, status: Object.values(checks).every(Boolean) ? 'pass' : 'fail', checks, scenario, restored, errors };
  } finally {
    await pageA.close();
    if (pageB) await pageB.close();
    server.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selected = CASES.filter((c) => (args.case ? c.id === args.case : PRICE_CASES.includes(c.id)));
  if (!selected.length) throw new Error(`找不到案例：${args.case}`);
  const workDir = prepareWorkCopy();
  const { browser, version } = await launchBrowser();
  const reports = [];
  try {
    for (const testCase of selected) {
      const report = await runCase(testCase, workDir, browser);
      reports.push(report);
      if (report.status === 'pass') console.log(`PASS  ${report.id}  ${report.scenario.before.name}(${report.scenario.before.colors.single}) → 換圖 全站券_單券 → ${report.scenario.expectedAllSite} → 手動 商城券_單券 → ${report.scenario.expectedMall}；存檔往返一致`);
      else console.log(`FAIL  ${report.id}  ${report.detail || JSON.stringify({ checks: report.checks, scenario: report.scenario, restored: report.restored })}`.slice(0, 1500));
      if (report.errors?.length) console.log('   ', report.errors.slice(0, 3).join('\n    '));
    }
  } finally { await browser.close(); }
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.writeFileSync(path.join(OUT_ROOT, 'last-run.json'), JSON.stringify({ chrome: version, ranAt: new Date().toISOString(), reports }, null, 2));
  process.exit(reports.every((r) => r.status === 'pass') ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
