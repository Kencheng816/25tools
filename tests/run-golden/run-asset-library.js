/* 素材庫 E2E（自 18節 移植的 modules/asset-library.js）
 *
 * 每個案例（A 系＋B 系各抽）產圖後：
 *   1. 選一個圖片圖層按 L → 浮動面板開啟、列出素材（有共用素材資料夾時只列它）；
 *   2. 單擊另一個素材＝即時預覽（主畫布的圖換了、外框貼合）→ Esc 還原（圖與外框都回到原樣）；
 *   3. 再開面板、選素材、按「套用」→ 正式替換（assetFilename 變成手動素材、override 有記）→ toast「復原」→ 還原；
 *   4. 右鍵圖片圖層 → 小選單（素材庫／上傳／清除／連動）→ 點「從素材庫替換…」→ 面板開啟；
 *   5. 清除一個圖層後點空槽 → 同一個小選單。
 * 整個過程不能有 pageerror。用法：node run-asset-library.js [--case "<id>"]（環境變數同 run-golden.js）。 */
'use strict';

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, parseArgs, prepareWorkCopy, openWithProfile } = require('./run-golden');

const DEFAULT_CASE_IDS = ['正式BN/BN 正式', 'OM_w1/外廣_Wave1', 'LineOA/Line OA'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pickImageLayer(page) {
  return page.evaluate(async () => {
    const AppState = window.AppState;
    const pick = (template) => Object.keys(template.layers).find((name) => {
      const layer = template.layers[name];
      return layer.type === 'image' && !layer.hidden && !layer.locked && !layer.__nonInteractive && !layer.smartAssetId && !layer.__assetSpec && !layer.__uploadSlot && String(layer.assetFilename || '').trim();
    });
    const index = AppState.templates.findIndex((item) => pick(item.data));
    if (index < 0) return { error: '沒有一般圖片圖層可測' };
    await window.BatchManager.selectGenerated(index);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const key = pick(AppState.template);
    const layer = AppState.template.layers[key];
    const screenRect = () => window.Geometry.screenRectForBox(window.Geometry.getLayerBox(key, layer));
    const shell = document.querySelector('.canvas-shell');
    const first = screenRect();
    if (shell) shell.scrollBy({ left: first.left + first.width / 2 - window.innerWidth / 2, top: first.top + first.height / 2 - window.innerHeight / 2, behavior: 'instant' });
    const rect = screenRect();
    window.LayerManager.select(key); window.Inspector.render(); window.Renderer.render();
    if (document.activeElement?.blur) document.activeElement.blur();
    return { index, key, assetFilename: layer.assetFilename, box: { x: layer.x, y: layer.y, width: layer.width, height: layer.height }, center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
  });
}

const libraryState = (page, key) => page.evaluate((key) => {
  const root = document.getElementById('assetLibrary');
  const layer = key ? window.AppState.template.layers[key] : null;
  return {
    open: !!window.AssetLibrary?.isOpen(), floating: root?.classList.contains('is-floating'), tiles: root?.querySelectorAll('.al-tile').length || 0,
    folders: [...new Set([...(root?.querySelectorAll('.al-folder') || [])].map((el) => el.textContent))],
    target: root?.querySelector('.al-target')?.textContent, hint: root?.querySelector('.al-preview-hint')?.classList.contains('hidden') === false,
    assetFilename: layer?.assetFilename, box: layer ? { x: layer.x, y: layer.y, width: layer.width, height: layer.height } : null,
    imageSrc: window.AppState.images?.[key]?.src || '', override: !!window.AppState.template.__manualAssetOverrides?.[key],
    menuOpen: document.getElementById('assetContextMenu')?.classList.contains('hidden') === false,
    menuItems: [...(document.getElementById('assetContextMenu')?.querySelectorAll('button') || [])].map((el) => el.textContent.replace(/[A-Z]$|Delete$/, '').trim()),
    toastVisible: document.getElementById('assetLibraryToast')?.classList.contains('hidden') === false,
  };
}, key);

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 900 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message.split('\n')[0]}`));
  page.on('dialog', (dialog) => dialog.dismiss());
  const problems = [];
  let summary = '';
  try {
    await openWithProfile(page, server.origin, testCase.profile);
    await driver.uploadInputs(page, workDir, {
      uploads: { templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir }, assets: { inputId: 'assetInput', dir: testCase.assetsDir }, workbook: { inputId: 'excelInput' } },
      workbook: testCase.workbook,
    });
    const generated = await driver.generate(page, testCase.sheet, testCase.project || '');
    if (generated.error || !generated.generated) return { id: testCase.id, problems: [generated.error || generated.alerts.join(' | ')], errors };
    const target = await pickImageLayer(page);
    if (target.error) return { id: testCase.id, problems: [target.error], errors };
    const beforeSrc = (await libraryState(page, target.key)).imageSrc;

    // 1. L 開面板
    await page.keyboard.press('l');
    await sleep(300);
    let state = await libraryState(page, target.key);
    if (!state.open || !state.floating) problems.push(`按 L 後面板沒有以浮動模式開啟（open=${state.open}）`);
    if (!state.tiles) problems.push('面板沒有列出任何素材');
    if (!String(state.target || '').startsWith('替換：')) problems.push(`面板標題「${state.target}」`);
    const sharedFolder = state.folders.find((name) => /^(素材|共用|共用素材|shared|common)$/i.test(name.split('/').pop()));
    if (state.folders.length > 1 && sharedFolder) problems.push(`有共用素材資料夾卻還列了其他資料夾：${state.folders.join('、')}`);
    summary = `${state.tiles} 個素材${sharedFolder ? `（只列「${sharedFolder}」）` : ''}`;

    // 2. 單擊預覽 → Esc 還原
    const otherIndex = await page.evaluate((current) => {
      const tiles = [...document.querySelectorAll('#assetLibrary .al-tile')];
      const other = tiles.find((tile) => !tile.classList.contains('is-current'));
      return other ? Number(other.dataset.index) : -1;
    }, target.assetFilename);
    if (otherIndex < 0) problems.push('素材庫裡沒有別的素材可以預覽');
    else {
      await page.evaluate((index) => window.AssetLibrary.select(index), otherIndex);
      await sleep(600);
      state = await libraryState(page, target.key);
      if (state.imageSrc === beforeSrc) problems.push('單擊素材後主畫布的圖沒有換成預覽');
      if (!state.hint) problems.push('預覽中沒有顯示提示');
      if (state.assetFilename !== target.assetFilename) problems.push('預覽就改了 assetFilename（應該要「套用」才正式替換）');
      await page.keyboard.press('Escape');
      await sleep(300);
      state = await libraryState(page, target.key);
      if (state.open) problems.push('Esc 沒有關閉面板');
      if (state.imageSrc !== beforeSrc) problems.push('Esc 後主畫布的圖沒有還原');
      if (JSON.stringify(state.box) !== JSON.stringify(target.box)) problems.push(`Esc 後外框沒有還原：${JSON.stringify(state.box)} vs ${JSON.stringify(target.box)}`);

      // 3. 套用 → 復原
      await page.keyboard.press('l');
      await sleep(300);
      await page.evaluate((index) => window.AssetLibrary.select(index), otherIndex);
      await sleep(600);
      await page.click('#assetLibrary .al-apply');
      await sleep(800);
      state = await libraryState(page, target.key);
      if (state.open) problems.push('套用後面板沒有關閉');
      if (state.assetFilename === target.assetFilename || !/^manual\//.test(String(state.assetFilename))) problems.push(`套用後 assetFilename=${state.assetFilename}`);
      if (!state.override) problems.push('套用後沒有記 override');
      if (!state.toastVisible) problems.push('套用後沒有「復原」toast');
      await page.click('#assetLibraryToast button');
      await sleep(500);
      state = await libraryState(page, target.key);
      if (state.assetFilename !== target.assetFilename) problems.push(`復原後 assetFilename=${state.assetFilename}，預期 ${target.assetFilename}`);
    }

    // 4. 右鍵選單 → 素材庫
    await page.mouse.click(target.center.x, target.center.y, { button: 'right' });
    await sleep(300);
    state = await libraryState(page, target.key);
    if (!state.menuOpen) problems.push('右鍵圖片圖層沒有出現小選單');
    else {
      const expected = ['從素材庫替換…', '上傳檔案替換…', '清除圖片'];
      expected.forEach((label) => { if (!state.menuItems.some((item) => item.startsWith(label))) problems.push(`小選單缺「${label}」：${state.menuItems.join('／')}`); });
      if (!state.menuItems.some((item) => item.startsWith('連動：'))) problems.push('小選單缺「連動」');
      await page.click('#assetContextMenu [data-action="library"]');
      await sleep(300);
      state = await libraryState(page, target.key);
      if (!state.open) problems.push('從小選單點「從素材庫替換…」沒有開面板');
      await page.keyboard.press('Escape');
      await sleep(200);
    }

    // 5. 清除後點空槽 → 小選單
    await page.evaluate(async (key) => { const t = window.AppState.template; await window.ManualAssetControls.clearLayerAsset(key, t.layers[key], t); }, target.key);
    await sleep(400);
    await page.mouse.click(target.center.x, target.center.y);
    await sleep(300);
    state = await libraryState(page, target.key);
    if (!state.menuOpen) problems.push('點已清除的空槽沒有出現小選單');
    await page.keyboard.press('Escape');
  } finally {
    await page.close();
    server.close();
  }
  return { id: testCase.id, problems, errors, summary };
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
      else console.log(`PASS  ${report.id}  ${report.summary}；預覽／Esc 還原／套用／復原／右鍵選單／空槽選單 皆正常`);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `run-asset-library：${failures} 個失敗` : `run-asset-library：${cases.length} 個案例全部通過`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
