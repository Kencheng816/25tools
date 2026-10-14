/* 整合版（自 18節 移植）— 多選與群組移動
 *
 * 2026-10-06 回饋第 7f 項：Shift 點選多個圖層一起拖、一起用方向鍵微調。
 * core 原本已有 Shift 加選（AppState.selectedLayers 陣列），但拖曳／方向鍵只動第一個。這裡補上：
 *   - 拖曳：主圖層移多少，其他被選的（未鎖定）圖層跟著移多少；放開時再對每個跟著移的圖層走一次同步匯流排（跨版位連動也會跟）
 *   - 點已在多選內的圖層（不按 Shift）不會把多選打散，而是以它當主圖層開始拖
 *   - 方向鍵／Shift+方向鍵：所有被選圖層一起 1px／10px
 *   - 畫面：其他被選圖層畫細虛線框，整組外面再畫一個淡藍虛線的群組框
 * 縮放／旋轉仍只作用在主圖層（群組等比縮放不在這次範圍）。只影響互動，不改任何輸出。
 */
(function initMultiSelect() {
  'use strict';

  const core = () => ({ AppState: window.AppState, Geometry: window.Geometry, LayerManager: window.LayerManager, Renderer: window.Renderer, Interaction: window.Interaction, Inspector: window.Inspector, AssetSyncHub: window.AssetSyncHub, HistoryManager: window.HistoryManager });
  const state = { pointerDownOnSelected: false, dragStarts: null };

  const selected = () => core().AppState?.selectedLayers || [];
  const layerOf = (key) => core().AppState?.template?.layers?.[key];
  const secondaries = () => selected().slice(1).filter((key) => { const layer = layerOf(key); return layer && !layer.locked && !layer.__nonInteractive; });

  function shiftLayer(key, dx, dy) {
    const { Geometry } = core();
    const layer = layerOf(key);
    if (!layer) return;
    const box = Geometry.getLayerBox(key, layer);
    Geometry.applyBox(key, layer, { x: box.x + dx, y: box.y + dy, width: box.width, height: box.height }, { template: core().AppState.template });
  }

  /** 放開滑鼠後：跟著移動的圖層各自走一次 begin→update→finish，讓跨版位連動／商品組也套到它們身上。 */
  function syncSecondariesAfterDrag() {
    const { AssetSyncHub, Geometry, AppState } = core();
    const starts = state.dragStarts;
    state.dragStarts = null;
    if (!starts || !AssetSyncHub) return;
    starts.forEach(({ key, start }) => {
      const layer = layerOf(key);
      if (!layer) return;
      const final = Geometry.getLayerBox(key, layer);
      if (Math.abs(final.x - start.x) < 0.01 && Math.abs(final.y - start.y) < 0.01) return;
      // 匯流排的 begin 以「當下」為基準：先退回起點 → begin → 套最終位置 → update → finish。
      Geometry.applyBox(key, layer, start, { template: AppState.template });
      AssetSyncHub.begin(AppState.template, key);
      Geometry.applyBox(key, layer, final, { template: AppState.template });
      AssetSyncHub.update(AppState.template, key);
      AssetSyncHub.finish(AppState.template, key);
    });
  }

  function drawSecondaryOutlines(canvasCtx) {
    const { Geometry, AppState } = core();
    const keys = selected();
    if (keys.length < 2 || !AppState?.template) return;
    canvasCtx.save();
    let union = null;
    keys.forEach((key, index) => {
      const layer = layerOf(key);
      if (!layer) return;
      const box = Geometry.getSelectionBox(key, layer);
      union = union ? { x: Math.min(union.x, box.x), y: Math.min(union.y, box.y), right: Math.max(union.right, box.x + box.width), bottom: Math.max(union.bottom, box.y + box.height) } : { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height };
      if (index === 0) return;
      const rotation = Number(layer.rotation || 0) * Math.PI / 180;
      canvasCtx.save();
      canvasCtx.translate(box.x + box.width / 2, box.y + box.height / 2);
      canvasCtx.rotate(rotation);
      canvasCtx.strokeStyle = 'rgba(96,165,250,.9)';
      canvasCtx.lineWidth = 1.5;
      canvasCtx.setLineDash([5, 4]);
      canvasCtx.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
      canvasCtx.restore();
    });
    if (union) {
      canvasCtx.strokeStyle = 'rgba(59,130,246,.55)';
      canvasCtx.lineWidth = 1;
      canvasCtx.setLineDash([3, 5]);
      canvasCtx.strokeRect(union.x - 6, union.y - 6, union.right - union.x + 12, union.bottom - union.y + 12);
    }
    canvasCtx.restore();
  }

  function wireCore() {
    const { Interaction, LayerManager, Renderer, AppState, Geometry, Inspector } = core();
    if (!Interaction || !LayerManager || !Renderer || Interaction.__multiSelectWired) return;
    Interaction.__multiSelectWired = true;

    // 拖曳：主圖層移多少，其他被選的跟著移多少
    const originalMove = Interaction.moveSelected;
    Interaction.moveSelected = function moveSelectedGroup(pos, event, ...rest) {
      const others = (AppState.isDragging && !AppState.isResizing && !AppState.isRotating) ? secondaries() : [];
      const activeKey = selected()[0];
      const before = others.length && activeKey ? Geometry.getLayerBox(activeKey, layerOf(activeKey)) : null;
      const result = originalMove.call(this, pos, event, ...rest);
      if (before) {
        const after = Geometry.getLayerBox(activeKey, layerOf(activeKey));
        const dx = after.x - before.x; const dy = after.y - before.y;
        if (dx || dy) others.forEach((key) => shiftLayer(key, dx, dy));
      }
      return result;
    };

    // 點已在多選內的圖層（不按 Shift）：保留多選，把它換成主圖層
    const originalSelect = LayerManager.select;
    LayerManager.select = function selectKeepingGroup(key, additive = false, ...rest) {
      const current = selected();
      if (!additive && state.pointerDownOnSelected && current.length > 1 && current.includes(key)) {
        AppState.selectedLayers = [key, ...current.filter((item) => item !== key)];
        this.render?.(); Inspector?.render?.(); Renderer?.render?.();
        return;
      }
      return originalSelect.call(this, key, additive, ...rest);
    };

    const originalDrawSelection = Renderer.drawSelection;
    Renderer.drawSelection = function drawSelectionWithGroup(canvasCtx, ...rest) {
      const result = originalDrawSelection.call(this, canvasCtx, ...rest);
      drawSecondaryOutlines(canvasCtx);
      return result;
    };
  }

  function bind() {
    const canvas = document.getElementById('canvas');
    canvas?.addEventListener('pointerdown', (event) => {
      const { Geometry, LayerManager, AppState } = core();
      if (event.button !== 0 || !Geometry?.mousePos || !LayerManager?.hitTest) return;
      const pos = Geometry.mousePos(event);
      const hit = LayerManager.hitHandle?.(pos) ? selected()[0] : LayerManager.hitTest(pos);
      state.pointerDownOnSelected = !!hit && selected().length > 1 && selected().includes(hit);
      // 記下其他被選圖層的起點，放開時補同步
      const others = state.pointerDownOnSelected && !event.shiftKey ? selected().filter((key) => key !== hit) : [];
      state.dragStarts = others.length ? others.filter((key) => { const layer = layerOf(key); return layer && !layer.locked; }).map((key) => ({ key, start: { ...Geometry.getLayerBox(key, layerOf(key)) } })) : null;
      void AppState;
    }, { capture: true });
    window.addEventListener('pointerup', () => {
      state.pointerDownOnSelected = false;
      if (state.dragStarts) setTimeout(syncSecondariesAfterDrag, 0); // 等 core 的 onMouseUp 把主圖層 finish 完
    }, { capture: true });

    // 方向鍵：多選時全部一起動；在 capture 階段攔下 core 只動主圖層的處理
    window.addEventListener('keydown', (event) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const { AppState, HistoryManager, AssetSyncHub, Renderer, Inspector } = core();
      if (AppState?.editingLayerKey) return;
      const keys = selected().filter((key) => { const layer = layerOf(key); return layer && !layer.locked; });
      if (keys.length < 2) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const step = event.shiftKey ? 10 : event.altKey ? 0.5 : 1;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      HistoryManager?.push?.();
      keys.forEach((key) => { AssetSyncHub?.begin(AppState.template, key); shiftLayer(key, dx, dy); AssetSyncHub?.update(AppState.template, key); AssetSyncHub?.finish(AppState.template, key); });
      Renderer?.render?.(); Inspector?.render?.();
    }, { capture: true });
  }

  function main() {
    bind();
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wireCore); else setTimeout(whenReady, 100); };
    whenReady();
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
