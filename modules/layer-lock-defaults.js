/* 整合版（自 18節 移植）— 圖層預設鎖定（例如 KV_BG）
 *
 * 2026-10-06 回饋：KV_BG 圖層預設鎖定，避免調整其他圖層時誤拖到底圖。
 * 旗標 `layers.lockOnLoadPatterns`：圖層 key 或 psdName 符合任一樣式（不分大小寫，`*` 萬用）就在第一次出現在主畫布時鎖定。
 * 鎖定後不會被點選／拖曳／Delete，照常輸出；圖層清單的鎖頭可解鎖——每個版位只套一次（template.__lockDefaultsApplied），
 * 解鎖後不會再被鎖回去，存檔會一併記住。
 *
 * 不用 core 既有的 LayerDefaults.apply（它掛在 B 系公版載入流程，A 系原文 loadTemplateFolder 不會經過），
 * 改在 Renderer.render 之前對 AppState.templates 逐一套用，A／B 系都通。只影響互動，不改任何輸出。
 */
(function initLayerLockDefaults() {
  'use strict';

  const core = () => ({ AppState: window.AppState, Renderer: window.Renderer });
  const flag = (name, fallback) => { const value = window.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };

  function compilePatterns(patterns) {
    return (Array.isArray(patterns) ? patterns : []).filter((pattern) => typeof pattern === 'string' && pattern.trim()).map((pattern) => {
      const escaped = pattern.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${escaped}$`, 'i');
    });
  }

  let matchers = null;
  function shouldLock(key, layer) {
    if (!matchers) matchers = compilePatterns(flag('layers.lockOnLoadPatterns', []));
    if (!matchers.length) return false;
    const names = [key, layer?.psdName].filter(Boolean).map(String);
    return names.some((name) => matchers.some((matcher) => matcher.test(name)));
  }

  function applyTo(template) {
    if (!template?.layers || template.__lockDefaultsApplied === true) return;
    Object.entries(template.layers).forEach(([key, layer]) => {
      if (layer && layer.locked !== true && shouldLock(key, layer)) layer.locked = true;
    });
    template.__lockDefaultsApplied = true; // 可列舉：存檔／複製都帶著，解鎖後不會被重新鎖回
  }

  function applyAll() {
    const { AppState } = core();
    if (!AppState) return;
    (AppState.templates || []).forEach((item) => applyTo(item?.data || item));
    applyTo(AppState.template);
  }

  function wireCore() {
    const { Renderer } = core();
    if (!Renderer || Renderer.__layerLockDefaultsWired) return;
    Renderer.__layerLockDefaultsWired = true;
    if (!compilePatterns(flag('layers.lockOnLoadPatterns', [])).length) return; // 這個分類沒設定 → 不掛
    const originalRender = Renderer.render;
    Renderer.render = function renderWithLockDefaults(...args) {
      applyAll();
      return originalRender.apply(this, args);
    };
  }

  const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wireCore); else setTimeout(whenReady, 100); };
  whenReady();

  window.LayerLockDefaults = Object.freeze({ applyAll });
})();
