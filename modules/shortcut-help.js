/* 整合版（自 18節 移植）— 快捷鍵一覽與空狀態標記
 *
 * 2026-10-07 回饋 8（第 7 項）：工具列「⌨ 快捷鍵」按鈕點開一張小卡列出全部快捷鍵（也可按 ? 開關）；
 * 順帶把「尚未產生預覽檔案」這類空狀態文字標上 is-empty，讓 theme-25.css 畫成空狀態框。
 * 純 UI，不碰 AppState。
 */
(function initShortcutHelp() {
  'use strict';

  const SHORTCUTS = Object.freeze([
    { label: '復原／重做', keys: [['Ctrl', 'Z'], ['Ctrl', 'Shift', 'Z']] },
    { label: '微調位置（Shift 一次 10px、Alt 0.5px）', keys: [['↑'], ['↓'], ['←'], ['→']] },
    { label: '多選圖層', keys: [['Shift', '點選']] },
    { label: '清除這一層的素材', keys: [['Delete']] },
    { label: '素材庫（也可右鍵圖層）', keys: [['L']] },
    { label: '這一張與其他版位連動開／關', keys: [['D']] },
    { label: '文字：換行／確認', keys: [['Enter'], ['Ctrl', 'Enter']] },
    { label: '文字：粗體／斜體／底線', keys: [['Ctrl', 'B'], ['Ctrl', 'I'], ['Ctrl', 'U']] },
    { label: '文字浮動工具列', keys: [['Ctrl', '/']] },
    { label: '關閉面板／取消', keys: [['Esc']] },
    { label: '這張卡', keys: [['?']] },
  ]);
  const EMPTY_BATCH_PATTERN = /尚未產生/;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let popover = null;

  function renderKeys(combo) {
    return combo.map((key) => `<kbd class="kbd">${escapeHtml(key)}</kbd>`).join('<span style="opacity:.5">+</span>');
  }

  function ensurePopover() {
    if (popover) return popover;
    popover = document.createElement('div');
    popover.className = 'shortcut-popover hidden';
    popover.setAttribute('role', 'dialog');
    popover.innerHTML = `
      <h4>快捷鍵</h4>
      <ul>${SHORTCUTS.map((item) => `<li><span>${escapeHtml(item.label)}</span><span>${item.keys.map(renderKeys).join('<span style="opacity:.5;margin:0 2px">／</span>')}</span></li>`).join('')}</ul>`;
    document.body.appendChild(popover);
    return popover;
  }

  function positionPopover(anchor) {
    const rect = anchor?.getBoundingClientRect();
    const top = rect ? rect.bottom + 8 : 72;
    const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8)) : 8;
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  function toggle(anchor) {
    const node = ensurePopover();
    const willShow = node.classList.contains('hidden');
    node.classList.toggle('hidden', !willShow);
    if (willShow) positionPopover(anchor);
  }

  function hide() {
    popover?.classList.add('hidden');
  }

  function isTypingTarget(target) {
    return target instanceof HTMLElement && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName));
  }

  function watchBatchStatus() {
    const status = document.getElementById('batchStatus');
    if (!status) return;
    const update = () => status.classList.toggle('is-empty', EMPTY_BATCH_PATTERN.test(status.textContent || ''));
    update();
    new MutationObserver(update).observe(status, { childList: true, characterData: true, subtree: true });
  }

  function main() {
    const button = document.getElementById('shortcutHelpBtn');
    button?.addEventListener('click', (event) => { event.stopPropagation(); toggle(button); });
    document.addEventListener('click', (event) => { if (popover && !popover.contains(event.target)) hide(); });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { hide(); return; }
      if (event.key === '?' && !isTypingTarget(event.target) && !event.ctrlKey && !event.metaKey) { event.preventDefault(); toggle(button); }
    });
    watchBatchStatus();
  }

  window.ShortcutHelp = Object.freeze({ SHORTCUTS, toggle, hide });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
