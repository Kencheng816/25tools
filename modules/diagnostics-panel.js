/* 整合版（自 18節 移植，2026-11-05）— 左側診斷摘要＋右側診斷面板（依版位分卡）
 *
 * 2026-10-07 回饋 5／6／7：左欄只留收合摘要，點了從右側滑出面板，有對應圖片的項目點了就切到那張。
 * 2026-10-29 封測回饋（P1-2）：GD 說面板略亂、同版型出現兩次。原因是面板照「重要×緊急」四級排，同一張圖的問題被拆到
 *   不同級別。改成照「版位」排：
 *     有問題的版位 — 一張圖一張卡（縮圖＋名稱＋它所有的問題，紅點＝會出錯圖、橘點＝可能不好看），點卡片跳到那張。
 *     沒做出來的   — 工單有寫但沒產圖的，同一個版型合併成一張卡（找不到公版＋欄位空白 放一起）；略過的列也在這裡。
 *     解析資訊     — 統計與備註。
 *   四級分類仍留在資料層（diagnostics-report.js）與 zip 內的 診斷報告.txt，只是不再當介面。
 *
 * 做法：等 __coreScriptsReady 後包 BatchManager.renderBatchUI——原本的 unmatchedBox 內容照常算完，
 * 我們再把它換成摘要版；不改 AppState、不影響輸出。
 */
(function initDiagnosticsPanel() {
  'use strict';

  const SECTIONS = Object.freeze([
    { id: 'items', label: '有問題的版位', hint: '點卡片跳到那張' },
    { id: 'unmatched', label: '沒做出來的', hint: '工單有寫、但沒產出圖', kinds: ['找不到公版', '欄位空白', '略過的列'] },
    { id: 'parse', label: '解析資訊', hint: '統計與備註' },
  ]);
  const TONE_RANK = { red: 0, orange: 1, yellow: 2, grey: 3 };
  const PLAIN_TONE_LABEL = { red: '會出錯圖', orange: '圖會出但可能不好看', yellow: '已略過', grey: '資訊' };

  const core = () => ({ AppState: window.AppState, BatchManager: window.BatchManager, DiagnosticsReport: window.DiagnosticsReport, ExportManager: window.ExportManager });
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const state = { report: null, drawer: null, activeSection: 'items', imageCheckToken: 0 };

  // ── 資料：把四級報告重新整理成「版位卡」 ──

  /** 所有項目攤平並帶上 tone（紅／橘／黃／灰）。 */
  function flatEntries(report) {
    return report.tiers.flatMap((tier) => tier.items.map((entry) => ({ ...entry, tone: tier.tone, tierLabel: tier.label })));
  }

  function sectionOf(entry) {
    if (entry.templateIndex >= 0) return 'items';
    if (SECTIONS[1].kinds.includes(entry.kind)) return 'unmatched';
    return 'parse';
  }

  const worstTone = (entries) => entries.reduce((worst, entry) => (TONE_RANK[entry.tone] < TONE_RANK[worst] ? entry.tone : worst), 'grey');

  /** 同一張卡內一模一樣的問題合併成一條 ×N。 */
  function mergeIssues(entries) {
    const groups = new Map();
    entries.forEach((entry) => {
      const key = `${entry.kind}\u0001${entry.detail}`;
      if (groups.has(key)) groups.get(key).count += 1;
      else groups.set(key, { ...entry, count: 1 });
    });
    return [...groups.values()].sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
  }

  /** 有問題的版位：以 templateIndex 分卡，照批次順序排。 */
  function itemCards(entries) {
    const { AppState } = core();
    const byIndex = new Map();
    entries.filter((entry) => sectionOf(entry) === 'items').forEach((entry) => {
      if (!byIndex.has(entry.templateIndex)) byIndex.set(entry.templateIndex, []);
      byIndex.get(entry.templateIndex).push(entry);
    });
    return [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([index, list]) => ({
      index,
      name: AppState?.templates?.[index]?.name || list[0].title,
      tone: worstTone(list),
      issues: mergeIssues(list),
    }));
  }

  /** 沒做出來的：同一個版型名合併成一張卡；「略過的列」各自一張（標題就是第幾列）。 */
  function unmatchedCards(entries) {
    const byTitle = new Map();
    entries.filter((entry) => sectionOf(entry) === 'unmatched').forEach((entry) => {
      if (!byTitle.has(entry.title)) byTitle.set(entry.title, []);
      byTitle.get(entry.title).push(entry);
    });
    return [...byTitle.entries()].map(([title, list]) => ({ index: -1, name: title, tone: worstTone(list), issues: mergeIssues(list) }))
      .sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
  }

  function parseCards(entries) {
    const list = entries.filter((entry) => sectionOf(entry) === 'parse');
    return list.length ? [{ index: -1, name: '', tone: worstTone(list), issues: mergeIssues(list) }] : [];
  }

  function cardsOf(sectionId, entries) {
    if (sectionId === 'items') return itemCards(entries);
    if (sectionId === 'unmatched') return unmatchedCards(entries);
    return parseCards(entries);
  }

  const countOf = (sectionId, entries) => cardsOf(sectionId, entries).length;

  function headline(entries) {
    const total = (core().AppState?.batchItems || []).length;
    const affected = itemCards(entries).length;
    const missing = unmatchedCards(entries).filter((card) => card.tone !== 'yellow').length;
    const parts = [];
    if (total) parts.push(affected ? `${total} 張裡 ${affected} 張要注意` : `${total} 張都沒有問題`);
    if (missing) parts.push(`${missing} 個版位沒做出來`);
    return parts.join('，');
  }

  // ── 左欄摘要 ──

  function renderSummary(box) {
    const { DiagnosticsReport } = core();
    if (!DiagnosticsReport || !box) return;
    state.report = DiagnosticsReport.collect();
    const entries = flatEntries(state.report);
    if (!entries.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }

    const rows = SECTIONS.map((section) => {
      const cards = cardsOf(section.id, entries);
      if (!cards.length) return '';
      const count = section.id === 'parse' ? cards[0].issues.length : cards.length;
      return `
        <button type="button" class="diag-row" data-section="${section.id}" title="${escapeHtml(section.hint)}">
          <span class="diag-row-caret">›</span>
          <span class="diag-row-label">${escapeHtml(section.label)}</span>
          <b class="diag-badge tone-${worstTone(cards.flatMap((card) => card.issues))}">${count}</b>
        </button>`;
    }).join('');

    box.classList.remove('hidden');
    box.innerHTML = `<div class="diag-headline">${escapeHtml(headline(entries))}</div>${rows}`;
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
          <button type="button" class="diag-tool" data-action="download" title="下載 診斷報告.txt（含完整四級分類，給工程師看）">下載報告</button>
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

  function openDrawer(sectionId = 'items') {
    const drawer = ensureDrawer();
    state.activeSection = SECTIONS.some((section) => section.id === sectionId) ? sectionId : 'items';
    drawer.classList.remove('hidden');
    renderDrawer();
    refreshWithImageCheck();
  }

  function closeDrawer() {
    state.drawer?.classList.add('hidden');
  }

  /** 右側批次預覽那張縮圖的圖（同一張 dataURL），還沒畫好就先給名稱框。 */
  function thumbHtml(index, name) {
    const img = document.querySelector(`.batch-thumb[data-index="${index}"] img`);
    const src = img?.getAttribute('src');
    return src ? `<img src="${escapeHtml(src)}" alt="" />` : `<span>${escapeHtml(name)}</span>`;
  }

  function issueHtml(issue) {
    const detail = issue.detail ? `<span class="diag-detail" title="點一下展開／收起">${escapeHtml(issue.detail)}</span>` : '';
    return `
      <li class="diag-issue tone-${issue.tone}" title="${escapeHtml(PLAIN_TONE_LABEL[issue.tone] || '')}">
        <span class="diag-dot"></span>
        <span class="diag-kind">${escapeHtml(issue.kind)}</span>
        ${detail}
        ${issue.count > 1 ? `<em class="diag-times">×${issue.count}</em>` : ''}
      </li>`;
  }

  function cardHtml(card, sectionId) {
    const linkable = card.index >= 0;
    const head = sectionId === 'parse' ? '' : `
      <div class="diag-card-head">
        ${linkable ? `<span class="diag-card-thumb">${thumbHtml(card.index, card.name)}</span>` : ''}
        <strong class="diag-card-name">${escapeHtml(card.name)}</strong>
        ${linkable ? '<span class="diag-card-go">跳到這張 →</span>' : ''}
      </div>`;
    return `
      <article class="diag-card tone-${card.tone} ${linkable ? 'is-link' : ''}" data-index="${card.index}">
        ${head}
        <ul class="diag-issues">${card.issues.map(issueHtml).join('')}</ul>
      </article>`;
  }

  function renderDrawer() {
    const drawer = state.drawer;
    const report = state.report;
    if (!drawer || !report) return;
    const { AppState } = core();
    const entries = flatEntries(report);
    const sheet = AppState?.batchDiagnostics?.sheetName || '';
    drawer.querySelector('[data-role="subtitle"]').textContent = [sheet, headline(entries)].filter(Boolean).join('　・　');

    drawer.querySelector('[data-role="tabs"]').innerHTML = SECTIONS.map((section) => {
      const count = section.id === 'parse' ? (parseCards(entries)[0]?.issues.length || 0) : countOf(section.id, entries);
      return `<button type="button" class="diag-tab ${section.id === state.activeSection ? 'is-active' : ''}" data-section="${section.id}">${escapeHtml(section.label)} <b>${count}</b></button>`;
    }).join('');

    const section = SECTIONS.find((entry) => entry.id === state.activeSection) || SECTIONS[0];
    const cards = cardsOf(section.id, entries);
    const legend = section.id === 'parse' ? '' : `
      <div class="diag-legend">
        <span class="tone-red"><i class="diag-dot"></i>會出錯圖</span>
        <span class="tone-orange"><i class="diag-dot"></i>圖會出但可能不好看</span>
        <span class="tone-yellow"><i class="diag-dot"></i>已略過</span>
        <small>${escapeHtml(section.hint)}</small>
      </div>`;
    drawer.querySelector('[data-role="body"]').innerHTML = cards.length
      ? legend + cards.map((card) => cardHtml(card, section.id)).join('')
      : `<div class="diag-empty">${section.id === 'items' ? '每一張都沒有需要注意的地方。' : '這一區沒有項目。'}</div>`;
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
    if (tab) { state.activeSection = tab.dataset.section; renderDrawer(); return; }
    const detail = event.target.closest('.diag-detail');
    if (detail) { detail.classList.toggle('is-open'); return; }
    const card = event.target.closest('.diag-card.is-link');
    if (card) {
      const index = Number(card.dataset.index);
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
    if (row) openDrawer(row.dataset.section);
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
