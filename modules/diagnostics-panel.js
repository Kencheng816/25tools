/* 整合版（自 18節 移植）— 左側診斷區收合＋右側診斷面板
 *
 * 2026-10-07 回饋 5／6／7：「⚠ 未匹配／略過」「素材檢查」「解析診斷」展開會讓左欄太長 →
 *   左欄只留三列收合標題＋數字徽章（顏色＝該區最高層級），再加一列四級摘要；
 *   點任一列從右側滑出診斷面板，內容條列、依「重要 × 緊急」四級分組與排序（DiagnosticsReport）；
 *   有對應圖片的項目點了就切到那張。
 *
 * 做法：等 __coreScriptsReady 後包 BatchManager.renderBatchUI——原本的 unmatchedBox 內容照常算完，
 * 我們再把它換成收合版；不改 AppState、不影響輸出。
 */
(function initDiagnosticsPanel() {
  'use strict';

  const SECTIONS = Object.freeze([
    { id: 'unmatched', label: '⚠ 未匹配／略過', kinds: ['找不到公版', '欄位空白', '略過的列'] },
    { id: 'assets', label: '素材檢查', kinds: ['素材缺少', '版位沒有對應圖層', '素材退回預設', '素材比例被拉伸', '價格空白', '有價格卻沒顯示', '文字可能超出框', '輸出名重複'] },
    { id: 'parse', label: '解析診斷', kinds: ['解析統計', '解析警告', '匯出備註'] },
  ]);
  const TIER_ORDER = ['critical', 'important', 'minor', 'info'];

  const core = () => ({ AppState: window.AppState, BatchManager: window.BatchManager, DiagnosticsReport: window.DiagnosticsReport, ExportManager: window.ExportManager });
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const state = { report: null, drawer: null, activeSection: null, imageCheckToken: 0 };

  // ── 資料 ──

  function sectionOfKind(kind) {
    return SECTIONS.find((section) => section.kinds.includes(kind))?.id || 'assets';
  }

  function itemsInSection(report, sectionId) {
    return report.tiers.flatMap((tier) => tier.items.filter((entry) => sectionOfKind(entry.kind) === sectionId).map((entry) => ({ ...entry, tier })));
  }

  /** 該區最高層級（決定徽章顏色）。 */
  function topToneOf(items) {
    const index = Math.min(...items.map((entry) => TIER_ORDER.indexOf(entry.tier.id)), TIER_ORDER.length);
    return index < TIER_ORDER.length ? state.report.tiers[index].tone : 'grey';
  }

  // ── 左欄收合版 ──

  function renderSummary(box) {
    const { DiagnosticsReport } = core();
    if (!DiagnosticsReport || !box) return;
    state.report = DiagnosticsReport.collect();
    const report = state.report;
    if (!report.total) { box.classList.add('hidden'); box.innerHTML = ''; return; }

    const tierChips = report.tiers.map((tier) => `
      <button type="button" class="diag-chip tone-${tier.tone} ${tier.items.length ? '' : 'is-empty'}" data-tier="${tier.id}" title="${escapeHtml(tier.hint)}">
        <span>${escapeHtml(tier.label)}</span><b>${tier.items.length}</b>
      </button>`).join('');
    const sectionRows = SECTIONS.map((section) => {
      const items = itemsInSection(report, section.id);
      if (!items.length) return '';
      return `
        <button type="button" class="diag-row" data-section="${section.id}" title="點開右側診斷面板">
          <span class="diag-row-caret">›</span>
          <span class="diag-row-label">${escapeHtml(section.label)}</span>
          <b class="diag-badge tone-${topToneOf(items)}">${items.length}</b>
        </button>`;
    }).join('');

    box.classList.remove('hidden');
    box.innerHTML = `<div class="diag-chips">${tierChips}</div>${sectionRows}`;
  }

  // ── 右側面板 ──

  function ensureDrawer() {
    if (state.drawer) return state.drawer;
    const drawer = document.createElement('aside');
    drawer.id = 'diagDrawer';
    drawer.className = 'diag-drawer hidden';
    drawer.innerHTML = `
      <header class="diag-drawer-head">
        <div>
          <div class="diag-drawer-title">診斷</div>
          <div class="diag-drawer-sub" data-role="subtitle"></div>
        </div>
        <div class="diag-drawer-tools">
          <button type="button" class="diag-tool" data-action="download" title="下載 診斷報告.txt">下載報告</button>
          <button type="button" class="diag-tool" data-action="close" title="關閉（Esc）">✕</button>
        </div>
      </header>
      <nav class="diag-drawer-tabs" data-role="tabs"></nav>
      <div class="diag-drawer-body" data-role="body"></div>`;
    document.body.appendChild(drawer);
    drawer.addEventListener('click', onDrawerClick);
    window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !drawer.classList.contains('hidden')) closeDrawer(); });
    state.drawer = drawer;
    return drawer;
  }

  function openDrawer(sectionId = null) {
    const drawer = ensureDrawer();
    state.activeSection = sectionId;
    drawer.classList.remove('hidden');
    renderDrawer();
    refreshWithImageCheck();
  }

  function closeDrawer() {
    state.drawer?.classList.add('hidden');
  }

  function renderDrawer() {
    const drawer = state.drawer;
    const report = state.report;
    if (!drawer || !report) return;
    const { AppState } = core();
    drawer.querySelector('[data-role="subtitle"]').textContent = `${AppState?.batchDiagnostics?.sheetName || ''}　共 ${report.total} 則`;

    const tabs = [{ id: null, label: '全部' }, ...SECTIONS.map((section) => ({ id: section.id, label: section.label.replace(/^⚠ /, '') }))];
    drawer.querySelector('[data-role="tabs"]').innerHTML = tabs.map((tab) => {
      const count = tab.id ? itemsInSection(report, tab.id).length : report.total;
      return `<button type="button" class="diag-tab ${tab.id === state.activeSection ? 'is-active' : ''}" data-section="${tab.id || ''}">${escapeHtml(tab.label)} <b>${count}</b></button>`;
    }).join('');

    const groups = report.tiers.map((tier) => {
      const items = tier.items.filter((entry) => !state.activeSection || sectionOfKind(entry.kind) === state.activeSection);
      if (!items.length) return '';
      const rows = window.DiagnosticsReport.groupIdentical(items).map(({ entry, count }) => `
        <li class="diag-item ${entry.templateIndex >= 0 ? 'is-link' : ''}" data-index="${entry.templateIndex}">
          <span class="diag-kind">${escapeHtml(entry.kind)}</span>
          <span class="diag-text"><strong>${escapeHtml(entry.title)}</strong>${entry.detail ? `：${escapeHtml(entry.detail)}` : ''}${count > 1 ? `<em class="diag-times">×${count}</em>` : ''}</span>
        </li>`).join('');
      return `
        <section class="diag-group tone-${tier.tone}">
          <h4><span class="diag-dot"></span>${escapeHtml(tier.label)}<b>${items.length}</b><small>${escapeHtml(tier.hint)}</small></h4>
          <ul>${rows}</ul>
        </section>`;
    }).join('');
    drawer.querySelector('[data-role="body"]').innerHTML = groups || '<div class="diag-empty">這一區沒有需要注意的項目。</div>';
  }

  /** 開面板時多做一次「素材比例」檢查（要載圖，所以非同步、做完再重畫）。 */
  async function refreshWithImageCheck() {
    const { DiagnosticsReport } = core();
    if (!DiagnosticsReport?.collectWithImages) return;
    const token = ++state.imageCheckToken;
    try {
      const report = await DiagnosticsReport.collectWithImages();
      if (token !== state.imageCheckToken || state.drawer?.classList.contains('hidden')) return;
      state.report = report;
      renderDrawer();
      renderSummary(document.getElementById('unmatchedBox'));
    } catch (error) {
      console.warn('[diagnostics-panel] 素材比例檢查失敗', error);
    }
  }

  function onDrawerClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') { closeDrawer(); return; }
    if (action === 'download') { downloadReport(); return; }
    const tab = event.target.closest('.diag-tab');
    if (tab) { state.activeSection = tab.dataset.section || null; renderDrawer(); return; }
    const item = event.target.closest('.diag-item.is-link');
    if (item) {
      const index = Number(item.dataset.index);
      if (index >= 0) core().BatchManager?.selectGenerated?.(index);
    }
  }

  function downloadReport() {
    const { DiagnosticsReport, ExportManager } = core();
    const text = DiagnosticsReport?.text?.(state.report || undefined);
    if (!text) return;
    const blob = new Blob([`﻿${text}`], { type: 'text/plain;charset=utf-8' });
    if (typeof ExportManager?.downloadBlob === 'function') ExportManager.downloadBlob(blob, '診斷報告.txt');
  }

  // ── 接線 ──

  function onSummaryClick(event) {
    const row = event.target.closest('.diag-row');
    if (row) { openDrawer(row.dataset.section); return; }
    const chip = event.target.closest('.diag-chip');
    if (chip) openDrawer(null);
  }

  function wireCore() {
    const { BatchManager } = core();
    if (!BatchManager || BatchManager.__diagnosticsPanelWired) return;
    BatchManager.__diagnosticsPanelWired = true;
    const originalRender = BatchManager.renderBatchUI;
    BatchManager.renderBatchUI = function renderBatchUIThenCollapseDiagnostics(...args) {
      const result = originalRender.apply(this, args);
      try {
        renderSummary(document.getElementById('unmatchedBox'));
        if (state.drawer && !state.drawer.classList.contains('hidden')) renderDrawer();
      } catch (error) {
        console.warn('[diagnostics-panel] 重畫失敗', error);
      }
      return result;
    };
    document.getElementById('unmatchedBox')?.addEventListener('click', onSummaryClick);
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wireCore); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.DiagnosticsPanel = Object.freeze({ open: openDrawer, close: closeDrawer, SECTIONS });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
