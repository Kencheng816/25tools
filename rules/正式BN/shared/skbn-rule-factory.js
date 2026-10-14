/* SKBN 版位共用 Rule Factory（03_SKBN_APP / 03_SKBN_PC）— window.SkbnRuleFactory
 *
 * 2026-08-13 需求（逐條與使用者確認）：
 * 1. 工單每 3 列（位置：左邊→中間→右邊）組成一組完整 1200 寬 Banner，組序編號 01 起。
 * 2. 文案拆分（APP 上/下行＝PC 白/黃色界，共用斷點）：內建對照表優先；
 *    未命中用詞庫規則（動詞＋優惠片語起斷：動詞後接數字/$ 即斷）；再未命中對半分＋診斷提醒。
 * 3. APP 右格為 VIP 三件組（上行左字＋蝦皮VIP_LOGO＋右邊_文案_下）；右格文案不含 VIP 時報錯。
 * 4. APP 字級：中間_文案_下＝數字與$%符號 100 / 其餘 85 / 純中文統一 100；
 *    右邊_文案_下＝數字與$%符號 80 / 其餘 70（純中文維持 70）。其他圖層用 JSON 原字級。
 * 5. PC 左格/中格單行前白(#FFFFFF)後黃(#FFE600)雙色；中格直營特例；右格 VIP 三件組。
 * 6. 中格文案含「蝦皮直營」→ 顯示 蝦皮直營_LOGO（平時隱藏），APP 隱藏中間_文案_上、
 *    PC 隱藏中間_文案並顯示 蝦皮直營_中間_文案_右；餘文去除「蝦皮直營」。
 * 7. 商品圖1（右列）套入「VIP_單券_折扣」圖層（共用素材）。
 * 8. 匯出：exportConfig 交由 ExportManager 處理（完整圖＋左中右切圖、JPG、分資料夾）。
 */
(function initSkbnRuleFactory() {
  'use strict';

  function toStr(value) { return String(value == null ? '' : value); }
  function trim(value) { return toStr(value).replace(/_x000d_/gi, '\n').trim(); }
  function round2(value) { return Math.round(Number(value) * 100) / 100; }
  function pad2(value) { return String(Math.max(0, Math.round(Number(value) || 0))).padStart(2, '0'); }
  function getLayer(template, key) { return template && template.layers && key ? template.layers[key] || null : null; }
  function hide(template, key) { var layer = getLayer(template, key); if (layer) layer.hidden = true; }

  // ── 文案拆分 ──
  var SPLIT_TABLE = {
    '不限店家無限免運': ['不限店家', '無限免運'],
    '0-2點限時灑$200': ['0-2點限時', '灑$200'],
    '加入VIP送8折': ['加入VIP', '送8折'],
    '全站$100人人有': ['全站$100', '人人有'],
    '商城滿千折$200': ['商城滿千', '折$200'],
    '全站92折倒數中': ['全站92折', '倒數中'],
    '蝦皮直營折$200': ['蝦皮直營', '折$200'],
  };
  var BREAK_VERBS = ['灑', '送', '搶', '領', '折', '減', '賺', '享', '拿', '抽'];

  function splitCopy(text, diagnostics, field) {
    var value = trim(text);
    if (!value) return { top: '', bottom: '', source: 'empty' };
    if (SPLIT_TABLE[value]) {
      var hit = SPLIT_TABLE[value];
      return { top: hit[0], bottom: hit[1], source: 'table' };
    }
    for (var index = 1; index < value.length - 1; index += 1) {
      if (BREAK_VERBS.indexOf(value[index]) >= 0 && /[0-9$＄]/.test(value[index + 1] || '')) {
        return { top: value.slice(0, index), bottom: value.slice(index), source: 'verb' };
      }
    }
    var half = Math.ceil(value.length / 2);
    if (Array.isArray(diagnostics)) {
      diagnostics.push({
        field: field || '文案',
        status: 'warning',
        value: value,
        target: '文案不在拆分對照表且詞庫未命中，已對半拆分（' + value.slice(0, half) + '｜' + value.slice(half) + '），請人工確認',
      });
    }
    return { top: value.slice(0, half), bottom: value.slice(half), source: 'fallback' };
  }

  function splitVip(text) {
    var value = trim(text);
    var match = /vip/i.exec(value);
    if (!match) return null;
    return { left: trim(value.slice(0, match.index)), right: trim(value.slice(match.index + match[0].length)) };
  }

  // ── 字級 ranges（2026-08-13 修訂：僅數字用大字級，$ 等符號與中文同小字級；from/to 沿用 SPTextStandard 慣例） ──
  function isBigChar(ch) { return /[0-9]/.test(ch); }
  function digitSizeRanges(layer, text, bigPt, smallPt, pureTextUsesBig) {
    var value = toStr(text);
    var hasBig = false;
    for (var i = 0; i < value.length; i += 1) { if (isBigChar(value[i])) { hasBig = true; break; } }
    if (!hasBig) {
      layer.fontSizePx = round2(pureTextUsesBig ? bigPt : smallPt);
      delete layer.textStyleRanges;
      layer.styledTextVerticalAlign = 'default';
      return;
    }
    var ranges = [];
    var runStart = 0;
    var runBig = isBigChar(value[0]);
    for (var index = 1; index <= value.length; index += 1) {
      var currentBig = index < value.length ? isBigChar(value[index]) : null;
      if (currentBig !== runBig) {
        ranges.push({ from: runStart, to: index, fontSizePx: round2(runBig ? bigPt : smallPt) });
        runStart = index;
        runBig = currentBig;
      }
    }
    layer.fontSizePx = round2(bigPt);
    layer.textStyleRanges = ranges;
    layer.styledTextVerticalAlign = 'source-baseline';
  }

  // ── PC 前白後黃雙色 ranges ──
  function twoColorRanges(layer, text, breakIndex, frontColor, backColor) {
    var value = toStr(text);
    var fontSize = Number(layer.fontSizePx) || Number(layer.fontSizePt) || 24;
    if (breakIndex <= 0 || breakIndex >= value.length) {
      layer.color = breakIndex <= 0 ? backColor : frontColor;
      delete layer.textStyleRanges;
      layer.styledTextVerticalAlign = 'default';
      return;
    }
    layer.textStyleRanges = [
      { from: 0, to: breakIndex, fontSizePx: round2(fontSize), color: frontColor, fill: frontColor },
      { from: breakIndex, to: value.length, fontSizePx: round2(fontSize), color: backColor, fill: backColor },
    ];
    layer.styledTextVerticalAlign = 'source-baseline';
  }

  // ── 文字設定與置中（以 JSON 原始 centerX 為基準） ──
  function ensureCenterSnapshot(template, keys) {
    if (!template.__skbnCenterSnapshot) {
      var snapshot = {};
      keys.forEach(function (key) {
        var layer = getLayer(template, key);
        if (layer) snapshot[key] = Number(layer.centerX) || ((Number(layer.x) || 0) + (Number(layer.width) || 0) / 2);
      });
      template.__skbnCenterSnapshot = snapshot;
    }
    return template.__skbnCenterSnapshot;
  }

  function setText(template, key, text, helpers, snapshot) {
    var layer = getLayer(template, key);
    if (!layer) return null;
    var value = trim(text);
    if (!value) { layer.hidden = true; layer.text = ''; return null; }
    layer.hidden = false;
    layer.text = value;
    layer.__disableGlobalTextStandard = true; // SKBN 自訂字級/色彩，不吃全域 82% 標準。
    layer.textVerticalAlign = 'source-baseline';
    var measure = helpers && typeof helpers.measureTextWidth === 'function' ? helpers.measureTextWidth : null;
    if (measure) {
      var width = Number(measure(layer));
      if (isFinite(width) && width > 0) {
        var manual = layer.__manualOverrides || {};
        if (!manual.width) layer.width = round2(width);
        var centerX = snapshot && isFinite(snapshot[key]) ? snapshot[key] : (Number(layer.centerX) || 0);
        layer.align = 'center';
        if (!manual.x) layer.x = round2(centerX - width / 2);
        if (!manual.centerX) layer.centerX = round2(centerX);
      }
    }
    return layer;
  }

  function resolveAssetFromFolders(template, record, name, layer, layerKey, folders) {
    var batchManager = window.BatchManager;
    if (!name || !batchManager || typeof batchManager.findAssetFilename !== 'function') return null;
    for (var index = 0; index < folders.length; index += 1) {
      var folder = trim(folders[index]);
      var result = batchManager.findAssetFilename(name, { project: folder, template: template, layer: layer, layerKey: layerKey });
      if (result && result.found && result.filename) return { filename: result.filename, project: result.folder || folder };
    }
    return null;
  }

  // 同一個區塊只解析一次：BatchManager 會對每一個「製作內容欄有值」的列觸發 blockParser
  //（含 SKBN_APP_切圖_左/中/右 這類切圖標示列），重複觸發一律回傳 null，
  // 搭配 SpecialBlockParserPolicy 鎖定特規專用，避免從切圖列起算導致列數錯誤或重複產圖。
  var parsedBlockMarks = new WeakMap();

  function createBlockParser(config) {
    return function blockParser(ctx) {
      var rows = ctx.rows || [];
      var header = ctx.header || {};
      var headerRow = Number(header.headerRow || 0);
      // 忽略 ctx.rowIndex（觸發列），永遠從區塊頂端解析完整 15 列。
      var startRow = headerRow + 1;
      var endRow = Number(ctx.nextHeaderRow || rows.length);
      var blockMark = headerRow + '/' + config.ruleKey;
      var marks = parsedBlockMarks.get(rows);
      if (marks && marks.has(blockMark)) return null;
      var head = rows[headerRow] || [];
      var normalizeHeader = function (value) {
        return toStr(value).toLowerCase().replace(/[\s 　\t\r\n_\-+()（）\[\]【】.]+/g, '');
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
        position: findColumn(function (name) { return name.indexOf('位置') === 0; }),
        copy: findColumn(function (name) { return name.indexOf('文案') === 0; }),
        product: findColumn(function (name) { return name.indexOf('商品圖1') >= 0; }),
        product2: findColumn(function (name) { return name.indexOf('商品圖2') >= 0; }),
        price: findColumn(function (name) { return name === '價格'; }),
      };
      var readCell = function (row, column) { return column >= 0 && row[column] != null ? row[column] : ''; };
      var normalizePosition = function (value) {
        var text = trim(value);
        if (text.indexOf('左') >= 0) return '左';
        if (text.indexOf('中') >= 0) return '中';
        if (text.indexOf('右') >= 0) return '右';
        return '';
      };

      var entries = [];
      for (var rowIndex = startRow; rowIndex < endRow; rowIndex += 1) {
        var row = rows[rowIndex] || [];
        var exposure = trim(readCell(row, columns.expose));
        var noteText = trim(readCell(row, columns.no));
        var noteNumber = Number(noteText);
        if (exposure !== '暖身' && exposure !== '正式') continue;
        if (!isFinite(noteNumber) || noteText === '') continue;
        entries.push({
          row: rowIndex + 1,
          note: noteText,
          code: trim(readCell(row, columns.code)),
          exposure: exposure,
          position: normalizePosition(readCell(row, columns.position)),
          copy: trim(readCell(row, columns.copy)),
          product: trim(readCell(row, columns.product)),
          product2: trim(readCell(row, columns.product2)),
          price: trim(readCell(row, columns.price)),
        });
      }
      if (!entries.length) return null;

      // 每 3 列（左→中→右）一組；順序或數量不符直接報錯（阻礙性工單錯誤）。
      if (entries.length % 3 !== 0) {
        throw new Error(config.label + '：工單列數 ' + entries.length + ' 不是 3 的倍數，無法組成完整左/中/右群組（起始列 ' + entries[0].row + '）');
      }
      var records = [];
      for (var groupIndex = 0; groupIndex < entries.length / 3; groupIndex += 1) {
        var trio = entries.slice(groupIndex * 3, groupIndex * 3 + 3);
        var expected = ['左', '中', '右'];
        for (var part = 0; part < 3; part += 1) {
          if (trio[part].position !== expected[part]) {
            throw new Error(config.label + '：Excel 第 ' + trio[part].row + ' 列位置應為「' + expected[part] + '邊/間」，實際為「' + trio[part].position + '」，無法分組');
          }
        }
        var sequence = groupIndex + 1;
        records.push({
          '左文案': trio[0].copy,
          '中文案': trio[1].copy,
          '右文案': trio[2].copy,
          '商品圖1': trio[2].product || trio[1].product || trio[0].product,
          '商品圖2': '',
          // 價格（2026-08-13 工單新增欄）：取右列（券面），錨定 VIP_單券_折扣 圖層。
          '價格': trio[2].price || trio[1].price || trio[0].price,
          '__曝光': trio[0].exposure,
          '__備註No': String(sequence),
          '__編號': trio.map(function (entry) { return entry.code; }).filter(Boolean).join('、'),
          '__sourceRow': trio[0].row,
          '__sourceRows': trio.map(function (entry) { return entry.row; }),
          '__sourceName': trim(ctx.productName || config.label || ''),
        });
      }
      if (!marks) { marks = new Set(); parsedBlockMarks.set(rows, marks); }
      marks.add(blockMark);
      return { records: records, templateType: config.templateType };
    };
  }

  // ── 價格規則（2026-08-13 工單新增「價格」欄；沿用引擎標準 auto_price_v2 機制） ──
  // 錨定圖層＝VIP_單券_折扣（role 商品圖1）；版型基底與暖身系公版一致，位置可用校正檔（preset）微調。
  function createPriceRules(config) {
    var resolver = window.WarmupPriceStyleResolver;
    if (!resolver || typeof resolver.create !== 'function') {
      throw new Error('SkbnRuleFactory: WarmupPriceStyleResolver is not ready');
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
          width: Number(config.priceBoxWidth || 220),
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
      // 2026-08-13：模板商品圖層改名為 product（原 VIP_單券_折扣），錨點優先序與其他版位一致。
      anchorLayerNames: ['商品圖1', 'product', 'P'],
      templateLayouts: templateLayouts,
      // 2026-08-14：雙券→雙價格（同 HBN/DD/POPUP）。
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
    var keys = config.layerKeys;
    var mode = config.mode; // 'app' | 'pc'

    function applyApp(template, record, helpers, diagnostics, snapshot) {
      // 左格
      var leftSplit = splitCopy(record['左文案'], diagnostics, '左文案');
      setText(template, keys.leftTop, leftSplit.top, helpers, snapshot);
      setText(template, keys.leftBottom, leftSplit.bottom, helpers, snapshot);
      // 中格（直營特例）
      var midCopy = trim(record['中文案']);
      var directLogo = getLayer(template, keys.directLogo);
      if (midCopy.indexOf('蝦皮直營') >= 0) {
        hide(template, keys.midTop);
        if (directLogo) directLogo.hidden = false;
        var midRest = trim(midCopy.replace('蝦皮直營', ''));
        var midLayer = setText(template, keys.midBottom, midRest, helpers, snapshot);
        if (midLayer) digitSizeRanges(midLayer, midRest, config.midBottomBigPt, config.midBottomSmallPt, true);
      } else {
        if (directLogo) directLogo.hidden = true;
        var midSplit = splitCopy(midCopy, diagnostics, '中文案');
        setText(template, keys.midTop, midSplit.top, helpers, snapshot);
        var midBottomLayer = setText(template, keys.midBottom, midSplit.bottom, helpers, snapshot);
        if (midBottomLayer) digitSizeRanges(midBottomLayer, midSplit.bottom, config.midBottomBigPt, config.midBottomSmallPt, true);
      }
      // 右格（VIP 三件組；不含 VIP 報錯——使用者確認）
      var rightCopy = trim(record['右文案']);
      var rightSplit = splitCopy(rightCopy, diagnostics, '右文案');
      var vip = splitVip(rightSplit.top);
      if (!vip) {
        throw new Error(config.label + '：Excel 第 ' + (record.__sourceRows ? record.__sourceRows[2] : record.__sourceRow || '?') + ' 列，右邊文案「' + rightCopy + '」不含 VIP，無對應圖層可製作');
      }
      setText(template, keys.vipLeft, vip.left, helpers, snapshot);
      var vipLogo = getLayer(template, keys.vipLogo);
      if (vipLogo) vipLogo.hidden = false;
      var rightBottomLayer = setText(template, keys.rightBottom, rightSplit.bottom, helpers, snapshot);
      if (rightBottomLayer) digitSizeRanges(rightBottomLayer, rightSplit.bottom, config.rightBottomBigPt, config.rightBottomSmallPt, false);
    }

    function applyPc(template, record, helpers, diagnostics, snapshot) {
      // 左格：單行前白後黃
      var leftCopy = trim(record['左文案']);
      var leftSplit = splitCopy(leftCopy, diagnostics, '左文案');
      var leftLayer = setText(template, keys.left, leftCopy, helpers, snapshot);
      if (leftLayer) twoColorRanges(leftLayer, leftCopy, leftSplit.top.length, config.frontColor, config.backColor);
      // 中格（直營特例）
      var midCopy = trim(record['中文案']);
      var directLogo = getLayer(template, keys.directLogo);
      var directRight = getLayer(template, keys.directRight);
      if (midCopy.indexOf('蝦皮直營') >= 0) {
        hide(template, keys.mid);
        if (directLogo) directLogo.hidden = false;
        var midRest = trim(midCopy.replace('蝦皮直營', ''));
        var directRightLayer = setText(template, keys.directRight, midRest, helpers, snapshot);
        if (directRightLayer) directRightLayer.color = config.backColor;
      } else {
        if (directLogo) directLogo.hidden = true;
        if (directRight) directRight.hidden = true;
        var midSplit = splitCopy(midCopy, diagnostics, '中文案');
        var midLayer = setText(template, keys.mid, midCopy, helpers, snapshot);
        if (midLayer) {
          // 2026-08-13 字級特例：指定案型用覆寫字級（例：0-2點限時灑$200→42pt），其餘用預設 45pt。
          var midOverrides = config.midFontSizeOverrides || {};
          var midSize = Number(midOverrides[midCopy]) || Number(config.midFontSizeDefault) || Number(midLayer.fontSizePx) || 42;
          midLayer.fontSizePx = round2(midSize);
          twoColorRanges(midLayer, midCopy, midSplit.top.length, config.frontColor, config.backColor);
        }
      }
      // 右格：VIP 三件組（左白＋LOGO＋右黃）
      var rightCopy = trim(record['右文案']);
      var vip = splitVip(rightCopy);
      if (!vip) {
        throw new Error(config.label + '：Excel 第 ' + (record.__sourceRows ? record.__sourceRows[2] : record.__sourceRow || '?') + ' 列，右邊文案「' + rightCopy + '」不含 VIP，無對應圖層可製作');
      }
      setText(template, keys.vipLeft, vip.left, helpers, snapshot);
      var vipLogo = getLayer(template, keys.vipLogo);
      if (vipLogo) vipLogo.hidden = false;
      var vipRightLayer = setText(template, keys.vipRight, vip.right, helpers, snapshot);
      if (vipRightLayer) vipRightLayer.color = config.backColor;
    }

    function beforeApplyRecordToTemplate(args) {
      var template = args.template;
      var kvBg = getLayer(template, keys.kvBg);
      if (kvBg && kvBg.locked === undefined) kvBg.locked = true; // KV_BG 預設鎖定（與其他公版一致）。
      var product = getLayer(template, keys.product);
      if (product) product.role = '商品圖1';
    }

    function afterApplyRecordToTemplate(args) {
      var template = args.template;
      var record = args.record || {};
      var helpers = args.helpers || {};
      var diagnostics = args.diagnostics;
      var snapshot = ensureCenterSnapshot(template, config.textLayerKeys);

      // KV_BG／LOGO 素材
      var kvBg = getLayer(template, keys.kvBg);
      if (kvBg) {
        var kvHit = resolveAssetFromFolders(template, record, config.templateAssetFolder + '_KV_BG', kvBg, 'KV_BG', [config.templateAssetFolder]);
        if (kvHit) { kvBg.assetFilename = kvHit.filename; kvBg.assetProject = kvHit.project; kvBg.__assetMissing = false; }
      }
      var vipLogoLayer = getLayer(template, keys.vipLogo);
      if (vipLogoLayer) { vipLogoLayer.assetFilename = '蝦皮VIP_LOGO.svg'; vipLogoLayer.assetProject = ''; vipLogoLayer.__assetMissing = false; }
      var directLogoLayer = getLayer(template, keys.directLogo);
      if (directLogoLayer) { directLogoLayer.assetFilename = '蝦皮直營_LOGO.svg'; directLogoLayer.assetProject = ''; directLogoLayer.__assetMissing = false; }

      // 商品圖1（右列券面）→ VIP_單券_折扣 圖層；無資料時隱藏。
      var productLayer = getLayer(template, keys.product);
      var productName = trim(record['商品圖1']);
      if (productLayer) {
        if (productName) {
          productLayer.hidden = false;
          var productHit = resolveAssetFromFolders(template, record, productName, productLayer, '商品圖1', [config.templateAssetFolder, '共用素材']);
          if (productHit) {
            productLayer.assetFilename = productHit.filename;
            productLayer.assetProject = productHit.project;
            productLayer.__assetMissing = false;
            if (Array.isArray(diagnostics)) {
              // 核心引擎在 after-hook 之前的商品圖比對可能失敗並留下 missing 診斷；
              // 本 hook 已成功解析素材，將既有 missing 升級為 ok，避免素材檢查誤報。
              var upgraded = false;
              diagnostics.forEach(function (diagnostic) {
                if (!diagnostic || diagnostic.field !== '商品圖1') return;
                if (String(diagnostic.status || '').indexOf('missing') !== 0) return;
                diagnostic.status = 'ok';
                diagnostic.filename = productHit.filename;
                if (diagnostic.attempts) delete diagnostic.attempts;
                upgraded = true;
              });
              if (!upgraded) diagnostics.push({ field: '商品圖1', status: 'ok', value: productName, filename: productHit.filename });
            }
          } else if (Array.isArray(diagnostics)) {
            diagnostics.push({ field: '商品圖1', status: 'missing', value: productName, target: keys.product });
          }
        } else {
          productLayer.hidden = true;
        }
      }

      if (mode === 'app') applyApp(template, record, helpers, diagnostics, snapshot);
      else applyPc(template, record, helpers, diagnostics, snapshot);

      if (Array.isArray(diagnostics)) {
        diagnostics.push({ field: '文案', status: 'ok', value: [record['左文案'], record['中文案'], record['右文案']].join(' / '), target: config.label + ' 組 ' + pad2(record.__備註No) });
      }
    }

    function createVariantRecords(record) {
      var variant = {};
      Object.keys(record || {}).forEach(function (key) { variant[key] = record[key]; });
      variant.__outputName = config.outputPrefix + '_' + pad2(record && record.__備註No);
      variant.__outputSuffix = pad2(record && record.__備註No);
      return [variant];
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
      throw new Error('SkbnRuleFactory: TemplateRuleRegistry is not ready');
    }
    return window.TemplateRuleRegistry.register(config.ruleKey, createRule(config));
  }

  window.SkbnRuleFactory = Object.freeze({
    VERSION: '1.0.0',
    SPLIT_TABLE: SPLIT_TABLE,
    splitCopy: splitCopy,
    createRule: createRule,
    register: register,
  });
})();
