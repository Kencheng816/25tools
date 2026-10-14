/* 文字工具 E2E（自 18節 移植的 modules/text-editing-ux.js＋text-float-toolbar.js）
 *
 * 用真實滑鼠／鍵盤操作主畫布（A 系與 B 系各抽一個分類）：
 *   1. 雙擊文字層 → 進入編輯、浮動工具列出現；
 *   2. 打字 → 文字即時進圖層；Enter＝換行（不是確認）；
 *   3. Shift+Home 反白 → 隱藏編輯框有選取範圍；點一下文字 → 游標定位（選取收合）；
 *   4. Ctrl+Enter 確認 → 文字保留、文字框寬／高隨文字長變（貼合），工具列收起；
 *   5. Esc 取消另一次編輯 → 文字還原；
 *   6. 編輯中 Ctrl+/ 切換工具列顯示。
 * 整個過程不能有 pageerror。
 * 用法：node run-text-ux.js [--case "<id>"]（環境變數同 run-golden.js）。 */
'use strict';

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, parseArgs, prepareWorkCopy, openWithProfile } = require('./run-golden');

/** A 系（正式BN）＋ B 系（外廣 wave1、跨夜）。 */
const DEFAULT_CASE_IDS = ['正式BN/BN 正式', 'OM_w1/外廣_Wave1', '跨夜/425跨夜_線上宣傳圖'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** 真正的雙擊：puppeteer-core 25 的選項是 `count`（舊的 `clickCount` 會被忽略，只送一次 click、不會有 dblclick）。 */
const doubleClick = (page, point) => page.mouse.click(point.x, point.y, { count: 2 });

/** 選一張有可編輯文字層的圖，回傳圖層 key 與它在螢幕上的中心點。 */
async function pickTextLayer(page) {
  return page.evaluate(async () => {
    const AppState = window.AppState;
    const editableKey = (template) => Object.keys(template.layers).find((name) => {
      const layer = template.layers[name];
      return layer.type === 'text' && layer.source !== 'auto_price_v2' && !layer.hidden && !layer.locked && String(layer.text || '').trim() && !/\n/.test(String(layer.text));
    });
    const index = AppState.templates.findIndex((item) => editableKey(item.data));
    if (index < 0) return { error: '沒有任何一張圖有可編輯的單行文字層' };
    await window.BatchManager.selectGenerated(index);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const key = editableKey(AppState.template);
    const layer = AppState.template.layers[key];
    const screenRect = () => window.Geometry.screenRectForBox(window.Geometry.getLayerBox(key, layer));
    // 主畫布可能比視窗高（1:1 顯示的直式版面）：把文字層捲到視窗中央，滑鼠才點得到。
    const shell = document.querySelector('.canvas-shell');
    const first = screenRect();
    if (shell) shell.scrollBy({ left: first.left + first.width / 2 - window.innerWidth / 2, top: first.top + first.height / 2 - window.innerHeight / 2, behavior: 'instant' });
    const rect = screenRect();
    return { index, key, text: layer.text, box: { width: layer.width, height: layer.height }, center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
  });
}

const editorState = (page) => page.evaluate(() => {
  const editor = document.getElementById('inlineTextEditor');
  const key = window.AppState.editingLayerKey;
  const layer = key ? window.AppState.template.layers[key] : null;
  return {
    editingKey: key, value: editor?.value, selStart: editor?.selectionStart, selEnd: editor?.selectionEnd, focused: document.activeElement === editor,
    toolbarVisible: !!window.TextFloatToolbar?.isVisible(), layerText: layer?.text, box: layer ? { width: layer.width, height: layer.height } : null,
  };
});

async function runCase(testCase, workDir, browser) {
  const server = await startStaticServer(workDir);
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 900 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message.split('\n')[0]}`));
  page.on('dialog', (dialog) => dialog.dismiss());
  const problems = [];
  try {
    await openWithProfile(page, server.origin, testCase.profile);
    await driver.uploadInputs(page, workDir, {
      uploads: { templates: { inputId: 'templateFolderInput', dir: testCase.templatesDir }, assets: { inputId: 'assetInput', dir: testCase.assetsDir }, workbook: { inputId: 'excelInput' } },
      workbook: testCase.workbook,
    });
    const generated = await driver.generate(page, testCase.sheet, testCase.project || '');
    if (generated.error || !generated.generated) return { id: testCase.id, problems: [generated.error || generated.alerts.join(' | ')], errors };
    const target = await pickTextLayer(page);
    if (target.error) return { id: testCase.id, problems: [target.error], errors };

    // 1. 雙擊進入編輯
    await doubleClick(page, target.center);
    await sleep(300);
    let state = await editorState(page);
    if (state.editingKey !== target.key) problems.push(`雙擊後沒有進入編輯（editingLayerKey=${state.editingKey}）`);
    if (!state.focused) problems.push('隱藏編輯框沒有取得焦點');
    if (!state.toolbarVisible) problems.push('浮動工具列沒有出現');

    // 2. 打字＋Enter 換行
    await page.keyboard.press('End');
    await page.keyboard.type('AB');
    await page.keyboard.press('Enter');
    await page.keyboard.type('C');
    await sleep(300);
    state = await editorState(page);
    if (state.editingKey !== target.key) problems.push('Enter 把編輯結束了（應該是換行）');
    if (state.value !== `${target.text}AB\nC`) problems.push(`編輯框內容「${state.value}」，預期「${target.text}AB\\nC」`);
    if (state.layerText !== `${target.text}AB\nC`) problems.push(`圖層文字沒有即時更新：「${state.layerText}」`);

    // 3. Shift+Home 反白 → 點一下定位
    await page.keyboard.down('Shift'); await page.keyboard.press('Home'); await page.keyboard.up('Shift');
    await sleep(200);
    state = await editorState(page);
    if (!(state.selEnd > state.selStart)) problems.push('Shift+Home 沒有選取範圍');
    await page.mouse.click(target.center.x, target.center.y);
    await sleep(200);
    state = await editorState(page);
    if (state.editingKey !== target.key) problems.push('編輯中點文字層把編輯結束了（應該只移游標）');
    if (state.selEnd !== state.selStart) problems.push('點一下之後選取沒有收合成游標');

    // 4. Ctrl+Enter 確認 → 文字保留、框貼合
    await page.keyboard.down('Control'); await page.keyboard.press('Enter'); await page.keyboard.up('Control');
    await sleep(400);
    state = await editorState(page);
    const committed = await page.evaluate((key) => { const layer = window.AppState.template.layers[key]; return { text: layer.text, width: layer.width, height: layer.height }; }, target.key);
    if (state.editingKey) problems.push('Ctrl+Enter 沒有結束編輯');
    if (committed.text !== `${target.text}AB\nC`) problems.push(`確認後文字「${committed.text}」`);
    if (!(committed.height > target.box.height + 1)) problems.push(`兩行文字後文字框高度沒有變高（${target.box.height} → ${committed.height}）`);
    if (state.toolbarVisible) problems.push('確認後浮動工具列沒有收起');

    // 5. 再編輯一次 → Esc 取消 → 文字還原
    await doubleClick(page, target.center);
    await sleep(300);
    await page.keyboard.press('End');
    await page.keyboard.type('ZZ');
    await sleep(150);
    // 6. 編輯中 Ctrl+/ 切換工具列
    const toolbarBefore = (await editorState(page)).toolbarVisible;
    await page.keyboard.down('Control'); await page.keyboard.press('/'); await page.keyboard.up('Control');
    await sleep(150);
    const toolbarAfter = (await editorState(page)).toolbarVisible;
    if (toolbarBefore === toolbarAfter) problems.push('Ctrl+/ 沒有切換工具列');
    await page.keyboard.press('Escape');
    await sleep(300);
    const cancelled = await page.evaluate((key) => window.AppState.template.layers[key].text, target.key);
    if (cancelled !== committed.text) problems.push(`Esc 取消後文字「${cancelled}」，預期還原成「${committed.text}」`);
    if ((await editorState(page)).editingKey) problems.push('Esc 沒有結束編輯');
  } finally {
    await page.close();
    server.close();
  }
  return { id: testCase.id, problems, errors };
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
      const all = [...report.problems, ...report.errors];
      if (all.length) { failures += 1; console.log(`FAIL  ${report.id}\n    ${all.join('\n    ')}`); }
      else console.log(`PASS  ${report.id}  雙擊編輯／打字／Enter 換行／反白／點擊定位／Ctrl+Enter 貼合／Esc 還原／Ctrl+/ 皆正常`);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `run-text-ux：${failures} 個失敗` : `run-text-ux：${cases.length} 個案例全部通過`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
