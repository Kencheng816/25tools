/* 10_Seller BN – 25節暖身 Seller BN 特規
 *
 * Architecture:
 * - 10 個 JSON 是幾何 / 字級 / 原始 Style 的唯一來源。
 * - 本 Rule 只負責：Excel 三列解析、版型精準路由、文字顯示/分色、素材解析、VIP Logo、診斷。
 * - Seller BN / Seller Banner 共用同一個 family；不沿用舊 Mall/C2C/SV 硬編碼架構。
 * - Seller 專屬素材禁止模糊命中；找不到專屬素材時才精準 fallback 到共用素材 / assets 根目錄。
 */
(function registerSellerBnRule() {
  'use strict';

  var FAMILY = 'seller_bn_25_warmup';
  var SELLER_FOLDER = '10_Seller BN';
  var SELLER_PREFIX = '10_Seller BN_';
  var MAIN_COLOR = '#2b2b2b';
  var OFFER_COLOR = '#d0011b';
  var SUPPLEMENT_COLOR = '#666666';

  var TEMPLATE_IDS = Object.freeze([
    '10_Seller BN_高單券通用版_商城(1k-4k)',
    '10_Seller BN_高單券通用版_商城(1k-4k)_無賣場券',
    '10_Seller BN_高單券通用版_商城(1k-200)',
    '10_Seller BN_高單券通用版_商城(1k-200)_無賣場券',
    '10_Seller BN_高單券通用版_全站(1K-2.5K)',
    '10_Seller BN_高單券通用版_全站(1K-2.5K)_無賣場券',
    '10_Seller BN_CCB 店家',
    '10_Seller BN_CCB 店家_無賣場券',
    '10_Seller BN_PS店家',
    '10_Seller BN_PS店家_無賣場',
  ]);

  var DYNAMIC_TEXT_KEYS = Object.freeze([
    '左_案型_上', '左_案型_上_01', '左_案型_上_02', '左_補充說明',
    '中_案型_上', '中_補充說明_上', '中_案型_中', '中_補充說明_下',
    '右_案型_上', '右_案型_上_01', '右_案型_上_02', '蝦皮VIP_右_案型_上',
    '右_案型_下', '右_補充說明',
  ]);

  var DYNAMIC_IMAGE_KEYS = Object.freeze([
    '小票券_VIP', '蝦幣堆', '蝦皮紙箱', '3D免運小車',
    '小票券_商城', '小票券_商城_200', '小票券_賣場', '小票券_全站', '小票券_全站_2',
    '蝦皮VIP_LOGO_橘色',
  ]);

  var TEMPLATE_CONFIGS = Object.freeze({
    '10_Seller BN_高單券通用版_商城(1k-4k)': Object.freeze({
      left: ['小票券_商城', '小票券_賣場'], leftSeparator: 'X_2', middle: ['蝦皮紙箱', '3D免運小車'],
      right: ['小票券_VIP', '蝦幣堆'], rightSeparator: 'X', rightAssetRow: 2,
    }),
    '10_Seller BN_高單券通用版_商城(1k-4k)_無賣場券': Object.freeze({
      left: ['小票券_商城'], middle: ['蝦皮紙箱', '3D免運小車'],
      right: ['小票券_VIP', '蝦幣堆'], rightSeparator: 'X', rightAssetRow: 2,
    }),
    '10_Seller BN_高單券通用版_商城(1k-200)': Object.freeze({
      left: ['小票券_商城_200', '小票券_賣場'], leftSeparator: 'X_2', middle: ['蝦皮紙箱', '3D免運小車'],
      right: ['小票券_VIP', '蝦幣堆'], rightSeparator: 'X', rightAssetRow: 2,
    }),
    '10_Seller BN_高單券通用版_商城(1k-200)_無賣場券': Object.freeze({
      left: ['小票券_商城_200'], middle: ['蝦皮紙箱', '3D免運小車'],
      right: ['小票券_VIP', '蝦幣堆'], rightSeparator: 'X', rightAssetRow: 2,
    }),
    '10_Seller BN_高單券通用版_全站(1K-2.5K)': Object.freeze({
      left: ['小票券_全站_2', '小票券_賣場'], leftSeparator: 'X', middle: ['蝦皮紙箱', '3D免運小車'],
      right: ['小票券_全站'], rightAssetRow: 2,
    }),
    '10_Seller BN_高單券通用版_全站(1K-2.5K)_無賣場券': Object.freeze({
      left: ['小票券_全站_2'], middle: ['蝦皮紙箱', '3D免運小車'], right: ['小票券_全站'], rightAssetRow: 2,
    }),
    '10_Seller BN_CCB 店家': Object.freeze({
      left: ['小票券_商城', '小票券_賣場'], leftSeparator: 'X', middle: ['蝦皮紙箱', '3D免運小車'],
      right: ['蝦幣堆'], rightAssetRow: 1,
    }),
    '10_Seller BN_CCB 店家_無賣場券': Object.freeze({
      left: ['小票券_商城'], middle: ['蝦皮紙箱', '3D免運小車'], right: ['蝦幣堆'], rightAssetRow: 1,
    }),
    '10_Seller BN_PS店家': Object.freeze({
      left: ['小票券_全站', '小票券_賣場'], leftSeparator: 'X_2', middle: ['蝦皮紙箱', '3D免運小車'],
      right: ['小票券_VIP', '蝦幣堆'], rightSeparator: 'X', rightAssetRow: 2,
    }),
    '10_Seller BN_PS店家_無賣場': Object.freeze({
      left: ['小票券_全站'], middle: ['蝦皮紙箱', '3D免運小車'],
      right: ['小票券_VIP', '蝦幣堆'], rightSeparator: 'X', rightAssetRow: 2,
    }),
  });

  function text(value) {
    return String(value == null ? '' : value).replace(/_x000d_/gi, '\n').replace(/\r\n?/g, '\n');
  }

  function trim(value) { return text(value).trim(); }

  function lines(value) {
    return text(value).split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
  }

  function normalizeHeader(value) {
    return trim(value).normalize('NFKC').toLowerCase().replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.＿－—–]+/g, '');
  }

  function normalizeVariantKey(value) {
    var raw = trim(value).normalize('NFKC');
    raw = raw.replace(/^10[\s_\-]*seller[\s_\-]*bn[\s_\-]*/i, '');
    return raw.toLowerCase().replace(/[\s\u00a0\u3000\t\r\n]+/g, '');
  }

  var ROUTE_BY_VARIANT = (function buildRouteIndex() {
    var map = Object.create(null);
    TEMPLATE_IDS.forEach(function (id) {
      var variant = id.replace(/^10_Seller BN_/, '');
      map[normalizeVariantKey(variant)] = id;
    });
    // 使用者確認：PS「無賣場」與「無賣場券」都接受，實際 JSON 以「無賣場」為 canonical。
    map[normalizeVariantKey('PS店家_無賣場券')] = '10_Seller BN_PS店家_無賣場';
    return Object.freeze(map);
  })();

  function canonicalTemplateId(variant) {
    return ROUTE_BY_VARIANT[normalizeVariantKey(variant)] || '';
  }

  function sourceTemplateId(template) {
    return trim(template && template.sheetTemplateRoute && template.sheetTemplateRoute.sourceTemplateId
      || template && template.sourceTemplateId
      || template && template.canvas && template.canvas.templateId
      || template && template.templateId);
  }

  function templateConfig(template) {
    return TEMPLATE_CONFIGS[sourceTemplateId(template)] || null;
  }

  function getLayer(template, key) { return template && template.layers ? template.layers[key] || null : null; }
  function setHidden(template, key, hidden) { var layer = getLayer(template, key); if (layer) layer.hidden = !!hidden; }

  function pushDiagnostic(diagnostics, code, status, value, target, extra) {
    if (!Array.isArray(diagnostics)) return;
    diagnostics.push(Object.assign({
      field: 'Seller BN',
      status: status || 'warning',
      value: value == null ? '' : value,
      target: '[Seller BN][' + code + '] ' + (target || ''),
    }, extra || {}));
  }

  function findColumn(headerRow, expected) {
    var wanted = normalizeHeader(expected);
    for (var index = 0; index < (headerRow || []).length; index += 1) {
      if (normalizeHeader(headerRow[index]) === wanted) return index;
    }
    return -1;
  }

  function readCell(row, column) {
    return column >= 0 && Array.isArray(row) && row[column] != null ? row[column] : '';
  }

  function splitTwoLineCell(value) {
    var valueLines = lines(value);
    return [valueLines[0] || '', valueLines[1] || ''];
  }

  function buildRecord(ctx, columns, startRow, templateId) {
    var rows = ctx.rows || [];
    var row0 = rows[startRow] || [];
    var row1 = rows[startRow + 1] || [];
    var row2 = rows[startRow + 2] || [];
    var config = TEMPLATE_CONFIGS[templateId] || {};
    var middleTop = splitTwoLineCell(readCell(row0, columns.middle));
    var middleBottom = splitTwoLineCell(readCell(row1, columns.middle));
    var rightTop = trim(readCell(row0, columns.right));
    var rightRow1 = trim(readCell(row1, columns.right));
    var rightRow2 = trim(readCell(row2, columns.right));
    var rightAsset = config.rightAssetRow === 1 ? rightRow1 : rightRow2;
    var rightLowerCell = config.rightAssetRow === 1 ? '' : rightRow1;
    var rightSupplement = config.rightAssetRow === 1 ? rightRow2 : splitTwoLineCell(rightLowerCell)[1];
    var rightBottomTitle = config.rightAssetRow === 1 ? '' : splitTwoLineCell(rightLowerCell)[0];

    return {
      '版型': trim(readCell(row0, columns.variant)),
      '宣傳案型': trim(readCell(row0, columns.promo)),
      'CTA': trim(readCell(row0, columns.cta)),
      '左_案型_上': trim(readCell(row0, columns.left)),
      '左_素材': trim(readCell(row1, columns.left)),
      '左_補充說明': trim(readCell(row2, columns.left)),
      '中_案型_上': middleTop[0],
      '中_補充說明_上': middleTop[1],
      '中_案型_中': middleBottom[0],
      '中_補充說明_下': middleBottom[1],
      '中_素材': trim(readCell(row2, columns.middle)),
      '右_案型_上': rightTop,
      '右_案型_下': rightBottomTitle,
      '右_補充說明': rightSupplement,
      '右_素材': rightAsset,
      '__sellerVariant': trim(readCell(row0, columns.variant)),
      '__sellerTemplateId': templateId,
      '__曝光': trim(readCell(row0, columns.exposure)),
      '__編號': trim(readCell(row0, columns.code)),
      '__備註No': trim(readCell(row0, columns.note)),
      '__sourceRow': startRow + 1,
      '__sourceName': trim(ctx.productName || 'Seller BN'),
    };
  }

  function blockParser(ctx) {
    var rows = ctx && ctx.rows || [];
    var header = ctx && ctx.header || {};
    var headerRowIndex = Number(header.headerRow || 0);
    var headerRow = rows[headerRowIndex] || [];
    var columns = {
      variant: findColumn(headerRow, '版型'),
      promo: findColumn(headerRow, '宣傳案型'),
      left: findColumn(headerRow, '左'),
      middle: findColumn(headerRow, '中'),
      right: findColumn(headerRow, '右'),
      cta: findColumn(headerRow, 'CTA'),
      note: findColumn(headerRow, '備註'),
      code: findColumn(headerRow, '編號'),
      exposure: findColumn(headerRow, '曝光'),
    };
    if (columns.variant < 0 || columns.left < 0 || columns.middle < 0 || columns.right < 0) {
      console.warn('[Seller BN][ParserError] 缺少必要欄位：版型 / 左 / 中 / 右');
      return null;
    }

    var start = Number(ctx.rowIndex || headerRowIndex + 1);
    var end = Math.min(Number(ctx.nextHeaderRow || rows.length), rows.length);
    var records = [];
    var started = false;
    var emptyRowsAfterStart = 0;

    for (var rowIndex = start; rowIndex < end;) {
      var row = rows[rowIndex] || [];
      var rawVariant = trim(readCell(row, columns.variant));
      if (!rawVariant) {
        if (started) {
          emptyRowsAfterStart += 1;
          if (emptyRowsAfterStart >= 3) break;
        }
        rowIndex += 1;
        continue;
      }
      emptyRowsAfterStart = 0;
      started = true;
      var templateId = canonicalTemplateId(rawVariant);
      // 不在 parser 猜相似版型。未知值仍產 record，交給 route 產生明確 TemplateNotFound 診斷。
      var routeTemplateId = templateId || rawVariant;
      records.push(buildRecord(ctx, columns, rowIndex, routeTemplateId));
      rowIndex += 3;
    }

    return records.length ? { records: records, templateType: FAMILY } : null;
  }

  function resolveRecordTemplateRoute(args) {
    var record = args && args.record || {};
    var rawVariant = trim(record.__sellerVariant || record['版型']);
    var templateId = canonicalTemplateId(rawVariant);
    if (!templateId) {
      throw new Error('[Seller BN][TemplateNotFound] 找不到 Seller BN 公版：' + rawVariant);
    }
    return {
      key: FAMILY,
      family: FAMILY,
      label: rawVariant,
      templateId: templateId,
      templateFile: templateId + '.json',
      ruleFile: 'rules/10_Seller BN_rules.js',
    };
  }

  function hideDynamicContent(template) {
    DYNAMIC_TEXT_KEYS.forEach(function (key) { setHidden(template, key, true); });
    DYNAMIC_IMAGE_KEYS.forEach(function (key) { setHidden(template, key, true); });
    ['X', 'X_2'].forEach(function (key) { setHidden(template, key, true); });
  }

  function setTextLayer(template, key, value, diagnostics, options) {
    var content = trim(value);
    var layer = getLayer(template, key);
    if (!content) {
      if (layer) layer.hidden = true;
      return false;
    }
    if (!layer) {
      pushDiagnostic(diagnostics, 'LayerMissing', 'warning', content, '找不到文字圖層：' + key);
      return false;
    }
    layer.text = content;
    layer.hidden = false;
    if (options && options.color) {
      layer.color = options.color;
      layer.fill = options.color;
      layer.textStyleRanges = [{
        from: 0,
        to: content.length,
        fontSizePx: Number(layer.fontSizePx || 0) || undefined,
        color: options.color,
        fill: options.color,
      }];
    } else if (options && Array.isArray(options.ranges)) {
      layer.textStyleRanges = options.ranges;
    }
    return true;
  }

  function addColorRange(ranges, from, to, color, layer) {
    if (!(to > from)) return;
    var item = { from: from, to: to, color: color, fill: color };
    var size = Number(layer && layer.fontSizePx);
    if (isFinite(size) && size > 0) item.fontSizePx = size;
    var previous = ranges[ranges.length - 1];
    if (previous && previous.to === from && previous.color === color && previous.fontSizePx === item.fontSizePx) previous.to = to;
    else ranges.push(item);
  }

  function colorSegmentsForMain(value, layer) {
    var content = trim(value);
    if (!content) return [];
    var ranges = [];

    // 使用者指定唯一中段金額例外：只有 $199 紅色，不泛化到其他「$金額置中」文案。
    if (content === '店取滿$199免運') {
      var moneyIndex = content.indexOf('$199');
      addColorRange(ranges, 0, moneyIndex, MAIN_COLOR, layer);
      addColorRange(ranges, moneyIndex, moneyIndex + 4, OFFER_COLOR, layer);
      addColorRange(ranges, moneyIndex + 4, content.length, MAIN_COLOR, layer);
      return ranges;
    }

    // 百分比蝦幣優惠核心：整行紅色（獨享25%蝦幣 / 6%蝦幣回饋 / 50%蝦幣折抵）。
    if (/\d+(?:\.\d+)?\s*[%％]\s*蝦幣/.test(content)) {
      addColorRange(ranges, 0, content.length, OFFER_COLOR, layer);
      return ranges;
    }

    // 不限店家無限免運：前段灰、優惠核心「無限免運」紅。
    var freeShippingIndex = content.indexOf('無限免運');
    if (freeShippingIndex >= 0) {
      addColorRange(ranges, 0, freeShippingIndex, MAIN_COLOR, layer);
      addColorRange(ranges, freeShippingIndex, content.length, OFFER_COLOR, layer);
      return ranges;
    }

    // 通用「折$金額」：從「折」開始整段紅色。
    var discountMatch = /折\s*[＄$]\s*[\d,，]+(?:\.\d+)?/.exec(content);
    if (discountMatch) {
      addColorRange(ranges, 0, discountMatch.index, MAIN_COLOR, layer);
      addColorRange(ranges, discountMatch.index, discountMatch.index + discountMatch[0].length, OFFER_COLOR, layer);
      addColorRange(ranges, discountMatch.index + discountMatch[0].length, content.length, MAIN_COLOR, layer);
      return ranges;
    }

    // 通用「$金額起」：金額與「起」一起紅色。
    var fromMatch = /[＄$]\s*[\d,，]+(?:\.\d+)?\s*起/.exec(content);
    if (fromMatch) {
      addColorRange(ranges, 0, fromMatch.index, MAIN_COLOR, layer);
      addColorRange(ranges, fromMatch.index, fromMatch.index + fromMatch[0].length, OFFER_COLOR, layer);
      addColorRange(ranges, fromMatch.index + fromMatch[0].length, content.length, MAIN_COLOR, layer);
      return ranges;
    }

    addColorRange(ranges, 0, content.length, MAIN_COLOR, layer);
    return ranges;
  }

  function setMainText(template, key, value, diagnostics) {
    var content = trim(value);
    if (!content) { setHidden(template, key, true); return false; }
    var layer = getLayer(template, key);
    if (!layer) {
      pushDiagnostic(diagnostics, 'LayerMissing', 'warning', content, '找不到文字圖層：' + key);
      return false;
    }
    return setTextLayer(template, key, content, diagnostics, { ranges: colorSegmentsForMain(content, layer) });
  }

  function setSupplementText(template, key, value, diagnostics) {
    return setTextLayer(template, key, value, diagnostics, { color: SUPPLEMENT_COLOR });
  }

  function applySingleOrDoubleMainText(template, baseKey, rawValue, diagnostics) {
    var valueLines = lines(rawValue);
    setHidden(template, baseKey, true);
    setHidden(template, baseKey + '_01', true);
    setHidden(template, baseKey + '_02', true);
    if (!valueLines.length) return;
    if (valueLines.length === 1) {
      setMainText(template, baseKey, valueLines[0], diagnostics);
      return;
    }
    setMainText(template, baseKey + '_01', valueLines[0], diagnostics);
    setMainText(template, baseKey + '_02', valueLines[1], diagnostics);
  }

  function stripVip(value) {
    return trim(value).replace(/蝦皮\s*VIP/ig, '').replace(/VIP/ig, '').trim();
  }

  function applyRightTop(template, value, diagnostics) {
    var valueLines = lines(value);
    var combined = valueLines.join('\n');
    var hasVip = /VIP/i.test(combined);
    ['右_案型_上', '右_案型_上_01', '右_案型_上_02', '蝦皮VIP_右_案型_上'].forEach(function (key) { setHidden(template, key, true); });
    setHidden(template, '蝦皮VIP_LOGO_橘色', true);
    if (!valueLines.length) return;

    if (hasVip) {
      var vipLogo = getLayer(template, '蝦皮VIP_LOGO_橘色');
      if (vipLogo) {
        vipLogo.hidden = false;
        vipLogo.assetFilename = '蝦皮VIP_LOGO_橘色.svg';
        vipLogo.assetProject = '';
        vipLogo.assetCandidates = ['蝦皮VIP_LOGO_橘色.svg'];
        vipLogo.__exactAssetMatch = true;
      } else {
        pushDiagnostic(diagnostics, 'LayerMissing', 'warning', combined, '找不到圖片圖層：蝦皮VIP_LOGO_橘色');
      }
      var remaining = valueLines.map(stripVip).filter(Boolean).join('');
      setMainText(template, '蝦皮VIP_右_案型_上', remaining, diagnostics);
      return;
    }

    if (valueLines.length === 1) {
      setMainText(template, '右_案型_上', valueLines[0], diagnostics);
      return;
    }
    setMainText(template, '右_案型_上_01', valueLines[0], diagnostics);
    setMainText(template, '右_案型_上_02', valueLines[1], diagnostics);
  }

  function assetNames(value) {
    var raw = trim(value);
    if (!raw) return [];
    return raw.split(/\s+(?:x|X|×)\s+|\s*\+\s*/).map(trim).filter(Boolean);
  }

  function stripSellerPrefix(value) {
    return trim(value).replace(/^10[\s_\-]*Seller[\s_\-]*BN[\s_\-]*/i, '');
  }

  function splitExtension(value) {
    var raw = trim(value).split(/[\\/]/).pop();
    var match = /^(.*?)(\.[a-z0-9]+)$/i.exec(raw);
    return match ? { stem: match[1], ext: match[2] } : { stem: raw, ext: '' };
  }

  function buildAssetCandidates(value) {
    var normalized = stripSellerPrefix(value);
    var parts = splitExtension(normalized);
    var extensions = [];
    function addExtension(ext) { if (ext && extensions.indexOf(ext) < 0) extensions.push(ext); }
    if (parts.ext) addExtension(parts.ext);
    ['.png', '.PNG', '.jpg', '.jpeg'].forEach(addExtension);
    var candidates = [];
    function add(name) { if (name && candidates.indexOf(name) < 0) candidates.push(name); }
    extensions.forEach(function (ext) { add(SELLER_PREFIX + parts.stem + ext); });
    extensions.forEach(function (ext) { add(parts.stem + ext); });
    return candidates;
  }

  function findUploadedAsset(value, template, layer, layerKey) {
    var manager = window.BatchManager;
    if (!manager || typeof manager.findAssetFilename !== 'function') return null;
    var candidates = buildAssetCandidates(value);
    var folders = [SELLER_FOLDER, '共用素材', ''];
    for (var folderIndex = 0; folderIndex < folders.length; folderIndex += 1) {
      for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
        var hit = manager.findAssetFilename(candidates[candidateIndex], {
          project: folders[folderIndex], template: template, layer: layer, layerKey: layerKey,
          allowFuzzy: false,
        });
        if (hit && hit.found) return hit;
      }
    }
    return null;
  }

  function assignAsset(template, key, value, diagnostics) {
    var layer = getLayer(template, key);
    var requested = trim(value);
    if (!requested) { if (layer) layer.hidden = true; return false; }
    if (!layer) {
      pushDiagnostic(diagnostics, 'LayerMissing', 'warning', requested, '找不到圖片圖層：' + key);
      return false;
    }

    var candidates = buildAssetCandidates(requested);
    var hit = findUploadedAsset(requested, template, layer, key);
    layer.hidden = false;
    layer.__exactAssetMatch = true;
    layer.__allowCommonAssetFallback = true;
    layer.__sellerRequestedAsset = requested;
    // 初次套用時圖層本來就是 visible；只有實際載入失敗後才開啟 hidden-retry。
    layer.__retryMissingAssetWhenHidden = false;
    layer.assetCandidates = candidates.slice(1);
    if (hit) {
      layer.assetFilename = hit.lookupName || hit.filename;
      layer.assetProject = hit.folder || SELLER_FOLDER;
      layer.__assetMissing = false;
      pushDiagnostic(diagnostics, 'AssetResolved', 'ok', requested, key, { filename: hit.filename });
    } else {
      // 內建 assets 尚未進 AssetStore 時，交給 TemplateLoader 依相同精準候選順序載入。
      layer.assetFilename = candidates[0] || requested;
      layer.assetProject = SELLER_FOLDER;
      layer.__assetMissing = false;
    }
    return true;
  }

  function applyAssetGroup(template, groupName, rawValue, diagnostics, config) {
    var keys = Array.isArray(config && config[groupName]) ? config[groupName] : [];
    var separator = config && config[groupName + 'Separator'];
    keys.forEach(function (key) {
      var layer = getLayer(template, key);
      if (!layer) return;
      layer.hidden = true;
      layer.__retryMissingAssetWhenHidden = false;
      layer.__sellerRequestedAsset = '';
      layer.__assetMissing = false;
    });
    if (separator) setHidden(template, separator, true);
    var names = assetNames(rawValue);
    keys.forEach(function (key, index) {
      if (index < names.length) assignAsset(template, key, names[index], diagnostics);
    });
    if (names.length > keys.length) {
      pushDiagnostic(diagnostics, 'LayerMissing', 'warning', rawValue, groupName + ' 素材數量 ' + names.length + ' 超過公版可用圖層 ' + keys.length);
    }
    // Separator 必須等圖片真正載入成功後才顯示；afterLoadImagesForTemplate 再決定。
    if (separator) setHidden(template, separator, true);
    return names;
  }

  function applyStaticAssets(template) {
    var shopeeLogo = getLayer(template, '蝦皮購物_LOGO_白');
    if (shopeeLogo) {
      shopeeLogo.assetFilename = '蝦皮購物_LOGO_白.svg';
      shopeeLogo.assetCandidates = ['蝦皮購物_LOGO_白.svg'];
      shopeeLogo.assetProject = '';
      shopeeLogo.__exactAssetMatch = true;
      shopeeLogo.hidden = false;
    }
    var uspLogo = getLayer(template, '25節USP_對外_LOGO');
    if (uspLogo) {
      uspLogo.assetFilename = '25節USP_對外_LOGO.svg';
      uspLogo.assetCandidates = ['25節USP_對外_LOGO.svg'];
      uspLogo.assetProject = '';
      uspLogo.__exactAssetMatch = true;
      uspLogo.hidden = false;
    }
  }

  function beforeApplyRecordToTemplate(args) {
    var template = args && args.template;
    if (!template || !template.layers) return;
    hideDynamicContent(template);
    applyStaticAssets(template);
  }

  function afterApplyRecordToTemplate(args) {
    var template = args && args.template;
    var record = args && args.record || template && template.batchRecord || {};
    var diagnostics = args && args.diagnostics;
    if (!template || !template.layers) return;
    var config = templateConfig(template);
    if (!config) {
      pushDiagnostic(diagnostics, 'TemplateNotFound', 'error', sourceTemplateId(template), '找不到 Seller BN Template Config');
      return;
    }

    var promo = trim(record['宣傳案型']);
    if (promo) setTextLayer(template, '宣傳案型', promo, diagnostics); // 保留 JSON 原始黑色 Style。
    var cta = trim(record['CTA']);
    if (cta) setTextLayer(template, 'CTA_文案', cta, diagnostics); // 保留 JSON 原始白色 Style。

    applySingleOrDoubleMainText(template, '左_案型_上', record['左_案型_上'], diagnostics);
    setSupplementText(template, '左_補充說明', record['左_補充說明'], diagnostics);

    setMainText(template, '中_案型_上', record['中_案型_上'], diagnostics);
    setSupplementText(template, '中_補充說明_上', record['中_補充說明_上'], diagnostics);
    setMainText(template, '中_案型_中', record['中_案型_中'], diagnostics);
    setSupplementText(template, '中_補充說明_下', record['中_補充說明_下'], diagnostics);

    applyRightTop(template, record['右_案型_上'], diagnostics);
    setMainText(template, '右_案型_下', record['右_案型_下'], diagnostics);
    setSupplementText(template, '右_補充說明', record['右_補充說明'], diagnostics);

    var requestedGroups = {
      left: applyAssetGroup(template, 'left', record['左_素材'], diagnostics, config),
      middle: applyAssetGroup(template, 'middle', record['中_素材'], diagnostics, config),
      right: applyAssetGroup(template, 'right', record['右_素材'], diagnostics, config),
    };
    template.__sellerAssetGroups = requestedGroups;
  }

  function afterLoadImagesForTemplate(args) {
    var template = args && args.template;
    var images = args && args.images || {};
    var diagnostics = args && args.diagnostics;
    if (!template || !template.layers) return;
    var config = templateConfig(template);
    if (!config) return;

    ['left', 'middle', 'right'].forEach(function (groupName) {
      var keys = Array.isArray(config[groupName]) ? config[groupName] : [];
      var requestedNames = template.__sellerAssetGroups && template.__sellerAssetGroups[groupName] || [];
      var loadedCount = 0;
      keys.forEach(function (key, index) {
        var layer = getLayer(template, key);
        if (index >= requestedNames.length || !layer) return;
        if (images[key]) {
          loadedCount += 1;
          layer.hidden = false;
          layer.__assetMissing = false;
          layer.__retryMissingAssetWhenHidden = false;
        } else {
          layer.hidden = true;
          layer.__assetMissing = true;
          // 缺檔當下依規格隱藏，但允許之後重新載入素材資料夾時精準重試。
          layer.__retryMissingAssetWhenHidden = true;
          pushDiagnostic(diagnostics, 'AssetNotFound', 'missing', requestedNames[index], '素材不存在：' + requestedNames[index], {
            targetLayer: key,
          });
        }
      });
      var separator = config[groupName + 'Separator'];
      if (separator) setHidden(template, separator, !(requestedNames.length >= 2 && loadedCount >= 2));
    });
  }

  var rule = {
    label: '25節 Seller BN',
    tokens: ['Seller BN', 'Seller Banner'],
    targets: TEMPLATE_IDS.slice(),
    priority: 40,
    legacyPresetOptional: true,
    dynamicLayout: false,
    rules: {
      blockParser: blockParser,
      resolveRecordTemplateRoute: resolveRecordTemplateRoute,
      beforeApplyRecordToTemplate: beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: afterApplyRecordToTemplate,
      afterLoadImagesForTemplate: afterLoadImagesForTemplate,
      priceRules: { enabled: false, templateLayouts: {}, productLayouts: {}, classifiers: [] },
      ctaPolicy: { mode: 'rule-managed', imageValues: [], fallbackToText: false },
    },
  };

  window.TemplateRuleRegistry.register(FAMILY, rule);
  window.SellerBNRuleDebug = Object.freeze({
    FAMILY: FAMILY,
    TEMPLATE_IDS: TEMPLATE_IDS,
    TEMPLATE_CONFIGS: TEMPLATE_CONFIGS,
    normalizeVariantKey: normalizeVariantKey,
    canonicalTemplateId: canonicalTemplateId,
    lines: lines,
    assetNames: assetNames,
    buildAssetCandidates: buildAssetCandidates,
    colorSegmentsForMain: colorSegmentsForMain,
    blockParser: blockParser,
  });
  window.__SELLER_BN_RULE_VERSION = '2026-08-17｜10公版特規Parser＋精準路由＋動態分色＋素材Fallback＋VIP';
})();
