/* OM Wave 1 shared asset/subtitle/layout rules. */
(function registerOmWave1Layout() {
  'use strict';

  const M = window.OMWave1TemplateMatcher;
  const EXTENSIONS = Object.freeze(['png', 'jpg', 'jpeg', 'svg', 'webp']);
  const PRODUCT_ASSET_ALIASES = Object.freeze({
    '倍潔雅x蝦皮聯名': '倍潔雅x蝦皮聯名 衛生紙.png',
  });
  const PRODUCT_ASSET_FALLBACKS = Object.freeze({
    // 工單已改用「有皇冠」名稱；若專案尚未放入同名素材，才退回舊 VIP_單券_蝦幣.png。
    'VIP_單券_蝦幣_有皇冠': ['VIP_單券_蝦幣.png'],
  });

  function entries(template) { return Object.entries(template?.layers || {}); }
  function layerName(key, layer) { return String(layer?.psdName || layer?.name || key || '').trim(); }
  function findLayer(template, name) {
    const wanted = String(name || '').trim();
    const hit = entries(template).find(([key, layer]) => layerName(key, layer) === wanted);
    return hit?.[1] || null;
  }
  function findAnyLayer(template, names) {
    for (const name of names) {
      const hit = findLayer(template, name);
      if (hit) return hit;
    }
    return null;
  }
  function setVisible(layer, visible) { if (layer) layer.hidden = !visible; }
  function round2(value) { return Math.round(Number(value) * 100) / 100; }
  function templateSourceId(template) {
    return String(
      template?.sheetTemplateRoute?.sourceTemplateId
      || template?.canvas?.templateId
      || template?.batchSourceName
      || template?.templateId
      || ''
    ).trim();
  }

  function baseStem(filename) {
    return String(filename || '').replace(/\.[^.]+$/, '');
  }

  function assignImageAsset(layer, filename, assetProject = '') {
    if (!layer || !filename) return false;
    const stem = baseStem(filename);
    const suppliedExt = String(filename).match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
    const nextFilename = suppliedExt ? filename : `${stem}.png`;
    const previousFilename = String(layer.assetFilename || '');
    const previousProject = String(layer.assetProject || '');
    if (previousFilename !== nextFilename || previousProject !== String(assetProject || '')) {
      delete layer.__resolvedAssetFolder;
      delete layer.__resolvedAssetFilename;
      delete layer.__resolvedAssetPath;
      delete layer.smartAssetId;
    }
    layer.assetFilename = nextFilename;
    layer.assetCandidates = EXTENSIONS
      .filter((ext) => ext !== suppliedExt)
      .map((ext) => `${stem}.${ext}`);
    layer.assetProject = assetProject;
    layer.keepAspectRatio = true;
    layer.hidden = false;
    layer.__assetMissing = false;
    return true;
  }

  function resolveAssetFolder(sourceId, record) {
    const id = String(sourceId || '').trim();
    if (/^DPA Frame_MAU_/i.test(id)) return 'DPA Frame_MAU';
    if (/^UAC_Pmax_LineLAP_/i.test(id)) return 'UAC_Pmax_LineLAP';
    if (/^FB_Linelap_/i.test(id)) return 'FB_Linelap';
    if (/^Template_/i.test(id)) return 'Template';
    if (/^Rtbhouse_/i.test(id)) return 'Rtbhouse';
    if (/^Appier_/i.test(id)) return 'Appier';
    if (/^LineOA_Template_/i.test(id)) return id;
    return M.assetFolder(record?.__media || '');
  }

  function ensureKvBackgroundLayer(template, sourceId, project) {
    let bg = findLayer(template, 'KV_BG');
    if (!bg) {
      const width = Math.max(1, Number(template?.canvas?.width || 1));
      const height = Math.max(1, Number(template?.canvas?.height || 1));
      const key = 'kv_bg';
      bg = {
        type: 'image',
        psdName: 'KV_BG',
        x: 0,
        y: 0,
        width,
        height,
        centerX: width / 2,
        centerY: height / 2,
        keepAspectRatio: false,
        locked: true,
        hidden: false,
      };
      template.layers = template.layers || {};
      template.layers[key] = bg;
      template.renderOrder = Array.isArray(template.renderOrder) ? template.renderOrder : [];
      if (!template.renderOrder.includes(key)) template.renderOrder.unshift(key);
    }
    assignImageAsset(bg, `${sourceId}_KV_BG.png`, project);
    bg.keepAspectRatio = false;
    bg.locked = true;
    return bg;
  }

  function applyStaticAssets(template, record) {
    const sourceId = templateSourceId(template);
    const project = resolveAssetFolder(sourceId, record);
    ensureKvBackgroundLayer(template, sourceId, project);

    entries(template).forEach(([key, item]) => {
      if (item?.type !== 'image') return;
      const name = layerName(key, item);
      if (!name) return;

      if (name === 'KV_BG') {
        assignImageAsset(item, `${sourceId}_KV_BG.png`, project);
        item.keepAspectRatio = false;
        item.locked = true;
        return;
      }
      if (/^(直式|橫式)_25號商城狂購節_LOGO/.test(name)) {
        assignImageAsset(item, `${name}.svg`, '');
        return;
      }
      if (['蝦皮VIP_LOGO', '蝦皮商城_LOGO_純文字', '蝦皮直營_LOGO', '蝦皮購物_LOGO_白'].includes(name)) {
        assignImageAsset(item, `${name}.svg`, '');
        return;
      }
      if (/^DECO_/.test(name)) assignImageAsset(item, `${name}.png`, project);
    });
  }

  function calibratedPlacementKey(template, record) {
    const sourceId = templateSourceId(template);
    const layoutNo = String(record?.__layoutNo || template?.batchRecord?.__layoutNo || '').trim().toLowerCase();
    return sourceId && layoutNo ? `${sourceId}|${layoutNo}` : '';
  }

  function applyCalibratedLayerGeometry(layer, geometry, layerLabel) {
    if (!layer || !geometry) return false;
    const x = Number(geometry.x);
    const y = Number(geometry.y);
    const width = Number(geometry.width);
    const height = Number(geometry.height);
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return false;

    layer.x = round2(x);
    layer.y = round2(y);
    layer.width = round2(width);
    layer.height = round2(height);
    // 校正檔部分舊 export 的 centerX/centerY 沒有跟著 P_範圍移動更新；
    // x/y/width/height 才是畫面幾何真值，因此中心固定由最新 bounds 重算。
    layer.centerX = round2(x + width / 2);
    layer.centerY = round2(y + height / 2);
    if (Number.isFinite(Number(geometry.rotation))) layer.rotation = round2(Number(geometry.rotation));

    if (['P', 'P_01', 'P_02'].includes(layerLabel)) {
      // ProductEngine 在 keepAspectRatio=true 時以 targetWidth 作為真正渲染寬度；
      // 同步更新它，否則畫面仍可能使用舊 JSON 的尺寸。
      layer.targetWidth = round2(width);
      if (layer.targetHeight != null) delete layer.targetHeight;
      if (layer.maxTargetHeight != null) delete layer.maxTargetHeight;
    } else if (layerLabel === 'P_範圍' && layer.type === 'shape') {
      // ShapeRenderer 不可再讀 PSD 舊 geometry/pathBounds，否則校正後的 guide 看起來仍在舊位置。
      layer.useDynamicBounds = true;
    }
    return true;
  }

  function applyCalibratedLayerState(layer, state, layerLabel) {
    if (!layer || !state) return false;
    let changed = applyCalibratedLayerGeometry(layer, state, layerLabel);

    ['hidden', 'locked', 'opacity'].forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(state, field)) return;
      layer[field] = state[field];
      changed = true;
    });

    if (layer.type === 'text') {
      [
        'fontSizePx', 'fontSizePt', 'lineHeight', 'lineHeightMultiplier', 'letterSpacing',
        'align', 'color', 'fontWeight', 'fontStyle', 'italic', 'textBottomPaddingPx', 'textVerticalAlign',
      ].forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(state, field)) return;
        layer[field] = state[field];
        changed = true;
      });
    }

    if (/^DECO_/.test(layerLabel) && layer.type === 'image') {
      const previousFilename = String(layer.assetFilename || '');
      ['assetFilename', 'assetProject', 'keepAspectRatio'].forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(state, field)) return;
        layer[field] = state[field];
        changed = true;
      });
      if (Array.isArray(state.assetCandidates)) {
        layer.assetCandidates = state.assetCandidates.slice();
        changed = true;
      }
      if (previousFilename !== String(layer.assetFilename || '')) {
        delete layer.__resolvedAssetFolder;
        delete layer.__resolvedAssetFilename;
        delete layer.__resolvedAssetPath;
        delete layer.smartAssetId;
      }
    }

    return changed;
  }

  function applyCalibratedInitialPlacement(template, record, diagnostics) {
    const key = calibratedPlacementKey(template, record);
    if (!key) return false;
    const preset = window.OMWave1InitialPlacements?.[key];
    if (!preset?.layers) return false;

    const applied = [];
    Object.entries(preset.layers).forEach(([name, state]) => {
      // Generated Auto Price is created after the record is applied; keep its exact calibration in afterApply.
      if (name.startsWith('__auto_price_v2_')) return;
      const layer = findLayer(template, name);
      if (applyCalibratedLayerState(layer, state, name)) applied.push(name);
    });
    if (applied.length) {
      template.__omWave1CalibrationKey = key;
      diagnostics?.push({
        field: '初始值校正',
        status: 'ok',
        value: preset.sourceFile || key,
        target: applied.join(' / '),
      });
    }
    return applied.length > 0;
  }

  function findAutoPriceLayerEntry(template, slot = 'single') {
    const slotName = String(slot || '').trim();
    return entries(template).find(([key, layer]) => {
      if (!layer || layer.type !== 'text' || layer.source !== 'auto_price_v2') return false;
      return String(layer.priceSlot || '').trim() === slotName || key === `__auto_price_v2_${slotName}`;
    }) || null;
  }

  function applyCalibratedPriceLayerGeometry(layer, geometry, layerKey) {
    if (!applyCalibratedLayerGeometry(layer, geometry, layerKey)) return false;
    if (Number.isFinite(Number(geometry.fontSizePx))) {
      layer.fontSizePx = round2(Number(geometry.fontSizePx));
      layer.fontSizePt = round2(Number(geometry.fontSizePt ?? geometry.fontSizePx));
    }
    if (Number.isFinite(Number(geometry.lineHeight))) layer.lineHeight = round2(Number(geometry.lineHeight));
    if (Number.isFinite(Number(geometry.lineHeightMultiplier))) layer.lineHeightMultiplier = round2(Number(geometry.lineHeightMultiplier));
    if (Number.isFinite(Number(geometry.letterSpacing))) layer.letterSpacing = round2(Number(geometry.letterSpacing));
    window.SPTextStandard?.applyPriceTextLayer?.(layer, layerKey);
    window.TextBaselineModel?.captureLayer?.(layer, { source: 'edited-json-calibration', force: true });
    // 校正檔存的 width/height 是設計師當初的文字框，通常也比實際字形大一圈。
    // 這裡跟 PriceLayerFactory 一樣把外框收到實際字形範圍；文字位置不會變（字形仍置中於同一個中心）。
    window.Renderer?.fitTextLayerToInk?.(layerKey, layer);
    return true;
  }

  function applyCalibratedPricePlacement(template, record, diagnostics, options = {}) {
    if (options.skipExactLayout) return false;
    const key = calibratedPlacementKey(template, record);
    if (!key) return false;
    const preset = window.OMWave1InitialPlacements?.[key];
    // 校正 JSON 的價格圖層歷史上有兩種 key：舊匯入保留 PSD 名稱「價格」，
    // 新格式統一使用 Auto Price runtime key。兩者都接受，避免校正值存在卻沒有套到生成價格層。
    const geometry = preset?.layers?.__auto_price_v2_single || preset?.layers?.價格;
    if (!geometry) return false;
    const priceEntry = findAutoPriceLayerEntry(template, 'single');
    if (!priceEntry) return false;
    const [layerKey, layer] = priceEntry;
    if (!applyCalibratedPriceLayerGeometry(layer, geometry, layerKey)) return false;
    window.PriceTransformEngine?.captureManualPriceTransform?.(layerKey, layer, template);
    layer._anchorDirty = false;
    diagnostics?.push({
      field: '價格初始值校正',
      status: 'ok',
      value: preset.sourceFile || key,
      target: layer.psdName || layerKey,
    });
    return true;
  }

  // 把單一商品圖等比置中縮放到 P_範圍（PSD 定義的商品可用區）。
  // Appier / Rtbhouse 的公版只有雙品槽 P_01 / P_02，沒有單品槽 P，
  // 單品時退回 P_01 當實體圖層，但 P_01 的原始座標是「雙品版的其中一小格」，
  // 直接沿用會讓單品偏小又偏一側，所以改成鋪滿 P_範圍。
  //
  // sizingMode='containByPBox' 是 ProductEngine.containByWidthThenHeight() 的模式：
  //   先以 targetWidth 為寬、依素材原始比例算高；高度超過 maxTargetHeight 時改以高度為準。
  //   → 等於「等比 contain 進 targetWidth × maxTargetHeight 這個框」，且不會變形。
  // 價格層是依商品框 ratio 錨定的，而 renderThumbnailForTemplate / selectBatchItem
  // 都是「先 loadImages 再 rebuildFromPricePreset」，重建時 Geometry.getLayerBox()
  // 拿到的已經是 contain 之後的真實渲染框，所以價格會落在券面上而不是 P_範圍 上。
  function fitLayerToPlacementGuide(template, layer) {
    const guide = findAnyLayer(template, ['P_範圍', '_P_範圍']);
    if (!guide || !layer) return false;
    const width = Number(guide.width || 0);
    const height = Number(guide.height || 0);
    if (!(width > 0) || !(height > 0)) return false;

    const centerX = Number.isFinite(Number(guide.centerX))
      ? Number(guide.centerX)
      : Number(guide.x || 0) + width / 2;
    const centerY = Number.isFinite(Number(guide.centerY))
      ? Number(guide.centerY)
      : Number(guide.y || 0) + height / 2;

    layer.x = round2(centerX - width / 2);
    layer.y = round2(centerY - height / 2);
    layer.width = round2(width);
    layer.height = round2(height);
    layer.centerX = round2(centerX);
    layer.centerY = round2(centerY);
    layer.rotation = 0;
    layer.keepAspectRatio = true;
    layer.sizingMode = 'containByPBox';
    layer.targetWidth = round2(width);
    layer.targetHeight = round2(height);
    layer.maxTargetHeight = round2(height);
    delete layer.maxTargetWidth;
    delete layer.widthLimitPolicy;
    return true;
  }

  function configureProductLayer(layer, productName, project, role) {
    if (!layer) return false;
    const filename = PRODUCT_ASSET_ALIASES[productName] || productName;
    assignImageAsset(layer, filename, project);
    const fallbacks = PRODUCT_ASSET_FALLBACKS[productName] || [];
    if (fallbacks.length) layer.assetCandidates = [...fallbacks, ...(layer.assetCandidates || [])];
    layer.role = role;
    layer.keepAspectRatio = true;
    layer.hidden = false;
    return true;
  }

  function applyProducts(template, record, diagnostics) {
    const products = Array.isArray(record?.__omProducts)
      ? record.__omProducts.map((item) => String(item || '').trim()).filter(Boolean)
      : [record?.['商品圖1'], record?.['商品圖2']].map((item) => String(item || '').trim()).filter(Boolean);
    const project = M.assetFolder(record?.__media || '');
    const p = findLayer(template, 'P');
    const p1 = findLayer(template, 'P_01');
    const p2 = findLayer(template, 'P_02');

    if (!products.length) return;

    if (products.length === 1) {
      // 單品槽優先用 P；Appier / Rtbhouse 的公版沒有 P，只有雙品槽，
      // 舊版在這裡會把 P_01 / P_02 一起藏起來又找不到 P，結果整張圖沒有商品（掉圖），
      // 只留下一行 missing-layer 警告。改成退回 P_01 當單品槽。
      setVisible(p2, false);
      const single = p || p1;
      const isFallbackSlot = !p && !!p1;
      if (p) setVisible(p1, false);

      if (!single) {
        diagnostics?.push({ field: '商品圖1', status: 'missing-layer', value: products[0], target: 'P / P_01' });
        return;
      }

      configureProductLayer(single, products[0], project, '商品圖1');
      let target = 'P';
      if (isFallbackSlot) {
        target = fitLayerToPlacementGuide(template, single) ? 'P_01（依 P_範圍 置中縮放）' : 'P_01';
      }
      diagnostics?.push({ field: '商品圖1', status: 'ok', value: products[0], target });
      return;
    }

    // Dual products always use P_01 / P_02. P is hidden even if it exists.
    setVisible(p, false);
    if (p1) {
      configureProductLayer(p1, products[0], project, '商品圖1');
      diagnostics?.push({ field: '商品圖1', status: 'ok', value: products[0], target: 'P_01' });
    } else diagnostics?.push({ field: '商品圖1', status: 'missing-layer', value: products[0], target: 'P_01' });
    if (p2) {
      configureProductLayer(p2, products[1], project, '商品圖2');
      diagnostics?.push({ field: '商品圖2', status: 'ok', value: products[1], target: 'P_02' });
    } else diagnostics?.push({ field: '商品圖2', status: 'missing-layer', value: products[1], target: 'P_02' });
  }

  function protectImageLayersFromGenericProductMapper(template) {
    if (template.__omWave1LockSnapshot) return;
    const snapshot = {};
    entries(template).forEach(([key, item]) => {
      if (item?.type !== 'image') return;
      const name = layerName(key, item).toLowerCase();
      const isBackground = name === 'kv_bg' || name.includes('kvbg');
      const isLogo = name.includes('logo');
      const isCta = name.includes('cta') || name.includes('button');
      if (isBackground || isLogo || isCta) return;
      snapshot[key] = item.locked === true;
      item.locked = true;
    });
    template.__omWave1LockSnapshot = snapshot;
  }

  function restoreImageLayerLocks(template) {
    const snapshot = template?.__omWave1LockSnapshot;
    if (!snapshot) return;
    Object.entries(snapshot).forEach(([key, wasLocked]) => {
      const item = template.layers?.[key];
      if (item) item.locked = wasLocked;
    });
    delete template.__omWave1LockSnapshot;
  }

  function campaignLogoWidth(template) {
    const logoEntry = entries(template).find(([key, item]) => item?.type === 'image' && /25號商城狂購節_LOGO/.test(layerName(key, item)));
    return Math.max(0, Number(logoEntry?.[1]?.width || 0));
  }

  const SUBTITLE_BG_IGNORE_CAMPAIGN_LOGO = Object.freeze(new Set([
    'Appier_640x100|banner6',
    'Rtbhouse_728x90|banner4',
    'Rtbhouse_320x50|banner4',
  ]));

  function shouldIgnoreCampaignLogoForSubtitleBg(template) {
    const sourceId = templateSourceId(template);
    // Appier_320x50 的主標題區與副標題膠囊不在同一個 X 軸，
    // 所有 banner 都只依副標內容伸縮，不拿主標／活動 LOGO 寬度參與比較。
    if (sourceId === 'Appier_320x50' || sourceId === 'Appier_640x100') return true;
    const layoutNo = String(template?.batchRecord?.__layoutNo || '').trim().toLowerCase();
    return SUBTITLE_BG_IGNORE_CAMPAIGN_LOGO.has(`${sourceId}|${layoutNo}`);
  }

  function centerXOf(layer, fallback = 0) {
    if (!layer) return fallback;
    if (Number.isFinite(Number(layer.centerX))) return Number(layer.centerX);
    return Number(layer.x || 0) + Number(layer.width || 0) / 2;
  }

  // V3.8 已調校過的膠囊參數優先沿用；新增加、V3.8 沒有的 Appier 尺寸
  // 才使用依畫布短邊推導的動態 fallback。
  const CAPSULE_RULES_BY_TEMPLATE = Object.freeze({
    'Template_1200x1200': { normal: { padding: 50, threshold: 50, thresholdPadding: 50 }, vip: { padding: 50, threshold: 50, thresholdPadding: 50 } },
    'Template_1200x628': { normal: { padding: 25, threshold: 25, thresholdPadding: 25 }, vip: { padding: 25, threshold: 25, thresholdPadding: 25 } },
    'Template_600x400': { normal: { padding: 20, threshold: 20, thresholdPadding: 20 }, vip: { padding: 20, threshold: 30, thresholdPadding: 30 } },
    'UAC_Pmax_LineLAP_1200x1200': { normal: { padding: 50, threshold: 50, thresholdPadding: 50 }, vip: { padding: 50, threshold: 50, thresholdPadding: 50 } },
    'UAC_Pmax_LineLAP_1200x628': { normal: { padding: 25, threshold: 25, thresholdPadding: 25 }, vip: { padding: 25, threshold: 25, thresholdPadding: 25 } },
    'UAC_Pmax_LineLAP_600x400': { normal: { padding: 20, threshold: 20, thresholdPadding: 20 }, vip: { padding: 20, threshold: 30, thresholdPadding: 30 } },
    'UAC_Pmax_LineLAP_960x1200': { normal: { padding: 40, threshold: 40, thresholdPadding: 40 }, vip: { padding: 40, threshold: 60, thresholdPadding: 40 } },
    // FB_Linelap 四個尺寸的公版 JSON 與 UAC_Pmax_LineLAP 同一套 PSD，副標題膠囊沿用相同參數。
    'FB_Linelap_1200x1200': { normal: { padding: 50, threshold: 50, thresholdPadding: 50 }, vip: { padding: 50, threshold: 50, thresholdPadding: 50 } },
    'FB_Linelap_1200x628': { normal: { padding: 25, threshold: 25, thresholdPadding: 25 }, vip: { padding: 25, threshold: 25, thresholdPadding: 25 } },
    'FB_Linelap_600x400': { normal: { padding: 20, threshold: 20, thresholdPadding: 20 }, vip: { padding: 20, threshold: 30, thresholdPadding: 30 } },
    'FB_Linelap_960x1200': { normal: { padding: 40, threshold: 40, thresholdPadding: 40 }, vip: { padding: 40, threshold: 60, thresholdPadding: 40 } },
    'Rtbhouse_728x90': { normal: { padding: 24 } },
    'Rtbhouse_480x320': { normal: { padding: 24 } },
    'Rtbhouse_360x640': { normal: { padding: 20 } },
    'Rtbhouse_320x480': { normal: { padding: 18 } },
    'Rtbhouse_320x50': { normal: { padding: 12 } },
    'Rtbhouse_300x600': { normal: { padding: 18 } },
    'Rtbhouse_300x250': { normal: { padding: 16 } },
    // Appier_640x100：副標題群組左右各加 10px，且不受主標寬度影響。
    'Appier_640x100': { normal: { padding: 10 }, vip: { padding: 10 } },
  });

  const CAPSULE_RULES_BY_LAYOUT = Object.freeze({
    // banner1_320x50 的 VIP 群組左右各加 5px。
    'Appier_320x50|banner1': { vip: { padding: 5 } },
  });

  function dynamicPadding(template) {
    const width = Number(template?.canvas?.width || 0);
    const height = Number(template?.canvas?.height || 0);
    const minSide = Math.max(1, Math.min(width || 1, height || 1));
    return Math.max(10, Math.min(50, Math.round(minSide * 0.045)));
  }

  function capsuleRule(template, variant = 'normal') {
    const sourceId = templateSourceId(template);
    const layoutNo = String(template?.batchRecord?.__layoutNo || '').trim().toLowerCase();
    const layoutRules = CAPSULE_RULES_BY_LAYOUT[`${sourceId}|${layoutNo}`] || {};
    if (layoutRules[variant]) return layoutRules[variant];
    const templateRules = CAPSULE_RULES_BY_TEMPLATE[sourceId] || {};
    return templateRules[variant] || templateRules.normal || { padding: dynamicPadding(template) };
  }

  function vipSubtitleGap(template) {
    const sourceId = templateSourceId(template);
    const layoutNo = String(template?.batchRecord?.__layoutNo || '').trim().toLowerCase();
    return sourceId === 'Appier_320x50' && layoutNo === 'banner1' ? 1 : 5;
  }

  function measure(layer, helpers) {
    return Math.max(1, Number(helpers?.measureTextWidth?.(layer) || layer?.width || 1));
  }

  function applyNonPriceTextStandard(layer, key) {
    if (!layer) return false;
    return window.SPTextStandard?.applyNonPriceTextLayer?.(layer, key || layer.psdName || '') === true;
  }

  function rebuildSubtitleHexagon(bg, targetWidth, centerX) {
    if (!bg) return;
    // 參考 25節_暖身BN_Tool_V1.5 的六角形比例：
    // 左右削角水平深度固定約為「底色高度 × 0.29」，而不是用正六角形的寬度比例。
    // 因此底色越寬，中間平直區域會變長，但左右角度不會跟著變尖。
    const height = Math.max(1, Number(bg.height || 80));
    const width = Math.max(1, Number(targetWidth || bg.width || 1));
    const currentY = Number(bg.y || 0);
    const currentCenterY = Number.isFinite(Number(bg.centerY))
      ? Number(bg.centerY)
      : currentY + height / 2;
    const x = Number(centerX) - width / 2;
    const y = currentCenterY - height / 2;
    const pointWidth = Math.min(Math.round(height * 0.29), Math.floor(width / 2));
    const corners = [
      { x: x + pointWidth, y },
      { x: x + width - pointWidth, y },
      { x: x + width, y: currentCenterY },
      { x: x + width - pointWidth, y: y + height },
      { x: x + pointWidth, y: y + height },
      { x, y: currentCenterY },
    ];
    // ShapeRenderer 的 path fallback 需要方向點才會走自訂 path；
    // 控制點與錨點相同，因此六段都是直線。
    const vectorPath = corners.map((point) => ({
      anchor: { x: round2(point.x), y: round2(point.y) },
      leftDirection: { x: round2(point.x), y: round2(point.y) },
      rightDirection: { x: round2(point.x), y: round2(point.y) },
    }));
    const fill = bg.fill || bg.shape?.fill || '#113366';

    bg.x = round2(x);
    bg.y = round2(y);
    bg.width = round2(width);
    bg.height = round2(height);
    bg.centerX = round2(centerX);
    bg.centerY = round2(currentCenterY);
    bg.hidden = false;
    bg.type = 'shape';
    bg.useDynamicBounds = true;
    bg.fill = fill;
    bg.shape = bg.shape || {};
    bg.shape.kind = 'path';
    bg.shape.fill = fill;
    bg.shape.stroke = { ...(bg.shape.stroke || {}), enabled: false };
    bg.shape.vectorPath = vectorPath;
    bg.shape.bezierPoints = vectorPath.map((point) => JSON.parse(JSON.stringify(point)));
    bg.shape.pathBounds = {
      x: bg.x, y: bg.y, width: bg.width, height: bg.height,
      centerX: bg.centerX, centerY: bg.centerY,
    };
    if (bg.shape.geometry) delete bg.shape.geometry;
    delete bg.shape.polygonSides;
    delete bg.shape.startAngleDeg;
  }

  function resizeBackground(bg, width, centerX) {
    rebuildSubtitleHexagon(bg, width, centerX);
  }

  function resolveCapsuleWidth(template, contentWidth, variant = 'normal') {
    const actualContentWidth = Math.max(1, Number(contentWidth || 0));
    // 以下 4 個極窄版位的副標題底色只依副標題內容計算寬度，
    // 不把主標題／活動 LOGO 寬度加入比較，避免底色被主標撐寬。
    const logoWidth = shouldIgnoreCampaignLogoForSubtitleBg(template) ? 0 : campaignLogoWidth(template);
    const rule = capsuleRule(template, variant);
    const padding = Number(rule.padding ?? dynamicPadding(template));
    const threshold = Number(rule.threshold ?? -1);
    const thresholdPadding = Number(rule.thresholdPadding ?? padding);

    if (logoWidth > 0 && logoWidth >= actualContentWidth) {
      const diff = logoWidth - actualContentWidth;
      if (threshold >= 0 && diff <= threshold) return actualContentWidth + thresholdPadding * 2;
      return logoWidth;
    }
    return actualContentWidth + padding * 2;
  }

  const APPIER_160_SUBTITLE_LINE_HEIGHT_PT = 35;

  function normalizeManualLineBreaks(value) {
    return String(value || '')
      .replace(/_x000d_/gi, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  function resetAppier160SubtitleBaseRange(layer) {
    if (!layer || layer.type !== 'text') return;
    const text = String(layer.text || '');
    if (!text) {
      layer.textStyleRanges = [];
      return;
    }

    const source = Array.isArray(layer.textStyleRanges)
      ? layer.textStyleRanges.find((range) => range && Number(range.fontSizePx) > 0)
      : null;
    const fontSizePx = Math.max(1, Number(layer.fontSizePx || source?.fontSizePx || 24));
    const baseRange = {
      from: 0,
      to: text.length,
      fontSizePx,
      lineHeight: APPIER_160_SUBTITLE_LINE_HEIGHT_PT,
    };
    ['color', 'fill', 'letterSpacing', 'fontFamily', 'fontWeight', 'fontStyleName', 'fontPostScriptName'].forEach((prop) => {
      const value = source?.[prop] ?? layer?.[prop];
      if (value !== undefined) baseRange[prop] = value;
    });
    layer.textStyleRanges = [baseRange];
  }

  function enforceAppier160LineHeight(layer) {
    if (!layer) return;
    layer.lineHeight = APPIER_160_SUBTITLE_LINE_HEIGHT_PT;
    if (Number(layer.fontSizePx) > 0) {
      layer.lineHeightMultiplier = APPIER_160_SUBTITLE_LINE_HEIGHT_PT / Number(layer.fontSizePx);
    }
    if (Array.isArray(layer.textStyleRanges)) {
      layer.textStyleRanges.forEach((range) => {
        if (range) range.lineHeight = APPIER_160_SUBTITLE_LINE_HEIGHT_PT;
      });
    }
  }

  function setAppier160SubtitleFontSize(layer, fontSizePt) {
    if (!layer || !(Number(fontSizePt) > 0)) return;
    const size = Number(fontSizePt);
    layer.fontSizePx = size;
    layer.fontSizePt = size;
    layer.lineHeight = APPIER_160_SUBTITLE_LINE_HEIGHT_PT;
    layer.lineHeightMultiplier = APPIER_160_SUBTITLE_LINE_HEIGHT_PT / size;
  }

  function ensureAppier160VipLogo(template, upper) {
    if (!template || !upper) return null;
    let logo = findLayer(template, '蝦皮VIP_LOGO');
    if (logo) return logo;

    const height = Math.max(1, Number(upper.height || 29));
    const width = round2(height * (965.37 / 340.16));
    const centerX = centerXOf(upper, Number(template?.canvas?.width || 160) / 2);
    const centerY = Number.isFinite(Number(upper.centerY))
      ? Number(upper.centerY)
      : Number(upper.y || 0) + height / 2;
    const key = '__om_appier_160_vip_logo';
    logo = {
      type: 'image',
      psdName: '蝦皮VIP_LOGO',
      x: round2(centerX - width / 2),
      y: round2(centerY - height / 2),
      width,
      height: round2(height),
      centerX: round2(centerX),
      centerY: round2(centerY),
      keepAspectRatio: true,
      hidden: true,
      locked: false,
    };
    template.layers[key] = logo;

    if (Array.isArray(template.renderOrder)) {
      template.renderOrder = template.renderOrder.filter((item) => item !== key);
      const upperEntry = entries(template).find(([, layer]) => layer === upper);
      const upperKey = upperEntry?.[0];
      const index = upperKey ? template.renderOrder.indexOf(upperKey) : -1;
      template.renderOrder.splice(index >= 0 ? index : template.renderOrder.length, 0, key);
    }
    return logo;
  }

  function applyAppier160Subtitle(template, raw) {
    const upper = findLayer(template, '副標題_上');
    const lower = findLayer(template, '副標題_下');
    if (!upper || !lower) return false;

    const normalized = normalizeManualLineBreaks(raw).trim();
    const manualLines = normalized.split('\n');
    const layoutNo = String(template?.batchRecord?.__layoutNo || '').trim().toLowerCase();
    const isBanner1 = layoutNo === 'banner1';
    let vipLogo = findLayer(template, '蝦皮VIP_LOGO');
    let useVipLogo = false;
    let upperText = '';
    let lowerText = '';
    let forceThirtyPt = false;

    // Appier_banner1_160x600：VIP / 專屬蝦幣 / 25%回饋 三行。
    // 第一行 VIP 以蝦皮VIP_LOGO.svg 取代；後兩行保留在副標題_下。
    const manualVip = isBanner1 && manualLines.length > 1 && /^VIP$/i.test(String(manualLines[0] || '').trim());
    const autoVip = isBanner1 && normalized.match(/^VIP\s*(專屬蝦幣)\s*(\d+(?:\.\d+)?%回饋)$/i);
    if (manualVip || autoVip) {
      useVipLogo = true;
      vipLogo = ensureAppier160VipLogo(template, upper);
      assignImageAsset(vipLogo, '蝦皮VIP_LOGO.svg', '');
      upperText = '';
      if (manualVip) {
        lowerText = manualLines.slice(1).map((line) => String(line || '').trim()).filter(Boolean).join('\n');
      } else {
        lowerText = `${autoVip[1].trim()}\n${autoVip[2].trim()}`;
      }
      // 三行版 VIP 需要與第一行文字區同尺度，避免原本副標題_下 62pt 撐出畫布。
      forceThirtyPt = true;
    } else if (manualLines.length > 1) {
      // Enter 優先：第一行給副標題_上，其餘內容原樣保留在副標題_下。
      upperText = String(manualLines.shift() || '').trim();
      lowerText = manualLines.join('\n').trim();
    } else {
      // Appier_160x600 專屬三行規則：
      // 「全站/商城 + 滿… + 折…」拆成三行。由於模板只有「副標題_上 / 副標題_下」兩層，
      // 第一行放在上層，第二、三行以換行保留在下層。只負責排版，不改寫金額內容。
      const thresholdDiscountMatch = normalized.match(/^(全站|商城)\s*(滿[^折]+)\s*(折.+)$/);
      if (thresholdDiscountMatch) {
        upperText = thresholdDiscountMatch[1].trim();
        lowerText = `${thresholdDiscountMatch[2].trim()}\n${thresholdDiscountMatch[3].trim()}`;
        // 全站滿額折 / 商城滿額折：三行皆以 30pt 為基準，再套 82% 特殊字元規則。
        forceThirtyPt = true;
      } else {
        // Appier_banner2_160x600：「換季家電 / 9折起」拆成兩行。
        const applianceMatch = layoutNo === 'banner2'
          ? normalized.match(/^(換季家電)\s*(9折起)$/)
          : null;
        if (applianceMatch) {
          upperText = applianceMatch[1].trim();
          lowerText = applianceMatch[2].trim();
        } else {
          // 沒有手動斷行或特殊格式時，保留既有行為：尾端百分比自動拆到副標題_下。
          const match = normalized.match(/^(.*?)(\d+(?:\.\d+)?%)$/);
          upperText = match ? match[1].trim() : normalized;
          lowerText = match ? match[2].trim() : '';
        }
      }
    }

    if (forceThirtyPt) {
      setAppier160SubtitleFontSize(upper, 30);
      setAppier160SubtitleFontSize(lower, 30);
    }

    upper.text = upperText;
    lower.text = lowerText;
    upper.hidden = useVipLogo || !upper.text;
    lower.hidden = !lower.text;
    if (vipLogo) vipLogo.hidden = !useVipLogo;

    // 文案每次改變時都先重建單一基準 range，避免原 JSON 範例文字的舊 ranges
    // 汙染新文案（例如原本 % 的小字 range 套到新文案的數字位置）。
    resetAppier160SubtitleBaseRange(upper);
    resetAppier160SubtitleBaseRange(lower);

    // Enter / 自動拆行後仍各自套用 %, $, 逗號、數字後「號」縮小 82% 的共用規則。
    applyNonPriceTextStandard(upper, '副標題_上');
    applyNonPriceTextStandard(lower, '副標題_下');
    // 82% ranges 產生後再強制同步 35pt，確保 renderer 不會從 range 讀回舊行距。
    enforceAppier160LineHeight(upper);
    enforceAppier160LineHeight(lower);
    return true;
  }

  function ensureAppier2048VipSubtitleLayers(template, normal, bg) {
    if (templateSourceId(template) !== 'Appier_2048x1536' || !normal || !bg) return;
    if (findLayer(template, '蝦皮VIP_LOGO') && findLayer(template, '蝦皮VIP_副標題')) return;

    const bgWidth = Math.max(1, Number(bg.width || 1));
    const bgHeight = Math.max(1, Number(bg.height || 1));
    const centerX = centerXOf(bg, Number(template?.canvas?.width || 0) / 2);
    const centerY = Number.isFinite(Number(bg.centerY))
      ? Number(bg.centerY)
      : Number(bg.y || 0) + bgHeight / 2;

    const vipLogoKey = '__om_appier_2048_vip_logo';
    const vipTextKey = '__om_appier_2048_vip_subtitle';
    const logoWidth = round2(bgWidth * 0.3035);
    const logoHeight = round2(bgHeight * 0.634);
    const textHeight = round2(bgHeight * 0.425);
    const vipFontSize = round2(bgHeight * 0.443);

    if (!template.layers[vipLogoKey]) {
      template.layers[vipLogoKey] = {
        type: 'image',
        psdName: '蝦皮VIP_LOGO',
        x: round2(centerX - logoWidth / 2),
        y: round2(centerY - bgHeight * 0.06 - logoHeight / 2),
        width: logoWidth,
        height: logoHeight,
        centerX,
        centerY: round2(centerY - bgHeight * 0.06),
        keepAspectRatio: true,
        hidden: true,
        locked: false,
      };
    }

    if (!template.layers[vipTextKey]) {
      template.layers[vipTextKey] = {
        ...normal,
        psdName: '蝦皮VIP_副標題',
        text: '',
        x: round2(centerX - bgWidth * 0.31),
        y: round2(centerY + bgHeight * 0.03 - textHeight / 2),
        width: round2(bgWidth * 0.62),
        height: textHeight,
        centerX,
        centerY: round2(centerY + bgHeight * 0.03),
        fontSizePx: vipFontSize,
        fontSizePt: vipFontSize,
        lineHeight: round2(vipFontSize * 1.08),
        lineHeightMultiplier: 1.08,
        hidden: true,
        locked: false,
      };
      delete template.layers[vipTextKey].textStyleRanges;
      delete template.layers[vipTextKey].paragraphStyleRanges;
    }

    if (Array.isArray(template.renderOrder)) {
      template.renderOrder = template.renderOrder.filter((key) => key !== vipLogoKey && key !== vipTextKey);
      const normalEntry = entries(template).find(([, layer]) => layer === normal);
      const normalKey = normalEntry?.[0];
      const normalIndex = normalKey ? template.renderOrder.indexOf(normalKey) : -1;
      const insertAt = normalIndex >= 0 ? normalIndex : template.renderOrder.length;
      template.renderOrder.splice(insertAt, 0, vipTextKey, vipLogoKey);
    }
  }

  function applySubtitle(template, record, helpers, diagnostics) {
    const raw = String(record?.['副標'] || '').trim();
    if (!raw) return false;
    const sourceId = templateSourceId(template);
    if (sourceId === 'Appier_160x600') {
      const applied = applyAppier160Subtitle(template, raw);
      if (applied) diagnostics?.push({ field: '副標', status: 'ok', value: raw, target: '副標題_上 / 副標題_下' });
      return applied;
    }

    const normal = findLayer(template, '副標題');
    const bg = findLayer(template, '副標題_底色');
    ensureAppier2048VipSubtitleLayers(template, normal, bg);
    const vipLogo = findLayer(template, '蝦皮VIP_LOGO');
    const vipText = findAnyLayer(template, ['蝦皮VIP_副標題', '蝦皮VIP_副標題_右']);
    const isVip = /^\s*VIP/i.test(raw);
    const centerX = centerXOf(bg, Number(template?.canvas?.width || 0) / 2);

    if (isVip && vipLogo && vipText) {
      const suffix = raw.replace(/^\s*VIP\s*/i, '').trim();
      setVisible(normal, false);
      assignImageAsset(vipLogo, '蝦皮VIP_LOGO.svg', '');
      vipText.text = suffix;
      vipText.hidden = false;
      // 先套 82% 特殊符號 ranges，再量測實際顯示寬度，讓副標題底色跟著真正字寬伸縮。
      applyNonPriceTextStandard(vipText, vipText.psdName || '蝦皮VIP_副標題');
      const textWidth = measure(vipText, helpers);
      vipText.width = textWidth;
      const logoWidth = Math.max(1, Number(vipLogo.width || 1));
      const gap = vipSubtitleGap(template);
      const contentWidth = logoWidth + gap + textWidth;
      const left = centerX - contentWidth / 2;
      vipLogo.x = left;
      vipLogo.centerX = left + logoWidth / 2;
      vipText.x = left + logoWidth + gap;
      vipText.centerX = vipText.x + textWidth / 2;
      resizeBackground(bg, resolveCapsuleWidth(template, contentWidth, 'vip'), centerX);
      diagnostics?.push({ field: '副標', status: 'ok', value: raw, target: '蝦皮VIP_LOGO + 蝦皮VIP_副標題' });
      return true;
    }

    setVisible(vipLogo, false);
    setVisible(vipText, false);
    if (!normal) return false;
    normal.text = raw;
    normal.hidden = false;
    applyNonPriceTextStandard(normal, normal.psdName || '副標題');
    const textWidth = measure(normal, helpers);
    normal.width = textWidth;
    normal.centerX = centerX;
    normal.x = centerX - textWidth / 2;
    resizeBackground(bg, resolveCapsuleWidth(template, textWidth, 'normal'), centerX);
    diagnostics?.push({ field: '副標', status: 'ok', value: raw, target: '副標題' });
    return true;
  }

  function normalizeDpaFrameMauRecord(template, record) {
    if (templateSourceId(template) !== 'DPA Frame_MAU_1080x1080' || !record) return;

    // 保留第一次讀到的完整原始文案。before/after hook 可能在預覽刷新時重跑，
    // 不可用已拆掉「蝦皮直營」的文案再次判斷，否則 Logo 會被錯誤隱藏。
    if (!Object.prototype.hasOwnProperty.call(record, '__dpaRawCopy')) {
      record.__dpaRawCopy = String(record['文案'] || '').trim();
    }
    const rawCopy = String(record.__dpaRawCopy || '').trim();
    const hasDirectShop = rawCopy.includes('蝦皮直營');
    record.__dpaShowDirectLogo = hasDirectShop;
    record['文案'] = hasDirectShop
      ? rawCopy.replace(/蝦皮直營\s*/gu, '').trim()
      : rawCopy;
  }

  function applyDpaFrameMau(template, record, diagnostics) {
    if (templateSourceId(template) !== 'DPA Frame_MAU_1080x1080') return false;

    const directLogo = findLayer(template, '蝦皮直營_LOGO');
    const copyLayer = findLayer(template, '文案');
    const rawCopy = String(record?.__dpaRawCopy || record?.['文案'] || '').trim();
    const showDirectLogo = record?.__dpaShowDirectLogo === true || rawCopy.includes('蝦皮直營');

    if (directLogo && showDirectLogo) assignImageAsset(directLogo, '蝦皮直營_LOGO.svg', '');
    setVisible(directLogo, showDirectLogo);

    if (copyLayer) {
      const copy = showDirectLogo
        ? rawCopy.replace(/蝦皮直營\s*/gu, '').trim()
        : String(record?.['文案'] || '').trim();
      record['文案'] = copy;
      copyLayer.text = copy;
      copyLayer.hidden = !copy;
      applyNonPriceTextStandard(copyLayer, '文案');
      diagnostics?.push({ field: '文案', status: 'ok', value: copy, target: '文案' });
    }
    if (showDirectLogo) {
      diagnostics?.push({ field: '文案', status: 'ok', value: '蝦皮直營', target: '蝦皮直營_LOGO' });
    }
    return true;
  }

  function beforeApplyRecordToTemplate({ template, record, diagnostics, skipExactLayout }) {
    // 新的一筆工單第一次套版時，必須重新建立這個公版自己的 Smart Object Initial。
    // 預覽刷新（skipExactLayout=true）則嚴禁重建 baseline，避免把人工調整後的位置誤當新初始值。
    if (!skipExactLayout) window.SmartAssetManager?.clearTemplateBaselines?.(template);
    normalizeDpaFrameMauRecord(template, record);
    applyStaticAssets(template, record);
    // 只有新工單首次套版才套 edited JSON 校正值；preview refresh 必須保留使用者後續手動調整。
    if (!skipExactLayout) applyCalibratedInitialPlacement(template, record, diagnostics);
    applyProducts(template, record, diagnostics);
    protectImageLayersFromGenericProductMapper(template);
  }

  function afterApplyRecordToTemplate({ template, record, helpers, diagnostics, skipExactLayout }) {
    try {
      applySubtitle(template, record, helpers, diagnostics);
      applyDpaFrameMau(template, record, diagnostics);
      // 全公版非價格文字沿用暖身 BN 的 82% 特殊符號規則；價格層會由模組自動排除。
      window.SPTextStandard?.applyTemplateNonPriceText?.(template);
      applyCalibratedPricePlacement(template, record, diagnostics, { skipExactLayout });
    } finally {
      restoreImageLayerLocks(template);
    }
  }

  function makeRoute(family) {
    return ({ record }) => {
      const templateId = String(record?.__templateId || '').trim();
      if (!templateId) return null;
      return {
        key: family,
        family,
        label: templateId,
        templateId,
        templateFile: `${templateId}.json`,
        outputName: M.normalizeOutputName(record.__outputName || ''),
        outputPrefix: M.mediaPrefix(record.__media || '') || templateId,
      };
    };
  }

  const VIP_SINGLE_PRICE_LAYOUT = Object.freeze([{
    slot: 'single',
    positioningMode: 'product-image-ratio',
    anchorRatioX: 0.66,
    anchorRatioY: 0.56,
    widthRatio: 0.52,
    heightRatio: 0.22,
    fontSizeRatio: 0.105,
    align: 'center',
    color: '#EE4D2D',
    fontWeight: '700',
  }]);

  // 單券（券頭在左、白底券身在右）的價格版型。
  // ratio 由券面素材本身的白底幾何推導，再對齊 om-wave1-initial-placements.js 內
  // banner1（VIP_單券_蝦幣 / _有皇冠）已校正過的比例關係：
  //   anchorRatioX ≈ 白底水平中心、anchorRatioY ≈ 白底垂直中心 + 0.015
  //   widthRatio   ≈ 白底寬度 × 1.16（文字框略寬於白底，置中不會被截）
  //   heightRatio  ≈ 白底高度 × 0.52
  //   fontSizeRatio≈ 白底高度 × 0.465 ÷ 素材寬度
  //   rotation     ≈ 券面傾角 × 1.05
  // 量測值：全站券_單券 813×396、白底 x236–795 / y32–350、傾角 4.03°
  //         商城券_單券 815×396、白底 x236–794 / y33–352、傾角 4.03°
  // 顏色不寫死在這裡也可以：PriceColorResolver 會依「全站券 → #EE4D2D、商城券 → #D0011B」
  // 自動判色，下面的 color 只是取不到規則時的保底值。
  function singleCouponPriceLayout({ anchorRatioX, anchorRatioY, widthRatio, heightRatio, fontSizeRatio, rotation, color }) {
    return Object.freeze([Object.freeze({
      slot: 'single',
      positioningMode: 'product-image-ratio',
      anchorRatioX,
      anchorRatioY,
      widthRatio,
      heightRatio,
      fontSizeRatio,
      rotation,
      align: 'center',
      color,
      fontWeight: '700',
      lineHeightMultiplier: 1.08,
    })]);
  }

  const ALL_SITE_COUPON_PRICE_LAYOUT = singleCouponPriceLayout({
    anchorRatioX: 0.632,
    anchorRatioY: 0.498,
    widthRatio: 0.797,
    heightRatio: 0.417,
    fontSizeRatio: 0.182,
    rotation: 4.22,
    color: '#EE4D2D',
  });

  const MALL_COUPON_PRICE_LAYOUT = singleCouponPriceLayout({
    anchorRatioX: 0.630,
    anchorRatioY: 0.501,
    widthRatio: 0.794,
    heightRatio: 0.418,
    fontSizeRatio: 0.182,
    rotation: 4.22,
    color: '#D0011B',
  });

  const PRICE_RULES = Object.freeze({
    enabled: true,
    productFirst: true,
    // 加入 P_01：Appier / Rtbhouse 沒有 P 槽，單品時實體圖層是 P_01。
    // 'P' 排在前面，所以有 P 槽的公版行為不變。
    anchorLayerNames: ['P', 'P_01', '商品圖1', '曝品'],
    productLayouts: {
      'VIP_單券_蝦幣': { layouts: VIP_SINGLE_PRICE_LAYOUT },
      'VIP_單券_蝦幣_有皇冠': { layouts: VIP_SINGLE_PRICE_LAYOUT },
      // 25節 wave2 新增：工單「Icon/曝品」寫這兩個名字時，「價格」欄會自動代入券身。
      '全站券_單券': { layouts: ALL_SITE_COUPON_PRICE_LAYOUT },
      '商城券_單券': { layouts: MALL_COUPON_PRICE_LAYOUT },
    },
  });

  window.OMWave1Layout = Object.freeze({
    assignImageAsset,
    applyStaticAssets,
    findLayer,
    beforeApplyRecordToTemplate,
    afterApplyRecordToTemplate,
    makeRoute,
    PRICE_RULES,
  });
})();
