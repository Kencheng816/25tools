/* 整合版（自 18節 移植）— 換票券素材後，價格跟著重算
 *
 * 2026-10-07 回饋：更換票券素材（例如 雙券→單券、商城券→全站券）時，價格要依新素材的規則重算：
 * 該隱藏的價格2 隱藏、顏色依新券種、字級角度位置依規則；位置優先參考「已經用這張素材」的其他版位；預覽時即時看到。
 * 使用者決定（2026-10-07 更新）：單／雙券三層判讀＝檔名關鍵字 → 圖形分析（上下兩塊票面）→ 預設單券，規則檔只負責位置；
 * 名稱沒有「券」→ 移除價格層；「_有價格」→ 移除；單券→雙券缺價格2 → 複製價格1（PriceParser 原本就這樣處理）；
 * 位置參考順序：同版型同素材 → 不同版位同素材（依商品圖框等比）→ 同版型同券種任一張 → 規則預設；範圍：正式BN／暖身BN。
 *
 * 做法：價格層是 PriceCouponManager.apply(template, { 商品圖1, 價格 }) 依素材名由規則算出來的（auto_price_v2）；
 * 這裡用 template.pricePresetMeta 記住的原始價格字串，換成新素材名重跑一次 apply（只動價格層，其他圖層不碰），
 * 再依參考版位調整價格位置。預覽／替換都走同一支，預覽前先快照價格層，Esc 還原。不改自動產圖輸出。
 */
(function initCouponPriceSync() {
  'use strict';

  const core = () => ({ AppState: window.AppState, Geometry: window.Geometry, PriceCouponManager: window.PriceCouponManager, PriceRuleEngine: window.PriceRuleEngine, ProductGroupSync: window.ProductGroupSync, AssetLinkSync: window.AssetLinkSync });
  const PRICE_PREFIX = '__auto_price_v2_';
  const isPriceLayer = (key, layer) => !!layer && layer.type === 'text' && (layer.source === 'auto_price_v2' || key.startsWith(PRICE_PREFIX));

  /** 素材檔名 → 規則用的素材名：去路徑、去「manual/時間戳_」前綴、去副檔名。 */
  function productNameOf(assetFilename) {
    return String(assetFilename || '').split(/[\\/]/).pop().replace(/^\d{10,}_/, '').replace(/\.[^.]+$/, '').trim();
  }

  const CouponPriceSync = {
    /** 這個工具／這張版位有沒有「規則算出來的價格」可以重算。 */
    canRebuild(template, productKey) {
      const { PriceCouponManager } = core();
      if (!PriceCouponManager?.apply || !template?.layers) return false;
      const meta = template.pricePresetMeta;
      if (!meta || !String(meta.rawPrice || '').trim()) return false;
      const anchorKey = PriceCouponManager.findAnchorLayerKey?.(template);
      return !!anchorKey && anchorKey === productKey;
    },

    snapshotPrices(template) {
      const layers = {};
      Object.entries(template?.layers || {}).forEach(([key, layer]) => { if (isPriceLayer(key, layer)) layers[key] = JSON.parse(JSON.stringify(layer)); });
      return { layers, renderOrder: [...(template?.renderOrder || [])], meta: template?.pricePresetMeta ? { ...template.pricePresetMeta } : null };
    },

    restorePrices(template, snapshot) {
      if (!template?.layers || !snapshot) return;
      Object.keys(template.layers).forEach((key) => { if (isPriceLayer(key, template.layers[key])) delete template.layers[key]; });
      Object.entries(snapshot.layers).forEach(([key, layer]) => { template.layers[key] = JSON.parse(JSON.stringify(layer)); });
      template.renderOrder = [...snapshot.renderOrder];
      if (snapshot.meta) template.pricePresetMeta = { ...snapshot.meta };
    },

    /**
     * 依新素材重算價格。回傳 { status: 'rebuilt' | 'unknown' | 'none', message, keys }。
     * - none：這張沒有規則價格（例如不是票券版位）→ 不動
     * - unknown：規則不認得新素材 → 價格維持原樣（使用者決定）
     * - rebuilt：價格層已依新素材重建，並套用參考版位的位置
     */
    async rebuildForAsset(template, productKey, assetFilename, file = null) {
      const { PriceCouponManager } = core();
      if (!this.canRebuild(template, productKey)) return { status: 'none', message: '', keys: [] };
      const productName = productNameOf(assetFilename);
      if (!productName) return { status: 'none', message: '', keys: [] };
      if (/有價格/.test(productName)) {
        // 「_有價格」素材是圖上已經印好價格的票券 → 不產生價格層。
        PriceCouponManager.remove(template);
        template.pricePresetMeta = { ...(template.pricePresetMeta || {}), productName };
        return { status: 'rebuilt', message: `「${productName}」自帶價格，已移除價格層`, keys: [] };
      }
      if (!/券/.test(productName)) {
        // 沒有「券」（免運車加蝦幣、星展銀行、LOGO…）→ 不帶價格（2026-10-07 使用者決定）。
        PriceCouponManager.remove(template);
        template.pricePresetMeta = { ...(template.pricePresetMeta || {}), productName };
        return { status: 'rebuilt', message: `「${productName}」不是票券，不顯示價格`, keys: [] };
      }

      // 單券／雙券：檔名關鍵字 → 圖形分析（上下兩塊票面）→ 預設單券。規則檔只負責位置，不再是判讀的必要條件。
      const kind = await this.detectCouponKind(productName, file);
      const rawPrice = String(template.pricePresetMeta.rawPrice || '').trim();
      let reference = this.findReference(template, productKey, productName, kind.double);
      // 規則的預設版位是看名稱有沒有「雙券」挑的：圖形判成雙券但檔名沒寫時，用加了「雙券」的名稱去問規則（顏色關鍵字不受影響）。
      const ruleName = kind.double && !/雙券/.test(productName) ? `${productName}_雙券` : productName;
      // 先問規則認不認得這個素材（25節 各工具規則只認自己的票券名；例如外廣的規則不認「全站券_單券」）：
      // 不認得就維持原價格層不動，不能讓 apply 拿空的版位把價格清掉（使用者決定：規則不認得 → 價格維持原樣）。
      const probe = this.withCouponKind(kind.double, reference?.template || null, () => core().PriceRuleEngine?.classify?.(ruleName, template, rawPrice));
      if (!probe?.layouts?.length) return { status: 'unknown', message: `規則不認得「${productName}」，價格維持原樣`, keys: [] };
      // （2026-11-17 使用者回報「右鍵換素材後價格跑掉」）沒有別張可以參考時，拿「這張換圖前的價格」當參考：
      // 原本的價格是置版預設（hbn/<備註No>）排好的大小／角度／位置，換成同一種券（單→單、雙→雙）就照原本的相對位置貼回，
      // 不要退回規則檔的預設（48px、固定角度），看起來才不會突然變小、歪掉。
      // 沒有別張可參考：優先「看票面」——從券圖本身量出每張票面（白色區）的中心與大小，價格放在票面正中、字級依票面高度；
      // 量不到（不是 PNG、沒有橘色票根）再退到「這張換圖前的價格比例」。
      // 「同版型同券種但素材不同」那層參考是借別張券的比例，券的長寬不同時價格會跑出票面 → 量得到票面就優先用票面。
      const faces = !reference || reference.tier === 'sameKind' ? await this.measureTicketFaces(file, kind.double).catch(() => null) : null;
      if (faces && reference?.tier === 'sameKind') reference = null;
      const selfGroup = !reference && !faces ? this.captureSelf(template, productKey, kind.double) : null;
      const keys = this.withCouponKind(kind.double, reference?.template || null, () => PriceCouponManager.apply(template, { '商品圖1': ruleName, '價格': rawPrice, '價格_左': rawPrice }));
      template.pricePresetMeta = { ...(template.pricePresetMeta || {}), productName };
      if (reference) this.applyReference(template, productKey, reference);
      else if (faces) this.applyFaces(template, productKey, faces, kind.double);
      else if (selfGroup) this.applyGroup(template, productKey, selfGroup, { keepRotation: true }); // 角度照新券的規則（券的斜度跟素材走），大小／位置沿用換圖前
      const kindLabel = kind.double ? '雙券' : '單券';
      const how = kind.source === 'name' ? '' : kind.source === 'image' ? '（依圖形判讀）' : '（預設）';
      const refLabel = reference ? `，位置參考 ${reference.label}` : faces ? '，位置依票面' : selfGroup ? '，位置沿用換圖前' : '';
      return { status: 'rebuilt', message: `價格已依「${productName}」重算：${kindLabel}${how}${refLabel}`, keys };
    },

    /** 從券圖量票面（2026-11-17 使用者要求：換券後價格要放在票面正中，像原本排好的一樣）。
     *  做法：alpha>0 的包圍框＝素材貼進圖層後的範圍（prepareImageFile 會裁透明邊）；橘色票根（warm）的直向範圍取中點把圖分成上下兩張（雙券）；
     *  每張裡把票根右邊的白色像素當票面，取重心當價格中心、5%～95% 分位當票面寬高。回傳比例（相對裁邊後的圖），量不到回傳 null。 */
    async measureTicketFaces(file, wantDouble) {
      if (!file || !/^image\/(png|webp)$/i.test(file.type || '')) return null;
      const url = URL.createObjectURL(file);
      try {
        const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
        const scale = Math.min(1, 240 / Math.max(1, image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, width, height);
        const { data } = context.getImageData(0, 0, width, height);
        const opaque = new Uint8Array(width * height), warm = new Uint8Array(width * height), white = new Uint8Array(width * height);
        let left = width, right = -1, top = height, bottom = -1, warmTop = height, warmBottom = -1;
        for (let i = 0; i < width * height; i += 1) {
          const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
          if (a <= 0) continue;
          opaque[i] = 1;
          const x = i % width, y = Math.floor(i / width);
          if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
          if (a > 200 && r > 170 && g < 150 && b < 120 && r - g > 60) { warm[i] = 1; if (y < warmTop) warmTop = y; if (y > warmBottom) warmBottom = y; }
          if (a > 200 && r > 225 && g > 225 && b > 225) white[i] = 1;
        }
        if (right < 0 || warmBottom < 0) return null;
        const boxW = right - left + 1, boxH = bottom - top + 1;
        const bands = wantDouble ? [[top, Math.round((warmTop + warmBottom) / 2)], [Math.round((warmTop + warmBottom) / 2), bottom + 1]] : [[top, bottom + 1]];
        const faces = bands.map(([y0, y1]) => {
          // 票根右緣：每一列最右邊的橘色像素取中位數（券邊緣偶爾有幾點橘色雜訊，取最大值會被拉到最右邊）
          const rowRights = [];
          for (let y = y0; y < y1; y += 1) {
            let count = 0, rightmost = -1;
            for (let x = 0; x < width; x += 1) if (warm[y * width + x]) { count += 1; rightmost = x; }
            if (count >= 3) rowRights.push(rightmost);
          }
          rowRights.sort((p, q) => p - q);
          const stubRight = rowRights.length ? rowRights[Math.floor(rowRights.length / 2)] : -1;
          const xs = [], ys = [];
          for (let y = y0; y < y1; y += 1) for (let x = stubRight + 3; x < width; x += 1) if (white[y * width + x]) { xs.push(x); ys.push(y); }
          if (xs.length < 30) return null;
          const sorted = (arr) => arr.slice().sort((p, q) => p - q);
          const sx = sorted(xs), sy = sorted(ys);
          const pct = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))];
          const cx = xs.reduce((sum, v) => sum + v, 0) / xs.length, cy = ys.reduce((sum, v) => sum + v, 0) / ys.length;
          return { cx: (cx - left) / boxW, cy: (cy - top) / boxH, w: (pct(sx, 0.95) - pct(sx, 0.05)) / boxW, h: (pct(sy, 0.95) - pct(sy, 0.05)) / boxH };
        });
        return faces.every(Boolean) ? faces : null;
      } finally { URL.revokeObjectURL(url); }
    },

    /** 把票面比例套到價格層：中心＝票面重心、字級＝票面高度 × 0.7（再依文字長度縮到票面寬的 85% 內）、角度照規則給的。 */
    applyFaces(template, productKey, faces, wantDouble) {
      const { Geometry } = core();
      const product = template.layers[productKey];
      if (!product || !Geometry?.applyBox) return;
      const box = Geometry.getLayerBox(productKey, product);
      const slots = wantDouble ? ['top', 'bottom'] : ['single'];
      slots.forEach((slot, index) => {
        const face = faces[index]; if (!face) return;
        const key = `${PRICE_PREFIX}${slot}`; const layer = template.layers[key];
        if (!layer) return;
        const faceW = face.w * box.width, faceH = face.h * box.height;
        const text = String(layer.text || '');
        let fontSize = faceH * 0.7;
        const estimatedWidth = text.length * fontSize * 0.56;
        if (estimatedWidth > faceW * 0.85) fontSize *= (faceW * 0.85) / estimatedWidth;
        fontSize = Math.round(fontSize * 10) / 10;
        const previousSize = Number(layer.fontSizePx) || fontSize;
        const ratio = previousSize > 0 ? fontSize / previousSize : 1;
        if (Array.isArray(layer.textStyleRanges)) layer.textStyleRanges.forEach((range) => { if (range && Number(range.fontSizePx) > 0) range.fontSizePx = Math.round(range.fontSizePx * ratio * 10) / 10; });
        layer.fontSizePx = fontSize; if (layer.fontSizePt !== undefined) layer.fontSizePt = fontSize;
        layer.lineHeight = Math.round(fontSize * 1.08 * 100) / 100;
        const width = Math.max(faceW, text.length * fontSize * 0.6), height = fontSize * 1.35;
        const centerX = box.x + face.cx * box.width, centerY = box.y + face.cy * box.height;
        Geometry.applyBox(key, layer, { x: centerX - width / 2, y: centerY - height / 2, width, height }, { template, notifyPrice: false, notifyLayout: false });
      });
    },

    /** 單券／雙券判讀：① 檔名「雙券」／「單券」 ② 票券圖的不透明區在垂直方向分成兩塊面積相近的票面 → 雙券 ③ 預設單券。 */
    async detectCouponKind(productName, file) {
      if (/雙券/.test(productName)) return { double: true, source: 'name' };
      if (/單券/.test(productName)) return { double: false, source: 'name' };
      if (file && /^image\/(png|webp)$/i.test(file.type || '')) {
        try {
          const bands = await this.countTicketBands(file);
          if (bands >= 2) return { double: true, source: 'image' };
          if (bands === 1) return { double: false, source: 'image' };
        } catch (_) { /* 讀不到就走預設 */ }
      }
      return { double: false, source: 'default' };
    },

    /** 票面數（1 或 2）：蝦皮票券的左側橘色票根，雙券是上下兩張疊放、橘色票根連成一條直的高柱（約佔圖高 75%），
     *  單券票根只佔 35–55%。把圖縮到 160px，找最大的「飽和橘紅」連通區，高度 ≥ 圖高 65% → 2，否則 1；沒有橘色區 → 0（不是票券）。
     *  實測 正式BN／暖身BN 素材：雙券 0.76–0.78、單券 0.33–0.52。單張票面印兩個價格的素材會判 1（已向使用者說明，檔名請帶「雙券」）。 */
    async countTicketBands(file) {
      const url = URL.createObjectURL(file);
      try {
        const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
        const scale = Math.min(1, 160 / Math.max(1, image.naturalWidth));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, width, height);
        const { data } = context.getImageData(0, 0, width, height);
        const warm = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i += 1) {
          const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
          if (a > 200 && r > 170 && g < 150 && b < 120 && r - g > 60) warm[i] = 1;
        }
        const seen = new Uint8Array(width * height);
        let best = null;
        const stack = [];
        for (let start = 0; start < width * height; start += 1) {
          if (!warm[start] || seen[start]) continue;
          let area = 0, top = height, bottom = -1;
          stack.push(start); seen[start] = 1;
          while (stack.length) {
            const index = stack.pop(); area += 1;
            const y = Math.floor(index / width), x = index % width;
            if (y < top) top = y; if (y > bottom) bottom = y;
            const neighbours = [index - 1, index + 1, index - width, index + width];
            if (x === 0) neighbours[0] = -1; if (x === width - 1) neighbours[1] = -1;
            neighbours.forEach((n) => { if (n >= 0 && n < width * height && warm[n] && !seen[n]) { seen[n] = 1; stack.push(n); } });
          }
          if (!best || area > best.area) best = { area, top, bottom };
        }
        if (!best || best.area < width * height * 0.02) return 0;
        return (best.bottom - best.top + 1) / height >= 0.65 ? 2 : 1;
      } finally { URL.revokeObjectURL(url); }
    },

    /** 規則檔回來的 layouts 常常同時含 single 與 top／bottom（依原工單的價格變體挑），這裡改以素材名決定單券／雙券：
     *  雙券 → 只留 top／bottom（價格2 複製價格1 由 PriceParser 處理）；單券 → 只留 single，價格2 自然消失。 */
    withCouponKind(wantDouble, referenceTemplate, run) {
      const { PriceRuleEngine } = core();
      const original = PriceRuleEngine?.classify;
      if (typeof original !== 'function') return run();
      PriceRuleEngine.classify = function classifyByCouponKind(...args) {
        const rule = original.apply(this, args);
        if (!rule?.layouts?.length) return rule;
        let filtered = rule.layouts.filter((layout) => (wantDouble ? layout.slot === 'top' || layout.slot === 'bottom' : layout.slot === 'single'));
        if (!filtered.length && wantDouble) {
          // 規則的版位是依「這張版位的預設（例如 VIP 單券版）」給的，沒有雙券的 top／bottom：改拿「已用同素材的參考版位」或代表性價格字串再問一次規則。
          const templatesToTry = [referenceTemplate, args[1]].filter(Boolean);
          const samples = [args[2], '$100', '9折', '100'];
          outer: for (const candidateTemplate of templatesToTry) {
            for (const sample of samples) {
              const retry = original.call(this, args[0], candidateTemplate, sample);
              const pair = (retry?.layouts || []).filter((layout) => layout.slot === 'top' || layout.slot === 'bottom');
              if (pair.length) { filtered = pair; break outer; }
            }
          }
        }
        if (!filtered.length && !wantDouble) {
          // 規則只給了雙券的 top／bottom（原工單價格變體沒有單券版）：拿下券的版位當單券用。
          const base = rule.layouts.find((layout) => layout.slot === 'bottom') || rule.layouts[0];
          filtered = [{ ...base, slot: 'single', psdName: '價格' }];
        }
        if (!filtered.length) return rule;
        return { ...rule, layouts: filtered, isDoubleCoupon: wantDouble, layoutKey: wantDouble ? 'doubleCoupon' : (rule.layoutKey === 'doubleCoupon' ? 'singleCoupon' : rule.layoutKey) };
      };
      try { return run(); } finally { PriceRuleEngine.classify = original; }
    },

    /** 參考版位：同版型且已用同素材 → 不同版位同素材 → 無。回傳 { template, productKey, label }。 */
    findReference(template, productKey, productName, wantDouble = /雙券/.test(productName)) {
      const { AppState, AssetLinkSync } = core();
      const targetName = productName.normalize('NFKC').toLowerCase();
      const layoutKey = AssetLinkSync?.layoutKey?.(template) || '';
      let sameLayout = null; let otherLayout = null; let sameKind = null;
      (AppState.templates || []).forEach((item) => {
        const candidate = item?.data || item;
        if (!candidate?.layers || candidate === template) return;
        const anchorKey = window.PriceCouponManager.findAnchorLayerKey?.(candidate);
        const anchor = anchorKey ? candidate.layers[anchorKey] : null;
        const priceKeys = Object.entries(candidate.layers).filter(([key, layer]) => isPriceLayer(key, layer)).map(([key]) => key);
        if (!anchor || !priceKeys.length) return;
        const isSameLayout = layoutKey && AssetLinkSync.layoutKey(candidate) === layoutKey;
        const sameAsset = productNameOf(anchor.assetFilename).normalize('NFKC').toLowerCase() === targetName;
        const candidateDouble = priceKeys.some((key) => /top|bottom/.test(key));
        if (sameAsset && isSameLayout && !sameLayout) sameLayout = { tier: 'sameLayout', template: candidate, productKey: anchorKey, label: `同版型「${item.name || candidate.templateId}」` };
        else if (sameAsset && !isSameLayout && !otherLayout) otherLayout = { tier: 'otherLayout', template: candidate, productKey: anchorKey, label: `版位「${item.name || candidate.templateId}」（等比換算）` };
        // 第三層：同版型、同券種（單／雙）的任一張 → 借它的價格位置（素材不同也沒關係）。
        else if (!sameAsset && isSameLayout && candidateDouble === wantDouble && !sameKind) sameKind = { tier: 'sameKind', template: candidate, productKey: anchorKey, label: `同版型${wantDouble ? '雙券' : '單券'}「${item.name || candidate.templateId}」` };
      });
      return sameLayout || otherLayout || sameKind;
    },

    /** 換圖前這張自己的價格相對位置（只有券種一樣才拿得到：雙券要有 top／bottom、單券要有 single）。 */
    captureSelf(template, productKey, wantDouble) {
      const { ProductGroupSync } = core();
      if (!ProductGroupSync?.captureGroup) return null;
      const group = ProductGroupSync.captureGroup(template, productKey);
      if (!group?.prices?.length) return null;
      const slots = group.prices.map((entry) => entry.key.replace(PRICE_PREFIX, ''));
      const matches = wantDouble ? slots.includes('top') && slots.includes('bottom') : slots.includes('single');
      return matches ? group : null;
    },

    /** 把參考版位的價格相對位置（相對商品圖框，含字級比例）套到這張；以 slot（single／top／bottom）對應。 */
    applyReference(template, productKey, reference) {
      const { ProductGroupSync } = core();
      if (!ProductGroupSync?.captureGroup) return;
      const group = ProductGroupSync.captureGroup(reference.template, reference.productKey);
      if (group) this.applyGroup(template, productKey, group);
    },

    /** 把一組「價格相對商品圖框」的比例（ProductGroupSync.captureGroup 的結果）套到這張的價格層。 */
    applyGroup(template, productKey, group, { keepRotation = false } = {}) {
      const { Geometry } = core();
      if (!group) return;
      const slotOf = (key) => key.replace(PRICE_PREFIX, '');
      const current = Geometry.getLayerBox(productKey, template.layers[productKey]);
      group.prices.forEach((entry) => {
        const targetKey = Object.keys(template.layers).find((key) => isPriceLayer(key, template.layers[key]) && slotOf(key) === slotOf(entry.key));
        if (!targetKey) return;
        const layer = template.layers[targetKey];
        const width = entry.widthRatio * current.width;
        const height = entry.heightRatio * current.width;
        const centerX = current.x + entry.relCenterX * current.width;
        const centerY = current.y + entry.relCenterY * current.height;
        const fontSize = Math.round(entry.fontRatio * current.width * 10) / 10;
        // 價格層的大小字（$ 小、數字大）在 textStyleRanges 裡，畫的時候以 range 的字級為準：
        // 只改 layer.fontSizePx 畫面不會變（2026-11-17 使用者回報換券後價格變小＝這裡漏掉 ranges），要一起等比縮放。
        const previousSize = Number(layer.fontSizePx) || fontSize;
        const ratio = previousSize > 0 ? fontSize / previousSize : 1;
        if (Array.isArray(layer.textStyleRanges)) layer.textStyleRanges.forEach((range) => { if (range && Number(range.fontSizePx) > 0) range.fontSizePx = Math.round(range.fontSizePx * ratio * 10) / 10; });
        layer.fontSizePx = fontSize; if (layer.fontSizePt !== undefined) layer.fontSizePt = fontSize;
        layer.lineHeight = Math.round(entry.lineHeightRatio * current.width * 100) / 100;
        if (!keepRotation) layer.rotation = Number(entry.layer.rotation || 0);
        Geometry.applyBox(targetKey, layer, { x: centerX - width / 2, y: centerY - height / 2, width, height }, { template, notifyPrice: false, notifyLayout: false });
      });
    },
  };

  window.CouponPriceSync = Object.freeze(CouponPriceSync);
})();
