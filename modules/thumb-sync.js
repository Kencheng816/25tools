/* 整合版（自 18節 移植）— 右側批次縮圖與主畫布同步
 *
 * 2026-10-06 回饋：在主畫布上調整（拖曳／縮放／旋轉／Inspector 數值／刪除／替換／改字）後，右側縮圖要跟著更新。
 * 使用者決定：拖曳中不即時重畫，放開才更新。
 *
 * 做法：不依賴智慧物件引擎（18節 工具都關著），改在 Renderer.render（主畫布 ui 重繪）之後比對「目前版位的指紋」：
 * 把每個圖層會影響畫面的欄位（位置、大小、旋轉、文字、字級、顏色、素材檔名、顯示／隱藏…）串成字串，
 * 和上一次比；不一樣＝使用者改了 → 該張縮圖先灰化，放開滑鼠且 300ms 沒有再變動後，由 BatchManager 重畫那一張。
 * 切換版位（AppState.template 換成別的物件）只重設指紋、不刷新。產圖／縮圖流程不走 ui 重繪，不受影響；不改任何輸出。
 */
(function initThumbSync() {
  'use strict';

  const REFRESH_DELAY_MS = 300;
  const TRACKED_PROPS = ['x', 'y', 'width', 'height', 'centerX', 'centerY', 'rotation', 'hidden', 'opacity', 'text', 'fontSizePx', 'fontWeight', 'fontStyle', 'color', 'align', 'lineHeight', 'letterSpacing', 'assetFilename', 'fill', 'stroke', 'textStyleRanges', '__assetCleared'];

  const core = () => ({ AppState: window.AppState, Renderer: window.Renderer, BatchManager: window.BatchManager });
  const state = { template: null, fingerprint: '', pointerDown: false, pendingTemplate: null, timer: null };

  function fingerprint(template) {
    const layers = template?.layers || {};
    const parts = [];
    for (const key of Object.keys(layers)) {
      const layer = layers[key];
      if (!layer) continue;
      parts.push(key);
      for (const prop of TRACKED_PROPS) {
        const value = layer[prop];
        if (value === undefined) continue;
        parts.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }
    parts.push(JSON.stringify(template?.renderOrder || []));
    return parts.join('\u0001');
  }

  /** 標記這張待更新（灰化），等放開滑鼠且安靜 300ms 再刷新。 */
  function thumbElement(index) { return document.querySelector(`.batch-thumb[data-index="${index}"]`); }

  function scheduleRefresh(template) {
    const { BatchManager } = core();
    if (!BatchManager) return;
    const index = BatchManager.indexOfTemplate?.(template) ?? -1;
    // 以「右側有沒有這張縮圖」判斷，不看 batchMode（A 系原文流程沒有這個旗標）。
    if (index < 0 || !thumbElement(index)) return;
    thumbElement(index).classList.add('is-stale');
    state.pendingTemplate = template;
    clearTimeout(state.timer);
    state.timer = setTimeout(flush, REFRESH_DELAY_MS);
  }

  function flush() {
    const { BatchManager } = core();
    if (state.pointerDown) { state.timer = setTimeout(flush, REFRESH_DELAY_MS); return; } // 還按著滑鼠：放開再說
    state.timer = null;
    const template = state.pendingTemplate;
    state.pendingTemplate = null;
    if (!template || !BatchManager) return;
    const index = BatchManager.indexOfTemplate?.(template) ?? -1;
    if (index < 0) return;
    refreshThumb(index, template).catch((error) => console.warn('[thumb-sync] 縮圖刷新失敗', error));
  }

  /** 被改的一定是主畫布上這張（AppState.template，素材都已載入）→ 直接用 makeThumbURL 以同一條繪製路徑產縮圖，A／B 系都準；
   *  不是目前這張（例如跨版位連動改到別張）才走 refreshThumbsForIndexes。 */
  async function refreshThumb(index, template) {
    const { BatchManager, AppState } = core();
    const element = thumbElement(index);
    if (!element) return;
    if (template === AppState.template && typeof BatchManager.makeThumbURL === 'function') {
      const url = await BatchManager.makeThumbURL();
      const img = element.querySelector('img');
      if (img && url) img.src = url;
      element.classList.remove('is-stale');
      return;
    }
    await BatchManager.refreshThumbsForIndexes?.([index]);
    element.classList.remove('is-stale');
  }

  function afterMainCanvasRender() {
    const { AppState } = core();
    const template = AppState?.template;
    if (!template) return;
    const next = fingerprint(template);
    if (template !== state.template) { state.template = template; state.fingerprint = next; return; } // 切換版位：只記基線
    if (next === state.fingerprint) return;
    state.fingerprint = next;
    scheduleRefresh(template);
  }

  function wireCore() {
    const { Renderer } = core();
    if (!Renderer || Renderer.__thumbSyncWired) return;
    Renderer.__thumbSyncWired = true;
    const originalRender = Renderer.render;
    Renderer.render = function renderThenSyncThumb(options, ...rest) {
      const result = originalRender.call(this, options, ...rest);
      const isUi = !options || options.ui !== false;
      if (isUi && !rest.length) afterMainCanvasRender();
      return result;
    };
  }

  function main() {
    window.addEventListener('pointerdown', () => { state.pointerDown = true; }, { capture: true });
    const release = () => { state.pointerDown = false; if (state.pendingTemplate && !state.timer) state.timer = setTimeout(flush, REFRESH_DELAY_MS); };
    window.addEventListener('pointerup', release, { capture: true });
    window.addEventListener('pointercancel', release, { capture: true });
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wireCore); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.ThumbSync = Object.freeze({ scheduleRefresh });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
