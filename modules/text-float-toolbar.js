/* 整合版（自 18節 移植）— 文字浮動工具列
 *
 * 2026-10-02 回饋：改字時字級／顏色／對齊要一直看左側 Inspector，不直覺。這條工具列浮在文字框正上方（太靠上就改到下方），
 * 預設隱藏，打開的時機（和使用者談定的 UI/UX）：
 *   - 雙擊進入編輯 → 出現；開始打字 1 秒後淡到 30%，滑鼠移過去或選取了一段文字就完全顯示
 *   - 右鍵文字層 → 出現（不一定要在編輯中）
 *   - 編輯中 Ctrl/Cmd + / → 顯示／隱藏切換
 *   - 📌 釘選 → 一直顯示、不淡出；記在這台電腦的 localStorage
 * 內容：字級 −／數值／＋、粗體、顏色、對齊、行距 −／＋、確認 ✓、取消 ✕。所有改動即時反映到畫布並與左側 Inspector 同步。
 *
 * 做法：字級／對齊直接按左側 Inspector 既有的按鈕（沿用 core 的 History／縮圖刷新），顏色／粗體／行距直接改圖層後重畫。
 * 按工具列時用 preventDefault 擋掉焦點轉移，隱藏編輯框才不會 blur → commit。只影響編輯操作，不改任何產圖輸出。
 */
(function initTextFloatToolbar() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PIN_STORAGE_KEY = 'textFloatToolbar.pinned';
  const FADE_DELAY_MS = 1000;
  const core = () => ({ AppState: window.AppState, Renderer: window.Renderer, TextEditor: window.TextEditor, Geometry: window.Geometry, HistoryManager: window.HistoryManager, Inspector: window.Inspector, LayerManager: window.LayerManager });

  const state = { root: null, visible: false, pinned: false, fadeTimer: null, hidden: false, interacting: false };

  const readPinned = () => { try { return localStorage.getItem(PIN_STORAGE_KEY) === '1'; } catch (_) { return false; } };
  const writePinned = (value) => { try { localStorage.setItem(PIN_STORAGE_KEY, value ? '1' : '0'); } catch (_) { /* 無法寫入時只影響這次 */ } };

  // ── 目標圖層：編輯中的那一層，否則目前選取的文字層 ──
  function targetLayer() {
    const { AppState } = core();
    const key = AppState?.editingLayerKey || AppState?.selectedLayers?.[0];
    const layer = key ? AppState?.template?.layers?.[key] : null;
    return layer && layer.type === 'text' && !layer.locked ? { key, layer } : null;
  }

  // ── 建立 DOM ──
  function build() {
    const root = document.createElement('div');
    root.id = 'textFloatToolbar';
    root.className = 'text-float-toolbar hidden';
    root.setAttribute('role', 'toolbar');
    root.innerHTML = `
      <button type="button" data-action="size-dec" title="縮小字級">A−</button>
      <input type="number" data-field="size" step="0.5" min="6" max="300" title="字級 (px)" />
      <button type="button" data-action="size-inc" title="放大字級">A+</button>
      <span class="tft-sep"></span>
      <button type="button" data-action="bold" title="粗體（Ctrl+B）"><b>B</b></button>
      <label class="tft-color" title="文字顏色"><input type="color" data-field="color" /></label>
      <span class="tft-sep"></span>
      <button type="button" data-action="align-left" title="齊左">≡</button>
      <button type="button" data-action="align-center" title="置中">☰</button>
      <button type="button" data-action="align-right" title="齊右">≡</button>
      <span class="tft-sep"></span>
      <button type="button" data-action="lh-dec" title="行距縮小">↕−</button>
      <button type="button" data-action="lh-inc" title="行距放大">↕+</button>
      <span class="tft-sep"></span>
      <button type="button" data-action="commit" class="tft-ok" title="確認（Ctrl+Enter）">✓</button>
      <button type="button" data-action="cancel" class="tft-cancel" title="取消（Esc）">✕</button>
      <button type="button" data-action="pin" class="tft-pin" title="釘選：一直顯示、不自動淡出" aria-label="釘選"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6z"/><path d="M12 15v6"/></svg></button>`;
    root.querySelector('[data-action="align-left"]').style.textAlign = 'left';
    root.querySelector('[data-action="align-right"]').style.textAlign = 'right';
    document.body.appendChild(root);
    return root;
  }

  // ── 顯示／隱藏／淡出 ──
  function show({ reason } = {}) {
    if (!state.root || !targetLayer()) return;
    state.hidden = false;
    state.root.classList.remove('hidden');
    state.visible = true;
    sync();
    position();
    wake(reason);
  }

  function hide() {
    if (!state.root) return;
    state.root.classList.add('hidden');
    state.root.classList.remove('is-dim');
    state.visible = false;
    clearTimeout(state.fadeTimer);
  }

  /** 完全顯示；非釘選時 1 秒後淡到 30%（有選取範圍時不淡）。 */
  function wake(reason) {
    if (!state.root) return;
    state.root.classList.remove('is-dim');
    clearTimeout(state.fadeTimer);
    if (state.pinned || reason === 'selection' || reason === 'hover') return;
    state.fadeTimer = setTimeout(() => { if (state.visible && !state.pinned && !state.root.matches(':hover') && !hasSelection()) state.root.classList.add('is-dim'); }, FADE_DELAY_MS);
  }

  function hasSelection() {
    const editor = $('inlineTextEditor');
    return !!editor && document.activeElement === editor && editor.selectionEnd > editor.selectionStart;
  }

  /** 放在文字框正上方（置中）；上方放不下就放下方。用 Geometry.screenRectForBox 換成螢幕座標，position: fixed。 */
  function position() {
    const target = targetLayer();
    const { Geometry } = core();
    if (!state.root || !target || !Geometry?.getLayerBox || !Geometry?.screenRectForBox) return;
    const box = Geometry.getLayerBox(target.key, target.layer);
    const rect = Geometry.screenRectForBox(box);
    const width = state.root.offsetWidth || 420;
    const height = state.root.offsetHeight || 40;
    const margin = 10;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.top - height - margin;
    if (top < 8) top = rect.top + rect.height + margin;
    state.root.style.left = `${Math.round(left)}px`;
    state.root.style.top = `${Math.round(top)}px`;
  }

  /** 把圖層目前的值填到工具列上（字級、顏色、粗體、對齊）。 */
  function sync() {
    const target = targetLayer();
    if (!state.root || !target) return;
    const { layer } = target;
    const size = state.root.querySelector('[data-field="size"]');
    if (size && document.activeElement !== size) size.value = Number(layer.fontSizePx || 24);
    const color = state.root.querySelector('[data-field="color"]');
    if (color && /^#[0-9a-f]{6}$/i.test(String(layer.color || ''))) color.value = layer.color;
    state.root.querySelector('[data-action="bold"]')?.classList.toggle('is-on', Number(layer.fontWeight) >= 600);
    ['left', 'center', 'right'].forEach((align) => state.root.querySelector(`[data-action="align-${align}"]`)?.classList.toggle('is-on', (layer.align || 'center') === align));
    state.root.querySelector('[data-action="pin"]')?.classList.toggle('is-on', state.pinned);
  }

  // ── 動作 ──
  function afterLayerChange(target) {
    const { Renderer, Inspector, AppState } = core();
    window.SmartAssetManager?.markActiveThumbStale?.(AppState.template);
    window.TextEditingUx?.markDirty?.(); // 編輯中改字級／對齊／行距 → 文字框重新貼合
    Renderer?.render?.();
    Inspector?.render?.();
    sync();
    position();
    void target;
  }

  function run(action) {
    const target = targetLayer();
    const { HistoryManager, TextEditor } = core();
    if (!target && action !== 'pin') return;
    switch (action) {
      case 'size-dec': $('fontSizeDecBtn')?.click(); break;
      case 'size-inc': $('fontSizeIncBtn')?.click(); break;
      case 'align-left': case 'align-center': case 'align-right':
        document.querySelector(`#alignGroup button[data-align="${action.replace('align-', '')}"]`)?.click(); break;
      case 'bold':
        HistoryManager?.push?.();
        target.layer.fontWeight = Number(target.layer.fontWeight) >= 600 ? 400 : 700;
        break;
      case 'lh-dec': case 'lh-inc': {
        HistoryManager?.push?.();
        const fontSize = Number(target.layer.fontSizePx) || 24;
        const current = Number(target.layer.lineHeight) || fontSize * (Number(target.layer.lineHeightMultiplier) || 1.05);
        const next = Math.max(fontSize * 0.8, current + (action === 'lh-inc' ? 2 : -2));
        target.layer.lineHeight = Math.round(next * 10) / 10;
        if (target.layer.lineHeightMultiplier !== undefined) target.layer.lineHeightMultiplier = Math.round((next / fontSize) * 100) / 100;
        break;
      }
      case 'commit': TextEditor?.commit?.(); if (!state.pinned) hide(); return;
      case 'cancel': TextEditor?.cancel?.(); if (!state.pinned) hide(); return;
      case 'pin':
        state.pinned = !state.pinned;
        writePinned(state.pinned);
        window.showToast?.(state.pinned ? '文字工具列已釘選' : '已取消釘選');
        break;
      default: return;
    }
    afterLayerChange(target);
    wake();
  }

  function applyColor(value) {
    const target = targetLayer();
    const { HistoryManager } = core();
    if (!target || !/^#[0-9a-f]{6}$/i.test(value) || value === target.layer.color) return;
    HistoryManager?.push?.();
    target.layer.color = value;
    const inspectorColor = $('colorInput'); if (inspectorColor) inspectorColor.value = value;
    afterLayerChange(target);
  }

  function applySize(value) {
    const target = targetLayer();
    const { HistoryManager } = core();
    const size = Math.max(6, Math.min(300, Number(value)));
    if (!target || !Number.isFinite(size) || size === target.layer.fontSizePx) return;
    HistoryManager?.push?.();
    target.layer.fontSizePx = size; target.layer.fontSizePt = size;
    if (target.layer.lineHeightMultiplier) target.layer.lineHeight = size * target.layer.lineHeightMultiplier;
    const inspectorSize = $('fontSizeInput'); if (inspectorSize) inspectorSize.value = size;
    afterLayerChange(target);
  }

  // ── 事件 ──
  function bind(root) {
    // 按工具列不搶焦點：隱藏編輯框保持 focus，core 的 blur→commit 不會觸發。顏色選擇器需要焦點，另外處理。
    root.addEventListener('pointerdown', (event) => {
      if (event.target.closest('input')) { state.interacting = true; return; }
      event.preventDefault();
    });
    root.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (button) run(button.dataset.action);
    });
    root.addEventListener('pointerenter', () => wake('hover'));
    root.addEventListener('pointerleave', () => wake());
    const color = root.querySelector('[data-field="color"]');
    color.addEventListener('input', () => applyColor(color.value));
    color.addEventListener('change', () => { applyColor(color.value); refocusEditor(); });
    const size = root.querySelector('[data-field="size"]');
    size.addEventListener('change', () => { applySize(size.value); refocusEditor(); });
    size.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); applySize(size.value); refocusEditor(); } });

    // 隱藏編輯框因為工具列輸入框（顏色／字級）而 blur 時，攔下 core 的「blur → commit」；輸入完再把焦點還回去。
    const editor = $('inlineTextEditor');
    editor?.addEventListener('blur', (event) => {
      if (!state.interacting) return;
      event.stopImmediatePropagation();
    }, { capture: true });
    editor?.addEventListener('input', () => { if (state.visible) wake(); });
    document.addEventListener('selectionchange', () => { if (state.visible && hasSelection()) wake('selection'); });

    // 編輯中 Ctrl/Cmd + /：顯示／隱藏；Ctrl/Cmd + B：粗體
    window.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const { AppState } = core();
      if (!AppState?.editingLayerKey) return;
      if (event.key === '/') { event.preventDefault(); if (state.visible) { hide(); state.hidden = true; } else show({ reason: 'hover' }); }
      if (event.key.toLowerCase() === 'b') { event.preventDefault(); run('bold'); }
    }, { capture: true });

    // 右鍵文字層 → 選取並顯示工具列
    const canvas = $('canvas');
    canvas?.addEventListener('contextmenu', (event) => {
      const { Geometry, LayerManager, AppState } = core();
      if (!Geometry?.mousePos || !LayerManager?.hitTest) return;
      const key = LayerManager.hitTest(Geometry.mousePos(event));
      const layer = key ? AppState?.template?.layers?.[key] : null;
      if (!layer || layer.type !== 'text' || layer.locked) return;
      event.preventDefault();
      if (!AppState.editingLayerKey) { LayerManager.select(key); core().Inspector?.render?.(); core().Renderer?.render?.(); }
      show({ reason: 'hover' });
    });

    window.addEventListener('resize', () => { if (state.visible) position(); });
  }

  function refocusEditor() {
    state.interacting = false;
    const { AppState } = core();
    const editor = $('inlineTextEditor');
    if (AppState?.editingLayerKey && editor) editor.focus({ preventScroll: true });
  }

  // ── 接線到 TextEditor／Renderer（__appReady 之後） ──
  function wireCore() {
    const { TextEditor, Renderer } = core();
    if (!TextEditor || !Renderer || TextEditor.__textFloatToolbarWired) return;
    TextEditor.__textFloatToolbarWired = true;
    const originalOpen = TextEditor.open;
    TextEditor.open = function openWithToolbar(key, ...rest) {
      const result = originalOpen.call(this, key, ...rest);
      if (core().AppState?.editingLayerKey === key && !state.hidden) show();
      return result;
    };
    ['commit', 'cancel'].forEach((name) => {
      const original = TextEditor[name];
      TextEditor[name] = function finishWithToolbar(...args) {
        const result = original.apply(this, args);
        state.hidden = false;
        if (state.pinned && targetLayer()) { sync(); position(); } else hide();
        return result;
      };
    });
    const originalRender = Renderer.render;
    Renderer.render = function renderWithToolbar(...args) {
      const result = originalRender.apply(this, args);
      if (state.visible) { if (targetLayer()) { sync(); position(); } else hide(); }
      else if (state.pinned && targetLayer() && !state.hidden) show({ reason: 'hover' });
      return result;
    };
  }

  function main() {
    state.pinned = readPinned();
    state.root = build();
    bind(state.root);
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wireCore); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.TextFloatToolbar = Object.freeze({ show, hide, isVisible: () => state.visible, isPinned: () => state.pinned });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
