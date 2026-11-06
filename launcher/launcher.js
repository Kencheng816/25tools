/* 25節 整合版 — 入口頁（2026-11-05 自 18節 移植）
 *
 * 職責只有一件：把 config/tools.js 的卡片依群組畫出來，點卡片就開該工具的獨立頁面（app.html）。
 * 不做工單判別、不嵌 iframe；工單一律在工具頁的「匯入工單」彈窗上傳。
 * 舊網址 index.html#tool=<分類> 仍可用：直接轉到對應工具頁。
 */
(function initLauncher() {
  'use strict';

  const TOOLS = window.TOOL_REGISTRY || [];
  const container = document.getElementById('toolGroups');
  const errorBox = document.getElementById('launcherError');

  const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function showError(message) {
    container.replaceChildren();
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function isValidRegistry(tools) {
    return Array.isArray(tools) && tools.length > 0 && tools.every((tool) =>
      tool && typeof tool.id === 'string' && tool.id.trim() && typeof tool.label === 'string' && tool.label.trim()
      && typeof tool.group === 'string' && tool.group.trim() && Array.isArray(tool.profiles) && tool.profiles.length > 0);
  }

  /** 群組順序照 config/tools.js 的 TOOL_GROUPS（hidden 的不畫）；沒列在裡面但卡片有用到的群組補在最後。 */
  function orderedGroups() {
    const declared = (window.TOOL_GROUPS || []).filter((group) => !group.hidden).map((group) => group.name);
    const used = [...new Set(TOOLS.map((tool) => tool.group))];
    const hiddenNames = (window.TOOL_GROUPS || []).filter((group) => group.hidden).map((group) => group.name);
    return [...declared, ...used.filter((name) => !declared.includes(name) && !hiddenNames.includes(name))]
      .filter((name) => used.includes(name));
  }

  function renderGroups() {
    container.innerHTML = orderedGroups().map((group) => `
      <section class="launcher-group">
        <h2>${escapeHtml(group)}</h2>
        <div class="launcher-grid">
          ${TOOLS.filter((tool) => tool.group === group).map((tool) => `
            <a class="tool-card" href="${escapeHtml(window.toolPageUrl(tool))}" data-id="${escapeHtml(tool.id)}">${escapeHtml(tool.label)}</a>`).join('')}
        </div>
      </section>`).join('');
  }

  /** 舊書籤 index.html#tool=<分類>：找到含這個分類的卡片就直接開它。 */
  function redirectLegacyHash() {
    const legacyId = new URLSearchParams(location.hash.replace(/^#/, '')).get('tool');
    if (!legacyId) return false;
    const tool = TOOLS.find((entry) => entry.id === legacyId || entry.profiles.includes(legacyId));
    if (!tool) return false;
    location.replace(tool.profiles.includes(legacyId) ? `app.html?profile=${encodeURIComponent(legacyId)}` : window.toolPageUrl(tool));
    return true;
  }

  if (!isValidRegistry(TOOLS)) { showError('工具清單讀取失敗（config/tools.js），請重新整理或聯絡維護者。'); return; }
  if (redirectLegacyHash()) return;
  renderGroups();
})();
