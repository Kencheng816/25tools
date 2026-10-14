/* Shape Renderer V3.30.0
 * V3.30.0（25節Tool_跨夜直播宣傳圖 V0.5）：
 *   - insetBoxForStroke()：有描邊時把框內縮「描邊寬/2」。
 *     PSD 匯出的 shape.pathBounds 是「含描邊的實際塗佈範圍」，不是路徑中心線；
 *     ctx.stroke() 本身居中在路徑上，直接畫在 pathBounds 會讓描邊整條往外偏半個描邊寬。
 *     圓角不跟著調整（cornerRadius 定義在路徑上）。
 * V3.29.2 起原有內容：
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
    const bbox = useLayerBounds ? layer : (rule.bbox || geometry.bbox || shape.pathBounds || layer);

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

  function getRotation(layer = {}, rule = {}) {
    if (rule.rotation !== undefined) return toNumber(rule.rotation);
    if (layer.rotation !== undefined) return toNumber(layer.rotation);

    const transform = layer.shape && layer.shape.geometry && layer.shape.geometry.transform;
    if (transform && transform.rotationDeg !== undefined) return toNumber(transform.rotationDeg);

    return 0;
  }

  // 這個圖層到底要不要填色。
  // PSD 匯出的「只有描邊、沒有填色」圖層會帶 shape.fillEnabled === false 且 fill 為 null。
  // 舊版沒有判斷這個旗標，getFill() 又在 fill 為 null 時 fallback 到白色，
  // 結果變成「白色實心」——例如 Game BN 的『白色線條』是 1090x366 的白框線，
  // 會被填成一整片白色把整張 banner 蓋掉。
  function isFillEnabled(layer = {}, rule = {}) {
    if (rule.fillEnabled === false) return false;
    if (rule.fillEnabled === true) return true;
    if (rule.fill || rule.color) return true;
    const shape = layer.shape || {};
    if (shape.fillEnabled === false) return false;
    if (layer.fillGradient || rule.fillGradient) return true;
    return Boolean(layer.fill || shape.fill);
  }

  function getFill(layer = {}, rule = {}) {
    return rule.fill || rule.color || layer.fill || (layer.shape && layer.shape.fill) || '#ffffff';
  }

  // 沿圖層本地 x 軸的線性漸層。規則檔設定：
  //   layer.fillGradient = { from, to, startRatio, endRatio }
  //   startRatio / endRatio 是圖層框寬度的 0~1 比例（startRatio 用 from 色，endRatio 之後維持 to 色）
  // 引擎不認識任何圖層名稱，要漸層的是誰完全由規則檔決定。
  function createFillGradient(ctx, layer = {}, rule = {}, box = null) {
    const config = rule.fillGradient || layer.fillGradient;
    if (!config || !box || !ctx.createLinearGradient) return null;
    const width = Number(box.width);
    if (!Number.isFinite(width) || width === 0) return null;

    const clampRatio = (value, fallback) => {
      const ratio = Number(value);
      if (!Number.isFinite(ratio)) return fallback;
      return Math.max(0, Math.min(1, ratio));
    };
    const startRatio = clampRatio(config.startRatio, 0);
    const endRatio = Math.max(startRatio, clampRatio(config.endRatio, 1));
    const from = config.from || 'rgba(0,0,0,0)';
    const to = config.to || getFill(layer, rule);

    const gradient = ctx.createLinearGradient(box.x, 0, box.x + width, 0);
    if (startRatio > 0) gradient.addColorStop(0, from);
    gradient.addColorStop(startRatio, from);
    gradient.addColorStop(endRatio, to);
    if (endRatio < 1) gradient.addColorStop(1, to);
    return gradient;
  }

  // 所有形狀繪製一律走這裡，不再直接呼叫 ctx.fill()。
  function fillIfNeeded(ctx, layer = {}, rule = {}, box = null) {
    if (!isFillEnabled(layer, rule)) return;
    const gradient = createFillGradient(ctx, layer, rule, box);
    if (gradient) ctx.fillStyle = gradient;
    ctx.fill();
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
    ctx.fillStyle = getFill(layer, rule);

    const stroke = getStroke(layer, rule);
    if (stroke && stroke.enabled) {
      ctx.strokeStyle = stroke.color || '#000000';
      ctx.lineWidth = stroke.width || 1;
    }

    return stroke;
  }

  function strokeIfNeeded(ctx, stroke) {
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

  // PSD 匯出的三種框是不同語意的：
  //   shape.geometry.bbox = 路徑中心線
  //   shape.pathBounds    = 含描邊的實際塗佈範圍（＝路徑中心線各方向外擴半個描邊寬）
  //   layer.x/y/w/h       = Photoshop 的圖層邊界
  // 實測（Game BN 白色線條 5px）：pathBounds 內縮 2.5px 剛好等於 geometry.bbox。
  //
  // Canvas 的 ctx.stroke() 本身是「居中在路徑上」，所以路徑必須放在**中心線**上。
  // resolveExportedBox() 優先採用 pathBounds（因為 geometry.bbox 常帶著沒正規化的
  // 文件層 transform，例如 Game BN 的 CTA_內圈 y=3528），但 pathBounds 是塗佈範圍，
  // 直接拿它當路徑會讓描邊整條往外偏半個描邊寬。因此有描邊時要把框內縮 描邊寬/2。
  //
  // 圓角不跟著調整：cornerRadius 定義在路徑上，內縮後維持原值才正確。
  function insetBoxForStroke(box, stroke) {
    const width = stroke && stroke.enabled !== false ? Number(stroke.width || 0) : 0;
    if (!Number.isFinite(width) || width <= 0) return box;
    const inset = width / 2;
    // 內縮後不可翻面：極細長的形狀就維持原框，寧可稍微偏外也不要畫成負寬高。
    if (!(box.width > inset * 2) || !(box.height > inset * 2)) return box;
    return {
      ...box,
      x: box.x + inset,
      y: box.y + inset,
      width: box.width - inset * 2,
      height: box.height - inset * 2,
    };
  }

  function withTransform(ctx, layer, rule, draw, stroke = null) {
    const box = insetBoxForStroke(getBox(layer, rule), stroke);
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

  function roundRectCornersPath(ctx, x, y, width, height, radii = 0) {
    const r = normalizeCornerRadii(radii, width, height);
    ctx.beginPath();
    ctx.moveTo(x + r.topLeft, y);
    ctx.lineTo(x + width - r.topRight, y);
    if (r.topRight) ctx.arcTo(x + width, y, x + width, y + r.topRight, r.topRight);
    else ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height - r.bottomRight);
    if (r.bottomRight) ctx.arcTo(x + width, y + height, x + width - r.bottomRight, y + height, r.bottomRight);
    else ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + r.bottomLeft, y + height);
    if (r.bottomLeft) ctx.arcTo(x, y + height, x, y + height - r.bottomLeft, r.bottomLeft);
    else ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + r.topLeft);
    if (r.topLeft) ctx.arcTo(x, y, x + r.topLeft, y, r.topLeft);
    else ctx.lineTo(x, y);
    ctx.closePath();
  }

  function roundRectPath(ctx, x, y, width, height, radius = 0) {
    roundRectCornersPath(ctx, x, y, width, height, radius);
  }

  function drawRectangle(ctx, layer, rule, stroke) {
    withTransform(ctx, layer, rule, (box) => {
      const { x, y, width, height } = box;
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      fillIfNeeded(ctx, layer, rule, box);
      strokeIfNeeded(ctx, stroke);
    }, stroke);
  }

  function drawRoundedRectangle(ctx, layer, rule, stroke) {
    withTransform(ctx, layer, rule, (box) => {
      const { x, y, width, height } = box;
      const radius = toNumber(rule.radius, toNumber(rule.cornerRadius, toNumber(layer.shape && layer.shape.cornerRadius, 0)));
      const cornerRadii = rule.cornerRadii || layer.cornerRadii || layer.shape?.cornerRadii || radius;
      roundRectCornersPath(ctx, x, y, width, height, cornerRadii);
      fillIfNeeded(ctx, layer, rule, box);
      strokeIfNeeded(ctx, stroke);
    }, stroke);
  }

  function drawEllipse(ctx, layer, rule, stroke) {
    withTransform(ctx, layer, rule, (box) => {
      const { x, y, width, height } = box;
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
      fillIfNeeded(ctx, layer, rule, box);
      strokeIfNeeded(ctx, stroke);
    }, stroke);
  }

  // 自訂多邊形頂點（移植自 18節Tool_跨夜直播宣傳圖 V0.9）。
  // normalized = true 時，points 的 x/y 是 0~1 的比例值，會換算成圖層框內的實際座標；
  // 這是規則檔指定「直角三角形」這種非正多邊形的唯一方式。
  // 沒有這段的話，points 會被忽略、一律畫成正多邊形
  //（例：OA_MSBN 的主標題_BG_三角形_左/右 會變成兩個朝上的正三角形 ▲）。
  function resolvePolygonPoints(points, box, normalized = false) {
    if (!Array.isArray(points) || points.length < 3) return [];
    return points.map((point) => {
      const rawX = toNumber(point?.x ?? point?.[0]);
      const rawY = toNumber(point?.y ?? point?.[1]);
      return normalized
        ? { x: box.x + rawX * box.width, y: box.y + rawY * box.height }
        : { x: box.x + rawX, y: box.y + rawY };
    });
  }

  function tracePolygonPoints(ctx, points) {
    if (!Array.isArray(points) || points.length < 3) return false;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    return true;
  }

  function drawPolygon(ctx, layer, rule, stroke) {
    const shape = layer.shape || {};
    const geometry = shape.geometry || {};
    const customPoints = rule.points || shape.points;
    const pointsNormalized = rule.pointsNormalized === true || shape.pointsNormalized === true;
    const sides = Math.max(3, Math.round(toNumber(
      rule.sides,
      toNumber(rule.polygonSides, toNumber(geometry.polygonSides, 3))
    )));

    withTransform(ctx, layer, rule, (box) => {
      const points = resolvePolygonPoints(customPoints, box, pointsNormalized);
      if (tracePolygonPoints(ctx, points)) {
        fillIfNeeded(ctx, layer, rule, box);
        strokeIfNeeded(ctx, stroke);
        return;
      }

      const { x, y, width, height } = box;
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
      fillIfNeeded(ctx, layer, rule, box);
      strokeIfNeeded(ctx, stroke);
    }, stroke);
  }

  function drawPathFallback(ctx, layer, rule, stroke) {
    const points = (layer.shape && (layer.shape.bezierPoints || layer.shape.vectorPath)) || [];
    const hasRealBezier = Array.isArray(points) && points.some((point) => point.leftDirection || point.rightDirection);

    if (!hasRealBezier) {
      drawRectangle(ctx, layer, { ...rule, bbox: (layer.shape && layer.shape.pathBounds) || rule.bbox }, stroke);
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
    fillIfNeeded(ctx, layer, rule, getBox(layer, rule));
    strokeIfNeeded(ctx, stroke);
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
      const cornerRadii = rule.cornerRadii || layer.cornerRadii || layer.shape?.cornerRadii || fallbackRadius;
      // roundRectCornersPath() begins a new path, so build the path inline here to keep the transform intact.
      const r = normalizeCornerRadii(cornerRadii, width, height, fallbackRadius);
      ctx.moveTo(x + r.topLeft, y);
      ctx.lineTo(x + width - r.topRight, y);
      if (r.topRight) ctx.arcTo(x + width, y, x + width, y + r.topRight, r.topRight); else ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height - r.bottomRight);
      if (r.bottomRight) ctx.arcTo(x + width, y + height, x + width - r.bottomRight, y + height, r.bottomRight); else ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + r.bottomLeft, y + height);
      if (r.bottomLeft) ctx.arcTo(x, y + height, x, y + height - r.bottomLeft, r.bottomLeft); else ctx.lineTo(x, y + height);
      ctx.lineTo(x, y + r.topLeft);
      if (r.topLeft) ctx.arcTo(x, y, x + r.topLeft, y, r.topLeft); else ctx.lineTo(x, y);
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
    triangle(ctx, layer, rule, stroke) {
      drawPolygon(ctx, layer, { ...rule, sides: 3, polygonSides: 3 }, stroke);
    },

    path: drawPathFallback,

    pill(ctx, layer, rule, stroke) {
      const box = getBox(layer, rule);
      drawRoundedRectangle(ctx, layer, { ...rule, radius: box.height / 2 }, stroke);
    },
  };

  function boxesOverlap(left, right) {
    if (!left || !right) return false;
    const leftX = toNumber(left.x);
    const leftY = toNumber(left.y);
    const leftWidth = toNumber(left.width);
    const leftHeight = toNumber(left.height);
    const rightX = toNumber(right.x);
    const rightY = toNumber(right.y);
    const rightWidth = toNumber(right.width);
    const rightHeight = toNumber(right.height);
    if (!(leftWidth > 0) || !(leftHeight > 0) || !(rightWidth > 0) || !(rightHeight > 0)) return false;

    return leftX < rightX + rightWidth
      && leftX + leftWidth > rightX
      && leftY < rightY + rightHeight
      && leftY + leftHeight > rightY;
  }

  // 決定要用 PSD 匯出的哪一個框（移植自 18節Tool_跨夜直播宣傳圖 V0.9）。
  //
  // pathBounds 在 PSD JSON 匯出器裡已經正規化到 artboard 座標，比 geometry.bbox 可靠。
  // 部分 Photoshop 的橢圓／形狀描述子會把「文件層級的 transform」留在 geometry.bbox 裡，
  // 導致框跑到畫布外幾千 px。實際踩到的案例：
  //   Game BN 的 CTA_BG / CTA_內圈  → geometry.bbox.y ≈ 3525（正確是 146）
  //   直播大廳_LPBN 的 主持人名稱_BG → geometry.bbox = (884,367)（正確是 418,308；畫布只到 y=360）
  // 因此：優先採用 pathBounds，並且**拒絕任何與目前圖層框完全不重疊的匯出框**，
  // 改回用乾淨的 layer.x/y/width/height。
  function resolveExportedBox(layer = {}, shape = {}, geometry = {}) {
    const layerBox = {
      x: toNumber(layer.x),
      y: toNumber(layer.y),
      width: toNumber(layer.width),
      height: toNumber(layer.height),
    };
    const candidate = shape.pathBounds || geometry.bbox || null;
    if (!candidate || !boxesOverlap(layerBox, candidate)) {
      return { bbox: null, useLayerBounds: true };
    }
    return { bbox: candidate, useLayerBounds: false };
  }

  function createRuleFromJsonLayer(layer = {}) {
    const shape = layer.shape || {};
    const geometry = shape.geometry || {};
    const kind = normalizeRendererName(shape.kind || geometry.kind || layer.type);
    const exportedBox = resolveExportedBox(layer, shape, geometry);

    // 「CTA_箭頭」這個圖層名稱，不管PSD匯出的向量路徑資料完不完整，
    // 統一畫成一個方向朝右的三角形（▶），這是CTA提示使用者往右看的箭頭圖示，不是任意形狀。
    if (String(layer.psdName || '').trim() === 'CTA_箭頭') {
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
      fillGradient: layer.fillGradient || null,
      stroke: shape.stroke || null,
      cornerRadius: shape.cornerRadius || 0,
      radius: shape.cornerRadius || 0,
      cornerRadii: layer.cornerRadii || shape.cornerRadii || null,
      points: layer.points || shape.points || null,
      pointsNormalized: layer.pointsNormalized === true || shape.pointsNormalized === true,
      polygonSides: geometry.polygonSides || shape.polygonSides,
      sides: geometry.polygonSides || shape.polygonSides,
      startAngleDeg: geometry.startAngleDeg ?? shape.startAngleDeg ?? layer.startAngleDeg,
      rotation: geometry.transform && geometry.transform.rotationDeg,
      // Dynamic layout-managed shapes (for example Headband 案型_BG) must use
      // the live layer box. Other PSD-origin shapes keep their exported bbox,
      // but only if resolveExportedBox() confirmed it overlaps the live layer box.
      useLayerBounds: layer.useDynamicBounds === true || exportedBox.useLayerBounds,
      bbox: layer.useDynamicBounds === true ? null : exportedBox.bbox,
      asset: layer.asset || layer.assetFilename || shape.asset || shape.assetFilename || null,
    };
  }

  function render(ctx, layer, rule) {
    if (!ctx || !layer || !rule) return false;

    const rendererName = normalizeRendererName(rule.renderer || rule.type || rule.shape);
    const renderer = renderers[rendererName];
    if (!renderer) return false;

    ctx.save();
    const stroke = applyPaint(ctx, layer, rule);
    renderer(ctx, layer, rule, stroke);
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
