/* 整合版 5.4 – 票券型錄的兩個使用入口（window.CouponControls）
 *
 *   (a) 使用者手動換掉商品／票券圖後：用新檔名查型錄 → 重新判斷單／雙券與顏色 → 重上該商品的價格層顏色。
 *   (b) Inspector：選到價格層或商品／票券圖層時，顯示「目前票券判斷」，並可用下拉手動指定型錄項目。
 *
 * 手動決定記在 template.__couponOverrides[價格群組]，每次重新套版後由 applyOverrides 套回（core applyRecordToTemplate 尾端），
 * 存檔一起保存。沒有紀錄的公版完全不受影響；工單自動流程照原本 PriceColorResolver 走。
 *
 * 只處理「顏色」：型錄判成雙券但版面只有單一價格槽（或相反）時不改版面，只在 Inspector 顯示提醒，請使用者自行處理。
 * 本檔是靜態載入的模組，不分 A／B 血緣，只在事件發生時用 core 掛在 window 上的介面。
 */
(function initCouponControls() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const catalog = () => window.CouponCatalog;
  const AUTO_VALUE = '';

  const stem = (filename) => String(filename || '').split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/i, '');
  const isPriceLayer = (layer) => layer?.source === 'auto_price_v2';
  const isCouponImageLayer = (key, layer) => {
    if (!layer || layer.type !== 'image') return false;
    const label = catalog().norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
    return layer.role === 'product' || ['商品圖', '票券', '單券', '雙券', '券'].some((word) => label.includes(catalog().norm(word)))
      || /(^|[_\s])p(_|$|\d)/i.test(String(key));
  };

  /** 價格群組：同一個商品名的所有價格層。imageKey 有給時只取錨定到該商品圖的群組。 */
  function priceGroups(template, imageKey = null) {
    const groups = catalog().describeTemplate(template);
    if (!imageKey) return groups;
    const anchored = groups.filter((group) => group.priceLayerKeys.some((key) => {
      const layer = template.layers[key];
      return (layer?.anchor?.layerKey || layer?.anchorLayerKey || '') === imageKey;
    }));
    if (anchored.length) return anchored;
    // 沒有錨點資訊時：商品名＝素材檔名主幹 → 對回去；再不行且只有一組就用它。
    const wanted = catalog().norm(stem(template.layers[imageKey]?.assetFilename || ''));
    const byName = groups.filter((group) => wanted && catalog().norm(group.name) === wanted);
    if (byName.length) return byName;
    return groups.length === 1 ? groups : [];
  }

  function recordOverride(template, groupName, override) {
    if (!template || !groupName) return;
    if (!template.__couponOverrides || typeof template.__couponOverrides !== 'object') template.__couponOverrides = {};
    template.__couponOverrides[groupName] = { ...override, at: Date.now() };
  }
  function clearOverride(template, groupName) {
    if (template?.__couponOverrides) delete template.__couponOverrides[groupName];
  }

  /** 把分類結果的顏色套到一組價格層（含 SPTextStandard 產生的 textStyleRanges 顏色）。槽數不合時只回報、不動。 */
  function applyColors(template, group, classification) {
    if (!classification || classification.slots !== group.slots || !classification.slots) {
      return { applied: 0, slotMismatch: !!classification && classification.slots !== group.slots };
    }
    let applied = 0;
    group.priceLayerKeys.forEach((key) => {
      const layer = template.layers[key];
      if (!layer) return;
      const color = classification.colors[layer.priceSlot || 'single'];
      if (!color) return;
      const previous = layer.color;
      layer.color = color;
      (layer.textStyleRanges || []).forEach((range) => {
        if (!range || typeof range !== 'object') return;
        if (range.color === previous || range.color === undefined) range.color = color;
        if (range.fill === previous || range.fill === undefined) range.fill = color;
      });
      applied += 1;
    });
    return { applied, slotMismatch: false };
  }

  /** 重新套版後把手動／換圖的票券決定套回。沒有紀錄時不做事。 */
  function applyOverrides(template) {
    const overrides = template?.__couponOverrides;
    if (!overrides || typeof overrides !== 'object' || !catalog()) return 0;
    let applied = 0;
    priceGroups(template).forEach((group) => {
      const override = overrides[group.name];
      if (!override?.id) return;
      const entry = catalog().entries.find((item) => item.id === override.id);
      if (!entry) return;
      const classification = catalog().classify(override.name || entry.aliases?.[0] || entry.id, template);
      if (!classification) return;
      applied += applyColors(template, group, { ...classification, id: entry.id, slots: entry.slots }).applied;
    });
    return applied;
  }

  /** (a) 手動換圖後：依新檔名重新分類並重上顏色。回傳 { group, classification, result } 或 null（不是票券圖／找不到群組／型錄不認識）。 */
  function onAssetReplaced(template, imageKey, layer, newFile) {
    if (!catalog() || !isCouponImageLayer(imageKey, layer)) return null;
    const groups = priceGroups(template, imageKey);
    if (!groups.length) return null;
    const name = stem(newFile?.name || layer.assetFilename);
    const classification = catalog().classify(name, template);
    const results = groups.map((group) => {
      if (!classification) return { group, classification: null, result: { applied: 0, unknown: true } };
      const result = applyColors(template, group, classification);
      if (result.applied) recordOverride(template, group.name, { id: classification.id, name, source: 'asset' });
      return { group, classification, result };
    });
    const summary = results[0];
    if (!classification) window.showToast?.(`型錄不認識「${name}」，價格顏色維持不變`);
    else if (summary.result.slotMismatch) window.showToast?.(`「${classification.label}」是${classification.slots === 2 ? '雙' : '單'}券，但版面是${summary.group.slots === 2 ? '雙' : '單'}價格，顏色未變更`);
    else if (summary.result.applied) window.showToast?.(`已依「${classification.label}」重上價格顏色`);
    window.Renderer?.render?.();
    render();
    return results;
  }

  /** (b) Inspector 手動指定：entryId 空字串＝回到自動（移除紀錄，顏色維持目前值）。 */
  function setManual(template, group, entryId) {
    if (!entryId) { clearOverride(template, group.name); render(); return { applied: 0 }; }
    const entry = catalog().entries.find((item) => item.id === entryId);
    if (!entry) return { applied: 0 };
    const classification = catalog().classify(entry.aliases?.[0] || entry.id, template);
    const result = applyColors(template, group, { ...classification, id: entry.id, slots: entry.slots });
    if (result.applied) {
      window.HistoryManager?.push?.();
      recordOverride(template, group.name, { id: entry.id, name: entry.aliases?.[0] || entry.id, source: 'manual' });
    }
    window.Renderer?.render?.();
    refreshThumb(template);
    render();
    return result;
  }

  function refreshThumb(template) {
    const BatchManager = window.BatchManager;
    if (!window.AppState?.batchMode || !BatchManager) return;
    const index = BatchManager.indexOfTemplate?.(template) ?? -1;
    if (typeof BatchManager.refreshThumbsForIndexes === 'function' && index >= 0) { BatchManager.markThumbsStale?.([index]); BatchManager.refreshThumbsForIndexes([index]); }
    else BatchManager.renderPreviewGrid?.({ revealWhenDone: true });
  }

  // ── Inspector ──
  function currentGroups() {
    const AppState = window.AppState;
    const key = AppState?.selectedLayers?.[0];
    const layer = key ? AppState.template?.layers?.[key] : null;
    const template = AppState?.template;
    if (!key || !layer || !template || !catalog()) return { template, groups: [] };
    if (isPriceLayer(layer)) {
      return { template, groups: priceGroups(template).filter((group) => group.priceLayerKeys.includes(key)) };
    }
    if (isCouponImageLayer(key, layer)) return { template, groups: priceGroups(template, key) };
    return { template, groups: [] };
  }

  function render() {
    const box = $('couponControls');
    if (!box) return;
    const { template, groups } = currentGroups();
    box.classList.toggle('hidden', !groups.length);
    if (!groups.length) return;
    const group = groups[0];
    const override = template.__couponOverrides?.[group.name];
    const entry = override?.id ? catalog().entries.find((item) => item.id === override.id) : group.catalog;
    const status = $('couponStatus');
    if (status) {
      const colorText = Object.entries(group.colors).map(([slot, color]) => `${slot === 'single' ? '' : `${slot === 'top' ? '上' : '下'} `}${color}`).join('、');
      status.textContent = `${group.name || '（未命名）'} → ${entry ? entry.label : '型錄不認識'}${override ? `（${override.source === 'manual' ? '手動指定' : '依素材'}）` : ''}｜${group.slots === 2 ? '雙' : '單'}價格｜${colorText}`;
    }
    const select = $('couponSelect');
    if (select) {
      const options = [`<option value="${AUTO_VALUE}">依工單／素材自動判斷</option>`]
        .concat(catalog().entries.filter((item) => item.slots > 0).map((item) => `<option value="${item.id}">${item.label}${item.slots !== group.slots ? '（槽數不同，只提醒不改色）' : ''}</option>`));
      select.innerHTML = options.join('');
      select.value = override?.id || AUTO_VALUE;
    }
  }

  function bindUI() {
    $('couponSelect')?.addEventListener('change', (event) => {
      const { template, groups } = currentGroups();
      if (!template || !groups.length) return;
      const result = setManual(template, groups[0], event.target.value);
      if (event.target.value && !result.applied) window.showToast?.('槽數不同，未變更顏色（請手動調整版面）');
    });
  }

  window.CouponControls = Object.freeze({ render, applyOverrides, onAssetReplaced, setManual, priceGroups });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bindUI, { once: true });
  else bindUI();
})();
