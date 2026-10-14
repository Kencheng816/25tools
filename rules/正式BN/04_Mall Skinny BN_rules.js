/* 04_Mall Skinny BN 公版規則（25節 正式，2026-08-13）
 *
 * 邏輯與 SKBN_APP/PC 相同精神：工單每 3 列（位置 左→中→右）組成一組完整 1200x360 Banner，組序 01 起。
 * 三格各自獨立：文案（單行白字，字級照 JSON）＋商品圖 P ＋價格。
 *
 * 差異特例（依模板圖層與工單）：
 * - 左格：文案含「蝦皮直營」→ 顯示 蝦皮直營_LOGO ＋ 蝦皮直營_左邊_文案_右（餘文），隱藏 左邊_文案。
 * - 中格：文案含「VIP」→ 顯示 蝦皮VIP_LOGO ＋ 蝦皮VIP_中間_文案_左/右（VIP 左右切分），隱藏 中間_文案。
 * - 右格：純文字 右邊_文案（無 LOGO 特例）。
 * - 三格商品圖1 → 左邊_P／中間_P／右邊_P，有資料代入、無資料隱藏（同 P 圖層邏輯）。
 * - 三格價格 → 由 PriceCouponManager.priceSlots 各自錨定對應 P，可拖曳/連動/校正。
 * - KV_BG 預設鎖定。
 * - 輸出：整張 1200x360 JPG，資料夾 04_Mall Skinny BN/。
 */
(function registerMallSkinnyBnRule() {
  'use strict';

  function toStr(v) { return String(v == null ? '' : v); }
  function trim(v) { return toStr(v).replace(/_x000d_/gi, '\n').trim(); }
  function round2(v) { return Math.round(Number(v) * 100) / 100; }
  function pad2(v) { return String(Math.max(0, Math.round(Number(v) || 0))).padStart(2, '0'); }
  function getLayer(t, k) { return t && t.layers && k ? t.layers[k] || null : null; }
  function hide(t, k) { var l = getLayer(t, k); if (l) l.hidden = true; }

  function splitVip(text) {
    var v = trim(text);
    var m = /vip/i.exec(v);
    if (!m) return null;
    return { left: trim(v.slice(0, m.index)), right: trim(v.slice(m.index + m[0].length)) };
  }

  function resolveAsset(template, name, layer, layerKey, folders) {
    var bm = window.BatchManager;
    if (!name || !bm || typeof bm.findAssetFilename !== 'function') return null;
    for (var i = 0; i < folders.length; i += 1) {
      var folder = trim(folders[i]);
      var r = bm.findAssetFilename(name, { project: folder, template: template, layer: layer, layerKey: layerKey });
      if (r && r.found && r.filename) return { filename: r.filename, project: r.folder || folder };
    }
    return null;
  }

  function ensureCenterSnapshot(template, keys) {
    if (!template.__mallCenterSnapshot) {
      var snap = {};
      keys.forEach(function (k) {
        var l = getLayer(template, k);
        if (l) snap[k] = Number(l.centerX) || ((Number(l.x) || 0) + (Number(l.width) || 0) / 2);
      });
      template.__mallCenterSnapshot = snap;
    }
    return template.__mallCenterSnapshot;
  }

  function setText(template, key, text, helpers, snap) {
    var l = getLayer(template, key);
    if (!l) return null;
    var v = trim(text);
    if (!v) { l.hidden = true; l.text = ''; return null; }
    l.hidden = false;
    l.text = v;
    l.__disableGlobalTextStandard = true; // Mall 單行白字，不吃全域 82% 標準。
    l.textVerticalAlign = 'source-baseline';
    var measure = helpers && typeof helpers.measureTextWidth === 'function' ? helpers.measureTextWidth : null;
    if (measure) {
      var w = Number(measure(l));
      if (isFinite(w) && w > 0) {
        var manual = l.__manualOverrides || {};
        if (!manual.width) l.width = round2(w);
        var cx = snap && isFinite(snap[key]) ? snap[key] : (Number(l.centerX) || 0);
        l.align = 'center';
        if (!manual.x) l.x = round2(cx - w / 2);
        if (!manual.centerX) l.centerX = round2(cx);
      }
    }
    return l;
  }

  function setGroupCentered(template, partKeys, snap, centerX, gap) {
    var parts = partKeys
      .map(function (k) { return { key: k, layer: getLayer(template, k) }; })
      .filter(function (p) { return p.layer && p.layer.hidden !== true; });
    if (!parts.length) return;
    var widths = parts.map(function (p) { return Math.max(0, Number(p.layer.width) || 0); });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (parts.length - 1);
    var cursor = centerX - total / 2;
    parts.forEach(function (p, i) {
      var manual = p.layer.__manualOverrides || {};
      if (p.layer.type === 'text') p.layer.align = 'left';
      if (!manual.x) p.layer.x = round2(cursor);
      if (!manual.centerX) p.layer.centerX = round2(cursor + widths[i] / 2);
      cursor += widths[i] + gap;
    });
  }

  var LAYER = {
    kvBg: 'kv_bg',
    left: '左邊_文案', leftP: '左邊_P',
    directLogo: '蝦皮直營_LOGO', directRight: '蝦皮直營_左邊_文案_右',
    mid: '中間_文案', midP: '中間_P',
    vipLogo: '蝦皮VIP_LOGO', vipLeft: '蝦皮VIP_中間_文案_左', vipRight: '蝦皮VIP_中間_文案_右',
    right: '右邊_文案', rightP: '右邊_P',
  };
  var TEXT_KEYS = [LAYER.left, LAYER.directRight, LAYER.mid, LAYER.vipLeft, LAYER.vipRight, LAYER.right];
  var GROUP_GAP = 8;
  var TEMPLATE_ASSET_FOLDER = '04_Mall Skinny BN';

  function blockParser(ctx) {
    var rows = ctx.rows || [];
    var header = ctx.header || {};
    var headerRow = Number(header.headerRow || 0);
    var endRow = Number(ctx.nextHeaderRow || rows.length);
    var head = rows[headerRow] || [];
    var normalizeHeader = function (v) { return toStr(v).toLowerCase().replace(/[\s 　\t\r\n_\-+()（）\[\]【】.]+/g, ''); };
    var findColumn = function (pred) { for (var c = 0; c < head.length; c += 1) { if (pred(normalizeHeader(head[c]))) return c; } return -1; };
    var col = {
      no: findColumn(function (n) { return n === '備註'; }),
      code: findColumn(function (n) { return n === '編號'; }),
      expose: findColumn(function (n) { return n === '曝光'; }),
      position: findColumn(function (n) { return n.indexOf('位置') === 0; }),
      copy: findColumn(function (n) { return n.indexOf('文案') === 0; }),
      product: findColumn(function (n) { return n.indexOf('商品圖1') >= 0; }),
      price: findColumn(function (n) { return n === '價格'; }),
    };
    var read = function (row, c) { return c >= 0 && row[c] != null ? row[c] : ''; };
    var pos = function (v) { var t = trim(v); if (t.indexOf('左') >= 0) return '左'; if (t.indexOf('中') >= 0) return '中'; if (t.indexOf('右') >= 0) return '右'; return ''; };

    var entries = [];
    for (var r = headerRow + 1; r < endRow; r += 1) {
      var row = rows[r] || [];
      var exposure = trim(read(row, col.expose));
      var note = trim(read(row, col.no));
      if (exposure !== '暖身' && exposure !== '正式') continue;
      if (!isFinite(Number(note)) || note === '') continue;
      entries.push({
        row: r + 1, position: pos(read(row, col.position)),
        copy: trim(read(row, col.copy)), product: trim(read(row, col.product)), price: trim(read(row, col.price)),
        code: trim(read(row, col.code)),
      });
    }
    if (!entries.length) return null;
    if (entries.length % 3 !== 0) {
      throw new Error('25節 正式 Mall Skinny BN：工單列數 ' + entries.length + ' 不是 3 的倍數，無法組成完整左/中/右群組（起始列 ' + entries[0].row + '）');
    }
    var records = [];
    for (var g = 0; g < entries.length / 3; g += 1) {
      var trio = entries.slice(g * 3, g * 3 + 3);
      var expect = ['左', '中', '右'];
      for (var p = 0; p < 3; p += 1) {
        if (trio[p].position !== expect[p]) {
          throw new Error('25節 正式 Mall Skinny BN：Excel 第 ' + trio[p].row + ' 列位置應為「' + expect[p] + '」，實際為「' + trio[p].position + '」，無法分組');
        }
      }
      records.push({
        '左文案': trio[0].copy, '中文案': trio[1].copy, '右文案': trio[2].copy,
        '左商品圖': trio[0].product, '中商品圖': trio[1].product, '右商品圖': trio[2].product,
        '左價格': trio[0].price, '中價格': trio[1].price, '右價格': trio[2].price,
        '商品圖1': trio[0].product, // 供引擎泛用欄位參考
        '__曝光': trio[0].__曝光 || '正式',
        '__備註No': String(g + 1),
        '__編號': trio.map(function (e) { return e.code; }).filter(Boolean).join('、'),
        '__sourceRow': trio[0].row,
        '__sourceRows': trio.map(function (e) { return e.row; }),
        '__sourceName': trim(ctx.productName || 'Mall Skinny BN'),
      });
    }
    return { records: records, templateType: 'mall_skinny_bn_formal' };
  }

  function createVariantRecords(record) {
    var v = {};
    Object.keys(record || {}).forEach(function (k) { v[k] = record[k]; });
    v.__outputName = 'Mall_Skinny_BN_' + pad2(record && record.__備註No);
    v.__outputSuffix = pad2(record && record.__備註No);
    return [v];
  }

  function applyCell(template, cellProduct, pKey, diagnostics, field) {
    var layer = getLayer(template, pKey);
    if (!layer) return;
    var name = trim(cellProduct);
    if (!name) { layer.hidden = true; return; }
    layer.hidden = false;
    layer.role = '商品圖1';
    var hit = resolveAsset(template, name, layer, field, [TEMPLATE_ASSET_FOLDER, '共用素材']);
    if (hit) {
      layer.assetFilename = hit.filename; layer.assetProject = hit.project; layer.__assetMissing = false;
      // 2026-08-14：素材依原始長寬比等比縮放至 P 框內（contain，不裁切不變形），可手動再調整。
      // 以圖層自身 JSON 框為基準，設 keepAspectRatio + containByPBox（渲染時 getRenderedImageBox 會等比 contain）。
      var bm = window.BatchManager;
      if (bm && typeof bm.getProductImageBoxFromLayer === 'function' && typeof bm.applyProductImageBox === 'function') {
        var box = bm.getProductImageBoxFromLayer(layer);
        if (box) bm.applyProductImageBox(layer, box);
      } else {
        layer.keepAspectRatio = true;
        layer.sizingMode = 'containByPBox';
        layer.targetWidth = Number(layer.width) || 0;
        layer.targetHeight = Number(layer.height) || 0;
        layer.maxTargetHeight = Number(layer.height) || 0;
      }
      if (Array.isArray(diagnostics)) diagnostics.push({ field: field, status: 'ok', value: name, filename: hit.filename });
    } else if (Array.isArray(diagnostics)) {
      diagnostics.push({ field: field, status: 'missing', value: name, target: pKey });
    }
  }

  function beforeApplyRecordToTemplate(args) {
    var template = args.template;
    var kv = getLayer(template, LAYER.kvBg);
    if (kv && kv.locked === undefined) kv.locked = true;
    [LAYER.leftP, LAYER.midP, LAYER.rightP].forEach(function (k) { var l = getLayer(template, k); if (l) l.role = '商品圖1'; });
  }

  function afterApplyRecordToTemplate(args) {
    var template = args.template;
    var record = args.record || {};
    var helpers = args.helpers || {};
    var diagnostics = args.diagnostics;
    var snap = ensureCenterSnapshot(template, TEXT_KEYS);

    // KV_BG 素材
    var kv = getLayer(template, LAYER.kvBg);
    if (kv) {
      var kvHit = resolveAsset(template, TEMPLATE_ASSET_FOLDER + '_KV_BG', kv, 'KV_BG', [TEMPLATE_ASSET_FOLDER]);
      if (kvHit) { kv.assetFilename = kvHit.filename; kv.assetProject = kvHit.project; kv.__assetMissing = false; }
    }
    // 固定 LOGO 素材
    var dLogo = getLayer(template, LAYER.directLogo);
    if (dLogo) { dLogo.assetFilename = '蝦皮直營_LOGO.svg'; dLogo.assetProject = ''; dLogo.__assetMissing = false; }
    var vLogo = getLayer(template, LAYER.vipLogo);
    if (vLogo) { vLogo.assetFilename = '蝦皮VIP_LOGO.svg'; vLogo.assetProject = ''; vLogo.__assetMissing = false; }

    // 三格 P（商品圖1 有資料代入、無資料隱藏）
    applyCell(template, record['左商品圖'], LAYER.leftP, diagnostics, '商品圖_左');
    applyCell(template, record['中商品圖'], LAYER.midP, diagnostics, '商品圖_中');
    applyCell(template, record['右商品圖'], LAYER.rightP, diagnostics, '商品圖_右');

    var midCenterX = Number((getLayer(template, LAYER.mid) || {}).centerX) || 600;

    // 左格：直營特例
    var leftCopy = trim(record['左文案']);
    if (leftCopy.indexOf('蝦皮直營') >= 0) {
      hide(template, LAYER.left);
      if (dLogo) dLogo.hidden = false;
      setText(template, LAYER.directRight, trim(leftCopy.replace('蝦皮直營', '')), helpers, snap);
    } else {
      if (dLogo) dLogo.hidden = true;
      hide(template, LAYER.directRight);
      setText(template, LAYER.left, leftCopy, helpers, snap);
    }

    // 中格：VIP 特例
    var midCopy = trim(record['中文案']);
    var vip = splitVip(midCopy);
    if (vip) {
      hide(template, LAYER.mid);
      if (vLogo) vLogo.hidden = false;
      setText(template, LAYER.vipLeft, vip.left, helpers, snap);
      setText(template, LAYER.vipRight, vip.right, helpers, snap);
      setGroupCentered(template, [LAYER.vipLeft, LAYER.vipLogo, LAYER.vipRight], snap, midCenterX, GROUP_GAP);
    } else {
      if (vLogo) vLogo.hidden = true;
      hide(template, LAYER.vipLeft); hide(template, LAYER.vipRight);
      setText(template, LAYER.mid, midCopy, helpers, snap);
    }

    // 右格：純文字
    setText(template, LAYER.right, trim(record['右文案']), helpers, snap);

    if (Array.isArray(diagnostics)) {
      diagnostics.push({ field: '文案', status: 'ok', value: [record['左文案'], record['中文案'], record['右文案']].join(' / '), target: 'Mall Skinny BN 組 ' + pad2(record.__備註No) });
    }
  }

  // 價格版型定義（三格共用；PriceRuleEngine 依 templateId 命中 → 各格 applyForAnchor 各自錨定自己的 P）。
  // 缺這段會導致 classify 找不到 layouts → 價格被略過（2026-08-14 修）。
  function createMallPriceRules() {
    var resolver = window.WarmupPriceStyleResolver;
    var base = {
      slot: 'single',
      psdName: '價格',
      followProduct: true,
      positioningMode: 'product-image-ratio',
      anchorRatioX: 0.5,
      anchorRatioY: 0.5,
      rotationOffset: 0,
      fontSizePx: 40,
      color: '#EE4D2D',
      width: 160,
      autoHeightFromFont: true,
      heightMultiplier: 1.35,
      lineHeightMultiplier: 1.08,
      preserveExactSize: false,
      skipAutoScale: false,
      disableContentScale: false,
    };
    var templateLayouts = {};
    ['04_Mall Skinny BN', 'Mall Skinny BN'].forEach(function (key) {
      templateLayouts[key] = { layoutKey: 'singleCoupon', layouts: [base] };
    });
    var semantic = (resolver && typeof resolver.create === 'function') ? resolver.create({}) : {};
    return Object.assign({
      anchorLayerNames: ['商品圖1', '左邊_P', '中間_P', '右邊_P', 'product', 'P'],
      templateLayouts: templateLayouts,
      // 2026-08-14：雙券→雙價格（同 HBN/DD/POPUP）。素材含「雙券」或價格含兩段（例：$2,000+95折、92折+93折）
      // 時，價格自動展開為 價格_上／價格_下（各自錨定同一格 P，上下錯位）。
      doublePrice: {
        enabled: true,
        verticalOffsetRatio: 0.25,
        slots: {
          bottom: { psdName: '價格_下', rotationOffset: 2 },
          top: { psdName: '價格_上', rotationOffset: -6 },
        },
      },
    }, semantic);
  }

  window.TemplateRuleRegistry.register('mall_skinny_bn_formal', {
    label: '25節 正式 Mall Skinny BN',
    tokens: ['Mall Skinny BN', 'MallSkinnyBN', 'MSKBN'],
    targets: ['04_Mall Skinny BN', 'Mall Skinny BN'],
    priority: 50,
    dynamicLayout: true,
    legacyPresetOptional: true,
    exportConfig: { format: 'jpg', folder: '04_Mall Skinny BN' },
    rules: {
      blockParser: blockParser,
      createVariantRecords: createVariantRecords,
      ctaPolicy: { mode: 'rule-managed' },
      priceRules: createMallPriceRules(),
      // 三格價格各自錨定對應 P（PriceCouponManager 多錨點附加模式）。
      priceSlots: [
        { slotId: '左', priceField: '左價格', productField: '左商品圖', anchorLayerKey: '左邊_P' },
        { slotId: '中', priceField: '中價格', productField: '中商品圖', anchorLayerKey: '中間_P' },
        { slotId: '右', priceField: '右價格', productField: '右商品圖', anchorLayerKey: '右邊_P' },
      ],
      beforeApplyRecordToTemplate: beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: afterApplyRecordToTemplate,
    },
  });

  window.__MALL_SKINNY_BN_RULE_VERSION = '2026-08-13a｜新版位04_Mall Skinny BN｜三列一組＋三格P＋三格價格';
})();
