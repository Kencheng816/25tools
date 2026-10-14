/* Simple Banner Rule Factory（05_SCBN / 06_SKBN NUZ_APP / 06_SKBN NUZ_PC）— window.SimpleBannerRuleFactory
 *
 * 2026-08-14 需求（逐題與使用者確認）：
 * - 一列一張圖（主標／商品圖1／價格），無切圖、無左右格。
 * - 主標型態：含 VIP → VIP 字樣換成 蝦皮VIP_LOGO、餘文進 VIP 右字圖層；
 *   不含 VIP → 全文進一般標題圖層（無一般圖層者報錯，例：06_SKBN NUZ_APP）。
 * - 文字置左固定位（依 PSD/JSON 原始 x），只換文字內容；82% 全域標準照常作用。
 * - 商品圖1 → product（有資料代入＋等比 contain；無資料隱藏）；價格走標準機制（含雙券→雙價格、0.2→20% 防呆）。
 * - NUZ 段工單「商品圖2」表頭視為價格（使用者確認，之後會改表頭）。
 * - 橫式_25號商城狂購節_LOGO_黃 → 指向根目錄 svg（已統一全黃 #ffe600）。
 * - alwaysShowLayers（例：25號_白字、白色直線）常態顯示。
 * - KV_BG 預設鎖定；DECO_* 自動載入（檔名=圖層名，公版資料夾→共用素材）。
 */
(function initSimpleBannerRuleFactory() {
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

  function setLeftText(template, key, text, helpers) {
    var l = getLayer(template, key);
    if (!l) return null;
    var v = trim(text);
    if (!v) { l.hidden = true; l.text = ''; return null; }
    l.hidden = false;
    l.text = v;
    l.textVerticalAlign = 'source-baseline';
    l.align = 'left'; // 置左固定位：x 依 JSON，不隨文字長度移動。
    var measure = helpers && typeof helpers.measureTextWidth === 'function' ? helpers.measureTextWidth : null;
    if (measure) {
      var w = Number(measure(l));
      var manual = l.__manualOverrides || {};
      if (isFinite(w) && w > 0 && !manual.width) {
        l.width = round2(w);
        if (!manual.centerX) l.centerX = round2((Number(l.x) || 0) + w / 2);
      }
    }
    return l;
  }

  function applyContain(layer) {
    layer.keepAspectRatio = true;
    layer.sizingMode = 'containByPBox';
    layer.targetWidth = Number(layer.width) || 0;
    layer.targetHeight = Number(layer.height) || 0;
    layer.maxTargetHeight = Number(layer.height) || 0;
  }

  function createBlockParser(config) {
    return function blockParser(ctx) {
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
        title: findColumn(function (n) { return n.indexOf('主標') === 0; }),
        product: findColumn(function (n) { return n.indexOf('商品圖1') >= 0; }),
        price: findColumn(function (n) { return n === '價格'; }),
      };
      // NUZ 段過渡相容：表頭「商品圖2」實為價格（使用者確認，之後會改表頭）。
      if (col.price < 0) col.price = findColumn(function (n) { return n.indexOf('商品圖2') >= 0; });
      var read = function (row, c) { return c >= 0 && row[c] != null ? row[c] : ''; };

      var records = [];
      for (var r = headerRow + 1; r < endRow; r += 1) {
        var row = rows[r] || [];
        var exposure = trim(read(row, col.expose));
        var note = trim(read(row, col.no));
        if (exposure !== '暖身' && exposure !== '正式') continue;
        if (!isFinite(Number(note)) || note === '') continue;
        records.push({
          '主標': trim(read(row, col.title)),
          '商品圖1': trim(read(row, col.product)),
          '商品圖2': '',
          '價格': trim(read(row, col.price)),
          '__曝光': exposure,
          '__備註No': note,
          '__編號': trim(read(row, col.code)),
          '__sourceRow': r + 1,
          '__sourceName': trim(ctx.productName || config.label || ''),
        });
      }
      if (!records.length) return null;
      return { records: records, templateType: config.templateType };
    };
  }

  function createPriceRules(config) {
    var resolver = window.WarmupPriceStyleResolver;
    if (!resolver || typeof resolver.create !== 'function') {
      throw new Error('SimpleBannerRuleFactory: WarmupPriceStyleResolver is not ready');
    }
    var templateLayouts = {};
    (config.targets || []).forEach(function (key) {
      templateLayouts[key] = {
        layoutKey: 'singleCoupon',
        layouts: [{
          slot: 'single',
          psdName: '價格',
          followProduct: true,
          positioningMode: 'product-image-ratio',
          anchorRatioX: 0.5,
          anchorRatioY: 0.5,
          rotationOffset: 0,
          fontSizePx: Number(config.priceBigFontSize || 48),
          color: '#EE4D2D',
          width: Number(config.priceBoxWidth || 180),
          autoHeightFromFont: true,
          heightMultiplier: 1.35,
          lineHeightMultiplier: 1.08,
          preserveExactSize: false,
          skipAutoScale: false,
          disableContentScale: false,
        }],
      };
    });
    return Object.assign({
      anchorLayerNames: ['商品圖1', 'product', 'P'],
      templateLayouts: templateLayouts,
      // 雙券→雙價格（同 HBN/DD/POPUP/SKBN/Mall）。
      doublePrice: {
        enabled: true,
        verticalOffsetRatio: 0.25,
        slots: {
          bottom: { psdName: '價格_下', rotationOffset: 2 },
          top: { psdName: '價格_上', rotationOffset: -6 },
        },
      },
    }, resolver.create(config || {}));
  }

  function createRule(config) {
    var keys = Object.assign({
      kvBg: 'kv_bg',
      product: 'product',
      titlePlain: '',        // 一般標題圖層（無則非 VIP 報錯）
      vipLogo: '蝦皮VIP_LOGO',
      vipRight: '',          // VIP 右字圖層
      logoYellow: '橫式_25號商城狂購節_LOGO_黃',
    }, config.layerKeys || {});

    function beforeApplyRecordToTemplate(args) {
      var template = args.template;
      var kv = getLayer(template, keys.kvBg);
      if (kv && kv.locked === undefined) kv.locked = true;
      var product = getLayer(template, keys.product);
      if (product) product.role = '商品圖1';
    }

    function afterApplyRecordToTemplate(args) {
      var template = args.template;
      var record = args.record || {};
      var helpers = args.helpers || {};
      var diagnostics = args.diagnostics;

      // KV_BG
      var kv = getLayer(template, keys.kvBg);
      if (kv) {
        var kvHit = resolveAsset(template, config.templateAssetFolder + '_KV_BG', kv, 'KV_BG', [config.templateAssetFolder]);
        if (kvHit) { kv.assetFilename = kvHit.filename; kv.assetProject = kvHit.project; kv.__assetMissing = false; }
      }
      // 固定 LOGO：VIP（根目錄 svg）與 25節橫式黃 LOGO（已統一全黃 #ffe600）。
      var vLogo = getLayer(template, keys.vipLogo);
      if (vLogo) { vLogo.assetFilename = '蝦皮VIP_LOGO.svg'; vLogo.assetProject = ''; vLogo.__assetMissing = false; }
      var yLogo = getLayer(template, keys.logoYellow);
      if (yLogo) { yLogo.assetFilename = '橫式_25號商城狂購節_LOGO_黃.svg'; yLogo.assetProject = ''; yLogo.__assetMissing = false; yLogo.hidden = false; }
      // DECO_* 自動載入（檔名=圖層名）。
      Object.keys(template.layers || {}).forEach(function (key) {
        if (key.indexOf('DECO_') !== 0) return;
        var layer = template.layers[key];
        if (!layer || layer.type !== 'image') return;
        var hit = resolveAsset(template, key, layer, key, [config.templateAssetFolder, '共用素材']);
        if (hit) { layer.assetFilename = hit.filename; layer.assetProject = hit.project; layer.__assetMissing = false; }
      });
      // 常態顯示圖層（例：25號_白字、白色直線）。
      (config.alwaysShowLayers || []).forEach(function (key) {
        var layer = getLayer(template, key);
        if (layer) layer.hidden = false;
      });

      // 商品圖1 → product（等比 contain；無資料隱藏）。
      var product = getLayer(template, keys.product);
      var productName = trim(record['商品圖1']);
      if (product) {
        if (productName) {
          product.hidden = false;
          var hit = resolveAsset(template, productName, product, '商品圖1', [config.templateAssetFolder, '共用素材']);
          if (hit) {
            product.assetFilename = hit.filename; product.assetProject = hit.project; product.__assetMissing = false;
            var bm = window.BatchManager;
            if (bm && typeof bm.getProductImageBoxFromLayer === 'function' && typeof bm.applyProductImageBox === 'function') {
              var box = bm.getProductImageBoxFromLayer(product);
              if (box) bm.applyProductImageBox(product, box);
            } else applyContain(product);
            if (Array.isArray(diagnostics)) {
              var upgraded = false;
              diagnostics.forEach(function (d) {
                if (!d || d.field !== '商品圖1' || String(d.status || '').indexOf('missing') !== 0) return;
                d.status = 'ok'; d.filename = hit.filename; if (d.attempts) delete d.attempts; upgraded = true;
              });
              if (!upgraded) diagnostics.push({ field: '商品圖1', status: 'ok', value: productName, filename: hit.filename });
            }
          } else if (Array.isArray(diagnostics)) {
            diagnostics.push({ field: '商品圖1', status: 'missing', value: productName, target: keys.product });
          }
        } else {
          product.hidden = true;
        }
      }

      // 主標：VIP → LOGO＋右字；非 VIP → 一般標題圖層（無則報錯）。
      var titleRaw = trim(record['主標']);
      var vip = splitVip(titleRaw);
      var vipRight = getLayer(template, keys.vipRight);
      var plain = keys.titlePlain ? getLayer(template, keys.titlePlain) : null;
      if (vip && vipRight) {
        if (plain) plain.hidden = true;
        if (vLogo) vLogo.hidden = false;
        // 沿用既有語意：僅去除開頭 VIP，VIP 在中段時全文進右字圖層。
        setLeftText(template, keys.vipRight, vip.left ? titleRaw : vip.right, helpers);
      } else if (plain) {
        if (vLogo) vLogo.hidden = true;
        if (vipRight) vipRight.hidden = true;
        setLeftText(template, keys.titlePlain, titleRaw, helpers);
      } else {
        throw new Error(config.label + '：Excel 第 ' + (record.__sourceRow || '?') + ' 列，主標「' + titleRaw + '」不含 VIP，且本公版無一般標題圖層，無法製作');
      }

      if (Array.isArray(diagnostics)) {
        diagnostics.push({ field: '主標', status: 'ok', value: titleRaw, target: config.label + ' No ' + pad2(record.__備註No) });
      }
    }

    function createVariantRecords(record) {
      var v = {};
      Object.keys(record || {}).forEach(function (k) { v[k] = record[k]; });
      v.__outputName = config.outputPrefix + '_' + pad2(record && record.__備註No);
      v.__outputSuffix = pad2(record && record.__備註No);
      return [v];
    }

    return {
      label: config.label,
      tokens: config.tokens,
      targets: config.targets,
      priority: Number(config.priority || 0),
      dynamicLayout: true,
      legacyPresetOptional: true,
      exportConfig: config.exportConfig || null,
      rules: {
        blockParser: createBlockParser(config),
        createVariantRecords: createVariantRecords,
        priceRules: createPriceRules(config),
        ctaPolicy: { mode: 'rule-managed' },
        beforeApplyRecordToTemplate: beforeApplyRecordToTemplate,
        afterApplyRecordToTemplate: afterApplyRecordToTemplate,
      },
    };
  }

  function register(config) {
    if (!window.TemplateRuleRegistry || typeof window.TemplateRuleRegistry.register !== 'function') {
      throw new Error('SimpleBannerRuleFactory: TemplateRuleRegistry is not ready');
    }
    return window.TemplateRuleRegistry.register(config.ruleKey, createRule(config));
  }

  window.SimpleBannerRuleFactory = Object.freeze({ VERSION: '1.0.0', createRule: createRule, register: register });
})();
