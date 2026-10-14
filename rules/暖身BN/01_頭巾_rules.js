/* 01_頭巾 公版規則檔  —  25節 商城狂購節 / [BN] 暖身
 *
 * 對應公版：templates/01_頭巾.json（templateId = "01_頭巾"，canvas 1200x254）
 * 對應工單：【美術工單】2026.5.25商城狂購節_KEN.xlsx → 分頁「BN 暖身」→ 製作內容01「頭巾」
 *
 * 本檔只作用於「01_頭巾」這個公版，不影響其他公版（案件隔離）。
 *
 * 欄位對應（工單「BN 暖身」頭巾區塊）：
 *   L 備註   → 出圖編號（1,2,3,5,6）
 *   M 曝光   → 暖身 / 正式
 *   N logo   → 5.25 logo（固定用 橫式_25號商城狂購節_LOGO_白）
 *   O 副標   → VIP + 其餘字（VIP→蝦皮VIP_LOGO、其餘字→副標題_右，群組中心X對齊橫式LOGO）
 *   P 券文案 → 依換行拆成 券文案_上 / 券文案_下
 *   Q 保護文字→ 代入 保護文字
 *   R CTA    → 點我領 / 看更多 / 兌換完畢（一列展開三張，見 createVariantRecords）
 *   S 券面   → 全站券 / 商城券（顯示對應底圖、隱藏另一張）
 *   T 商品圖1→ P 槽（圖層 key 為 product、psdName 為 P），依素材名替換
 *   U 價格   → 生成價格層（#EE4D2D；含%→雙字級 33.25/26.43pt；含折→單字級 48.8pt；空白略過）
 *
 * 註：解析層(app.core.js)只會擷取到 副標/CTA/商品圖1/價格，
 *     券文案/保護文字/券面 會被丟掉，所以本檔用 blockParser 完整接管頭巾區塊解析。
 */
(function () {
  'use strict';

  // ── 公版內固定圖層 key（直接對應 templates/01_頭巾.json，不做模糊比對）──
  var K = {
    logo: '橫式_25號商城狂購節_LOGO_白',
    vipLogo: '蝦皮VIP_LOGO',
    subRight: '副標題_右',
    subBg: '副標題_底色',
    product: 'product',             // 商品圖1 / P 槽（JSON key；psdName=P，素材依工單替換）
    couponTop: '券文案_上',
    couponBottom: '券文案_下',
    protect: '保護文字',
    ctaClickText: 'CTA_點我領_文案',
    ctaMoreText: 'CTA_看更多_文案',
    ctaDone: 'CTA_兌換完畢',
    ctaBg: 'CTA_BG',
    ctaBg2: 'CTA_BG_2',
    faceAll: '全站券_券面底圖',
    faceMall: '商城券_券面底圖',
  };

  // 副標題內 VIP LOGO 與文字之間的水平間距（工單指定 7px）
  var SUBTITLE_GAP_PX = 7;

  // 素材資料夾（bucket）名稱。
  // V0.9 素材解析由 AssetLookup 單一入口負責：公版專屬素材只查本版位；
  // 商品圖才允許 fallback 到 assets/共用素材/，任何歧義都明確報錯。
  var PRODUCT_ASSET_FOLDER = '共用素材'; // 商品圖（VIP_蝦幣_100.png 等）所在資料夾
  var TEMPLATE_ASSET_FOLDER = '01_頭巾'; // 券面/LOGO/CTA 所在資料夾

  // 價格顏色：工單指定，商品圖1 為 VIP_蝦幣_100 / VIP_單券_蝦幣 / VIP_單券_折扣 時用 #EE4D2D
  var PRICE_COLOR_VIP = '#EE4D2D';
  var PRICE_COLOR_PRODUCTS = ['VIP_蝦幣_100', 'VIP_單券_蝦幣', 'VIP_單券_折扣'];

  // 價格字級（工單指定，pt 與 px 在本公版為 1:1）
  var PRICE_FS_PERCENT_BIG = 33.25;   // 「25%蝦幣」的「25」（大字＝各版面自訂）
  var PRICE_FS_DISCOUNT = 48.8;       // 「8折」

  function toStr(v) { return String(v == null ? '' : v); }
  function trim(v) { return toStr(v).replace(/_x000d_/gi, '\n').trim(); }
  function getLayer(template, key) { return (template && template.layers && template.layers[key]) || null; }
  function show(template, key) { var l = getLayer(template, key); if (l) l.hidden = false; }
  function hide(template, key) { var l = getLayer(template, key); if (l) l.hidden = true; }
  function pad2(n) { return String(Math.max(0, Math.round(Number(n) || 0))).padStart(2, '0'); }

  // ────────────────────────────────────────────────────────────
  // 1) blockParser：完整接管「頭巾」區塊，擷取所有欄位（含被通用解析器丟掉的欄）
  // ────────────────────────────────────────────────────────────
  function blockParser(ctx) {
    var rows = ctx.rows || [];
    var header = ctx.header || {};
    var headerRow = Number(header.headerRow || 0);
    var startRow = Number(ctx.rowIndex || headerRow + 1);
    var endRow = Number(ctx.nextHeaderRow || rows.length);

    var head = rows[headerRow] || [];
    var norm = function (v) { return toStr(v).toLowerCase().replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.]+/g, ''); };

    // 依表頭文字定位欄位索引；「備註」取最左邊那一欄（數字編號），避免抓到右側的自由備註欄。
    function findCol(pred) {
      for (var c = 0; c < head.length; c++) { if (pred(norm(head[c]), toStr(head[c]))) return c; }
      return -1;
    }
    var col = {
      no:      findCol(function (n) { return n === '備註'; }),               // L 備註（編號）
      expose:  findCol(function (n) { return n === '曝光'; }),               // M 曝光
      sub:     findCol(function (n) { return n.indexOf('副標') === 0; }),    // O 副標
      coupon:  findCol(function (n) { return n.indexOf('券文案') >= 0; }),   // P 券文案
      protect: findCol(function (n) { return n.indexOf('保護文字') >= 0; }), // Q 保護文字
      cta:     findCol(function (n) { return n.indexOf('cta') >= 0; }),      // R CTA
      face:    findCol(function (n) { return n.indexOf('券面') >= 0; }),     // S 券面
      product: findCol(function (n) { return n.indexOf('商品圖1') >= 0; }),  // T 商品圖1
      price:   findCol(function (n) { return n === '價格'; }),               // U 價格
    };

    var cell = function (row, c) { return c >= 0 ? (row[c] != null ? row[c] : '') : ''; };
    var records = [];

    for (var r = startRow; r < endRow; r++) {
      var row = rows[r] || [];
      var expose = trim(cell(row, col.expose));
      var noRaw = cell(row, col.no);
      var noNum = Number(String(noRaw).trim());
      // 有效頭巾資料列：曝光為「暖身/正式」且備註為數字（可排除第7列的 "VIP icon請參考>>" 說明列）
      if ((expose !== '暖身' && expose !== '正式') || !isFinite(noNum) || String(noRaw).trim() === '') continue;

      records.push({
        // ↓ 引擎 this.fields 認得的欄位（確保 hasAnyContent 通過、價格引擎可運作）
        '副標': trim(cell(row, col.sub)),
        '商品圖1': trim(cell(row, col.product)),
        '價格': trim(cell(row, col.price)),
        // ↓ 本公版自訂欄位（由 afterApplyRecordToTemplate / createVariantRecords 使用）
        '券文案': trim(cell(row, col.coupon)),   // 保留換行
        '保護文字': trim(cell(row, col.protect)),
        '券面': trim(cell(row, col.face)),
        '__ctaRaw': trim(cell(row, col.cta)),    // "點我領\n看更多\n兌換完畢"
        '__曝光': expose,
        '__備註No': noNum,
      });
    }

    if (!records.length) return null; // 交還給通用解析
    return { records: records, templateType: 'headband_bn_warmup' };
  }

  // ────────────────────────────────────────────────────────────
  // 2) createVariantRecords：CTA 一列展開三張（點我領 / 看更多 / 兌換完畢）
  //    檔名／預覽名：01_頭巾_<曝光>_<備註兩位>_<CTA動作>
  // ────────────────────────────────────────────────────────────
  function createVariantRecords(record) {
    var actions = toStr(record.__ctaRaw).split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!actions.length) actions = ['點我領']; // 保底：至少出一張
    var expose = trim(record.__曝光) || '暖身';
    var noStr = pad2(record.__備註No);

    return actions.map(function (action) {
      var variant = {};
      for (var k in record) { if (Object.prototype.hasOwnProperty.call(record, k)) variant[k] = record[k]; }
      // 不放 'CTA' 欄位，避免引擎把多行 CTA 文字誤塞進 CTA 文字圖層；CTA 由 afterApply 依 __ctaState 控制顯隱。
      variant.__ctaState = action;
      variant.__outputName = '01_頭巾_' + expose + '_' + noStr + '_' + action;
      variant.__outputSuffix = action;
      return variant;
    });
  }

  // ────────────────────────────────────────────────────────────
  // 3) priceRules：只負責「觸發價格層生成 + 指定商品圖 anchor」
  //    實際字級／雙字級／顏色／位置由 afterApplyRecordToTemplate 精修。
  // ────────────────────────────────────────────────────────────
  function baseLayout() {
    return {
      slot: 'single',
      psdName: '價格',
      followProduct: true,
      positioningMode: 'product-image-ratio',
      anchorRatioX: 0.5,
      anchorRatioY: 0.5,
      rotationOffset: 0,
      fontSizePx: PRICE_FS_PERCENT_BIG,
      color: PRICE_COLOR_VIP,
      width: 180,
      autoHeightFromFont: true,
      heightMultiplier: 1.35,
      lineHeightMultiplier: 1.08,
      preserveExactSize: false,
      skipAutoScale: false,
      disableContentScale: false,
    };
  }

  var priceRules = {
    anchorLayerNames: ['product', 'P', '商品圖1', '曝品'],
    templateLayouts: {
      '01_頭巾': { layoutKey: 'singleCoupon', layouts: [baseLayout()] },
      '頭巾': { layoutKey: 'singleCoupon', layouts: [baseLayout()] },
    },
    // 素材名稱含「雙券」或價格本身含兩段時，由核心將單價格版型展開為上下兩層。
    doublePrice: {
      enabled: true,
      verticalOffsetRatio: 0.25,
      slots: {
        bottom: { psdName: '價格_下', rotationOffset: 2 },
        top: { psdName: '價格_上', rotationOffset: -6 },
      },
    },
    // 字級只由 Rule 配置；核心負責切字、基線與縮放。
    typography: {
      defaultBigFontSize: PRICE_FS_PERCENT_BIG,
      smallRatio: 0.795,
      bigTokens: ['現折', '回饋'],
      smallTokens: ['蝦幣', '折', '起'],
      defaultSize: 'big',
      fontSizeRules: [
        { regex: '[$＄%％]', fontSizePx: PRICE_FS_PERCENT_BIG },
        { regex: '折', fontSizePx: PRICE_FS_DISCOUNT },
        { default: true, fontSizePx: PRICE_FS_PERCENT_BIG },
      ],
    },
    colorRules: [
      { regex: '^VIP[_ ]', flags: 'i', color: PRICE_COLOR_VIP },
    ],
  };

  // ────────────────────────────────────────────────────────────
  // 4) beforeApplyRecordToTemplate：標記商品圖角色，並啟用同公版＋同素材的智慧物件同步
  // ────────────────────────────────────────────────────────────
  function beforeApplyRecordToTemplate(args) {
    var template = args.template;
    var p = getLayer(template, K.product);
    if (p) p.role = '商品圖1';

    // 商品跨版位同步由 SmartAssetManager 依實際來源 / smartAssetGroup 統一負責；
    // Rule 不再用 same-template scope 限制跨尺寸或跨版位同步。
    template.smartAssetPolicy = Object.assign({}, template.smartAssetPolicy, {
      productTransformIdentity: '01_頭巾',
    });
    delete template.smartAssetPolicy.productTransformScope;
    delete template.smartAssetPolicy.priceTransformScope;
    // 副標題_底色（六角形）改於 afterApply 依副標群組寬自動伸縮建立（見 applySubtitleBg）。
  }

  // 副標題_底色（六角形）自動伸縮：
  //   主標寬 = 橫式LOGO 寬；副標寬 = 副標群組寬；依 SP 標準 capsuleWidth 算出底色寬，
  //   置中於 LOGO 中心X，並依新寬重建六角形頂點。
  function applySubtitleBg(template, subtitleGroupWidth) {
    var L = getLayer(template, K.subBg);
    if (!L) return;
    var logo = getLayer(template, K.logo);
    var titleWidth = logo ? (Number(logo.width) || 0) : 0; // 主標＝橫式LOGO 寬
    var height = Number(L.height) || 62;

    var width;
    var S = window.SPTextStandard;
    if (S && S.capsuleWidth) {
      width = S.capsuleWidth({ titleWidth: titleWidth, subtitleWidth: Number(subtitleGroupWidth) || 0, height: height });
    } else {
      // 保底：主標明顯較寬(≥60)→等寬主標；否則副標寬+左右各40
      var s = Number(subtitleGroupWidth) || 0;
      width = (titleWidth - s >= 60) ? titleWidth : (s + 80);
    }
    buildHexagonBg(template, width);
  }

  // 依「目標寬度」建立橫向六角形，置中於 橫式LOGO 中心X、維持底色原高度與中心Y。
  function buildHexagonBg(template, targetWidth) {
    var L = getLayer(template, K.subBg);
    if (!L) return;
    var logo = getLayer(template, K.logo);
    var manual = L.__manualOverrides || {};
    var h = manual.height ? (Number(L.height) || 62) : (Number(L.height) || 62);
    var requestedW = Math.max(1, Number(targetWidth) || Number(L.width) || 0);
    var w = manual.width ? Math.max(1, Number(L.width) || requestedW) : requestedW;
    if (!(w > 0 && h > 0)) return;

    var desiredCx = logo ? (Number(logo.centerX) || (Number(logo.x || 0) + Number(logo.width || 0) / 2))
                         : (Number(L.centerX) || (Number(L.x || 0) + Number(L.width || 0) / 2));
    var existingX = Number(L.x || 0);
    var x = manual.x ? existingX : desiredCx - w / 2;
    var cx = manual.centerX ? Number(L.centerX || (x + w / 2)) : (manual.x ? x + w / 2 : desiredCx);
    var existingY = Number(L.y || 0);
    var existingCy = Number(L.centerY);
    if (!isFinite(existingCy)) existingCy = existingY + h / 2;
    var y = manual.y ? existingY : existingCy - h / 2;
    var cy = manual.centerY ? existingCy : y + h / 2;

    var pw = Math.min(Math.round(h * 0.29), Math.floor(w / 2)); // 尖角水平深度 ≈0.29×高度（越小越鈍）
    var midY = cy;
    var corners = [
      { x: x + pw, y: y },        // 上-左
      { x: x + w - pw, y: y },    // 上-右
      { x: x + w, y: midY },      // 右尖角
      { x: x + w - pw, y: y + h },// 下-右
      { x: x + pw, y: y + h },    // 下-左
      { x: x, y: midY }           // 左尖角
    ];
    // drawPathFallback 需要至少一個點帶方向才會走 path；控制點設在頂點本身 → 每段直線。
    var vp = corners.map(function (p) {
      return { anchor: { x: p.x, y: p.y }, leftDirection: { x: p.x, y: p.y }, rightDirection: { x: p.x, y: p.y } };
    });
    var fill = L.fill || (L.shape && L.shape.fill) || '#113366';

    L.x = round2(x); L.y = round2(y); L.width = round2(w); L.height = round2(h);
    L.centerX = round2(cx); L.centerY = round2(cy);
    L.type = 'shape';
    L.shape = L.shape || {};
    L.shape.kind = 'path';
    L.shape.vectorPath = vp;
    L.shape.bezierPoints = vp;
    L.shape.fill = fill;
    L.fill = fill;
    if (L.shape.geometry) { try { delete L.shape.geometry; } catch (e) {} }
    L.useDynamicBounds = true;
  }
  function round2(n) { return Math.round(Number(n) * 100) / 100; }

  // ────────────────────────────────────────────────────────────
  // 5) afterApplyRecordToTemplate：副標群組 / 券文案 / 保護文字 / 券面 / CTA顯隱 / 價格精修
  // ────────────────────────────────────────────────────────────
  function afterApplyRecordToTemplate(args) {
    var template = args.template;
    var record = args.record || (template && template.batchRecord) || {};
    var helpers = args.helpers || {};
    var diagnostics = args.diagnostics;
    var round = helpers.round || function (n) { return Math.round(Number(n) * 100) / 100; };

    resolveProductAsset(template, record, diagnostics);
    var subtitleGroupWidth = applySubtitle(template, record, helpers, round);
    applyCouponText(template, record);
    applyProtectText(template, record);
    applyCouponFace(template, record);
    applyCtaState(template, record);
    applySubtitleBg(template, subtitleGroupWidth); // 副標題_底色（六角形）依副標群組寬自動伸縮
    // Placement Preset is applied centrally by BatchManager before this dynamic after-hook.
  }

  // 5a. 副標：VIP → 蝦皮VIP_LOGO，其餘字 → 副標題_右，群組中心X對齊 橫式LOGO 中心X
  function applySubtitle(template, record, helpers, round) {
    var subRight = getLayer(template, K.subRight);
    var vipLogo = getLayer(template, K.vipLogo);
    var logo = getLayer(template, K.logo);
    if (!subRight) return 0;

    var raw = trim(record['副標']);
    var hasVip = /^vip/i.test(raw);
    var restText = hasVip ? raw.replace(/^vip\s*/i, '') : raw;

    subRight.text = restText;
    subRight.hidden = false;
    if (vipLogo) vipLogo.hidden = !hasVip;
    // 頭巾副標會立刻量測並驅動六角底色，因此必須在量測前先套全域非價格文字標準。
    window.SPTextStandard?.applyNonPriceTextLayer?.(subRight, K.subRight);

    // 量測其餘字實際寬度（與 Renderer 繪製一致）
    var textW = (typeof helpers.measureTextWidth === 'function')
      ? Number(helpers.measureTextWidth(subRight)) || 0
      : Number(subRight.width) || 0;

    var logoCenterX = logo
      ? (Number(logo.centerX) || (Number(logo.x || 0) + Number(logo.width || 0) / 2))
      : 275.5;

    var subtitleGroupWidth = textW;
    if (hasVip && vipLogo) {
      var vipW = Number(vipLogo.width) || 0;
      var groupW = vipW + SUBTITLE_GAP_PX + textW;
      subtitleGroupWidth = groupW;
      var left = logoCenterX - groupW / 2;
      // VIP LOGO（維持原尺寸與 Y，只調 X）
      vipLogo.x = round(left, 2);
      vipLogo.centerX = round(left + vipW / 2, 2);
      // 其餘字（align=left，起點在 VIP LOGO 右側 + 間距）
      var textX = left + vipW + SUBTITLE_GAP_PX;
      subRight.x = round(textX, 2);
      subRight.width = round(textW, 2);
      subRight.centerX = round(textX + textW / 2, 2);
    } else {
      // 無 VIP：其餘字整體置中對齊 橫式LOGO 中心X
      var tx = logoCenterX - textW / 2;
      subRight.x = round(tx, 2);
      subRight.width = round(textW, 2);
      subRight.centerX = round(tx + textW / 2, 2);
    }
    // 副標題_底色由 applySubtitleBg 依此群組寬自動伸縮（見 afterApply）。
    return subtitleGroupWidth;
  }

  // Canvas 手動修改副標文字時，只刷新與副標明確綁定的群組置中與六角底色。
  function onTextChanged(args) {
    var template = args && args.template;
    var key = args && args.key;
    if (!template || key !== K.subRight) return;
    var helpers = args.helpers || {};
    var subRight = getLayer(template, K.subRight);
    var vipLogo = getLayer(template, K.vipLogo);
    var logo = getLayer(template, K.logo);
    if (!subRight) return;
    var measure = typeof helpers.measureTextWidth === 'function' ? helpers.measureTextWidth : function (layer) { return Number(layer && layer.width) || 0; };
    var manual = subRight.__manualOverrides || {};
    var measured = Math.max(1, Number(measure(subRight)) || Number(subRight.width) || 1);
    if (!manual.width) subRight.width = round2(measured);
    var textW = Number(subRight.width) || measured;
    var centerX = logo ? (Number(logo.centerX) || (Number(logo.x || 0) + Number(logo.width || 0) / 2)) : 275.5;
    var hasVip = !!(vipLogo && !vipLogo.hidden);
    var groupWidth = textW;
    if (hasVip) {
      var vipW = Number(vipLogo.width) || 0;
      groupWidth = vipW + SUBTITLE_GAP_PX + textW;
      var left = centerX - groupWidth / 2;
      var vipManual = vipLogo.__manualOverrides || {};
      if (!vipManual.x) vipLogo.x = round2(left);
      if (!vipManual.centerX) vipLogo.centerX = round2(Number(vipLogo.x || left) + vipW / 2);
      if (!manual.x) subRight.x = round2(left + vipW + SUBTITLE_GAP_PX);
      if (!manual.centerX) subRight.centerX = round2(Number(subRight.x || 0) + textW / 2);
    } else {
      if (!manual.x) subRight.x = round2(centerX - textW / 2);
      if (!manual.centerX) subRight.centerX = round2(Number(subRight.x || 0) + textW / 2);
    }
    applySubtitleBg(template, groupWidth);
  }

  // 5b. 券文案：依換行拆成 上 / 下
  function applyCouponText(template, record) {
    var parts = toStr(record['券文案']).split('\n').map(function (s) { return s.trim(); });
    var top = getLayer(template, K.couponTop);
    var bottom = getLayer(template, K.couponBottom);
    if (top) { top.text = parts[0] || ''; top.hidden = !(parts[0] && parts[0].length); }
    if (bottom) { bottom.text = parts[1] || ''; bottom.hidden = !(parts[1] && parts[1].length); }
  }

  // 5c. 保護文字
  function applyProtectText(template, record) {
    var layer = getLayer(template, K.protect);
    if (!layer) return;
    var v = trim(record['保護文字']);
    if (v) { layer.text = v; layer.hidden = false; }
  }

  // 5d. 券面：全站券 / 商城券 顯示對應底圖、隱藏另一張，並解析真實素材檔名
  function applyCouponFace(template, record) {
    var face = trim(record['券面']);
    if (face.indexOf('全站') >= 0) { show(template, K.faceAll); hide(template, K.faceMall); resolveFaceAsset(template, record, K.faceAll); }
    else if (face.indexOf('商城') >= 0) { show(template, K.faceMall); hide(template, K.faceAll); resolveFaceAsset(template, record, K.faceMall); }
  }

  // 券面底圖圖層不會經過引擎的 findAssetFilename（引擎只解析商品圖/CTA），
  // 且公版 JSON 的 assetFilename 帶了「01_頭巾_」前綴、實際素材檔可能無前綴。
  // 這裡以圖層 psdName、明確指定資料夾解析真實檔名（前綴/無前綴皆可命中）。
  function resolveFaceAsset(template, record, key) {
    var layer = getLayer(template, key);
    if (!layer) return;
    var hit = resolveAssetFromFolders(template, record, layer.psdName || key, layer, '券面',
      [TEMPLATE_ASSET_FOLDER]); // 券面在 01_頭巾/
    if (hit) {
      layer.assetFilename = hit.filename;
      layer.assetProject = hit.project; // 讓 loadImagesForTemplate 也用同一 bucket 載入
      layer.__assetMissing = false;
    }
  }

  // 商品圖遵守中央素材邊界：先找本版位資料夾，再允許 fallback 到共用素材；不掃描其他公版資料夾。
  function resolveProductAsset(template, record, diagnostics) {
    var layer = getLayer(template, K.product);
    if (!layer) return;
    var name = trim(record['商品圖1']);
    if (!name) return;
    if (String(layer.assetFilename || '').trim()) return; // 引擎已成功解析，不覆蓋

    var hit = resolveAssetFromFolders(template, record, name, layer, '商品圖1',
      [TEMPLATE_ASSET_FOLDER, PRODUCT_ASSET_FOLDER]);
    if (!hit) {
      // 找不到：不靜默替換成錯誤素材；但在診斷附上「目前素材庫概況」，
      // 讓素材檢查能直接判斷是「檔案根本沒載入」還是其他問題。
      annotateMissingWithAssetSummary(diagnostics, name);
      return;
    }

    layer.assetFilename = hit.filename;
    layer.assetProject = hit.project;
    layer.role = 'product';
    layer.keepAspectRatio = true;
    layer.__assetMissing = false;
    try {
      var sid = window.SmartAssetManager && window.SmartAssetManager.makeAssetId && window.SmartAssetManager.makeAssetId(hit.filename, { folder: hit.project, layer: layer, template: template });
      if (sid) layer.smartAssetId = sid;
    } catch (e) {}

    // 修正素材檢查診斷：把該筆 商品圖1 的 missing 換成 ok（避免顯示假警告）
    if (Array.isArray(diagnostics)) {
      for (var i = 0; i < diagnostics.length; i++) {
        var d = diagnostics[i];
        if (d && d.field === '商品圖1' && String(d.status || '').indexOf('missing') === 0) {
          d.status = 'ok'; d.filename = hit.filename; if (d.attempts) delete d.attempts;
        }
      }
    }
  }

  // Rule 不自行掃描素材庫；只把允許的資料夾逐一交給中央 AssetLookup。
  // 商品圖是否能 fallback 到共用素材，由中央 classifyAssetRole / AssetLookup 統一決定。
  function resolveAssetFromFolders(template, record, name, layer, layerKey, preferFolders) {
    var BM = window.BatchManager;
    if (!name || !BM || typeof BM.findAssetFilename !== 'function') return null;
    var folders = [];
    var push = function (f) { f = String(f == null ? '' : f).trim(); if (f && folders.indexOf(f) < 0) folders.push(f); };
    (preferFolders || []).forEach(push);
    for (var i = 0; i < folders.length; i++) {
      var res = BM.findAssetFilename(name, { project: folders[i], template: template, layer: layer, layerKey: layerKey });
      if (res && res.found && res.filename) return { filename: res.filename, project: res.folder || folders[i] };
    }
    return null;
  }

  // 商品圖找不到時，把「目前載入的素材庫概況」寫進該筆 missing 診斷的 value，
  // 讓素材檢查一眼看出是「完全沒載入素材」還是「有載入但缺這個檔」。
  function annotateMissingWithAssetSummary(diagnostics, name) {
    if (!Array.isArray(diagnostics)) return;
    var summary;
    try {
      var af = window.AppState && window.AppState.assetFiles;
      if (!af || typeof af.forEach !== 'function' || af.size === 0) {
        summary = '未載入任何素材';
      } else {
        var parts = [], total = 0;
        af.forEach(function (bucket, folder) {
          var n = (bucket && bucket.size) || 0; total += n;
          parts.push((folder || '(根目錄)') + ':' + n);
        });
        summary = '已載入bucket[' + parts.join('、') + ']共' + total + '檔';
      }
    } catch (e) { summary = '素材庫讀取失敗'; }
    for (var i = 0; i < diagnostics.length; i++) {
      var d = diagnostics[i];
      if (d && d.field === '商品圖1' && String(d.status || '').indexOf('missing') === 0
        && String(d.value || '').indexOf('｜') < 0) {
        d.value = String(d.value || name) + '｜' + summary;
      }
    }
  }

  // 5e. CTA：依 __ctaState 顯示/隱藏；CTA_BG_2 一律隱藏（案 B）
  function applyCtaState(template, record) {
    var state = trim(record['__ctaState']);
    hide(template, K.ctaBg2); // 恆隱
    if (state === '點我領') {
      show(template, K.ctaClickText); show(template, K.ctaBg);
      hide(template, K.ctaMoreText); hide(template, K.ctaDone);
    } else if (state === '看更多') {
      show(template, K.ctaMoreText); show(template, K.ctaBg);
      hide(template, K.ctaClickText); hide(template, K.ctaDone);
    } else if (state === '兌換完畢') {
      show(template, K.ctaDone);
      hide(template, K.ctaClickText); hide(template, K.ctaMoreText); hide(template, K.ctaBg);
    }
  }

  // ── 註冊 ──
  window.TemplateRuleRegistry.register('headband_25_bn_warmup', {
    label: '25節 暖身 頭巾',
    // tokens：比對「工單製作物名稱」用（引擎 findTemplateRuleForName 只認 tokens）。
    //         頭巾區塊的製作物名稱（錨點格）是「頭巾」。
    tokens: ['頭巾'],
    // targets：比對「已載入公版名稱/templateId」用（findTemplateForName 第二段）。
    targets: ['01_頭巾', '頭巾'],
    priority: 10,
    dynamicLayout: true,
    rules: {
      blockParser: blockParser,
      createVariantRecords: createVariantRecords,
      priceRules: priceRules,
      // 頭巾 CTA 由本 Rule 的 __ctaState / applyCtaState 完整管理；Core 不得再拿既有 CTA 圖層重跑素材搜尋。
      ctaPolicy: { mode: 'rule-managed', imageValues: [], fallbackToText: true, templateAssetFolder: TEMPLATE_ASSET_FOLDER },
      beforeApplyRecordToTemplate: beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: afterApplyRecordToTemplate,
      onTextChanged: onTextChanged,
    },
  });

  // 版本標記：在 Console 執行 window.__HEADBAND_RULE_VERSION 可確認目前載入的規則版本。
  window.__HEADBAND_RULE_VERSION = '2026-08-11a｜全公版非價格文字82%符號標準＋頭巾量測前同步';
})();
