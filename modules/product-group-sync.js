/* 整合版（自 18節 移植）— 商品組：商品圖 N ↔ 價格 N
 *
 * 2026-10-06 回饋第 4／5 項：
 *   4. 價格1、價格2 隨商品圖等比例放大縮小（字級、框、相對位置一起）
 *   5. 單獨調整價格時，不連動商品圖；之後商品圖再動，價格仍帶著使用者的偏移一起走
 * 使用者決定：配對「規則錨點優先、命名次之」；字級不設上下限。
 *
 * 配對：
 *   - 價格層 `anchor.layerKey`／`priceAnchorKey` 指到的商品圖（18節 規則檔產生的 auto_price_v2 都有）
 *   - 否則用命名：product_N／商品圖N／商品圖_左中右 ↔ 價格N／價格_N／price_N（沒有編號的 product ↔ 價格）
 *
 * 做法：掛進 core 的 AssetSyncHub。商品圖 begin 時，把每個配對價格「相對商品圖框的位置（以框寬高為單位）」與
 * 「字級／框相對商品圖寬的比例」記下來；update 時依商品圖目前的框換算回去——所以使用者先前對價格做的手動偏移會自動保留。
 * 價格層自己 begin 時什麼都不做（只動自己）。core 原本的 PriceTransformEngine（18節 原文）會先把價格「跟著移動」，
 * 本模組在它之後覆寫成等比結果，最終以本模組為準。跨版位連動（asset-link-sync）移到別張的商品圖，也呼叫這裡的 capture／apply。
 * 只影響互動，不改任何自動產圖輸出。
 */
(function initProductGroupSync() {
  'use strict';

  const core = () => ({ AppState: window.AppState, Geometry: window.Geometry, AssetSyncHub: window.AssetSyncHub });
  const flag = (name, fallback) => { const value = window.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };
  const norm = (value) => String(value || '').toLowerCase().replace(/[\s_\-]+/g, '');

  /** 從圖層 key 取「商品／價格」的編號；沒有編號回傳 ''。product_1 → '1'、商品圖_左 → '左'、價格2 → '2'。 */
  function indexToken(key) {
    const match = /(?:product|商品圖|商品|價格|price)[_\s-]*([0-9]+|左|中|右)$/i.exec(String(key || '').trim());
    return match ? match[1] : '';
  }
  const isProductKey = (key, layer) => layer?.type === 'image' && /^(product|商品圖|商品)/i.test(String(key || '').trim());
  const isPriceLayer = (key, layer) => layer?.type === 'text' && (layer.source === 'auto_price_v2' || /價格|price/i.test(String(key || '')));

  const ProductGroupSync = {
    session: null,

    /** 這個商品圖配對到的價格層 [{ key, layer }]。 */
    pricesFor(template, productKey) {
      const layers = template?.layers || {};
      const product = layers[productKey];
      if (!isProductKey(productKey, product)) return [];
      const anchored = Object.entries(layers).filter(([key, layer]) => isPriceLayer(key, layer) && (layer.anchor?.layerKey === productKey || layer.priceAnchorKey === productKey));
      if (anchored.length) return anchored.map(([key, layer]) => ({ key, layer }));
      const productKeys = Object.entries(layers).filter(([key, layer]) => isProductKey(key, layer)).map(([key]) => key);
      const token = indexToken(productKey);
      return Object.entries(layers)
        // 只有一個商品圖時，所有沒錨點的價格都算它的（例如 SKBN 的 價格／價格_2）；多個商品圖才比對編號。
        .filter(([key, layer]) => isPriceLayer(key, layer) && !layer.anchor?.layerKey && (productKeys.length === 1 || indexToken(key) === token))
        .map(([key, layer]) => ({ key, layer }));
    },

    box(key, layer) {
      const { Geometry } = core();
      const box = Geometry.getLayerBox(key, layer);
      return { x: box.x, y: box.y, width: Math.max(1, box.width), height: Math.max(1, box.height) };
    },

    /** 記下商品組目前的相對關係（商品圖 begin 時呼叫，之後 apply 用）。 */
    captureGroup(template, productKey) {
      const product = template?.layers?.[productKey];
      const prices = this.pricesFor(template, productKey);
      if (!product || !prices.length) return null;
      const base = this.box(productKey, product);
      return {
        template, productKey, base,
        prices: prices.map(({ key, layer }) => {
          const box = this.box(key, layer);
          const fontSize = Number(layer.fontSizePx) || 24;
          return {
            key, layer,
            relCenterX: (box.x + box.width / 2 - base.x) / base.width,
            relCenterY: (box.y + box.height / 2 - base.y) / base.height,
            widthRatio: box.width / base.width,
            heightRatio: box.height / base.width,
            fontRatio: fontSize / base.width,
            lineHeightRatio: (Number(layer.lineHeight) || fontSize * (Number(layer.lineHeightMultiplier) || 1.08)) / base.width,
            rangeRatios: Array.isArray(layer.textStyleRanges) ? layer.textStyleRanges.map((range) => (Number(range?.fontSizePx) || fontSize) / base.width) : null,
          };
        }),
      };
    },

    /** 依商品圖目前的框，把配對價格等比換算回去。回傳改了幾個價格層。 */
    applyGroup(group, currentBox) {
      if (!group) return 0;
      const { Geometry } = core();
      const current = currentBox || this.box(group.productKey, group.template.layers[group.productKey]);
      let count = 0;
      group.prices.forEach((entry) => {
        const layer = group.template.layers?.[entry.key];
        if (!layer || layer !== entry.layer) return;
        const width = entry.widthRatio * current.width;
        const height = entry.heightRatio * current.width;
        const centerX = current.x + entry.relCenterX * current.width;
        const centerY = current.y + entry.relCenterY * current.height;
        const fontSize = Math.round(entry.fontRatio * current.width * 10) / 10;
        layer.fontSizePx = fontSize;
        if (layer.fontSizePt !== undefined) layer.fontSizePt = fontSize;
        layer.lineHeight = Math.round(entry.lineHeightRatio * current.width * 100) / 100;
        if (entry.rangeRatios && Array.isArray(layer.textStyleRanges)) {
          layer.textStyleRanges.forEach((range, index) => { if (range && entry.rangeRatios[index] !== undefined) range.fontSizePx = Math.round(entry.rangeRatios[index] * current.width * 10) / 10; });
        }
        Geometry.applyBox(entry.key, layer, { x: centerX - width / 2, y: centerY - height / 2, width, height }, { template: group.template, notifyPrice: false, notifyLayout: false });
        count += 1;
      });
      return count;
    },

    // ── AssetSyncHub 介面：只在商品圖 begin 時啟動；價格層 begin 不做事（單獨調價格不連動） ──
    begin(template, key) {
      const layer = template?.layers?.[key];
      if (!isProductKey(key, layer)) { this.session = null; return false; }
      const group = this.captureGroup(template, key);
      this.session = group ? { group } : null;
      return !!group;
    },
    update(template, key) {
      const session = this.session;
      if (!session || session.group.template !== template || session.group.productKey !== key) return 0;
      return this.applyGroup(session.group);
    },
    finish(template, key) {
      const count = this.update(template, key);
      this.session = null;
      return count;
    },
  };

  function wire() {
    const { AssetSyncHub } = core();
    if (!AssetSyncHub || AssetSyncHub.engines?.has?.('product-group-sync')) return;
    if (flag('sync.productGroup', false) !== true) return;
    AssetSyncHub.register('product-group-sync', ProductGroupSync);
    window.ProductGroupSync = ProductGroupSync;
  }

  const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
  whenReady();
})();
