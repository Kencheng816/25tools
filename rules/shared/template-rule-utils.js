/* Template Rule Utils – small shared helpers for new modular rules. */
(function () {
  'use strict';

  const toText = (value) => String(value ?? '').replace(/_x000d_/gi, '\n').trim();
  const normalize = (value) => toText(value)
    .toLowerCase()
    .replace(/logo/gi, 'logo')
    .replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.]+/g, '')
    .replace(/[＿－—–]/g, '');

  function findLayer(template, predicate) {
    return Object.values(template?.layers || {}).find(predicate) || null;
  }

  function findLayerByWords(template, { type = '', words = [] } = {}) {
    const wanted = words.map(normalize).filter(Boolean);
    return findLayer(template, (layer) => {
      if (type && layer?.type !== type) return false;
      const label = normalize(`${layer?.psdName || ''} ${layer?.role || ''} ${layer?.assetFilename || ''}`);
      return wanted.some((word) => label.includes(word));
    });
  }

  function setImageAsset(template, words, assetFilename) {
    const layer = findLayerByWords(template, { type: 'image', words });
    if (!layer) return false;
    layer.assetFilename = assetFilename;
    layer.hidden = false;
    layer.keepAspectRatio = true;
    return true;
  }

  function makeSolidRectFromLayer(layer, fill) {
    if (!layer) return null;
    const x = Number(layer.x || 0);
    const y = Number(layer.y || 0);
    const width = Number(layer.width || 0);
    const height = Number(layer.height || 0);
    return {
      ...layer,
      type: 'shape',
      psdName: layer.psdName || 'KV_BG',
      x,
      y,
      width,
      height,
      centerX: Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : x + width / 2,
      centerY: Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) : y + height / 2,
      fill,
      shape: {
        kind: 'rectangle',
        fill,
        stroke: { enabled: false, width: 0, color: fill },
        pathBounds: {
          x,
          y,
          width,
          height,
          centerX: Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : x + width / 2,
          centerY: Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) : y + height / 2,
        },
      },
    };
  }

  // ── 專案配色對照表 ──
  // 這裡刻意留空，作為開源起點。新專案若需要「依目前專案套用不同主標/副標顏色」，
  // 在這裡依樣式補上 { [normalize('專案名稱')]: { title: '#xxxxxx', subtitle: '#xxxxxx' } }，
  // 「目前專案」直接讀 window.AppState.currentProject（引擎既有的全域狀態，不需要改引擎）。
  const PROJECT_TEXT_COLORS = {
    // 範例（依需要取消註解並改成實際專案名稱/色碼）：
    // [normalize('4.17 直播日')]: { title: '#feff91', subtitle: '#fff600' },
  };

  function getCurrentProjectName(template) {
    // 批次 / All 模式下，每張圖會把自己的專案寫在 template.batchProject。
    // 重新預覽、下載 ZIP、價格重建時，AppState.currentProject 可能已經回到「All」，
    // 所以顏色判斷必須優先讀 template.batchProject，不能只看全域 currentProject。
    return String(
      template?.batchProject
      || template?.batchRecord?.__project
      || window.AppState?.currentProject
      || ''
    ).trim();
  }

  // 依「該張圖所屬專案」把主標題／副標題文字顏色套到該公版的主標/副標圖層。
  // 找不到對應專案的配色，或該公版沒有主標/副標圖層時，安全地不做任何事（不會報錯）。
  function applyColorToTextLayer(layer, color) {
    if (!layer || !color) return false;
    layer.color = color;

    // PSD 匯出的文字常會帶 textStyleRanges；Renderer 繪製時會優先使用 range.color。
    // 因此只改 layer.color 不足以覆蓋畫面，需要同步更新每一段樣式。
    if (Array.isArray(layer.textStyleRanges)) {
      layer.textStyleRanges.forEach((range) => {
        if (!range || typeof range !== 'object') return;
        range.color = color;
        range.fill = color;
        if (range.style && typeof range.style === 'object') {
          range.style.color = color;
          range.style.fill = color;
        }
      });
    }
    return true;
  }

  function applyProjectTextColors(template) {
    const projectKey = normalize(getCurrentProjectName(template));
    const colors = PROJECT_TEXT_COLORS[projectKey];
    if (!colors) return false;
    const titleLayer = findLayerByWords(template, { type: 'text', words: ['主標', '主標題', 'title'] });
    const subtitleLayer = findLayerByWords(template, { type: 'text', words: ['副標', '副標題', 'subtitle'] });
    const titleApplied = applyColorToTextLayer(titleLayer, colors.title);
    const subtitleApplied = applyColorToTextLayer(subtitleLayer, colors.subtitle);
    return Boolean(titleApplied || subtitleApplied);
  }

  // ── 去背圖片的「可見內容」自動貼合 ──
  // 適用情境：去背PNG四周常常留有大片透明邊界（例如去背時上方多留了頭頂空間），
  // 直接把整張圖塞進固定框會忽略這些留白，導致人像大小/位置忽大忽小、對不齊。
  // 這裡改成先算出「實際看得到的內容」在圖片裡的範圍，再依那個範圍去對齊/縮放，
  // 而不是直接用整張圖片的原始尺寸。

  // 計算圖片可見（非透明）像素的外框，回傳自然像素座標下的 {x,y,width,height}；
  // 讀不到像素資料（例如圖片跨網域沒開CORS）時回傳 null，呼叫端應該安全地略過、不強制套用。
  function computeAlphaBBox(image) {
    if (!image || !image.naturalWidth || !image.naturalHeight) return null;
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const cctx = canvas.getContext('2d');
    cctx.drawImage(image, 0, 0, w, h);
    let data;
    try {
      data = cctx.getImageData(0, 0, w, h).data;
    } catch (_err) {
      return null;
    }
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    // 大圖時用取樣降低運算量，對「找可見範圍的外框」這種用途，取樣密度足夠、不影響精準度。
    const step = Math.max(1, Math.floor(Math.max(w, h) / 900));
    for (let y = 0; y < h; y += step) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x += step) {
        const alpha = data[rowOffset + x * 4 + 3];
        if (alpha > 10) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return null;
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  // 把去背圖片的「可見內容」等比例縮放，使其高度符合 targetHeight，
  // 再整張圖平移，讓可見內容的頂端對齊 topY、水平中心對齊 centerX（旋轉重設為0）。
  // 是整張原圖等比例縮放＋平移（不裁切），所以周圍的透明留白會跟著等比例縮放/移動，
  // 這樣畫面效果等同「原本設計那種讓圖片邊緣自然被畫布邊界裁掉」的做法。
  // 回傳 true 表示套用成功；圖片還沒真正載入好、或算不出可見範圍時回傳 false，呼叫端應保留原本的圖層數值不動。
  function fitImageByAlphaHeight({ layer, image, targetHeight, topY, centerX }) {
    if (!layer || !image || !image.naturalWidth) return false;
    const bbox = computeAlphaBBox(image);
    if (!bbox || !bbox.height) return false;

    const scale = Number(targetHeight) / bbox.height;
    if (!Number.isFinite(scale) || scale <= 0) return false;

    const scaledFullWidth = image.naturalWidth * scale;
    const scaledFullHeight = image.naturalHeight * scale;
    const scaledBBoxTop = bbox.y * scale;
    const scaledBBoxLeft = bbox.x * scale;
    const scaledBBoxWidth = bbox.width * scale;

    const layerY = Number(topY) - scaledBBoxTop;
    const bboxCenterXScaled = scaledBBoxLeft + scaledBBoxWidth / 2;
    const layerX = Number(centerX) - bboxCenterXScaled;

    layer.width = scaledFullWidth;
    layer.height = scaledFullHeight;
    layer.x = layerX;
    layer.y = layerY;
    layer.centerX = layerX + scaledFullWidth / 2;
    layer.centerY = layerY + scaledFullHeight / 2;
    layer.rotation = 0;
    layer.keepAspectRatio = false; // 已經手動算好精確寬高，不需要再讓 ProductEngine 用 sizingMode 二次調整
    return true;
  }

  // 跟 fitImageByAlphaHeight 邏輯完全一樣，只是拿「寬度」當縮放基準（依實測比對，用寬度對齊
  // 半身照範圍圖的重疊率明顯比用高度對齊高很多，所以半身照貼合改用這個）。
  function fitImageByAlphaWidth({ layer, image, targetWidth, topY, centerX }) {
    if (!layer || !image || !image.naturalWidth) return false;
    const bbox = computeAlphaBBox(image);
    if (!bbox || !bbox.width) return false;

    const scale = Number(targetWidth) / bbox.width;
    if (!Number.isFinite(scale) || scale <= 0) return false;

    const scaledFullWidth = image.naturalWidth * scale;
    const scaledFullHeight = image.naturalHeight * scale;
    const scaledBBoxTop = bbox.y * scale;
    const scaledBBoxLeft = bbox.x * scale;
    const scaledBBoxWidth = bbox.width * scale;

    const layerY = Number(topY) - scaledBBoxTop;
    const bboxCenterXScaled = scaledBBoxLeft + scaledBBoxWidth / 2;
    const layerX = Number(centerX) - bboxCenterXScaled;

    layer.width = scaledFullWidth;
    layer.height = scaledFullHeight;
    layer.x = layerX;
    layer.y = layerY;
    layer.centerX = layerX + scaledFullWidth / 2;
    layer.centerY = layerY + scaledFullHeight / 2;
    layer.rotation = 0;
    layer.keepAspectRatio = false;
    return true;
  }

  // ── 半身照貼合品質檢查（像素重疊度）──
  // 把「範圍圖的灰色輪廓」跟「實際貼合後的照片可見範圍」都畫到同一張 720x720 遮罩上，
  // 用 IoU（交集÷聯集）算重疊度。IoU 用聯集當分母，人物放太大超出範圍圖外也會被扣分，
  // 比單純「交集÷範圍圖面積」更準確（那個算法只看範圍圖被蓋住多少，人物放大反而分數更高）。

  // 範圍圖背景是透明的。原本用「非白色」判斷輪廓，但真實瀏覽器 Canvas 讀取透明像素時，
  // 顏色資料一律會是 (0,0,0,0)（黑色），跟 PNG 檔案裡實際存的顏色無關——用「非白色」去判斷，
  // 會把整片透明背景誤判成「輪廓」。改用「透明度」判斷才是正確、跟瀏覽器實際行為一致的做法
  // （也跟下面判斷照片可見範圍的方式一致，兩邊用同一種標準才能公平比較）。
  function renderNonWhiteMask(image, canvasSize) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const cctx = canvas.getContext('2d');
    cctx.drawImage(image, 0, 0, canvasSize, canvasSize);
    let data;
    try {
      data = cctx.getImageData(0, 0, canvasSize, canvasSize).data;
    } catch (_err) {
      return null;
    }
    const mask = new Uint8Array(canvasSize * canvasSize);
    for (let i = 0; i < mask.length; i += 1) {
      mask[i] = data[i * 4 + 3] > 10 ? 1 : 0;
    }
    return mask;
  }

  // 依圖層目前實際的 x/y/width/height，把去背照片畫到跟範圍圖同一張畫布上，取非透明像素當遮罩。
  function renderLayerAlphaMask(image, layer, canvasSize) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const cctx = canvas.getContext('2d');
    cctx.drawImage(image, Number(layer.x || 0), Number(layer.y || 0), Number(layer.width || 0), Number(layer.height || 0));
    let data;
    try {
      data = cctx.getImageData(0, 0, canvasSize, canvasSize).data;
    } catch (_err) {
      return null;
    }
    const mask = new Uint8Array(canvasSize * canvasSize);
    for (let i = 0; i < mask.length; i += 1) {
      mask[i] = data[i * 4 + 3] > 10 ? 1 : 0;
    }
    return mask;
  }

  function computeMaskIoU(maskA, maskB) {
    if (!maskA || !maskB || maskA.length !== maskB.length) return 0;
    let intersection = 0;
    let union = 0;
    for (let i = 0; i < maskA.length; i += 1) {
      const a = maskA[i];
      const b = maskB[i];
      if (a && b) intersection += 1;
      if (a || b) union += 1;
    }
    return union ? intersection / union : 0;
  }

  // 回傳 0~1 之間的IoU重疊度；guideImage 或 photoImage 讀不到像素資料（例如尚未載入）時回傳 null，
  // 呼叫端應該視為「還不能判斷」，不要誤判成「不合格」。
  function computeFitIoU({ layer, image, guideImage, canvasSize = 720 }) {
    if (!layer || !image || !guideImage) return null;
    const guideMask = renderNonWhiteMask(guideImage, canvasSize);
    const photoMask = renderLayerAlphaMask(image, layer, canvasSize);
    if (!guideMask || !photoMask) return null;
    return computeMaskIoU(guideMask, photoMask);
  }

  // ── LOGO 素材判斷 ──
  // 若新專案的工單「LOGO：xxx」欄位是文字說明（不是檔名），需要依內容文字判斷要套用哪個
  // 共用LOGO素材，可仿照下面範例寫一個 resolveLogoAssetFilename()，回傳對應的 assetFilename，
  // 再用 setImageAsset(template, ['logo'], assetFilename) 套用到LOGO圖層即可：
  //
  // function resolveLogoAssetFilename(logoText) {
  //   const text = toText(logoText);
  //   if (text.includes('某個關鍵字')) return '某個LOGO.svg';
  //   return '';
  // }

  window.TemplateRuleUtils = Object.freeze({
    toText,
    normalize,
    findLayer,
    findLayerByWords,
    setImageAsset,
    makeSolidRectFromLayer,
    getCurrentProjectName,
    applyColorToTextLayer,
    applyProjectTextColors,
    computeAlphaBBox,
    fitImageByAlphaHeight,
    fitImageByAlphaWidth,
    computeFitIoU,
  });
})();
