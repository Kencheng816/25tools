(() => {
  'use strict';

  const GUIDE_NAMES = new Set(['P_範圍', '_P_範圍']);
  const SHADOW_PREFIX = '__smart_product_shadow__';
  // Runtime-only registry. Smart Asset 人工狀態不可跨 reload / 重讀 Excel 永久保存（決策 63）。
  const registry = new Map();
  const aliases = new Map();
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const policy = () => window.RuntimePolicy || {};
  const normalizeName = value => policy().normalizeAssetName?.(value)
    || String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\\/g, '/').split('/').pop().replace(/\.[^.]+$/, '').replace(/[\s_\-()（）\[\]【】]+/g, '');
  const normalizeFolder = value => String(value || '').normalize('NFKC').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
  const normalizeGroup = value => policy().normalizeSmartAssetGroup?.(value) || normalizeName(value);

  function resolveCanonical(id) {
    if (!id) return null;
    const seen = new Set();
    let current = id;
    while (aliases.has(current)) {
      if (seen.has(current)) throw new Error(`Smart Asset Group alias 循環：${[...seen, current].join(' → ')}`);
      seen.add(current);
      current = aliases.get(current);
    }
    seen.forEach(alias => { if (alias !== current) aliases.set(alias, current); });
    return current;
  }
  function mergeGroups(sourceId, destinationId) {
    const rawSource = sourceId;
    const rawDestination = destinationId;
    const source = resolveCanonical(sourceId);
    const destination = resolveCanonical(destinationId);
    if (!source || !destination) return destination || source;
    // 明確把 canonical group 合併回它自己的舊 alias，語意上就是建立反向環；即使解析後相同也必須拒絕。
    if (source === destination) {
      if (rawSource === source && rawDestination !== destination && aliases.has(rawDestination)) {
        throw new Error(`Smart Asset Group 合併循環：${rawSource} → ${rawDestination}`);
      }
      return destination;
    }
    // 若 destination 最終已指回 source，會形成循環，拒絕。
    let cursor = destination;
    const seen = new Set([source]);
    while (aliases.has(cursor)) {
      if (seen.has(cursor)) throw new Error(`Smart Asset Group 合併循環：${source} → ${destination}`);
      seen.add(cursor); cursor = aliases.get(cursor);
    }
    aliases.set(source, destination);
    if (registry.has(source) && !registry.has(destination)) registry.set(destination, clone(registry.get(source)));
    registry.delete(source);
    resolveCanonical(source); // path compression
    return destination;
  }

  // Smart Asset 身分：明確 Group 優先；否則以「實際來源資料夾 + 檔名」識別，絕不只看檔名（決策 61/62）。
  function makeAssetId(filename, context = {}) {
    const group = normalizeGroup(context.smartAssetGroup || context.layer?.smartAssetGroup || '');
    if (group) return resolveCanonical(`group:${group}`);
    const normalizedFile = normalizeName(filename);
    if (!normalizedFile) return null;
    const folder = normalizeFolder(context.folder || context.assetProject || context.layer?.assetProject || '');
    return resolveCanonical(`asset:${folder || '@root'}/${normalizedFile}`);
  }
  // 產圖後 templateId 會被改成輸出檔名（例如 01_頭巾_暖身_02_點我領），
  // 不能拿它判斷「是否為同一個公版」，否則同一列展開的 CTA 變體會被當成不同公版。
  // 公版規則可用 productTransformIdentity 指定穩定身分；其後才使用路由來源、公版來源名稱。
  const templateIdentity = template => normalizeName(
    template?.smartAssetPolicy?.productTransformIdentity
      || template?.sheetTemplateRoute?.sourceTemplateId
      || template?.batchSourceName
      || template?.source?.psdName
      || template?.name
      || template?.templateId
      || ''
  );
  const shouldSyncProductWithinSameTemplate = template =>
    template?.smartAssetPolicy?.productTransformScope === 'same-template' && !!templateIdentity(template);

  // ── Smart Transform Link Identity ──────────────────────────────────────────
  // 實體素材(assetId)只代表「同一張圖片」；它不能直接等於「可以共享幾何 Transform 的群組」。
  // 不同公版（例如 IG Story 與外部team）即使用到同一張商品圖，也可能有不同價格內容與排版，
  // 若只用 assetId 同步會讓商品/價格互相污染。
  //
  // Transform Link Key 必須同時符合：
  //   Family + 實體素材 + 價格內容 + 價格 Layout
  // 其中「缺少價格層」只作為異常保護：若 Family/素材相同且另一側完全沒有價格資料，
  // 商品仍允許同步，但價格一定略過並回報 warning；正常資料不應進入此分支。
  const normalizeLinkText = value => String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  const templateFamilyIdentity = template => normalizeName(
    template?.ruleFamily
      || template?.sheetTemplateRoute?.family
      || template?.smartAssetPolicy?.transformLinkFamily
      || template?.batchSourceName
      || template?.smartAssetPolicy?.productTransformIdentity
      || template?.source?.psdName
      || template?.name
      || template?.templateId
      || ''
  );
  function priceContentSignature(template) {
    const recordPrice = normalizeLinkText(template?.batchRecord?.['價格']);
    if (recordPrice) return recordPrice;
    const presetPrice = normalizeLinkText(template?.pricePresetMeta?.rawPrice);
    if (presetPrice) return presetPrice;
    const prices = priceEntries(template);
    if (!prices.length) return '';
    return prices
      .slice()
      .sort((a, b) => String(a[1]?.priceSlot || a[0]).localeCompare(String(b[1]?.priceSlot || b[0]), 'zh-Hant-u-co-numeric'))
      .map(([key, layer]) => `${normalizeLinkText(layer?.priceSlot || key)}:${normalizeLinkText(layer?.text)}`)
      .filter(Boolean)
      .join('|');
  }
  function priceLayoutSignature(template) {
    const presetLayout = normalizeLinkText(template?.pricePresetMeta?.layoutKey);
    if (presetLayout) return presetLayout;
    const layouts = [...new Set(priceEntries(template)
      .map(([, layer]) => normalizeLinkText(layer?.priceLayoutKey || ''))
      .filter(Boolean))]
      .sort();
    return layouts.join('+');
  }
  function smartTransformLinkSignature(template, productKey = productEntry(template)?.[0], productLayer = template?.layers?.[productKey]) {
    const assetId = productLayer ? resolveCanonical(getLayerAssetId(template, productKey, productLayer)) : null;
    const prices = priceEntries(template);
    const priceContent = priceContentSignature(template);
    const layout = priceLayoutSignature(template);
    return {
      family: templateFamilyIdentity(template),
      assetId: assetId || '',
      priceContent,
      layout,
      hasPriceLayer: prices.length > 0,
      hasPriceData: Boolean(priceContent || layout || prices.length),
    };
  }
  function smartTransformLinkKey(template, productKey = productEntry(template)?.[0], productLayer = template?.layers?.[productKey]) {
    const signature = smartTransformLinkSignature(template, productKey, productLayer);
    if (!signature.family || !signature.assetId) return null;
    return `transform:${signature.family}|${signature.assetId}|price:${signature.priceContent || '@none'}|layout:${signature.layout || '@none'}`;
  }
  function compareSmartTransformSignatures(source, target, options = {}) {
    if (!source || !target) return { match: false, mode: 'none' };
    if (!source.family || source.family !== target.family) return { match: false, mode: 'family-mismatch' };
    if (options.ignoreAsset !== true && (!source.assetId || source.assetId !== target.assetId)) return { match: false, mode: 'asset-mismatch' };

    // 正常路徑：價格內容與 Layout 完全一致，商品＋價格雙向同步。
    if (source.priceContent === target.priceContent && source.layout === target.layout) {
      if (source.hasPriceLayer && target.hasPriceLayer) return { match: true, mode: 'full' };
      if (!source.hasPriceLayer && !target.hasPriceLayer) return { match: true, mode: 'product-only-no-price' };
      return {
        match: options.allowMissingPriceFallback === true,
        mode: 'product-only-missing-price',
        warning: '同 Link Key 的其中一個版位缺少價格層；商品照常同步，價格已略過',
      };
    }

    // 異常保護：其中一側完全沒有任何價格資料。這不是正常資料狀態，但依規格仍允許商品同步。
    const exactlyOneMissingPrice = source.hasPriceData !== target.hasPriceData
      && (!source.hasPriceData || !target.hasPriceData);
    if (options.allowMissingPriceFallback === true && exactlyOneMissingPrice) {
      return {
        match: true,
        mode: 'product-only-missing-price',
        warning: '同 Family／素材的其中一個版位完全缺少價格資料；商品照常同步，價格已略過',
      };
    }
    return { match: false, mode: 'price-or-layout-mismatch' };
  }
  const isPlacementGuide = (key, layer) => {
    if (layer?.__placementGuide === true) return true;
    const name = String(layer?.psdName || layer?.name || key || '').trim();
    return GUIDE_NAMES.has(name) || /^_?P_範圍(?:_\d+)?$/i.test(name);
  };
  const isShadow = layer => layer?.generatedEffect === 'product-shadow' || layer?.role === 'product-shadow';
  const isProduct = (key, layer) => !!(layer?.type === 'image' && !isShadow(layer) && !isPlacementGuide(key, layer) && (layer.role === 'product' || /(^|\s|_)p($|\s|_)|商品圖|product/i.test(`${key} ${layer.psdName || ''} ${layer.role || ''}`)));
  // 2026-08-13 調整4：排除隱藏圖層——雙商品圖模式下 product 隱藏但仍有 assetFilename，
  // 若被選為商品代表，價格圖層（anchor=P_01）會被判定不屬於商品群組，導致拖曳後縮圖不更新。
  // 整合版：smartAsset.skipHiddenProduct（正式BN true／暖身BN false）決定是否排除隱藏商品層。
  const smartFlag = (key, fallback) => { const v = window.ProfileLoader?.getFlag?.(key, undefined); return v === undefined || v === null ? fallback : v; };
  const productEntry = template => Object.entries(template?.layers || {}).find(([key, layer]) => isProduct(key, layer) && layer.assetFilename && (smartFlag('smartAsset.skipHiddenProduct', true) ? layer.hidden !== true : true)) || null;
  // 複數版：抓「所有」符合商品條件的圖層（例如 P_01、P_02 多張商品圖），依 key 排序。
  // 只給「P_範圍模式」（見 getSyncMode）用；「商品＋價格」單一商品的流程仍用上面單數版 productEntry。
  const productEntries = template => Object.entries(template?.layers || {})
    .filter(([key, layer]) => isProduct(key, layer) && layer.assetFilename)
    .sort(([a], [b]) => a.localeCompare(b, 'zh-Hant-u-co-numeric'));
  const priceEntries = template => Object.entries(template?.layers || {}).filter(([, layer]) => layer?.source === 'auto_price_v2');
  const guideEntry = template => Object.entries(template?.layers || {}).find(([key, layer]) => isPlacementGuide(key, layer)) || null;
  const shadowKey = sourceKey => `${SHADOW_PREFIX}${sourceKey}`;
  // V0.9：Smart Asset 只回報受影響的 Template index；BatchManager.refreshPreviewIndexes()
  // 會以 readonly clone 局部重畫這些縮圖，不切換 AppState.template，也不重跑 Rule/Layout。

  // ── 智慧素材同步模式判斷 ──
  // 'price'　：素材＋價格是一組智慧型物件。只同步「價格相對商品中心」的比例關係，商品本身在
  //            各版位的絕對位置/大小完全不動（每個版位原本訂好的位置維持獨立）。
  // 'placement'：素材本身（可能多張，例如 P_01/P_02）是一組智慧型物件，同步「商品相對 P_範圍」
  //            的位置，用於上傳資料夾、沒有價格關係的情境。
  // null     ：兩者訊號都沒有（例如舊模板、沒有工單資料），完全不做跨版位同步，只保留同一版位
  //            內商品拖曳時子圖層（價格/陰影）的即時連動。
  // 判斷訊號直接讀 template.batchRecord —— 這是 rules/om-wave1-subtitle_rules.js 的
  // normalizeProductDirective() 已經在解析「Icon/曝品」欄位時產生好的旗標：
  //   record.__productFolder：原始文字是「右邊網址」（改用資料夾比對商品圖），屬於 P_範圍模式。
  //   record.__couponCount / record['價格']：原始文字尾端有 券/折/$ 等，屬於價格關係模式。
  // 這裡刻意不新增另一份關鍵字表，維持「規則檔（rules/*.js）是唯一真實來源」的架構原則；
  // 之後如果有新專案用不同的工單格式，請在該專案自己的 rules/*.rules.js 裡產生同樣的
  // record.__productFolder / record.__couponCount 旗標，這裡的判斷邏輯就不需要更動。
  function getSyncMode(template) {
    const record = template?.batchRecord || {};
    // Network 每一張製作物的 RenderState 必須彼此獨立；拖曳、縮放與旋轉只修改
    // 當前版位，不能被舊智慧素材的跨版位 placement/price registry 同步覆蓋。
    // 共用素材的「替換圖片來源」同步另由 Network 專屬流程詢問使用者，不在此處處理。
    if (record.__network) return null;
    if (record.__productFolder) return 'placement';
    if (record.__couponCount || record['價格']) return 'price';
    if (priceEntries(template).length) return 'price';
    // 結構性判斷（不依賴 Excel 資料）：沒有價格圖層時，只要模板有 2 張以上商品圖，或
    // 「有 P_範圍 參考框＋至少 1 張商品圖」，就是 placement 模式——單一商品的版位
    // （例如 line point）調整素材大小/位置時，也要能跨版位同步到共用同一張素材的其他版位。
    // P_範圍 本身的調整仍然不會跨版位同步（finishMainCanvasTransform 的 guide 分支會擋）。
    if (productEntries(template).length > 1) return 'placement';
    if (productEntries(template).length === 1 && Object.entries(template?.layers || {}).some(([key, layer]) => isPlacementGuide(key, layer))) return 'placement';
    return null;
  }

  function rotateVector(vector, degrees) {
    const rad = number(degrees) * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
  }
  function smartProductMemberEntries(template, productKey = productEntry(template)?.[0]) {
    if (!template || !productKey) return [];
    const entries = [];
    const product = template.layers?.[productKey];
    if (product) entries.push([productKey, product, 'product']);
    const primaryProductKey = productEntry(template)?.[0];
    priceEntries(template).forEach(([key, layer]) => {
      const anchorKey = layer?.anchor?.layerKey || layer?.productLayerKey || '';
      if (anchorKey ? anchorKey === productKey : productKey === primaryProductKey) entries.push([key, layer, 'price']);
    });
    Object.entries(template.layers || {}).forEach(([key, layer]) => {
      if (isShadow(layer) && (!layer.sourceLayerKey || layer.sourceLayerKey === productKey)) entries.push([key, layer, 'shadow']);
    });
    return entries;
  }
  function childToLocal(childBox, childLayer, productBox, productRotation) {
    const productCenter = { x: productBox.x + productBox.width / 2, y: productBox.y + productBox.height / 2 };
    const childCenter = { x: childBox.x + childBox.width / 2, y: childBox.y + childBox.height / 2 };
    const localVector = rotateVector({ x: childCenter.x - productCenter.x, y: childCenter.y - productCenter.y }, -productRotation);
    return {
      anchor: 'product-center',
      localX: localVector.x / Math.max(1, productBox.width),
      localY: localVector.y / Math.max(1, productBox.height),
      localWidth: childBox.width / Math.max(1, productBox.width),
      localHeight: childBox.height / Math.max(1, productBox.height),
      rotationOffset: number(childLayer?.rotation) - number(productRotation),
      // 字級相對商品寬度的比例：使用者手動調整字級後，跨版位同步時用「目標版位商品寬度 × 這個
      // 比例」還原字級——同一個視覺比例，不同尺寸版位各自等比例縮放（跟位置/大小的邏輯一致）。
      // 注意這不是 V3.1 移除的 fitText「自動塞進文字框」機制——這裡沒有任何自動縮小/壓字距，
      // 純粹是把使用者指定的字級等比例帶到其他版位。
      fontScale: childLayer?.type === 'text' ? number(childLayer.fontSizePx, 1) / Math.max(1, productBox.width) : undefined,
      lineHeightScale: childLayer?.type === 'text' ? number(childLayer.lineHeight, childLayer.fontSizePx || 1) / Math.max(1, productBox.width) : undefined,
      styleFontScales: childLayer?.type === 'text' && Array.isArray(childLayer.textStyleRanges)
        ? childLayer.textStyleRanges.map(range => number(range?.fontSizePx, childLayer.fontSizePx || 1) / Math.max(1, productBox.width))
        : undefined,
      styleLineHeightScales: childLayer?.type === 'text' && Array.isArray(childLayer.textStyleRanges)
        ? childLayer.textStyleRanges.map(range => number(range?.lineHeight, 0) > 0
          ? number(range.lineHeight) / Math.max(1, productBox.width)
          : null)
        : undefined,
      align: childLayer?.align || 'center'
    };
  }
  function localToChildBox(local, productBox, productRotation) {
    const productCenter = { x: productBox.x + productBox.width / 2, y: productBox.y + productBox.height / 2 };
    const vector = rotateVector({
      x: number(local.localX) * productBox.width,
      y: number(local.localY) * productBox.height
    }, productRotation);
    const width = Math.max(1, number(local.localWidth, .2) * productBox.width);
    const height = Math.max(1, number(local.localHeight, .1) * productBox.height);
    const center = { x: productCenter.x + vector.x, y: productCenter.y + vector.y };
    return { x: center.x - width / 2, y: center.y - height / 2, width, height };
  }

  // 商品群組變形只有這個函式能寫入子圖層幾何，避免 Geometry.applyBox 與
  // PriceTransformEngine 在同一幀各自重算一次價格。價格框、字級、行高及 anchor 一次完成。
  function applyLocalMemberTransform(template, childKey, childLayer, type, local, productBox, productRotation) {
    if (!childLayer) return;
    let box = localToChildBox(local, productBox, productRotation);
    if (type === 'price') {
      const widthBasis = Math.max(1, productBox.width);
      const syncedFont = Number.isFinite(number(local.fontScale, NaN))
        ? Math.max(6, number(local.fontScale) * widthBasis)
        : number(childLayer.fontSizePx, 24);
      const syncedLineHeight = Number.isFinite(number(local.lineHeightScale, NaN))
        ? Math.max(1, number(local.lineHeightScale) * widthBasis)
        : Math.max(1, number(childLayer.lineHeight, syncedFont * number(childLayer.lineHeightMultiplier, 1.08)));
      childLayer.fontSizePx = Number(syncedFont.toFixed(2));
      childLayer.fontSizePt = childLayer.fontSizePx;
      childLayer.lineHeight = Number(syncedLineHeight.toFixed(2));

      // 價格框至少要容納當前行高，否則下一次 PriceTransformEngine 同步才補高，
      // centerY/y 便會在重繪時二次改變。
      if (box.height < childLayer.lineHeight) {
        const centerY = box.y + box.height / 2;
        box = { ...box, height: childLayer.lineHeight, y: centerY - childLayer.lineHeight / 2 };
      }
      if (Array.isArray(childLayer.textStyleRanges) && Array.isArray(local.styleFontScales)) {
        childLayer.textStyleRanges.forEach((range, index) => {
          if (!range) return;
          const fontRatio = number(local.styleFontScales[index], NaN);
          if (Number.isFinite(fontRatio)) range.fontSizePx = Number(Math.max(4, fontRatio * widthBasis).toFixed(2));
          const lineRatio = number(local.styleLineHeightScales?.[index], NaN);
          if (Number.isFinite(lineRatio)) range.lineHeight = Number(Math.max(1, lineRatio * widthBasis).toFixed(2));
        });
      }
    }
    window.Geometry.applyBox(childKey, childLayer, box, { template, notifyPrice: false });
    childLayer.rotation = productRotation + number(local.rotationOffset);
    if (type === 'price') {
      // 群組變形期間由本函式一次重建價格 anchor；不再另外觸發 rotation handler，
      // 避免同一幀重複 capture 造成 base 值被二次換算。
      window.PriceTransformEngine?.captureManualPriceTransform?.(childKey, childLayer, template, { rebase: true });
    }
  }

  function persistRegistry() { /* Session-only by design. */ }
  function snapshotSession() {
    return {
      registry: [...registry.entries()].map(([key, value]) => [key, clone(value)]),
      aliases: [...aliases.entries()],
    };
  }
  function restoreSession(snapshot) {
    registry.clear();
    aliases.clear();
    (snapshot?.registry || []).forEach(([key, value]) => registry.set(key, clone(value)));
    (snapshot?.aliases || []).forEach(([key, value]) => aliases.set(key, value));
  }
  function resetSession() {
    registry.clear();
    aliases.clear();
    mainTransformSession = null;
    pendingThumbIndexes = null;
    clearTimeout(pendingThumbTimer);
    pendingThumbTimer = null;
  }
  function getLayerAssetId(template, key, layer) {
    if (!layer?.assetFilename) return null;
    const id = makeAssetId(layer.assetFilename, {
      folder: layer.assetProject || template?.batchProject || '',
      logicalAssetKey: layer.logicalAssetKey,
      smartAssetGroup: layer.smartAssetGroup,
      template, layer, key,
    });
    if (id) layer.smartAssetId = id;
    return id;
  }
  function getAssetId(template) {
    const entry = productEntry(template);
    return entry ? getLayerAssetId(template, entry[0], entry[1]) : null;
  }
  function getConfigForTemplate(template) {
    const product = productEntry(template);
    if (!product) return null;
    const id = getLayerAssetId(template, product[0], product[1]);
    if (!id) return null;
    const transformKey = smartTransformLinkKey(template, product[0], product[1]);
    const raw = (transformKey ? registry.get(transformKey) : null) || template.smartAssetConfig || null;
    return raw ? migrateAbsoluteConfig(template, raw) : null;
  }

  function referenceBox(template) {
    const guide = guideEntry(template);
    if (guide) {
      const box = window.Geometry.getLayerBox(guide[0], guide[1]);
      if (box?.width > 0 && box?.height > 0) return { ...box, source: 'p-range' };
    }
    const fallback = template?.smartAssetReferenceBox || template?.productImageBox || null;
    if (fallback && number(fallback.width) > 0 && number(fallback.height) > 0) return { ...fallback, source: 'rule-box' };
    const canvas = template?.canvas || {};
    return { x: 0, y: 0, width: Math.max(1, number(canvas.width, 1)), height: Math.max(1, number(canvas.height, 1)), source: 'canvas' };
  }

  // P_範圍 錨點座標：X 以參考框（P_範圍，沒有的話退回規則框/畫布）中心為 0；
  // Y 沿用 canvas 原生方向（往下為正），以參考框下緣為 0。
  // 也就是說「商品中心Y − 參考框下緣Y」，商品中心在下緣之上（正常情況）是負值。
  //
  // dx/dy/width/height 全部換算成「相對於 P_範圍 高度」的比例（不是絕對 px）：同一組商品圖
  // 用在不同尺寸/長寬比的版位（例如 1200x628 橫幅 vs 1200x1200 正方 vs 960x1200 直幅），
  // P_範圍 的絕對高度往往差很多，如果存絕對 px，套到高度差很多的版位就會顯得忽大忽小。
  // 改成用來源版位 P_範圍 的高度當縮放基準存成比例，套用到目標版位時，用目標版位自己
  // P_範圍 的高度換算回絕對 px——等於依照 P_範圍 高度等比例縮放，跟你調整過的視覺比例
  // 保持一致，不會因為版位尺寸不同而變得太大或太小。
  //
  // 只用於 'placement' 模式（P_01/P_02 這類多張商品圖跨版位同步位置），跟商品＋價格模式
  // 用的 childToLocal/localToChildBox（以商品自身中心為錨點）是兩套獨立座標系統，不互相套用。
  function boxToGuideAnchor(box, reference) {
    const scale = Math.max(1, reference.height);
    return {
      dxRatio: ((box.x + box.width / 2) - (reference.x + reference.width / 2)) / scale,
      dyRatio: ((box.y + box.height / 2) - (reference.y + reference.height)) / scale,
      widthRatio: box.width / scale,
      heightRatio: box.height / scale,
      rotation: number(box.rotation),
    };
  }
  function guideAnchorToBox(anchor, reference) {
    const scale = Math.max(1, reference.height);
    // 向下相容：如果是舊版（V2.2 以前）存的絕對 px 格式（沒有 widthRatio），照舊方式換算，
    // 避免你先前測試已經存過的資料直接失效；下次調整並重新儲存後，就會自動改存新的比例格式。
    const hasRatio = anchor.widthRatio !== undefined;
    const width = Math.max(1, hasRatio ? number(anchor.widthRatio, 0.1) * scale : number(anchor.width, scale * 0.1));
    const height = Math.max(1, hasRatio ? number(anchor.heightRatio, 0.1) * scale : number(anchor.height, scale * 0.1));
    const dx = hasRatio ? number(anchor.dxRatio) * scale : number(anchor.dx);
    const dy = hasRatio ? number(anchor.dyRatio) * scale : number(anchor.dy);
    const centerX = reference.x + reference.width / 2 + dx;
    const centerY = reference.y + reference.height + dy;
    return { x: centerX - width / 2, y: centerY - height / 2, width, height, rotation: number(anchor.rotation) };
  }
  // placement 模式的 registry key 跟商品＋價格模式（單純用 assetId）分開存放，避免同一張
  // 圖檔剛好被兩種模式用到時互相蓋掉彼此的設定。
  const placementKey = id => `placement:${id}`;

  // ── 自動排版：多張商品圖（P_01/P_02...）在 P_範圍 內均分成網格排列 ──
  // 用於「資料夾模式」批次產圖：依實際上傳到該專案資料夾的圖片數量動態產生 P_01~P_0N 後
  // （見 app.core.js 的 prepareDynamicProductLayers），這幾張圖預設會疊在同一個位置，
  // 這裡把它們依數量排成接近正方形的網格，均分整個參考框（P_範圍，沒有的話退回規則框/畫布）的空間，
  // 每張圖在自己的格子內置中、內縮一點當間距，並維持 keepAspectRatio 避免變形。
  // 只在「第一次生成、還沒有公版 preset／人為位置」時當 fallback 初始值：有精確 preset 的圖層
  // 會被略過；使用者在素材中心明確套用同步設定時，才允許 registry 主動覆寫目前位置。
  // placement 模式（P_01/P_02...）的圖層，不管公版 JSON 原本存的 sizingMode 是什麼，統一強制
  // 用 containByPBox：ProductEngine.getRenderedImageBox 對 widthBased 這類模式，畫面上的高度會
  // 完全依照圖片原始比例反推、不理會我們存的 targetHeight/maxTargetHeight，導致縮放時「寬度看起來
  // 有變、高度在畫面上其實沒有跟著變」。containByPBox 才會確實吃我們指定的框尺寸（依比例縮圖塞進
  // 框內，不會變形）。這裡在套用 box 後，順便同步寫入 targetWidth/targetHeight/maxTargetHeight，
  // 確保畫面上顯示的跟我們剛剛套用的框一致。
  function normalizePlacementSizing(layer, box) {
    layer.keepAspectRatio = true;
    layer.sizingMode = 'containByPBox';
    layer.targetWidth = box.width;
    layer.targetHeight = box.height;
    layer.maxTargetHeight = box.height;
  }

  // ── 自動排版：多張商品圖（P_01/P_02...）在 P_範圍 內均分成網格排列 ──
  // 用於「資料夾模式」批次產圖：依實際上傳到該專案資料夾的圖片數量動態產生 P_01~P_0N 後
  // （見 app.core.js 的 prepareDynamicProductLayers），這幾張圖預設會疊在同一個位置，
  // 這裡把它們依數量排成接近正方形的網格，均分整個參考框（P_範圍，沒有的話退回規則框/畫布）的空間，
  // 每張圖在自己的格子內置中、內縮一點當間距，並維持 keepAspectRatio 避免變形。
  // 只在「第一次生成、還沒有人手動調整過」時當初始位置用——如果某張圖之前已經在素材中心／
  // 主畫布調整過並同步存進 registry，patchLoader 之後呼叫 applyPlacementConfig 時會用儲存的
  // 位置覆蓋掉這裡算出的網格位置，網格排版不會蓋掉使用者已經調整過的結果。
  function layoutProductGrid(template, options = {}) {
    const entries = productEntries(template);
    if (entries.length < 2) return; // 只有一張圖，維持模板/工單原本的位置，不需要排版
    const reference = referenceBox(template);
    const count = entries.length;
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const cellWidth = reference.width / columns;
    const cellHeight = reference.height / rows;
    const gutter = 0.08; // 格子內縮比例，避免圖片緊貼彼此

    entries.forEach(([key, layer], index) => {
      // 公版 preset 已鎖定的圖層是最終初始值；網格只負責尚未配置的新動態圖層。
      if (options.preservePresetGeometry && layer.lockToEditedJson === true) return;
      const row = Math.floor(index / columns);
      const itemsInThisRow = row === rows - 1 ? (count - row * columns) : columns;
      // 最後一列如果排不滿，讓這一列整體置中，視覺上比左靠齊好看。
      const rowOffsetX = (columns - itemsInThisRow) * cellWidth / 2;
      const col = index % columns;
      const cellX = reference.x + rowOffsetX + col * cellWidth;
      const cellY = reference.y + row * cellHeight;
      const box = {
        x: cellX + (cellWidth * gutter) / 2,
        y: cellY + (cellHeight * gutter) / 2,
        width: cellWidth * (1 - gutter),
        height: cellHeight * (1 - gutter),
      };
      window.Geometry.applyBox(key, layer, box, { template });
      normalizePlacementSizing(layer, box);
    });
  }

  function capturePlacementAnchor(template, key, layer) {
    const reference = referenceBox(template);
    const box = window.Geometry.getLayerBox(key, layer);
    return boxToGuideAnchor(box, reference);
  }
  function applyPlacementAnchor(template, key, layer, anchor) {
    if (!anchor) return;
    const reference = referenceBox(template);
    const box = guideAnchorToBox(anchor, reference);
    window.Geometry.applyBox(key, layer, box, { template });
    normalizePlacementSizing(layer, box);
    layer.rotation = number(anchor.rotation, number(layer.rotation));
  }
  // 套用：把每一張商品圖（P_01/P_02...）依 registry 裡存的錨點座標，套到「這個版位自己的」
  // 參考框（P_範圍）上——同一組相對座標，套到不同版位不同大小的 P_範圍，換算出來的絕對像素
  // 自然就會不同，但商品的視覺基準（地平線）會一致。
  function applyPlacementConfig(template, options = {}) {
    const entries = productEntries(template);
    if (!entries.length) return;
    const preservePresetGeometry = Boolean(template.__appliedPlacementPresetKey)
      && options.allowPresetOverride !== true;
    // V3.4：網格排版只在「動態生成商品圖層、剛 clone 出來全部疊在同一個位置」時跑一次
    // （prepareDynamicProductLayers 會設 __needsProductGridLayout 標記），跑完就清掉標記。
    // 之前的版本每次套用都重跑 grid（把商品排成均分 P_範圍 的大格子），導致模板 JSON /
    // 精確座標預設給的初始尺寸被蓋掉、素材看起來「充滿整個 P_範圍」。現在一般載入/刷新
    // 都維持原本的初始尺寸，只有真的需要解開重疊時才排版。
    if (template.__needsProductGridLayout) {
      layoutProductGrid(template, { preservePresetGeometry });
      delete template.__needsProductGridLayout;
    }
    entries.forEach(([key, layer]) => {
      // 首次生成時公版 JSON 的精確 preset 優先於瀏覽器之前保存的智慧素材 registry。
      // 使用者在素材中心明確按「套用」時會帶 allowPresetOverride=true，仍可主動覆寫。
      if (preservePresetGeometry && layer.lockToEditedJson === true) return;
      // 不管有沒有存過錨點，都先把縮放模式正規化成 containByPBox（用「目前」的框，不改變
      // 位置/尺寸本身）——widthBased 這類模式畫面上的高度只看圖片原始比例、不理會使用者
      // 調整的框，不先正規化的話，第一次用滑鼠縮放就會出現「高度沒反應」的問題。
      normalizePlacementSizing(layer, window.Geometry.getLayerBox(key, layer));
      const id = getLayerAssetId(template, key, layer);
      if (!id) return; // 素材還沒比對到檔名，沒有身分可以同步，略過
      layer.smartAssetId = id;
      const anchor = registry.get(placementKey(id));
      if (anchor) applyPlacementAnchor(template, key, layer, anchor); // 內含 normalizePlacementSizing
    });
  }
  // 儲存：只在使用者於素材中心明確編輯＋按下「套用/儲存」時呼叫（跟商品＋價格模式的 save() 對齊），
  // 一般在主畫布上直接拖曳不會走到這裡。把目前錨點寫進 registry，並套用到所有共用同一張商品圖、
  // 同一個圖層 key（例如都叫 P_01）的其他版位。
  // placement 模式的核心同步邏輯：把 P_01/P_02... 目前的位置存進 registry，並套用到所有共用
  // 同一張商品圖、同一個圖層 key 的其他版位。onBeforeTouch(index, other) 在「覆寫某個其他版位之前」
  // 被呼叫一次（每個版位只呼叫一次），用來讓呼叫端視需要記錄 undo 快照；不需要快照時傳 null 即可。
  // 回傳實際被同步到的其他版位數量。
  function runPlacementSync(template, onBeforeTouch) {
    const touchedIndexes = new Set();
    productEntries(template).forEach(([key, layer]) => {
      const id = getLayerAssetId(template, key, layer);
      if (!id) return; // 素材還沒比對到檔名，沒有身分可以同步，略過（不要生一個大家共用的空 id）
      layer.smartAssetId = id;
      const anchor = capturePlacementAnchor(template, key, layer);
      registry.set(placementKey(id), anchor);
      (window.AppState?.templates || []).forEach((item, index) => {
        const other = item?.data || item;
        if (!other || other === template) return;
        const otherLayer = other.layers?.[key];
        if (!otherLayer || !isProduct(key, otherLayer)) return;
        const otherId = getLayerAssetId(other, key, otherLayer);
        if (!otherId || otherId !== id) return;
        if (!touchedIndexes.has(index)) { touchedIndexes.add(index); onBeforeTouch?.(index, other); }
        applyPlacementAnchor(other, key, otherLayer, anchor);
      });
    });
    persistRegistry();
    return touchedIndexes.size;
  }
  // 素材中心明確編輯＋儲存時呼叫：不需要 undo 快照（工作台自己的復原走「取消」按鈕，不是全域 Ctrl+Z）。
  function savePlacementConfig(template) {
    runPlacementSync(template, null);
  }
  // 主畫布直接拖曳結束時呼叫：需要記錄 undo 快照，讓 Ctrl+Z 能一併復原被同步到的其他版位。
  function syncPlacementFromMainCanvas(template) {
    const snapshot = [];
    const count = runPlacementSync(template, (index, other) => snapshot.push({ index, data: clone(other) }));
    window.HistoryManager?.attachExtra?.(snapshot.length ? snapshot : null);
    markThumbsStale(snapshot.map(({ index }) => index));
    return count;
  }

  function migrateAbsoluteConfig(template, config = {}) {
    // V1.1：商品本身的絕對位置（原本的 productTransform／productBox／priceSlots）不再是智慧素材
    // 同步的一部分——商品在各版位的位置永遠獨立、不被跨版位覆寫（見 applyTemplate 的說明）。
    // 這裡只確保 childTransforms / shadow 結構存在，其餘保留給呼叫端使用。
    const next = clone(config || {});
    next.childTransforms ||= {};
    next.childTransformsByTemplate ||= {};
    next.productTransformsByTemplate ||= {};
    next.shadow ||= {};
    next.version = 4;
    return next;
  }

  function captureConfig(template, existing = {}) {
    const migrated = migrateAbsoluteConfig(template, existing);
    const product = productEntry(template);
    const productBox = product ? window.Geometry.getLayerBox(product[0], product[1]) : null;
    const productRotation = number(product?.[1]?.rotation);
    const childTransforms = { ...(migrated.childTransforms || {}) };
    const childTransformsByTemplate = clone(migrated.childTransformsByTemplate || {});
    const identity = templateIdentity(template);
    const scopedPriceTransforms = { ...(childTransformsByTemplate[identity] || {}) };
    const scopePricesByTemplate = template?.smartAssetPolicy?.priceTransformScope === 'same-template' && !!identity;
    const productTransformsByTemplate = { ...(migrated.productTransformsByTemplate || {}) };

    if (productBox && shouldSyncProductWithinSameTemplate(template)) {
      const identity = templateIdentity(template);
      productTransformsByTemplate[identity] = {
        key: product[0],
        box: clone(productBox),
        rotation: number(product[1].rotation),
        keepAspectRatio: product[1].keepAspectRatio !== false,
        sizingMode: product[1].sizingMode || '',
        fitMode: product[1].fitMode || '',
        targetWidth: number(product[1].targetWidth, productBox.width),
        targetHeight: number(product[1].targetHeight, productBox.height),
        maxTargetHeight: number(product[1].maxTargetHeight, productBox.height),
      };
    }

    if (productBox) {
      smartProductMemberEntries(template, product[0]).forEach(([key, layer, type]) => {
        if (type === 'product') return;
        const slot = type === 'price' ? `price:${String(layer.priceSlot || layer.slot || key)}` : `shadow:${key}`;
        const box = window.Geometry.getLayerBox(key, layer);
        // 價格版型（layoutKey，例如 singleCoupon／doubleCoupon）跟著存起來，套用到別的版位時
        // 用來檢查版型是否相容（見 applyChildConfig 的說明），避免蓋掉不同版型的 rule 排版。
        const layoutKey = type === 'price' ? (layer.priceLayoutKey || '') : '';
        const target = type === 'price' && scopePricesByTemplate ? scopedPriceTransforms : childTransforms;
        target[slot] = { ...childToLocal(box, layer, productBox, productRotation), key, type, layoutKey };
      });
    }

    if (scopePricesByTemplate) childTransformsByTemplate[identity] = scopedPriceTransforms;

    return {
      version: 4,
      groupMode: 'smart-product',
      // V1.1：不再儲存/套用商品本身的絕對位置（productTransform）。商品＋價格智慧型物件
      // 只描述「價格相對商品中心」的關係，商品本身在各版位的位置永遠維持該版位原本設定。
      childTransforms,
      childTransformsByTemplate,
      productTransformsByTemplate,
      shadow: {
        enabled: false, color: '#901e0e', opacity: .8, blur: 3, skewX: -.5, scaleX: .95, scaleY: .45,
        offsetX: 0, offsetY: 2, gradientStart: .85, gradientEnd: 1.1,
        ...migrated.shadow
      }
    };
  }

  function applyProductConfig(template, config, options = {}) {
    if (!shouldSyncProductWithinSameTemplate(template)) return;
    const currentProduct = productEntry(template);
    if (
      template?.__appliedPlacementPresetKey
      && currentProduct?.[1]?.__placementPresetApplied === true
      && options.allowPresetOverride !== true
    ) return;
    const identity = templateIdentity(template);
    const saved = config?.productTransformsByTemplate?.[identity];
    const product = productEntry(template);
    if (!saved || !product || !saved.box) return;

    const [key, layer] = product;
    window.Geometry.applyBox(key, layer, saved.box, { template });
    layer.rotation = number(saved.rotation, number(layer.rotation));
    layer.keepAspectRatio = saved.keepAspectRatio !== false;
    if (saved.sizingMode) layer.sizingMode = saved.sizingMode;
    if (saved.fitMode) layer.fitMode = saved.fitMode;
    layer.targetWidth = number(saved.targetWidth, saved.box.width);
    layer.targetHeight = number(saved.targetHeight, saved.box.height);
    layer.maxTargetHeight = number(saved.maxTargetHeight, saved.box.height);
  }

  function applyChildConfig(template, config, options = {}) {
    const product = productEntry(template);
    if (!product || !config?.childTransforms) return;
    const productBox = window.Geometry.getLayerBox(product[0], product[1]);
    const productRotation = number(product[1].rotation);
    const identity = templateIdentity(template);
    const scopePricesByTemplate = template?.smartAssetPolicy?.priceTransformScope === 'same-template' && !!identity;
    const scopedPriceTransforms = config.childTransformsByTemplate?.[identity] || {};

    smartProductMemberEntries(template, product[0]).forEach(([key, layer, type]) => {
      if (type === 'product') return;
      if (
        type === 'price'
        && template.__appliedPlacementPresetKey
        && layer.__placementPresetApplied === true
        && options.allowPresetOverride !== true
      ) return;
      const slot = type === 'price' ? `price:${String(layer.priceSlot || layer.slot || key)}` : `shadow:${key}`;
      const transformSource = type === 'price' && scopePricesByTemplate ? scopedPriceTransforms : config.childTransforms;
      const local = transformSource?.[slot] || Object.values(transformSource || {}).find(item => item?.key === key);
      if (!local) return;
      // 價格版型相容性檢查：如果這個版位當下這筆工單資料，被 PriceRuleEngine 判斷成跟儲存當下
      // 不一樣的版型（例如這裡是單券 singleCoupon，儲存當下是雙券 doubleCoupon），代表這是完全
      // 不同形狀/內容的排版，硬套用同一組相對位置會蓋掉這個版位自己正確的 rule 排版。
      // 這種情況直接跳過、保留 rule 算出來的原始位置，不套用智慧素材同步。
      if (type === 'price' && local.layoutKey && layer.priceLayoutKey && local.layoutKey !== layer.priceLayoutKey) {
        console.warn(`[SmartAsset] 版型不相容，略過價格同步：${key}（此版位=${layer.priceLayoutKey}，儲存時=${local.layoutKey}）`);
        return;
      }
      applyLocalMemberTransform(template, key, layer, type, local, productBox, productRotation);
      if (type === 'price') {
        layer.align = local.align || layer.align || 'center';
        // 字級、行高、文字分段與 anchor 已由 applyLocalMemberTransform 一次同步。
        // 不可在這裡再次縮放或把 preserveExactSize 打開，否則 P 下一次縮放時
        // 位置與內容會使用不同基準，重新出現跳動。
        layer.disableContentScale = false;
        layer.preserveExactSize = false;
        layer.skipAutoScale = false;
      }
    });
  }

  // 預設情況下商品位置仍由各版位獨立管理；只有公版明確設定
  // productTransformScope='same-template' 時，才會依穩定的公版身分同步商品變形。

  function removeShadow(template, images) {
    Object.keys(template?.layers || {}).filter(key => key.startsWith(SHADOW_PREFIX)).forEach(key => {
      delete template.layers[key];
      if (images) delete images[key];
    });
    template.renderOrder = (template.renderOrder || []).filter(key => !key.startsWith(SHADOW_PREFIX));
  }
  function ensureProductBaseline(template, key, layer) {
    if (!template || !key || !layer) return null;
    if (layer.__smartAssetBaseline?.box) return clone(layer.__smartAssetBaseline);
    const engine = window.WarmupPlacementPresetEngine;
    const presetKey = engine?.resolveKey?.(template, template.batchRecord || {});
    const preset = presetKey ? engine?.list?.()?.[presetKey]?.layers?.[key] : null;
    const current = window.Geometry.getLayerBox(key, layer);
    const baseBox = preset && [preset.x, preset.y, preset.width, preset.height].every(Number.isFinite)
      ? { x: number(preset.x), y: number(preset.y), width: Math.max(1, number(preset.width, 1)), height: Math.max(1, number(preset.height, 1)) }
      : clone(current);
    layer.__smartAssetBaseline = {
      box: baseBox,
      rotation: number(preset?.rotation, number(layer.rotation)),
      fitMode: preset?.fitMode || layer.fitMode || '',
      sizingMode: preset?.sizingMode || layer.sizingMode || '',
    };
    return clone(layer.__smartAssetBaseline);
  }
  function productDeltaFromBaseline(template, key, layer) {
    const baseline = ensureProductBaseline(template, key, layer);
    if (!baseline?.box) return null;
    const current = window.Geometry.getLayerBox(key, layer);
    const base = baseline.box;
    return {
      dxRatio: ((current.x + current.width / 2) - (base.x + base.width / 2)) / Math.max(1, base.width),
      dyRatio: ((current.y + current.height / 2) - (base.y + base.height / 2)) / Math.max(1, base.height),
      scaleX: current.width / Math.max(1, base.width),
      scaleY: current.height / Math.max(1, base.height),
      rotationDelta: number(layer.rotation) - number(baseline.rotation),
    };
  }
  function applyProductDelta(template, key, layer, delta) {
    if (!delta) return;
    const baseline = ensureProductBaseline(template, key, layer);
    const base = baseline?.box;
    if (!base) return;
    const width = Math.max(1, base.width * number(delta.scaleX, 1));
    const height = Math.max(1, base.height * number(delta.scaleY, 1));
    const centerX = base.x + base.width / 2 + number(delta.dxRatio) * base.width;
    const centerY = base.y + base.height / 2 + number(delta.dyRatio) * base.height;
    window.Geometry.applyBox(key, layer, { x: centerX - width / 2, y: centerY - height / 2, width, height }, { template, notifyPrice: false, notifyLayout: false });
    layer.rotation = number(baseline.rotation) + number(delta.rotationDelta);
    // fitMode / sizingMode 是各公版自己的設定，跨版位同步不可覆蓋（決策 88）。
    layer.targetWidth = width;
    layer.targetHeight = height;
    if (Number.isFinite(Number(layer.maxTargetHeight))) layer.maxTargetHeight = Math.max(height, number(layer.maxTargetHeight));
  }
  function applyTemplate(template, options = {}) {
    if (!template) return;
    // 第一次建立正式 Template 時只記錄基準，不從舊 session / image loader 反向覆寫 Preset。
    productEntries(template).forEach(([key, layer]) => ensureProductBaseline(template, key, layer));
    const config = getConfigForTemplate(template);
    if (!config || options.readOnly === true) return;
    // 只有明確 Smart Asset Transaction 套用時才允許使用 session config 更新子關係。
    if (options.applySessionConfig === true) {
      template.smartAssetConfig = clone(config);
      applyChildConfig(template, config, { allowPresetOverride: options.allowPresetOverride === true });
      if (!config.shadow?.enabled) removeShadow(template);
    }
  }

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
    });
  }
  async function ensureShadow(template, images, config = getConfigForTemplate(template)) {
    const entry = productEntry(template);
    if (!entry || !config?.shadow?.enabled) { removeShadow(template, images); return; }
    const [key, layer] = entry;
    const image = images?.[key];
    if (!image || !window.ProductShadowEngine?.hasTransparency(image)) { removeShadow(template, images); return; }
    const box = window.Geometry.getLayerBox(key, layer);
    const generated = window.ProductShadowEngine.generate(image, box.width, box.height, config.shadow);
    const generatedKey = shadowKey(key);
    template.layers[generatedKey] = {
      type: 'image', psdName: '商品圖_陰影', role: 'product-shadow', generatedEffect: 'product-shadow', sourceLayerKey: key,
      generatedDataUrl: generated.dataUrl, assetFilename: generated.dataUrl,
      x: box.x + generated.localX, y: box.y + generated.localY, width: generated.width, height: generated.height,
      centerX: box.x + generated.localX + generated.width / 2, centerY: box.y + generated.localY + generated.height / 2,
      targetWidth: generated.width, targetHeight: generated.height, keepAspectRatio: true, sizingMode: 'absolute', positioningMode: 'absolute', locked: false, hidden: false
    };
    template.renderOrder = (template.renderOrder || []).filter(item => item !== generatedKey);
    const sourceIndex = template.renderOrder.indexOf(key);
    template.renderOrder.splice(sourceIndex < 0 ? template.renderOrder.length : sourceIndex, 0, generatedKey);
    images[generatedKey] = await loadImage(generated.dataUrl);
  }

  // 找出指定的 template 物件在 AppState.templates 裡的索引，供標記/刷新縮圖使用。
  function indexOfTemplate(template) {
    const list = window.AppState?.templates || [];
    const index = list.findIndex((item) => (item?.data || item) === template);
    return index >= 0 ? [index] : [];
  }
  // 給主畫布上其他互動流程（例如一般文字編輯）呼叫：標記/刷新「目前使用中版位自己」的縮圖。
  function markActiveThumbStale(template = window.AppState?.template) {
    markThumbsStale(indexOfTemplate(template));
  }

  let mainTransformSession = null;
  // 目前是不是正在主畫布上拖曳/縮放/旋轉中——保留給其他子系統在未來需要「現在不要搶」時使用。
  function isTransformActive() { return !!mainTransformSession; }
  function isProductTransformActive(template = window.AppState?.template) {
    return !!(mainTransformSession
      && mainTransformSession.template === template
      && (mainTransformSession.children || mainTransformSession.guideMembers));
  }

  // 跨版位同步後，標記被影響到的縮圖為「待更新」（立即的視覺回饋），並延遲一下觸發真正的背景
  // 刷新——批次收集短時間內的多次同步請求，只真正刷新一次。
  // 這裡改呼叫 BatchManager.renderThumbnailForTemplate()（純函式，見 app.core.js），全程不會
  // 讀寫 AppState.template／activeIndex／images，所以不會有「跟使用者當下操作互相搶佔」的風險，
  // 不需要再檢查使用者是否正在拖曳中，也不需要世代計數器互斥。
  let pendingThumbIndexes = null;
  let pendingThumbTimer = null;
  function markThumbsStale(indexes) {
    if (!indexes?.length) return;
    const grid = document.getElementById('batchPreviewGrid');
    if (grid) {
      indexes.forEach((index) => {
        grid.querySelector(`.batch-thumb[data-index="${index}"]`)?.classList.add('is-stale');
      });
    }
    if (!window.AppState?.batchMode) return;
    pendingThumbIndexes = pendingThumbIndexes || new Set();
    indexes.forEach((i) => pendingThumbIndexes.add(i));
    clearTimeout(pendingThumbTimer);
    pendingThumbTimer = setTimeout(() => {
      const list = Array.from(pendingThumbIndexes || []);
      pendingThumbIndexes = null;
      if (list.length) window.BatchManager?.refreshPreviewIndexes?.(list, { showProgress: false });
    }, 400);
  }
  // 判斷目前拖曳/縮放/微調的這個 key，是不是「商品家族」的一份子：
  // - 直接是某個商品圖層本身（用 isProduct 直接測，不透過 productEntry() 的「第一個」假設，
  //   這樣 placement 模式下拖 P_02、P_03... 也認得出來）。
  // - 或是某個商品的價格／陰影子圖層（用現有單一商品 productEntry 找家族）。
  function resolveTransformTarget(template, key) {
    const layer = template?.layers?.[key];
    if (!layer) return null;
    if (isPlacementGuide(key, layer)) return { role: 'guide' };
    if (isProduct(key, layer)) return { role: 'product' };
    // 2026-08-14：多商品圖層（例：04_Mall Skinny BN 的 左邊_P/中間_P/右邊_P）——
    // 逐一以各自 product 尋找子圖層（價格/陰影），讓每格價格都認得「自己的」P，
    // 不再只認第一個 product（原本 左/中 格價格會被判定 null 而無法連動）。
    // 單一 product 版位（HBN/DD/POPUP/SKBN）迴圈只跑一次，行為與原本完全相同。
    // 整合版：smartAsset.multiProductLink=false 時只認第一個 product（暖身BN 行為）。
    const products = smartFlag('smartAsset.multiProductLink', true) ? productEntries(template) : [productEntry(template)].filter(Boolean);
    for (let i = 0; i < products.length; i += 1) {
      const pk = products[i][0];
      if (smartProductMemberEntries(template, pk).some(([memberKey]) => memberKey === key)) {
        return { role: 'child', productKey: pk };
      }
    }
    return null;
  }
  function ownsLayer(key, layer, template = window.AppState?.template) {
    return !!resolveTransformTarget(template, key);
  }
  function beginMainCanvasTransform(key, template = window.AppState?.template) {
    const target = resolveTransformTarget(template, key);
    if (!target) { mainTransformSession = null; return false; }
    const layer = template.layers[key];
    const initialBox = window.Geometry.getLayerBox(key, layer);
    const initialRotation = number(layer.rotation);
    const baseSession = {
      template,
      draggedKey: key,
      role: target.role,
      productKey: target.role === 'child' ? target.productKey : (target.role === 'product' ? key : null),
      initialBox: clone(initialBox),
      initialRotation,
      initialTemplateSnapshot: clone(template),
      initialSmartAssetState: snapshotSession(),
    };
    if (target.role === 'guide') {
      mainTransformSession = {
        ...baseSession,
        children: null,
        guideMembers: productEntries(template).map(([memberKey, memberLayer]) => {
          ensureProductBaseline(template, memberKey, memberLayer);
          const memberBox = window.Geometry.getLayerBox(memberKey, memberLayer);
          const memberRotation = number(memberLayer.rotation);
          return {
            key: memberKey,
            anchor: boxToGuideAnchor(memberBox, initialBox),
            children: smartProductMemberEntries(template, memberKey)
              .filter(([, , type]) => type !== 'product')
              .map(([childKey, childLayer, type]) => ({
                key: childKey, type,
                local: childToLocal(window.Geometry.getLayerBox(childKey, childLayer), childLayer, memberBox, memberRotation),
              })),
          };
        }),
      };
      return true;
    }
    if (target.role !== 'product') {
      mainTransformSession = { ...baseSession, children: null };
      return true;
    }
    ensureProductBaseline(template, key, layer);
    mainTransformSession = {
      ...baseSession,
      productRotation: initialRotation,
      productBox: clone(initialBox),
      children: smartProductMemberEntries(template, key)
        .filter(([, , type]) => type !== 'product')
        .map(([childKey, childLayer, type]) => ({
          key: childKey, type,
          local: childToLocal(window.Geometry.getLayerBox(childKey, childLayer), childLayer, initialBox, initialRotation),
        })),
    };
    return true;
  }

  function updateMainCanvasTransform(key, template = window.AppState?.template) {
    const session = mainTransformSession;
    if (!session || session.template !== template || session.draggedKey !== key) return false;
    if (session.guideMembers) {
      const guideLayer = template.layers?.[key];
      if (!guideLayer) return false;
      session.guideMembers.forEach(({ key: memberKey, anchor, children }) => {
        const memberLayer = template.layers?.[memberKey];
        if (!memberLayer) return;
        applyPlacementAnchor(template, memberKey, memberLayer, anchor);
        if (children?.length) {
          const memberBox = window.Geometry.getLayerBox(memberKey, memberLayer);
          const memberRotation = number(memberLayer.rotation);
          children.forEach(({ key: childKey, local, type }) => {
            const childLayer = template.layers?.[childKey];
            if (!childLayer) return;
            applyLocalMemberTransform(template, childKey, childLayer, type, local, memberBox, memberRotation);
          });
        }
      });
      return true;
    }
    if (!session.children) return true;
    const productLayer = template.layers?.[key];
    if (!productLayer) return false;
    const productBox = window.Geometry.getLayerBox(key, productLayer);
    const productRotation = number(productLayer.rotation);
    session.children.forEach(({ key: childKey, local, type }) => {
      const childLayer = template.layers?.[childKey];
      if (!childLayer) return;
      applyLocalMemberTransform(template, childKey, childLayer, type, local, productBox, productRotation);
    });
    return true;
  }

  const TRANSFORM_EPSILON = 0.05;
  function hasSessionActuallyChanged(session, template) {
    const layer = template.layers?.[session.draggedKey];
    if (!layer) return false;
    const box = window.Geometry.getLayerBox(session.draggedKey, layer);
    const rotation = number(layer.rotation);
    const before = session.initialBox;
    return Math.abs(box.x - before.x) > TRANSFORM_EPSILON
      || Math.abs(box.y - before.y) > TRANSFORM_EPSILON
      || Math.abs(box.width - before.width) > TRANSFORM_EPSILON
      || Math.abs(box.height - before.height) > TRANSFORM_EPSILON
      || Math.abs(rotation - session.initialRotation) > TRANSFORM_EPSILON;
  }

  function physicalAssetId(template, key, layer) {
    if (!layer?.assetFilename) return null;
    return makeAssetId(layer.assetFilename, { folder: layer.assetProject || template?.batchProject || '', layer: { ...layer, smartAssetGroup: '' } });
  }
  function explicitGroupId(layer) {
    const group = normalizeGroup(layer?.smartAssetGroup || '');
    return group ? `group:${group}` : null;
  }
  function collectGroupConflicts() {
    const map = new Map();
    (window.AppState?.templates || []).forEach((item) => {
      const template = item?.data || item;
      productEntries(template).forEach(([key, layer]) => {
        const physical = physicalAssetId(template, key, layer);
        const group = explicitGroupId(layer);
        if (!physical || !group) return;
        const canonicalGroup = resolveCanonical(group);
        if (!map.has(physical)) map.set(physical, new Set());
        map.get(physical).add(canonicalGroup);
      });
    });
    return [...map.entries()].filter(([, groups]) => groups.size > 1).map(([physical, groups]) => ({ physical, groups: [...groups] }));
  }
  function validateGroupState() {
    const conflicts = collectGroupConflicts();
    if (!conflicts.length) return;
    const detail = conflicts.map((entry) => `${entry.physical}: ${entry.groups.join(', ')}`).join('\n');
    throw new Error(`Smart Asset Group 設定衝突\n${detail}`);
  }

  function normalizeLogicalAssetKey(value) {
    return policy().normalizeLogicalAssetKey?.(value) || normalizeName(value);
  }
  function getTemplateRuleEntry(template) {
    const family = template?.ruleFamily
      || template?.sheetTemplateRoute?.family
      || window.CapsuleRuleEngine?.getTemplateFamily?.(template)
      || '';
    return (window.TemplateRuleManager || window.TemplateRuleRegistry)?.get?.(family) || null;
  }
  function resolveLogicalAssetMapping(template, productKey, productLayer, logicalAssetKey) {
    const normalizedLogicalKey = normalizeLogicalAssetKey(logicalAssetKey);
    if (!normalizedLogicalKey) throw new Error('logicalAssetKey 不可為空白');
    const ruleEntry = getTemplateRuleEntry(template);
    const resolver = ruleEntry?.rules?.resolveSmartAssetFile || ruleEntry?.resolveSmartAssetFile;
    let requested = logicalAssetKey;
    let project = productLayer?.assetProject || template?.batchProject || '';
    if (typeof resolver === 'function') {
      const mapped = resolver({
        template,
        record: template?.batchRecord || {},
        productKey,
        productLayer,
        logicalAssetKey: normalizedLogicalKey,
        rawLogicalAssetKey: logicalAssetKey,
      });
      if (Array.isArray(mapped)) throw new Error(`logicalAssetKey「${logicalAssetKey}」映射不唯一：Rule 回傳 ${mapped.length} 個候選`);
      if (typeof mapped === 'string') requested = mapped;
      else if (mapped && typeof mapped === 'object') {
        requested = mapped.filename || mapped.assetFilename || mapped.name || logicalAssetKey;
        project = mapped.project || mapped.folder || project;
      } else if (mapped != null) {
        throw new Error(`logicalAssetKey「${logicalAssetKey}」映射格式不合法`);
      }
    }
    const match = window.BatchManager?.findAssetFilename?.(requested, {
      template,
      project,
      layer: productLayer,
      layerKey: productKey,
      field: '商品圖1',
    });
    if (!match?.found || !match.filename) {
      throw new Error(`${template?.templateId || template?.name || '未知版位'}：找不到 logicalAssetKey「${logicalAssetKey}」對應素材「${requested}」`);
    }
    return {
      logicalAssetKey: normalizedLogicalKey,
      filename: match.lookupName || match.filename,
      folder: match.folder || project || '',
      physicalId: makeAssetId(match.lookupName || match.filename, { folder: match.folder || project || '', layer: { ...productLayer, smartAssetGroup: '' } }),
    };
  }
  function findDestinationGroups(sourceCanonical, logicalAssetKey, mappedPhysicalIds, sourceTemplate, sourceProductKey) {
    const logical = normalizeLogicalAssetKey(logicalAssetKey);
    const sourceProductLayer = sourceTemplate?.layers?.[sourceProductKey];
    const sourceSignature = sourceProductLayer
      ? smartTransformLinkSignature(sourceTemplate, sourceProductKey, sourceProductLayer)
      : null;
    const groups = new Set();
    (window.AppState?.templates || []).forEach((item) => {
      const template = item?.data || item;
      productEntries(template).forEach(([key, layer]) => {
        const current = resolveCanonical(getLayerAssetId(template, key, layer));
        if (!current || current === sourceCanonical) return;
        const sameLogical = logical && normalizeLogicalAssetKey(layer.logicalAssetKey || '') === logical;
        const samePhysical = mappedPhysicalIds.has(physicalAssetId(template, key, layer));
        if (!sameLogical && !samePhysical) return;
        if (sourceSignature) {
          const targetSignature = smartTransformLinkSignature(template, key, layer);
          const link = compareSmartTransformSignatures(sourceSignature, targetSignature, {
            allowMissingPriceFallback: true,
            ignoreAsset: true,
          });
          if (!link.match) return;
        }
        groups.add(current);
      });
    });
    return [...groups];
  }

  // 變更 Smart Asset 的「邏輯商品」：先由每個 Rule 將 logicalAssetKey 映射到自己的實體檔案，
  // 完整 Preflight 後才原子 Commit。若目標商品已屬於既有 Group，既有 Group 的 Transform 狀態優先。
  async function changeLogicalAsset(sourceTemplate, nextLogicalAssetKey) {
    validateGroupState();
    const sourceProduct = productEntry(sourceTemplate);
    if (!sourceProduct) throw new Error('來源 P / 商品圖層不存在');
    const sourceCanonical = resolveCanonical(getLayerAssetId(sourceTemplate, sourceProduct[0], sourceProduct[1]));
    if (!sourceCanonical) throw new Error('來源 Smart Asset 身分不存在');
    const sourceUsages = usageEntries(sourceCanonical, { sourceTemplate, sourceProductKey: sourceProduct[0], allowMissingPriceFallback: true });
    if (!sourceUsages.length) throw new Error('找不到來源 Smart Asset Group 使用版位');

    const mappings = [];
    const errors = [];
    sourceUsages.forEach((usage) => {
      try {
        mappings.push({ ...usage, mapping: resolveLogicalAssetMapping(usage.template, usage.productKey, usage.productLayer, nextLogicalAssetKey) });
      } catch (error) {
        errors.push(error?.message || String(error));
      }
    });
    if (errors.length) throw new Error(`Smart Asset 換圖 Preflight 失敗\n${errors.join('\n')}`);

    const mappedPhysicalIds = new Set(mappings.map(({ mapping }) => mapping.physicalId).filter(Boolean));
    const sourceHasExplicitGroup = sourceUsages.some(({ productLayer }) => !!explicitGroupId(productLayer));
    if (!sourceHasExplicitGroup && mappedPhysicalIds.size > 1) {
      throw new Error('跨不同實體素材維持同一 Smart Asset 關聯時，Rule 必須明確宣告 smartAssetGroup');
    }
    const destinationGroups = findDestinationGroups(sourceCanonical, nextLogicalAssetKey, mappedPhysicalIds, sourceTemplate, sourceProduct[0]);
    if (destinationGroups.length > 1) {
      throw new Error(`同一目標素材目前存在多個 Canonical Group：${destinationGroups.join('、')}`);
    }
    const destinationCanonical = destinationGroups[0] || null;
    const destinationUsagesBefore = destinationCanonical ? usageEntries(destinationCanonical, { sourceTemplate, sourceProductKey: sourceProduct[0], allowMissingPriceFallback: true, ignoreAssetInSignature: true }) : [];

    const affectedBefore = new Map();
    [...sourceUsages, ...destinationUsagesBefore].forEach(({ index, template }) => {
      if (!affectedBefore.has(index)) affectedBefore.set(index, clone(template));
    });
    const smartBefore = snapshotSession();
    const sourceIndex = sourceUsages.find(({ template }) => template === sourceTemplate)?.index ?? sourceUsages[0].index;
    const history = window.HistoryManager;
    if (history && Number.isInteger(sourceIndex) && affectedBefore.has(sourceIndex)) {
      history.pushSnapshot(affectedBefore.get(sourceIndex), sourceIndex, 'smart-asset-logical-change');
      history.attachExtra([...affectedBefore.entries()].filter(([index]) => index !== sourceIndex).map(([index, data]) => ({ index, data })));
      history.attachSmartAssetState(smartBefore);
    }

    try {
      mappings.forEach(({ productLayer, mapping }) => {
        productLayer.assetFilename = mapping.filename;
        productLayer.assetProject = mapping.folder;
        productLayer.logicalAssetKey = mapping.logicalAssetKey;
        productLayer.__assetMissing = false;
        delete productLayer.smartAssetId;
      });

      let canonical = sourceCanonical;
      let representative = null;
      if (destinationCanonical) {
        canonical = mergeGroups(sourceCanonical, destinationCanonical);
        representative = destinationUsagesBefore[0] || null;
      } else if (!sourceHasExplicitGroup) {
        const nextIds = new Set(mappings.map(({ template, productKey, productLayer }) => getLayerAssetId(template, productKey, productLayer)).filter(Boolean));
        if (nextIds.size !== 1) throw new Error('Smart Asset 換圖後無法建立唯一 Canonical Group');
        const nextId = [...nextIds][0];
        canonical = sourceCanonical === nextId ? nextId : mergeGroups(sourceCanonical, nextId);
      }
      if (!representative) {
        const currentUsages = usageEntries(canonical, { sourceTemplate, sourceProductKey: sourceProduct[0], allowMissingPriceFallback: true });
        representative = currentUsages.find(({ template }) => template === sourceTemplate) || currentUsages[0] || null;
      }
      if (!representative) throw new Error('Smart Asset 換圖後找不到同步來源版位');

      const result = syncFromSource(canonical, representative.template, representative.productKey, { attachHistory: false });
      const affected = [...new Set([...affectedBefore.keys(), ...(result?.affected || [])])];
      if (affected.includes(window.AppState?.activeIndex)) {
        await window.TemplateLoader?.loadImagesForActiveTemplate?.();
        window.Renderer?.render?.(); window.LayerManager?.render?.(); window.Inspector?.render?.();
      }
      await window.BatchManager?.refreshPreviewIndexes?.(affected, { showProgress: false });
      return { canonical: resolveCanonical(canonical), affected, mappings: mappings.map(({ index, mapping }) => ({ index, ...mapping })), warnings: result?.warnings || [] };
    } catch (error) {
      affectedBefore.forEach((snapshot, index) => {
        const entry = window.AppState?.templates?.[index];
        const target = entry?.data || entry;
        overwriteTemplate(target, snapshot);
        if (index === window.AppState?.activeIndex) window.AppState.template = target;
      });
      restoreSession(smartBefore);
      if (history && Array.isArray(window.AppState?.history) && window.AppState.history.length) window.AppState.history.pop();
      throw error;
    }
  }

  function usageEntries(assetId, options = {}) {
    const wanted = resolveCanonical(assetId);
    if (!wanted) return [];
    const sourceTemplate = options.sourceTemplate || null;
    const sourceProductKey = options.sourceProductKey || (sourceTemplate ? productEntry(sourceTemplate)?.[0] : null);
    const sourceProductLayer = sourceTemplate && sourceProductKey ? sourceTemplate.layers?.[sourceProductKey] : null;
    const sourceSignature = sourceTemplate && sourceProductLayer
      ? smartTransformLinkSignature(sourceTemplate, sourceProductKey, sourceProductLayer)
      : null;
    // 2026-08-14：多商品圖層版位（例：Mall 三格）改採「同圖層名稱＋同素材」連動規則
    //（使用者確認：左邊_P 帶入 免運車.png，只跟其他組的 左邊_P＝免運車.png 連動）。
    // 不再比對整版價格簽章，避免三格中其他格價格不同就整組不連動。
    // 單一 product 版位維持原本「asset＋簽章」比對，行為完全不變。
    const sourceIsMulti = smartFlag('smartAsset.multiProductLink', true) && sourceTemplate ? productEntries(sourceTemplate).length > 1 : false;
    const result = [];
    (window.AppState?.templates || []).forEach((item, index) => {
      const template = item?.data || item;
      productEntries(template).forEach(([productKey, productLayer]) => {
        const current = resolveCanonical(getLayerAssetId(template, productKey, productLayer));
        if (current !== wanted) return;
        if (sourceIsMulti) {
          // 同圖層名稱才連動（左邊_P↔左邊_P、中間_P↔中間_P、右邊_P↔右邊_P）。
          if (sourceProductKey && productKey !== sourceProductKey) return;
          // 2026-08-14（使用者確認）：同素材但該格「價格文字」不同 → 不連動。
          const cellPriceText = (tpl, pk) => smartProductMemberEntries(tpl, pk)
            .filter(([, , type]) => type === 'price')
            .map(([, priceLayer]) => String(priceLayer.text || '').trim())
            .sort()
            .join('|');
          if (sourceTemplate && sourceProductKey
            && cellPriceText(sourceTemplate, sourceProductKey) !== cellPriceText(template, productKey)) return;
          result.push({ item, index, template, productKey, productLayer, linkMode: 'same-key-asset', linkWarning: '' });
          return;
        }
        let link = { match: true, mode: 'asset-only' };
        if (sourceSignature) {
          const targetSignature = smartTransformLinkSignature(template, productKey, productLayer);
          link = compareSmartTransformSignatures(sourceSignature, targetSignature, {
            allowMissingPriceFallback: options.allowMissingPriceFallback === true,
            ignoreAsset: options.ignoreAssetInSignature === true,
          });
          if (!link.match) return;
        }
        result.push({ item, index, template, productKey, productLayer, linkMode: link.mode, linkWarning: link.warning || '' });
      });
    });
    return result;
  }

  function linkedUsageEntriesFor(template, productKey, assetId) {
    return usageEntries(assetId, {
      sourceTemplate: template,
      sourceProductKey: productKey,
      allowMissingPriceFallback: true,
    });
  }

  function sourceMemberLocals(template, productKey) {
    const productLayer = template.layers?.[productKey];
    if (!productLayer) return [];
    const productBox = window.Geometry.getLayerBox(productKey, productLayer);
    const rotation = number(productLayer.rotation);
    return smartProductMemberEntries(template, productKey)
      .filter(([, , type]) => type !== 'product')
      .map(([key, layer, type]) => ({
        key,
        type,
        slot: type === 'price' ? String(layer.priceSlot || layer.slot || key) : key,
        layoutKey: type === 'price' ? String(layer.priceLayoutKey || '') : '',
        local: childToLocal(window.Geometry.getLayerBox(key, layer), layer, productBox, rotation),
      }));
  }
  function findTargetMember(template, targetProductKey, sourceMember) {
    const members = smartProductMemberEntries(template, targetProductKey).filter(([, , type]) => type === sourceMember.type);
    if (sourceMember.type === 'price') {
      return members.find(([key, layer]) => {
        const slot = String(layer.priceSlot || layer.slot || key);
        if (slot !== sourceMember.slot) return false;
        const targetLayout = String(layer.priceLayoutKey || '');
        return !sourceMember.layoutKey || !targetLayout || sourceMember.layoutKey === targetLayout;
      }) || null;
    }
    if (sourceMember.type === 'shadow') {
      return members.find(([key, layer]) => layer.sourceLayerKey === targetProductKey)
        || members.find(([key]) => key === sourceMember.key)
        || members[0]
        || null;
    }
    return null;
  }
  function overwriteTemplate(target, snapshot) {
    if (!target || !snapshot) return;
    Object.keys(target).forEach((key) => delete target[key]);
    Object.assign(target, clone(snapshot));
  }
  function preflightSmartSync(assetId, sourceTemplate, sourceProductKey) {
    validateGroupState();
    const entries = usageEntries(assetId, {
      sourceTemplate,
      sourceProductKey,
      allowMissingPriceFallback: true,
    });
    const errors = [];
    if (!sourceTemplate?.layers?.[sourceProductKey]) errors.push('來源商品圖層不存在');
    entries.forEach(({ template, productKey }) => {
      if (!template?.layers?.[productKey]) errors.push(`${template?.templateId || template?.name || '未知版位'}：P / 商品圖層不存在`);
    });
    if (errors.length) throw new Error(`Smart Asset Preflight 失敗\n${errors.join('\n')}`);
    return entries;
  }

  // Smart Asset 的單一跨版位同步核心：每個 Template 都以自己的 Preset baseline 套用來源的相對 Transform。
  // 價格只同步相容 slot + layout 的「幾何」，文字內容永遠留在各自 Excel / Rule（決策 59/60）。
  function syncFromSource(assetId, sourceTemplate, sourceProductKey, options = {}) {
    const canonical = resolveCanonical(assetId);
    const usages = preflightSmartSync(canonical, sourceTemplate, sourceProductKey);
    const sourceLayer = sourceTemplate.layers[sourceProductKey];
    ensureProductBaseline(sourceTemplate, sourceProductKey, sourceLayer);
    const delta = productDeltaFromBaseline(sourceTemplate, sourceProductKey, sourceLayer);
    const members = sourceMemberLocals(sourceTemplate, sourceProductKey);
    const targets = usages.filter(({ template, productKey }) => template !== sourceTemplate || productKey !== sourceProductKey);
    const uniqueTargetSnapshots = new Map();
    targets.forEach(({ index, template }) => {
      if (!uniqueTargetSnapshots.has(index)) uniqueTargetSnapshots.set(index, clone(template));
    });
    const warnings = [];
    try {
      targets.forEach(({ template, productKey, productLayer, linkMode, linkWarning }) => {
        ensureProductBaseline(template, productKey, productLayer);
        applyProductDelta(template, productKey, productLayer, delta);
        const targetBox = window.Geometry.getLayerBox(productKey, productLayer);
        const targetRotation = number(productLayer.rotation);
        if (linkWarning) warnings.push(`${template.templateId || template.name || '版位'}：${linkWarning}`);
        members.forEach((member) => {
          if (member.type === 'price' && linkMode === 'product-only-missing-price') return;
          const target = findTargetMember(template, productKey, member);
          if (!target) {
            if (member.type === 'price') warnings.push(`${template.templateId || template.name || '版位'}：priceSlot ${member.slot}${member.layoutKey ? ` / ${member.layoutKey}` : ''} 無相容目標，已略過`);
            return;
          }
          applyLocalMemberTransform(template, target[0], target[1], member.type, member.local, targetBox, targetRotation);
        });
      });
    } catch (error) {
      uniqueTargetSnapshots.forEach((snapshot, index) => {
        const entry = window.AppState?.templates?.[index];
        const target = entry?.data || entry;
        overwriteTemplate(target, snapshot);
      });
      if (options.sourceBefore) overwriteTemplate(sourceTemplate, options.sourceBefore);
      throw error;
    }
    const config = {
      version: 5,
      groupMode: 'smart-product-relative',
      productDelta: clone(delta),
      childLocals: clone(members),
      logicalAssetKey: sourceLayer.logicalAssetKey || '',
      smartAssetGroup: sourceLayer.smartAssetGroup || '',
    };
    const transformKey = smartTransformLinkKey(sourceTemplate, sourceProductKey, sourceLayer);
    if (transformKey) registry.set(transformKey, config);
    const extras = [...uniqueTargetSnapshots.entries()].map(([index, data]) => ({ index, data }));
    if (options.attachHistory !== false) window.HistoryManager?.attachExtra?.(extras);
    const affected = [...new Set([...(indexOfTemplate(sourceTemplate) || []), ...uniqueTargetSnapshots.keys()])];
    markThumbsStale(affected);
    if (warnings.length) console.warn('[SmartAsset] 非阻塞同步提示\n' + warnings.join('\n'));
    return { count: targets.length, affected, warnings, config };
  }

  function syncAll(assetId, config) {
    // 相容舊工作台 API：以目前 editing/source Template 為 Source of Truth，config 僅保留陰影/工作台設定。
    const sourceTemplate = editing?.template || window.AppState?.template;
    const product = productEntry(sourceTemplate);
    if (!sourceTemplate || !product) return { count: 0, affected: [] };
    if (config) sourceTemplate.smartAssetConfig = clone(config);
    return syncFromSource(assetId || getLayerAssetId(sourceTemplate, product[0], product[1]), sourceTemplate, product[0]);
  }

  function finishMainCanvasTransform(key, template = window.AppState?.template) {
    const session = mainTransformSession;
    if (!session || session.draggedKey !== key || session.template !== template) {
      mainTransformSession = null;
      return false;
    }
    updateMainCanvasTransform(key, template);
    const editedLayer = template.layers?.[key];
    if (editedLayer?.source === 'auto_price_v2') {
      window.PriceTransformEngine?.handleLayerRotationApplied?.(key, editedLayer, template);
      window.PriceTransformEngine?.captureManualPriceTransform?.(key, editedLayer, template, { rebase: true });
    }
    const changed = hasSessionActuallyChanged(session, template);
    mainTransformSession = null;
    if (!changed) return true;
    markThumbsStale(indexOfTemplate(template));
    if (session.guideMembers) return true; // P_範圍本身是各版位獨立基準，不跨版位同步。

    const productKey = session.productKey || (session.role === 'product' ? key : productEntry(template)?.[0]);
    const productLayer = productKey ? template.layers?.[productKey] : null;
    const assetId = productLayer ? getLayerAssetId(template, productKey, productLayer) : null;
    if (!assetId) return true;
    try {
      const result = syncFromSource(assetId, template, productKey, { sourceBefore: session.initialTemplateSnapshot });
      window.HistoryManager?.attachSmartAssetState?.(session.initialSmartAssetState);
      if (result.count > 0) toastGlobal(`已同步 ${result.count} 個版位`);
    } catch (error) {
      overwriteTemplate(template, session.initialTemplateSnapshot);
      restoreSession(session.initialSmartAssetState);
      // pointerdown 已先建立 History；Transaction 失敗時不可留下半筆紀錄。
      const history = window.AppState?.history;
      if (Array.isArray(history) && history.length) history.pop();
      window.Renderer?.render?.(); window.LayerManager?.render?.(); window.Inspector?.render?.();
      console.error('[SmartAsset] Transaction 已 Rollback', error);
      toastGlobal(`Smart Asset 套用失敗，已完整還原：${error.message || error}`);
    }
    return true;
  }

  // Image loader 永遠只負責載圖，不再偷偷 apply Smart Asset / Layout（決策 37/38/91）。
  function patchLoader() { /* intentionally disabled */ }

  // 價格文字屬於各筆 Excel / Rule 的內容，禁止跨版位同步（決策 59）。
  function syncPriceTextFromMainCanvas() { return 0; }

  // V2.0：拿掉右鍵「編輯素材／還原素材」選單。素材中心工作台（open/save/switchUsage/resetAsset
  // 等函式）目前沒有其他入口可以觸發，先保留這些函式本體（僅供未來重新設計 UI 入口時使用），
  // 但不再從畫布互動觸發。跨版位同步的核心機制（主畫布拖曳結束即同步）完全不依賴這個選單，
  // 不受影響。

  let editing = null;
  let previewRequest = 0;
  let dragState = null;
  const uiState = { showGuide: true, showTextBoxes: true, snap: true, zoom: 1 };

  function ensureUI() {
    if ($('smartAssetWorkspace')) return;
    const modal = document.createElement('div');
    modal.id = 'smartAssetWorkspace'; modal.className = 'sa-workspace-modal';
    modal.innerHTML = `
      <div class="sa-workspace" role="dialog" aria-modal="true" aria-label="素材工作台">
        <header class="sa-topbar">
          <div><strong>素材工作台</strong><span id="saAssetName" class="sa-subtitle"></span></div>
          <div class="sa-toolbar">
            <button id="saZoomOut" title="縮小">−</button><span id="saZoomLabel">100%</span><button id="saZoomIn" title="放大">＋</button>
            <label><input id="saShowGuide" type="checkbox" checked> P 範圍</label>
            <label><input id="saShowTextBoxes" type="checkbox" checked> 文字框</label>
            <label><input id="saSnap" type="checkbox" checked> 吸附</label>
          </div>
          <button class="sa-close" data-close aria-label="關閉">×</button>
        </header>
        <div class="sa-main">
          <aside class="sa-left-panel">
            <section><h3>素材元件</h3><div id="saComponents" class="sa-component-list"></div></section>
            <section class="sa-usages"><h3>使用此素材的版位 <span id="saUsageCount"></span></h3><div id="saUsageList"></div></section>
          </aside>
          <main class="sa-stage-wrap">
            <div id="saStageScroller" class="sa-stage-scroller"><div id="saCanvasFrame" class="sa-canvas-frame"><canvas id="saCanvas"></canvas></div></div>
            <div id="saToast" class="sa-toast"></div>
          </main>
          <aside class="sa-right-panel">
            <div class="sa-selected-title"><span>目前選取</span><strong id="saSelectedName">商品圖</strong></div>
            <details open><summary>位置與尺寸</summary><div class="sa-fields sa-grid4">
              <label>X<input id="saX" type="number" step="1"></label><label>Y<input id="saY" type="number" step="1"></label>
              <label>寬<input id="saW" type="number" min="1" step="1"></label><label>高<input id="saH" type="number" min="1" step="1"></label>
              <label class="sa-span2">旋轉<input id="saRotation" type="number" step="0.5"></label>
            </div></details>
            <details id="saTextPanel"><summary>價格文字</summary><div class="sa-fields">
              <label>對齊<select id="saAlign"><option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option></select></label>
              <label class="sa-switch"><input id="saAutoFont" type="checkbox" checked><span>文字框內自動最大字級</span></label>
              <p id="saTextWarning" class="sa-hint"></p>
            </div></details>
            <details id="saShadowPanel"><summary>去背商品陰影</summary><div class="sa-fields">
              <label class="sa-switch"><input id="saShadowEnabled" type="checkbox"><span>啟用陰影</span></label>
              <label>顏色<input id="saShadowColor" type="color"></label>
              <label>不透明度<input id="saShadowOpacity" type="range" min="0" max="1" step="0.05"></label>
              <div class="sa-grid2"><label>模糊<input id="saShadowBlur" type="number" min="0" step="0.5"></label><label>水平傾斜<input id="saShadowSkew" type="number" step="0.05"></label></div>
              <div class="sa-grid2"><label>垂直縮放<input id="saShadowScaleY" type="number" step="0.05"></label><label>X 位移<input id="saShadowX" type="number" step="1"></label></div>
              <label>Y 位移<input id="saShadowY" type="number" step="1"></label>
              <p id="saShadowWarning" class="sa-hint"></p>
            </div></details>
          </aside>
        </div>
        <footer class="sa-footer"><span id="saStatus"></span><button id="saReset" class="sa-danger">還原素材</button><button data-close>取消</button><button id="saApply">套用</button><button id="saApplyClose" class="sa-primary">套用並關閉</button></footer>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', cancelAndClose));
    $('saApply').addEventListener('click', () => save(false));
    $('saApplyClose').addEventListener('click', () => save(true));
    $('saReset').addEventListener('click', async () => { if (editing) await resetAsset(editing.productKey, editing.productLayer, true); });
    $('saZoomOut').addEventListener('click', () => setZoom(uiState.zoom - .1));
    $('saZoomIn').addEventListener('click', () => setZoom(uiState.zoom + .1));
    $('saShowGuide').addEventListener('change', event => { uiState.showGuide = event.target.checked; renderWorkspace(); });
    $('saShowTextBoxes').addEventListener('change', event => { uiState.showTextBoxes = event.target.checked; renderWorkspace(); });
    $('saSnap').addEventListener('change', event => { uiState.snap = event.target.checked; });
    ['saX','saY','saW','saH','saRotation','saAlign'].forEach(id => $(id).addEventListener('input', applyInspector));
    ['saShadowEnabled','saShadowColor','saShadowOpacity','saShadowBlur','saShadowSkew','saShadowScaleY','saShadowX','saShadowY'].forEach(id => $(id).addEventListener('input', applyShadowInputs));
    const canvas = $('saCanvas');
    canvas.addEventListener('pointerdown', onStagePointerDown);
    // Keep move/up on window so transforms continue when the pointer leaves the object or canvas.
    window.addEventListener('pointermove', onStagePointerMove, { passive: false });
    window.addEventListener('pointerup', onStagePointerUp);
    window.addEventListener('pointercancel', onStagePointerUp);
    canvas.addEventListener('wheel', onStageWheel, { passive: false });
    window.addEventListener('keydown', event => {
      if (!modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') cancelAndClose();
      if ((event.key === 'Delete' || event.key === 'Backspace') && editing?.selectedType === 'shadow') {
        editing.config.shadow.enabled = false; syncShadowFields(); refreshPreview();
      }
    });
  }

  function toast(message) {
    const el = $('saToast'); el.textContent = message; el.classList.add('is-open');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('is-open'), 1800);
  }
  function setZoom(value) {
    uiState.zoom = Math.min(2.5, Math.max(.25, Math.round(value * 10) / 10));
    $('saZoomLabel').textContent = `${Math.round(uiState.zoom * 100)}%`;
    updateCanvasCssSize();
  }
  function updateCanvasCssSize() {
    if (!editing) return;
    const canvas = $('saCanvas');
    canvas.style.width = `${editing.template.canvas.width * uiState.zoom}px`;
    canvas.style.height = `${editing.template.canvas.height * uiState.zoom}px`;
  }
  function componentItems() {
    if (!editing) return [];
    const items = [{ type: 'product', key: editing.productKey, label: '商品圖', icon: '◩' }];
    items.push({ type: 'shadow', key: shadowKey(editing.productKey), label: '商品陰影', icon: '◒' });
    priceEntries(editing.template).forEach(([key, layer], index) => items.push({ type: 'price', key, slot: String(layer.priceSlot || layer.slot || index + 1), label: layer.psdName || `價格 ${index + 1}`, icon: 'T' }));
    return items;
  }
  function renderComponents() {
    $('saComponents').innerHTML = componentItems().map(item => `<button class="sa-component ${editing.selectedKey === item.key ? 'is-active' : ''}" data-key="${escapeHtml(item.key)}" data-type="${item.type}"><span>${item.icon}</span><strong>${escapeHtml(item.label)}</strong></button>`).join('');
    $('saComponents').querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectComponent(button.dataset.key, button.dataset.type)));
  }
  function renderUsages() {
    const usages = linkedUsageEntriesFor(editing.template, editing.productKey, editing.assetId);
    $('saUsageCount').textContent = usages.length;
    $('saUsageList').innerHTML = usages.map(entry => `<button class="sa-usage ${entry.index === editing.currentIndex ? 'is-active' : ''}" data-index="${entry.index}"><strong>${escapeHtml(entry.item?.name || entry.template?.templateId || `版位 ${entry.index + 1}`)}</strong><small>${entry.template?.canvas?.width || 0} × ${entry.template?.canvas?.height || 0}</small></button>`).join('') || '<p class="sa-empty">目前主畫面版位</p>';
    $('saUsageList').querySelectorAll('button').forEach(button => button.addEventListener('click', () => switchUsage(number(button.dataset.index))));
  }
  function selectComponent(key, type) {
    editing.selectedKey = key; editing.selectedType = type;
    renderComponents(); syncInspector(); renderWorkspace();
  }
  function selectedLayer() {
    if (!editing) return null;
    if (editing.selectedType === 'shadow') return editing.template.layers?.[shadowKey(editing.productKey)] || null;
    return editing.template.layers?.[editing.selectedKey] || null;
  }
  function selectedBox() {
    const layer = selectedLayer();
    if (!layer) return null;
    return window.Geometry.getLayerBox(editing.selectedKey, layer);
  }
  function syncInspector() {
    if (!editing) return;
    const layer = selectedLayer();
    const box = selectedBox();
    const isPrice = editing.selectedType === 'price';
    const isShadowType = editing.selectedType === 'shadow';
    $('saSelectedName').textContent = isShadowType ? '商品陰影' : (layer?.psdName || (editing.selectedType === 'product' ? '商品圖' : '價格'));
    $('saTextPanel').hidden = !isPrice;
    $('saShadowPanel').hidden = !(editing.selectedType === 'product' || isShadowType);
    ['saX','saY','saW','saH','saRotation'].forEach(id => $(id).disabled = !box || isShadowType);
    if (box) {
      $('saX').value = Math.round(box.x * 100) / 100; $('saY').value = Math.round(box.y * 100) / 100;
      $('saW').value = Math.round(box.width * 100) / 100; $('saH').value = Math.round(box.height * 100) / 100;
      $('saRotation').value = number(layer.rotation);
    }
    if (isPrice) {
      $('saAlign').value = layer.align || 'center';
      $('saTextWarning').textContent = layer.smartTextWarning ? '⚠ 目前文字已接近可讀性下限。' : '文字會在文字框內自動使用最大可用字級。';
    }
    syncShadowFields();
  }
  function syncShadowFields() {
    if (!editing) return;
    const shadow = editing.config.shadow;
    $('saShadowEnabled').checked = !!shadow.enabled; $('saShadowColor').value = shadow.color || '#901e0e';
    $('saShadowOpacity').value = number(shadow.opacity, .8); $('saShadowBlur').value = number(shadow.blur, 3);
    $('saShadowSkew').value = number(shadow.skewX, -.5); $('saShadowScaleY').value = number(shadow.scaleY, .45);
    $('saShadowX').value = number(shadow.offsetX); $('saShadowY').value = number(shadow.offsetY, 2);
    const image = editing.images?.[editing.productKey];
    $('saShadowWarning').textContent = image && !window.ProductShadowEngine?.hasTransparency(image) ? '⚠ 此圖片沒有透明背景，無法依商品輪廓產生陰影。' : '陰影會依各版位實際商品尺寸重新生成。';
  }
  function applyInspector() {
    if (!editing || editing.selectedType === 'shadow') return;
    const layer = selectedLayer(); if (!layer) return;
    const previousBox = window.Geometry.getLayerBox(editing.selectedKey, layer);
    const typography = editing.selectedType === 'price'
      ? window.PriceTransformEngine?.captureTypographyState?.(layer)
      : null;
    const box = { x: number($('saX').value), y: number($('saY').value), width: Math.max(1, number($('saW').value, 1)), height: Math.max(1, number($('saH').value, 1)) };
    window.NetworkSmartObjectSync?.begin?.(editing.template, editing.selectedKey, { attachHistory: false });
    window.Geometry.applyBox(editing.selectedKey, layer, box, { template: editing.template });
    layer.rotation = number($('saRotation').value);
    window.PriceTransformEngine?.handleLayerRotationApplied?.(editing.selectedKey, layer, editing.template);
    if (editing.selectedType === 'price' && typography && previousBox.width > 0 && Math.abs(box.width - previousBox.width) > 0.01) {
      window.PriceTransformEngine?.applyTypographyScale?.(layer, typography, box.width / previousBox.width);
    }
    if (editing.selectedType === 'price') {
      window.PriceTransformEngine?.captureManualPriceTransform?.(editing.selectedKey, layer, editing.template, { rebase: true });
    }
    window.NetworkSmartObjectSync?.update?.(editing.template, editing.selectedKey);
    window.NetworkSmartObjectSync?.finish?.(editing.template, editing.selectedKey);
    if (editing.selectedType === 'price') layer.align = $('saAlign').value;
    captureCurrentBoxes(); refreshPreview();
  }
  function applyShadowInputs() {
    if (!editing) return;
    Object.assign(editing.config.shadow, {
      enabled: $('saShadowEnabled').checked, color: $('saShadowColor').value, opacity: number($('saShadowOpacity').value, .8),
      blur: number($('saShadowBlur').value, 3), skewX: number($('saShadowSkew').value, -.5), scaleY: number($('saShadowScaleY').value, .45),
      offsetX: number($('saShadowX').value), offsetY: number($('saShadowY').value, 2)
    });
    refreshPreview();
  }
  function captureCurrentBoxes() {
    if (!editing?.template) return;
    editing.config = captureConfig(editing.template, editing.config || {});
    editing.template.smartAssetConfig = clone(editing.config);
  }

  function withEditingContext(callback) {
    const state = window.AppState;
    const previous = { template: state.template, images: state.images, selectedLayers: state.selectedLayers };
    state.template = editing.template; state.images = editing.images; state.selectedLayers = [];
    try { return callback(); } finally { state.template = previous.template; state.images = previous.images; state.selectedLayers = previous.selectedLayers; }
  }
  function drawGuide(ctx, box, color, dash = [8, 5]) {
    if (!box) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, 1 / uiState.zoom); ctx.setLineDash(dash); ctx.strokeRect(box.x, box.y, box.width, box.height); ctx.restore();
  }
  function drawSelection(ctx) {
    const box = selectedBox(); if (!box) return;
    const layer = selectedLayer();
    ctx.save(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = Math.max(1.5, 2 / uiState.zoom); ctx.setLineDash([]); ctx.strokeRect(box.x, box.y, box.width, box.height);
    const handles = stageHandles(box);
    handles.forEach(handle => {
      ctx.beginPath(); ctx.fillStyle = handle.type === 'rotate' ? '#f59e0b' : '#fff'; ctx.strokeStyle = '#2563eb';
      ctx.arc(handle.x, handle.y, 6 / uiState.zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    if (editing.selectedType === 'price' && uiState.showTextBoxes) {
      ctx.fillStyle = 'rgba(59,130,246,.1)'; ctx.fillRect(box.x, box.y, box.width, box.height);
    }
    ctx.restore();
  }
  async function refreshPreview() {
    const request = ++previewRequest;
    captureCurrentBoxes();
    removeShadow(editing.template, editing.images);
    try { await ensureShadow(editing.template, editing.images, editing.config); } catch (error) { console.warn('[SmartAsset] 預覽陰影失敗', error); }
    if (request !== previewRequest) return;
    renderWorkspace(); syncInspector(); renderComponents();
  }
  function renderWorkspace() {
    if (!editing) return;
    const canvas = $('saCanvas');
    const targetWidth = editing.template.canvas.width;
    const targetHeight = editing.template.canvas.height;
    // Do not reset the canvas bitmap while a pointer transform is active.
    // Assigning width/height releases pointer capture in some browsers and made dragging stop after selection.
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;
    updateCanvasCssSize();
    const ctx = canvas.getContext('2d');
    window.Renderer.renderSceneTo(ctx, editing.template, editing.images, { readOnly: true });
    if (uiState.showGuide) {
      const guide = guideEntry(editing.template);
      if (guide) drawGuide(ctx, window.Geometry.getLayerBox(guide[0], guide[1]), '#22c55e');
      ctx.save(); ctx.strokeStyle = 'rgba(14,165,233,.45)'; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(editing.template.canvas.width / 2, 0); ctx.lineTo(editing.template.canvas.width / 2, editing.template.canvas.height); ctx.moveTo(0, editing.template.canvas.height / 2); ctx.lineTo(editing.template.canvas.width, editing.template.canvas.height / 2); ctx.stroke(); ctx.restore();
    }
    drawSelection(ctx);
    $('saStatus').textContent = `${editing.template.canvas.width} × ${editing.template.canvas.height}｜P 範圍相對座標｜${linkedUsageEntriesFor(editing.template, editing.productKey, editing.assetId).length || 1} 個連動版位`;
  }

  function canvasPoint(event) {
    const rect = $('saCanvas').getBoundingClientRect();
    return { x: (event.clientX - rect.left) * ($('saCanvas').width / rect.width), y: (event.clientY - rect.top) * ($('saCanvas').height / rect.height) };
  }
  function stageHandles(box) {
    return [
      { type: 'nw', x: box.x, y: box.y }, { type: 'ne', x: box.x + box.width, y: box.y },
      { type: 'sw', x: box.x, y: box.y + box.height }, { type: 'se', x: box.x + box.width, y: box.y + box.height },
      { type: 'rotate', x: box.x + box.width, y: box.y - 28 / uiState.zoom }
    ];
  }
  function hitHandle(point, box) {
    const radius = 12 / uiState.zoom;
    return stageHandles(box).find(handle => Math.hypot(point.x - handle.x, point.y - handle.y) <= radius) || null;
  }
  function hitComponent(point) {
    const items = componentItems().filter(item => item.type !== 'shadow');
    return items.reverse().find(item => {
      const layer = editing.template.layers[item.key]; if (!layer || layer.hidden) return false;
      const box = window.Geometry.getLayerBox(item.key, layer);
      return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
    }) || null;
  }
  function snapBox(box) {
    if (!uiState.snap || dragState?.altKey) return box;
    const threshold = 7 / uiState.zoom;
    const template = editing.template;
    const guide = guideEntry(template);
    const targetsX = [template.canvas.width / 2];
    const targetsY = [template.canvas.height / 2];
    if (guide) {
      const g = window.Geometry.getLayerBox(guide[0], guide[1]);
      targetsX.push(g.x, g.x + g.width / 2, g.x + g.width);
      targetsY.push(g.y, g.y + g.height / 2, g.y + g.height);
    }
    const anchorsX = [box.x, box.x + box.width / 2, box.x + box.width];
    const anchorsY = [box.y, box.y + box.height / 2, box.y + box.height];
    let x = box.x, y = box.y;
    outerX: for (const target of targetsX) for (let i = 0; i < anchorsX.length; i++) if (Math.abs(anchorsX[i] - target) <= threshold) { x += target - anchorsX[i]; break outerX; }
    outerY: for (const target of targetsY) for (let i = 0; i < anchorsY.length; i++) if (Math.abs(anchorsY[i] - target) <= threshold) { y += target - anchorsY[i]; break outerY; }
    return { ...box, x, y };
  }
  function onStagePointerDown(event) {
    if (!editing) return;
    const point = canvasPoint(event);
    const box = selectedBox();
    const handle = box && editing.selectedType !== 'shadow' ? hitHandle(point, box) : null;
    if (handle) {
      dragState = {
        mode: handle.type === 'rotate' ? 'rotate' : 'resize',
        handle: handle.type,
        start: point,
        box: clone(box),
        rotation: number(selectedLayer()?.rotation),
        typography: editing.selectedType === 'price'
          ? window.PriceTransformEngine?.captureTypographyState?.(selectedLayer())
          : null,
        altKey: event.altKey,
      };
    } else {
      const hit = hitComponent(point);
      if (hit) { selectComponent(hit.key, hit.type); const hitBox = selectedBox(); dragState = { mode: 'move', start: point, box: clone(hitBox), altKey: event.altKey }; }
      else return;
    }
    if (editing.selectedType === 'product') {
      const productBox = window.Geometry.getLayerBox(editing.productKey, editing.productLayer);
      const productRotation = number(editing.productLayer.rotation);
      editing.groupSession = smartProductMemberEntries(editing.template, editing.productKey)
        .filter(([, , type]) => type !== 'product')
        .map(([key, layer, type]) => ({ key, type, local: childToLocal(window.Geometry.getLayerBox(key, layer), layer, productBox, productRotation) }));
    } else editing.groupSession = null;
    window.NetworkSmartObjectSync?.begin?.(editing.template, editing.selectedKey, { attachHistory: false });
    dragState.pointerId = event.pointerId;
    try { $('saCanvas').setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
  }
  function onStagePointerMove(event) {
    if (!dragState || !editing || (dragState.pointerId != null && event.pointerId !== dragState.pointerId)) return;
    const point = canvasPoint(event); const layer = selectedLayer(); if (!layer) return;
    const dx = point.x - dragState.start.x, dy = point.y - dragState.start.y;
    if (dragState.mode === 'move') {
      window.Geometry.applyBox(editing.selectedKey, layer, snapBox({ ...dragState.box, x: dragState.box.x + dx, y: dragState.box.y + dy }), { template: editing.template });
    } else if (dragState.mode === 'resize') {
      let { x, y, width, height } = dragState.box;
      if (dragState.handle.includes('e')) width = Math.max(8, dragState.box.width + dx);
      if (dragState.handle.includes('s')) height = Math.max(8, dragState.box.height + dy);
      if (dragState.handle.includes('w')) { x = dragState.box.x + dx; width = Math.max(8, dragState.box.width - dx); }
      if (dragState.handle.includes('n')) { y = dragState.box.y + dy; height = Math.max(8, dragState.box.height - dy); }
      if (event.shiftKey || editing.selectedType === 'product' || editing.selectedType === 'price') {
        const ratio = dragState.box.width / Math.max(1, dragState.box.height);
        if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio; else width = height * ratio;
      }
      window.Geometry.applyBox(editing.selectedKey, layer, { x, y, width, height }, { template: editing.template });
      if (editing.selectedType === 'price' && dragState.typography && dragState.box.width > 0) {
        window.PriceTransformEngine?.applyTypographyScale?.(layer, dragState.typography, width / dragState.box.width);
        window.PriceTransformEngine?.captureManualPriceTransform?.(editing.selectedKey, layer, editing.template);
      }
    } else if (dragState.mode === 'rotate') {
      const center = { x: dragState.box.x + dragState.box.width / 2, y: dragState.box.y + dragState.box.height / 2 };
      layer.rotation = Math.round(Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI + 90);
      window.PriceTransformEngine?.handleLayerRotationApplied?.(editing.selectedKey, layer, editing.template);
    }
    if (editing.selectedType === 'product' && editing.groupSession) {
      const productBox = window.Geometry.getLayerBox(editing.productKey, editing.productLayer);
      const productRotation = number(editing.productLayer.rotation);
      editing.groupSession.forEach(({ key, type, local }) => {
        const child = editing.template.layers?.[key];
        if (!child) return;
        applyLocalMemberTransform(editing.template, key, child, type, local, productBox, productRotation);
      });
    }
    window.NetworkSmartObjectSync?.update?.(editing.template, editing.selectedKey);
    captureCurrentBoxes(); renderWorkspace(); syncInspector(); event.preventDefault();
  }
  function onStagePointerUp(event) {
    if (!dragState || (dragState.pointerId != null && event.pointerId !== dragState.pointerId)) return;
    const pointerId = dragState.pointerId;
    const selectedKey = editing?.selectedKey;
    if (editing && selectedKey) {
      const layer = editing.template?.layers?.[selectedKey];
      if (layer?.source === 'auto_price_v2') {
        window.PriceTransformEngine?.handleLayerRotationApplied?.(selectedKey, layer, editing.template);
        window.PriceTransformEngine?.captureManualPriceTransform?.(selectedKey, layer, editing.template, { rebase: true });
      }
      window.NetworkSmartObjectSync?.finish?.(editing.template, selectedKey);
    }
    dragState = null;
    if (editing) editing.groupSession = null;
    refreshPreview();
    try { $('saCanvas').releasePointerCapture(pointerId); } catch (_) {}
  }
  function onStageWheel(event) {
    if (!editing || editing.selectedType === 'shadow') return;
    event.preventDefault();
    const layer = selectedLayer(), box = selectedBox(); if (!layer || !box) return;
    const factor = event.deltaY < 0 ? 1.04 : .96;
    const next = { width: Math.max(8, box.width * factor), height: Math.max(8, box.height * factor) };
    next.x = box.x + (box.width - next.width) / 2; next.y = box.y + (box.height - next.height) / 2;
    const group = editing.selectedType === 'product'
      ? smartProductMemberEntries(editing.template, editing.productKey).filter(([, , type]) => type !== 'product').map(([key, child, type]) => ({ key, type, local: childToLocal(window.Geometry.getLayerBox(key, child), child, box, number(layer.rotation)) }))
      : null;
    const typography = editing.selectedType === 'price'
      ? window.PriceTransformEngine?.captureTypographyState?.(layer)
      : null;
    window.NetworkSmartObjectSync?.begin?.(editing.template, editing.selectedKey, { attachHistory: false });
    window.Geometry.applyBox(editing.selectedKey, layer, next, { template: editing.template });
    if (editing.selectedType === 'price' && typography) {
      window.PriceTransformEngine?.applyTypographyScale?.(layer, typography, factor);
      window.PriceTransformEngine?.captureManualPriceTransform?.(editing.selectedKey, layer, editing.template, { rebase: true });
    }
    if (group) {
      const productRotation = number(layer.rotation);
      group.forEach(({ key, type, local }) => {
        const child = editing.template.layers?.[key]; if (!child) return;
        applyLocalMemberTransform(editing.template, key, child, type, local, next, productRotation);
      });
    }
    window.NetworkSmartObjectSync?.update?.(editing.template, editing.selectedKey);
    window.NetworkSmartObjectSync?.finish?.(editing.template, editing.selectedKey);
    captureCurrentBoxes(); renderWorkspace(); syncInspector();
    clearTimeout(onStageWheel.timer); onStageWheel.timer = setTimeout(refreshPreview, 100);
  }

  async function imagesForTemplate(template, item) {
    return window.TemplateLoader.loadImagesForTemplate(template, { project: item?.project || template?.batchProject || '' });
  }
  function getWorkingUsage(index) {
    if (!editing) return null;
    if (!editing.workingCopies.has(index)) {
      const entry = window.AppState?.templates?.[index];
      const formal = entry?.data || entry;
      if (!formal) return null;
      editing.workingCopies.set(index, clone(formal));
    }
    return editing.workingCopies.get(index);
  }
  async function switchUsage(index) {
    if (!editing) return;
    captureCurrentBoxes();
    const usage = linkedUsageEntriesFor(editing.template, editing.productKey, editing.assetId).find((entry) => entry.index === index);
    if (!usage) return;
    const working = getWorkingUsage(index);
    if (!working) return;
    const product = working.layers?.[usage.productKey]
      ? [usage.productKey, working.layers[usage.productKey]]
      : productEntry(working);
    if (!product) return;
    editing.currentIndex = index;
    editing.template = working;
    editing.item = usage.item;
    editing.productKey = product[0];
    editing.productLayer = product[1];
    editing.config = captureConfig(working, working.smartAssetConfig || editing.config || {});
    editing.images = await imagesForTemplate(working, usage.item);
    editing.selectedKey = editing.productKey;
    editing.selectedType = 'product';
    renderUsages(); renderComponents(); syncInspector(); await refreshPreview();
    toast(`已切換至 ${usage.item?.name || '版位'}（預覽工作副本）`);
  }

  async function refreshCommittedIndexes(indexes) {
    const list = [...new Set(indexes || [])];
    if (!list.length) return;
    await window.BatchManager?.refreshPreviewIndexes?.(list, { showProgress: false });
    if (list.includes(window.AppState?.activeIndex)) {
      await window.TemplateLoader?.loadImagesForActiveTemplate?.();
      window.Renderer?.render?.(); window.LayerManager?.render?.(); window.Inspector?.render?.();
    }
  }

  async function save(close) {
    if (!editing) return;
    captureCurrentBoxes();
    const index = editing.currentIndex;
    const entry = window.AppState?.templates?.[index];
    const formal = entry?.data || entry;
    if (!formal) return;
    const before = clone(formal);
    const smartStateBefore = snapshotSession();
    const working = clone(editing.template);
    const product = working.layers?.[editing.productKey]
      ? [editing.productKey, working.layers[editing.productKey]]
      : productEntry(working);
    if (!product) { toast('找不到商品圖層，未套用'); return; }

    // Preflight 必須先跑完，才能動正式 Template（決策 84/85）。
    const assetId = getLayerAssetId(working, product[0], product[1]);
    try { preflightSmartSync(assetId, formal, product[0]); }
    catch (error) { console.error(error); toast(`套用失敗：${error.message || error}`); return; }

    window.HistoryManager?.pushSnapshot?.(before, index, 'smart-asset');
    overwriteTemplate(formal, working);
    if (index === window.AppState.activeIndex) window.AppState.template = formal;
    let result;
    try {
      result = syncFromSource(assetId, formal, product[0], { sourceBefore: before });
      window.HistoryManager?.attachSmartAssetState?.(smartStateBefore);
    } catch (error) {
      overwriteTemplate(formal, before);
      restoreSession(smartStateBefore);
      const history = window.AppState?.history;
      if (Array.isArray(history) && history.length) history.pop();
      console.error('[SmartAsset] Apply Rollback', error);
      toast(`套用失敗，已完整還原：${error.message || error}`);
      return;
    }

    // Apply = Commit + 新 checkpoint（決策 94）。
    editing.assetId = resolveCanonical(assetId);
    editing.checkpointSnapshots = new Map(linkedUsageEntriesFor(editing.template, editing.productKey, editing.assetId).map(({ index: usageIndex, template }) => [usageIndex, clone(template)]));
    editing.workingCopies = new Map();
    const refreshedWorking = getWorkingUsage(index);
    editing.template = refreshedWorking;
    editing.item = entry;
    editing.productKey = product[0];
    editing.productLayer = refreshedWorking.layers?.[product[0]] || productEntry(refreshedWorking)?.[1];
    editing.config = captureConfig(refreshedWorking, refreshedWorking.smartAssetConfig || {});
    editing.images = await imagesForTemplate(refreshedWorking, entry);
    await refreshCommittedIndexes(result?.affected || [index]);
    renderUsages(); renderComponents(); syncInspector(); renderWorkspace();
    toast(result?.warnings?.length ? `已套用；${result.warnings.length} 項價格幾何不相容已略過` : '已套用素材設定');
    if (close) closeWorkspace();
  }
  function cancelAndClose() {
    // Working Copy 從未直接寫正式 Template；取消只需丟棄尚未 Commit 的工作副本。
    if (!editing) return closeWorkspace();
    closeWorkspace();
  }

  function closeWorkspace() { $('smartAssetWorkspace')?.classList.remove('is-open'); editing = null; dragState = null; }

  function resetSmartAssetGeometry(template, productKey) {
    if (!template || !productKey) return false;
    const engine = window.WarmupPlacementPresetEngine;
    if (!engine?.hasPreset?.(template, template.batchRecord || {})) return false;
    const temp = clone(template);
    if (!engine.reset(temp, temp.batchRecord || {})) return false;
    const memberKeys = smartProductMemberEntries(template, productKey).map(([memberKey]) => memberKey);
    memberKeys.forEach((memberKey) => {
      if (!temp.layers?.[memberKey] || !template.layers?.[memberKey]) return;
      template.layers[memberKey] = clone(temp.layers[memberKey]);
    });
    // generated shadow 不是 Preset 正式圖層，還原時清掉，之後依目前 shadow config 再預覽生成。
    removeShadow(template);
    const productLayer = template.layers?.[productKey];
    if (productLayer) {
      delete productLayer.__smartAssetBaseline;
      ensureProductBaseline(template, productKey, productLayer);
    }
    return true;
  }

  async function resetLinkedSmartAssetGroup(template, productKey, options = {}) {
    const productLayer = template?.layers?.[productKey];
    if (!template || !productKey || !productLayer) return { restored: false, count: 0, indexes: [], warnings: [] };
    const assetId = getLayerAssetId(template, productKey, productLayer);
    if (!assetId) return { restored: false, count: 0, indexes: [], warnings: [] };
    const usages = linkedUsageEntriesFor(template, productKey, assetId);
    if (!usages.length) return { restored: false, count: 0, indexes: [], warnings: [] };

    const snapshots = new Map();
    usages.forEach(({ index, template: usageTemplate }) => {
      if (!snapshots.has(index)) snapshots.set(index, clone(usageTemplate));
    });
    const smartBefore = snapshotSession();
    const activeIndex = indexOfTemplate(template)?.[0];
    const attachHistory = options.attachHistory !== false;
    if (attachHistory && Number.isInteger(activeIndex) && snapshots.has(activeIndex)) {
      window.HistoryManager?.pushSnapshot?.(snapshots.get(activeIndex), activeIndex, 'reset-smart-asset-group');
    }

    const warnings = [];
    try {
      let count = 0;
      usages.forEach(({ template: usageTemplate, productKey: usageProductKey, linkMode, linkWarning }) => {
        if (!resetSmartAssetGeometry(usageTemplate, usageProductKey)) {
          throw new Error(`${usageTemplate?.templateId || usageTemplate?.name || '未知版位'}：找不到 Preset，無法安全還原 Link Group`);
        }
        if (linkWarning) warnings.push(`${usageTemplate.templateId || usageTemplate.name || '版位'}：${linkWarning}`);
        count += 1;
      });
      const transformKey = smartTransformLinkKey(template, productKey, productLayer);
      if (transformKey) registry.delete(transformKey);

      if (attachHistory) {
        const extras = [...snapshots.entries()]
          .filter(([index]) => index !== activeIndex)
          .map(([index, data]) => ({ index, data }));
        window.HistoryManager?.attachExtra?.(extras.length ? extras : null);
        window.HistoryManager?.attachSmartAssetState?.(smartBefore);
      }

      const indexes = [...new Set(usages.map(({ index }) => index))];
      if (template === window.AppState.template) {
        window.AppState.images = await window.TemplateLoader.loadImagesForTemplate(template, { project: template.batchProject || '' });
      }
      if (window.AppState.batchMode) await window.BatchManager?.refreshPreviewIndexes?.(indexes, { showProgress: false });
      return { restored: count > 0, count, indexes, warnings };
    } catch (error) {
      snapshots.forEach((snapshot, index) => {
        const entry = window.AppState?.templates?.[index];
        const target = entry?.data || entry;
        overwriteTemplate(target, snapshot);
        if (index === window.AppState?.activeIndex) window.AppState.template = target;
      });
      restoreSession(smartBefore);
      if (attachHistory && Array.isArray(window.AppState?.history) && window.AppState.history.length) window.AppState.history.pop();
      throw error;
    }
  }

  async function resetAsset(key, layer, keepOpen = false) {
    const template = keepOpen && editing ? editing.template : window.AppState.template;
    if (template?.batchRecord?.__network && template.__renderModel) {
      const targetKey = key || editing?.selectedKey || editing?.productKey;
      const targetLayer = template.layers?.[targetKey] || layer;
      if (window.NetworkSmartObjectSync?.isEligible?.(targetKey, targetLayer, template)) {
        const attachHistory = !keepOpen && template === window.AppState.template;
        if (attachHistory) window.HistoryManager?.push?.();
        const result = await window.NetworkSmartObjectSync.restoreGroup(template, targetKey, { attachHistory });
        const images = template === window.AppState.template
          ? window.AppState.images
          : await window.TemplateLoader.loadImagesForTemplate(template, { project: template.batchProject || 'affiliate' });
        if (keepOpen && editing) {
          editing.template = template;
          editing.productKey = targetKey;
          editing.productLayer = template.layers?.[targetKey] || targetLayer;
          editing.selectedKey = targetKey;
          editing.selectedType = 'product';
          editing.images = images;
          editing.config = captureConfig(template, {});
          renderComponents();
          syncInspector();
          await refreshPreview();
          toast(result.count > 1 ? `已一起還原 ${result.count} 個同素材圖層` : '已還原素材');
        } else {
          window.Renderer.render();
          window.LayerManager.render();
          window.Inspector.render();
          toastGlobal(result.count > 1 ? `已一起還原 ${result.count} 個同素材圖層` : '已還原素材');
        }
        return;
      }

      const initial = clone(template.__renderModel);
      Object.keys(template).forEach((field) => delete template[field]);
      Object.assign(template, initial);
      template.__renderModel = clone(initial);
      template.__renderState = { initialized: true, source: 'live-template' };
      const images = await window.TemplateLoader.loadImagesForTemplate(template, {
        project: template.batchProject || 'affiliate',
      });
      if (template === window.AppState.template) window.AppState.images = images;
      if (keepOpen && editing) {
        editing.template = template;
        editing.images = images;
        editing.config = captureConfig(template, {});
        renderComponents();
        syncInspector();
        await refreshPreview();
        toast('已還原素材');
      } else {
        window.Renderer.render();
        window.LayerManager.render();
        window.Inspector.render();
        if (window.AppState.batchMode) await window.BatchManager?.refreshPreviewIndexes?.(indexOfTemplate(template), { showProgress: false });
        toastGlobal('已還原素材');
      }
      return;
    }
    const targetKey = key || editing?.productKey || productEntry(template)?.[0];
    if (!template || !targetKey) return;
    if (keepOpen && editing) {
      const ok = resetSmartAssetGeometry(template, targetKey);
      if (!ok) { toast('找不到此公版的 Preset，無法安全還原素材'); return; }
      editing.productLayer = template.layers?.[targetKey] || editing.productLayer;
      editing.selectedKey = targetKey;
      editing.selectedType = 'product';
      editing.config = captureConfig(template, template.smartAssetConfig || {});
      editing.images = await imagesForTemplate(template, editing.item);
      syncShadowFields(); renderComponents(); syncInspector(); await refreshPreview(); toast('已還原工作副本；按「套用」後會同步還原整個 Link Group');
      return;
    }
    try {
      const result = await resetLinkedSmartAssetGroup(template, targetKey, { attachHistory: true });
      if (!result.restored) { toastGlobal('找不到此 Link Group 的 Preset，無法安全還原素材'); return; }
      if (template === window.AppState.template) {
        window.Renderer.render(); window.LayerManager.render(); window.Inspector.render();
      }
      if (result.warnings?.length) console.warn('[SmartAsset] 還原 Link Group 提示\n' + result.warnings.join('\n'));
      toastGlobal(result.count > 1 ? `已一起還原 ${result.count} 個連動版位` : '已還原素材');
    } catch (error) {
      console.error('[SmartAsset] Link Group 還原失敗，已完整 Rollback', error);
      toastGlobal(`還原失敗：${error.message || error}`);
    }
  }

  function toastGlobal(message) {
    let el = $('smartAssetGlobalToast');
    if (!el) { el = document.createElement('div'); el.id = 'smartAssetGlobalToast'; el.className = 'sa-global-toast'; document.body.appendChild(el); }
    el.textContent = `✓ ${message}`; el.classList.add('is-open'); clearTimeout(toastGlobal.timer); toastGlobal.timer = setTimeout(() => el.classList.remove('is-open'), 1800);
  }

  async function open(key, layer) {
    ensureUI();
    const formal = window.AppState.template;
    if (!formal) return;
    const index = window.AppState.activeIndex;
    const selectedProduct = isProduct(key, layer) ? [key, layer] : productEntry(formal);
    if (!selectedProduct) return;
    const assetId = getLayerAssetId(formal, selectedProduct[0], selectedProduct[1]);
    if (!assetId) { toastGlobal('此商品尚未解析到有效素材來源'); return; }
    let usages;
    try { usages = preflightSmartSync(assetId, formal, selectedProduct[0]); }
    catch (error) { toastGlobal(error.message || String(error)); return; }
    const working = clone(formal);
    const workingProduct = working.layers?.[selectedProduct[0]] || productEntry(working)?.[1];
    const workingTransformKey = smartTransformLinkKey(working, selectedProduct[0], workingProduct);
    const existing = (workingTransformKey ? registry.get(workingTransformKey) : null) || working.smartAssetConfig || {};
    const config = captureConfig(working, existing);
    editing = {
      assetId: resolveCanonical(assetId),
      currentIndex: index,
      template: working,
      item: window.AppState.templates?.[index],
      images: await imagesForTemplate(working, window.AppState.templates?.[index]),
      productKey: selectedProduct[0],
      productLayer: workingProduct,
      config,
      selectedKey: selectedProduct[0], selectedType: 'product',
      workingCopies: new Map([[index, working]]),
      checkpointSnapshots: new Map(usages.map(({ index: usageIndex, template }) => [usageIndex, clone(template)])),
    };
    $('saAssetName').textContent = `｜${selectedProduct[1].assetFilename?.split('/').pop() || selectedProduct[1].psdName || '商品素材'}`;
    $('smartAssetWorkspace').classList.add('is-open');
    setZoom(Math.min(1, Math.max(.35, Math.min(900 / working.canvas.width, 700 / working.canvas.height))));
    renderComponents(); renderUsages(); syncInspector(); await refreshPreview();
  }

  function bind() {
    patchLoader();
  }
  function waitForApp() {
    if (window.AppState && window.TemplateLoader && window.Renderer && window.Geometry && window.LayerManager) bind();
    else setTimeout(waitForApp, 50);
  }

  window.SmartAssetManager = {
    registry, aliases, makeAssetId, getAssetId, resolveCanonical, mergeGroups, resetSession, snapshotSession, restoreSession,
    isPlacementGuide, isProduct, ownsLayer, applyTemplate, ensureShadow, open, resetAsset,
    beginMainCanvasTransform, updateMainCanvasTransform, finishMainCanvasTransform, smartProductMemberEntries,
    getSyncMode, productEntries, savePlacementConfig, applyPlacementConfig, layoutProductGrid,
    syncPriceTextFromMainCanvas, syncFromSource, usageEntries, changeLogicalAsset, resolveLogicalAssetMapping,
    smartTransformLinkSignature, smartTransformLinkKey, compareSmartTransformSignatures,
    isTransformActive, isProductTransformActive, markActiveThumbStale,
  };

  waitForApp();
})();
