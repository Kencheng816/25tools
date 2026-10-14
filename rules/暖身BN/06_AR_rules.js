/* 06_AR 公版規則
 *
 * 工單欄位：AR案型
 * - 必須剛好 2 個有效行，只尊重 Excel 實際換行，不猜斷行。
 * - Variant 優先序：VIP > 大免運 > 25號 > 2上3下 > 3上2下。
 * - 英文 / 數字 / 半形符號以 0.5 字計，其他全形 / CJK 字元以 1 字計，總和無條件進位。
 * - 每次套版先隱藏全部 AR 圖層，再只顯示當前 Variant。
 */
(function registerArWarmupRule() {
  'use strict';

  var FAMILY = 'ar_25_bn_warmup';
  var TEMPLATE_ID = '06_AR';
  var OUTPUT_PREFIX = '06_AR';

  var LAYERS = Object.freeze({
    vipIcon: '蝦皮VIP_icon_橘色',
    vipText: '蝦皮VIP_AR案型_下',
    vipBg: '蝦皮VIP_KV_BG',
    freeTop: '大免運_AR案型_上',
    freeBottom: '大免運_AR案型_下',
    freeBg: '大免運_KV_BG',
    twoTop: '2上3下_AR案型_上',
    twoBottom: '2上3下_AR案型_下',
    threeTop: '3上2下_AR案型_上',
    threeBottom: '3上2下_AR案型_下',
    day25Icon: '25號_黃字',
    day25Text: '25號_AR案型_下',
    normalBg: 'kv_bg',
  });

  function toText(value) {
    return String(value == null ? '' : value).replace(/_x000d_/gi, '\n');
  }

  function trim(value) {
    return toText(value).trim();
  }

  function pad2(value) {
    return String(Math.max(0, Math.round(Number(value) || 0))).padStart(2, '0');
  }

  function getLayer(template, key) {
    return template && template.layers ? template.layers[key] || null : null;
  }

  function setHidden(template, key, hidden) {
    var layer = getLayer(template, key);
    if (layer) layer.hidden = !!hidden;
  }

  function hideAll(template) {
    Object.keys(template && template.layers || {}).forEach(function (key) {
      setHidden(template, key, true);
    });
  }

  function normalizeLines(raw) {
    return toText(raw)
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  function containsVip(value) {
    return /vip/i.test(value);
  }

  function containsFreeShipping(value) {
    return String(value || '').indexOf('大免運') >= 0;
  }

  function containsDay25(value) {
    return String(value || '').indexOf('25號') >= 0;
  }

  function stripKeyword(value, keyword) {
    var text = String(value || '');
    if (keyword === 'VIP') return text.replace(/vip/ig, '');
    return text.split(keyword).join('');
  }

  function joinRemainingText(lines, keyword) {
    return lines.map(function (line) { return stripKeyword(line, keyword).trim(); }).filter(Boolean).join('');
  }

  // Visual-width heuristic confirmed by user:
  // ASCII/Latin-1 and half-width forms = 0.5; CJK/full-width characters = 1.
  function characterWeight(character) {
    var code = character.codePointAt(0);
    if (code <= 0x00FF) return 0.5;
    if (code >= 0xFF61 && code <= 0xFF9F) return 0.5;
    return 1;
  }

  function visualCharacterCount(text) {
    var total = Array.from(String(text || '')).reduce(function (sum, character) {
      return sum + characterWeight(character);
    }, 0);
    return Math.ceil(total - 1e-9);
  }

  function classifyVariant(lines) {
    var combined = lines.join('\n');
    if (containsVip(combined)) return { key: 'vip' };
    if (containsFreeShipping(combined)) return { key: 'freeShipping' };
    if (containsDay25(combined)) return { key: 'day25' };

    var topCount = visualCharacterCount(lines[0]);
    var bottomCount = visualCharacterCount(lines[1]);
    if (topCount === 2 && bottomCount === 3) return { key: 'twoTopThreeBottom', topCount: topCount, bottomCount: bottomCount };
    if (topCount === 3 && bottomCount === 2) return { key: 'threeTopTwoBottom', topCount: topCount, bottomCount: bottomCount };
    return { key: 'unsupported', topCount: topCount, bottomCount: bottomCount };
  }

  function buildContext(record) {
    var raw = trim(record && (record['AR案型'] != null ? record['AR案型'] : record['主標']));
    var lines = normalizeLines(raw);
    return { raw: raw, lines: lines, variant: lines.length === 2 ? classifyVariant(lines) : null };
  }

  function formatRecordPrefix(record) {
    var row = record && record.__sourceRow ? 'Excel 第 ' + record.__sourceRow + ' 列，' : '';
    var note = trim(record && record.__備註No) ? '備註No ' + pad2(record.__備註No) + '，' : '';
    return row + note;
  }

  function pushError(args, message, context) {
    if (Array.isArray(args && args.diagnostics)) {
      args.diagnostics.push({
        field: 'AR案型',
        status: 'error',
        value: context && context.raw || '',
        target: message,
      });
    }
    throw new Error('25節 暖身 AR：' + formatRecordPrefix(args && args.record) + message + '；AR案型「' + (context && context.raw || '') + '」');
  }

  function validateContext(args, context) {
    if (!context.raw) pushError(args, '必填欄位「AR案型」為空白', context);
    if (context.lines.length !== 2) {
      pushError(args, 'AR案型必須剛好有 2 個非空白行，目前為 ' + context.lines.length + ' 行', context);
    }
    if (!context.variant || context.variant.key === 'unsupported') {
      var counts = context.variant ? '（上=' + context.variant.topCount + '字、下=' + context.variant.bottomCount + '字）' : '';
      pushError(args, '無法辨識 AR Variant' + counts + '，僅支援 VIP／大免運／25號／2上3下／3上2下', context);
    }
  }

  function rememberTextStyleProfiles(template) {
    if (!template || template.__arTextStyleProfiles) return;
    var profiles = {};
    Object.keys(template.layers || {}).forEach(function (key) {
      var layer = template.layers[key];
      if (!layer || layer.type !== 'text') return;
      var ranges = Array.isArray(layer.textStyleRanges) ? layer.textStyleRanges : [];
      var sizes = ranges.map(function (range) { return Number(range.fontSizePx); }).filter(function (size) { return isFinite(size) && size > 0; });
      var maxSize = sizes.length ? Math.max.apply(Math, sizes) : Number(layer.fontSizePx || 0);
      var minSize = sizes.length ? Math.min.apply(Math, sizes) : maxSize;
      profiles[key] = {
        baseSize: Number(layer.fontSizePx || maxSize || 0),
        color: String(layer.color || '#FFFFFF'),
        mixedSymbolSize: maxSize > 0 && minSize > 0 && Math.abs(maxSize - minSize) > 0.01,
        smallRatio: maxSize > 0 && minSize > 0 ? minSize / maxSize : 1,
      };
    });
    template.__arTextStyleProfiles = profiles;
  }

  function buildTextStyleRanges(text, profile) {
    text = String(text == null ? '' : text);
    if (!text || !profile || !(profile.baseSize > 0)) return [];
    var ranges = [];
    var smallSymbols = { '%': true, '％': true, '$': true, '＄': true, ',': true, '，': true };
    function append(size, from, to) {
      var previous = ranges[ranges.length - 1];
      if (previous && previous.fontSizePx === size && previous.to === from) { previous.to = to; return; }
      ranges.push({ from: from, to: to, fontSizePx: size, color: profile.color, fill: profile.color });
    }
    for (var index = 0; index < text.length; index += 1) {
      var character = text[index];
      var small = profile.mixedSymbolSize && !!smallSymbols[character];
      var size = Math.round((profile.baseSize * (small ? profile.smallRatio : 1)) * 100) / 100;
      append(size, index, index + 1);
    }
    return ranges;
  }

  function setText(template, key, text) {
    var layer = getLayer(template, key);
    if (!layer) return;
    rememberTextStyleProfiles(template);
    var value = String(text == null ? '' : text);
    layer.text = value;
    layer.hidden = false;
    // Photoshop 匯出的 range 長度是示例文字專用；換文案時重新建立 range，
    // 同時保留該圖層原本「符號小字 / 全字同尺寸」的視覺規則。
    var profile = template.__arTextStyleProfiles && template.__arTextStyleProfiles[key];
    var ranges = buildTextStyleRanges(value, profile);
    if (ranges.length) layer.textStyleRanges = ranges;
    else if (layer.textStyleRanges) delete layer.textStyleRanges;
    layer.styledTextVerticalAlign = 'source-baseline';
  }

  function applyVariant(template, context) {
    var lines = context.lines;
    var key = context.variant.key;
    hideAll(template);

    if (key === 'vip') {
      setHidden(template, LAYERS.vipIcon, false);
      setHidden(template, LAYERS.vipBg, false);
      setText(template, LAYERS.vipText, joinRemainingText(lines, 'VIP'));
      return;
    }

    if (key === 'freeShipping') {
      setHidden(template, LAYERS.freeBg, false);
      setText(template, LAYERS.freeTop, lines[0]);
      setText(template, LAYERS.freeBottom, lines[1]);
      return;
    }

    if (key === 'day25') {
      setHidden(template, LAYERS.day25Icon, false);
      setHidden(template, LAYERS.normalBg, false);
      setText(template, LAYERS.day25Text, joinRemainingText(lines, '25號'));
      return;
    }

    if (key === 'twoTopThreeBottom') {
      setHidden(template, LAYERS.normalBg, false);
      setText(template, LAYERS.twoTop, lines[0]);
      setText(template, LAYERS.twoBottom, lines[1]);
      return;
    }

    if (key === 'threeTopTwoBottom') {
      setHidden(template, LAYERS.normalBg, false);
      setText(template, LAYERS.threeTop, lines[0]);
      setText(template, LAYERS.threeBottom, lines[1]);
    }
  }

  var rule = window.WarmupBannerRuleFactory.createRule({
    ruleKey: FAMILY,
    label: '25節 暖身 AR',
    tokens: ['AR'],
    targets: [TEMPLATE_ID],
    priority: 30,
    legacyPresetOptional: true,
    templateType: 'ar_25_bn_warmup',
    titleHeaderNames: ['AR案型'],
    titleMirrorField: 'AR案型',
    outputPrefix: OUTPUT_PREFIX,
    outputIncludeExposure: false,
    templateAssetFolder: TEMPLATE_ID,
    productAssetFolder: '共用素材',
    // AR 沒有 HBN 類的主標/副標/P/CTA；全部使用不存在的 key，避免共用 factory 動到 AR Variant 圖層。
    layerKeys: {
      kvBg: '__AR_UNUSED_KV__',
      product: '__AR_UNUSED_PRODUCT__',
      protect: '__AR_UNUSED_PROTECT__',
      subBg: '__AR_UNUSED_SUB_BG__',
      subtitle: '__AR_UNUSED_SUBTITLE__',
      vipSubtitleLogo: '__AR_UNUSED_VIP_SUB_LOGO__',
      vipSubtitle: '__AR_UNUSED_VIP_SUBTITLE__',
      titlePlain: '__AR_UNUSED_TITLE__',
      vipLogo: '__AR_UNUSED_VIP_LOGO__',
      vipTitle: '__AR_UNUSED_VIP_TITLE__',
      directLogo: '__AR_UNUSED_DIRECT_LOGO__',
      directTitle: '__AR_UNUSED_DIRECT_TITLE__',
      ctaText: '__AR_UNUSED_CTA_TEXT__',
      ctaBg: '__AR_UNUSED_CTA_BG__',
      ctaTri: '__AR_UNUSED_CTA_TRI__',
      subFrame: '__AR_UNUSED_SUB_FRAME__',
    },
    requiredFields: [],
    requireProductAsset: false,
    imageCtaValues: [],
  });

  // AR 工單結構與 HBN / DD Card / POPUP 不同：
  // - 曝光可為「暖身 - 正式」等複合值。
  // - 備註No 可整段空白；空白時依有效 AR Record 順序自動編號。
  // 因此 AR 必須完整接管自己的 blockParser，禁止使用共用 factory parser。
  rule.rules.blockParser = function arBlockParser(ctx) {
    var policy = window.SpecialBlockParserPolicy;
    if (!policy) throw new Error('25節 暖身 AR：SpecialBlockParserPolicy 尚未載入');

    var rows = ctx && ctx.rows || [];
    var headerRowIndex = Number(ctx && ctx.header && ctx.header.headerRow || 0);
    var startRow = Number(ctx && ctx.rowIndex || headerRowIndex + 1);
    var endRow = Number(ctx && ctx.nextHeaderRow || rows.length);
    var headerRow = rows[headerRowIndex] || [];

    var columns = {
      note: policy.findColumn(headerRow, function (name) { return name === '備註'; }),
      code: policy.findColumn(headerRow, function (name) { return name === '編號'; }),
      exposure: policy.findColumn(headerRow, function (name) { return name === '曝光'; }),
      arType: policy.findColumn(headerRow, function (name) { return name.indexOf('ar案型') === 0; }),
    };
    if (columns.arType < 0) return null;

    var records = [];
    var allocateNote = policy.createNoteAllocator(records);
    for (var rowIndex = startRow; rowIndex < endRow; rowIndex += 1) {
      var row = rows[rowIndex] || [];
      var arText = policy.trim(policy.readCell(row, columns.arType));
      if (!arText) continue;

      var exposure = policy.trim(policy.readCell(row, columns.exposure));
      if (!policy.isWarmupOrFormalExposure(exposure)) continue;

      var note = allocateNote(policy.readCell(row, columns.note));
      records.push({
        '主標': arText,
        'AR案型': arText,
        '副標': '',
        '商品圖1': '',
        '價格': '',
        '保護文字': '',
        'CTA': '',
        '__曝光': exposure,
        '__備註No': note,
        '__編號': policy.trim(policy.readCell(row, columns.code)),
        '__sourceRow': rowIndex + 1,
        '__sourceName': policy.trim(ctx && ctx.productName || 'AR'),
      });
    }

    if (!records.length) return null;
    return { records: records, templateType: 'ar-special' };
  };

  rule.rules.priceRules = { enabled: false, templateLayouts: {}, productLayouts: {}, classifiers: [] };
  rule.rules.ctaPolicy = { mode: 'rule-managed', imageValues: [], fallbackToText: false };

  rule.rules.resolveRecordTemplateRoute = function resolveRecordTemplateRoute(args) {
    var blockName = trim(args && args.block && args.block.name);
    var normalized = args && args.helpers && typeof args.helpers.normalizeRouteValue === 'function'
      ? args.helpers.normalizeRouteValue(blockName)
      : blockName.toLowerCase().replace(/[\s_\-]+/g, '');
    if (normalized !== 'ar') return null;
    return {
      key: FAMILY,
      family: FAMILY,
      label: TEMPLATE_ID,
      templateId: TEMPLATE_ID,
      templateFile: TEMPLATE_ID + '.json',
      outputPrefix: OUTPUT_PREFIX,
    };
  };

  rule.rules.beforeApplyRecordToTemplate = function beforeApplyRecordToTemplate(args) {
    var context = buildContext(args.record || {});
    rememberTextStyleProfiles(args.template);
    hideAll(args.template);
    validateContext(args, context);
    args.template.__arVariantContext = context;
  };

  rule.rules.afterApplyRecordToTemplate = function afterApplyRecordToTemplate(args) {
    var context = args.template && args.template.__arVariantContext || buildContext(args.record || {});
    validateContext(args, context);
    applyVariant(args.template, context);
    args.template.arVariant = context.variant.key;
    if (Array.isArray(args.diagnostics)) {
      args.diagnostics.push({
        field: 'AR案型',
        status: 'ok',
        value: context.raw,
        target: context.variant.key,
      });
    }
  };

  window.TemplateRuleRegistry.register(FAMILY, rule);
  window.__AR_RULE_VERSION = '2026-08-10b｜AR特規Parser＋複合曝光＋自動備註No＋五型Variant';
})();
