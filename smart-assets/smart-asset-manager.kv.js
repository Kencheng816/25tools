(() => {
  'use strict';

  const STORAGE_KEY = 'om-wave1.smart-assets.v4';
  const GUIDE_NAMES = new Set(['P_範圍', '_P_範圍']);
  const SHADOW_PREFIX = '__smart_product_shadow__';
  const registry = new Map();
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const normalizeName = value => String(value || '').trim().replace(/\\/g, '/').split('/').pop().replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9一-龥]+/g, '_').replace(/^_+|_+$/g, '');
  // 檔名是空的（素材還沒比對到）時回傳 null，不要生出一個大家共用的 'asset:unknown'——
  // 那會讓兩個完全不相干、只是剛好都還沒比對到素材圖片的版位，被誤判成同一個智慧素材而互相同步。
  const makeAssetId = filename => {
    const normalized = normalizeName(filename);
    return normalized ? `asset:${normalized}` : null;
  };
  const isPlacementGuide = (key, layer) => {
    if (layer?.__placementGuide === true) return true;
    const name = String(layer?.psdName || layer?.name || key || '').trim();
    return GUIDE_NAMES.has(name) || /^_?P_範圍(?:_\d+)?$/i.test(name);
  };
  const isShadow = layer => layer?.generatedEffect === 'product-shadow' || layer?.role === 'product-shadow';
  const isProduct = (key, layer) => !!(layer?.type === 'image' && !isShadow(layer) && !isPlacementGuide(key, layer) && (layer.role === 'product' || /(^|\s|_)p($|\s|_)|商品圖|product/i.test(`${key} ${layer.psdName || ''} ${layer.role || ''}`)));
  const productEntry = template => Object.entries(template?.layers || {}).find(([key, layer]) => isProduct(key, layer) && layer.assetFilename) || null;
  // 複數版：抓「所有」符合商品條件的圖層（例如 P_01、P_02 多張商品圖），依 key 排序。
  // 只給「P_範圍模式」（見 getSyncMode）用；「商品＋價格」單一商品的流程仍用上面單數版 productEntry。
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
    priceEntries(template).forEach(([key, layer]) => entries.push([key, layer, 'price']));
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

  function loadRegistry() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.entries(saved).forEach(([id, config]) => registry.set(id, config));
    } catch (error) {
      console.warn('[SmartAsset] 設定讀取失敗', error);
    }
  }
  function persistRegistry() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(registry))); }
    catch (error) { console.warn('[SmartAsset] 設定儲存失敗', error); }
  }
  loadRegistry();

  function getAssetId(template) {
    const entry = productEntry(template);
    if (!entry) return null;
    const layer = entry[1];
    const id = layer.smartAssetId || makeAssetId(layer.assetFilename);
    if (id) layer.smartAssetId = id;
    return id;
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
      window.Geometry.applyBox(key, layer, box);
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
    window.Geometry.applyBox(key, layer, box);
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
      const id = layer.smartAssetId || makeAssetId(layer.assetFilename);
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
      const id = layer.smartAssetId || makeAssetId(layer.assetFilename);
      if (!id) return; // 素材還沒比對到檔名，沒有身分可以同步，略過（不要生一個大家共用的空 id）
      layer.smartAssetId = id;
      const anchor = capturePlacementAnchor(template, key, layer);
      registry.set(placementKey(id), anchor);
      (window.AppState?.templates || []).forEach((item, index) => {
        const other = item?.data || item;
        if (!other || other === template) return;
        const otherLayer = other.layers?.[key];
        if (!otherLayer || !isProduct(key, otherLayer)) return;
        const otherId = otherLayer.smartAssetId || makeAssetId(otherLayer.assetFilename);
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
    const mode = getSyncMode(template);
    if (mode === 'placement') { applyPlacementConfig(template, options); return; }
    if (mode !== 'price') return; // 沒有價格/資料夾訊號：不是智慧素材涵蓋的情境，完全不套用
    const config = getConfigForTemplate(template);
    if (!config) return;
    template.smartAssetConfig = clone(config);
    // 商品本身位置不套用（見上方 applyProductConfig 移除說明），只套「價格相對商品」的關係。
    applyChildConfig(template, config, options);
    if (!config.shadow?.enabled) removeShadow(template);
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
    if (isProduct(key, layer)) return { role: 'product' };
    const product = productEntry(template);
    if (product && smartProductMemberEntries(template, product[0]).some(([memberKey]) => memberKey === key)) {
      return { role: 'child', productKey: product[0] };
    }
    return null;
  }
  function beginMainCanvasTransform(key, template = window.AppState?.template) {
    const target = resolveTransformTarget(template, key);
    if (!target) { mainTransformSession = null; return false; }
    const layer = template.layers[key];
    const initialBox = window.Geometry.getLayerBox(key, layer);
    const initialRotation = number(layer.rotation);
    if (target.role === 'guide') {
      // 拖曳/縮放 P_範圍 本身：先記錄「目前」所有商品圖層相對於這個 P_範圍 的錨點關係，
      // 拖曳過程中 P_範圍 的框每變一次，就照這組錨點重新換算每個商品的位置/大小——
      // 這樣商品會跟著 P_範圍 一起等比例移動/縮放，維持彼此的相對關係，就像同一個群組。
      // 每個商品自己的價格／陰影子圖層，也一併記錄「相對於商品自身」的本地錨點——商品跟著
      // P_範圍 移動/縮放時，價格會跟著商品一起走，維持「價格相對商品」的關係（智慧型物件的
      // 另一半），不會因為調整 P_範圍 而讓價格留在原地、跟商品位置對不起來。
      mainTransformSession = {
        template, draggedKey: key, children: null,
        initialBox: clone(initialBox), initialRotation,
        guideMembers: productEntries(template).map(([memberKey, memberLayer]) => {
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
      // 拖的是價格／陰影本身：不需要「商品帶著子圖層即時跟隨」，drag 結束時走完整的
      // captureConfig 同步流程即可（見 finishMainCanvasTransform），這裡只需要建立一個有效 session。
      mainTransformSession = { template, draggedKey: key, children: null, initialBox: clone(initialBox), initialRotation };
      return true;
    }
    const productBox = initialBox;
    mainTransformSession = {
      template,
      draggedKey: key,
      initialBox: clone(initialBox),
      initialRotation,
      productRotation: initialRotation,
      productBox: clone(productBox),
      children: smartProductMemberEntries(template, key)
        .filter(([, , type]) => type !== 'product')
        .map(([childKey, childLayer, type]) => ({
          key: childKey, type,
          local: childToLocal(window.Geometry.getLayerBox(childKey, childLayer), childLayer, productBox, initialRotation)
        }))
    };
    return true;
  }
  function updateMainCanvasTransform(key, template = window.AppState?.template) {
    const session = mainTransformSession;
    if (!session || session.template !== template || session.draggedKey !== key) return false;
    if (session.guideMembers) {
      // P_範圍 本身正在被拖曳/縮放：用目前最新的 P_範圍 框，依照 begin 時記錄的錨點關係，
      // 重新換算每個商品圖層的位置/大小，讓它們即時跟著 P_範圍 一起變動。
      const guideLayer = template.layers?.[key];
      if (!guideLayer) return false;
      session.guideMembers.forEach(({ key: memberKey, anchor, children }) => {
        const memberLayer = template.layers?.[memberKey];
        if (!memberLayer) return;
        // applyPlacementAnchor 內部的 referenceBox(template) 會直接讀 P_範圍 圖層目前最新的框
        // （因為 app.core.js 的 moveSelected 在呼叫這裡之前，已經先把 P_範圍 的新框寫回 template 了），
        // 所以不用額外傳目前的框，天然就是「即時」的。
        applyPlacementAnchor(template, memberKey, memberLayer, anchor);
        if (children?.length) {
          // 商品剛剛跟著 P_範圍 移動/縮放到新位置了，價格/陰影也依照「相對於商品」的本地錨點
          // 換算到新位置，維持價格跟著商品一起走的關係。
          const memberBox = window.Geometry.getLayerBox(memberKey, memberLayer);
          const memberRotation = number(memberLayer.rotation);
          children.forEach(({ key: childKey, local, type }) => {
            const childLayer = template.layers?.[childKey];
            if (!childLayer) return;
            const box = localToChildBox(local, memberBox, memberRotation);
            window.Geometry.applyBox(childKey, childLayer, box);
            childLayer.rotation = memberRotation + number(local.rotationOffset);
            // 調整 P_範圍 時，價格字級依「fontScale × 目前商品寬度」等比例縮放。商品本身已經
            // 跟著 P_範圍 等比例縮放了，這裡用同一個比例算字級，就是純粹的等比例放大/縮小，
            // 不會像「調整素材」時那樣經過 syncPriceLayer 的商品縮放連動而忽大忽小。8px 下限防呆。
            if (type === 'price' && Number.isFinite(number(local.fontScale, NaN))) {
              const syncedFont = Math.max(8, number(local.fontScale) * Math.max(1, memberBox.width));
              childLayer.fontSizePx = Number(syncedFont.toFixed(2));
              childLayer.fontSizePt = childLayer.fontSizePx;
              childLayer.lineHeight = childLayer.fontSizePx;
            }
          });
        }
      });
      return true;
    }
    if (!session.children) return true; // 拖的是價格／陰影本身，沒有子圖層需要即時跟隨
    const productLayer = template.layers?.[key];
    if (!productLayer) return false;
    const productBox = window.Geometry.getLayerBox(key, productLayer);
    const productRotation = number(productLayer.rotation);
    session.children.forEach(({ key: childKey, local, type }) => {
      const layer = template.layers?.[childKey];
      if (!layer) return;
      const box = localToChildBox(local, productBox, productRotation);
      window.Geometry.applyBox(childKey, layer, box);
      layer.rotation = productRotation + number(local.rotationOffset);
      // V3.1：價格字級不再跟著商品縮放自動調整，只同步位置/大小（見 applyChildConfig 說明）。
    });
    return true;
  }
  // 判斷這次拖曳/縮放/微調的目標，位置/大小/旋轉是不是「真的」改變了——單純點選一下（滑鼠按下
  // 又立刻放開，中間完全沒有移動）也會跑一次 begin→finish，但不該被當成一次有效編輯來跨版位同步。
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
  function finishMainCanvasTransform(key, template = window.AppState?.template) {
    const session = mainTransformSession;
    if (!session || session.draggedKey !== key || session.template !== template) {
      mainTransformSession = null;
      return false;
    }
    updateMainCanvasTransform(key, template);
    const changed = hasSessionActuallyChanged(session, template);
    mainTransformSession = null;
    if (!changed) return true; // 只是點選/選取，沒有真的移動/縮放/旋轉，不需要跨版位同步
    // 不管這次變動有沒有觸發跨版位同步，「目前正在編輯的這個版位自己」的內容確實變了，
    // 縮圖也該跟著更新，不用等切換到別的版位才會發現這裡其實已經更新過。
    markThumbsStale(indexOfTemplate(template));
    if (session.guideMembers) {
      // 拖的是 P_範圍 本身：商品跟著 P_範圍 一起變動，但「商品相對 P_範圍 的錨點比例」
      // 完全沒有改變（只是 P_範圍 自己在這個版位的框變了），不需要跨版位同步或寫入 registry。
      // P_範圍 的大小/位置本來就是每個版位依自己畫布尺寸各自設定的，不應該同步到其他版位。
      return true;
    }
    // V1.2：在主畫布上直接拖曳/縮放/方向鍵微調商品「或價格／陰影」圖層，結束時（不是每一幀）
    // 就跨版位同步，不需要另外打開素材中心。同步內容依模式而定（price 只動價格關係、placement
    // 才會動商品本身位置），所以不會重踩 Bug B 的舊問題；同步時會把「同步前」的其他版位存進
    // HistoryManager 的 undo 快照，Ctrl+Z 復原這次拖曳時會一併復原，並用 toast 顯示同步了幾個版位。
    const mode = getSyncMode(template);
    if (mode === 'price') {
      const product = productEntry(template);
      const assetId = product ? (product[1].smartAssetId || makeAssetId(product[1].assetFilename)) : null;
      if (product && assetId) {
        product[1].smartAssetId = assetId;
        const config = captureConfig(template, registry.get(assetId) || template.smartAssetConfig || {});
        template.smartAssetConfig = clone(config);
        const count = syncFromMainCanvas(assetId, config, template);
        if (count > 0) toastGlobal(`已同步 ${count} 個版位`);
      }
    } else if (mode === 'placement') {
      const count = syncPlacementFromMainCanvas(template);
      if (count > 0) toastGlobal(`已同步 ${count} 個版位`);
    }
    return true;
  }

  function patchLoader() {
    const loader = window.TemplateLoader;
    if (!loader || loader.__smartAssetV2Patched) return;
    loader.__smartAssetV2Patched = true;
    const original = loader.loadImagesForTemplate.bind(loader);
    loader.loadImagesForTemplate = async function patchedLoadImagesForTemplate(template, options = {}) {
      const images = await original(template, options);
      applyTemplate(template);
      if (getSyncMode(template) === 'price') {
        try { await ensureShadow(template, images); } catch (error) { console.warn('[SmartAsset] 陰影建立失敗', error); }
      }
      return images;
    };
  }

  function usageEntries(assetId) {
    if (!assetId) return []; // 空的 assetId 不代表「同一個素材」，不應該比對到任何版位
    return (window.AppState?.templates || []).map((item, index) => ({ item, index, template: item?.data || item }))
      .filter(entry => getAssetId(entry.template) === assetId);
  }
  function syncAll(assetId, config) {
    const normalized = migrateAbsoluteConfig(window.AppState?.template || editing?.template, config);
    registry.set(assetId, clone(normalized));
    persistRegistry();
    usageEntries(assetId).forEach(({ template }) => {
      template.smartAssetConfig = clone(normalized);
      applyTemplate(template, { allowPresetOverride: true });
    });
  }

  // ── 主畫布直接拖曳時的跨版位同步（商品＋價格模式） ──
  // 跟 syncAll 邏輯相同，但多兩件事：
  // 1) 排除「目前正在拖曳的這個版位自己」——它的復原走一般的 HistoryManager push/undo，不需要再處理。
  // 2) 把「同步前」其他版位的完整內容存進 HistoryManager 的 extra，Ctrl+Z 復原這次拖曳時，
  //    其他被同步過去的版位會一起復原，避免版位之間資料不一致。
  // 回傳實際被同步到的版位數，給呼叫端顯示 toast。
  function syncFromMainCanvas(assetId, config, currentTemplate) {
    const normalized = migrateAbsoluteConfig(currentTemplate, config);
    registry.set(assetId, clone(normalized));
    persistRegistry();
    const affected = usageEntries(assetId).filter(({ template }) => template !== currentTemplate);
    const snapshot = affected.map(({ index, template }) => ({ index, data: clone(template) }));
    affected.forEach(({ template }) => {
      template.smartAssetConfig = clone(normalized);
      applyTemplate(template, { allowPresetOverride: true });
    });
    window.HistoryManager?.attachExtra?.(snapshot.length ? snapshot : null);
    markThumbsStale(affected.map(({ index }) => index));
    return affected.length;
  }

  // ── 雙擊編輯價格文字內容時的跨版位同步 ──
  // 價格數字本身（例如把 $40 改成 $400）也是「素材＋價格」智慧型物件的一部分，跟位置/字級一樣，
  // 只是同步的是文字內容，不是框的位置/大小。用「同一個 price slot」比對（single/1/2...），
  // 不受版型（layoutKey）是否相容影響——文字內容跟版型形狀是兩件獨立的事，不像位置/字級
  // 套錯版型會讓排版跑掉，數字本身放到哪種版型都是同一組資料。
  // 回傳實際被同步到的版位數。
  function syncPriceTextFromMainCanvas(key, layer, template = window.AppState?.template) {
    if (layer?.source !== 'auto_price_v2') return 0;
    const product = productEntry(template);
    if (!product) return 0;
    const assetId = product[1].smartAssetId || makeAssetId(product[1].assetFilename);
    if (!assetId) return 0;
    const slot = String(layer.priceSlot || layer.slot || key);
    const newText = layer.text;
    const affected = usageEntries(assetId).filter(({ template: other }) => other !== template);
    const touched = [];
    affected.forEach(({ index, template: other }) => {
      const match = priceEntries(other).find(([otherKey, otherLayer]) => String(otherLayer.priceSlot || otherLayer.slot || otherKey) === slot);
      if (match && match[1].text !== newText) touched.push({ index, template: other, layer: match[1] });
    });
    if (!touched.length) return 0;
    const snapshot = touched.map(({ index, template: other }) => ({ index, data: clone(other) }));
    touched.forEach(({ layer: otherLayer }) => { otherLayer.text = newText; });
    window.HistoryManager?.attachExtra?.(snapshot);
    toastGlobal(`已同步 ${touched.length} 個版位`);
    markThumbsStale(touched.map(({ index }) => index));
    return touched.length;
  }

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
  function applyInspector() {
    if (!editing || editing.selectedType === 'shadow') return;
    const layer = selectedLayer(); if (!layer) return;
    const box = { x: number($('saX').value), y: number($('saY').value), width: Math.max(1, number($('saW').value, 1)), height: Math.max(1, number($('saH').value, 1)) };
    window.NetworkSmartObjectSync?.begin?.(editing.template, editing.selectedKey, { attachHistory: false });
    window.Geometry.applyBox(editing.selectedKey, layer, box); layer.rotation = number($('saRotation').value);
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
      dragState = { mode: handle.type === 'rotate' ? 'rotate' : 'resize', handle: handle.type, start: point, box: clone(box), rotation: number(selectedLayer()?.rotation), altKey: event.altKey };
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
      window.Geometry.applyBox(editing.selectedKey, layer, { x, y, width, height });
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
    window.NetworkSmartObjectSync?.update?.(editing.template, editing.selectedKey);
    captureCurrentBoxes(); renderWorkspace(); syncInspector(); event.preventDefault();
  }
  function onStagePointerUp(event) {
    if (!dragState || (dragState.pointerId != null && event.pointerId !== dragState.pointerId)) return;
    const pointerId = dragState.pointerId;
    const selectedKey = editing?.selectedKey;
    if (editing && selectedKey) window.NetworkSmartObjectSync?.finish?.(editing.template, selectedKey);
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
    window.NetworkSmartObjectSync?.begin?.(editing.template, editing.selectedKey, { attachHistory: false });
    window.Geometry.applyBox(editing.selectedKey, layer, next);
    if (group) {
      const productRotation = number(layer.rotation);
      group.forEach(({ key, type, local }) => {
        const child = editing.template.layers?.[key]; if (!child) return;
        window.Geometry.applyBox(key, child, localToChildBox(local, next, productRotation));
        child.rotation = productRotation + number(local.rotationOffset);
        // V3.1：價格字級不再跟著商品縮放自動調整。
      });
    }
    window.NetworkSmartObjectSync?.update?.(editing.template, editing.selectedKey);
    window.NetworkSmartObjectSync?.finish?.(editing.template, editing.selectedKey);
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
          editing.originalTemplateSnapshot = clone(template);
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
        editing.originalTemplateSnapshot = clone(template);
        renderComponents();
        syncInspector();
        await refreshPreview();
        toast('已還原素材');
      } else {
        window.Renderer.render();
        window.LayerManager.render();
        window.Inspector.render();
        if (window.AppState.batchMode && window.BatchManager?.renderPreviewGrid) {
          await window.BatchManager.renderPreviewGrid({ revealWhenDone: true });
        }
        toastGlobal('已還原素材');
      }
      return;
    }
    const id = (keepOpen && editing?.assetId) || layer?.smartAssetId || makeAssetId(layer?.assetFilename);
    if (id) { registry.delete(id); persistRegistry(); }
    usageEntries(id).forEach(({ template: current }) => {
      delete current.smartAssetConfig; removeShadow(current);
      window.PriceCouponManager?.rebuildFromPricePreset?.(current);
    });
    if (template) {
      delete template.smartAssetConfig; removeShadow(template, keepOpen ? editing.images : window.AppState.images);
      window.PriceCouponManager?.rebuildFromPricePreset?.(template);
    }
    if (keepOpen && editing) {
      editing.config = captureConfig(template, {}); editing.originalTemplateSnapshot = clone(template);
      syncShadowFields(); renderComponents(); syncInspector(); await refreshPreview(); toast('已還原素材');
    } else {
      window.Renderer.render(); window.LayerManager.render(); window.Inspector.render();
      if (window.AppState.batchMode && window.BatchManager?.renderPreviewGrid) await window.BatchManager.renderPreviewGrid({ revealWhenDone: true });
      toastGlobal('已還原素材');
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
    const selectedNetworkProduct = window.NetworkSmartObjectSync?.isEligible?.(key, layer, template) ? [key, layer] : null;
    const product = selectedNetworkProduct || productEntry(template); if (!product) return;
    const assetId = layer.smartAssetId || makeAssetId(layer.assetFilename); layer.smartAssetId = assetId;
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
    registry, makeAssetId, isPlacementGuide, isProduct, applyTemplate, ensureShadow, open, resetAsset,
    beginMainCanvasTransform, updateMainCanvasTransform, finishMainCanvasTransform, smartProductMemberEntries,
    // V1.1 新增：P_範圍多商品圖（P_01/P_02）跨版位同步位置的基礎機制。
    // 目前尚未接上素材中心的編輯 UI（沒有實際模板可驗證），先開放給未來的工作台面板呼叫。
    getSyncMode, productEntries, savePlacementConfig, applyPlacementConfig, layoutProductGrid, syncPriceTextFromMainCanvas,
    isTransformActive, markActiveThumbStale,
  };
  waitForApp();
})();
