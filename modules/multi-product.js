/* 整合版（自 18節 移植，2026-11-06）— 工單商品圖欄「A + B」多張商品自動排版（18節 2026-11-02 封測第二輪）
 *
 * 工單「商品圖1／商品圖2」寫「吹風機 + ELIXIR 怡麗絲爾 全新A醇」（半形／全形＋都認）時，原本整串去找素材找不到、P 框留白。
 * 現在：拆成多個名字各自找素材，在原本的 P 框裡依「組合」排：2 張＝一大一小、3 張＝三角（中間大且高、兩側小且低）、
 * 其他＝平均並排（見 PRESETS）；每張在自己的格子裡等比縮放（先符合寬、超高改符合高）、垂直置中；找不到的那張略過、診斷列「素材缺少」。
 * 第一張用公版原本的商品圖層（價格錨點照舊跟它），其餘各複製一層（key＝<原 key>__multi<序號>、__multiProductOf 指回原層），
 * 排在原層後面。只有一個名字時完全不動（黃金不變）。
 *
 * 旗標 batch.multiProductSplit=true 的分類才生效（目前暖身BN）。純加法：包住 BatchManager.applyRecordToTemplate。
 * 25節：任何一個名字含「券」就不拆（使用者 2026-11-06 決定），券面一律整張素材、價格由價格引擎依整張券算。
 */
(function initMultiProduct() {
  'use strict';

  const FIELDS = ['商品圖1', '商品圖2'];
  const SPLITTER = /\s*[+＋]\s*/;
  const GAP_RATIO = 0.04;
  const NON_PRODUCT_WORDS = ['bg', '背景', 'kvbg', 'cta', '按鈕', 'button', 'logo', '會員日'];

  const core = () => ({ AppState: window.AppState, BatchManager: window.BatchManager, Geometry: window.Geometry });
  const COUPON_WORD = /券/;
  const isPriceLayer = (key, layer) => !!layer && layer.type === 'text' && (layer.source === 'auto_price_v2' || String(key).startsWith('__auto_price_v2_'));
  /** 哪一張是券（名字含「券」）；沒有回 -1 */
  const couponIndexOf = (parts) => parts.findIndex((part) => COUPON_WORD.test(String(part || '')));

  // ── 價格相對某個框的比例（跟 core ProductGroupSync 同一套公式，基準框可指定）──
  function capturePriceRel(template, baseBox) {
    const { Geometry } = core();
    if (!template?.layers || !baseBox || !(baseBox.width > 0) || !(baseBox.height > 0)) return null;
    const prices = Object.entries(template.layers).filter(([key, layer]) => isPriceLayer(key, layer));
    if (!prices.length) return null;
    return prices.map(([key, layer]) => {
      const box = Geometry.getLayerBox(key, layer);
      const fontSize = Number(layer.fontSizePx) || 24;
      return {
        key,
        relCenterX: (box.x + box.width / 2 - baseBox.x) / baseBox.width,
        relCenterY: (box.y + box.height / 2 - baseBox.y) / baseBox.height,
        widthRatio: box.width / baseBox.width, heightRatio: box.height / baseBox.width,
        fontRatio: fontSize / baseBox.width,
        lineHeightRatio: (Number(layer.lineHeight) || fontSize * (Number(layer.lineHeightMultiplier) || 1.08)) / baseBox.width,
        rangeRatios: Array.isArray(layer.textStyleRanges) ? layer.textStyleRanges.map((range) => (Number(range?.fontSizePx) || fontSize) / baseBox.width) : null,
      };
    });
  }

  /** 價格層的錨點改成 anchorKey，並以「現在的位置」當基準（core PriceTransformEngine 之後同步時就是從這個狀態等比移動）。 */
  function rebaseAnchor(template, priceKey, anchorKey) {
    const { Geometry } = core();
    const layer = template.layers[priceKey]; const anchorLayer = template.layers[anchorKey];
    if (!layer || !anchorLayer) return;
    const box = Geometry.getLayerBox(anchorKey, anchorLayer); const own = Geometry.getLayerBox(priceKey, layer);
    layer.anchor = {
      ...(layer.anchor || {}),
      layerKey: anchorKey,
      baseBox: { x: box.x, y: box.y, width: box.width, height: box.height, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2 },
      baseRotation: Number(anchorLayer.rotation || 0),
      offsetX: own.x + own.width / 2 - (box.x + box.width / 2),
      offsetY: own.y + own.height / 2 - (box.y + box.height / 2),
      baseFontSizePx: Number(layer.fontSizePx) || 24,
      baseWidth: own.width, baseHeight: own.height,
      baseLineHeight: Number(layer.lineHeight) || 0,
      baseStyleFontSizes: Array.isArray(layer.textStyleRanges) ? layer.textStyleRanges.map((range) => Number(range?.fontSizePx) || Number(layer.fontSizePx) || 24) : undefined,
    };
    if (layer.priceAnchorKey) layer.priceAnchorKey = anchorKey;
    layer._anchorDirty = false;
  }

  /** 把比例套回新的框；價格層排在 productKey 後面（畫在它上面）、錨點改掛在 productKey。回傳改了幾層。 */
  function applyPriceRel(template, productKey, rel, box) {
    const { Geometry } = core();
    if (!template?.layers || !rel || !box) return 0;
    let count = 0;
    rel.forEach((entry) => {
      const layer = template.layers[entry.key];
      if (!isPriceLayer(entry.key, layer)) return;
      const width = entry.widthRatio * box.width; const height = entry.heightRatio * box.width;
      const centerX = box.x + entry.relCenterX * box.width; const centerY = box.y + entry.relCenterY * box.height;
      const fontSize = Math.round(entry.fontRatio * box.width * 10) / 10;
      layer.fontSizePx = fontSize; if (layer.fontSizePt !== undefined) layer.fontSizePt = fontSize;
      layer.lineHeight = Math.round(entry.lineHeightRatio * box.width * 100) / 100;
      if (entry.rangeRatios && Array.isArray(layer.textStyleRanges)) layer.textStyleRanges.forEach((range, i) => { if (range && entry.rangeRatios[i] !== undefined) range.fontSizePx = Math.round(entry.rangeRatios[i] * box.width * 10) / 10; });
      Geometry.applyBox(entry.key, layer, { x: centerX - width / 2, y: centerY - height / 2, width, height }, { template, notifyPrice: false, notifyLayout: false });
      rebaseAnchor(template, entry.key, productKey);
      count += 1;
    });
    if (count && Array.isArray(template.renderOrder)) {
      const priceKeys = rel.map((entry) => entry.key).filter((key) => template.renderOrder.includes(key));
      template.renderOrder = template.renderOrder.filter((key) => !priceKeys.includes(key));
      const at = template.renderOrder.indexOf(productKey);
      template.renderOrder.splice(at >= 0 ? at + 1 : template.renderOrder.length, 0, ...priceKeys);
    }
    return count;
  }
  const flag = (name, fallback) => { const value = window.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };
  const norm = (value) => String(value || '').toLowerCase().replace(/[\s_\-()（）]/g, '');
  const clean = (value) => String(value ?? '').replace(/_x000d_/gi, '\n').replace(/\r\n?/g, '\n').trim();

  const splitParts = (value) => clean(value).split(SPLITTER).map((part) => part.trim()).filter(Boolean);

  /** 跟 core applyRecordToTemplate 相同的商品圖層判斷：非背景／CTA／LOGO 的未鎖定圖片層，商品圖1 排前面。 */
  function productLayerKeys(template) {
    const score = (key, layer) => {
      const label = norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
      if (label.includes('product') || label.includes(norm('商品圖1')) || label.includes(norm('曝品')) || label === 'p') return 0;
      if (label.includes(norm('商品圖2'))) return 1;
      return 2;
    };
    return Object.entries(template?.layers || {})
      .filter(([key, layer]) => {
        if (!layer || layer.type !== 'image' || layer.locked || layer.__multiProductOf) return false;
        const label = norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
        return !NON_PRODUCT_WORDS.some((word) => label.includes(norm(word)));
      })
      .sort((a, b) => score(...a) - score(...b))
      .map(([key]) => key);
  }

  /** P 框以 centerX／centerY 為準（公版匯出的 x 常是整張原圖的左邊、targetWidth 才是實際框寬，渲染是以中心點擺）。 */
  function normalizeBox(box) {
    if (!box) return null;
    const width = Number(box.targetWidth ?? box.width); const height = Number(box.maxTargetHeight ?? box.targetHeight ?? box.height);
    const centerX = Number.isFinite(Number(box.centerX)) ? Number(box.centerX) : Number(box.x) + width / 2;
    const centerY = Number.isFinite(Number(box.centerY)) ? Number(box.centerY) : Number(box.y) + height / 2;
    return { x: centerX - width / 2, y: centerY - height / 2, width, height, centerX, centerY };
  }

  /** 只清自己加的複製層；renderOrder 裡程式產生的層（例：HBN／DD Card 的副標膠囊 subtitle_frame 在 template.generatedLayers）不能碰。 */
  function removeClones(template, key) {
    const cloneKeys = Object.keys(template.layers).filter((candidate) => template.layers[candidate]?.__multiProductOf === key);
    cloneKeys.forEach((candidate) => { delete template.layers[candidate]; });
    if (Array.isArray(template.renderOrder)) template.renderOrder = template.renderOrder.filter((candidate) => !cloneKeys.includes(candidate));
  }

  // ── 排法（組合）──
  // row：平均並排（N 格等寬、同一條底線）
  // pair：一大一小（第 1 張大、靠左；第 2 張小、靠右、底線較低）
  // triangle：三角（第 1 張在中間、大且高；第 2、3 張在兩側、小且低，與中間稍微重疊）
  // 2026-11-02 使用者決定：自動產圖預設 2 張＝pair、3 張＝triangle、其他＝row；合成視窗裡可切換。
  const PRESETS = Object.freeze({
    row: (n) => Array.from({ length: n }, (_, i) => { const gap = GAP_RATIO; const w = (1 - gap * (n - 1)) / n; return { x: i * (w + gap), y: 0, w, h: 1 }; }),
    pair: () => [{ x: 0, y: 0, w: 0.62, h: 1 }, { x: 0.6, y: 0.3, w: 0.4, h: 0.7 }],
    triangle: () => [{ x: 0.24, y: 0, w: 0.52, h: 0.9 }, { x: 0, y: 0.32, w: 0.34, h: 0.68 }, { x: 0.66, y: 0.32, w: 0.34, h: 0.68 }],
  });
  const defaultPreset = (n) => (n === 2 ? 'pair' : n === 3 ? 'triangle' : 'row');

  /** P 框內各張的格子（相對比例 → 絕對座標）；preset 格數不夠時退回 row。 */
  function layoutSlots(box, count, preset) {
    const name = PRESETS[preset] && (preset === 'row' || PRESETS[preset]().length >= count) ? preset : 'row';
    return PRESETS[name](count).slice(0, count).map((r) => {
      const x = box.x + r.x * box.width; const y = box.y + r.y * box.height; const width = r.w * box.width; const height = r.h * box.height;
      return { x, y, width, height, centerX: x + width / 2, centerY: y + height / 2, targetWidth: width, targetHeight: height, maxTargetHeight: height, sizingMode: 'containByPBox' };
    });
  }

  /**
   * 25節：A 系（正式BN／暖身BN／MS）的 AssetLookup 一次只查一個資料夾（project），商品圖由各公版規則檔逐夾試
   * （本版位資料夾 → 共用素材）。這裡照同一套順序：工單專案夾 → 名稱含公版 id 的資料夾 → 共用素材 → 根目錄 → 其他；
   * B 系（一個 project 就查遍）第一次就命中，行為不變。
   */
  function findProductAsset(template, part, layer, field, prefix) {
    const { BatchManager } = core();
    const folders = [...new Set((window.AssetStore?.getFileEntries?.() || []).map((entry) => String(entry.folder || '')))];
    const templateId = norm(template?.templateId || template?.canvas?.templateId || '');
    const related = folders.filter((folder) => folder && templateId && (norm(folder).includes(templateId) || templateId.includes(norm(folder))));
    const candidates = [...new Set([template?.batchProject || template?.batchRecord?.__project || '', ...related, '共用素材', '', ...folders])];
    let last = { found: false, filename: '', attempts: [] };
    for (const project of candidates) {
      try {
        const match = BatchManager.findAssetFilename(part, { prefix, template, layer, layerKey: field, project });
        if (match?.found) return match;
        last = match || last;
      } catch (_) { /* 這個資料夾查不到就換下一個 */ }
    }
    return last;
  }

  function layout(template, key, parts, diagnostics, field) {
    const { BatchManager } = core();
    const base = template.layers[key];
    if (!base) return;
    removeClones(template, key);
    const rule = BatchManager.resolveTemplateProductImageRule?.(template);
    // 第一次用規則／公版的 P 框；之後（還原自動排版）用當初記下的那個——合成過的原層外框已經不是 P 框了
    const box = template.__multiProduct?.[key]?.box || normalizeBox(rule?.productImageBox || BatchManager.getProductImageBoxFromLayer(base));
    if (!box) return;
    const prefix = BatchManager.getTemplateAssetPrefix?.(template) || '';
    const missing = [];
    const placed = [];
    const preset = defaultPreset(parts.length);
    const slots = layoutSlots(box, parts.length, preset);
    // 價格是依「券佔滿整個 P 框」算出來的；第一次記下相對 P 框的比例（還原自動排版時沿用當初那組），排好後貼到券那一格
    const couponIndex = couponIndexOf(parts);
    const priceRel = template.__multiProduct?.[key]?.priceRel || (couponIndex >= 0 ? capturePriceRel(template, box) : null);

    parts.forEach((part, index) => {
      const layerKey = index === 0 ? key : `${key}__multi${index}`;
      const layer = index === 0 ? base : { ...base, psdName: `${base.psdName || key}_${index + 1}`, __multiProductOf: key, locked: false, hidden: false, visible: true };
      const match = findProductAsset(template, part, layer, field, prefix);
      layer.assetFilename = match.found ? match.filename : '';
      if (!match.found) missing.push(part); else placed.push(part);
      BatchManager.applyProductImageBox(layer, slots[index]);
      delete layer.widthLimitPolicy; delete layer.productImageSizingRule;
      if (index > 0) {
        template.layers[layerKey] = layer;
        // 疊放（使用者 2026-11-03 決定）：圖層由上而下 左→右→中，主商品（第 1 張，中間）在最下面、左邊壓最上
        // → 畫圖順序 [中, 右, 左]：第 2 張（左）插在原層後面、第 3 張（右）插在原層與第 2 張之間
        const order = Array.isArray(template.renderOrder) ? template.renderOrder : (template.renderOrder = Object.keys(template.layers));
        const at = order.indexOf(key);
        order.splice(at >= 0 ? at + 1 : order.length, 0, layerKey);
      }
    });
    template.__multiProduct = { ...(template.__multiProduct || {}), [key]: { field, parts, preset, couponIndex, priceRel, box: { x: box.x, y: box.y, width: box.width, height: box.height } } };
    if (priceRel && slots[couponIndex]) applyPriceRel(template, couponIndex === 0 ? key : `${key}__multi${couponIndex}`, priceRel, slots[couponIndex]);

    // 核心已為第一張寫過診斷（ok／missing）；補上整組的結果
    diagnostics.push({ field, status: 'ok', value: parts.join(' + '), target: `${parts.length} 張並排：${placed.join('、') || '（無）'}` });
    missing.forEach((part) => diagnostics.push({ field, status: 'missing', value: part, attempts: [part] }));
  }

  /** 價格重新貼回券上：core 的 stabilizeTemplateBeforePreview（暖身BN 覆寫版）會從 pricePresetMeta 重建價格層、錨回原商品層，
   *  重建完再依記下的比例貼回：合成過 → 貼到合成時記的券框；多張自動排版 → 貼到券那一格。 */
  function replacePricesOnCoupon(template) {
    const keys = productLayerKeys(template);
    const key = keys[0];
    if (!key || !template?.layers?.[key]) return 0;
    const compose = template.layers[key].productCompose;
    if (compose?.priceRel && compose.couponBox) return applyPriceRel(template, key, compose.priceRel, compose.couponBox);
    const meta = template.__multiProduct?.[key];
    if (!meta?.priceRel || !(meta.couponIndex >= 0)) return 0;
    const couponKey = meta.couponIndex === 0 ? key : `${key}__multi${meta.couponIndex}`;
    const { Geometry } = core();
    if (!template.layers[couponKey]) return 0;
    return applyPriceRel(template, couponKey, meta.priceRel, Geometry.getLayerBox(couponKey, template.layers[couponKey]));
  }

  function wireStabilize() {
    const { BatchManager } = core();
    if (!BatchManager?.stabilizeTemplateBeforePreview || BatchManager.stabilizeTemplateBeforePreview.__multiProductWired) return;
    const original = BatchManager.stabilizeTemplateBeforePreview;
    const wrapped = async function stabilizeThenReplacePrices(template, ...rest) {
      const result = await original.call(this, template, ...rest);
      try { replacePricesOnCoupon(template); } catch (_) { /* 貼價失敗不影響預覽 */ }
      return result;
    };
    wrapped.__multiProductWired = true;
    BatchManager.stabilizeTemplateBeforePreview = wrapped;
  }

  /** 還原自動排版（合成視窗「還原」用）：依當初記的 parts 重新找素材、重排複製層。 */
  function relayout(template, key) {
    const meta = template?.__multiProduct?.[key];
    if (!meta?.parts?.length) return false;
    const diagnostics = Array.isArray(template.batchDiagnostics) ? template.batchDiagnostics : (template.batchDiagnostics = []);
    layout(template, key, meta.parts, diagnostics, meta.field);
    delete template.__multiProduct[key].composed;
    return true;
  }

  function wire() {
    const { BatchManager } = core();
    wireStabilize();
    if (!BatchManager?.applyRecordToTemplate || BatchManager.applyRecordToTemplate.__multiProductWired) return;
    const original = BatchManager.applyRecordToTemplate;
    const wrapped = function applyRecordWithMultiProduct(template, record, ...rest) {
      if (flag('batch.multiProductSplit', false) !== true || !record) return original.call(this, template, record, ...rest);
      const multi = {};
      FIELDS.forEach((field) => {
        const parts = splitParts(record[field]);
        // 有券就先用券那一張跑 core（價格引擎看這個名字決定要不要產價格、單券雙券），沒有券就用第一張
        // 25節（使用者 2026-11-06 決定）：名字裡有「券」的不走拆分——25節 的券面都是整張合成好的素材（免運車加商城券_長券…），
        // 價格也是價格引擎依整張券素材算的，拆開會讓價格失去依據；只拆純商品的組合（例：免運車 + 禮物盒icon）。
        if (parts.length > 1 && couponIndexOf(parts) < 0) { multi[field] = { raw: record[field], parts }; record[field] = parts[0]; }
      });
      const result = original.call(this, template, record, ...rest);
      const fields = Object.keys(multi);
      if (fields.length) {
        const keys = productLayerKeys(template);
        const diagnostics = Array.isArray(template.batchDiagnostics) ? template.batchDiagnostics : (template.batchDiagnostics = []);
        fields.forEach((field) => {
          // 跟 core 一樣：只有一個商品圖層時，商品圖2 優先用那一層；兩層時 商品圖1→第 1 層、商品圖2→第 2 層
          const key = keys.length <= 1 ? keys[0] : (field === '商品圖2' ? keys[1] : keys[0]);
          if (key) layout(template, key, multi[field].parts, diagnostics, field);
          record[field] = multi[field].raw;
        });
      }
      return result;
    };
    wrapped.__multiProductWired = true;
    BatchManager.applyRecordToTemplate = wrapped;
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.MultiProduct = Object.freeze({ splitParts, productLayerKeys, findProductAsset, layoutSlots, defaultPreset, normalizeBox, relayout, capturePriceRel, applyPriceRel, rebaseAnchor, replacePricesOnCoupon, couponIndexOf, PRESETS, GAP_RATIO });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
