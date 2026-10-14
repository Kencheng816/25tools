/* Product Engine V3.28
 * Keeps image sizing math outside app.core.js.
 * The engine is intentionally stateless so existing AppState remains in app.core.js.
 */
(function initProductEngine() {
  'use strict';

  const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const normalizeMode = (value) => String(value || '').replace(/[\s_-]+/g, '').toLowerCase();

  function getLayerCenter(layer) {
    const width = toNumber(layer?.width);
    const height = toNumber(layer?.height);
    return {
      x: Number.isFinite(Number(layer?.centerX)) ? Number(layer.centerX) : toNumber(layer?.x) + width / 2,
      y: Number.isFinite(Number(layer?.centerY)) ? Number(layer.centerY) : toNumber(layer?.y) + height / 2,
    };
  }

  function coverBox(layer, aspectRatio) {
    const targetWidth = Math.max(1, toNumber(layer.targetWidth || layer.width, 1));
    const targetHeight = Math.max(1, toNumber(layer.targetHeight || layer.height, 1));
    const boxRatio = targetHeight ? targetWidth / targetHeight : aspectRatio;
    if (aspectRatio >= boxRatio) {
      const height = targetHeight;
      return { width: height * aspectRatio, height };
    }
    const width = targetWidth;
    return { width, height: aspectRatio ? width / aspectRatio : targetHeight };
  }

  function containByWidthThenHeight(layer, aspectRatio) {
    const targetWidth = toNumber(layer.targetWidth || layer.width);
    const maxHeight = toNumber(layer.maxTargetHeight || layer.targetHeight || layer.height);
    const widthBasedHeight = aspectRatio ? targetWidth / aspectRatio : toNumber(layer.height);

    if (maxHeight > 0 && widthBasedHeight > maxHeight) {
      const height = maxHeight;
      return { width: height * aspectRatio, height };
    }

    return { width: targetWidth, height: widthBasedHeight };
  }

  function containByHeightThenWidth(layer, aspectRatio) {
    const targetHeight = toNumber(layer.targetHeight || layer.height);
    const maxWidth = toNumber(layer.maxTargetWidth || layer.targetWidth || layer.width);
    const heightBasedWidth = targetHeight * aspectRatio;

    if (maxWidth > 0 && heightBasedWidth > maxWidth) {
      const width = maxWidth;
      return { width, height: aspectRatio ? width / aspectRatio : targetHeight };
    }

    return { width: heightBasedWidth, height: targetHeight };
  }

  function getRenderedImageBox(layer, image) {
    const center = getLayerCenter(layer || {});
    let width = toNumber(layer?.width || layer?.targetWidth);
    let height = toNumber(layer?.height);

    if (layer?.keepAspectRatio && image?.naturalWidth) {
      const naturalWidth = toNumber(image.naturalWidth, 1);
      const naturalHeight = toNumber(image.naturalHeight, 1);
      const aspectRatio = naturalHeight ? naturalWidth / naturalHeight : 1;
      const mode = normalizeMode(layer.sizingMode);
      const legacyHeightPriority = (window.ProfileLoader?.getFlag?.('render.productSizingHeightPriority', 'explicit') || 'explicit') === 'legacy';

      if (mode === 'coverbypbox' || mode === 'cover') {
        // （OM_w2 / LineOA）上傳槽 Cover：填滿 P 框、超出部分由遮罩裁切。
        ({ width, height } = coverBox(layer, aspectRatio));
      } else if (mode === 'containbypbox' || mode === 'widthcontain') {
        ({ width, height } = containByWidthThenHeight(layer, aspectRatio));
      } else if (mode === 'heightcontain') {
        ({ width, height } = containByHeightThenWidth(layer, aspectRatio));
      } else if (mode === 'heightbased' || (legacyHeightPriority && layer.targetHeight)) {
        // Explicit sizingMode owns the sizing axis. A stale targetHeight must never
        // override an explicitly width-based layer after Canvas resize / Preset apply.
        // 整合版：render.productSizingHeightPriority＝legacy（B 系）時，只要 layer 有 targetHeight 就高優先（外廣 wave1 原行為）。
        height = toNumber(layer.targetHeight || layer.height);
        width = height * aspectRatio;
      } else if (mode === 'widthbased') {
        width = toNumber(layer.targetWidth || layer.width);
        height = aspectRatio ? width / aspectRatio : toNumber(layer.height);
      } else if (layer.targetHeight && !layer.targetWidth) {
        // Legacy fallback only when no explicit sizing mode/width target exists.
        height = toNumber(layer.targetHeight || layer.height);
        width = height * aspectRatio;
      } else {
        width = toNumber(layer.targetWidth || layer.width);
        height = aspectRatio ? width / aspectRatio : toNumber(layer.height);
      }
    }

    return {
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      centerX: center.x,
      centerY: center.y,
    };
  }

  window.ProductEngine = Object.freeze({
    getRenderedImageBox,
  });
})();
