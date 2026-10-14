/* Warmup Banner Rule Factory
 *
 * 共用於「HBN 類」暖身公版：
 * - Excel 區塊解析
 * - 主標三型態（一般 / VIP LOGO / 蝦皮直營 LOGO）
 * - 主標、副標、底色、保護文字對齊
 * - P / KV_BG 素材解析
 * - 單價、雙價與價格顏色規則
 *
 * 公版差異全部由 config 注入；核心引擎與各公版 Rule 不再複製相同流程。
 */
(function initWarmupBannerRuleFactory() {
  'use strict';

  var DEFAULT_LAYER_KEYS = Object.freeze({
    kvBg: 'kv_bg',
    product: 'product',
    protect: '保護文字',
    subBg: '副標題_底色',
    subtitle: 'subtitle',
    vipSubtitleLogo: '蝦皮VIP_LOGO_2',
    vipSubtitle: '蝦皮VIP_副標題_右',
    titlePlain: 'title',
    vipLogo: '蝦皮VIP_LOGO',
    vipTitle: '蝦皮VIP_主標題_右',
    directLogo: '蝦皮直營_LOGO',
    directTitle: '蝦皮直營_主標題_右',
    ctaText: 'CTA_文案',
    ctaBg: 'CTA_BG',
    ctaTri: 'CTA_三角形',
    subFrame: 'subtitle_frame',
  });


  function toStr(value) { return String(value == null ? '' : value); }
  function trim(value) { return toStr(value).replace(/_x000d_/gi, '\n').trim(); }
  function round2(value) { return Math.round(Number(value) * 100) / 100; }
  function pad2(value) { return String(Math.max(0, Math.round(Number(value) || 0))).padStart(2, '0'); }
  function getLayer(template, key) { return template && template.layers ? template.layers[key] || null : null; }
  function hide(template, key) { var layer = getLayer(template, key); if (layer) layer.hidden = true; }
  function textStandard() { return window.SPTextStandard; }

  function getSourceFontSize(layer, fallback) {
    var sourceSize = Number(layer && layer.textBaselineReference && layer.textBaselineReference.fontSizePx);
    if (isFinite(sourceSize) && sourceSize > 0) return sourceSize;
    var currentSize = Number(layer && layer.fontSizePx);
    if (isFinite(currentSize) && currentSize > 0) return currentSize;
    var defaultSize = Number(fallback);
    return isFinite(defaultSize) && defaultSize > 0 ? defaultSize : 24;
  }

  function resolveFontSize(value, layer, fallback) {
    if (typeof value === 'function') {
      var resolved = Number(value(layer));
      if (isFinite(resolved) && resolved > 0) return resolved;
    }
    var configured = Number(value);
    if (isFinite(configured) && configured > 0) return configured;
    return getSourceFontSize(layer, fallback);
  }

  function resolveMainCenterX(template, config) {
    if (typeof config.mainCenterX === 'function') {
      var computed = Number(config.mainCenterX(template));
      if (isFinite(computed)) return computed;
    }
    var configured = Number(config.mainCenterX);
    if (isFinite(configured)) return configured;
    var canvasWidth = Number(template && template.canvas && template.canvas.width);
    return isFinite(canvasWidth) ? canvasWidth / 2 : 0;
  }

  function resolveConfigValue(value, template, record, fallback) {
    if (typeof value === 'function') {
      var resolved = value(template, record);
      if (resolved != null && String(resolved).trim() !== '') return resolved;
    } else if (value != null && String(value).trim() !== '') {
      return value;
    }
    return fallback;
  }

  function resolveTemplateAssetFolder(template, record, config) {
    return trim(resolveConfigValue(config.templateAssetFolder, template, record, ''));
  }

  function resolveProductAssetFolder(template, record, config) {
    return trim(resolveConfigValue(config.productAssetFolder, template, record, '共用素材'));
  }

  function resolveSmartAssetIdentity(template, record, config) {
    return trim(resolveConfigValue(config.smartAssetIdentity, template, record, resolveTemplateAssetFolder(template, record, config)));
  }

  function resolveOutputPrefix(record, config) {
    return trim(resolveConfigValue(config.outputPrefix, null, record, config.label || 'OUTPUT'));
  }

  function createBlockParser(config) {
    return function blockParser(ctx) {
      var rows = ctx.rows || [];
      var header = ctx.header || {};
      var headerRow = Number(header.headerRow || 0);
      var startRow = Number(ctx.rowIndex || headerRow + 1);
      var endRow = Number(ctx.nextHeaderRow || rows.length);
      var head = rows[headerRow] || [];
      var normalizeHeader = function (value) {
        return toStr(value).toLowerCase().replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.]+/g, '');
      };
      var findColumn = function (predicate) {
        for (var column = 0; column < head.length; column += 1) {
          if (predicate(normalizeHeader(head[column]))) return column;
        }
        return -1;
      };
      var titleHeaders = (config.titleHeaderNames || ['主標']).map(normalizeHeader).filter(Boolean);
      var columns = {
        no: findColumn(function (name) { return name === '備註'; }),
        code: findColumn(function (name) { return name === '編號'; }),
        expose: findColumn(function (name) { return name === '曝光'; }),
        title: findColumn(function (name) { return titleHeaders.some(function (headerName) { return name === headerName || name.indexOf(headerName) === 0; }); }),
        subtitle: findColumn(function (name) { return name.indexOf('副標') === 0; }),
        protect: findColumn(function (name) { return name.indexOf('保護文字') >= 0; }),
        cta: findColumn(function (name) { return name.indexOf('cta') >= 0; }),
        product: findColumn(function (name) { return name.indexOf('商品圖1') >= 0; }),
        price: findColumn(function (name) { return name === '價格'; }),
      };
      var readCell = function (row, column) {
        return column >= 0 && row[column] != null ? row[column] : '';
      };
      var records = [];

      for (var rowIndex = startRow; rowIndex < endRow; rowIndex += 1) {
        var row = rows[rowIndex] || [];
        var exposure = trim(readCell(row, columns.expose));
        var noteRaw = readCell(row, columns.no);
        var noteText = trim(noteRaw);
        var noteNumber = Number(noteText);
        var isValidExposure = exposure === '暖身' || exposure === '正式';
        var hasNumericNote = isFinite(noteNumber) && noteText !== '';
        var validateWarmupExposure = config.blockParserValidateWarmupExposure !== false;
        var requireNumericNote = config.blockParserRequireNumericNote !== false;

        var titleValue = trim(readCell(row, columns.title));
        var subtitleValue = trim(readCell(row, columns.subtitle));
        var productValue = trim(readCell(row, columns.product));
        var priceValue = trim(readCell(row, columns.price));
        var protectValue = trim(readCell(row, columns.protect));
        var ctaValue = trim(readCell(row, columns.cta));
        var codeValue = trim(readCell(row, columns.code));
        var hasPayload = [exposure, noteText, codeValue, titleValue, subtitleValue, productValue, priceValue, protectValue, ctaValue].some(Boolean);

        if (validateWarmupExposure && !isValidExposure) continue;
        if (requireNumericNote && !hasNumericNote) continue;
        if (config.blockParserAcceptPayloadRows === true && !hasPayload) continue;

        var record = {
          '主標': titleValue,
          '副標': subtitleValue,
          '商品圖1': productValue,
          '價格': priceValue,
          '保護文字': protectValue,
          'CTA': ctaValue,
          '__曝光': exposure,
          '__備註No': noteText,
          '__編號': codeValue,
          '__sourceRow': rowIndex + 1,
          '__sourceName': trim(ctx.productName || config.label || ''),
        };
        if (config.titleMirrorField) record[String(config.titleMirrorField)] = titleValue;
        records.push(record);
      }

      if (!records.length) return null;
      return { records: records, templateType: config.templateType };
    };
  }

  function createVariantFactory(config) {
    return function createVariantRecords(record) {
      var variant = {};
      Object.keys(record || {}).forEach(function (key) { variant[key] = record[key]; });
      var exposure = trim(record && record.__曝光) || '暖身';
      var sequence = pad2(record && record.__備註No);
      var outputPrefix = resolveOutputPrefix(record, config);
      variant.__outputName = config.outputIncludeExposure === false
        ? outputPrefix + '_' + sequence
        : outputPrefix + '_' + exposure + '_' + sequence;
      variant.__outputSuffix = sequence;
      return [variant];
    };
  }

  function createBasePriceLayout(config, templateKey) {
    var custom = typeof config.createBasePriceLayout === 'function'
      ? (config.createBasePriceLayout(templateKey) || {})
      : ((config.priceBaseLayouts && config.priceBaseLayouts[templateKey]) || {});
    return Object.assign({
      slot: 'single',
      psdName: '價格',
      followProduct: true,
      positioningMode: 'product-image-ratio',
      anchorRatioX: 0.5,
      anchorRatioY: 0.5,
      rotationOffset: 0,
      fontSizePx: Number(config.priceBigFontSize || 48),
      color: '#EE4D2D',
      width: 220,
      autoHeightFromFont: true,
      heightMultiplier: 1.35,
      lineHeightMultiplier: 1.08,
      preserveExactSize: false,
      skipAutoScale: false,
      disableContentScale: false,
    }, custom);
  }

  function createPriceRules(config) {
    var resolver = window.WarmupPriceStyleResolver;
    if (!resolver || typeof resolver.create !== 'function') {
      throw new Error('WarmupBannerRuleFactory: WarmupPriceStyleResolver is not ready');
    }
    var semanticStyle = resolver.create(config || {});
    var templateLayouts = {};
    (config.priceLayoutKeys || config.targets || []).forEach(function (key) {
      templateLayouts[key] = { layoutKey: 'singleCoupon', layouts: [createBasePriceLayout(config, key)] };
    });
    return Object.assign({
      anchorLayerNames: ['product', 'P', '商品圖1', '曝品'],
      templateLayouts: templateLayouts,
      doublePrice: {
        enabled: true,
        verticalOffsetRatio: 0.25,
        slots: {
          bottom: { psdName: '價格_下', rotationOffset: 2 },
          top: { psdName: '價格_上', rotationOffset: -6 },
        },
      },
    }, semanticStyle);
  }

  function applyTitleRanges(layer, text, bigFontSize, color) {
    var standard = textStandard();
    if (standard && standard.titleRanges) {
      var ranges = standard.titleRanges(text, bigFontSize, { color: color, smallBaselineOffset: 0 });
      if (standard.isDualSize(ranges)) {
        layer.textStyleRanges = ranges;
        layer.styledTextVerticalAlign = 'source-baseline';
        return;
      }
    }
    if (layer.textStyleRanges) delete layer.textStyleRanges;
    layer.styledTextVerticalAlign = 'default';
  }

  function resolveMainGroupGap(config, variant) {
    var byVariant = config && config.mainGroupGaps;
    var configured = byVariant && Number(byVariant[variant]);
    if (isFinite(configured) && configured >= 0) return configured;
    var fallback = Number(config && config.mainGroupGap);
    return isFinite(fallback) && fallback >= 0 ? fallback : 0;
  }

  function applyTitle(template, record, helpers, config, keys, centerX) {
    var raw = trim(record['主標']);
    var isVip = /vip/i.test(raw);
    var isDirect = config.enableDirectVariant !== false && !isVip && (raw.indexOf('蝦皮直營') >= 0 || raw.indexOf('直營') >= 0);
    var measure = typeof helpers.measureTextWidth === 'function'
      ? helpers.measureTextWidth
      : function (layer) { return Number(layer && layer.width) || 0; };

    [keys.titlePlain, keys.vipLogo, keys.vipTitle, keys.directLogo, keys.directTitle].forEach(function (key) {
      hide(template, key);
    });

    var textLayerKey = keys.titlePlain;
    var logoKey = null;
    var fontConfig = config.fontSizes && config.fontSizes.plain;
    var variantKind = 'plain';
    var text = raw;

    if (isVip) {
      variantKind = 'vip';
      textLayerKey = keys.vipTitle;
      logoKey = keys.vipLogo;
      fontConfig = config.fontSizes && config.fontSizes.vip;
      text = raw.replace(/^\s*vip\s*/i, '');
    } else if (isDirect) {
      variantKind = 'direct';
      textLayerKey = keys.directTitle;
      logoKey = keys.directLogo;
      fontConfig = config.fontSizes && config.fontSizes.direct;
      text = raw.replace(/^\s*(蝦皮直營|直營)\s*/, '');
    }

    var textLayer = getLayer(template, textLayerKey);
    if (!textLayer) return { width: 0, centerX: centerX };

    var bigFontSize = resolveFontSize(fontConfig, textLayer, 24);
    textLayer.hidden = false;
    textLayer.text = text;
    textLayer.textVerticalAlign = 'source-baseline';
    delete textLayer.textBottomPaddingPx;
    textLayer.fontSizePx = round2(bigFontSize);
    applyTitleRanges(textLayer, text, bigFontSize, textLayer.color || '#FFFFFF');

    var textWidth = Number(measure(textLayer)) || 0;
    textLayer.width = round2(textWidth);

    if (logoKey) {
      var logo = getLayer(template, logoKey);
      if (!logo) return { width: textWidth, centerX: centerX };
      logo.hidden = false;
      var logoWidth = Number(logo.width || 0);
      var groupGap = resolveMainGroupGap(config, variantKind);
      var groupWidth = logoWidth + groupGap + textWidth;
      var groupLeft = centerX - groupWidth / 2;
      logo.x = round2(groupLeft);
      logo.centerX = round2(groupLeft + logoWidth / 2);
      textLayer.align = 'left';
      textLayer.x = round2(groupLeft + logoWidth + groupGap);
      textLayer.centerX = round2(textLayer.x + textWidth / 2);
      return { width: groupWidth, centerX: centerX };
    }

    textLayer.align = 'center';
    textLayer.x = round2(centerX - textWidth / 2);
    textLayer.centerX = round2(centerX);
    return { width: textWidth, centerX: centerX };
  }

  function applySubtitle(template, record, helpers, config, keys, centerX) {
    var plain = getLayer(template, keys.subtitle);
    var vipLogo = getLayer(template, keys.vipSubtitleLogo);
    var vipText = getLayer(template, keys.vipSubtitle);
    var raw = trim(record['副標']);
    var useVipGroup = config.vipSubtitleSplit === true && /^vip/i.test(raw) && vipLogo && vipText;
    var measure = typeof helpers.measureTextWidth === 'function'
      ? helpers.measureTextWidth
      : function (target) { return Number(target && target.width) || 0; };

    [keys.subtitle, keys.vipSubtitleLogo, keys.vipSubtitle].forEach(function (key) { hide(template, key); });
    if (!raw) return 0;

    if (useVipGroup) {
      var text = raw.replace(/^\s*vip\s*/i, '');
      var fontSize = resolveFontSize(config.fontSizes && config.fontSizes.vipSubtitle, vipText, 24);
      vipLogo.hidden = false;
      vipText.hidden = false;
      vipText.text = text;
      vipText.textVerticalAlign = 'source-baseline';
      delete vipText.textBottomPaddingPx;
      vipText.fontSizePx = round2(fontSize);
      applyTitleRanges(vipText, text, fontSize, vipText.color || '#FFE600');
      var textWidth = Number(measure(vipText)) || Number(vipText.width) || 0;
      vipText.width = round2(textWidth);
      var logoWidth = Number(vipLogo.width) || 0;
      var gap = Number(config.subtitleGroupGap == null ? 5 : config.subtitleGroupGap);
      var groupWidth = logoWidth + gap + textWidth;
      var left = centerX - groupWidth / 2;
      vipLogo.x = round2(left);
      vipLogo.centerX = round2(left + logoWidth / 2);
      vipText.align = 'left';
      vipText.x = round2(left + logoWidth + gap);
      vipText.centerX = round2(vipText.x + textWidth / 2);
      return groupWidth;
    }

    if (!plain) return 0;
    var plainFontSize = resolveFontSize(config.fontSizes && config.fontSizes.subtitle, plain, 24);
    plain.text = raw;
    plain.hidden = false;
    plain.textVerticalAlign = 'source-baseline';
    delete plain.textBottomPaddingPx;
    plain.fontSizePx = round2(plainFontSize);
    applyTitleRanges(plain, raw, plainFontSize, plain.color || '#FFE600');
    var width = Number(measure(plain)) || Number(plain.width) || 0;
    plain.width = round2(width);
    plain.centerX = round2(centerX);
    plain.x = round2(centerX - width / 2);
    return width;
  }

  function applyProtectText(template, record, keys, centerX) {
    var layer = getLayer(template, keys.protect);
    if (!layer) return;
    var value = trim(record['保護文字']);
    if (value) {
      layer.text = value;
      layer.hidden = false;
    } else {
      layer.text = '';
      layer.hidden = true;
      return;
    }
    var width = Number(layer.width) || 0;
    layer.centerX = round2(centerX);
    layer.x = round2(centerX - width / 2);
  }

  function applyCta(template, record, config, keys) {
    var textLayer = getLayer(template, keys.ctaText);
    var bgLayer = getLayer(template, keys.ctaBg);
    var triLayer = getLayer(template, keys.ctaTri);
    var value = trim(record['CTA']);
    if (!value && config.hideCtaWhenBlank === true) {
      [keys.ctaText, keys.ctaBg, keys.ctaTri].forEach(function (key) { hide(template, key); });
      if (textLayer) textLayer.text = '';
      return;
    }
    if (!value) return;
    if (textLayer) { textLayer.text = value; textLayer.hidden = false; }
    if (bgLayer) bgLayer.hidden = false;
    if (triLayer) triLayer.hidden = false;
  }

  function applySubtitleBackground(template, titleWidth, subtitleWidth, config, keys, centerX) {
    var layer = getLayer(template, keys.subBg);
    if (!layer) return;
    var height = Number(layer.height) || 80;
    var standard = textStandard();
    var width;
    if (config.subtitleBackgroundMode === 'content-padding') {
      var padding = Number(config.subtitlePaddingPx);
      if (!isFinite(padding)) {
        var ratio = Number(config.subtitlePaddingRatio);
        if (!isFinite(ratio)) ratio = standard && Number(standard.CAPSULE_PADDING_RATIO);
        padding = height * (isFinite(ratio) ? ratio : (40 / 62));
      }
      width = (Number(subtitleWidth) || 0) + Math.max(0, padding) * 2;
    } else if (standard && standard.capsuleWidth) {
      width = standard.capsuleWidth({
        titleWidth: Number(titleWidth) || 0,
        subtitleWidth: Number(subtitleWidth) || 0,
        height: height,
      });
    } else {
      var title = Number(titleWidth) || 0;
      var subtitle = Number(subtitleWidth) || 0;
      width = title - subtitle >= 60 ? title : subtitle + 80;
    }
    layer.hidden = !(Number(subtitleWidth) > 0);
    if (layer.hidden) return;
    if (config.subtitleBackgroundShape === 'preserve') {
      resizePreservedBackground(template, keys, width, centerX);
      return;
    }
    buildHexagonBackground(template, keys, width, centerX);
  }

  function resizePreservedBackground(template, keys, targetWidth, centerX) {
    var layer = getLayer(template, keys.subBg);
    if (!layer) return;
    var manual = layer.__manualOverrides || {};
    var width = manual.width ? Math.max(1, Number(layer.width) || 1) : Math.max(1, Number(targetWidth) || Number(layer.width) || 1);
    var effectiveCenterX = manual.centerX ? Number(layer.centerX) : (manual.x ? Number(layer.x || 0) + width / 2 : centerX);
    if (!isFinite(effectiveCenterX)) effectiveCenterX = centerX;
    var x = manual.x ? Number(layer.x || 0) : effectiveCenterX - width / 2;

    layer.x = round2(x);
    layer.width = round2(width);
    layer.centerX = round2(effectiveCenterX);
    layer.type = 'shape';
    layer.shape = layer.shape || {};
    // 保留 JSON 原始 shape kind / fill / stroke / cornerRadius；只讓 bounds 跟著新寬度。
    // PSD 匯出的 geometry/pathBounds 是舊尺寸，若保留會讓 ShapeRenderer 繼續畫舊寬度。
    if (layer.shape.geometry) { try { delete layer.shape.geometry; } catch (_error) {} }
    if (layer.shape.pathBounds) { try { delete layer.shape.pathBounds; } catch (_error2) {} }
    if (layer.shape.vectorPath) { try { delete layer.shape.vectorPath; } catch (_error3) {} }
    if (layer.shape.bezierPoints) { try { delete layer.shape.bezierPoints; } catch (_error4) {} }
    layer.useDynamicBounds = true;
  }

  function buildHexagonBackground(template, keys, targetWidth, centerX) {
    var layer = getLayer(template, keys.subBg);
    if (!layer) return;
    var manual = layer.__manualOverrides || {};
    var height = Math.max(1, Number(layer.height) || 80);
    var requestedWidth = Math.max(1, Number(targetWidth) || Number(layer.width) || 0);
    var width = manual.width ? Math.max(1, Number(layer.width) || requestedWidth) : requestedWidth;
    if (!(width > 0 && height > 0)) return;

    var currentY = Number(layer.y || 0);
    var currentCenterY = Number(layer.centerY);
    if (!isFinite(currentCenterY)) currentCenterY = currentY + height / 2;
    var x = manual.x ? Number(layer.x || 0) : centerX - width / 2;
    var y = manual.y ? currentY : currentCenterY - height / 2;
    var effectiveCenterX = manual.centerX ? Number(layer.centerX || (x + width / 2)) : (manual.x ? x + width / 2 : centerX);
    var centerY = manual.centerY ? currentCenterY : y + height / 2;
    var pointWidth = Math.min(Math.round(height * 0.29), Math.floor(width / 2));
    var corners = [
      { x: x + pointWidth, y: y },
      { x: x + width - pointWidth, y: y },
      { x: x + width, y: centerY },
      { x: x + width - pointWidth, y: y + height },
      { x: x + pointWidth, y: y + height },
      { x: x, y: centerY },
    ];
    var vectorPath = corners.map(function (point) {
      return {
        anchor: { x: point.x, y: point.y },
        leftDirection: { x: point.x, y: point.y },
        rightDirection: { x: point.x, y: point.y },
      };
    });
    var fill = layer.fill || (layer.shape && layer.shape.fill) || '#113366';

    layer.x = round2(x);
    layer.y = round2(y);
    layer.width = round2(width);
    layer.height = round2(height);
    layer.centerX = round2(effectiveCenterX);
    layer.centerY = round2(centerY);
    layer.type = 'shape';
    layer.shape = layer.shape || {};
    layer.shape.kind = 'path';
    layer.shape.vectorPath = vectorPath;
    layer.shape.bezierPoints = vectorPath;
    layer.shape.fill = fill;
    layer.fill = fill;
    if (layer.shape.geometry) {
      try { delete layer.shape.geometry; } catch (_error) {}
    }
    layer.useDynamicBounds = true;
  }

  // Rule 只列出合法來源資料夾；真正的比對、NFKC、歧義檢查與商品共用 fallback
  // 全部交給 BatchManager.findAssetFilename -> AssetLookup，禁止自行掃描其他公版 bucket。
  function resolveAssetFromFolders(template, record, name, layer, layerKey, preferredFolders) {
    var batchManager = window.BatchManager;
    if (!name || !batchManager || typeof batchManager.findAssetFilename !== 'function') return null;
    var folders = [];
    var pushFolder = function (folder) {
      folder = String(folder == null ? '' : folder).trim();
      if (folder && folders.indexOf(folder) < 0) folders.push(folder);
    };
    (preferredFolders || []).forEach(pushFolder);
    for (var index = 0; index < folders.length; index += 1) {
      var result = batchManager.findAssetFilename(name, {
        project: folders[index],
        template: template,
        layer: layer,
        layerKey: layerKey,
      });
      if (result && result.found && result.filename) {
        return { filename: result.filename, project: result.folder || folders[index] };
      }
    }
    return null;
  }

  function resolveKvBackground(template, record, config, keys) {
    var layer = getLayer(template, keys.kvBg);
    if (!layer) return;
    var templateAssetFolder = resolveTemplateAssetFolder(template, record, config);
    var expectedName = templateAssetFolder + '_KV_BG';
    var hit = resolveAssetFromFolders(
      template,
      record,
      expectedName,
      layer,
      'KV_BG',
      [templateAssetFolder],
    );
    if (!hit) return;
    layer.assetFilename = hit.filename;
    layer.assetProject = hit.project;
    layer.__assetMissing = false;
  }

  function resolveProductAsset(template, record, diagnostics, config, keys) {
    var layer = getLayer(template, keys.product);
    if (!layer) return null;
    var name = trim(record['商品圖1']);
    if (!name) return null;
    var templateAssetFolder = resolveTemplateAssetFolder(template, record, config);
    var productAssetFolder = resolveProductAssetFolder(template, record, config);
    var hit = resolveAssetFromFolders(
      template,
      record,
      name,
      layer,
      '商品圖1',
      [templateAssetFolder, productAssetFolder],
    );
    if (!hit) return null;

    layer.assetFilename = hit.filename;
    layer.assetProject = hit.project;
    layer.__assetMissing = false;
    if (!layer.role) layer.role = 'product';

    if (Array.isArray(diagnostics)) {
      diagnostics.forEach(function (diagnostic) {
        if (!diagnostic || diagnostic.field !== '商品圖1') return;
        if (String(diagnostic.status || '').indexOf('missing') !== 0) return;
        diagnostic.status = 'ok';
        diagnostic.filename = hit.filename;
        if (diagnostic.attempts) delete diagnostic.attempts;
      });
    }
    return hit;
  }

  function refreshDynamicTextLayout(template, helpers, config, keys) {
    if (!template) return;
    var centerX = resolveMainCenterX(template, config);
    var measure = typeof helpers.measureTextWidth === 'function'
      ? helpers.measureTextWidth
      : function (layer) { return Number(layer && layer.width) || 0; };
    var titleChoices = [
      { text: keys.titlePlain, logo: null },
      { text: keys.vipTitle, logo: keys.vipLogo },
      { text: keys.directTitle, logo: keys.directLogo },
    ];
    var activeTitle = titleChoices.map(function (choice) {
      return { choice: choice, layer: getLayer(template, choice.text), logo: choice.logo ? getLayer(template, choice.logo) : null };
    }).find(function (entry) { return entry.layer && !entry.layer.hidden; });
    var titleWidth = 0;
    if (activeTitle) {
      var title = activeTitle.layer;
      var titleManual = title.__manualOverrides || {};
      var measuredTitle = Math.max(1, Number(measure(title)) || Number(title.width) || 1);
      if (!titleManual.width) title.width = round2(measuredTitle);
      var textWidth = Number(title.width) || measuredTitle;
      if (activeTitle.logo && !activeTitle.logo.hidden) {
        var logo = activeTitle.logo;
        var logoWidth = Number(logo.width) || 0;
        var titleVariant = activeTitle.choice.text === keys.vipTitle ? 'vip' : (activeTitle.choice.text === keys.directTitle ? 'direct' : 'plain');
        var titleGap = resolveMainGroupGap(config, titleVariant);
        titleWidth = logoWidth + titleGap + textWidth;
        var left = centerX - titleWidth / 2;
        var logoManual = logo.__manualOverrides || {};
        if (!logoManual.x) logo.x = round2(left);
        if (!logoManual.centerX) logo.centerX = round2(Number(logo.x || left) + logoWidth / 2);
        if (!titleManual.x) title.x = round2(left + logoWidth + titleGap);
        if (!titleManual.centerX) title.centerX = round2(Number(title.x || 0) + textWidth / 2);
      } else {
        titleWidth = textWidth;
        if (!titleManual.x) title.x = round2(centerX - textWidth / 2);
        if (!titleManual.centerX) title.centerX = round2(Number(title.x || 0) + textWidth / 2);
      }
    }

    var subtitle = getLayer(template, keys.subtitle);
    var vipSubtitleLogo = getLayer(template, keys.vipSubtitleLogo);
    var vipSubtitle = getLayer(template, keys.vipSubtitle);
    var subtitleWidth = 0;
    if (vipSubtitle && !vipSubtitle.hidden && vipSubtitleLogo && !vipSubtitleLogo.hidden) {
      var vipSubManual = vipSubtitle.__manualOverrides || {};
      var measuredVipSub = Math.max(1, Number(measure(vipSubtitle)) || Number(vipSubtitle.width) || 1);
      if (!vipSubManual.width) vipSubtitle.width = round2(measuredVipSub);
      var vipTextWidth = Number(vipSubtitle.width) || measuredVipSub;
      var vipLogoWidth = Number(vipSubtitleLogo.width) || 0;
      var vipGap = Number(config.subtitleGroupGap == null ? 5 : config.subtitleGroupGap);
      subtitleWidth = vipLogoWidth + vipGap + vipTextWidth;
      var vipLeft = centerX - subtitleWidth / 2;
      var vipLogoManual = vipSubtitleLogo.__manualOverrides || {};
      if (!vipLogoManual.x) vipSubtitleLogo.x = round2(vipLeft);
      if (!vipLogoManual.centerX) vipSubtitleLogo.centerX = round2(Number(vipSubtitleLogo.x || vipLeft) + vipLogoWidth / 2);
      if (!vipSubManual.x) vipSubtitle.x = round2(vipLeft + vipLogoWidth + vipGap);
      if (!vipSubManual.centerX) vipSubtitle.centerX = round2(Number(vipSubtitle.x || 0) + vipTextWidth / 2);
    } else if (subtitle && !subtitle.hidden) {
      var subtitleManual = subtitle.__manualOverrides || {};
      var measuredSubtitle = Math.max(1, Number(measure(subtitle)) || Number(subtitle.width) || 1);
      if (!subtitleManual.width) subtitle.width = round2(measuredSubtitle);
      subtitleWidth = Number(subtitle.width) || measuredSubtitle;
      if (!subtitleManual.x) subtitle.x = round2(centerX - subtitleWidth / 2);
      if (!subtitleManual.centerX) subtitle.centerX = round2(Number(subtitle.x || 0) + subtitleWidth / 2);
    }

    var protect = getLayer(template, keys.protect);
    if (protect && !protect.hidden) {
      var protectManual = protect.__manualOverrides || {};
      var protectWidth = Number(protect.width) || 0;
      if (!protectManual.x) protect.x = round2(centerX - protectWidth / 2);
      if (!protectManual.centerX) protect.centerX = round2(Number(protect.x || 0) + protectWidth / 2);
    }
    applySubtitleBackground(template, titleWidth, subtitleWidth, config, keys, centerX);
  }

  function createRule(config) {
    var keys = Object.assign({}, DEFAULT_LAYER_KEYS, config.layerKeys || {});
    var normalizedConfig = Object.assign({
      mainGroupGap: 9,
      subtitleGroupGap: 5,
      priceBigFontSize: 48,
      productAssetFolder: '共用素材',
      fontSizes: {},
      requiredFields: [],
      imageCtaValues: [],
    }, config);

    if (!normalizedConfig.ruleKey) throw new Error('WarmupBannerRuleFactory: ruleKey is required');
    if (!normalizedConfig.outputPrefix) throw new Error('WarmupBannerRuleFactory: outputPrefix is required');
    if (!normalizedConfig.templateAssetFolder) throw new Error('WarmupBannerRuleFactory: templateAssetFolder is required');

    var blockParser = createBlockParser(normalizedConfig);
    var createVariantRecords = createVariantFactory(normalizedConfig);
    var priceRules = createPriceRules(normalizedConfig);

    function beforeApplyRecordToTemplate(args) {
      var template = args.template;
      var record = args.record || {};
      var product = getLayer(template, keys.product);
      if (product) product.role = '商品圖1';
      hide(template, keys.subFrame);
      var missingFields = (normalizedConfig.requiredFields || []).filter(function (field) { return !trim(record[field]); });
      if (missingFields.length) {
        var sourceRow = record.__sourceRow ? 'Excel 第 ' + record.__sourceRow + ' 列，' : '';
        var note = trim(record.__備註No) ? '備註No ' + pad2(record.__備註No) + '，' : '';
        throw new Error((normalizedConfig.label || normalizedConfig.templateAssetFolder) + '：' + sourceRow + note + '必填欄位「' + missingFields.join('、') + '」為空白');
      }
      template.smartAssetPolicy = Object.assign({}, template.smartAssetPolicy, {
        productTransformIdentity: resolveSmartAssetIdentity(template, record, normalizedConfig),
      });
      delete template.smartAssetPolicy.productTransformScope;
      delete template.smartAssetPolicy.priceTransformScope;
    }

    function afterApplyRecordToTemplate(args) {
      var template = args.template;
      var record = args.record || (template && template.batchRecord) || {};
      var helpers = args.helpers || {};
      var centerX = resolveMainCenterX(template, normalizedConfig);

      var productHit = resolveProductAsset(template, record, args.diagnostics, normalizedConfig, keys);
      resolveKvBackground(template, record, normalizedConfig, keys);
      if (normalizedConfig.requireProductAsset === true && trim(record['商品圖1']) && !productHit) {
        var productLayer = getLayer(template, keys.product);
        var indexedAssets = window.AppState && window.AppState.assetFiles && Number(window.AppState.assetFiles.size || 0) > 0;
        if (!productLayer || indexedAssets || productLayer.__assetMissing === true || !String(productLayer.assetFilename || '').trim()) {
          var templateAssetFolder = resolveTemplateAssetFolder(template, record, normalizedConfig);
          var productAssetFolder = resolveProductAssetFolder(template, record, normalizedConfig);
          throw new Error((normalizedConfig.label || templateAssetFolder) + '：Excel 第 ' + (record.__sourceRow || '?') + ' 列，備註No ' + pad2(record.__備註No) + '，商品圖1「' + trim(record['商品圖1']) + '」找不到合法素材（僅允許 ' + templateAssetFolder + ' → ' + productAssetFolder + '）');
        }
      }

      var titleLayout = applyTitle(template, record, helpers, normalizedConfig, keys, centerX);
      var dependentCenterX = titleLayout.centerX;
      var subtitleCenterX = typeof normalizedConfig.subtitleCenterX === 'function'
        ? Number(normalizedConfig.subtitleCenterX(template))
        : Number(normalizedConfig.subtitleCenterX);
      if (!isFinite(subtitleCenterX)) subtitleCenterX = dependentCenterX;
      var subtitleWidth = applySubtitle(template, record, helpers, normalizedConfig, keys, subtitleCenterX);
      applyProtectText(template, record, keys, dependentCenterX);
      applyCta(template, record, normalizedConfig, keys);
      applySubtitleBackground(template, titleLayout.width, subtitleWidth, normalizedConfig, keys, subtitleCenterX);
      // Placement Preset is applied centrally by BatchManager before this dynamic after-hook.
    }

    function onTextChanged(args) {
      var key = args && args.key;
      var linked = [keys.titlePlain, keys.vipTitle, keys.directTitle, keys.subtitle, keys.vipSubtitle, keys.protect];
      if (linked.indexOf(key) < 0) return;
      refreshDynamicTextLayout(args.template, args.helpers || {}, normalizedConfig, keys);
    }

    return {
      label: normalizedConfig.label,
      tokens: normalizedConfig.tokens || [],
      targets: normalizedConfig.targets || [],
      priority: Number(normalizedConfig.priority || 0),
      dynamicLayout: true,
      legacyPresetOptional: normalizedConfig.legacyPresetOptional === true,
      rules: {
        blockParser: blockParser,
        createVariantRecords: createVariantRecords,
        priceRules: priceRules,
        ctaPolicy: {
          mode: 'explicit',
          imageValues: (normalizedConfig.imageCtaValues || []).slice(),
          fallbackToText: normalizedConfig.ctaImageFallbackToText !== false,
          templateAssetFolder: normalizedConfig.templateAssetFolder,
        },
        beforeApplyRecordToTemplate: beforeApplyRecordToTemplate,
        afterApplyRecordToTemplate: afterApplyRecordToTemplate,
        onTextChanged: onTextChanged,
      },
    };
  }

  function register(config) {
    if (!window.TemplateRuleRegistry || typeof window.TemplateRuleRegistry.register !== 'function') {
      throw new Error('WarmupBannerRuleFactory: TemplateRuleRegistry is not ready');
    }
    var rule = createRule(config || {});
    return window.TemplateRuleRegistry.register(config.ruleKey, rule);
  }

  window.WarmupBannerRuleFactory = Object.freeze({
    VERSION: '1.3.0',
    DEFAULT_PRICE_COLORS: window.WarmupPriceStyleResolver && window.WarmupPriceStyleResolver.PRICE_COLORS,
    DEFAULT_PRICE_COLOR_RULES: window.WarmupPriceStyleResolver && window.WarmupPriceStyleResolver.DEFAULT_COLOR_RULES,
    createRule: createRule,
    register: register,
  });
})();
