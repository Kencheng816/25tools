/* Shape Renderer V3.29.2
 * JSON Shape Support + app.core.js integration companion.
 *
 * 支援 PSD 公版小工具 V2.2 / V2.3 匯出的 shape JSON：
 * - rectangle
 * - roundedRectangle
 * - ellipse
 * - polygon
 * - path fallback
 *
 * API：
 * - ShapeRenderer.render(ctx, layer, rule)              // 舊 rules/*.js 用法
 * - ShapeRenderer.renderJsonShape(ctx, layer)           // 新 JSON shape 用法
 * - ShapeRenderer.createRuleFromJsonLayer(layer)
 */
(function initShapeRenderer() {
  'use strict';

  const DEG_TO_RAD = Math.PI / 180;

  const toNumber = (value, fallback = 0) => {
    if (value && typeof value === 'object') {
      if (Number.isFinite(Number(value._value))) return Number(value._value);
      if (Number.isFinite(Number(value.value))) return Number(value.value);
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  function normalizeRendererName(name) {
    const value = String(name || '').trim();
    if (value === 'rect') return 'rectangle';
    if (value === 'roundedRect') return 'roundedRectangle';
    if (value === 'circle') return 'ellipse';
    return value;
  }

  function getBox(layer = {}, rule = {}) {
    const shape = layer.shape || {};
    const geometry = shape.geometry || {};
    const useLayerBounds = rule.useLayerBounds === true || rule.bboxSource === 'layer' || rule.box === 'layer';
    // geometry.bbox / pathBounds 是「旋轉後內容的外接正框」：圖層一轉，這個框就會膨脹。
    // 有旋轉時必須改用未旋轉的真實框，否則畫出來會又大又偏（畫的時候還會再轉一次）。
    const unrotated = useLayerBounds ? null : unrotatedShapeBox(layer, geometry);
    const bbox = useLayerBounds ? layer : (rule.bbox || unrotated || geometry.bbox || shape.pathBounds || layer);

    const x = toNumber(bbox.x, toNumber(layer.x));
    const y = toNumber(bbox.y, toNumber(layer.y));
    const width = toNumber(bbox.width, toNumber(layer.width));
    const height = toNumber(bbox.height, toNumber(layer.height));

    return {
      x,
      y,
      width,
      height,
      centerX: toNumber(bbox.centerX, toNumber(layer.centerX, x + width / 2)),
      centerY: toNumber(bbox.centerY, toNumber(layer.centerY, y + height / 2)),
    };
  }

  // 旋轉角度不能用 shape.geometry.transform.rotationDeg。
  // 那是 PSD 建立形狀時的歷史變形矩陣（會含推斜、非正交），跟圖層擺在畫布上的角度是兩回事：
  // CTA_三角形 的矩陣算出來是 56.5 度，但它在畫布上是正的。
  //
  // 真正的角度來自畫布上的四個角點：A→B 是這顆圖層自己的上緣，它的傾角就是旋轉角度。
  // 抓PSD公版小工具 V2.4 起會直接輸出 layer.rotation 與 geometry.unrotatedBox；
  // V2.3 以前匯出的舊公版沒有這兩個欄位，就地從 geometry.corners 算，不必重出公版。
  function cornerQuad(geometry) {
    const corners = geometry && geometry.corners;
    if (!Array.isArray(corners) || corners.length !== 4) return null;
    const [a, b, c] = corners;
    const width = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    const height = Math.sqrt(Math.pow(c.x - b.x, 2) + Math.pow(c.y - b.y, 2));
    if (!(width > 0) || !(height > 0)) return null;

    const centerX = corners.reduce((sum, point) => sum + point.x, 0) / 4;
    const centerY = corners.reduce((sum, point) => sum + point.y, 0) / 4;
    let rotation = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const snapped = Math.round(rotation);
    if (Math.abs(rotation - snapped) < 0.001) rotation = snapped;

    return {
      rotation,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      centerX,
      centerY,
    };
  }

  // 有旋轉時才回傳未旋轉的真實框；沒轉的圖層回 null，維持沿用原本的 bbox / pathBounds。
  function unrotatedShapeBox(layer = {}, geometry = {}) {
    if (!shapeRotation(layer, geometry)) return null;
    return geometry.unrotatedBox || cornerQuad(geometry) || null;
  }

  function shapeRotation(layer = {}, geometry = {}) {
    if (layer.rotation !== undefined) return toNumber(layer.rotation);
    if (geometry.rotation !== undefined) return toNumber(geometry.rotation);
    const quad = cornerQuad(geometry);
    return quad ? quad.rotation : 0;
  }

  function getRotation(layer = {}, rule = {}) {
    if (rule.rotation !== undefined) return toNumber(rule.rotation);
    return shapeRotation(layer, (layer.shape && layer.shape.geometry) || {});
  }

  // PSD 的形狀可以「只有筆畫、沒有填色」。這種情況 PS 仍會把上一次的填色顏色留在圖層裡，
  // 所以不能只看有沒有顏色，必須看 AGMStrokeStyleInfo.fillEnabled 這個開關
  // （抓PSD公版小工具 V2.5 起輸出成 shape.fillEnabled）。
  // 沒有這個欄位的舊公版一律視為有填色，行為與過去完全相同。
  function isFillEnabled(layer = {}, rule = {}) {
    if (rule.fillEnabled !== undefined) return rule.fillEnabled !== false;
    if (layer.fillEnabled !== undefined) return layer.fillEnabled !== false;
    const shape = layer.shape || {};
    if (shape.fillEnabled !== undefined) return shape.fillEnabled !== false;
    return true;
  }

  function getFill(layer = {}, rule = {}) {
    if (!isFillEnabled(layer, rule)) return null;
    return rule.fill || rule.color || layer.fill || (layer.shape && layer.shape.fill) || '#ffffff';
  }

  function getStroke(layer = {}, rule = {}) {
    const rawStroke = rule.stroke || (layer.shape && layer.shape.stroke);
    if (!rawStroke) return null;

    if (typeof rawStroke === 'string') {
      return { enabled: true, color: rawStroke, width: toNumber(rule.strokeWidth, 1) };
    }

    return {
      enabled: !!rawStroke.enabled,
      color: rawStroke.color || rule.strokeColor || '#000000',
      width: Math.max(0, toNumber(rawStroke.width, toNumber(rule.strokeWidth, 1))),
    };
  }

  function applyPaint(ctx, layer = {}, rule = {}) {
    const fill = getFill(layer, rule);
    if (fill) ctx.fillStyle = fill;

    const stroke = getStroke(layer, rule);
    if (stroke && stroke.enabled) {
      ctx.strokeStyle = stroke.color || '#000000';
      ctx.lineWidth = stroke.width || 1;
    }

    return { fill, stroke };
  }

  // 填色與筆畫各自獨立：關掉填色的形狀只描邊，關掉筆畫的形狀只填色，
  // 兩個都關就什麼都不畫 —— 跟 PSD 一致。
  function fillIfNeeded(ctx, paint) {
    if (paint && paint.fill) ctx.fill();
  }

  function strokeIfNeeded(ctx, paint) {
    const stroke = paint && paint.stroke;
    if (stroke && stroke.enabled && stroke.width > 0) ctx.stroke();
  }

  const assetCache = new Map();

  function normalizeAssetKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[\s\u00a0\u3000\t\r\n]+/g, '')
      .replace(/[\-_()（）\[\]【】.]/g, '');
  }

  function getAssetCandidates(filename, rule = {}) {
    const rawCandidates = rule.assetCandidates || rule.assets || rule.filenames || rule.assetFilenames || [];
    const candidates = Array.isArray(rawCandidates) ? rawCandidates : [rawCandidates];
    return [filename, ...candidates].filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  function findLocalAssetFile(filename, rule = {}) {
    const files = window.AppState && window.AppState.assetFiles;
    if (!filename || !files || !files.size) return null;

    const candidates = getAssetCandidates(filename, rule);
    const exactOnly = rule.exactAsset === true || rule.exactMatch === true || rule.assetMatch === 'exact';

    // 先做精準比對，支援大小寫差異，但不做「包含」比對。
    for (const candidate of candidates) {
      if (files.has(candidate)) return files.get(candidate);
      const lower = candidate.toLowerCase();
      const exactHit = [...files.keys()].find((name) => name.toLowerCase() === lower);
      if (exactHit) return files.get(exactHit);
    }

    // 嚴格素材規則：例如 VIP_LOGO 只允許 VIP_LOGO.svg / VIP LOGO.svg，
    // 不可誤抓「蝦皮VIP_LOGO.svg」或「蝦皮VIP_LOGO.svg」。
    if (exactOnly) return null;

    const wantedKeys = candidates.map((candidate) => normalizeAssetKey(candidate));
    const hit = [...files.keys()].find((name) => {
      const key = normalizeAssetKey(name);
      return wantedKeys.some((wanted) => key === wanted || key.includes(wanted) || wanted.includes(key));
    });

    return hit ? files.get(hit) : null;
  }

  function requestRender() {
    requestAnimationFrame(() => {
      if (window.Renderer && typeof window.Renderer.render === 'function') window.Renderer.render();
    });
  }

  function loadAssetImage(filename, rule = {}) {
    if (!filename) return null;

    const candidates = getAssetCandidates(filename, rule);
    const localFile = findLocalAssetFile(filename, rule);
    const resolvedFilename = localFile ? localFile.name : candidates[0];
    const cacheKey = localFile
      ? `local:${localFile.name}:${localFile.size}:${localFile.lastModified}`
      : `asset:${resolvedFilename}`;

    const cached = assetCache.get(cacheKey);
    if (cached) return cached.status === 'loaded' ? cached.image : null;

    const img = new Image();
    const entry = { status: 'loading', image: img, objectUrl: '' };
    assetCache.set(cacheKey, entry);

    img.onload = () => {
      entry.status = 'loaded';
      requestRender();
      if (entry.objectUrl) setTimeout(() => URL.revokeObjectURL(entry.objectUrl), 1200);
    };

    img.onerror = () => {
      entry.status = 'error';
      console.warn('[ShapeRenderer] SVG asset 載入失敗:', resolvedFilename);
      if (entry.objectUrl) setTimeout(() => URL.revokeObjectURL(entry.objectUrl), 1200);
    };

    if (localFile) {
      entry.objectUrl = URL.createObjectURL(localFile);
      img.src = entry.objectUrl;
    } else {
      img.src = `./assets/${resolvedFilename}`;
    }

    return null;
  }

  function withTransform(ctx, layer, rule, draw) {
    const box = getBox(layer, rule);
    const rotation = getRotation(layer, rule);

    ctx.save();

    if (rotation) {
      ctx.translate(box.centerX, box.centerY);
      ctx.rotate(rotation * DEG_TO_RAD);
      draw({
        x: -box.width / 2,
        y: -box.height / 2,
        width: box.width,
        height: box.height,
        centerX: 0,
        centerY: 0,
        sourceBox: box,
      });
    } else {
      draw(box);
    }

    ctx.restore();
  }

  // PSD 的圓角矩形四個角可以各自不同（例如只有右側導角）。
  // 匯出的 shape.cornerRadius 是壓平成單一數值的結果，四個角都套它會把原本的直角也導掉。
  // 這裡直接把 PSD 原始描述裡的 keyOriginRRectRadii 讀回來，公版 JSON 仍是幾何的唯一真相來源，
  // 規則檔不需要為個別公版手動指定四角。
  function psdCornerRadii(shape) {
    const originTypes = shape && shape.rawShapeDescriptor && shape.rawShapeDescriptor.keyOriginType;
    const radii = Array.isArray(originTypes) ? originTypes[0] && originTypes[0].keyOriginRRectRadii : null;
    if (!radii) return null;
    const corners = {
      topLeft: toNumber(radii.topLeft, 0),
      topRight: toNumber(radii.topRight, 0),
      bottomRight: toNumber(radii.bottomRight, 0),
      bottomLeft: toNumber(radii.bottomLeft, 0),
    };
    // 四角全為 0 代表這顆形狀本來就是直角矩形，交還給呼叫端的純量 fallback 處理。
    return Object.keys(corners).some((corner) => corners[corner] > 0) ? corners : null;
  }

  function normalizeCornerRadii(value, width, height, fallback = 0) {
    const maxRadius = Math.max(0, Math.min(Math.abs(width) / 2, Math.abs(height) / 2));
    const clamp = (radius) => Math.max(0, Math.min(toNumber(radius, fallback), maxRadius));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      const radius = clamp(value);
      return { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius };
    }
    return {
      topLeft: clamp(value.topLeft ?? value.tl ?? fallback),
      topRight: clamp(value.topRight ?? value.tr ?? fallback),
      bottomRight: clamp(value.bottomRight ?? value.br ?? fallback),
      bottomLeft: clamp(value.bottomLeft ?? value.bl ?? fallback),
    };
  }

  // Photoshop 的圓角矩形以 cubic Bezier 描述四分之一圓。
  // 使用標準 kappa 常數，比 arcTo/quadraticCurveTo 更接近 PSD 向量路徑。
  const CIRCLE_KAPPA = 0.5522847498307936;

  // 只負責把四個圓角的路徑指令加到「目前已開始的路徑」上，不呼叫 beginPath/closePath。
  // 呼叫端如果正處在 translate/rotate 的 transform 內，就能直接沿用同一份圓角邏輯，
  // 不需要另外複製一份 arcTo 版本出來（避免兩份圓角畫法不一致）。
  function appendRoundRectCorners(ctx, x, y, width, height, radii) {
    const r = radii;
    const right = x + width;
    const bottom = y + height;

    ctx.moveTo(x + r.topLeft, y);
    ctx.lineTo(right - r.topRight, y);

    if (r.topRight > 0) {
      const k = r.topRight * CIRCLE_KAPPA;
      ctx.bezierCurveTo(right - r.topRight + k, y, right, y + r.topRight - k, right, y + r.topRight);
    } else {
      ctx.lineTo(right, y);
    }

    ctx.lineTo(right, bottom - r.bottomRight);
    if (r.bottomRight > 0) {
      const k = r.bottomRight * CIRCLE_KAPPA;
      ctx.bezierCurveTo(right, bottom - r.bottomRight + k, right - r.bottomRight + k, bottom, right - r.bottomRight, bottom);
    } else {
      ctx.lineTo(right, bottom);
    }

    ctx.lineTo(x + r.bottomLeft, bottom);
    if (r.bottomLeft > 0) {
      const k = r.bottomLeft * CIRCLE_KAPPA;
      ctx.bezierCurveTo(x + r.bottomLeft - k, bottom, x, bottom - r.bottomLeft + k, x, bottom - r.bottomLeft);
    } else {
      ctx.lineTo(x, bottom);
    }

    ctx.lineTo(x, y + r.topLeft);
    if (r.topLeft > 0) {
      const k = r.topLeft * CIRCLE_KAPPA;
      ctx.bezierCurveTo(x, y + r.topLeft - k, x + r.topLeft - k, y, x + r.topLeft, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  function roundRectCornersPath(ctx, x, y, width, height, radii = 0, fallback = 0) {
    ctx.beginPath();
    appendRoundRectCorners(ctx, x, y, width, height, normalizeCornerRadii(radii, width, height, fallback));
    ctx.closePath();
  }

  function drawRectangle(ctx, layer, rule, paint) {
    withTransform(ctx, layer, rule, ({ x, y, width, height }) => {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      fillIfNeeded(ctx, paint);
      strokeIfNeeded(ctx, paint);
    });
  }

  function drawRoundedRectangle(ctx, layer, rule, paint) {
    withTransform(ctx, layer, rule, ({ x, y, width, height }) => {
      const radius = toNumber(rule.radius, toNumber(rule.cornerRadius, toNumber(layer.shape && layer.shape.cornerRadius, 0)));
      const cornerRadii = rule.cornerRadii || layer.cornerRadii || layer.shape?.cornerRadii
        || psdCornerRadii(layer.shape) || radius;
      roundRectCornersPath(ctx, x, y, width, height, cornerRadii);
      fillIfNeeded(ctx, paint);
      strokeIfNeeded(ctx, paint);
    });
  }

  function drawEllipse(ctx, layer, rule, paint) {
    withTransform(ctx, layer, rule, ({ x, y, width, height }) => {
      ctx.beginPath();
      ctx.ellipse(
        x + width / 2,
        y + height / 2,
        Math.abs(width / 2),
        Math.abs(height / 2),
        0,
        0,
        Math.PI * 2
      );
      fillIfNeeded(ctx, paint);
      strokeIfNeeded(ctx, paint);
    });
  }

  function drawPolygon(ctx, layer, rule, paint) {
    const shape = layer.shape || {};
    const geometry = shape.geometry || {};
    const sides = Math.max(3, Math.round(toNumber(
      rule.sides,
      toNumber(rule.polygonSides, toNumber(geometry.polygonSides, 3))
    )));

    withTransform(ctx, layer, rule, ({ x, y, width, height }) => {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      const startAngle = toNumber(rule.startAngleDeg, -90) * DEG_TO_RAD;

      ctx.beginPath();
      for (let i = 0; i < sides; i += 1) {
        const angle = startAngle + (Math.PI * 2 * i) / sides;
        const px = cx + Math.cos(angle) * rx;
        const py = cy + Math.sin(angle) * ry;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      fillIfNeeded(ctx, paint);
      strokeIfNeeded(ctx, paint);
    });
  }

  function drawPathFallback(ctx, layer, rule, paint) {
    const points = (layer.shape && (layer.shape.bezierPoints || layer.shape.vectorPath)) || [];
    const hasRealBezier = Array.isArray(points) && points.some((point) => point.leftDirection || point.rightDirection);

    if (!hasRealBezier) {
      drawRectangle(ctx, layer, { ...rule, bbox: (layer.shape && layer.shape.pathBounds) || rule.bbox }, paint);
      return;
    }

    ctx.beginPath();
    points.forEach((point, index) => {
      const anchor = point.anchor;
      if (!anchor) return;

      const x = toNumber(anchor.x);
      const y = toNumber(anchor.y);

      if (index === 0) {
        ctx.moveTo(x, y);
        return;
      }

      const prev = points[index - 1];
      const prevAnchor = prev && prev.anchor;
      const prevRight = prev && prev.rightDirection;
      const left = point.leftDirection;

      if (prevRight || left) {
        ctx.bezierCurveTo(
          toNumber(prevRight && prevRight.x, toNumber(prevAnchor && prevAnchor.x, x)),
          toNumber(prevRight && prevRight.y, toNumber(prevAnchor && prevAnchor.y, y)),
          toNumber(left && left.x, x),
          toNumber(left && left.y, y),
          x,
          y
        );
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    fillIfNeeded(ctx, paint);
    strokeIfNeeded(ctx, paint);
  }

  function getAssetDrawBox(image, box, rule = {}) {
    const mode = String(rule.assetSizing || rule.sizing || 'stretch').toLowerCase();
    if (mode === 'stretch' || mode === 'layerbounds' || mode === 'layer-bounds') return box;

    const naturalWidth = image.naturalWidth || image.width || box.width;
    const naturalHeight = image.naturalHeight || image.height || box.height;
    const imageRatio = naturalHeight ? naturalWidth / naturalHeight : 1;
    const boxRatio = box.height ? box.width / box.height : imageRatio;
    const shouldCover = mode === 'cover';
    const useWidth = shouldCover ? imageRatio < boxRatio : imageRatio > boxRatio;
    const width = useWidth ? box.width : box.height * imageRatio;
    const height = useWidth ? box.width / imageRatio : box.height;

    return {
      x: box.x + (box.width - width) / 2,
      y: box.y + (box.height - height) / 2,
      width,
      height,
      centerX: box.x + box.width / 2,
      centerY: box.y + box.height / 2,
      sourceBox: box.sourceBox || box,
    };
  }

  function drawAsset(ctx, layer, rule) {
    const filename = rule.asset || rule.assetFilename || rule.src || rule.filename;
    const image = loadAssetImage(filename, rule);
    if (!image) return;

    withTransform(ctx, layer, rule, (box) => {
      const drawBox = getAssetDrawBox(image, box, rule);
      ctx.drawImage(image, drawBox.x, drawBox.y, drawBox.width, drawBox.height);
    });
  }

  function traceJsonShapePath(ctx, layer, options = {}) {
    if (!ctx || !layer) return false;
    const baseRule = createRuleFromJsonLayer(layer);
    const rule = { ...baseRule, ...options, useLayerBounds: options.useLayerBounds !== false };
    const rendererName = normalizeRendererName(rule.renderer || rule.type || rule.shape);
    const box = getBox(layer, rule);
    const rotation = getRotation(layer, rule);

    ctx.beginPath();
    ctx.save();
    let localBox = box;
    if (rotation) {
      ctx.translate(box.centerX, box.centerY);
      ctx.rotate(rotation * DEG_TO_RAD);
      localBox = { x: -box.width / 2, y: -box.height / 2, width: box.width, height: box.height };
    }

    const { x, y, width, height } = localBox;
    if (rendererName === 'ellipse' || rendererName === 'circle') {
      ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
    } else if (rendererName === 'roundedRectangle' || rendererName === 'roundedRect' || rendererName === 'pill') {
      const fallbackRadius = rendererName === 'pill'
        ? Math.abs(height) / 2
        : toNumber(rule.radius, toNumber(rule.cornerRadius, toNumber(layer.shape?.cornerRadius, 0)));
      const cornerRadii = rule.cornerRadii || layer.cornerRadii || layer.shape?.cornerRadii
        || psdCornerRadii(layer.shape) || fallbackRadius;
      // 這裡已經處在 rotate/translate 的 transform 內，且路徑已由呼叫端 beginPath()，
      // 所以只 append 圓角指令，不重新 beginPath。
      appendRoundRectCorners(ctx, x, y, width, height, normalizeCornerRadii(cornerRadii, width, height, fallbackRadius));
      ctx.closePath();
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.restore();
    return true;
  }

  function clipJsonShape(ctx, layer, options = {}) {
    if (!traceJsonShapePath(ctx, layer, options)) return false;
    ctx.clip();
    return true;
  }

  const renderers = {
    asset: drawAsset,
    image: drawAsset,
    svg: drawAsset,

    rectangle: drawRectangle,
    rect: drawRectangle,

    roundedRectangle: drawRoundedRectangle,
    roundedRect: drawRoundedRectangle,

    ellipse: drawEllipse,
    circle: drawEllipse,

    polygon: drawPolygon,
    triangle(ctx, layer, rule, paint) {
      drawPolygon(ctx, layer, { ...rule, sides: 3, polygonSides: 3 }, paint);
    },

    path: drawPathFallback,

    pill(ctx, layer, rule, paint) {
      const box = getBox(layer, rule);
      drawRoundedRectangle(ctx, layer, { ...rule, radius: box.height / 2 }, paint);
    },
  };

  function createRuleFromJsonLayer(layer = {}) {
    const shape = layer.shape || {};
    const geometry = shape.geometry || {};
    const kind = normalizeRendererName(shape.kind || geometry.kind || layer.type);

    // 「CTA_箭頭」的舊公版匯出時向量資料不完整，只能靠圖層名稱硬畫成朝右的三角形（▶）。
    // 抓PSD公版小工具 V2.4 起，多邊形的角點框本身就帶著它自己的朝向
    // （例如朝右的三角形＝90 度），一般流程算得出角度，就不需要也不應該再依賴圖層名稱。
    const arrowNeedsNameFallback = String(layer.psdName || '').trim() === 'CTA_箭頭'
      && layer.rotation === undefined
      && geometry.rotation === undefined
      && !cornerQuad(geometry);
    if (arrowNeedsNameFallback) {
      return {
        renderer: 'triangle',
        fill: shape.fill || layer.fill,
        stroke: shape.stroke || null,
        sides: 3,
        polygonSides: 3,
        startAngleDeg: 0, // 0度：第一個頂點指向右邊，畫出來的三角形會朝右
        rotation: 0,
        bbox: null, // 用 layer.x/y/width/height 這個乾淨的框，不要用PSD匯出時不完整的pathBounds
        asset: null,
      };
    }

    return {
      renderer: kind,
      fill: shape.fill || layer.fill,
      fillEnabled: shape.fillEnabled,
      stroke: shape.stroke || null,
      cornerRadius: shape.cornerRadius || 0,
      radius: shape.cornerRadius || 0,
      cornerRadii: layer.cornerRadii || shape.cornerRadii || psdCornerRadii(shape) || null,
      polygonSides: geometry.polygonSides || shape.polygonSides,
      sides: geometry.polygonSides || shape.polygonSides,
      startAngleDeg: geometry.startAngleDeg ?? shape.startAngleDeg ?? layer.startAngleDeg,
      rotation: shapeRotation(layer, geometry),
      // Dynamic layout-managed shapes (for example Headband 案型_BG) must use
      // the live layer box. Other PSD-origin shapes keep their exported bbox.
      useLayerBounds: layer.useDynamicBounds === true,
      bbox: layer.useDynamicBounds === true
        ? null
        : (unrotatedShapeBox(layer, geometry) || geometry.bbox || shape.pathBounds || null),
      asset: layer.asset || layer.assetFilename || shape.asset || shape.assetFilename || null,
    };
  }

  function render(ctx, layer, rule) {
    if (!ctx || !layer || !rule) return false;

    const rendererName = normalizeRendererName(rule.renderer || rule.type || rule.shape);
    const renderer = renderers[rendererName];
    if (!renderer) return false;

    ctx.save();
    const paint = applyPaint(ctx, layer, rule);
    renderer(ctx, layer, rule, paint);
    ctx.restore();

    return true;
  }

  function renderJsonShape(ctx, layer) {
    if (!ctx || !layer || layer.type !== 'shape' || !layer.shape) return false;
    return render(ctx, layer, createRuleFromJsonLayer(layer));
  }

  window.ShapeRenderer = Object.freeze({
    render,
    renderJsonShape,
    createRuleFromJsonLayer,
    traceJsonShapePath,
    clipJsonShape,
    renderers: Object.freeze({ ...renderers }),
  });
})();
