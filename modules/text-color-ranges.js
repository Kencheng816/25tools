/* 整合版（25節）— 改文字顏色要連 textStyleRanges 一起改（2026-11-06 封測 P0-1：「頭巾的文字無法調顏色」）
 *
 * 原因：A 系公版的文字層多半帶 textStyleRanges（PSD 匯出的逐段樣式；SP 文字標準再拿它產生符號縮小的小段），
 *       Renderer 畫字時每一段用「range.color」，只有沒有 range 的層才用 layer.color。
 *       面板／Inspector 改顏色只改 layer.color，所以畫面文風不動——頭巾副標就是這樣。
 * 做法：包住 Inspector.applyTextFromInputs（面板色票與進階的「顏色」欄位都走這條）：呼叫前記下 layer.color，
 *       呼叫後顏色變了就把每一段 range 的 color／fill 一起換成新色（整層同色；原本就多色的層也一律換成使用者選的那一色，
 *       因為使用者選色票就是要整層變色）。SP 文字標準之後重建 range 時是從現有 range 複製顏色，所以新色會留住。
 * 純加法：不動 core、不動規則檔；沒改顏色時什麼都不做，黃金輸出不變。
 */
(function initTextColorRanges() {
  'use strict';

  const normalize = (value) => String(value || '').trim().toLowerCase();

  function recolorRanges(layer, color) {
    if (!Array.isArray(layer?.textStyleRanges) || !layer.textStyleRanges.length) return 0;
    let changed = 0;
    layer.textStyleRanges.forEach((range) => {
      if (!range || typeof range !== 'object') return;
      if (normalize(range.color) !== normalize(color)) { range.color = color; changed += 1; }
      if (range.fill !== undefined && normalize(range.fill) !== normalize(color)) range.fill = color;
      if (range.style && typeof range.style === 'object') {
        if (range.style.color !== undefined) range.style.color = color;
        if (range.style.fill !== undefined) range.style.fill = color;
      }
    });
    return changed;
  }

  function activeTextLayer() {
    const key = window.AppState?.selectedLayers?.[0];
    const layer = key ? window.AppState?.template?.layers?.[key] : null;
    return layer && layer.type === 'text' ? layer : null;
  }

  function wire() {
    const inspector = window.Inspector;
    if (!inspector?.applyTextFromInputs || inspector.applyTextFromInputs.__colorRangesWired) return;
    const original = inspector.applyTextFromInputs;
    const wrapped = function applyTextFromInputsSyncingRangeColors(...args) {
      const layer = activeTextLayer();
      const before = layer ? layer.color : undefined;
      const result = original.apply(this, args);
      if (layer && layer.color && normalize(layer.color) !== normalize(before)) {
        if (recolorRanges(layer, layer.color)) {
          window.ManualOverrideManager?.mark?.(layer, ['color']);
          window.Renderer?.render?.();
        }
      }
      return result;
    };
    wrapped.__colorRangesWired = true;
    inspector.applyTextFromInputs = wrapped;
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.TextColorRanges = Object.freeze({ recolorRanges });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
