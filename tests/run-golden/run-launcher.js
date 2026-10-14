/* 入口頁回歸：上傳工單自動判別 → 開工具 → 工單以 postMessage 帶進工具的「1. 開始」
 *
 * 每個案例：在 index.html 上傳工單 → 多重命中時點該工具卡片 → 等入口頁狀態列回報「已帶入」→
 * 檢查工具頁：AppState 有工單、分頁選到預期那頁、按鈕改為「重新上傳工單」、狀態列顯示「由入口頁帶入」。
 * http 與 file:// 各跑一次（使用者多半是雙擊 index.html 開啟，file:// 下入口頁與工具頁是不同來源，只有 postMessage 走得通）。
 *
 * 用法：node run-launcher.js   環境變數同 run-golden.js（GOLDEN_WORK_DIR、NODE_PATH）。 */
'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const { prepareWorkCopy } = require('./run-golden');

/** 單一命中（MS 工單只對到暖正MS）與多重命中（商城狂購節工單同時有 正式BN／暖身BN／KV 分頁、LINE購物入稿表同時有 network／AMS 分頁，點卡片選工具）。 */
const CASES = [
  { tool: 'MS', workbook: 'tests/golden-inputs/MS/5.25 MS設定_版配格式_KEN.xlsx', expectSheet: '攻略頁_GD做圖列表' },
  { tool: '暖身BN', workbook: 'tests/golden-inputs/暖身BN/【美術工單】2026.5.25商城狂購節_KEN.xlsx', expectSheet: 'BN 暖身' },
  { tool: 'network', workbook: 'tests/golden-inputs/network/[internal] LINE購物入稿表_2026 Ken.xlsx', expectSheet: 'Network_5.19-5.25' },
];
const STATUS_TIMEOUT_MS = 60000;

async function runCase(page, baseUrl, workDir, testCase) {
  await page.goto(`${baseUrl}index.html`, { waitUntil: 'load' });
  const detectInput = await page.$('#detectInput');
  await detectInput.uploadFile(path.join(workDir, testCase.workbook));
  await page.waitForFunction(() => /判別為|同時符合/.test(document.getElementById('detectStatus').textContent), { timeout: STATUS_TIMEOUT_MS });
  const multipleHits = await page.$eval('#detectStatus', (el) => el.textContent.includes('同時符合'));
  if (multipleHits) await page.click(`.launcher-card[data-id="${testCase.tool}"]`);
  await page.waitForFunction(() => /已帶入|失敗/.test(document.getElementById('detectStatus').textContent), { timeout: STATUS_TIMEOUT_MS });

  const launcherStatus = await page.$eval('#detectStatus', (el) => el.textContent);
  const toolFrame = page.frames().find((frame) => frame.url().includes('app.html'));
  const tool = await toolFrame.evaluate(() => ({
    loaded: !!window.AppState?.excelWorkbook,
    sheet: document.getElementById('excelSheetSelect')?.value,
    buttonLabel: document.getElementById('excelInputLabel')?.textContent,
    statusText: document.getElementById('workbookStatus')?.hidden ? '' : document.getElementById('workbookStatus')?.textContent,
  }));
  const problems = [];
  if (!launcherStatus.includes('已帶入')) problems.push(`入口頁狀態：${launcherStatus}`);
  if (!tool.loaded) problems.push('工具頁 AppState.excelWorkbook 為空');
  if (tool.sheet !== testCase.expectSheet) problems.push(`分頁選到「${tool.sheet}」，預期「${testCase.expectSheet}」`);
  if (tool.buttonLabel !== '重新上傳工單') problems.push(`按鈕文字「${tool.buttonLabel}」`);
  if (!tool.statusText?.includes('由入口頁帶入')) problems.push(`工單狀態列「${tool.statusText}」`);
  return problems;
}

async function main() {
  const workDir = prepareWorkCopy();
  const { browser } = await launchBrowser();
  const server = await startStaticServer(workDir);
  const bases = [`${server.origin}/`, pathToFileURL(`${workDir}/`).href];
  let failures = 0;
  try {
    for (const baseUrl of bases) {
      for (const testCase of CASES) {
        const page = await browser.newPage();
        const problems = await runCase(page, baseUrl, workDir, testCase).catch((error) => [error.message]);
        await page.close();
        const scheme = baseUrl.startsWith('file:') ? 'file://' : 'http';
        if (problems.length) { failures += 1; console.log(`✗ ${scheme} ${testCase.tool}\n    ${problems.join('\n    ')}`); }
        else console.log(`✓ ${scheme} ${testCase.tool} → 分頁「${testCase.expectSheet}」已帶入`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures ? `run-launcher：${failures} 個失敗` : `run-launcher：${CASES.length * bases.length} 個案例全部通過`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
