/* Network / Affiliate 規則引擎（25節）
 *
 * 職責：工單解析 → 公版路由 → 素材規格指派 → 圖層顯隱 → 導角 → 診斷 → 匯出中繼資料。
 * 公版 JSON 是唯一的版面來源；本檔不改寫任何圖層的 JSON 座標，只補「JSON 沒有的東西」
 * （動態店家 LOGO 的 P / P_02 圖層）與「工單決定的內容」（回饋 %、顯隱、輸出檔名）。
 *
 * 對外掛在 window.AssetSpecEngine，由 core/app.core.js 的通用 spec 流程呼叫：
 *   findHeader(rows)                    → 判斷這個分頁能不能用本引擎解析
 *   build({ rows, sourceTemplates, clone, sheetName })  → 產生批次項目
 *   prepareTemplate(template)           → 手動載入公版資料夾時補初始化
 *   diagnosticText(diagnostics, ms)     → 匯出 ZIP 內的診斷報告
 */
(function initNetworkAffiliateEngine() {
  'use strict';

  const REQUIRED_HEADERS = ['曝光媒體', '尺寸', '檔案命名', '店家', 'LOGO'];
  const IMAGE_EXTENSIONS = ['svg', 'png', 'webp', 'jpg', 'jpeg'];

  // 動態店家 LOGO 的圖層名稱：品牌版與 BigGo 版各自獨立，
  // 讓兩者在 MultiSizeAssetSync 內成為兩個互不連動的群組。
  const BRAND_LOGO_LAYER = 'P';
  const BIGGO_LOGO_LAYER = 'P_02';
  const GUIDE_LAYER = 'P_範圍';

  // 安全區內縮：P_範圍 內若疊著這些 UI 圖層，動態 LOGO 的初始框要避開它們。
  // DECO 刻意不列入，讓蝦幣/票券維持與 LOGO 邊角重疊的裝飾效果。
  const SAFE_AREA_BLOCKERS = ['上方BAR_BG', 'CTA_BG'];
  // 座標捨入造成的 1px 級重疊不算侵入，避免安全區莫名少一個 pixel。
  const SAFE_AREA_TOLERANCE = 2;

  // 共用裝飾素材：公版 JSON 匯出時帶著尺寸前綴的檔名，實檔在 assets/共用素材/ 是無前綴的。
  const SHARED_ASSET_LAYERS = ['DECO_蝦幣', 'DECO_票券'];
  const SHARED_ASSET_FOLDER = '共用素材';

  const BRAND_ASSET_FOLDER = 'affiliate';
  const NOBRAND_ASSET_FOLDER = 'affiliate_無品牌';
  const LOGO_ASSET_FOLDER = 'LOGO';

  const clean = (value) => String(value ?? '').replace(/\u3000/g, ' ').trim();
  const decodeUnicodeEscapes = (value) => clean(value)
    .replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const normalize = (value) => decodeUnicodeEscapes(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[\s\u00a0\u3000_\-()（）\[\]【】.]+/g, '');
  const normalizeLayerName = (value) => decodeUnicodeEscapes(value)
    .replace(/\u3000/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const stripExtension = (value) => clean(value).replace(/\.(png|jpe?g|webp|gif|svg)$/i, '');
  const safeName = (value) => stripExtension(decodeUnicodeEscapes(value))
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
  const normalizeSize = (value) => {
    const match = clean(value).match(/(\d+)\s*[xX×＊*]\s*(\d+)/);
    return match ? `${Number(match[1])}x${Number(match[2])}` : '';
  };
  const getExtension = (value) => (clean(value).match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  const extensionRank = (value) => {
    const rank = IMAGE_EXTENSIONS.indexOf(getExtension(value));
    return rank < 0 ? IMAGE_EXTENSIONS.length : rank;
  };
  const filenameStem = (value) => stripExtension(clean(value).split(/[\\/]/).pop() || '');
  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

  function basenameFromUrl(value) {
    const raw = clean(value);
    if (!/^https?:\/\//i.test(raw)) return '';
    try {
      const url = new URL(raw);
      return decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    } catch (_) {
      try { return decodeURIComponent(raw.split(/[?#]/)[0].split('/').pop() || ''); }
      catch (_) { return raw.split(/[?#]/)[0].split('/').pop() || ''; }
    }
  }

  function parseCombination(value) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
    const text = clean(value);
    if (/^[1-9]\d*$/.test(text)) return Number(text);
    return null;
  }

  // 10 → "10%"、10.0 → "10%"、12.50 → "12.5%"：一律去掉小數尾端的 0。
  function formatPercentNumber(value) {
    if (!Number.isFinite(value) || value < 0) return '';
    const rounded = Math.round(value * 10000) / 10000;
    return `${String(rounded).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}%`;
  }

  // 工單的回饋欄可能寫 0.1（小數）或 10%（百分比字串）或 10（純數字）。
  // 0～1 之間視為小數乘 100；其餘視為已經是百分比數值。依此 1 → 100%。
  function percentText(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return formatPercentNumber(value >= 0 && value <= 1 ? value * 100 : value);
    }
    const text = clean(value).replace(/,/g, '');
    if (!text) return '';
    const percentMatch = text.match(/^([+-]?\d+(?:\.\d+)?)\s*%$/);
    if (percentMatch) return formatPercentNumber(Number(percentMatch[1]));
    if (/^[+-]?\d+(?:\.\d+)?$/.test(text)) {
      const number = Number(text);
      return formatPercentNumber(number >= 0 && number <= 1 ? number * 100 : number);
    }
    return '';
  }

  function findHeader(rows) {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const map = {};
      (rows[rowIndex] || []).forEach((value, columnIndex) => {
        const header = REQUIRED_HEADERS.find((name) => normalize(value) === normalize(name));
        if (header) map[header] = columnIndex;
      });
      if (REQUIRED_HEADERS.every((name) => map[name] !== undefined)) return { row: rowIndex, map };
    }
    return null;
  }

  function findColumn(headerRow, aliases) {
    for (const alias of aliases) {
      const index = (headerRow || []).findIndex((value) => normalize(value) === normalize(alias));
      if (index >= 0) return index;
    }
    return -1;
  }

  function parse(rows) {
    const header = findHeader(rows);
    if (!header) return null;

    const headerRow = rows[header.row] || [];
    const columns = {
      media: header.map['曝光媒體'],
      size: header.map['尺寸'],
      filename: header.map['檔案命名'],
      shop: header.map['店家'],
      logo: header.map.LOGO,
      combination: findColumn(headerRow, ['組合', 'Combination']),
    };
    const records = [];
    const warnings = [];
    const errors = [];

    for (let rowIndex = header.row + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      if (!row.some((value) => clean(value))) continue;
      if (normalize(row[columns.media]) !== normalize('Affiliate')) continue;

      const filename = clean(row[columns.filename]);
      const size = normalizeSize(row[columns.size]);
      const filenameSize = normalizeSize(filename);
      if (!size) {
        errors.push(`第 ${rowIndex + 1} 列尺寸格式無效`);
        continue;
      }
      if (filenameSize && filenameSize !== size) {
        warnings.push(`第 ${rowIndex + 1} 列尺寸欄 ${size} 與檔名尺寸 ${filenameSize} 不一致；使用尺寸欄選擇公版`);
      }

      const lowerFilename = filename.toLowerCase();
      const rowKind = lowerFilename.startsWith('affiliate_ia_')
        ? 'ia'
        : lowerFilename.startsWith('biggo_') ? 'biggo' : 'general';

      records.push({
        __sourceRow: rowIndex + 1,
        __rowKind: rowKind,
        media: 'Affiliate',
        size,
        filename,
        shop: clean(row[columns.shop]),
        logo: row[columns.logo],
        combination: columns.combination >= 0 ? parseCombination(row[columns.combination]) : null,
      });
    }

    return { header, columns, records, warnings, errors };
  }

  // ── 公版與圖層查詢 ──────────────────────────────────────────

  function templateById(sourceTemplates, templateId) {
    const wanted = normalize(templateId);
    return (sourceTemplates || []).find((template) => {
      const candidates = [
        template?.data?.templateId,
        template?.data?.canvas?.templateId,
        template?.name,
        template?.file,
      ];
      return candidates.some((candidate) => normalize(String(candidate || '').replace(/\.json$/i, '')) === wanted);
    }) || null;
  }

  function layerEntries(template) {
    return Object.entries(template?.layers || {});
  }

  function canonicalLayerName(key, layer) {
    return clean(layer?.psdName || layer?.name || key);
  }

  function findLayerEntry(template, requestedName) {
    const wanted = normalizeLayerName(requestedName);
    const entries = layerEntries(template);
    return entries.find(([, layer]) => normalizeLayerName(layer?.psdName) === wanted)
      || entries.find(([key]) => normalizeLayerName(key) === wanted)
      || null;
  }

  function setVisible(template, requestedName, visible) {
    const entry = findLayerEntry(template, requestedName);
    if (!entry) return false;
    const layer = entry[1];
    layer.hidden = !visible;
    layer.visible = Boolean(visible);
    return true;
  }

  function layerBox(layer) {
    const width = Math.max(0, num(layer?.width));
    const height = Math.max(0, num(layer?.height));
    const x = Number.isFinite(Number(layer?.x)) ? Number(layer.x) : num(layer?.centerX) - width / 2;
    const y = Number.isFinite(Number(layer?.y)) ? Number(layer.y) : num(layer?.centerY) - height / 2;
    return { x, y, width, height, right: x + width, bottom: y + height };
  }

  // ── 動態 LOGO 安全區（C2）───────────────────────────────────
  // 從 P_範圍 出發，扣掉 SAFE_AREA_BLOCKERS 實際壓在框內的上緣／下緣，得到 LOGO 可用的初始框。
  // 只處理「橫跨整個框寬、貼著上緣或下緣」的侵入，中間穿過的圖層不會把框切成兩半。
  function resolveSafeArea(template, guideName = GUIDE_LAYER) {
    const guideEntry = findLayerEntry(template, guideName);
    if (!guideEntry) return null;
    const guide = layerBox(guideEntry[1]);
    if (!(guide.width > 0) || !(guide.height > 0)) return null;

    let top = guide.y;
    let bottom = guide.bottom;

    SAFE_AREA_BLOCKERS.forEach((blockerName) => {
      const entry = findLayerEntry(template, blockerName);
      if (!entry) return;
      const blocker = layerBox(entry[1]);
      if (blocker.right <= guide.x || blocker.x >= guide.right) return;
      const intrudesTop = blocker.bottom - top;
      const intrudesBottom = bottom - blocker.y;
      if (blocker.y <= top && intrudesTop > SAFE_AREA_TOLERANCE && blocker.bottom < bottom) {
        top = blocker.bottom;
      } else if (blocker.bottom >= bottom && intrudesBottom > SAFE_AREA_TOLERANCE && blocker.y > top) {
        bottom = blocker.y;
      }
    });

    const height = bottom - top;
    if (!(height > 0)) return { x: guide.x, y: guide.y, width: guide.width, height: guide.height };
    return { x: guide.x, y: top, width: guide.width, height };
  }

  // 建立動態店家 LOGO 圖層。公版 JSON 沒有這個圖層，完全由規則檔生成，
  // 位置＝安全區、遮罩＝P_範圍，維持等比 contain。
  function createDynamicLogoLayer(template, layerName, guideName, spec) {
    const area = resolveSafeArea(template, guideName);
    if (!area) return false;
    if (template.layers[layerName]) delete template.layers[layerName];

    template.layers[layerName] = {
      type: 'image',
      psdName: layerName,
      role: 'product',
      x: Math.round(area.x * 100) / 100,
      y: Math.round(area.y * 100) / 100,
      width: Math.round(area.width * 100) / 100,
      height: Math.round(area.height * 100) / 100,
      centerX: Math.round((area.x + area.width / 2) * 100) / 100,
      centerY: Math.round((area.y + area.height / 2) * 100) / 100,
      rotation: 0,
      hidden: false,
      visible: true,
      keepAspectRatio: true,
      fitMode: 'contain',
      sizingMode: 'containByPBox',
      targetWidth: Math.round(area.width * 100) / 100,
      targetHeight: Math.round(area.height * 100) / 100,
      maxTargetHeight: Math.round(area.height * 100) / 100,
      maskLayerName: guideName,
      assetFilename: '',
      assetCandidates: [],
      assetProject: spec.preferredFolder || '',
      __maskLayerName: guideName,
      __canonicalName: layerName,
      __assetSpec: { ...spec },
      __assetMissing: !spec.stem,
    };

    // renderOrder 是由下往上的繪製順序：把 LOGO 插在 P_範圍 正上方，
    // 讓 DECO / 上方BAR / CTA / USP / 活動 LOGO 都疊在店家 LOGO 之上。
    if (Array.isArray(template.renderOrder)) {
      template.renderOrder = template.renderOrder.filter((entryKey) => entryKey !== layerName);
      const guideKey = findLayerEntry(template, guideName)?.[0];
      const guideIndex = guideKey ? template.renderOrder.indexOf(guideKey) : -1;
      if (guideIndex >= 0) template.renderOrder.splice(guideIndex + 1, 0, layerName);
      else template.renderOrder.push(layerName);
    }
    return true;
  }

  function markGuides(template) {
    layerEntries(template).forEach(([key, layer]) => {
      const name = canonicalLayerName(key, layer);
      if (!/^P_範圍(?:_\d+)?$/i.test(name)) return;
      layer.locked = true;
      layer.__nonInteractive = true;
      layer.__placementGuide = true;
      layer.guideColor = '#0066FF';
      layer.guideOpacity = 0.5;
      layer.guideDash = 2;
    });
  }

  // ── 導角 ────────────────────────────────────────────────────

  function shapeCornerRadius(layer) {
    return Math.max(0, num(layer?.shape?.cornerRadius ?? layer?.cornerRadius ?? layer?.radius, 0));
  }

  // PSD 匯出的形狀常常帶著自己的旋轉（Photoshop 上下翻轉畫矩形時會存成 rotationDeg: 180）。
  // renderers/shape-renderer.js 的 getRotation() 會優先採用 shape.geometry.transform.rotationDeg，
  // 再退回 layer.rotation，畫之前先 ctx.rotate()。所以 cornerRadii 是寫在「圖層自己的座標系」，
  // 不是畫面上看到的方向——旋轉 180 度的形狀，寫 bottom 會畫在畫面的上緣。
  function effectiveShapeRotation(layer) {
    const geometryRotation = Number(layer?.shape?.geometry?.transform?.rotationDeg);
    if (Number.isFinite(geometryRotation)) return geometryRotation;
    const explicit = Number(layer?.rotation);
    return Number.isFinite(explicit) ? explicit : 0;
  }

  // 把「畫面上想要的四角」換算成「圖層座標系的四角」，抵銷形狀自己的旋轉。
  // 旋轉 180 度時，畫面左上 ← 圖層右下、畫面右上 ← 圖層左下，依此對調。
  function visualCornersToLayerSpace(visual, rotationDeg) {
    const normalized = (((Number(rotationDeg) || 0) % 360) + 360) % 360;
    if (Math.abs(normalized - 180) > 1) return { ...visual };
    return {
      topLeft: visual.bottomRight,
      topRight: visual.bottomLeft,
      bottomRight: visual.topLeft,
      bottomLeft: visual.topRight,
    };
  }

  // pattern 描述的一律是「畫面上」的上下緣，不需要各公版自己去想有沒有被旋轉。
  function setDirectionalCorners(template, requestedName, pattern) {
    const entry = findLayerEntry(template, requestedName);
    if (!entry || entry[1]?.type !== 'shape') return false;
    const layer = entry[1];
    const radius = shapeCornerRadius(layer);
    const visual = {
      topLeft: pattern.top ? radius : 0,
      topRight: pattern.top ? radius : 0,
      bottomRight: pattern.bottom ? radius : 0,
      bottomLeft: pattern.bottom ? radius : 0,
    };
    layer.cornerRadii = visualCornersToLayerSpace(visual, effectiveShapeRotation(layer));
    return true;
  }

  function directionalCornerExcluded(sourceTemplateId) {
    const size = normalizeSize(sourceTemplateId);
    return size === '728x90' || size === '468x60' || size === '1500x200';
  }

  function applyDirectionalCornerRules(template, sourceTemplateId, kind) {
    if (kind === 'biggo') setDirectionalCorners(template, '上方BAR_BG', { top: false, bottom: true });
    if (directionalCornerExcluded(sourceTemplateId)) return;
    // 白色色塊的導角：一般公版只導上面兩角（底邊貼齊 CTA_BG，要維持直角接合）。
    // Affiliate IA 是特殊規則——白色色塊_01~05 是五個並排的獨立卡片，
    // 上下都不貼齊其他色塊，所以四邊都要導角。
    const whiteBlockPattern = kind === 'ia'
      ? { top: true, bottom: true }
      : { top: true, bottom: false };
    layerEntries(template).forEach(([key, layer]) => {
      const name = canonicalLayerName(key, layer);
      if (/^白色色塊(?:_\d+)?$/i.test(name)) setDirectionalCorners(template, name, whiteBlockPattern);
    });
    // CTA_BG 的導角：一般公版只導下面兩角（它貼齊白色色塊的底邊，上緣要維持直角接合）。
    // Affiliate IA 同樣是獨立的按鈕、四邊都不貼齊其他色塊，所以四邊都要導角。
    setDirectionalCorners(template, 'CTA_BG', kind === 'ia'
      ? { top: true, bottom: true }
      : { top: false, bottom: true });
  }

  // ── 上方BAR 彈性寬度 ────────────────────────────────────────

  function textLayerWidth(layer) {
    const text = String(layer?.text || '');
    if (!text) return 0;
    const canvas = typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(1, 1)
      : (typeof document !== 'undefined' ? document.createElement('canvas') : null);
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return num(layer?.width);
    const sourceRanges = Array.isArray(layer.textStyleRanges) && layer.textStyleRanges.length
      ? [...layer.textStyleRanges].sort((a, b) => num(a.from) - num(b.from))
      : [{ from: 0, to: text.length }];
    const measureSegment = (segment, style = {}) => {
      if (!segment) return 0;
      const fontSize = num(style.fontSizePx || layer.fontSizePx, 24);
      const fontWeight = style.fontWeight || layer.fontWeight || 400;
      const rawFontStyle = String(style.fontStyle || style.fontStyleName || layer.fontStyle || '').toLowerCase();
      const fontStyle = rawFontStyle.includes('italic') ? 'italic' : rawFontStyle.includes('oblique') ? 'oblique' : 'normal';
      const fontFamily = style.fontFamily || layer.fontFamily || 'sans-serif';
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${String(fontFamily).replace(/"/g, '')}"`;
      const spacing = num(style.letterSpacing ?? layer.letterSpacing, 0);
      return ctx.measureText(segment).width + Math.max(0, segment.length - 1) * spacing;
    };
    let width = 0;
    let cursor = 0;
    let previousStyle = sourceRanges[0] || {};
    sourceRanges.forEach((range) => {
      const from = Math.max(cursor, Math.min(text.length, num(range.from)));
      const to = Math.max(from, Math.min(text.length, num(range.to ?? text.length)));
      if (from > cursor) width += measureSegment(text.slice(cursor, from), previousStyle);
      width += measureSegment(text.slice(from, to), range);
      cursor = Math.max(cursor, to);
      previousStyle = range;
    });
    if (cursor < text.length) width += measureSegment(text.slice(cursor), previousStyle);
    return width;
  }

  function applyFlexibleBigGoBar(template) {
    const bgEntry = findLayerEntry(template, '上方BAR_BG');
    const textEntry = findLayerEntry(template, '上方BAR_文案');
    if (!bgEntry || !textEntry) return false;
    const bg = bgEntry[1];
    const text = textEntry[1];
    const actualTextWidth = textLayerWidth(text);
    const currentWidth = num(bg.width);
    const textFrameWidth = num(text.width) || actualTextWidth;
    if (!(actualTextWidth > 0) || Math.abs(currentWidth - textFrameWidth) >= 25) return false;
    const nextWidth = actualTextWidth + 48;
    const textCenterX = Number.isFinite(Number(text.centerX)) ? Number(text.centerX) : num(text.x) + num(text.width) / 2;
    bg.width = nextWidth;
    bg.x = textCenterX - nextWidth / 2;
    bg.centerX = textCenterX;
    bg.centerY = Number.isFinite(Number(bg.centerY)) ? Number(bg.centerY) : num(bg.y) + num(bg.height) / 2;
    bg.useDynamicBounds = true;
    return true;
  }

  // ── 固定素材規格 ────────────────────────────────────────────

  function assetFolderFor(sourceTemplateId) {
    return /無品牌$/.test(clean(sourceTemplateId)) ? NOBRAND_ASSET_FOLDER : BRAND_ASSET_FOLDER;
  }

  function prepareCommonLayers(template, sourceTemplateId) {
    markGuides(template);
    const kvFolder = assetFolderFor(sourceTemplateId);

    layerEntries(template).forEach(([key, layer]) => {
      const canonicalName = canonicalLayerName(key, layer);
      layer.__canonicalName = canonicalName;
      if (layer.type !== 'image') return;

      if (normalizeLayerName(canonicalName) === normalizeLayerName('KV_BG')) {
        layer.__assetSpec = {
          kind: 'kv-bg',
          stem: `${sourceTemplateId}_KV_BG`,
          preferredFolder: kvFolder,
          required: true,
        };
        layer.assetFilename = '';
        layer.assetProject = kvFolder;
        layer.locked = true;
        layer.__nonInteractive = true;
        layer.__hideFromAssetWorkspace = true;
        layer.hidden = false;
        return;
      }

      // 共用裝飾素材：公版 JSON 的檔名帶尺寸前綴，實檔在 assets/共用素材/ 沒有前綴。
      if (SHARED_ASSET_LAYERS.some((name) => normalizeLayerName(name) === normalizeLayerName(canonicalName))) {
        layer.__assetSpec = {
          kind: 'shared',
          stem: canonicalName,
          preferredFolder: SHARED_ASSET_FOLDER,
          required: true,
        };
        layer.assetFilename = '';
        layer.assetProject = SHARED_ASSET_FOLDER;
        layer.hidden = false;
        return;
      }

      const isDynamicIaLogo = /^LOGO_\d+$/i.test(canonicalName);
      if (isDynamicIaLogo) {
        // IA 公版的 LOGO_01~05 在載入原始公版時還不知道對應哪一間店家，
        // 先清掉 PSD 匯出的預設檔名，避免去探測不存在的檔案。build() 之後才指派真正的規格。
        layer.assetFilename = '';
        layer.assetCandidates = [];
        layer.__assetMissing = true;
        return;
      }

      // 活動 LOGO 與 USP 等固定素材：改用去掉尺寸前綴的圖層名稱去找根目錄的 SVG。
      if (/LOGO|USP/i.test(canonicalName)) {
        layer.__assetSpec = {
          kind: 'fixed',
          stem: canonicalName,
          preferredFolder: kvFolder,
          required: true,
        };
        layer.assetFilename = '';
        layer.assetProject = kvFolder;
        layer.hidden = false;
      }
    });
  }

  function prepareTemplate(template) {
    if (!template || !template.layers) return template;
    const sourceTemplateId = clean(template.templateId || template.canvas?.templateId || template.source?.psdName || '');
    if (!/^affiliate(?:_|$)/i.test(sourceTemplateId)) return template;
    template.ruleFamily = 'network-affiliate';
    prepareCommonLayers(template, sourceTemplateId);
    return template;
  }

  // ── 分組與命名 ──────────────────────────────────────────────

  function extractFolderFromFilename(filename, fallback = '未分類') {
    const match = clean(filename).replace(/\.(png|jpe?g)$/i, '').match(/_(\d+)$/);
    return match ? String(Number(match[1])).padStart(2, '0') : fallback;
  }

  function parseBigGoGroup(shopText) {
    const match = clean(shopText).match(/第\s*(\d+)\s*(?:間|家)?/);
    return match ? Number(match[1]) : null;
  }

  function parseIaBlockIndex(record) {
    const filenameMatch = clean(record.filename).replace(/\.(png|jpe?g)$/i, '').match(/_(\d+)$/);
    if (filenameMatch) return Number(filenameMatch[1]);
    return record.combination;
  }

  function initializeRenderState(template, clone) {
    delete template.__renderModel;
    delete template.__renderState;
    template.__renderModel = clone(template);
    // 活的 template 物件本身就是 RenderState；這裡只留輕量中繼資料。
    template.__renderState = { initialized: true, source: 'live-template' };
  }

  // ── 批次建置 ────────────────────────────────────────────────

  function build({ rows, sourceTemplates, clone, sheetName = '' }) {
    const parsed = parse(rows);
    if (!parsed) return null;

    const warnings = [...parsed.warnings];
    const errors = [...parsed.errors];
    const generated = [];
    const unmatched = [];
    const logoByGroup = new Map();
    const outputRoot = safeName(sheetName) || 'Network';

    // 只有一般 Affiliate 列可以建立「組合編號 → 店家 LOGO」的對應表。
    for (const record of parsed.records) {
      if (record.__rowKind !== 'general' || !record.combination) continue;
      const logoFilename = basenameFromUrl(record.logo);
      if (!logoFilename) {
        if (clean(record.logo)) warnings.push(`第 ${record.__sourceRow} 列 LOGO 不是有效網址`);
        continue;
      }
      const stem = filenameStem(logoFilename);
      const current = logoByGroup.get(record.combination);
      if (!current) logoByGroup.set(record.combination, { stem, url: clean(record.logo), sourceRow: record.__sourceRow });
      else if (normalize(current.stem) !== normalize(stem)) {
        warnings.push(`第 ${record.__sourceRow} 列組合 ${record.combination} 有不同 LOGO；使用第 ${current.sourceRow} 列的第一個網址`);
      }
    }

    const usedNames = new Map();
    const uniqueName = (rawName, sourceRow) => {
      let base = safeName(rawName);
      if (!base) base = `未命名_第${String(sourceRow).padStart(2, '0')}列`;
      const count = (usedNames.get(base) || 0) + 1;
      usedNames.set(base, count);
      if (count === 1) return base;
      warnings.push(`第 ${sourceRow} 列檔名重複；自動改為 ${base}_${count}`);
      return `${base}_${count}`;
    };

    for (const record of parsed.records) {
      let kind = record.__rowKind;
      let folder = '未分類';
      let templateId = '';
      let outputName = '';

      if (kind === 'ia') {
        templateId = `Affiliate_IA_NB_${record.size}`;
        folder = 'All';
        const blockIndex = parseIaBlockIndex(record);
        outputName = `Affiliate_IA_${record.size}_${blockIndex || generated.filter((item) => item.data?.__meta?.kind === 'ia').length + 1}`;
      } else if (kind === 'biggo') {
        templateId = `affiliate_biggo_${record.size}`;
        folder = extractFolderFromFilename(record.filename);
        outputName = uniqueName(record.filename, record.__sourceRow);
      } else {
        if (!record.combination) {
          errors.push(`第 ${record.__sourceRow} 列組合必須是正整數；未產生`);
          continue;
        }
        const groupLogo = logoByGroup.get(record.combination);
        kind = groupLogo ? 'brand' : 'nobrand';
        templateId = kind === 'brand' ? `affiliate_${record.size}` : `affiliate_${record.size}_無品牌`;
        folder = kind === 'nobrand' ? '無品牌' : extractFolderFromFilename(record.filename);
        outputName = uniqueName(record.filename, record.__sourceRow);
      }

      const sourceTemplate = templateById(sourceTemplates, templateId);
      if (!sourceTemplate) {
        const reason = `第 ${record.__sourceRow} 列缺少公版 ${templateId}`;
        unmatched.push({ name: templateId, reason });
        warnings.push(`第 ${record.__sourceRow} 列公版缺失：${templateId}`);
        continue;
      }

      const data = clone(sourceTemplate.data);
      const sourceTemplateId = clean(data.templateId || data.canvas?.templateId || templateId);
      prepareCommonLayers(data, sourceTemplateId);

      data.templateId = outputName;
      data.ruleFamily = 'network-affiliate';
      data.batchProject = assetFolderFor(sourceTemplateId);
      data.batchRecord = {
        ...record,
        __network: true,
        __networkKind: kind,
        __multiSizeSync: true,
        __outputRoot: outputRoot,
        __outputFolder: folder,
        __outputName: outputName,
        __outputFormat: 'jpg',
      };
      data.__meta = {
        kind,
        folder,
        sourceRow: record.__sourceRow,
        outputName,
        sourceTemplateId,
      };

      if (kind === 'brand') {
        const groupLogo = logoByGroup.get(record.combination);
        createDynamicLogoLayer(data, BRAND_LOGO_LAYER, GUIDE_LAYER, {
          kind: 'dynamic-logo',
          stem: groupLogo?.stem || '',
          preferredFolder: LOGO_ASSET_FOLDER,
          required: true,
          group: record.combination,
        });
      }

      if (kind === 'biggo') {
        const group = parseBigGoGroup(record.shop);
        const groupLogo = group ? logoByGroup.get(group) : null;
        if (!group) warnings.push(`第 ${record.__sourceRow} 列 BigGo 店家欄無法解析第 N 間；素材將顯示缺失`);
        else if (!groupLogo) warnings.push(`第 ${record.__sourceRow} 列 BigGo 找不到組合 ${group} 的 LOGO；素材將顯示缺失`);
        createDynamicLogoLayer(data, BIGGO_LOGO_LAYER, GUIDE_LAYER, {
          kind: 'dynamic-logo',
          stem: groupLogo?.stem || '',
          preferredFolder: LOGO_ASSET_FOLDER,
          required: true,
          group,
        });

        setVisible(data, '上方BAR_BG', true);
        setVisible(data, '上方BAR_文案', true);
        const percent = percentText(record.logo);
        const textEntry = findLayerEntry(data, '上方BAR_文案');
        if (textEntry && percent) {
          const textLayer = textEntry[1];
          textLayer.text = String(textLayer.text || '現金回饋10%').replace(/\d+(?:\.\d+)?\s*%/, percent);
        } else if (!percent) {
          warnings.push(`第 ${record.__sourceRow} 列 BigGo 回饋比例無效；保留預設文字`);
        }
        applyFlexibleBigGoBar(data);
      }

      if (kind === 'ia') {
        if (record.size !== '1200x628') warnings.push(`第 ${record.__sourceRow} 列 Affiliate IA 目前僅支援 1200x628`);
        const blockIndex = parseIaBlockIndex(record);
        const startGroup = blockIndex ? (blockIndex - 1) * 5 + 1 : null;
        for (let index = 1; index <= 5; index += 1) {
          const layerName = `LOGO_0${index}`;
          const guideName = `${GUIDE_LAYER}_0${index}`;
          const group = startGroup ? startGroup + index - 1 : null;
          const groupLogo = group ? logoByGroup.get(group) : null;
          if (group && !groupLogo) warnings.push(`第 ${record.__sourceRow} 列 Affiliate IA 找不到組合 ${group} 的 LOGO；${layerName} 保留缺失位置`);
          createDynamicLogoLayer(data, layerName, guideName, {
            kind: 'dynamic-logo',
            stem: groupLogo?.stem || '',
            preferredFolder: LOGO_ASSET_FOLDER,
            required: true,
            group,
          });
        }
      }

      applyDirectionalCornerRules(data, sourceTemplateId, kind);
      initializeRenderState(data, clone);
      generated.push({
        name: outputName,
        file: `${outputName}.generated`,
        visible: true,
        data,
        batchRecord: data.batchRecord,
        project: data.batchProject,
      });
    }

    return {
      generated,
      unmatched,
      emptyBlocks: [],
      diagnostics: {
        specDriven: true,
        network: true,
        outputRoot,
        parsedBlockCount: 1,
        recordCount: parsed.records.length,
        warnings,
        errors,
        skippedRows: [],
        generatedCount: generated.length,
        unmatchedCount: unmatched.length,
      },
    };
  }

  function diagnosticText(diagnostics, elapsedMs = 0) {
    const warnings = diagnostics?.warnings || [];
    const errors = diagnostics?.errors || [];
    return [
      '【成功】',
      `✓ 共解析 ${diagnostics?.recordCount || 0} 筆資料`,
      `✓ 成功輸出 ${diagnostics?.generatedCount || 0} 張`,
      '',
      '【警告】',
      ...(warnings.length ? warnings.map((message) => `⚠ ${message}`) : ['（無）']),
      '',
      '【失敗】',
      ...(errors.length ? errors.map((message) => `✗ ${message}`) : ['（無）']),
      '',
      '【統計】',
      `成功：${diagnostics?.generatedCount || 0}`,
      `警告：${warnings.length}`,
      `失敗：${errors.length}`,
      `耗時：${(elapsedMs / 1000).toFixed(2)} 秒`,
    ].join('\r\n');
  }

  window.AssetSpecEngine = Object.freeze({
    findHeader,
    parse,
    build,
    diagnosticText,
    safeName,
    normalizeSize,
    normalizeLayerName,
    filenameStem,
    extensionRank,
    prepareTemplate,
    resolveSafeArea,
    imageExtensions: IMAGE_EXTENSIONS,
    decodeUnicodeEscapes,
  });

  // 註冊家族，讓引擎在需要時能查到本公版有沒有專屬規則。
  window.TemplateRuleRegistry?.register?.('network-affiliate', {
    label: 'Network / Affiliate',
    priority: 500,
    targets: [],
    tokens: ['Affiliate', 'BigGo', 'Network'],
    rules: {},
  });

  // 跨版位同步分群：品牌版（P）與 BigGo（P_02）即使用同一張店家 LOGO 也互不連動。
  window.MultiSizeAssetSync?.configure?.({
    groupKeyResolver: (template) => String(template?.batchRecord?.__networkKind || ''),
  });

  // 只有動態店家 LOGO 缺素材時，畫布上才顯示「＋ 上傳圖片」槽。
  window.ManualAssetUpload?.configure?.({
    isUploadSlot: (key, layer, template) => Boolean(template?.batchRecord?.__network)
      && layer?.__assetSpec?.kind === 'dynamic-logo',
  });
})();
