/* 25節 商城狂購節 KV — 副標題_底色 六角形自動伸縮
 * 完全比照 25節_暖身BN 的 warmup-banner-rule-factory.js:
 *   - 寬度 = 副標(複合)寬 + 2 × padding，padding = 底色height × (40/62)
 *   - 六角尖端寬 = height × 0.29
 *   - 6 頂點水平六角形，改寫 shape.kind='path' + vectorPath/bezierPoints
 *   - height / fill / 垂直中心 沿用圖層既有值；水平置中於 centerX
 * 共用工具掛在 window.KVFestivalHexagon，供 rules/25節KV_商城狂購節_rules.js 使用。
 */
(function () {
  'use strict';

  var CAPSULE_PADDING_RATIO = 40 / 62; // 比照 BN sp-text-standard.js
  var POINT_RATIO = 0.29;              // 比照 BN buildHexagonBackground
  var GROUP_GAP = 5;                   // 比照 BN subtitleGroupGap（logo+文字間距）

  function round2(n) { return Math.round(Number(n) * 100) / 100; }

  // 依 底色height 算單邊 padding
  function subtitlePadding(bgLayer) {
    var height = Math.max(1, Number(bgLayer && bgLayer.height) || 80);
    return height * CAPSULE_PADDING_RATIO;
  }

  // 把 副標題_底色 改寫成水平六角形；targetWidth 已含左右 padding
  // 使用者手動編輯（__manualOverrides）優先，比照 BN buildHexagonBackground：
  // 手動調過的 width / x / y / centerX / centerY 不被規則覆蓋。
  function buildHexagon(layer, targetWidth, centerX) {
    if (!layer) return;
    var manual = layer.__manualOverrides || {};
    var height = Math.max(1, Number(layer.height) || 80);
    var requestedWidth = Math.max(1, Number(targetWidth) || Number(layer.width) || 0);
    var width = manual.width ? Math.max(1, Number(layer.width) || requestedWidth) : requestedWidth;
    if (!(width > 0 && height > 0)) return;

    var currentY = Number(layer.y || 0);
    var currentCenterY = Number(layer.centerY);
    if (!isFinite(currentCenterY)) currentCenterY = currentY + height / 2;

    var cxAuto = isFinite(Number(centerX)) ? Number(centerX) : (Number(layer.centerX) || (currentY + width / 2));
    var x = manual.x ? Number(layer.x || 0) : cxAuto - width / 2;
    var y = manual.y ? currentY : currentCenterY - height / 2;
    var cx = manual.centerX ? Number(layer.centerX || (x + width / 2)) : (manual.x ? x + width / 2 : cxAuto);
    var centerY = manual.centerY ? currentCenterY : y + height / 2;

    var pointWidth = Math.min(Math.round(height * POINT_RATIO), Math.floor(width / 2));
    var corners = [
      { x: x + pointWidth, y: y },
      { x: x + width - pointWidth, y: y },
      { x: x + width, y: centerY },
      { x: x + width - pointWidth, y: y + height },
      { x: x + pointWidth, y: y + height },
      { x: x, y: centerY }
    ];
    var vectorPath = corners.map(function (p) {
      return { anchor: { x: p.x, y: p.y }, leftDirection: { x: p.x, y: p.y }, rightDirection: { x: p.x, y: p.y } };
    });
    var fill = layer.fill || (layer.shape && layer.shape.fill) || '#113366';

    layer.x = round2(x);
    layer.y = round2(y);
    layer.width = round2(width);
    layer.height = round2(height);
    layer.centerX = round2(cx);
    layer.centerY = round2(centerY);
    layer.type = 'shape';
    layer.shape = layer.shape || {};
    layer.shape.kind = 'path';
    layer.shape.vectorPath = vectorPath;
    layer.shape.bezierPoints = vectorPath;
    layer.shape.fill = fill;
    layer.fill = fill;
    // 清掉 PSD 匯出的舊幾何，避免 ShapeRenderer 沿用舊寬度
    ['geometry', 'pathBounds', 'vectorMask', 'vectorDiscovery', 'hasVectorData', 'rawShapeDescriptor', 'rawDescriptorKeys'].forEach(function (k) {
      if (layer.shape[k] !== undefined) { try { delete layer.shape[k]; } catch (e) {} }
    });
    layer.hidden = false;
    layer.useDynamicBounds = true;
  }

  window.KVFestivalHexagon = {
    CAPSULE_PADDING_RATIO: CAPSULE_PADDING_RATIO,
    POINT_RATIO: POINT_RATIO,
    GROUP_GAP: GROUP_GAP,
    round2: round2,
    subtitlePadding: subtitlePadding,
    buildHexagon: buildHexagon
  };
})();
