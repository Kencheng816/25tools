/* SP 文字標準（跨版位共用） — window.SPTextStandard
 *
 * 核心原則：
 * 1. 各公版只提供「大字級、大小字比例、詞庫」；分段邏輯由此模組統一處理。
 * 2. 價格詞庫可由 Rule 擴充；未命中的中文字預設為大字。
 * 3. textStyleRanges 僅描述字級與顏色；垂直位置由 Renderer 依 JSON／初始價格層保存的 source-baseline 處理。
 */
/* 整合版：以外廣 OM 版為共用單一版本（＝正式BN／暖身BN／KV／MS 版 ＋ applyPriceTextLayer；A 系不會呼叫該函式，price.specialCharRanges82=false）。 */
(function () {
  'use strict';

  var TITLE_SMALL_RATIO = 0.82;
  var PRICE_SMALL_RATIO = 0.795;
  var DEFAULT_FONT = 'ShopeeNotoSans Content';
  var DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.08;

  var CAPSULE_PADDING_RATIO = 40 / 62;
  var CAPSULE_THRESHOLD_RATIO = 60 / 62;

  // 使用者已確認的共用價格詞庫。
  // bigTokens 優先於 smallTokens，故「現折」會整詞為大字，而單獨出現在「93折」尾端的「折」仍為小字。
  var DEFAULT_PRICE_BIG_TOKENS = ['現折', '回饋'];
  var DEFAULT_PRICE_SMALL_TOKENS = ['蝦幣', '折', '起'];
  var PRICE_SMALL_SYMBOLS = { '%': 1, '％': 1, '＄': 1, '$': 1, ',': 1, '，': 1, '﹐': 1, '︐': 1 };

  function round2(n) { return Math.round(Number(n) * 100) / 100; }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : (d || 0); }
  function isDigit(ch) { return ch >= '0' && ch <= '9'; }

  function titleSmall(bigPt) { return round2(num(bigPt) * TITLE_SMALL_RATIO); }
  function titlePair(bigPt) { return { big: round2(num(bigPt)), small: titleSmall(bigPt) }; }
  function priceSmall(bigPt, ratio) { return round2(num(bigPt) * num(ratio, PRICE_SMALL_RATIO)); }
  function pricePair(bigPt, ratio) { return { big: round2(num(bigPt)), small: priceSmall(bigPt, ratio) }; }

  function fromPhotoshop(spec) {
    spec = spec || {};
    var scale = num(spec.scale, 1) || 1;
    var fontSizePx = round2(num(spec.sizePt) * scale);
    var lineHeight = (spec.leadingPt != null && spec.leadingPt !== '')
      ? round2(num(spec.leadingPt) * scale)
      : round2(fontSizePx * DEFAULT_LINE_HEIGHT_MULTIPLIER);
    var letterSpacing = round2(num(spec.tracking) / 1000 * fontSizePx);
    return {
      fontSizePx: fontSizePx,
      lineHeight: lineHeight,
      letterSpacing: letterSpacing,
      fontFamily: spec.font || DEFAULT_FONT
    };
  }

  function applyToLayer(layer, spec) {
    if (!layer) return null;
    var v = fromPhotoshop(spec);
    layer.fontSizePx = v.fontSizePx;
    layer.fontSizePt = v.fontSizePx;
    layer.lineHeight = v.lineHeight;
    layer.letterSpacing = v.letterSpacing;
    if (!layer.fontFamily) layer.fontFamily = v.fontFamily;
    return v;
  }

  function uniqueTokens(values) {
    var seen = Object.create(null);
    return (values || [])
      .map(function (value) { return String(value == null ? '' : value); })
      .filter(function (value) {
        if (!value || seen[value]) return false;
        seen[value] = true;
        return true;
      })
      .sort(function (a, b) { return b.length - a.length; });
  }

  function mergeTokens(defaults, extras) {
    return uniqueTokens((defaults || []).concat(Array.isArray(extras) ? extras : []));
  }

  function matchToken(text, index, tokens) {
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (text.substr(index, token.length) === token) return token;
    }
    return '';
  }

  function appendRun(runs, size, text, from, to) {
    if (!text) return;
    var last = runs[runs.length - 1];
    if (last && last.size === size && last.to === from) {
      last.to = to;
      last.text += text;
      return;
    }
    runs.push({ from: from, to: to, size: size, text: text });
  }

  // 價格分段規則：
  // - 明確 bigTokens / smallTokens 先以最長詞優先比對。
  // - 數字預設大字。
  // - $, %, 逗號等符號預設小字。
  // - 其餘內容（包含詞庫外中文字）預設大字。
  function priceSplit(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var bigTokens = mergeTokens(DEFAULT_PRICE_BIG_TOKENS, opts.bigTokens);
    var smallTokens = mergeTokens(DEFAULT_PRICE_SMALL_TOKENS, opts.smallTokens);
    var runs = [];
    var i = 0;

    while (i < text.length) {
      var bigToken = matchToken(text, i, bigTokens);
      var smallToken = matchToken(text, i, smallTokens);
      var token = '';
      var size = '';

      if (bigToken && (!smallToken || bigToken.length >= smallToken.length)) {
        token = bigToken;
        size = 'big';
      } else if (smallToken) {
        token = smallToken;
        size = 'small';
      }

      if (token) {
        appendRun(runs, size, token, i, i + token.length);
        i += token.length;
        continue;
      }

      var ch = text[i];
      size = isDigit(ch) ? 'big' : (PRICE_SMALL_SYMBOLS[ch] ? 'small' : (opts.defaultSize || 'big'));
      appendRun(runs, size, ch, i, i + 1);
      i += 1;
    }

    return runs;
  }

  var TITLE_SMALL_SYMBOLS = { '%': 1, '％': 1, '＄': 1, '$': 1, ',': 1, '，': 1, '﹐': 1, '︐': 1 };
  function classifyTitleChar(ch, prev) {
    if (TITLE_SMALL_SYMBOLS[ch]) return 'small';
    if (ch === '號' && prev != null && isDigit(prev)) return 'small';
    return 'big';
  }

  function splitByClassifier(text, classify) {
    text = String(text == null ? '' : text);
    var runs = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      appendRun(runs, classify(ch, i > 0 ? text[i - 1] : null, text, i), ch, i, i + 1);
    }
    return runs;
  }

  function titleSplit(text) { return splitByClassifier(text, classifyTitleChar); }

  // 所有已知公版的「非價格文字」共用 HBN / POPUP 的大小字規則。
  // 重要：不能直接把既有 textStyleRanges 洗掉，因為 AR 等版位本身可能已有多段基準字級。
  // 因此這裡是以每個字元原本所屬 range 的字級作為 local base，再只把 %, $, 逗號、數字後的「號」縮成 82%。
  function isPriceTextLayer(key, layer) {
    if (!layer || layer.type !== 'text') return false;
    if (String(layer.source || '').toLowerCase() === 'auto_price_v2') return true;
    if (layer.priceSlot != null || layer.priceLayoutKey != null) return true;
    var label = [key, layer.psdName, layer.role].map(function (value) { return String(value == null ? '' : value); }).join(' ').toLowerCase();
    if (label.indexOf('價格') >= 0) return true;
    return /(^|[\s_\-])price([\s_\-]|$)/i.test(label);
  }

  function rangeAt(ranges, index) {
    for (var i = 0; i < ranges.length; i += 1) {
      var range = ranges[i] || {};
      var from = Number(range.from);
      var to = Number(range.to);
      if (isFinite(from) && isFinite(to) && index >= from && index < to) return range;
    }
    return null;
  }

  function cloneRangeVisualProps(source, target) {
    if (!source) return target;
    ['color', 'fill', 'lineHeight', 'letterSpacing', 'fontFamily', 'fontWeight', 'fontStyleName', 'fontPostScriptName'].forEach(function (prop) {
      if (source[prop] !== undefined) target[prop] = source[prop];
    });
    return target;
  }

  function sameAutoRangeStyle(a, b) {
    if (!a || !b) return false;
    var props = ['fontSizePx', 'color', 'fill', 'lineHeight', 'letterSpacing', 'fontFamily', 'fontWeight', 'fontStyleName', 'fontPostScriptName', 'baselineOffset', '__spTextSizeClass'];
    return props.every(function (prop) { return a[prop] === b[prop]; });
  }

  function localBaseFontSize(layer, range) {
    var fallbackValue = Number(layer && layer.fontSizePx);
    var fallback = isFinite(fallbackValue) && fallbackValue > 0 ? fallbackValue : 24;
    var rangeValue = range ? Number(range.fontSizePx) : NaN;
    var size = isFinite(rangeValue) && rangeValue > 0 ? rangeValue : fallback;
    // 這個 range 若是上一輪由本標準產生的小字，先還原成 local base，避免每次刷新都 82% 再乘 82%。
    if (range && range.__spNonPriceTextStandard === true && range.__spTextSizeClass === 'small') {
      return round2(size / TITLE_SMALL_RATIO);
    }
    return round2(size);
  }

  function buildNonPriceTextRanges(layer) {
    if (!layer || layer.type !== 'text') return [];
    var text = String(layer.text == null ? '' : layer.text);
    if (!text) return [];
    var originalRanges = Array.isArray(layer.textStyleRanges) ? layer.textStyleRanges : [];
    var hasSmallCharacter = false;
    for (var scan = 0; scan < text.length; scan += 1) {
      if (classifyTitleChar(text[scan], scan > 0 ? text[scan - 1] : null) === 'small') {
        hasSmallCharacter = true;
        break;
      }
    }
    var hasAutoRange = originalRanges.some(function (range) { return range && range.__spNonPriceTextStandard === true; });
    // 從「有特殊符號」改成「沒有特殊符號」時，也必須移除上一輪的小字效果；
    // 只有從未被本標準處理過、且本次也沒有小字字元時，才完整保留原公版 ranges。
    if (!hasSmallCharacter && !hasAutoRange) return originalRanges;

    var ranges = [];
    for (var index = 0; index < text.length; index += 1) {
      var source = rangeAt(originalRanges, index);
      var baseSize = localBaseFontSize(layer, source);
      var sizeClass = classifyTitleChar(text[index], index > 0 ? text[index - 1] : null);
      var next = {
        from: index,
        to: index + 1,
        fontSizePx: sizeClass === 'small' ? round2(baseSize * TITLE_SMALL_RATIO) : round2(baseSize),
        __spNonPriceTextStandard: true,
        __spTextSizeClass: sizeClass,
      };
      cloneRangeVisualProps(source, next);
      if (sizeClass === 'small') next.baselineOffset = 0;
      else if (source && source.baselineOffset !== undefined && source.__spNonPriceTextStandard !== true) next.baselineOffset = source.baselineOffset;

      var previous = ranges[ranges.length - 1];
      if (previous && previous.to === next.from && sameAutoRangeStyle(previous, next)) previous.to = next.to;
      else ranges.push(next);
    }
    return ranges;
  }

  function applyNonPriceTextLayer(layer, key) {
    if (!layer || layer.type !== 'text' || layer.__disableGlobalTextStandard === true) return false;
    if (isPriceTextLayer(key, layer)) return false;
    var text = String(layer.text == null ? '' : layer.text);
    if (!text) return false;
    var ranges = buildNonPriceTextRanges(layer);
    if (!ranges.length) return false;
    var hasAuto = ranges.some(function (range) { return range && range.__spNonPriceTextStandard === true; });
    if (!hasAuto) return false;
    layer.textStyleRanges = ranges;
    layer.styledTextVerticalAlign = 'source-baseline';
    return true;
  }

  function applyTemplateNonPriceText(template) {
    var applied = [];
    Object.keys(template && template.layers || {}).forEach(function (key) {
      var layer = template.layers[key];
      if (applyNonPriceTextLayer(layer, key)) applied.push(key);
    });
    return applied;
  }

  // Auto Price 也使用和主標/副標完全相同的 82% 特殊字元規則：
  // %, $, 逗號、數字後的「號」縮成 82%，其餘價格文字維持該價格圖層原字級。
  // 不使用 PRICE_SMALL_RATIO / 價格詞庫，避免「蝦幣、折、起」被額外縮小。
  function applyPriceTextLayer(layer, key) {
    if (!layer || layer.type !== 'text' || !isPriceTextLayer(key, layer)) return false;
    var text = String(layer.text == null ? '' : layer.text);
    if (!text) return false;

    // Auto Price 的 base fontSizePx 才是「目前價格大小」的唯一真值。
    // 不可沿用上一輪 textStyleRanges 的 fontSizePx 當 local base，否則價格單獨縮放時
    // layer.fontSizePx 雖已改變，Renderer 仍會吃舊 ranges，看起來就像完全沒有縮放。
    var bigPt = round2(num(layer.fontSizePx || layer.fontSizePt, 24));
    var ranges = titleRanges(text, bigPt, { color: layer.color || layer.fill || '' });
    if (!ranges.length) return false;
    layer.textStyleRanges = ranges;
    layer.styledTextVerticalAlign = 'source-baseline';
    layer.__spPriceTextStandard = true;
    return true;
  }

  function toRanges(runs, bigPt, ratio, opts) {
    opts = opts || {};
    var bigFs = round2(num(bigPt));
    var smallFs = round2(num(bigPt) * num(ratio, 1));
    return runs.map(function (r) {
      var range = { from: r.from, to: r.to, fontSizePx: r.size === 'big' ? bigFs : smallFs };
      if (opts.color) { range.color = opts.color; range.fill = opts.color; }
      if (r.size === 'small' && opts.smallBaselineOffset != null) range.baselineOffset = opts.smallBaselineOffset;
      return range;
    });
  }

  function priceRanges(text, bigPt, opts) {
    opts = opts || {};
    var ratio = opts.smallRatio != null ? num(opts.smallRatio, PRICE_SMALL_RATIO) : PRICE_SMALL_RATIO;
    return toRanges(priceSplit(text, opts), bigPt, ratio, opts);
  }
  function titleRanges(text, bigPt, opts) {
    var runs = titleSplit(text);
    var ranges = toRanges(runs, bigPt, TITLE_SMALL_RATIO, opts);
    // 標記由本模組產生的非價格大小字，讓全域二次標準化時能還原 local base，避免 82% 重複套用。
    ranges.forEach(function (range, index) {
      range.__spNonPriceTextStandard = true;
      range.__spTextSizeClass = runs[index] && runs[index].size || 'big';
    });
    return ranges;
  }
  function rangeSizes(ranges) { return (ranges || []).map(function (r) { return r.fontSizePx; }); }
  function isDualSize(ranges) {
    if (!ranges || ranges.length < 2) return false;
    var sizes = Object.create(null);
    ranges.forEach(function (range) { sizes[String(range.fontSizePx)] = 1; });
    return Object.keys(sizes).length > 1;
  }

  function capsuleWidth(o) {
    o = o || {};
    var t = num(o.titleWidth), s = num(o.subtitleWidth), h = num(o.height);
    var pad = (o.paddingPx != null) ? num(o.paddingPx)
      : h * (o.paddingRatio != null ? num(o.paddingRatio) : CAPSULE_PADDING_RATIO);
    var threshold = (o.thresholdPx != null) ? num(o.thresholdPx)
      : h * (o.thresholdRatio != null ? num(o.thresholdRatio) : CAPSULE_THRESHOLD_RATIO);
    if (t - s >= threshold) return round2(t);
    return round2(s + pad * 2);
  }

  window.SPTextStandard = {
    VERSION: '1.5.0',
    TITLE_SMALL_RATIO: TITLE_SMALL_RATIO,
    PRICE_SMALL_RATIO: PRICE_SMALL_RATIO,
    DEFAULT_PRICE_BIG_TOKENS: DEFAULT_PRICE_BIG_TOKENS.slice(),
    DEFAULT_PRICE_SMALL_TOKENS: DEFAULT_PRICE_SMALL_TOKENS.slice(),
    CAPSULE_PADDING_RATIO: CAPSULE_PADDING_RATIO,
    CAPSULE_THRESHOLD_RATIO: CAPSULE_THRESHOLD_RATIO,
    DEFAULT_FONT: DEFAULT_FONT,
    round2: round2,
    titleSmall: titleSmall,
    titlePair: titlePair,
    priceSmall: priceSmall,
    pricePair: pricePair,
    fromPhotoshop: fromPhotoshop,
    applyToLayer: applyToLayer,
    priceSplit: priceSplit,
    titleSplit: titleSplit,
    priceRanges: priceRanges,
    titleRanges: titleRanges,
    isPriceTextLayer: isPriceTextLayer,
    buildNonPriceTextRanges: buildNonPriceTextRanges,
    applyNonPriceTextLayer: applyNonPriceTextLayer,
    applyTemplateNonPriceText: applyTemplateNonPriceText,
    applyPriceTextLayer: applyPriceTextLayer,
    rangeSizes: rangeSizes,
    isDualSize: isDualSize,
    capsuleWidth: capsuleWidth
  };
})();
