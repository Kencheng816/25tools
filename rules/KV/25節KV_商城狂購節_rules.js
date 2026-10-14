/* 25節 商城狂購節 KV 公版規則（family: kv_25_festival）
 *
 * 資料來源：工單分頁「工單KV+Logo」。欄位：備註 / 製作內容 / 日期 / 主標 / 副標(7字內) /
 *          是否放商品圖 / 曝品1 URL / 曝品2 URL / 頁面備註(14字內) / MKT備註。
 *
 * 行為（已與需求方逐條確認）：
 *  1) 架構：走 rules 工廠 + TemplateRuleRegistry hook（比照 25節_暖身BN），不用 AssetSpecEngine。
 *  2) 製作內容 → templates/<製作內容>.json；精確比對，並容錯截斷值（例如「03_L2_免運頁_暖」→「03_L2_免運頁_暖身」）。
 *  3) 備註：作為排序依據，數字升冪；非數字（如日期）沿用「前一個編號 + 微量」插在其後，維持工單原順序。
 *  4) 主標：正規化後含 LOGO / USP 即略過（不套主標題）；無主標題圖層也自然略過。
 *  5) 副標：以 psdName 開頭「副標」辨識文字層；若公版有固定圖層「25號」，
 *          則從工單副標剝除開頭「25號」後只寫入文字層；底色寬度涵蓋 25號圖+gap+文字。
 *  6) 副標題_底色：六角形自動伸縮，全照 BN（KVFestivalHexagon）。
 *  7) 頁面備註 → 保護文字圖層；空白或無該圖層則略過。日期/商品圖/URL/MKT備註 一律略過。
 */
(function () {
  'use strict';

  var FAMILY = 'kv_25_festival';
  var TEMPLATE_IDS = [
    '01_L2_攻略頁',
    '正式(16x9外)', '正式(內)', '正式(外)',
    '03_L2_免運頁_暖身', '04_L2_免運頁_正式', '05_L2_感謝頁'
  ];

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[\-_()（）\[\]【】.]/g, '');
  }
  function trim(v) { return String(v == null ? '' : v).replace(/\r\n/g, '\n').trim(); }

  // 主標略過判定：含 LOGO / USP 視為素材指示
  function isLogoUspDirective(value) {
    var n = norm(value);
    return n.indexOf('logo') >= 0 || n.indexOf('usp') >= 0;
  }

  // 製作內容 → 完整公版 id（精確；容錯截斷：互為前綴且唯一命中）
  function matchTemplateId(content) {
    var n = norm(content);
    if (!n) return '';
    var i;
    for (i = 0; i < TEMPLATE_IDS.length; i++) {
      if (norm(TEMPLATE_IDS[i]) === n) return TEMPLATE_IDS[i];
    }
    var hit = TEMPLATE_IDS.filter(function (id) {
      var ni = norm(id);
      return ni.indexOf(n) === 0 || n.indexOf(ni) === 0;
    });
    if (hit.length === 1) return hit[0];
    return content; // 找不到就原樣，交給 findTemplateForRoute 再試
  }

  // =========================================================
  // (A) 自訂 sheetParser：完整解析「工單KV+Logo」分頁
  // =========================================================
  function parseSheet(input) {
    var rows = (input && input.rows) || [];
    var empty = { blocks: [] };
    if (!rows.length) return empty;

    // 找表頭列：同一列同時有「製作內容」「主標」「副標」
    var headerIdx = -1, col = null;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r] || [];
      var m = {};
      for (var c = 0; c < row.length; c++) {
        var t = norm(row[c]);
        if (!t) continue;
        if (m.content === undefined && t === '製作內容') m.content = c;
        else if (m.remark === undefined && t === '備註') m.remark = c;           // 只吃純「備註」，排除頁面備註 / MKT備註
        else if (m.main === undefined && t.indexOf('主標') === 0) m.main = c;
        else if (m.sub === undefined && t.indexOf('副標') === 0) m.sub = c;
        else if (m.pageNote === undefined && t.indexOf('頁面備註') === 0) m.pageNote = c;
      }
      if (m.content !== undefined && m.main !== undefined && m.sub !== undefined) {
        headerIdx = r; col = m; break;
      }
    }
    if (headerIdx < 0) return empty; // 不是這份工單 → 交還其他解析器

    var blocks = [];
    var lastBase = 0, eps = 0; // 排序：非數字備註沿用前一編號 + 微量（依工單原順序）
    for (var rr = headerIdx + 1; rr < rows.length; rr++) {
      var dr = rows[rr] || [];
      var content = trim(dr[col.content]);
      if (!content) continue; // 沒有製作內容的列略過

      var remark = col.remark !== undefined ? trim(dr[col.remark]) : '';
      // 備註編號：支援「1」「3.0」與階層式「2-1」（視為 2.1）；其他（如日期）沿用前一編號插序
      var nm = String(remark).match(/^(\d+)(?:[.．](\d+))?(?:[-–—](\d+))?/);
      var num = NaN;
      if (nm) {
        num = parseInt(nm[1], 10);
        var minor = nm[3] !== undefined ? nm[3] : nm[2];
        if (minor !== undefined) num += parseInt(minor, 10) / 100;
      }
      var sortKey;
      if (isFinite(num) && num < 1000) { sortKey = num; lastBase = num; eps = 0; }
      else { eps += 0.001; sortKey = lastBase + eps; }

      var record = {
        '主標': trim(dr[col.main]),
        '副標': col.sub !== undefined ? trim(dr[col.sub]) : '',
        '__頁面備註': col.pageNote !== undefined ? trim(dr[col.pageNote]) : '',
        '__備註': remark,
        '__製作內容': content,
        '__sortKey': sortKey,
        '__sourceRow': rr + 1
      };

      blocks.push({
        name: content, startRow: rr, quantity: 1,
        records: [record], colMap: {}, templateType: FAMILY, __sortKey: sortKey, __seq: blocks.length
      });
    }
    if (!blocks.length) return empty;

    blocks.sort(function (a, b) { return (a.__sortKey - b.__sortKey) || (a.__seq - b.__seq); });
    return { blocks: blocks, anchorCount: blocks.length, warnings: [], skippedRows: [] };
  }

  // =========================================================
  // (B) 路由：製作內容 → templates/<完整公版id>.json
  // =========================================================
  function resolveRoute(ctx) {
    var content = trim((ctx.block && ctx.block.name) || (ctx.record && ctx.record.__製作內容));
    if (!content) return null;
    var id = matchTemplateId(content);
    return {
      key: FAMILY, family: FAMILY, label: id,
      templateId: id, templateFile: id + '.json', outputPrefix: id
    };
  }

  // =========================================================
  // (C) 套版前：主標含 LOGO/USP → 清掉，讓引擎預設不寫入主標題
  // =========================================================
  function beforeApply(ctx) {
    var template = ctx.template;
    var record = ctx.record || {};
    // 主標含 LOGO/USP → 略過
    if (isLogoUspDirective(record['主標'])) { record['主標'] = ''; return; }
    // 保護：公版若沒有「真正的主標題文字層」（psd/key 含「主標」，不會誤中 subtitle），
    // 就清掉主標，避免引擎預設用關鍵字 title 把主標誤塞進副標(subtitle)層。
    if (template && template.layers) {
      var hasTitle = false;
      if (ctx.helpers && typeof ctx.helpers.findLayer === 'function') {
        hasTitle = !!ctx.helpers.findLayer(template, 'text', ['主標'], false);
      } else {
        hasTitle = Object.keys(template.layers).some(function (k) {
          var l = template.layers[k];
          return l && l.type === 'text' && norm(k + ' ' + (l.psdName || '')).indexOf('主標') >= 0;
        });
      }
      if (!hasTitle) record['主標'] = '';
    }
  }

  // =========================================================
  // (D) 套版後：副標 / 保護文字 / 六角底色
  // =========================================================
  function afterApply(ctx) {
    var template = ctx.template;
    var record = ctx.record || (template && template.batchRecord) || {};
    var helpers = ctx.helpers || {};
    var H = window.KVFestivalHexagon;
    if (!template || !template.canvas || !H) return;

    var centerX = Number(template.canvas.width) / 2;
    var findLayer = helpers.findLayer;
    var measure = helpers.measureTextWidth || function () { return 0; };
    var normalizeText = helpers.normalizeRecordText || trim;

    // ---- 素材資料夾鎖定（比照 BN templateAssetFolder 做法）----
    // 素材依公版分子資料夾存放時，KV_BG 屬背景類（禁模糊/禁跨專案 fallback），
    // 且本工單沒有專案欄位（currentProject=''），預設查找只看「共用素材＋根目錄」，
    // 會找不到子資料夾內的 KV_BG。這裡把每個 image 圖層的 assetProject 鎖到
    // 與公版同名（或截斷前綴唯一命中）的素材子資料夾；找不到子資料夾（扁平存放）則不動。
    (function lockAssetFolder() {
      var appState = window.AppState;
      if (!appState || !appState.assetFiles || !appState.assetFiles.size) return;
      var sourceId = (template.sheetTemplateRoute && template.sheetTemplateRoute.sourceTemplateId)
        || (template.canvas && template.canvas.templateId)
        || template.templateId || '';
      var nid = norm(sourceId);
      if (!nid) return;
      var folders = [];
      appState.assetFiles.forEach(function (bucket, name) { if (name && name !== '共用素材') folders.push(name); });
      var folder = null;
      var i;
      for (i = 0; i < folders.length; i++) { if (norm(folders[i]) === nid) { folder = folders[i]; break; } }
      if (!folder) {
        var hits = folders.filter(function (f) {
          var nf = norm(f);
          return nf.indexOf(nid) === 0 || nid.indexOf(nf) === 0;
        });
        if (hits.length === 1) folder = hits[0];
      }
      if (!folder) return;
      Object.keys(template.layers || {}).forEach(function (k) {
        var l = template.layers[k];
        if (l && l.type === 'image' && !l.assetProject) l.assetProject = folder;
      });
    })();

    var standard = window.SPTextStandard;

    // ---- 文字自動縮小（比照 BN applyTitleRanges）----
    // 以圖層自身字級為大字基準重建 textStyleRanges：$、%、逗號與「數字後的號」縮成 0.82 倍。
    // 全部同字級時清除 ranges，回到單一字級。
    function applyAutoShrink(layer) {
      if (!layer || !layer.text) return;
      if (!(standard && standard.titleRanges && standard.isDualSize)) return;
      var ranges = standard.titleRanges(String(layer.text), Number(layer.fontSizePx) || 24, {
        color: layer.color,
        smallBaselineOffset: 0
      });
      if (standard.isDualSize(ranges)) {
        layer.textStyleRanges = ranges;
        layer.styledTextVerticalAlign = 'source-baseline';
      } else {
        if (layer.textStyleRanges) delete layer.textStyleRanges;
        layer.styledTextVerticalAlign = 'default';
      }
    }

    var subtitleWidth = 0;
    var titleWidth = 0;

    // ---- 主標題（文字已由引擎預設流程寫入；這裡做自動縮小與量寬）----
    var titleLayer = findLayer(template, 'text', ['主標'], false);
    if (titleLayer && !titleLayer.hidden && String(titleLayer.text || '').trim()) {
      applyAutoShrink(titleLayer);
      titleWidth = Math.max(0, Number(measure(titleLayer)) || Number(titleLayer.width) || 0);
    }

    // ---- 副標 ----
    var subLayer = findLayer(template, 'text', ['副標'], false);
    var subValue = normalizeText(record['副標']);
    if (subLayer && subValue) {
      var badge = findLayer(template, 'image', ['25號'], false); // 03 的固定圖層
      var textValue = subValue;
      if (badge) textValue = subValue.replace(/^25號\s*/, ''); // 剝除開頭「25號」（由圖層呈現）

      subLayer.text = textValue;
      subLayer.hidden = false;
      applyAutoShrink(subLayer);
      var subManual = subLayer.__manualOverrides || {};
      var textWidth = Math.max(1, Number(measure(subLayer)) || Number(subLayer.width) || 1);
      if (!subManual.width) subLayer.width = H.round2(textWidth);

      if (badge && !badge.hidden) {
        // 複合：25號圖 + gap + 文字，整組水平置中於畫布中心
        var badgeManual = badge.__manualOverrides || {};
        var imgW = Math.max(0, Number(badge.width) || 0);
        var groupW = imgW + H.GROUP_GAP + textWidth;
        var left = centerX - groupW / 2;
        if (!badgeManual.x) badge.x = H.round2(left);
        if (!badgeManual.centerX) badge.centerX = H.round2(Number(badge.x || left) + imgW / 2);
        if (!subManual.x) subLayer.x = H.round2(left + imgW + H.GROUP_GAP);
        if (!subManual.centerX) subLayer.centerX = H.round2(Number(subLayer.x) + textWidth / 2);
        subtitleWidth = groupW;
      } else {
        if (!subManual.x) subLayer.x = H.round2(centerX - textWidth / 2);
        if (!subManual.centerX) subLayer.centerX = H.round2(Number(subLayer.x) + textWidth / 2);
        subtitleWidth = textWidth;
      }
    }

    // ---- 保護文字（頁面備註）----
    var pageNote = normalizeText(record['__頁面備註']);
    if (pageNote) {
      var protectLayer = findLayer(template, 'text', ['保護文字', '保護'], false);
      if (protectLayer) { protectLayer.text = pageNote; protectLayer.hidden = false; }
    }

    // ---- 副標題_底色 自動伸縮（主標題/副標題群組寬度比較，比照 BN capsuleWidth）----
    // 主標寬 - 副標群組寬 >= height×(60/62) → 底色寬 = 主標寬；
    // 否則 → 底色寬 = 副標群組寬 + 2 × height×(40/62)。
    var bgLayer = findLayer(template, 'shape', ['副標題_底色', '底色'], false);
    if (bgLayer) {
      if (subtitleWidth > 0) {
        var bgHeight = Number(bgLayer.height) || 80;
        var bgWidth;
        if (standard && standard.capsuleWidth) {
          bgWidth = standard.capsuleWidth({ titleWidth: titleWidth, subtitleWidth: subtitleWidth, height: bgHeight });
        } else {
          // 後備：無 SPTextStandard 時沿用純 padding 模式
          bgWidth = subtitleWidth + H.subtitlePadding(bgLayer) * 2;
        }
        H.buildHexagon(bgLayer, bgWidth, centerX);
      } else {
        bgLayer.hidden = true; // 沒有副標則不顯示底色
      }
    }
  }

  window.TemplateRuleRegistry.register(FAMILY, {
    label: '25節 商城狂購節 KV',
    priority: 100,
    tokens: TEMPLATE_IDS,
    targets: TEMPLATE_IDS,
    sheetParser: parseSheet,
    rules: {
      resolveRecordTemplateRoute: resolveRoute,
      beforeApplyRecordToTemplate: beforeApply,
      afterApplyRecordToTemplate: afterApply
    }
  });

  window.__KV_25_FESTIVAL_RULE_VERSION = '2026-08-12b｜底色寬度比較(capsuleWidth)＋主副標自動縮小(titleRanges)';
})();
