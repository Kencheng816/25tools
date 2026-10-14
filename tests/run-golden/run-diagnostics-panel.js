/* 診斷面板 E2E（自 18節 移植的 modules/diagnostics-panel.js＋diagnostics-report.js）
 *
 * 每個案例產圖後：
 *   1. 左欄 #unmatchedBox 變成收合版：一列四級摘要 chip（4 個）＋至少一列區塊收合列（徽章數字＝該區則數，顏色＝最高層級）；
 *   2. 點一列 → 右側 #diagDrawer 打開、該區頁籤 is-active、內容依四級分組；
 *   3. 切到「全部」頁籤 → 分組總數＝報告 total；
 *   4. 點一個有對應圖片的項目 → 主畫布切到那張（AppState.activeIndex）；
 *   5. 「下載報告」→ 走 ExportManager.downloadBlob，檔名 診斷報告.txt、內容含四級標題；
 *   6. Esc 關閉面板。
 * 用法：node run-diagnostics-panel.js [--case "<id>"]（環境變數同 run-golden.js）。 */
'use strict';

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const driver = require('../golden-capture/lib/tool-driver');
const { CASES, parseArgs, prepareWorkCopy, openWithProfile } = require('./run-golden');

const DEFAULT_CASE_IDS = ['暖身BN/BN 暖身', 'MS/攻略頁_GD做圖列表', 'OM_w1/外廣_Wave1'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await sleep(300);

    // 1. 左欄收合版
    const left = await page.evaluate(() => {
      const box = document.getElementById('unmatchedBox');
      const report = window.DiagnosticsReport.collect();
      return {
        hidden: box?.classList.contains('hidden'), chips: box?.querySelectorAll('.diag-chip').length || 0,
        rows: [...(box?.querySelectorAll('.diag-row') || [])].map((row) => ({ section: row.dataset.section, badge: Number(row.querySelector('.diag-badge')?.textContent), tone: [...row.querySelector('.diag-badge').classList].find((c) => c.startsWith('tone-')) })),
        total: report.total, tiers: report.tiers.map((tier) => `${tier.label} ${tier.items.length}`),
      };
    });
    if (left.hidden) problems.push('左欄診斷區沒有顯示');
    if (left.chips !== 4) problems.push(`四級摘要 chip ${left.chips} 個`);
    if (!left.rows.length) problems.push('沒有任何區塊收合列');
    const rowTotal = left.rows.reduce((sum, row) => sum + row.badge, 0);
    if (rowTotal !== left.total) problems.push(`收合列徽章加總 ${rowTotal} ≠ 報告總數 ${left.total}`);
    summary = `${left.tiers.join('／')}；左欄 ${left.rows.map((row) => `${row.section}=${row.badge}(${row.tone})`).join(' ')}`;

    // 2. 點第一列 → 抽屜
    await page.click('#unmatchedBox .diag-row');
    await sleep(500);
    let drawer = await page.evaluate(() => {
      const el = document.getElementById('diagDrawer');
      return { open: el && !el.classList.contains('hidden'), active: el?.querySelector('.diag-tab.is-active')?.dataset.section, groups: el?.querySelectorAll('.diag-group').length || 0, tabs: el?.querySelectorAll('.diag-tab').length || 0 };
    });
    if (!drawer.open) problems.push('點收合列後面板沒有打開');
    if (drawer.active !== left.rows[0].section) problems.push(`面板頁籤 ${drawer.active}，預期 ${left.rows[0].section}`);
    if (drawer.tabs !== 4) problems.push(`頁籤 ${drawer.tabs} 個`);
    if (!drawer.groups) problems.push('面板沒有任何分組');

    // 3. 全部頁籤
    await page.click('#diagDrawer .diag-tab[data-section=""]');
    await sleep(200);
    const all = await page.evaluate(() => [...document.querySelectorAll('#diagDrawer .diag-group h4 > b')].reduce((sum, el) => sum + Number(el.textContent), 0));
    const totalNow = await page.evaluate(() => window.DiagnosticsReport.collect().total);
    if (all < totalNow) problems.push(`「全部」頁籤分組加總 ${all} < 報告總數 ${totalNow}`);

    // 4. 點有圖的項目 → 切張
    const link = await page.evaluate(() => {
      const item = [...document.querySelectorAll('#diagDrawer .diag-item.is-link')].find((el) => Number(el.dataset.index) !== window.AppState.activeIndex);
      if (!item) return null;
      item.click();
      return Number(item.dataset.index);
    });
    if (link !== null) {
      await sleep(600);
      const active = await page.evaluate(() => window.AppState.activeIndex);
      if (active !== link) problems.push(`點項目後 activeIndex=${active}，預期 ${link}`);
    }

    // 5. 下載報告
    const download = await page.evaluate(() => {
      const captured = {};
      const original = window.ExportManager.downloadBlob;
      window.ExportManager.downloadBlob = (blob, name) => { captured.name = name; captured.blob = blob; };
      document.querySelector('#diagDrawer [data-action="download"]').click();
      window.ExportManager.downloadBlob = original;
      return captured.blob ? captured.blob.text().then((text) => ({ name: captured.name, fourTiers: /重要且緊急/.test(text) && /■ 資訊/.test(text) })) : { name: null };
    });
    if (download.name !== '診斷報告.txt') problems.push(`下載報告檔名 ${download.name}`);
    else if (!download.fourTiers) problems.push('下載的報告沒有四級標題');

    // 6. Esc
    await page.keyboard.press('Escape');
    await sleep(200);
    drawer = await page.evaluate(() => !document.getElementById('diagDrawer').classList.contains('hidden'));
    if (drawer) problems.push('Esc 沒有關閉面板');
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
      else console.log(`PASS  ${report.id}  ${report.summary}；面板開關／頁籤／點項目切張／下載報告 皆正常`);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `run-diagnostics-panel：${failures} 個失敗` : `run-diagnostics-panel：${cases.length} 個案例全部通過`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
