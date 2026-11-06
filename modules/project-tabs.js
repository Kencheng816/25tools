/* 整合版（自 18節 移植，2026-11-05）— 批次預覽的專案分頁
 *
 * 18節 2026-10-29 封測回饋：一份工單有多個專案時（18節 ENG：4.17 直播日／4.18 暖身／4.18 正式）。原本要先選「目前專案」再產圖，
 * 現在匯入時一律用 All 一次做完（與黃金樣本相同），這裡在右側批次預覽上方加分頁：全部 ｜ 專案 A ｜ 專案 B …，
 * 點分頁只「顯示」那個專案的縮圖與左側清單項目，不改 AppState、不改勾選、不改下載內容。
 * 只有一個專案（其他工具）時不出現分頁列。
 */
(function initProjectTabs() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ALL = '';
  const POLL_MS = 500;
  const state = { selected: ALL, signature: '' };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function projectsInBatch() {
    const items = window.AppState?.batchItems || [];
    const counts = new Map();
    items.forEach((item) => { const name = String(item?.project || ''); if (name) counts.set(name, (counts.get(name) || 0) + 1); });
    return counts;
  }

  function ensureTabs() {
    let tabs = $('projectTabs');
    if (tabs) return tabs;
    const panel = $('batchPreviewPanel');
    const grid = $('batchPreviewGrid');
    if (!panel || !grid) return null;
    tabs = document.createElement('div');
    tabs.id = 'projectTabs';
    tabs.className = 'project-tabs';
    tabs.setAttribute('role', 'tablist');
    panel.insertBefore(tabs, grid);
    tabs.addEventListener('click', (event) => {
      const button = event.target.closest('.project-tab');
      if (!button) return;
      state.selected = button.dataset.project || ALL;
      renderTabs(projectsInBatch());
      applyFilter();
    });
    return tabs;
  }

  function renderTabs(counts) {
    const tabs = ensureTabs();
    if (!tabs) return;
    if (counts.size < 2) { tabs.hidden = true; return; }
    tabs.hidden = false;
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const entries = [['', '全部', total], ...[...counts.entries()].map(([name, count]) => [name, name, count])];
    tabs.innerHTML = entries.map(([value, label, count]) => `
      <button type="button" class="project-tab${value === state.selected ? ' on' : ''}" role="tab" data-project="${escapeHtml(value)}" aria-selected="${value === state.selected}">${escapeHtml(label)}<small>${count}</small></button>`).join('');
  }

  /** 依 data-index 對回 AppState.batchItems[index].project，不符的加 project-hidden。 */
  function applyFilter() {
    const items = window.AppState?.batchItems || [];
    const show = (index) => state.selected === ALL || String(items[index]?.project || '') === state.selected;
    document.querySelectorAll('.batch-thumb[data-index], .batch-item[data-index]').forEach((el) => {
      el.classList.toggle('project-hidden', !show(Number(el.dataset.index)));
    });
    // 收合中的群組沒有畫出項目（core 只在展開時畫），看不出屬於哪個專案，維持顯示；展開的群組沒有可見項目才藏。
    document.querySelectorAll('.batch-group').forEach((group) => {
      const rendered = group.querySelector('.batch-item[data-index]');
      const visible = group.querySelector('.batch-item[data-index]:not(.project-hidden)');
      group.classList.toggle('project-hidden', !!rendered && !visible);
    });
  }

  function sync() {
    const counts = projectsInBatch();
    const signature = [...counts.keys()].join('|');
    if (signature !== state.signature) { state.signature = signature; state.selected = ALL; }
    if (state.selected !== ALL && !counts.has(state.selected)) state.selected = ALL;
    renderTabs(counts);
    applyFilter();
  }

  function bindUI() {
    // core 重畫縮圖／清單時（換分頁、重傳素材、勾選）要重新套用過濾
    const observe = (id) => { const el = $(id); if (el) new MutationObserver(() => applyFilter()).observe(el, { childList: true }); };
    observe('batchPreviewGrid');
    observe('batchItemList');
    setInterval(sync, POLL_MS);
    sync();
  }

  window.ProjectTabs = Object.freeze({ select: (name) => { state.selected = name || ALL; sync(); }, get selected() { return state.selected; } });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bindUI, { once: true });
  else bindUI();
})();
