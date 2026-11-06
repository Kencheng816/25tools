/* 整合版（自 18節 移植，2026-11-05）— 頂部列行為：進階模式、直接下載、匯入前反灰
 *
 * 18節 2026-10-29 封測回饋：
 *   - 進階模式（照蝦大 MS 編輯器）：頂部列一顆圖示切換鈕，開啟時 body 加 is-advanced，.adv-only 的東西才出現
 *     （「輸出 JSON」、左欄診斷摘要與右側診斷面板）；狀態記在 localStorage，下次開頁沿用。
 *   - 下載圖片不再跳「依工單規則／全部 PNG／全部 JPG」視窗：使用者只需要「依工單規則」（= 黃金回歸走的 auto），
 *     這裡把 ExportManager.askImageFormat 改成直接回 'auto'；core 的下載流程其餘不動。
 *   - 匯入前「儲存存檔」「下載圖片」「輸出 JSON」反灰（沒有東西可存／可下載）。
 */
(function initTopbar() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = '25tool_advanced';
  const POLL_MS = 500;

  function readAdvanced() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
  }

  function applyAdvanced(on) {
    document.body.classList.toggle('is-advanced', on);
    const button = $('advancedToggleBtn');
    if (button) { button.classList.toggle('on', on); button.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (_) {}
    if (!on) window.DiagnosticsPanel?.close?.();
  }

  function bindAdvancedToggle() {
    applyAdvanced(readAdvanced());
    $('advancedToggleBtn')?.addEventListener('click', () => applyAdvanced(!document.body.classList.contains('is-advanced')));
  }

  /** core 載好後把下載格式詢問拿掉：一律依工單規則。 */
  function simplifyDownload() {
    const manager = window.ExportManager;
    if (!manager || manager.askImageFormat?.__topbarDirect) return;
    const direct = async () => 'auto';
    direct.__topbarDirect = true;
    manager.askImageFormat = direct;
  }

  function syncButtons() {
    const imported = !!(window.AppState?.batchMode && (window.AppState.batchItems || []).length);
    ['saveArchiveBtn', 'downloadImageBtn', 'exportJsonBtn'].forEach((id) => { const el = $(id); if (el) el.disabled = !imported; });
  }

  function bindUI() {
    bindAdvancedToggle();
    window.addEventListener('core:scripts-ready', simplifyDownload);
    setInterval(() => { simplifyDownload(); syncButtons(); }, POLL_MS);
    syncButtons();
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bindUI, { once: true });
  else bindUI();
})();
