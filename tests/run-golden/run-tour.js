#!/usr/bin/env node
/* 新手導覽回歸（2026-11-06 自 18節 移植）：app.html?profile=暖身BN&tour=1 → 導覽自動開始（載入範例工單）→ 逐步按「下一步」走完 →
 * 每一步都要找得到打亮目標（開場除外）、示範動畫有跑（有 anim 的步驟假游標要出現過）→ 按「完成」整頁重載、回到匯入視窗、沒有殘留的範例製作物。
 * 另外確認：沒有 ?tour 的自動化環境不會自動跑導覽（黃金回歸不受影響）、頂部列有「使用教學」。
 * 用法：node run-tour.js   環境變數同 run-golden.js。 */
'use strict';

const { startStaticServer } = require('../golden-capture/lib/static-server');
const { launchBrowser } = require('../golden-capture/lib/browser');
const { prepareWorkCopy, openWithProfile } = require('./run-golden');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const workDir = prepareWorkCopy();
  const { browser } = await launchBrowser();
  const server = await startStaticServer(workDir);
  const problems = [];
  const page = await browser.newPage();
  page.on('dialog', (dialog) => dialog.accept());
  page.on('pageerror', (error) => problems.push(`頁面錯誤：${error.message}`));
  try {
    // 1. 自動化環境、沒有 ?tour：不自動跑，但有「使用教學」按鈕
    await openWithProfile(page, server.origin, '暖身BN');
    await sleep(1500);
    if (await page.evaluate(() => window.Tour?.isActive?.())) problems.push('沒有 ?tour 時導覽不該自動跑');
    if (!(await page.$('#tourLaunchBtn'))) problems.push('頂部列缺少「使用教學」');

    // 2. ?tour=1 → 走完全部步驟
    await page.goto(`${server.origin}/app.html?profile=${encodeURIComponent('暖身BN')}&tour=1`, { waitUntil: 'load' });
    const started = await page.waitForFunction(() => window.Tour?.isActive?.() === true, { timeout: 120000 }).then(() => true).catch(() => false);
    if (!started) { problems.push('導覽沒有開始（範例工單載不進來？）'); throw new Error('stop'); }
    const total = await page.evaluate(() => window.Tour.steps.length);
    const visited = [];
    for (let guard = 0; guard < total + 2; guard += 1) {
      await sleep(1800);
      const info = await page.evaluate(() => ({
        step: document.querySelector('#tour-card .tour-step')?.textContent || '',
        title: document.querySelector('#tour-card .tour-title')?.textContent || '',
        intro: !!document.querySelector('#tour-card.tour-intro'),
        spotNone: document.getElementById('tour-spot')?.classList.contains('tour-none'),
        cursorShown: document.getElementById('tour-cursor')?.style.opacity === '1',
        hasAnim: !!window.Tour.steps[Number((document.querySelector('#tour-card .tour-step')?.textContent || '1').split('/')[0]) - 1]?.anim,
        next: document.querySelector('#tour-card .tour-next')?.textContent,
      }));
      visited.push(info.title);
      if (!info.intro && info.spotNone) problems.push(`「${info.title}」沒有打亮任何目標`);
      if (info.hasAnim && !info.cursorShown) problems.push(`「${info.title}」的示範動畫沒有出現假游標`);
      await page.evaluate(() => document.querySelector('#tour-card .tour-next')?.click());
      if (info.next === '完成') break;
      await page.waitForFunction((prev) => (document.querySelector('#tour-card .tour-step')?.textContent || '') !== prev, { timeout: 30000 }, info.step)
        .catch(() => problems.push(`「${info.title}」按下一步沒有前進`));
    }
    if (visited.length < total - 2) problems.push(`只走了 ${visited.length} 步（共 ${total}，可略過 1 步）：${visited.join(' → ')}`);

    // 3. 完成 → 整頁重載、回到匯入視窗、範例清掉
    await page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => problems.push('按「完成」後沒有重新載入'));
    await page.waitForFunction(() => window.__appReady && window.__coreScriptsReady, { timeout: 60000 });
    await page.evaluate(() => window.__appReady);
    await sleep(2500);
    const after = await page.evaluate(() => ({ url: location.search, items: (window.AppState?.batchItems || []).length, modalOpen: !!document.getElementById('importModal') && !document.getElementById('importModal').classList.contains('hidden'), seen: localStorage.getItem('25tool_tour_seen_v1'), active: window.Tour?.isActive?.() }));
    if (/tour/.test(after.url)) problems.push(`重載後網址還帶 tour：${after.url}`);
    if (after.items) problems.push(`重載後還有 ${after.items} 張範例製作物`);
    if (!after.modalOpen) problems.push('重載後匯入視窗沒有跳出');
    if (after.seen !== '1') problems.push('沒有記住「已看過導覽」');
    if (after.active) problems.push('重載後導覽又自己開始了');
  } catch (error) {
    if (error.message !== 'stop') problems.push(`例外：${error.message}`);
  } finally {
    await page.close(); await browser.close(); server.close();
  }
  if (problems.length) { console.log('✗ 新手導覽'); problems.forEach((line) => console.log(`    ${line}`)); console.log('run-tour：失敗'); process.exit(1); }
  console.log('✓ 新手導覽：自動開始、逐步打亮與示範、完成後清掉範例回到匯入視窗');
  console.log('run-tour：通過');
}

if (require.main === module) main().catch((error) => { console.error(error); process.exit(1); });
