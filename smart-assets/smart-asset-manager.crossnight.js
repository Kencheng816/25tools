(() => {
  'use strict';

  const GUIDE_NAMES = new Set(['P_範圍', '_P_範圍']);
  const SHADOW_PREFIX = '__smart_product_shadow__';
  // Smart Object 狀態只存在目前 Session，不寫 localStorage。重新整理或重新產生工單時必須從公版/Rule 初始值重新開始。
  const registry = new Map();
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const round2 = value => Math.round(number(value) * 100) / 100;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const normalizeName = value => String(value || '').normalize('NFKC').trim().replace(/\\/g, '/').split('/').pop().replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9一-龥]+/g, '_').replace(/^_+|_+$/g, '');
  const normalizeAssetPath = value => String(value || '').normalize('NFKC').trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/').toLowerCase();
  const basename = value => String(value || '').replace(/\\/g, '/').split('/').pop();
  const resolvedEntryPath = entry => {
    if (!entry) return '';
    const folder = String(entry.folder || '').trim();
    const filename = String(entry.filename || '').trim();
    const parts = String(entry.relativePath || '').replace(/\\/g, '/').split('/').filter(Boolean);
    if (folder) {
      const folderIndex = parts.findIndex((part) => part === folder);
      if (folderIndex >= 0 && parts.length > folderIndex + 1) return parts.slice(folderIndex).join('/');
    }
    return `${folder || '@root'}/${filename}`;
  };

  // 智慧型物件身分依使用者確認的規則：必須是「實際素材路徑 + 檔名」相同才視為同一張素材。
  // TemplateLoader 載圖成功後會寫入 __resolvedAssetFolder / __resolvedAssetFilename / __resolvedAssetPath。
  // 尚未載圖時才以 layer.assetProject + assetFilename 作為暫時 fallback；真正開始互動前通常都已完成載圖。
  const makeAssetId = (filename, context = {}) => {
    const layer = context.layer || null;
    const resolvedPath = layer?.__resolvedAssetPath || context.resolvedPath || '';
    if (resolvedPath) return `asset:${normalizeAssetPath(resolvedPath)}`;
    const resolvedFilename = layer?.__resolvedAssetFilename || basename(filename);
    if (!resolvedFilename) return null;
    const folder = layer?.__resolvedAssetFolder ?? context.folder ?? context.assetProject ?? layer?.assetProject ?? '';
    return `asset:${normalizeAssetPath(`${folder || '@root'}/${resolvedFilename}`)}`;
  };
  const isPlacementGuide = (key, layer) => {
    if (layer?.__placementGuide === true) return true;
    const name = String(layer?.psdName || layer?.name || key || '').trim();
    return GUIDE_NAMES.has(name) || /^_?P_範圍(?:_\d+)?$/i.test(name);
  };
  const isShadow = layer => layer?.generatedEffect === 'product-shadow' || layer?.role === 'product-shadow';
  const isProduct = (key, layer) => !!(layer?.type === 'image' && !isShadow(layer) && !isPlacementGuide(key, layer) && (layer.role === 'product' || /(^|\s|_)p($|\s|_)|商品圖|product/i.test(`${key} ${layer.psdName || ''} ${layer.role || ''}`)));
  const productEntry = template => Object.entries(template?.layers || {}).find(([key, layer]) => isProduct(key, layer) && layer.assetFilename) || null;
  // 抓所有商品 instance（P / P_01 / P_02...）。Smart Object 群組以實際素材 identity 判斷，
  // 不要求來源與目標使用相同 layer key。
  const productEntries = template => Object.entries(template?.layers || {})
    .filter(([key, layer]) => isProduct(key, layer) && layer.assetFilename)
    .sort(([a], [b]) => a.localeCompare(b, 'zh-Hant-u-co-numeric'));
  const priceEntries = template => Object.entries(template?.layers || {}).filter(([, layer]) => layer?.source === 'auto_price_v2');
  const guideEntry = template => Object.entries(template?.layers || {}).find(([key, layer]) => isPlacementGuide(key, layer)) || null;
  const shadowKey = sourceKey => `${SHADOW_PREFIX}${sourceKey}`;
  // V1.7 修正：拿掉自動呼叫 BatchManager.renderPreviewGrid() 的 refreshBatchPreview()。
  // renderPreviewGrid() 會把 AppState.template / activeIndex 暫時輪流指向批次裡每一張縮圖，
  // 整個迴圈跑完（等待每張圖的素材載入）才還原成使用者原本在編輯的版位。在使用者拖曳/點選
  // 互動的當下呼叫這個函式，會讓「目前使用中的公版」在背景被搶去指到別的版位，造成「跳公版」
  // 的異常。跨版位同步後，實際資料（AppState.templates[index].data）已經是正確、最新的；
  // 縮圖影像會在下一次使用者自然觸發預覽重繪時（例如重新整理批次、切換篩選）跟著更新。

  // ── Smart Object Owner 判斷 ──
  // 只要同時具備商品圖與 P_範圍，就由 SmartAssetManager 單獨接管。
  // 有沒有價格都不再分流：價格是商品的 child，商品本身仍使用同一套跨尺寸 Transform Delta。
  // V0.1：已移除 Network 專屬的 __network 早退（該旗標隨 network 規則檔一併刪除，不再有人寫入）。
  function getSyncMode(template) {
    const products = productEntries(template);
    if (!products.length) return null;
    const guide = guideEntry(template);
    if (!guide) return null;
    return 'smart-product';
  }


  function rotateVector(vector, degrees) {
    const rad = number(degrees) * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
  }
  function smartProductMemberEntries(template, productKey = productEntry(template)?.[0]) {
    if (!template || !productKey) return [];
    const items = [];
    const product = template.layers?.[productKey];
    if (product) items.push([productKey, product, 'product']);
    const primaryProductKey = productEntry(template)?.[0];
    priceEntries(template).forEach(([key, layer]) => {
      const anchorKey = String(layer?.anchor?.layerKey || layer?.productLayerKey || '').trim();
      if (anchorKey ? anchorKey === productKey : productKey === primaryProductKey) items.push([key, layer, 'price']);
    });
    Object.entries(template.layers || {}).forEach(([key, layer]) => {
      if (isShadow(layer) && (!layer.sourceLayerKey || layer.sourceLayerKey === productKey)) items.push([key, layer, 'shadow']);
    });
    return items;
  }

  // Smart Object 的幾何運算一律讀 layer 自己保存的 box，不借用 AppState.images。
  // 跨公版時 AppState.images 只屬於目前主畫布，若用 Geometry.getRenderedImageBox 可能拿到另一張 P_01/P_02 圖片比例。
  function layerBox(layer) {
    if (!layer) return { x: 0, y: 0, width: 1, height: 1, centerX: 0.5, centerY: 0.5 };
    const width = Math.max(1, number(layer.width || layer.targetWidth, 1));
    const height = Math.max(1, number(layer.height || layer.targetHeight, 1));

    // P_範圍是 shape/guide。Geometry.applyBox() 在純移動時一定會更新 x/y，
    // 但舊 centerX/centerY 可能仍保留移動前的值；若這裡優先相信 center，
    // Smart Object 會誤判「P_範圍中心沒有移動」，造成只有縮放有效、拖曳無效。
    // 因此 guide 永遠以 live x/y/width/height 為幾何真值重新計算中心。
    const isGuide = isPlacementGuide('', layer);
    const x = number(layer.x);
    const y = number(layer.y);
    const centerX = isGuide
      ? x + width / 2
      : (Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : x + width / 2);
    const centerY = isGuide
      ? y + height / 2
      : (Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) : y + height / 2);
    return { x: centerX - width / 2, y: centerY - height / 2, width, height, centerX, centerY };
  }
  function applyLayerBox(layer, box) {
    if (!layer || !box) return;
    const width = Math.max(1, number(box.width, 1));
    const height = Math.max(1, number(box.height, 1));
    const x = number(box.x);
    const y = number(box.y);
    layer.x = round2(x);
    layer.y = round2(y);
    layer.width = round2(width);
    layer.height = round2(height);
    layer.centerX = round2(x + width / 2);
    layer.centerY = round2(y + height / 2);
    if (layer.type === 'image') {
      layer.targetWidth = round2(width);
      // 保留各公版自己的 sizingMode / fitMode，只更新該模式使用的尺寸基準，不把其他尺寸的模式覆蓋過來。
      const mode = String(layer.sizingMode || '').replace(/[\s_-]+/g, '').toLowerCase();
      if (mode === 'containbypbox' || mode === 'heightbased' || layer.productImageSizingRule === 'ddcardHeightPriorityNoWidthLimit') {
        layer.targetHeight = round2(height);
        layer.maxTargetHeight = round2(height);
      } else if (Number.isFinite(Number(layer.maxTargetHeight))) {
        layer.maxTargetHeight = Math.max(round2(height), number(layer.maxTargetHeight));
      }
    }
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
      fontScale: childLayer?.type === 'text' ? number(childLayer.fontSizePx, 1) / Math.max(1, productBox.width) : undefined,
      lineHeightScale: childLayer?.type === 'text' ? number(childLayer.lineHeight, childLayer.fontSizePx || 1) / Math.max(1, productBox.width) : undefined,
      styleFontScales: childLayer?.type === 'text' && Array.isArray(childLayer.textStyleRanges)
        ? childLayer.textStyleRanges.map((range) => number(range?.fontSizePx, childLayer.fontSizePx || 1) / Math.max(1, productBox.width))
        : undefined,
      styleLineHeightScales: childLayer?.type === 'text' && Array.isArray(childLayer.textStyleRanges)
        ? childLayer.textStyleRanges.map((range) => number(range?.lineHeight, 0) > 0 ? number(range.lineHeight) / Math.max(1, productBox.width) : null)
        : undefined,
      align: childLayer?.align || 'center',
    };
  }
  function localToChildBox(local, productBox, productRotation) {
    const productCenter = { x: productBox.x + productBox.width / 2, y: productBox.y + productBox.height / 2 };
    const vector = rotateVector({
      x: number(local.localX) * productBox.width,
      y: number(local.localY) * productBox.height,
    }, productRotation);
    const width = Math.max(1, number(local.localWidth, .2) * productBox.width);
    const height = Math.max(1, number(local.localHeight, .1) * productBox.height);
    const center = { x: productCenter.x + vector.x, y: productCenter.y + vector.y };
    return { x: center.x - width / 2, y: center.y - height / 2, width, height };
  }
  function applyLocalMemberTransform(template, childKey, childLayer, type, local, productBox, productRotation) {
    if (!childLayer || !local) return;
    let box = localToChildBox(local, productBox, productRotation);
    if (type === 'price') {
      const widthBasis = Math.max(1, productBox.width);
      const syncedFont = Number.isFinite(number(local.fontScale, NaN))
        ? Math.max(4, number(local.fontScale) * widthBasis)
        : number(childLayer.fontSizePx, 24);
      const syncedLineHeight = Number.isFinite(number(local.lineHeightScale, NaN))
        ? Math.max(1, number(local.lineHeightScale) * widthBasis)
        : Math.max(1, number(childLayer.lineHeight, syncedFont * number(childLayer.lineHeightMultiplier, 1.08)));
      childLayer.fontSizePx = round2(syncedFont);
      childLayer.fontSizePt = childLayer.fontSizePx;
      childLayer.lineHeight = round2(syncedLineHeight);
      if (box.height < childLayer.lineHeight) {
        const centerY = box.y + box.height / 2;
        box.height = childLayer.lineHeight;
        box.y = centerY - box.height / 2;
      }
      if (Array.isArray(childLayer.textStyleRanges) && Array.isArray(local.styleFontScales)) {
        childLayer.textStyleRanges.forEach((range, index) => {
          if (!range) return;
          const fontRatio = number(local.styleFontScales[index], NaN);
          if (Number.isFinite(fontRatio)) range.fontSizePx = round2(Math.max(3, fontRatio * widthBasis));
          const rawLineRatio = local.styleLineHeightScales?.[index];
          if (rawLineRatio != null && Number.isFinite(Number(rawLineRatio))) {
            range.lineHeight = round2(Math.max(1, Number(rawLineRatio) * widthBasis));
          }
        });
      }
    }
    applyLayerBox(childLayer, box);
    childLayer.rotation = round2(number(productRotation) + number(local.rotationOffset));
    if (type === 'price') {
      childLayer.align = local.align || childLayer.align || 'center';
      // 只重建 anchor，不觸發另一輪商品同步；價格文字內容完全不更動。
      window.PriceTransformEngine?.captureManualPriceTransform?.(childKey, childLayer, template, { rebase: true });
    }
  }

  function persistRegistry() { /* Session-only by design. */ }
  function resetSession() {
    registry.clear();
    mainTransformSession = null;
    pendingThumbIndexes = null;
    clearTimeout(pendingThumbTimer);
    pendingThumbTimer = null;
    // 重新讀 Excel / 清空公版時，連 template 物件上的 runtime Smart 狀態一起清掉。
    // 下一批資料會在 Rule / Layout 完成後重新 capture 自己的 Initial。
    (window.AppState?.templates || []).forEach((item) => {
      const template = item?.data || item;
      if (!template) return;
      delete template.smartAssetConfig;
      clearTemplateBaselines(template);
    });
  }
  function getLayerAssetId(template, key, layer) {
    if (!layer?.assetFilename) return null;
    // 尚未經過 Loader 時，先從 AssetStore 找「最後實際會命中的檔案」，避免 fallback 素材被誤認成原始工單檔名。
    if (!layer.__resolvedAssetPath && window.AssetStore?.getFileEntries) {
      const entries = window.AssetStore.getFileEntries() || [];
      const filenames = [layer.assetFilename, ...(Array.isArray(layer.assetCandidates) ? layer.assetCandidates : [])]
        .map((value) => basename(value)).filter(Boolean);
      const preferred = String(layer.assetProject || template?.batchProject || template?.batchRecord?.__project || '').trim();
      const folderRank = (folder) => {
        if (preferred && folder === preferred) return 0;
        if (folder === '共用素材') return 1;
        if (!folder) return 2;
        return 3;
      };
      // 與 TemplateLoader 相同：先依 assetFilename → assetCandidates 的順序找，再比較資料夾優先序。
      // 若「皇冠版」與 fallback 舊版同時存在，不能因 AssetStore 列舉順序而誤選 fallback。
      let hit = null;
      for (const filename of filenames) {
        const wanted = String(filename).normalize('NFKC').toLowerCase();
        hit = entries
          .filter((entry) => String(entry.filename || '').normalize('NFKC').toLowerCase() === wanted)
          .sort((a, b) => folderRank(a.folder) - folderRank(b.folder)
            || String(a.relativePath || a.filename || '').localeCompare(String(b.relativePath || b.filename || ''), 'zh-Hant'))[0] || null;
        if (hit) break;
      }
      if (hit) {
        const resolvedPath = resolvedEntryPath(hit);
        const pathParts = resolvedPath.split('/').filter(Boolean);
        layer.__resolvedAssetFilename = String(pathParts.pop() || hit.filename || basename(layer.assetFilename));
        layer.__resolvedAssetFolder = pathParts.join('/').replace(/^@root$/, '');
        layer.__resolvedAssetPath = resolvedPath || `${layer.__resolvedAssetFolder || '@root'}/${layer.__resolvedAssetFilename}`;
      }
    }
    const id = makeAssetId(layer.assetFilename, { layer, template, key, folder: layer.assetProject || template?.batchProject || '' });
    if (id) layer.smartAssetId = id;
    return id;
  }


  function getAssetId(template) {
    const entry = productEntry(template);
    return entry ? getLayerAssetId(template, entry[0], entry[1]) : null;
  }
  function getConfigForTemplate(template) {
    const id = getAssetId(template);
    if (!id) return null;
    const raw = registry.get(id) || template.smartAssetConfig || null;
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
  // ── 自動排版：多張商品圖（P_01/P_02...）在 P_範圍 內均分成網格排列 ──
  // 用於「資料夾模式」批次產圖：依實際上傳到該專案資料夾的圖片數量動態產生 P_01~P_0N 後
  // （見 app.core.js 的 prepareDynamicProductLayers），這幾張圖預設會疊在同一個位置，
  // 這裡把它們依數量排成接近正方形的網格，均分整個參考框（P_範圍，沒有的話退回規則框/畫布）的空間，
  // 每張圖在自己的格子內置中、內縮一點當間距，並維持 keepAspectRatio 避免變形。
  // 只在「第一次生成、還沒有公版 preset／人為位置」時當 fallback 初始值；有精確 preset 的圖層會被略過。
  // 動態網格圖層統一使用 containByPBox，確保指定框尺寸真的反映到畫面上：
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
  // 只在第一次生成動態商品圖時執行一次；完成後立即 capture Smart baseline，之後預覽刷新不再重排。
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
      window.Geometry.applyBox(key, layer, box);
      normalizePlacementSizing(layer, box);
    });
  }

  function placementDelta(initialAnchor, currentAnchor) {
    if (!initialAnchor || !currentAnchor) return null;
    const safeScale = (current, initial) => {
      const denominator = number(initial);
      if (!Number.isFinite(denominator) || Math.abs(denominator) < 0.000001) return 1;
      const scale = number(current) / denominator;
      return Number.isFinite(scale) && scale > 0 ? scale : 1;
    };
    return {
      mode: 'delta-from-template-initial',
      dxRatioDelta: number(currentAnchor.dxRatio) - number(initialAnchor.dxRatio),
      dyRatioDelta: number(currentAnchor.dyRatio) - number(initialAnchor.dyRatio),
      widthScale: safeScale(currentAnchor.widthRatio, initialAnchor.widthRatio),
      heightScale: safeScale(currentAnchor.heightRatio, initialAnchor.heightRatio),
      rotationDelta: number(currentAnchor.rotation) - number(initialAnchor.rotation),
    };
  }
  function placementAnchorFromDelta(initialAnchor, delta) {
    if (!initialAnchor || !delta) return null;
    return {
      dxRatio: number(initialAnchor.dxRatio) + number(delta.dxRatioDelta),
      dyRatio: number(initialAnchor.dyRatio) + number(delta.dyRatioDelta),
      widthRatio: Math.max(0.000001, number(initialAnchor.widthRatio, 0.1) * number(delta.widthScale, 1)),
      heightRatio: Math.max(0.000001, number(initialAnchor.heightRatio, 0.1) * number(delta.heightScale, 1)),
      rotation: number(initialAnchor.rotation) + number(delta.rotationDelta),
    };
  }

  function migrateAbsoluteConfig(template, config = {}) {
    // V1.1：商品本身的絕對位置（原本的 productTransform／productBox／priceSlots）不再是智慧素材
    // 同步的一部分——商品在各版位的位置永遠獨立、不被跨版位覆寫（見 applyTemplate 的說明）。
    // 這裡只確保 childTransforms / shadow 結構存在，其餘保留給呼叫端使用。
    const next = clone(config || {});
    next.childTransforms ||= {};
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

    if (productBox) {
      smartProductMemberEntries(template, product[0]).forEach(([key, layer, type]) => {
        if (type === 'product') return;
        const slot = type === 'price' ? `price:${String(layer.priceSlot || layer.slot || key)}` : `shadow:${key}`;
        const box = window.Geometry.getLayerBox(key, layer);
        // 價格版型（layoutKey，例如 singleCoupon／doubleCoupon）跟著存起來，套用到別的版位時
        // 用來檢查版型是否相容（見 applyChildConfig 的說明），避免蓋掉不同版型的 rule 排版。
        const layoutKey = type === 'price' ? (layer.priceLayoutKey || '') : '';
        childTransforms[slot] = { ...childToLocal(box, layer, productBox, productRotation), key, type, layoutKey };
      });
    }

    return {
      version: 4,
      groupMode: 'smart-product',
      // V1.1：不再儲存/套用商品本身的絕對位置（productTransform）。商品＋價格智慧型物件
      // 只描述「價格相對商品中心」的關係，商品本身在各版位的位置永遠維持該版位原本設定。
      childTransforms,
      shadow: {
        enabled: false, color: '#901e0e', opacity: .8, blur: 3, skewX: -.5, scaleX: .95, scaleY: .45,
        offsetX: 0, offsetY: 2, gradientStart: .85, gradientEnd: 1.1,
        ...migrated.shadow
      }
    };
  }

  function applyChildConfig(template, config, options = {}) {
    const product = productEntry(template);
    if (!product || !config?.childTransforms) return;
    const productBox = window.Geometry.getLayerBox(product[0], product[1]);
    const productRotation = number(product[1].rotation);

    smartProductMemberEntries(template, product[0]).forEach(([key, layer, type]) => {
      if (type === 'product') return;
      if (
        type === 'price'
        && template.__appliedPlacementPresetKey
        && layer.lockToEditedJson === true
        && options.allowPresetOverride !== true
      ) return;
      const slot = type === 'price' ? `price:${String(layer.priceSlot || layer.slot || key)}` : `shadow:${key}`;
      const local = config.childTransforms[slot] || Object.values(config.childTransforms).find(item => item?.key === key);
      if (!local) return;
      // 價格版型相容性檢查：如果這個版位當下這筆工單資料，被 PriceRuleEngine 判斷成跟儲存當下
      // 不一樣的版型（例如這裡是單券 singleCoupon，儲存當下是雙券 doubleCoupon），代表這是完全
      // 不同形狀/內容的排版，硬套用同一組相對位置會蓋掉這個版位自己正確的 rule 排版。
      // 這種情況直接跳過、保留 rule 算出來的原始位置，不套用智慧素材同步。
      if (type === 'price' && local.layoutKey && layer.priceLayoutKey && local.layoutKey !== layer.priceLayoutKey) {
        console.warn(`[SmartAsset] 版型不相容，略過價格同步：${key}（此版位=${layer.priceLayoutKey}，儲存時=${local.layoutKey}）`);
        return;
      }
      const box = localToChildBox(local, productBox, productRotation);
      window.Geometry.applyBox(key, layer, box);
      layer.rotation = number(productRotation) + number(local.rotationOffset);
      if (type === 'price') {
        layer.align = local.align || layer.align || 'center';
        // V3.4：字級改回「等比例同步」——使用者在某版位手動調整字級後，其他版位依「字級相對
        // 商品寬度的比例 × 各自商品寬度」同步（跟位置/大小同一套邏輯，視覺比例一致）。
        // 這不是 V3.1 移除的 fitText 自動塞框機制：這裡完全沒有自動縮小/壓字距，字級純粹由
        // 使用者的調整決定並等比例帶到其他版位。保留 8px 絕對下限當防呆（避免壞資料把字級
        // 帶到看不見的程度）。disableContentScale/preserveExactSize 維持 true，關掉
        // PriceTransformEngine 依商品縮放連動改字級的舊機制，字級的唯一來源就是這裡的同步值。
        if (Number.isFinite(number(local.fontScale, NaN))) {
          const syncedFont = Math.max(8, number(local.fontScale) * Math.max(1, productBox.width));
          layer.fontSizePx = Number(syncedFont.toFixed(2));
          layer.fontSizePt = layer.fontSizePx;
          layer.lineHeight = layer.fontSizePx;
        }
        layer.disableContentScale = true;
        layer.preserveExactSize = true;
        if (layer.anchor && window.PriceTransformEngine?.captureManualPriceTransform) {
          window.PriceTransformEngine.captureManualPriceTransform(key, layer, template);
        }
      }
    });
  }

  // ── Smart Object Baseline ────────────────────────────────────────────────
  // Initial 的正式定義：公版套完 Rule / 價格後、使用者尚未操作前的 P / P_01 / P_02 與其 P_範圍。
  // Baseline 同時保存在 template 與 layer，避免 Auto Price 重建時新價格 layer 遺失原始 child relation。
  function strictReferenceBox(template) {
    const guide = guideEntry(template);
    if (!guide) return null;
    const box = layerBox(guide[1]);
    if (!(box.width > 0 && box.height > 0)) return null;
    return { ...box, source: 'p-range' };
  }
  function baselineStore(template) {
    template.__smartAssetProductBaselines ||= {};
    template.__smartAssetChildBaselines ||= {};
    return {
      products: template.__smartAssetProductBaselines,
      children: template.__smartAssetChildBaselines,
    };
  }
  function clearTemplateBaselines(template) {
    if (!template) return;
    delete template.__smartAssetProductBaselines;
    delete template.__smartAssetChildBaselines;
    Object.values(template.layers || {}).forEach((layer) => {
      if (!layer) return;
      delete layer.__smartAssetBaseline;
      delete layer.__smartAssetChildBaseline;
    });
  }
  function ensureProductBaseline(template, key, layer) {
    if (!template || !key || !layer || !isProduct(key, layer)) return null;
    const stores = baselineStore(template);
    if (stores.products[key]) {
      layer.__smartAssetBaseline = clone(stores.products[key]);
      return clone(stores.products[key]);
    }
    const reference = strictReferenceBox(template);
    if (!reference) return null;
    const box = layerBox(layer);
    const rotation = number(layer.rotation);
    const anchor = boxToGuideAnchor({ ...box, rotation }, reference);
    const baseline = {
      version: 1,
      box: clone(box),
      reference: clone(reference),
      anchor: clone(anchor),
      rotation,
      sizingMode: layer.sizingMode || '',
      fitMode: layer.fitMode || '',
      keepAspectRatio: layer.keepAspectRatio,
      targetWidth: layer.targetWidth,
      targetHeight: layer.targetHeight,
      maxTargetHeight: layer.maxTargetHeight,
    };
    stores.products[key] = clone(baseline);
    layer.__smartAssetBaseline = clone(baseline);
    return baseline;
  }
  function childSlotKey(productKey, childKey, childLayer, type) {
    if (type === 'price') {
      return `${productKey}|price|${String(childLayer?.priceSlot || childLayer?.slot || childKey)}|${String(childLayer?.priceLayoutKey || '')}`;
    }
    return `${productKey}|${type}|${childKey}`;
  }
  function ensureChildBaseline(template, productKey, childKey, childLayer, type) {
    if (!template || !productKey || !childLayer || type === 'product') return null;
    const productLayer = template.layers?.[productKey];
    const productBaseline = ensureProductBaseline(template, productKey, productLayer);
    if (!productBaseline?.box) return null;
    const stores = baselineStore(template);
    const storeKey = childSlotKey(productKey, childKey, childLayer, type);
    if (stores.children[storeKey]) {
      childLayer.__smartAssetChildBaseline = clone(stores.children[storeKey]);
      return clone(stores.children[storeKey]);
    }
    const local = childToLocal(layerBox(childLayer), childLayer, productBaseline.box, productBaseline.rotation);
    const baseline = {
      version: 1,
      productKey,
      childKey,
      type,
      slot: type === 'price' ? String(childLayer.priceSlot || childLayer.slot || childKey) : '',
      layoutKey: type === 'price' ? String(childLayer.priceLayoutKey || '') : '',
      local: clone(local),
      box: clone(layerBox(childLayer)),
      rotation: number(childLayer.rotation),
      fontSizePx: childLayer.fontSizePx,
      fontSizePt: childLayer.fontSizePt,
      lineHeight: childLayer.lineHeight,
      align: childLayer.align,
      textStyleRanges: Array.isArray(childLayer.textStyleRanges) ? clone(childLayer.textStyleRanges) : null,
    };
    stores.children[storeKey] = clone(baseline);
    childLayer.__smartAssetChildBaseline = clone(baseline);
    return baseline;
  }
  function captureTemplateBaselines(template) {
    if (!template) return false;
    const reference = strictReferenceBox(template);
    if (!reference) return false;
    productEntries(template).forEach(([productKey, productLayer]) => {
      ensureProductBaseline(template, productKey, productLayer);
      smartProductMemberEntries(template, productKey).forEach(([childKey, childLayer, type]) => {
        if (type !== 'product') ensureChildBaseline(template, productKey, childKey, childLayer, type);
      });
    });
    return true;
  }
  function productDeltaFromBaseline(template, key, layer) {
    const baseline = ensureProductBaseline(template, key, layer);
    const currentReference = strictReferenceBox(template);
    if (!baseline?.anchor || !currentReference) return null;
    const currentBox = layerBox(layer);
    const currentAnchor = boxToGuideAnchor({ ...currentBox, rotation: number(layer.rotation) }, currentReference);
    return placementDelta(baseline.anchor, currentAnchor);
  }
  function applyProductDelta(template, key, layer, delta) {
    if (!delta || delta.mode !== 'delta-from-template-initial') return false;
    const baseline = ensureProductBaseline(template, key, layer);
    const currentReference = strictReferenceBox(template);
    if (!baseline?.anchor || !currentReference) return false;
    const anchor = placementAnchorFromDelta(baseline.anchor, delta);
    const box = guideAnchorToBox(anchor, currentReference);
    applyLayerBox(layer, box);
    layer.rotation = round2(anchor.rotation);
    return true;
  }
  function restoreProductBaseline(template, key, layer) {
    const baseline = ensureProductBaseline(template, key, layer);
    if (!baseline?.box) return false;
    applyLayerBox(layer, baseline.box);
    layer.rotation = round2(baseline.rotation);
    layer.sizingMode = baseline.sizingMode;
    layer.fitMode = baseline.fitMode;
    if (baseline.keepAspectRatio !== undefined) layer.keepAspectRatio = baseline.keepAspectRatio;
    if (baseline.targetWidth !== undefined) layer.targetWidth = baseline.targetWidth;
    if (baseline.targetHeight !== undefined) layer.targetHeight = baseline.targetHeight;
    if (baseline.maxTargetHeight !== undefined) layer.maxTargetHeight = baseline.maxTargetHeight;
    return true;
  }
  function restoreChildrenToBaseline(template, productKey) {
    const productLayer = template.layers?.[productKey];
    if (!productLayer) return;
    smartProductMemberEntries(template, productKey).forEach(([childKey, childLayer, type]) => {
      if (type === 'product') return;
      const baseline = ensureChildBaseline(template, productKey, childKey, childLayer, type);
      if (!baseline) return;
      if (baseline.box) applyLayerBox(childLayer, baseline.box);
      childLayer.rotation = round2(baseline.rotation);
      if (type === 'price') {
        if (baseline.fontSizePx !== undefined) childLayer.fontSizePx = baseline.fontSizePx;
        if (baseline.fontSizePt !== undefined) childLayer.fontSizePt = baseline.fontSizePt;
        if (baseline.lineHeight !== undefined) childLayer.lineHeight = baseline.lineHeight;
        if (baseline.align !== undefined) childLayer.align = baseline.align;
        if (baseline.textStyleRanges) childLayer.textStyleRanges = clone(baseline.textStyleRanges);
        window.PriceTransformEngine?.captureManualPriceTransform?.(childKey, childLayer, template, { rebase: true });
      }
    });
  }

  // V1.1：applyProductConfig（商品本身絕對位置套用）已移除。商品在各版位的位置永遠獨立、
  // 由該版位模板自己的資料決定，不會被智慧素材設定覆寫——這是本次修正的核心行為。

  function removeShadow(template, images) {
    Object.keys(template?.layers || {}).filter(key => key.startsWith(SHADOW_PREFIX)).forEach(key => {
      delete template.layers[key];
      if (images) delete images[key];
    });
    template.renderOrder = (template.renderOrder || []).filter(key => !key.startsWith(SHADOW_PREFIX));
  }
  function applyTemplate(template, options = {}) {
    if (!template || getSyncMode(template) !== 'smart-product') return;
    // 動態資料夾模式若剛新增多張商品，網格排版屬於合法的「初始化」流程，必須先完成再 capture baseline。
    // 固定的 P / P_01 / P_02 不會進入此分支，因此完全保留各公版 JSON / Rule 初始座標。
    if (template.__needsProductGridLayout) {
      layoutProductGrid(template, { preservePresetGeometry: Boolean(template.__appliedPlacementPresetKey) });
      delete template.__needsProductGridLayout;
    }
    // Image loader / preview refresh 只能確認 baseline 是否已存在；絕不從 session registry 反向覆寫商品幾何。
    captureTemplateBaselines(template);
    if (options.readOnly === true) return;
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
      if (list.length) window.BatchManager?.refreshThumbsForIndexes?.(list);
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
    if (isProduct(key, layer)) return { role: 'product', productKey: key };
    for (const [productKey] of productEntries(template)) {
      if (smartProductMemberEntries(template, productKey).some(([memberKey]) => memberKey === key)) {
        return { role: 'child', productKey };
      }
    }
    return null;
  }
  function ownsLayer(key, layer, template = window.AppState?.template) {
    return getSyncMode(template) === 'smart-product' && !!resolveTransformTarget(template, key);
  }
  function overwriteTemplate(target, snapshot) {
    if (!target || !snapshot) return;
    Object.keys(target).forEach((field) => delete target[field]);
    Object.assign(target, clone(snapshot));
  }
  function normalizeAngleDelta(value) {
    const raw = number(value);
    return round2((((raw + 180) % 360) + 360) % 360 - 180);
  }
  function safeRatio(current, base) {
    const denominator = number(base, NaN);
    if (!Number.isFinite(denominator) || Math.abs(denominator) < 0.000001) return 1;
    const ratio = number(current, denominator) / denominator;
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  }
  function childLocalDelta(base, current) {
    if (!base || !current) return null;
    return {
      localXDelta: number(current.localX) - number(base.localX),
      localYDelta: number(current.localY) - number(base.localY),
      widthScale: safeRatio(current.localWidth, base.localWidth),
      heightScale: safeRatio(current.localHeight, base.localHeight),
      rotationDelta: normalizeAngleDelta(number(current.rotationOffset) - number(base.rotationOffset)),
      fontScaleScale: safeRatio(current.fontScale, base.fontScale),
      lineHeightScaleScale: safeRatio(current.lineHeightScale, base.lineHeightScale),
      styleFontScaleScales: Array.isArray(current.styleFontScales)
        ? current.styleFontScales.map((value, index) => safeRatio(value, base.styleFontScales?.[index]))
        : [],
      styleLineHeightScaleScales: Array.isArray(current.styleLineHeightScales)
        ? current.styleLineHeightScales.map((value, index) => value == null ? 1 : safeRatio(value, base.styleLineHeightScales?.[index]))
        : [],
    };
  }
  function childLocalFromDelta(base, delta) {
    if (!base || !delta) return base ? clone(base) : null;
    const next = clone(base);
    next.localX = number(base.localX) + number(delta.localXDelta);
    next.localY = number(base.localY) + number(delta.localYDelta);
    next.localWidth = Math.max(0.000001, number(base.localWidth, .1) * number(delta.widthScale, 1));
    next.localHeight = Math.max(0.000001, number(base.localHeight, .1) * number(delta.heightScale, 1));
    next.rotationOffset = number(base.rotationOffset) + number(delta.rotationDelta);
    if (Number.isFinite(number(base.fontScale, NaN))) next.fontScale = number(base.fontScale) * number(delta.fontScaleScale, 1);
    if (Number.isFinite(number(base.lineHeightScale, NaN))) next.lineHeightScale = number(base.lineHeightScale) * number(delta.lineHeightScaleScale, 1);
    if (Array.isArray(base.styleFontScales)) {
      next.styleFontScales = base.styleFontScales.map((value, index) => number(value) * number(delta.styleFontScaleScales?.[index], 1));
    }
    if (Array.isArray(base.styleLineHeightScales)) {
      next.styleLineHeightScales = base.styleLineHeightScales.map((value, index) => value == null ? null : number(value) * number(delta.styleLineHeightScaleScales?.[index], 1));
    }
    return next;
  }
  function memberDescriptor(childKey, childLayer, type) {
    return {
      key: childKey,
      type,
      slot: type === 'price' ? String(childLayer?.priceSlot || childLayer?.slot || childKey) : '',
      layoutKey: type === 'price' ? String(childLayer?.priceLayoutKey || '') : '',
    };
  }
  function findTargetMember(template, productKey, descriptor) {
    const candidates = smartProductMemberEntries(template, productKey).filter(([, , type]) => type === descriptor.type);
    if (descriptor.type === 'price') {
      const sameSlot = candidates.filter(([key, layer]) => String(layer.priceSlot || layer.slot || key) === descriptor.slot);
      if (!sameSlot.length) return null;
      if (descriptor.layoutKey) {
        const sameLayout = sameSlot.find(([, layer]) => String(layer.priceLayoutKey || '') === descriptor.layoutKey);
        if (sameLayout) return sameLayout;
      }
      return sameSlot[0];
    }
    if (descriptor.type === 'shadow') {
      return candidates.find(([key]) => key === descriptor.key) || candidates[0] || null;
    }
    return null;
  }
  function captureCurrentChildren(template, productKey) {
    const productLayer = template.layers?.[productKey];
    if (!productLayer) return [];
    const productBox = layerBox(productLayer);
    const productRotation = number(productLayer.rotation);
    return smartProductMemberEntries(template, productKey)
      .filter(([, , type]) => type !== 'product')
      .map(([childKey, childLayer, type]) => ({
        ...memberDescriptor(childKey, childLayer, type),
        local: childToLocal(layerBox(childLayer), childLayer, productBox, productRotation),
      }));
  }

  function usageEntries(assetId) {
    if (!assetId) return [];
    const result = [];
    (window.AppState?.templates || []).forEach((item, index) => {
      const template = item?.data || item;
      if (getSyncMode(template) !== 'smart-product') return;
      productEntries(template).forEach(([productKey, productLayer]) => {
        const currentId = getLayerAssetId(template, productKey, productLayer);
        if (currentId === assetId) result.push({ item, index, template, productKey, productLayer });
      });
    });
    return result;
  }

  function syncProductFromSource(assetId, sourceTemplate, sourceProductKey, options = {}) {
    const sourceLayer = sourceTemplate?.layers?.[sourceProductKey];
    if (!sourceLayer || !assetId) return { count: 0, affected: [] };
    const delta = productDeltaFromBaseline(sourceTemplate, sourceProductKey, sourceLayer);
    if (!delta) return { count: 0, affected: [], warning: '來源公版缺少有效 P_範圍 / Initial' };

    const targets = usageEntries(assetId).filter(({ template, productKey }) => template !== sourceTemplate || productKey !== sourceProductKey);
    const sourceRollback = options.sourceBefore ? clone(options.sourceBefore) : clone(sourceTemplate);
    const snapshots = new Map();
    // 同一公版內若同素材出現兩次，HistoryManager.push() 已經保存整個來源公版；
    // 不可再把「來源編輯後」快照塞進 historyExtras，否則 Undo 會被 extra 反向覆蓋。
    targets.forEach(({ index, template }) => {
      if (template !== sourceTemplate && !snapshots.has(index)) snapshots.set(index, clone(template));
    });
    const warnings = [];
    try {
      targets.forEach(({ template, productKey, productLayer }) => {
        const baseline = ensureProductBaseline(template, productKey, productLayer);
        if (!baseline || !strictReferenceBox(template)) {
          warnings.push(`${template.templateId || template.batchSourceName || '版位'}：缺少 P_範圍 / Initial，略過`);
          return;
        }
        // 先保存「目標公版自己的」價格/陰影相對關係，再動商品；來源公版的價格座標絕不覆蓋目標。
        const targetChildren = captureCurrentChildren(template, productKey);
        applyProductDelta(template, productKey, productLayer, delta);
        const targetBox = layerBox(productLayer);
        const targetRotation = number(productLayer.rotation);
        targetChildren.forEach((member) => {
          const target = findTargetMember(template, productKey, member);
          if (!target) return;
          applyLocalMemberTransform(template, target[0], target[1], member.type, member.local, targetBox, targetRotation);
        });
      });
    } catch (error) {
      snapshots.forEach((snapshot, index) => {
        const entry = window.AppState?.templates?.[index];
        const target = entry?.data || entry;
        overwriteTemplate(target, snapshot);
      });
      overwriteTemplate(sourceTemplate, sourceRollback);
      throw error;
    }
    const extras = [...snapshots.entries()].map(([index, data]) => ({ index, data }));
    if (options.attachHistory !== false) window.HistoryManager?.attachExtra?.(extras.length ? extras : null);
    const affected = [...new Set([...(indexOfTemplate(sourceTemplate) || []), ...snapshots.keys()])];
    markThumbsStale(affected);
    if (warnings.length) console.warn('[SmartAsset] 同步警告\n' + warnings.join('\n'));
    return { count: snapshots.size, affected, warnings };
  }

  function syncChildFromSource(assetId, sourceTemplate, sourceProductKey, sourceChildKey, options = {}) {
    const sourceProductLayer = sourceTemplate?.layers?.[sourceProductKey];
    const sourceChildLayer = sourceTemplate?.layers?.[sourceChildKey];
    if (!sourceProductLayer || !sourceChildLayer || !assetId) return { count: 0, affected: [] };
    const sourceMember = smartProductMemberEntries(sourceTemplate, sourceProductKey).find(([key]) => key === sourceChildKey);
    if (!sourceMember || sourceMember[2] === 'product') return { count: 0, affected: [] };
    const descriptor = memberDescriptor(sourceChildKey, sourceChildLayer, sourceMember[2]);
    const sourceBaseline = ensureChildBaseline(sourceTemplate, sourceProductKey, sourceChildKey, sourceChildLayer, sourceMember[2]);
    if (!sourceBaseline?.local) return { count: 0, affected: [] };
    const sourceProductBox = layerBox(sourceProductLayer);
    const currentLocal = childToLocal(layerBox(sourceChildLayer), sourceChildLayer, sourceProductBox, number(sourceProductLayer.rotation));
    const delta = childLocalDelta(sourceBaseline.local, currentLocal);
    if (!delta) return { count: 0, affected: [] };

    const targets = usageEntries(assetId).filter(({ template, productKey }) => template !== sourceTemplate || productKey !== sourceProductKey);
    const sourceRollback = options.sourceBefore ? clone(options.sourceBefore) : clone(sourceTemplate);
    const snapshots = new Map();
    targets.forEach(({ index, template }) => {
      if (template !== sourceTemplate && !snapshots.has(index)) snapshots.set(index, clone(template));
    });
    try {
      targets.forEach(({ template, productKey, productLayer }) => {
        const target = findTargetMember(template, productKey, descriptor);
        if (!target) return;
        const [targetKey, targetLayer, targetType] = target;
        const baseline = ensureChildBaseline(template, productKey, targetKey, targetLayer, targetType);
        if (!baseline?.local) return;
        const nextLocal = childLocalFromDelta(baseline.local, delta);
        applyLocalMemberTransform(template, targetKey, targetLayer, targetType, nextLocal, layerBox(productLayer), number(productLayer.rotation));
      });
    } catch (error) {
      snapshots.forEach((snapshot, index) => {
        const entry = window.AppState?.templates?.[index];
        const targetTemplate = entry?.data || entry;
        overwriteTemplate(targetTemplate, snapshot);
      });
      overwriteTemplate(sourceTemplate, sourceRollback);
      throw error;
    }
    const extras = [...snapshots.entries()].map(([index, data]) => ({ index, data }));
    if (options.attachHistory !== false) window.HistoryManager?.attachExtra?.(extras.length ? extras : null);
    const affected = [...new Set([...(indexOfTemplate(sourceTemplate) || []), ...snapshots.keys()])];
    markThumbsStale(affected);
    return { count: snapshots.size, affected };
  }

  function beginMainCanvasTransform(key, template = window.AppState?.template) {
    const target = resolveTransformTarget(template, key);
    if (!target || getSyncMode(template) !== 'smart-product') { mainTransformSession = null; return false; }
    captureTemplateBaselines(template);
    const layer = template.layers[key];
    const initialBox = layerBox(layer);
    const initialRotation = number(layer.rotation);
    const baseSession = {
      template,
      draggedKey: key,
      role: target.role,
      productKey: target.productKey || null,
      initialBox: clone(initialBox),
      initialRotation,
      initialTemplateSnapshot: clone(template),
    };
    if (target.role === 'guide') {
      mainTransformSession = {
        ...baseSession,
        children: null,
        guideMembers: productEntries(template).map(([memberKey, memberLayer]) => {
          const memberBox = layerBox(memberLayer);
          const memberRotation = number(memberLayer.rotation);
          return {
            key: memberKey,
            anchor: boxToGuideAnchor({ ...memberBox, rotation: memberRotation }, initialBox),
            children: captureCurrentChildren(template, memberKey),
          };
        }),
      };
      return true;
    }
    if (target.role === 'child') {
      mainTransformSession = { ...baseSession, children: null };
      return true;
    }
    ensureProductBaseline(template, key, layer);
    mainTransformSession = {
      ...baseSession,
      productKey: key,
      children: captureCurrentChildren(template, key),
    };
    return true;
  }

  function updateMainCanvasTransform(key, template = window.AppState?.template) {
    const session = mainTransformSession;
    if (!session || session.template !== template || session.draggedKey !== key) return false;
    if (session.guideMembers) {
      const guideLayer = template.layers?.[key];
      if (!guideLayer) return false;
      const currentGuide = layerBox(guideLayer);
      session.guideMembers.forEach(({ key: memberKey, anchor, children }) => {
        const memberLayer = template.layers?.[memberKey];
        if (!memberLayer) return;
        const box = guideAnchorToBox(anchor, currentGuide);
        applyLayerBox(memberLayer, box);
        memberLayer.rotation = round2(anchor.rotation);
        const memberBox = layerBox(memberLayer);
        const memberRotation = number(memberLayer.rotation);
        children.forEach((member) => {
          const child = template.layers?.[member.key];
          if (!child) return;
          applyLocalMemberTransform(template, member.key, child, member.type, member.local, memberBox, memberRotation);
        });
      });
      return true;
    }
    if (!session.children) return true;
    const productLayer = template.layers?.[session.productKey];
    if (!productLayer) return false;
    const productBox = layerBox(productLayer);
    const productRotation = number(productLayer.rotation);
    session.children.forEach((member) => {
      const childLayer = template.layers?.[member.key];
      if (!childLayer) return;
      applyLocalMemberTransform(template, member.key, childLayer, member.type, member.local, productBox, productRotation);
    });
    return true;
  }

  const TRANSFORM_EPSILON = 0.05;
  function hasSessionActuallyChanged(session, template) {
    const layer = template.layers?.[session.draggedKey];
    if (!layer) return false;
    const box = layerBox(layer);
    const rotation = number(layer.rotation);
    const before = session.initialBox;
    return Math.abs(box.x - before.x) > TRANSFORM_EPSILON
      || Math.abs(box.y - before.y) > TRANSFORM_EPSILON
      || Math.abs(box.width - before.width) > TRANSFORM_EPSILON
      || Math.abs(box.height - before.height) > TRANSFORM_EPSILON
      || Math.abs(rotation - session.initialRotation) > TRANSFORM_EPSILON;
  }

  function finishMainCanvasTransform(key, template = window.AppState?.template) {
    const session = mainTransformSession;
    if (!session || session.draggedKey !== key || session.template !== template) {
      mainTransformSession = null;
      return false;
    }
    updateMainCanvasTransform(key, template);
    const changed = hasSessionActuallyChanged(session, template);
    mainTransformSession = null;
    if (!changed) return true;
    markThumbsStale(indexOfTemplate(template));
    if (session.guideMembers) return true; // P_範圍是每個公版自己的座標系，不跨版位同步。

    const productKey = session.productKey || (session.role === 'product' ? key : null);
    const productLayer = productKey ? template.layers?.[productKey] : null;
    const assetId = productLayer ? getLayerAssetId(template, productKey, productLayer) : null;
    if (!assetId) return true;
    try {
      const result = session.role === 'child'
        ? syncChildFromSource(assetId, template, productKey, key, { sourceBefore: session.initialTemplateSnapshot })
        : syncProductFromSource(assetId, template, productKey, { sourceBefore: session.initialTemplateSnapshot });
      if (result.count > 0) toastGlobal(`已同步 ${result.count} 個版位`);
    } catch (error) {
      overwriteTemplate(template, session.initialTemplateSnapshot);
      const history = window.AppState?.history;
      if (Array.isArray(history) && history.length) history.pop();
      window.Renderer?.render?.();
      window.LayerManager?.render?.();
      window.Inspector?.render?.();
      console.error('[SmartAsset] Transaction 已 Rollback', error);
      toastGlobal(`Smart Asset 套用失敗，已完整還原：${error.message || error}`);
    }
    return true;
  }

  // Image loader 永遠只負責載圖；禁止載圖/縮圖刷新時偷偷重套 Smart Object 幾何。
  function patchLoader() { /* intentionally disabled */ }

  function syncAll(assetId, config) {
    const sourceTemplate = editing?.template || window.AppState?.template;
    const sourceProduct = productEntry(sourceTemplate);
    if (!sourceTemplate || !sourceProduct) return { count: 0, affected: [] };
    if (config) sourceTemplate.smartAssetConfig = clone(config);
    const id = assetId || getLayerAssetId(sourceTemplate, sourceProduct[0], sourceProduct[1]);
    const result = syncProductFromSource(id, sourceTemplate, sourceProduct[0], { attachHistory: false });
    smartProductMemberEntries(sourceTemplate, sourceProduct[0]).forEach(([childKey, , type]) => {
      if (type !== 'product') syncChildFromSource(id, sourceTemplate, sourceProduct[0], childKey, { attachHistory: false });
    });
    return result;
  }

  // 價格內容屬於各筆 Excel / Rule；Smart Object 只同步幾何/字級變化，不同步文字內容。
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
    const usages = usageEntries(editing.assetId);
    $('saUsageCount').textContent = usages.length;
    $('saUsageList').innerHTML = usages.map(entry => `<button class="sa-usage ${entry.template === editing.template ? 'is-active' : ''}" data-index="${entry.index}"><strong>${escapeHtml(entry.item?.name || entry.template?.templateId || `版位 ${entry.index + 1}`)}</strong><small>${entry.template?.canvas?.width || 0} × ${entry.template?.canvas?.height || 0}</small></button>`).join('') || '<p class="sa-empty">目前主畫面版位</p>';
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
  function rescaleSelectedPriceTypography(previousBox, nextBox, explicitFactor = null) {
    if (!editing || editing.selectedType !== 'price') return false;
    const layer = selectedLayer();
    if (!layer || layer.type !== 'text') return false;
    const factor = Number.isFinite(Number(explicitFactor))
      ? Number(explicitFactor)
      : (previousBox?.width > 0 ? Number(nextBox?.width || previousBox.width) / previousBox.width : 1);
    if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.000001) return false;
    layer.fontSizePx = round2(Math.max(4, number(layer.fontSizePx, 24) * factor));
    layer.fontSizePt = layer.fontSizePx;
    layer.lineHeight = round2(layer.fontSizePx * number(layer.lineHeightMultiplier, 1.08));
    return true;
  }

  function applyInspector() {
    if (!editing || editing.selectedType === 'shadow') return;
    const layer = selectedLayer(); if (!layer) return;
    const previousBox = selectedBox();
    const box = { x: number($('saX').value), y: number($('saY').value), width: Math.max(1, number($('saW').value, 1)), height: Math.max(1, number($('saH').value, 1)) };
    window.Geometry.applyBox(editing.selectedKey, layer, box); layer.rotation = number($('saRotation').value);
    rescaleSelectedPriceTypography(previousBox, box);
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
    withEditingContext(() => window.Renderer.renderSceneTo(ctx));
    if (uiState.showGuide) {
      const guide = guideEntry(editing.template);
      if (guide) drawGuide(ctx, window.Geometry.getLayerBox(guide[0], guide[1]), '#22c55e');
      ctx.save(); ctx.strokeStyle = 'rgba(14,165,233,.45)'; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(editing.template.canvas.width / 2, 0); ctx.lineTo(editing.template.canvas.width / 2, editing.template.canvas.height); ctx.moveTo(0, editing.template.canvas.height / 2); ctx.lineTo(editing.template.canvas.width, editing.template.canvas.height / 2); ctx.stroke(); ctx.restore();
    }
    drawSelection(ctx);
    $('saStatus').textContent = `${editing.template.canvas.width} × ${editing.template.canvas.height}｜P 範圍相對座標｜${usageEntries(editing.assetId).length || 1} 個版位使用`;
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
      dragState = { mode: handle.type === 'rotate' ? 'rotate' : 'resize', handle: handle.type, start: point, box: clone(box), rotation: number(selectedLayer()?.rotation), startFontSizePx: number(selectedLayer()?.fontSizePx, 24), altKey: event.altKey };
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
    dragState.pointerId = event.pointerId;
    try { $('saCanvas').setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
  }
  function onStagePointerMove(event) {
    if (!dragState || !editing || (dragState.pointerId != null && event.pointerId !== dragState.pointerId)) return;
    const point = canvasPoint(event); const layer = selectedLayer(); if (!layer) return;
    const dx = point.x - dragState.start.x, dy = point.y - dragState.start.y;
    if (dragState.mode === 'move') {
      window.Geometry.applyBox(editing.selectedKey, layer, snapBox({ ...dragState.box, x: dragState.box.x + dx, y: dragState.box.y + dy }));
    } else if (dragState.mode === 'resize') {
      let { x, y, width, height } = dragState.box;
      if (dragState.handle.includes('e')) width = Math.max(8, dragState.box.width + dx);
      if (dragState.handle.includes('s')) height = Math.max(8, dragState.box.height + dy);
      if (dragState.handle.includes('w')) { x = dragState.box.x + dx; width = Math.max(8, dragState.box.width - dx); }
      if (dragState.handle.includes('n')) { y = dragState.box.y + dy; height = Math.max(8, dragState.box.height - dy); }
      if (event.shiftKey || editing.selectedType === 'product') {
        const ratio = dragState.box.width / Math.max(1, dragState.box.height);
        if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio; else width = height * ratio;
      }
      const resizedBox = { x, y, width, height };
      window.Geometry.applyBox(editing.selectedKey, layer, resizedBox);
      if (editing.selectedType === 'price' && dragState.box.width > 0) {
        const factor = resizedBox.width / dragState.box.width;
        layer.fontSizePx = round2(Math.max(4, number(dragState.startFontSizePx, 24) * factor));
        layer.fontSizePt = layer.fontSizePx;
        layer.lineHeight = round2(layer.fontSizePx * number(layer.lineHeightMultiplier, 1.08));
      }
    } else if (dragState.mode === 'rotate') {
      const center = { x: dragState.box.x + dragState.box.width / 2, y: dragState.box.y + dragState.box.height / 2 };
      layer.rotation = Math.round(Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI + 90);
    }
    if (editing.selectedType === 'product' && editing.groupSession) {
      const productBox = window.Geometry.getLayerBox(editing.productKey, editing.productLayer);
      const productRotation = number(editing.productLayer.rotation);
      editing.groupSession.forEach(({ key, type, local }) => {
        const child = editing.template.layers?.[key];
        if (!child) return;
        window.Geometry.applyBox(key, child, localToChildBox(local, productBox, productRotation));
        child.rotation = productRotation + number(local.rotationOffset);
        // V3.1：價格字級不再跟著商品縮放自動調整。
      });
    }
    captureCurrentBoxes(); renderWorkspace(); syncInspector(); event.preventDefault();
  }
  function onStagePointerUp(event) {
    if (!dragState || (dragState.pointerId != null && event.pointerId !== dragState.pointerId)) return;
    const pointerId = dragState.pointerId;
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
    window.Geometry.applyBox(editing.selectedKey, layer, next);
    rescaleSelectedPriceTypography(box, next, factor);
    if (group) {
      const productRotation = number(layer.rotation);
      group.forEach(({ key, type, local }) => {
        const child = editing.template.layers?.[key]; if (!child) return;
        window.Geometry.applyBox(key, child, localToChildBox(local, next, productRotation));
        child.rotation = productRotation + number(local.rotationOffset);
        // V3.1：價格字級不再跟著商品縮放自動調整。
      });
    }
    captureCurrentBoxes(); renderWorkspace(); syncInspector();
    clearTimeout(onStageWheel.timer); onStageWheel.timer = setTimeout(refreshPreview, 100);
  }

  async function imagesForTemplate(template, item) {
    if (template === window.AppState.template) return { ...window.AppState.images };
    return window.TemplateLoader.loadImagesForTemplate(template, { project: item?.project });
  }
  async function switchUsage(index) {
    const entry = (window.AppState.templates || [])[index]; if (!entry) return;
    captureCurrentBoxes();
    const template = entry.data || entry;
    const product = productEntry(template); if (!product) return;
    editing.template = template; editing.item = entry; editing.productKey = product[0]; editing.productLayer = product[1];
    editing.config = migrateAbsoluteConfig(editing.template, editing.config);
    template.smartAssetConfig = clone(editing.config);
    applyTemplate(template, { allowPresetOverride: true });
    editing.images = await imagesForTemplate(template, entry);
    editing.selectedKey = editing.productKey; editing.selectedType = 'product';
    renderUsages(); renderComponents(); syncInspector(); await refreshPreview(); toast(`已切換至 ${entry.name || '版位'}`);
  }

  async function save(close) {
    if (!editing) return;
    captureCurrentBoxes();
    syncAll(editing.assetId, editing.config);
    const state = window.AppState;
    applyTemplate(state.template, { allowPresetOverride: true });
    try { await ensureShadow(state.template, state.images); } catch (_) {}
    window.Renderer.render(); window.LayerManager.render(); window.Inspector.render();
    if (state.batchMode && window.BatchManager?.renderPreviewGrid) await window.BatchManager.renderPreviewGrid({ revealWhenDone: true });
    editing.savedSnapshot = clone(editing.config); toast('已套用素材設定');
    if (close) closeWorkspace();
  }
  function cancelAndClose() {
    if (!editing) return closeWorkspace();
    const restored = clone(editing.originalTemplateSnapshot);
    Object.keys(editing.template).forEach(key => delete editing.template[key]);
    Object.assign(editing.template, restored);
    if (editing.isMainTemplate) {
      window.AppState.template = editing.template;
      window.TemplateLoader.loadImagesForTemplate(editing.template).then(images => { window.AppState.images = images; window.Renderer.render(); window.LayerManager.render(); window.Inspector.render(); });
    }
    closeWorkspace();
  }
  function closeWorkspace() { $('smartAssetWorkspace')?.classList.remove('is-open'); editing = null; dragState = null; }

  async function resetAsset(key, layer, keepOpen = false) {
    const template = keepOpen && editing ? editing.template : window.AppState.template;
    const selectedKey = key || editing?.selectedKey || editing?.productKey;
    const target = resolveTransformTarget(template, selectedKey);
    const productKey = target?.role === 'product' ? selectedKey : target?.productKey;
    const productLayer = productKey ? template?.layers?.[productKey] : null;
    const assetId = productLayer ? getLayerAssetId(template, productKey, productLayer) : null;
    if (!template || !productKey || !productLayer || !assetId) {
      toastGlobal('找不到可還原的 Smart Object 商品');
      return;
    }

    captureTemplateBaselines(template);
    const usages = usageEntries(assetId);
    if (!usages.length) {
      toastGlobal('找不到此素材的連動版位');
      return;
    }

    const uniqueSnapshots = new Map();
    usages.forEach(({ index, template: current }) => {
      if (!uniqueSnapshots.has(index)) uniqueSnapshots.set(index, clone(current));
    });
    const sourceIndex = indexOfTemplate(template)[0];
    const attachHistory = !keepOpen && template === window.AppState?.template;
    if (attachHistory) window.HistoryManager?.push?.();

    try {
      usages.forEach(({ template: current, productKey: currentKey, productLayer: currentLayer }) => {
        captureTemplateBaselines(current);
        restoreProductBaseline(current, currentKey, currentLayer);
        restoreChildrenToBaseline(current, currentKey);
        delete current.smartAssetConfig;
      });
      // 此素材群組的 runtime config 一併清除；不影響其他素材。
      [...registry.keys()].forEach((registryKey) => {
        if (String(registryKey).includes(assetId)) registry.delete(registryKey);
      });
      persistRegistry();

      if (attachHistory) {
        const extras = [...uniqueSnapshots.entries()]
          .filter(([index]) => index !== sourceIndex)
          .map(([index, data]) => ({ index, data }));
        window.HistoryManager?.attachExtra?.(extras.length ? extras : null);
      }
      const indexes = [...uniqueSnapshots.keys()];
      markThumbsStale(indexes);

      if (keepOpen && editing) {
        editing.template = template;
        editing.productKey = productKey;
        editing.productLayer = template.layers?.[productKey] || productLayer;
        editing.selectedKey = productKey;
        editing.selectedType = 'product';
        editing.config = captureConfig(template, {});
        editing.originalTemplateSnapshot = clone(template);
        renderComponents();
        syncInspector();
        await refreshPreview();
        toast(usages.length > 1 ? `已一起還原 ${usages.length} 個同素材圖層` : '已還原素材');
      } else {
        window.PriceTransformEngine?.syncTemplate?.(template);
        window.Renderer?.render?.();
        window.LayerManager?.render?.();
        window.Inspector?.render?.();
        toastGlobal(usages.length > 1 ? `已一起還原 ${usages.length} 個同素材圖層` : '已還原素材');
      }
    } catch (error) {
      uniqueSnapshots.forEach((snapshot, index) => {
        const entry = window.AppState?.templates?.[index];
        const targetTemplate = entry?.data || entry;
        overwriteTemplate(targetTemplate, snapshot);
      });
      if (attachHistory && Array.isArray(window.AppState?.history) && window.AppState.history.length) window.AppState.history.pop();
      console.error('[SmartAsset] 還原失敗，已 rollback', error);
      toastGlobal(`還原失敗，已完整復原：${error.message || error}`);
    }
  }

  function toastGlobal(message) {
    let el = $('smartAssetGlobalToast');
    if (!el) { el = document.createElement('div'); el.id = 'smartAssetGlobalToast'; el.className = 'sa-global-toast'; document.body.appendChild(el); }
    el.textContent = `✓ ${message}`; el.classList.add('is-open'); clearTimeout(toastGlobal.timer); toastGlobal.timer = setTimeout(() => el.classList.remove('is-open'), 1800);
  }

  async function open(key, layer) {
    ensureUI();
    const template = window.AppState.template;
    const product = productEntry(template); if (!product) return;
    const assetId = getLayerAssetId(template, product[0], product[1]); if (assetId) product[1].smartAssetId = assetId;
    const existing = registry.get(assetId) || template.smartAssetConfig || {};
    const config = captureConfig(template, existing);
    editing = {
      assetId, template, item: window.AppState.templates?.[window.AppState.activeIndex], images: { ...window.AppState.images },
      productKey: product[0], productLayer: product[1], config,
      selectedKey: product[0], selectedType: 'product', isMainTemplate: true,
      originalTemplateSnapshot: clone(template), originalTemplateConfig: template.smartAssetConfig ? clone(template.smartAssetConfig) : null,
      savedSnapshot: clone(config)
    };
    $('saAssetName').textContent = `｜${layer.assetFilename?.split('/').pop() || layer.psdName || '商品素材'}`;
    $('smartAssetWorkspace').classList.add('is-open');
    setZoom(Math.min(1, Math.max(.35, Math.min(900 / template.canvas.width, 700 / template.canvas.height))));
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
    registry, makeAssetId, getLayerAssetId, isPlacementGuide, isProduct, ownsLayer, applyTemplate, ensureShadow, open, resetAsset,
    beginMainCanvasTransform, updateMainCanvasTransform, finishMainCanvasTransform, smartProductMemberEntries,
    getSyncMode, productEntries, syncPriceTextFromMainCanvas, isTransformActive, markActiveThumbStale,
    captureTemplateBaselines, clearTemplateBaselines, resetSession, syncProductFromSource, syncChildFromSource,
  };
  waitForApp();
})();
