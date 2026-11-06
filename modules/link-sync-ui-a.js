/* 整合版（25節）— A 系也要有「連動」開關（2026-11-06 封測 P0-2：正式BN 小素材「好像會連動調整，可能需要拆開」）
 *
 * 原因：同素材跨版位連動（modules/asset-link-sync.js，旗標 interaction.linkSync 預設開）在 A 系（正式BN／暖身BN／MS）一樣生效，
 *       例如 HBN 的 DECO_券_左下 在一張拖動，其他 HBN 的同一顆也跟著動；但工具列的「連動」開關與快捷鍵 D 只接在 B 系的
 *       App_B.sync／Interaction_B 鍵盤處理裡，A 系看不到開關、按 D 也沒反應，想拆開連動沒有出口。
 * 做法（純加法）：A 系啟用時包住 Inspector.render 呼叫 core 的 LinkSyncUI.render（顯示開關、同步勾選狀態），
 *       綁定開關的 change 與 D 鍵（與 B 系同一組 LinkSyncUI.apply／toggle）。B 系本來就有，這裡不重複接。
 */
(function initLinkSyncUiForFamilyA() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const flag = (name, fallback) => { const value = window.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };
  const isFamilyA = () => window.ProfileLoader?.active?.family === 'a';
  const isTyping = (target) => !!target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);

  function wire() {
    if (!isFamilyA() || !flag('interaction.linkSync', false)) return;
    const { Inspector, LinkSyncUI } = { Inspector: window.Inspector, LinkSyncUI: window.LinkSyncUI };
    if (!Inspector?.render || !LinkSyncUI?.render || Inspector.render.__linkSyncUiWired) return;
    const original = Inspector.render;
    const wrapped = function renderWithLinkSyncUi(...args) { const result = original.apply(this, args); try { LinkSyncUI.render(); } catch (_) { /* 開關畫不出來不影響核心 */ } return result; };
    wrapped.__linkSyncUiWired = true;
    Inspector.render = wrapped;

    const toggle = $('linkSyncToggle');
    if (toggle && !toggle.__linkSyncUiWired) {
      toggle.__linkSyncUiWired = true;
      toggle.addEventListener('change', (event) => LinkSyncUI.apply(event.target.checked));
    }
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || isTyping(event.target)) return;
      if (String(event.key || '').toLowerCase() !== 'd' || !window.AppState?.template) return;
      event.preventDefault();
      LinkSyncUI.toggle();
    });
    LinkSyncUI.render();
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
