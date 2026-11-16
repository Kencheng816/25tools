#!/usr/bin/env node
/* 載入視窗小遊戲＋背景分頁不停（二校二修 V2 #6）：
 *   1. 載入視窗顯示「正在載入素材 N / M」且 M > 30 → 卡片裡出現「等待時玩一下（貪食蛇）」；M ≤ 30 不出現。
 *   2. 按下去 → 有 canvas、方向鍵不會丟給工具（D 鍵不切連動）；視窗關掉 → canvas 拆掉、監聽拆掉。
 *   3. core 的 nextFrame：document.hidden 時（模擬背景分頁）不等 requestAnimationFrame 也會很快回來。
 * 用法：node run-loading-game.js（環境變數同 run-golden.js） */
'use strict';

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const { prepareWorkCopy, openWithProfile } = require('./run-golden');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const workDir = prepareWorkCopy();
  const { browser } = await launchBrowser();
  const server = await startStaticServer(workDir);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message.split('\n')[0]));
  const problems = [];
  try {
    await openWithProfile(page, server.origin, 'network');
    await sleep(800); // 開頁流程自己的 LoadingOverlay.hide() 會延遲 260ms 加 hidden，等它結束再開我們的
    const state = () => page.evaluate(() => ({
      btn: document.getElementById('assetLoadingGameBtn'),
      btnShown: !!document.getElementById('assetLoadingGameBtn') && document.getElementById('assetLoadingGameBtn').style.display !== 'none',
      canvas: !!document.querySelector('.asset-loading-game'),
    }));

    // 1. 張數少 → 不出現；張數多 → 出現
    await page.evaluate(() => window.LoadingOverlay.show('正在載入素材 3 / 12：x', 25));
    await sleep(200);
    if ((await state()).btnShown) problems.push('12 張也出現了遊戲按鈕（應該 >30 才出現）');
    await page.evaluate(() => window.LoadingOverlay.update(40, '正在載入素材 60 / 151：affiliate_1080x1080_10'));
    await sleep(200);
    if (!(await state()).btnShown) problems.push('151 張沒有出現遊戲按鈕');

    // 2. 開遊戲、按鍵不外漏、關視窗就收
    await page.evaluate(() => document.getElementById('assetLoadingGameBtn').click());
    await sleep(150);
    if (!(await state()).canvas) problems.push('按了按鈕沒有出現貪食蛇 canvas');
    const leaked = await page.evaluate(async () => {
      let seen = false;
      const spy = () => { seen = true; };
      window.addEventListener('keydown', spy);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true, cancelable: true }));
      window.removeEventListener('keydown', spy);
      return seen;
    });
    if (leaked) problems.push('遊戲中按 D 還是傳到了工具（會切連動）');
    await page.keyboard.press('ArrowUp');
    await sleep(300);
    await page.evaluate(() => window.LoadingOverlay.hide());
    await sleep(200);
    if ((await state()).canvas) problems.push('視窗關掉後 canvas 沒拆掉');

    // 3. 背景分頁：document.hidden=true 時 nextFrame 不卡
    const waited = await page.evaluate(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      const started = performance.now();
      await Promise.race([window.nextFrame(), new Promise((resolve) => setTimeout(() => resolve('timeout'), 1500))]);
      const ms = performance.now() - started;
      delete document.hidden;
      return ms;
    });
    if (waited > 1000) problems.push(`document.hidden 時 nextFrame 等了 ${Math.round(waited)}ms（應該立刻回來）`);
  } finally {
    await page.close();
    server.close();
    await browser.close();
  }
  if (errors.length) problems.push(`頁面錯誤：${errors.slice(0, 3).join(' | ')}`);
  if (problems.length) { console.log('✗ 載入視窗小遊戲'); problems.forEach((line) => console.log(`    ${line}`)); console.log('run-loading-game：失敗'); process.exit(1); }
  console.log('✓ 載入視窗小遊戲：>30 張才出現、開關正常、按鍵不外漏；背景分頁 nextFrame 不卡');
  console.log('run-loading-game：通過');
}

main().catch((error) => { console.error(error); process.exit(1); });
