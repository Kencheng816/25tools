(function initArLargeBnRules() {
  'use strict';

  var FAMILY = 'ar_large_bn_25_warmup';
  var NORMAL_TEMPLATE = '07_AR Large BN';
  var PROTECTED_TEMPLATE = '07_AR Large BN_保護文字款';
  var MAX_SAFE_WIDTH = 620;
  var VIP_KEYWORD = /VIP/gi;
  var EXPOSURE_VARIANTS = Object.freeze({
    '免運綠': Object.freeze({ show: ['KV_BG_免運', '蝦皮免運_LOGO_白'] }),
    '商城紅': Object.freeze({ show: ['KV_BG_蝦皮商城', '蝦皮商城_LOGO_白'] }),
    '全站橘': Object.freeze({ show: ['KV_BG_蝦皮購物', '蝦皮購物_LOGO_白'] }),
    'VIP Logo券面': Object.freeze({ show: ['KV_BG_蝦皮VIP', '直式_蝦皮VIP_LOGO'] }),
  });
  var EXPOSURE_LAYER_KEYS = Object.freeze([
    'KV_BG_免運',
    '蝦皮免運_LOGO_白',
    'KV_BG_蝦皮商城',
    '蝦皮商城_LOGO_白',
    'KV_BG_蝦皮購物',
    '蝦皮購物_LOGO_白',
    'KV_BG_蝦皮VIP',
    '直式_蝦皮VIP_LOGO',
  ]);


  function createCommonBlockParser() {
    var factory = window.WarmupBannerRuleFactory;
    if (factory && typeof factory.createBlockParser === 'function') {
      return factory.createBlockParser({
        label: 'AR Large BN',
        templateType: FAMILY,
        blockParserValidateWarmupExposure: false,
        blockParserRequireNumericNote: false,
        blockParserAcceptPayloadRows: true,
      });
    }

    // 舊版 Factory 尚未公開 createBlockParser 時的相容層。
    // 行為保持 Warmup 共用 Block Parser 的欄位掃描方式，只關閉 AR Large BN 不適用的兩項驗證：
    // 1) 曝光只能是「暖身／正式」；2) 備註 No 必須是數字。
    return function commonWarmupBlockParser(ctx) {
      var rows = ctx.rows || [];
      var header = ctx.header || {};
      var headerRow = Number(header.headerRow || 0);
      var startRow = Number(ctx.rowIndex || headerRow + 1);
      var endRow = Number(ctx.nextHeaderRow || rows.length);
      var head = rows[headerRow] || [];
      var normalizeHeader = function (value) {
        return String(value == null ? '' : value).toLowerCase().replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.]+/g, '');
      };
      var findColumn = function (predicate) {
        for (var column = 0; column < head.length; column += 1) {
          if (predicate(normalizeHeader(head[column]))) return column;
        }
        return -1;
      };
      var columns = {
        no: findColumn(function (name) { return name === '備註'; }),
        code: findColumn(function (name) { return name === '編號'; }),
        expose: findColumn(function (name) { return name === '曝光'; }),
        title: findColumn(function (name) { return name.indexOf('主標') === 0; }),
        subtitle: findColumn(function (name) { return name.indexOf('副標') === 0; }),
        protect: findColumn(function (name) { return name.indexOf('保護文字') >= 0; }),
        cta: findColumn(function (name) { return name.indexOf('cta') >= 0; }),
        product: findColumn(function (name) { return name.indexOf('商品圖1') >= 0; }),
        price: findColumn(function (name) { return name === '價格'; }),
      };
      var readCell = function (row, column) {
        return column >= 0 && row[column] != null ? row[column] : '';
      };
      var trimCell = function (value) {
        return String(value == null ? '' : value).replace(/_x000d_/gi, '\n').trim();
      };
      var records = [];

      for (var rowIndex = startRow; rowIndex < endRow; rowIndex += 1) {
        var row = rows[rowIndex] || [];
        var exposure = trimCell(readCell(row, columns.expose));
        var noteText = trimCell(readCell(row, columns.no));
        var code = trimCell(readCell(row, columns.code));
        var title = trimCell(readCell(row, columns.title));
        var subtitle = trimCell(readCell(row, columns.subtitle));
        var protect = trimCell(readCell(row, columns.protect));
        var cta = trimCell(readCell(row, columns.cta));
        var product = trimCell(readCell(row, columns.product));
        var price = trimCell(readCell(row, columns.price));
        if (![exposure, noteText, code, title, subtitle, protect, cta, product, price].some(Boolean)) continue;

        records.push({
          '主標': title,
          '副標': subtitle,
          '商品圖1': product,
          '價格': price,
          '保護文字': protect,
          'CTA': cta,
          '__曝光': exposure,
          '__備註No': noteText,
          '__編號': code,
          '__sourceRow': rowIndex + 1,
          '__sourceName': trimCell(ctx.productName || 'AR Large BN'),
        });
      }

      if (!records.length) return null;
      return { records: records, templateType: FAMILY };
    };
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function getLayer(template, key) {
    return template && template.layers ? template.layers[key] || null : null;
  }

  function setVisible(layer, visible) {
    if (!layer) return;
    layer.hidden = !visible;
    layer.visible = !!visible;
  }

  // 與 HBN / POPUP / DD Card 使用同一份 SPTextStandard 規格。
  // AR Large 在 Rule 寫入主標 / VIP 主標 / 副標時就立即建立 82% 特殊符號 ranges，
  // 不再只依賴 Core 的全域補套，避免不同覆蓋版本造成 AR Large 顯示不一致。
  function applyTitleTextStandard(layer, text) {
    if (!layer) return;
    var standard = window.SPTextStandard;
    var bigFontSize = Number(layer.fontSizePx != null ? layer.fontSizePx : layer.fontSizePt);
    if (!standard || typeof standard.titleRanges !== 'function' || !isFinite(bigFontSize) || bigFontSize <= 0) return;

    var ranges = standard.titleRanges(text, bigFontSize, {
      color: layer.color || '#FFFFFF',
      smallBaselineOffset: 0,
    });
    if (typeof standard.isDualSize === 'function' && standard.isDualSize(ranges)) {
      layer.textStyleRanges = ranges;
      layer.styledTextVerticalAlign = 'source-baseline';
      return;
    }

    // 文字被改成不含特殊符號時，清掉上一筆留下的小字 range。
    if (layer.textStyleRanges) delete layer.textStyleRanges;
    layer.styledTextVerticalAlign = 'default';
  }

  function enableDynamicBounds(layer) {
    if (!layer) return;
    layer.useDynamicBounds = true;
  }

  function recordNo(record) {
    return clean(record && (record.__備註No || record.__編號 || record.__sourceRow)) || '未提供';
  }

  function exposureOf(record) {
    return clean(record && (record.__曝光 || record['曝光']));
  }

  function assertRequiredRecord(record) {
    var exposure = exposureOf(record);
    var title = clean(record && record['主標']);
    if (!exposure) throw new Error('AR Large BN（備註No=' + recordNo(record) + '）曝光不可空白');
    if (!Object.prototype.hasOwnProperty.call(EXPOSURE_VARIANTS, exposure)) {
      throw new Error(
        'AR Large BN（備註No=' + recordNo(record) + '）不支援曝光「' + exposure + '」。僅接受：' +
        Object.keys(EXPOSURE_VARIANTS).join('、')
      );
    }
    if (!title) throw new Error('AR Large BN（備註No=' + recordNo(record) + '）主標不可空白');
    return { exposure: exposure, title: title };
  }

  function resolveRecordTemplateRoute(args) {
    var record = args && args.record || {};
    assertRequiredRecord(record);
    var protectedVariant = !!clean(record['保護文字']);
    var id = protectedVariant ? PROTECTED_TEMPLATE : NORMAL_TEMPLATE;
    return {
      key: FAMILY,
      family: FAMILY,
      label: id,
      templateId: id,
      templateFile: id + '.json',
      outputPrefix: id,
    };
  }

  function captureBaseline(template) {
    if (template.__arLargeBnBaseline) return template.__arLargeBnBaseline;
    var title = getLayer(template, 'title');
    var vipLogo = getLayer(template, '蝦皮VIP_LOGO_橘色');
    var vipText = getLayer(template, '蝦皮VIP_主標題_右');
    var vipLeft = vipLogo ? Number(vipLogo.x || 0) : 0;
    var vipRight = vipText
      ? Number(vipText.x || 0) + Number(vipText.width || 0)
      : (vipLogo ? Number(vipLogo.x || 0) + Number(vipLogo.width || 0) : 0);
    var vipGap = vipLogo && vipText
      ? Number(vipText.x || 0) - (Number(vipLogo.x || 0) + Number(vipLogo.width || 0))
      : 0;

    template.__arLargeBnBaseline = {
      titleCenterX: title
        ? Number(title.centerX != null ? title.centerX : Number(title.x || 0) + Number(title.width || 0) / 2)
        : 0,
      vipGroupCenterX: vipLogo
        ? (vipLeft + vipRight) / 2
        : (title ? Number(title.centerX != null ? title.centerX : Number(title.x || 0) + Number(title.width || 0) / 2) : 0),
      vipGap: Math.max(0, vipGap),
    };
    return template.__arLargeBnBaseline;
  }

  function applyExposureVariant(template, exposure) {
    EXPOSURE_LAYER_KEYS.forEach(function (key) { setVisible(getLayer(template, key), false); });
    EXPOSURE_VARIANTS[exposure].show.forEach(function (key) {
      var layer = getLayer(template, key);
      if (!layer) throw new Error('AR Large BN 公版缺少曝光圖層「' + key + '」');
      setVisible(layer, true);
    });
  }

  function applyMainTitleSemantic(template, record) {
    var rawTitle = clean(record['主標']);
    var hasVip = /VIP/i.test(rawTitle);
    var title = getLayer(template, 'title');
    var vipLogo = getLayer(template, '蝦皮VIP_LOGO_橘色');
    var vipText = getLayer(template, '蝦皮VIP_主標題_右');

    if (!title) throw new Error('AR Large BN 公版缺少主標圖層「title」');

    if (!hasVip) {
      title.text = rawTitle;
      applyTitleTextStandard(title, rawTitle);
      setVisible(title, true);
      setVisible(vipLogo, false);
      setVisible(vipText, false);
      template.__arLargeBnTitleMode = 'plain';
      return;
    }

    // 目前規格明確不支援「VIP 主標 + 保護文字款」。若工單誤植，直接 blocking，避免靜默產錯圖。
    if (!vipLogo) {
      throw new Error('AR Large BN（備註No=' + recordNo(record) + '）目前不支援「VIP 主標 + 保護文字款」組合');
    }

    var suffix = rawTitle.replace(VIP_KEYWORD, '').trim();
    setVisible(title, false);
    setVisible(vipLogo, true);
    if (vipText) {
      vipText.text = suffix;
      applyTitleTextStandard(vipText, suffix);
      setVisible(vipText, !!suffix);
    }
    template.__arLargeBnTitleMode = 'vip';
  }

  function applyOptionalText(template, record) {
    var subtitle = getLayer(template, 'subtitle');
    var subtitleFrame = getLayer(template, '副標題_線框');
    var ctaText = getLayer(template, 'CTA_文案');
    var ctaBg = getLayer(template, 'CTA_底色');
    var protect = getLayer(template, '保護文字');
    var subtitleValue = clean(record['副標']);
    var ctaValue = clean(record['CTA']);
    var protectValue = clean(record['保護文字']);

    if (subtitle) {
      subtitle.text = subtitleValue;
      applyTitleTextStandard(subtitle, subtitleValue);
      setVisible(subtitle, !!subtitleValue);
    }
    setVisible(subtitleFrame, !!subtitleValue);

    if (ctaText) {
      ctaText.text = ctaValue;
      setVisible(ctaText, !!ctaValue);
    }
    setVisible(ctaBg, !!ctaValue);

    if (protect) {
      protect.text = protectValue;
      setVisible(protect, !!protectValue);
    } else if (protectValue) {
      throw new Error('AR Large BN 保護文字款公版缺少「保護文字」圖層');
    }
  }

  function beforeApplyRecordToTemplate(args) {
    var record = args && args.record || {};
    // AR Large BN 沒有商品圖／價格需求：在 Core 掃描前清空，避免未來模板新增一般 image layer 時誤進商品引擎。
    record['商品圖1'] = '';
    record['商品圖2'] = '';
    record['價格'] = '';
    record['價格_左'] = '';
    record['價格_中'] = '';
    record['價格_右'] = '';
  }

  function afterApplyRecordToTemplate(args) {
    var template = args && args.template;
    var record = args && args.record || {};
    var required = assertRequiredRecord(record);
    captureBaseline(template);
    applyExposureVariant(template, required.exposure);
    applyMainTitleSemantic(template, record);
    applyOptionalText(template, record);
  }

  function manual(layer) {
    return layer && layer.__manualOverrides || {};
  }

  function measuredTextWidth(layer, helpers) {
    if (!layer || layer.hidden) return 0;
    var measured = Math.max(1, Number(helpers.measureTextWidth(layer)) || Number(layer.width) || 1);
    return round2(measured);
  }

  function setLayerWidthCentered(layer, desiredWidth, centerX) {
    if (!layer) return desiredWidth;
    var overrides = manual(layer);
    if (!overrides.width) layer.width = round2(desiredWidth);
    var width = Math.max(0, Number(layer.width) || desiredWidth || 0);
    if (!overrides.x) layer.x = round2(centerX - width / 2);
    if (!overrides.centerX) layer.centerX = round2(Number(layer.x || 0) + width / 2);
    return width;
  }

  function assertSafeWidth(record, field, width) {
    var actual = round2(width);
    if (actual > MAX_SAFE_WIDTH) {
      throw new Error(
        'AR Large BN（備註No=' + recordNo(record) + '）' + field +
        ' 實際寬度 ' + actual + 'px 超過最大安全寬度 ' + MAX_SAFE_WIDTH + 'px'
      );
    }
  }

  function layoutPlainTitle(template, helpers, baseline, record) {
    var title = getLayer(template, 'title');
    var width = measuredTextWidth(title, helpers);
    assertSafeWidth(record, '主標', width);
    return {
      centerX: baseline.titleCenterX,
      width: setLayerWidthCentered(title, width, baseline.titleCenterX),
    };
  }

  function layoutVipTitle(template, helpers, baseline, record) {
    var logo = getLayer(template, '蝦皮VIP_LOGO_橘色');
    var text = getLayer(template, '蝦皮VIP_主標題_右');
    if (!logo || logo.hidden) throw new Error('AR Large BN VIP 主標缺少「蝦皮VIP_LOGO_橘色」');

    var logoWidth = Math.max(1, Number(logo.width) || 1);
    var textWidth = text && !text.hidden ? measuredTextWidth(text, helpers) : 0;
    var gap = textWidth > 0 ? Math.max(0, Number(baseline.vipGap) || 0) : 0;
    var groupWidth = logoWidth + gap + textWidth;
    assertSafeWidth(record, 'VIP主標群組', groupWidth);

    var centerX = baseline.vipGroupCenterX;
    var left = centerX - groupWidth / 2;
    var logoManual = manual(logo);
    if (!logoManual.x) logo.x = round2(left);
    if (!logoManual.centerX) logo.centerX = round2(Number(logo.x || left) + logoWidth / 2);

    if (text && !text.hidden) {
      var textManual = manual(text);
      if (!textManual.width) text.width = round2(textWidth);
      var effectiveTextWidth = Number(text.width) || textWidth;
      if (!textManual.x) text.x = round2(left + logoWidth + gap);
      if (!textManual.centerX) text.centerX = round2(Number(text.x || 0) + effectiveTextWidth / 2);
      groupWidth = logoWidth + gap + effectiveTextWidth;
      assertSafeWidth(record, 'VIP主標群組', groupWidth);
    }

    return { centerX: centerX, width: groupWidth };
  }

  function resolveSubtitleFrameWidth(mainWidth, subtitleWidth) {
    if (mainWidth > subtitleWidth) {
      return mainWidth - subtitleWidth < 20 ? subtitleWidth + 20 : mainWidth;
    }
    return subtitleWidth;
  }

  function layoutSubtitleAndCta(template, helpers, mainLayout, record) {
    var subtitle = getLayer(template, 'subtitle');
    var frame = getLayer(template, '副標題_線框');
    var cta = getLayer(template, 'CTA_文案');
    var ctaBg = getLayer(template, 'CTA_底色');
    var centerX = mainLayout.centerX;
    var subtitleWidth = 0;
    var frameWidth = 0;

    if (subtitle && !subtitle.hidden) {
      subtitleWidth = measuredTextWidth(subtitle, helpers);
      assertSafeWidth(record, '副標', subtitleWidth);
      setLayerWidthCentered(subtitle, subtitleWidth, centerX);
      frameWidth = resolveSubtitleFrameWidth(mainLayout.width, subtitleWidth);
      assertSafeWidth(record, '副標題_線框', frameWidth);
      if (!frame) throw new Error('AR Large BN 公版缺少「副標題_線框」');
      enableDynamicBounds(frame);
      frameWidth = setLayerWidthCentered(frame, frameWidth, centerX);
    } else if (frame) {
      setVisible(frame, false);
    }

    if (cta && !cta.hidden) {
      var ctaWidth = measuredTextWidth(cta, helpers);
      assertSafeWidth(record, 'CTA', ctaWidth);
      setLayerWidthCentered(cta, ctaWidth, centerX);
      var desiredBgWidth = subtitleWidth > 0 ? frameWidth : mainLayout.width;
      assertSafeWidth(record, 'CTA_底色', desiredBgWidth);
      if (!ctaBg) throw new Error('AR Large BN 公版缺少「CTA_底色」');
      enableDynamicBounds(ctaBg);
      var actualBgWidth = setLayerWidthCentered(ctaBg, desiredBgWidth, centerX);
      if (ctaWidth > actualBgWidth) {
        throw new Error(
          'AR Large BN（備註No=' + recordNo(record) + '）CTA 文字寬度 ' + round2(ctaWidth) +
          'px 超過 CTA_底色寬度 ' + round2(actualBgWidth) + 'px'
        );
      }
    } else if (ctaBg) {
      setVisible(ctaBg, false);
    }
  }

  function applyProgrammaticLayout(args) {
    var template = args && args.template;
    var helpers = args && args.helpers || {};
    var record = template && template.batchRecord || {};
    var baseline = captureBaseline(template);
    var mainLayout = template.__arLargeBnTitleMode === 'vip'
      ? layoutVipTitle(template, helpers, baseline, record)
      : layoutPlainTitle(template, helpers, baseline, record);
    layoutSubtitleAndCta(template, helpers, mainLayout, record);
  }

  window.TemplateRuleRegistry.register(FAMILY, {
    label: '25節 暖身 AR Large BN',
    tokens: ['AR Large BN', 'AR Large', 'ARLargeBN'],
    targets: [NORMAL_TEMPLATE, PROTECTED_TEMPLATE],
    legacyPresetOptional: true,
    dynamicLayout: true,
    priority: 40,
    rules: {
      blockParser: createCommonBlockParser(),
      ctaPolicy: { mode: 'explicit', imageValues: [], fallbackToText: true },
      resolveRecordTemplateRoute: resolveRecordTemplateRoute,
      beforeApplyRecordToTemplate: beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: afterApplyRecordToTemplate,
      layoutRules: {
        applyProgrammaticLayout: applyProgrammaticLayout,
      },
    },
  });
})();
