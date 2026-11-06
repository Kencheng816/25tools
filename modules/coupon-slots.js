/* 整合版（自 18節 移植，2026-11-06）— 券面價格範圍（2026-11-04 封測回饋：價格位置以「券」為準，不再靠各公版規則檔的座標）
 *
 * 想法：價格永遠印在券的白色票面上，而券圖不管放到哪個公版都是同一張。所以每一種券（以素材檔名為鍵）定義一次
 * 「價格該放在券圖的哪個範圍」，產圖時找到券實際畫出來的框，依比例算出價格位置；公版換、框改、拖動、縮放、合成都跟著券走。
 *
 * 定義（每種券一組；座標全部是「佔券圖寬高的比例」0～1，角度是度）：
 *   { single: {cx,cy,w,h,angle} }                                   單券：一個價格範圍
 *   { top: {...}, bottom: {...}, mask: {...} }                       雙券：上券／下券各一個價格範圍；mask＝上券的遮罩
 *   名詞（使用者 2026-11-04 定義）：上券＝畫面上方、疊在「後面」那張；下券＝畫面下方、疊在「前面」那張。
 *   上券的價格會被前面的下券蓋住 → 遮罩框住「下券蓋到上券的區域」（通常就是整張下券），上券價格層畫的時候以它做反向裁切。
 * 來源：config/coupon-price-slots.js（window.COUPON_PRICE_SLOTS，跟專案一起上 GitHub）＋ 瀏覽器 localStorage（進階模式「定義券面案型範圍」
 * 視窗存的，優先）。沒有定義的券走原本規則算法，不受影響。
 *
 * 套用時機（純加法）：PriceCouponManager.apply 產完價格層後、BatchManager.stabilizeTemplateBeforePreview 之後，
 * 以及合成視窗／多商品貼價之後（它們直接呼叫 CouponSlots.applyToTemplate）。Renderer.drawText 包一層做上券的遮罩裁切。
 */
(function initCouponSlots() {
  'use strict';

  const STORAGE_KEY = '25tool_couponPriceSlots';
  const PRICE_PREFIX = '__auto_price_v2_';
  const SAFETY = 0.92; // 文字塞進範圍時留一點邊

  const core = () => ({ AppState: window.AppState, Geometry: window.Geometry, Renderer: window.Renderer, BatchManager: window.BatchManager, MultiProduct: window.MultiProduct, PriceCouponManager: window.PriceCouponManager });
  const isPriceLayer = (key, layer) => !!layer && layer.type === 'text' && (layer.source === 'auto_price_v2' || String(key).startsWith(PRICE_PREFIX));
  const slotOf = (key, layer) => layer?.priceSlot || String(key).replace(PRICE_PREFIX, '').replace(/_.*$/, '') || 'single';

  /** 素材檔名 → 券名（去路徑、去 manual/時間戳 前綴、去副檔名、去 _compose） */
  function couponNameOf(filename) {
    return String(filename || '').split(/[\\/]/).pop().replace(/^\d{10,}_/, '').replace(/\.[^.]+$/, '').replace(/_compose$/, '').trim();
  }

  // ── 定義的讀寫 ──
  let localDefs = null;
  function readLocal() {
    if (localDefs) return localDefs;
    try { localDefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (_) { localDefs = {}; }
    return localDefs;
  }
  function builtin() { return (window.COUPON_PRICE_SLOTS && window.COUPON_PRICE_SLOTS.coupons) || {}; }
  function all() { return { ...builtin(), ...readLocal() }; }
  function get(name) { const defs = all(); return defs[name] || null; }
  function has(name) { return !!get(name); }
  function save(name, definition) {
    const defs = readLocal();
    if (definition) defs[name] = definition; else delete defs[name];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defs)); } catch (_) { /* 無法存瀏覽器（隱私模式）仍可用這一次 */ }
    localDefs = defs;
  }
  /** 匯出成 config/coupon-price-slots.js 的內容（內建＋本機合併） */
  function exportSource() {
    return `/* 券面價格範圍定義（進階模式「定義券面案型範圍」匯出，${new Date().toISOString().slice(0, 10)}）。放在 config/，app.html 會載入。 */\nwindow.COUPON_PRICE_SLOTS = ${JSON.stringify({ version: 1, coupons: all() }, null, 2)};\n`;
  }

  // ── 幾何 ──
  const toRad = (deg) => (Number(deg) || 0) * Math.PI / 180;
  /** 比例框 → 公版座標（以券實際畫出來的框為基準） */
  function rectOf(rel, box) {
    return { cx: box.x + rel.cx * box.width, cy: box.y + rel.cy * box.height, w: rel.w * box.width, h: rel.h * box.height, angle: Number(rel.angle) || 0 };
  }

  /** 這張製作物裡「券」的圖層與它畫出來的框：[{ key, name, box, def }]。
   *  合成過的商品層：券名與框來自 productCompose（券在合成圖裡的位置，依目前商品框等比換算）。 */
  function couponsOf(template) {
    const { Geometry, MultiProduct } = core();
    const out = [];
    const keys = MultiProduct?.productLayerKeys?.(template) || [];
    const allKeys = [...keys, ...Object.keys(template?.layers || {}).filter((k) => template.layers[k]?.__multiProductOf)];
    allKeys.forEach((key) => {
      const layer = template.layers[key];
      if (!layer || layer.type !== 'image' || layer.hidden) return;
      const compose = layer.productCompose;
      if (compose?.couponRel && compose.items) {
        const name = couponNameOf(compose.items[compose.couponIndex || 0]?.name || '');
        const def = get(name);
        if (!def) return;
        const base = Geometry.getLayerBox(key, layer);
        const rel = compose.couponRel;
        out.push({ key, name, def, box: { x: base.x + rel.x * base.width, y: base.y + rel.y * base.height, width: rel.width * base.width, height: rel.height * base.height } });
        return;
      }
      const name = couponNameOf(layer.assetFilename);
      const def = get(name);
      if (def) out.push({ key, name, def, box: Geometry.getLayerBox(key, layer) });
    });
    return out;
  }

  /** 字級：讓文字塞進 w×h（寬用實際量測、高用字級） */
  function fitFontSize(layer, w, h) {
    const { Renderer } = core();
    const probe = fitFontSize.ctx || (fitFontSize.ctx = document.createElement('canvas').getContext('2d'));
    const text = String(layer.text || '').replace(/\s+/g, '');
    if (!text) return Number(layer.fontSizePx) || 24;
    const base = 100;
    probe.font = Renderer.font({ ...layer, fontSizePx: base });
    const letterSpacing = Number(layer.letterSpacing || 0);
    const width = [...text].reduce((sum, ch) => sum + probe.measureText(ch).width, 0) + letterSpacing * Math.max(0, text.length - 1);
    const byWidth = width > 0 ? (w * SAFETY) / width * base : base;
    const metrics = probe.measureText(text);
    const inkHeight = ((Number(metrics.actualBoundingBoxAscent) || base * 0.75) + (Number(metrics.actualBoundingBoxDescent) || 0)) / base; // 實際字高佔字級的比例
    const byHeight = h * SAFETY / Math.max(0.5, inkHeight);
    return Math.max(6, Math.floor(Math.min(byWidth, byHeight) * 10) / 10);
  }

  /** 把一個價格層放進範圍：置中、字級自動縮到塞得下、角度照範圍 */
  function placePrice(template, key, layer, rel, box, anchorKey) {
    const { Geometry, MultiProduct } = core();
    const rect = rectOf(rel, box);
    const fontSize = fitFontSize(layer, rect.w, rect.h);
    layer.fontSizePx = fontSize; layer.fontSizePt = fontSize;
    layer.lineHeight = Math.round(fontSize * 1.08 * 100) / 100;
    if (Array.isArray(layer.textStyleRanges)) {
      // 縮小符號（$、折）那套會依 fontSizePx 重算 ranges；先把每段字級照比例帶上，避免殘留舊字級
      const previous = Number(layer.__couponSlotFont) || fontSize;
      layer.textStyleRanges.forEach((range) => { if (range && Number.isFinite(Number(range.fontSizePx))) range.fontSizePx = Math.round(Number(range.fontSizePx) / previous * fontSize * 10) / 10; });
    }
    layer.__couponSlotFont = fontSize;
    layer.rotation = rect.angle;
    layer.align = 'center'; layer.textAlign = 'center';
    layer.hidden = false;
    // 框高用一行字的高度（core 之後會把文字層高度正規化成行高，先對齊才不會讓中心跑掉）；文字在框內垂直置中＝剛好在範圍中心
    const lineBox = Math.min(rect.h, layer.lineHeight);
    Geometry.applyBox(key, layer, { x: rect.cx - rect.w / 2, y: rect.cy - lineBox / 2, width: rect.w, height: lineBox }, { template, notifyPrice: false, notifyLayout: false });
    MultiProduct?.rebaseAnchor?.(template, key, anchorKey);
    layer.priceCouponSlot = { coupon: anchorKey, slot: slotOf(key, layer) };
  }

  /** 對一張製作物套用券面定義。回傳貼了幾個價格層。 */
  function applyToTemplate(template) {
    if (!template?.layers) return 0;
    const coupons = couponsOf(template);
    if (!coupons.length) return 0;
    const prices = Object.entries(template.layers).filter(([key, layer]) => isPriceLayer(key, layer) && !layer.hidden);
    if (!prices.length) return 0;
    const coupon = coupons[0]; // 一張製作物通常只有一張券；多張券時用第一張有定義的
    const def = coupon.def;
    let count = 0;
    prices.forEach(([key, layer]) => {
      const slot = slotOf(key, layer);
      const rel = def[slot] || (slot === 'single' ? def.top : null) || (def.single && (slot === 'top' || slot === 'bottom') ? def.single : null);
      if (!rel) return;
      placePrice(template, key, layer, rel, coupon.box, coupon.key);
      // 下券的價格會被上券（在最前面）擋住：記遮罩（相對券框的比例，畫的時候再換算）
      const mask = def.mask || def.bottom; // 沒另外框遮罩就用下券價格範圍當遮罩（使用者 2026-11-04 決定）
      if (slot === 'top' && mask) layer.priceClipMask = { coupon: coupon.key, rel: mask }; // 上券（後面那張）的價格被下券蓋住
      else delete layer.priceClipMask;
      count += 1;
    });
    if (count && Array.isArray(template.renderOrder)) {
      // 價格畫在券（或合成後的商品層）上面
      const priceKeys = prices.map(([key]) => key).filter((key) => template.renderOrder.includes(key));
      template.renderOrder = template.renderOrder.filter((key) => !priceKeys.includes(key));
      const at = template.renderOrder.indexOf(coupon.key);
      template.renderOrder.splice(at >= 0 ? at + 1 : template.renderOrder.length, 0, ...priceKeys);
    }
    return count;
  }

  /** 某一種券的定義改了：所有用到它的製作物重貼、縮圖重做 */
  function applyEverywhere(name) {
    const { AppState, BatchManager, Renderer } = core();
    const touched = [];
    (AppState?.templates || []).forEach((item, index) => {
      const template = item?.data;
      if (!template?.layers) return;
      if (!couponsOf(template).some((c) => c.name === name)) return;
      if (applyToTemplate(template)) touched.push(index);
    });
    Renderer?.render?.();
    if (touched.length) { BatchManager?.markThumbsStale?.(touched); BatchManager?.refreshThumbsForIndexes?.(touched); }
    return touched.length;
  }

  // ── 畫價格時的遮罩（下券被上券蓋住） ──
  function wireRenderer() {
    const { Renderer, Geometry } = core();
    if (!Renderer?.drawText || Renderer.drawText.__couponSlotWired) return;
    const original = Renderer.drawText;
    const wrapped = function drawTextWithCouponMask(canvasCtx, key, layer, template = window.AppState?.template, ...rest) {
      const mask = layer?.priceClipMask;
      const coupon = mask && template?.layers?.[mask.coupon];
      if (!coupon || coupon.hidden) return original.call(this, canvasCtx, key, layer, template, ...rest);
      const box = Geometry.getLayerBox(mask.coupon, coupon);
      const rect = rectOf(mask.rel, box);
      canvasCtx.save();
      canvasCtx.beginPath();
      canvasCtx.rect(-1e5, -1e5, 2e5, 2e5); // 整個畫布
      // 減掉上券的形狀（evenodd）
      const cos = Math.cos(toRad(rect.angle)); const sin = Math.sin(toRad(rect.angle));
      const corner = (dx, dy) => [rect.cx + dx * cos - dy * sin, rect.cy + dx * sin + dy * cos];
      const pts = [corner(-rect.w / 2, -rect.h / 2), corner(rect.w / 2, -rect.h / 2), corner(rect.w / 2, rect.h / 2), corner(-rect.w / 2, rect.h / 2)];
      canvasCtx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([x, y]) => canvasCtx.lineTo(x, y)); canvasCtx.closePath();
      canvasCtx.clip('evenodd');
      try { return original.call(this, canvasCtx, key, layer, template, ...rest); } finally { canvasCtx.restore(); }
    };
    wrapped.__couponSlotWired = true;
    Renderer.drawText = wrapped;
  }

  // ── 套用時機 ──
  function wireHooks() {
    const { PriceCouponManager, BatchManager } = core();
    if (PriceCouponManager?.apply && !PriceCouponManager.apply.__couponSlotWired) {
      const original = PriceCouponManager.apply;
      const wrapped = function applyThenCouponSlots(template, ...rest) { const result = original.call(this, template, ...rest); try { applyToTemplate(template); } catch (_) { /* 不影響原本的價格 */ } return result; };
      wrapped.__couponSlotWired = true;
      PriceCouponManager.apply = wrapped;
    }
    if (BatchManager?.stabilizeTemplateBeforePreview && !BatchManager.stabilizeTemplateBeforePreview.__couponSlotWired) {
      const original = BatchManager.stabilizeTemplateBeforePreview;
      const wrapped = async function stabilizeThenCouponSlots(template, ...rest) { const result = await original.call(this, template, ...rest); try { applyToTemplate(template); } catch (_) { /* 同上 */ } return result; };
      wrapped.__couponSlotWired = true;
      BatchManager.stabilizeTemplateBeforePreview = wrapped;
    }
  }

  function wire() { wireRenderer(); wireHooks(); }
  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.CouponSlots = Object.freeze({ couponNameOf, get, has, all, save, exportSource, applyToTemplate, applyEverywhere, couponsOf, rectOf, fitFontSize, STORAGE_KEY });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
