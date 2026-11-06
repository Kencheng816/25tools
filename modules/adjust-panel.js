/* 整合版（自 18節 移植，2026-11-06）— 「調整」面板：對目前選到的製作物（18節 2026-11-02 封測第二輪，參考 Circle 編輯器）
 *
 * 面板上半部不再只針對「選取的圖層」，而是列出目前製作物（AppState.template）的：
 *   - 文案：公版裡每一個可改的文字層（略過內部／參考用／隱藏／鎖定／價格層）各一格，顯示字數＋色票（2026-11-04），
 *     由上到下 主標→副標→警語→其他；逐層微調（選取的圖層／X Y 寬 高／字型／字級）在 app.html 收進進階模式 #layerFineTune，
 *     打字即時進圖層、畫布重繪；放開（change）才更新縮圖。改字走 core 原本的 Inspector.applyTextFromInputs
 *     （同一條路：History、手動覆寫標記、規則 onTextChanged、文字標準），所以行為跟在「選取的圖層」改內容完全一樣。
 *   - 品牌 LOGO／商品：各一顆按鈕開編輯視窗（LOGO 視窗、商品合成視窗由後續批次提供；公版沒有對應圖層就不顯示）。
 * 純加法：包住 Inspector.render／LayerManager.render 刷新欄位；欄位 DOM 只在製作物或文字層組合變了才重建，打字中不會被重建。
 */
(function initAdjustPanel() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const core = () => ({ AppState: window.AppState, Inspector: window.Inspector, LayerManager: window.LayerManager, BatchManager: window.BatchManager, Renderer: window.Renderer });
  const clean = (value) => String(value ?? '').replace(/_x000d_/gi, '\n').replace(/\r\n?/g, '\n');
  const norm = (value) => String(value || '').toLowerCase().replace(/[\s_\-()（）]/g, '');

  const LABELS = { title: '主標', subtitle: '副標', legal: '警語', cta: 'CTA', product: '商品圖' };
  const LOGO_WORDS = ['logo'];
  const NON_PRODUCT_WORDS = ['bg', '背景', 'kvbg', 'cta', '按鈕', 'button', 'logo', '會員日', '券面', '兌換', '底圖', '規範', '範圍'];

  let signature = '';

  // ── 圖層分類 ──

  const isUsable = (layer) => layer && !layer.__internal && !layer.__guide && layer.hidden !== true;

  /** 2026-11-04：欄位固定由上到下 主標 → 副標 → 警語（法務）→ 其他（同一類內照圖層由上往下）。 */
  const ROLE_ORDER = [
    ['title', ['主標', 'title', '大標', 'headline']],
    ['subtitle', ['副標', 'subtitle', '小標']],
    ['legal', ['警語', '法務', 'legal', '小字', '注意事項']],
  ];
  function roleRank(key, layer) {
    const label = norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
    // 先認副標／警語，再認主標（"subtitle" 裡也含 "title"）
    const matched = [...ROLE_ORDER].reverse().find(([, words]) => words.some((word) => label.includes(norm(word))));
    return matched ? ROLE_ORDER.findIndex(([role]) => role === matched[0]) : ROLE_ORDER.length;
  }

  function textLayers(template) {
    const order = Array.isArray(template?.renderOrder) ? template.renderOrder : Object.keys(template?.layers || {});
    const entries = order
      .map((key) => [key, template.layers[key]])
      .filter(([, layer]) => isUsable(layer) && layer.type === 'text' && !layer.locked && layer.source !== 'auto_price_v2')
      .reverse(); // renderOrder 由下往上畫；面板由上往下列，主標通常在最上層
    return entries
      .map((entry, index) => ({ entry, rank: roleRank(entry[0], entry[1]), index }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ entry }) => entry);
  }

  function imageLayers(template, predicate) {
    return Object.entries(template?.layers || {}).filter(([key, layer]) => isUsable(layer) && layer.type === 'image' && predicate(norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`)));
  }
  const FIXED_LOGO_WORDS = ['蝦皮', '會員日', 'kol代播', 'shopee', '商城狂購節', '狂購節', '25號']; // 公版自帶的品牌／活動 LOGO（25節：商城狂購節 活動 LOGO），不是使用者要換的
  const logoLayers = (template) => imageLayers(template, (label) => LOGO_WORDS.some((word) => label.includes(word)) && !FIXED_LOGO_WORDS.some((word) => label.includes(norm(word))));
  const productLayers = (template) => imageLayers(template, (label) => !NON_PRODUCT_WORDS.some((word) => label.includes(norm(word))));

  function labelOf(key, layer, used) {
    const base = LABELS[String(key).toLowerCase()] || (/[一-鿿]/.test(layer.psdName || '') ? layer.psdName : (layer.psdName || key));
    let label = base; let n = 2;
    while (used.has(label)) label = `${base} ${n++}`;
    used.add(label);
    return label;
  }

  // ── 欄位 DOM ──

  function buildFields(template, entries) {
    const box = $('itemTextFields');
    box.innerHTML = '';
    const used = new Set();
    entries.forEach(([key, layer]) => {
      const row = document.createElement('label');
      row.className = 'item-text-field';
      row.dataset.layerKey = key;
      const head = document.createElement('div');
      head.className = 'item-text-head';
      const name = document.createElement('span'); name.textContent = labelOf(key, layer, used);
      const count = document.createElement('span'); count.className = 'item-text-count';
      // 2026-11-04：顏色留在一般模式——每個欄位旁一顆色票，直接改該層文字顏色
      const color = document.createElement('input');
      color.type = 'color'; color.className = 'item-text-color'; color.title = '文字顏色';
      color.value = /^#[0-9a-f]{6}$/i.test(layer.color || '') ? layer.color : '#000000';
      color.addEventListener('input', () => applyColor(key, color.value));
      color.addEventListener('change', () => refreshThumb());
      head.append(name, color, count);
      const input = document.createElement('textarea');
      input.rows = 1;
      input.className = 'item-text-input';
      input.value = clean(layer.text);
      row.append(head, input);
      box.appendChild(row);
      syncCount(input, count);
      autoGrow(input);
      input.addEventListener('focus', () => selectLayer(key));
      input.addEventListener('input', () => { syncCount(input, count); autoGrow(input); applyText(key, input.value); });
      input.addEventListener('change', () => refreshThumb());
    });
  }

  const syncCount = (input, count) => { count.textContent = String(Array.from(input.value.replace(/\n/g, '')).length); };
  const autoGrow = (input) => { input.style.height = 'auto'; input.style.height = `${Math.max(30, input.scrollHeight)}px`; };

  function selectLayer(key) {
    const { AppState, Inspector, Renderer, LayerManager } = core();
    if (!AppState?.template?.layers?.[key] || AppState.selectedLayers?.[0] === key) return;
    AppState.selectedLayers = [key];
    Inspector?.render?.(); LayerManager?.render?.(); Renderer?.render?.();
  }

  /** 改字：讓該層成為選取層，把內容填進 core 的 #textInput，再走 Inspector.applyTextFromInputs（與原本面板同一條路）。 */
  function applyText(key, value) {
    const { AppState, Inspector } = core();
    const layer = AppState?.template?.layers?.[key];
    if (!layer || layer.type !== 'text') return;
    if (AppState.selectedLayers?.[0] !== key) { AppState.selectedLayers = [key]; Inspector?.render?.(); }
    const textInput = $('textInput');
    if (textInput && typeof Inspector?.applyTextFromInputs === 'function') {
      textInput.value = value;
      Inspector.applyTextFromInputs();
    }
    // HBN 這類規則每次重畫會把主標從工單再抄一次：標成手動改過，manual-override-guard 會保住
    window.ManualOverrideManager?.mark?.(layer, ['text']);
    layer.text = value;
    core().Renderer?.render?.();
  }

  /** 改顏色：同改字一樣走 core 的 #colorInput → Inspector.applyTextFromInputs。 */
  function applyColor(key, value) {
    const { AppState, Inspector } = core();
    const layer = AppState?.template?.layers?.[key];
    if (!layer || layer.type !== 'text' || !/^#[0-9a-f]{6}$/i.test(value)) return;
    if (AppState.selectedLayers?.[0] !== key) { AppState.selectedLayers = [key]; Inspector?.render?.(); }
    const colorInput = $('colorInput');
    if (colorInput && typeof Inspector?.applyTextFromInputs === 'function') {
      colorInput.value = value;
      Inspector.applyTextFromInputs();
    } else {
      layer.color = value;
    }
    // 標成手動改過：規則每次重畫會把主標／副標顏色寫回預設（DD card、POPUP…），modules/manual-override-guard.js 靠這個標記把它保住
    window.ManualOverrideManager?.mark?.(layer, ['color']);
    layer.color = value;
    core().Renderer?.render?.();
  }

  function refreshThumb() {
    const { AppState, BatchManager } = core();
    const index = AppState?.activeIndex;
    if (!(index >= 0) || !AppState.batchMode) return;
    BatchManager?.markThumbsStale?.([index]);
    BatchManager?.refreshThumbsForIndexes?.([index]);
  }

  // ── 刷新 ──

  function render() {
    const { AppState } = core();
    const template = AppState?.template;
    const body = $('itemAdjustBody'); const empty = $('itemAdjustEmpty');
    if (!body || !empty) return;
    const ready = !!(template?.layers && AppState.batchMode);
    body.classList.toggle('hidden', !ready);
    empty.classList.toggle('hidden', ready);
    if (!ready) { signature = ''; return; }

    const entries = textLayers(template);
    const logos = logoLayers(template); const products = productLayers(template);
    const nextSignature = `${AppState.activeIndex}|${template.templateId}|${entries.map(([key]) => key).join(',')}|${logos.length}|${products.length}`;
    if (nextSignature !== signature) {
      signature = nextSignature;
      $('itemAdjustName').textContent = AppState.templates?.[AppState.activeIndex]?.name || template.templateId || '';
      buildFields(template, entries);
      const hasLogoBackdrop = !!window.LogoBackdropControls?.configFor?.(template);
      $('itemLogoSection').classList.toggle('hidden', !logos.length && !hasLogoBackdrop);
      $('editLogoBtn')?.classList.toggle('hidden', !logos.length);
      window.LogoEditor?.pickLogoKey?.(template);
      $('itemProductSection').classList.toggle('hidden', !products.length);
      renderComposeStatus(template);
      return;
    }
    renderComposeStatus(template);
    // 同一張：只同步沒有在打字的欄位（畫布上直接改字、復原等）
    document.querySelectorAll('#itemTextFields .item-text-field').forEach((row) => {
      const input = row.querySelector('textarea'); const layer = template.layers[row.dataset.layerKey];
      if (!input || !layer || document.activeElement === input) return;
      const text = clean(layer.text);
      if (input.value !== text) { input.value = text; syncCount(input, row.querySelector('.item-text-count')); autoGrow(input); }
      const swatch = row.querySelector('.item-text-color');
      if (swatch && document.activeElement !== swatch && /^#[0-9a-f]{6}$/i.test(layer.color || '') && swatch.value.toLowerCase() !== layer.color.toLowerCase()) swatch.value = layer.color;
    });
  }

  /** 商品區：合成過 → 顯示「已合成（組合）」、按鈕改「重新調整」、多一顆「還原自動排版」。 */
  function renderComposeStatus(template) {
    const status = window.ProductComposer?.composeStatus?.(template) || null;
    const line = $('composeStatus'); const button = $('editProductBtn'); const restore = $('restoreProductBtn');
    if (line) { line.classList.toggle('hidden', !status); if (status) line.textContent = `已合成：${status.items} 張・${status.presetLabel}（可重新調整，或還原成自動排版）`; }
    if (button) button.textContent = status ? '重新調整' : '編輯商品';
    if (restore) restore.classList.toggle('hidden', !status);
  }

  function wrap(target, method, after) {
    if (!target?.[method] || target[method].__adjustPanelWired) return;
    const original = target[method];
    const wrapped = function wrappedForAdjustPanel(...args) { const result = original.apply(this, args); try { after(); } catch (_) { /* 面板刷新失敗不影響核心 */ } return result; };
    wrapped.__adjustPanelWired = true;
    target[method] = wrapped;
  }

  function wire() {
    const { Inspector, LayerManager } = core();
    wrap(Inspector, 'render', render);
    wrap(LayerManager, 'render', render);
    render();
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.AdjustPanel = Object.freeze({ render, textLayers, logoLayers, productLayers });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
