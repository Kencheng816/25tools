/* LineOA Wave2 dedicated layout / mapping rules. */
(function registerLineOAWave2Rules() {
  'use strict';

  const L = window.OMWave1Layout;
  const M = window.OMWave1TemplateMatcher;
  const FAMILY = 'om_wave1_lineoa';
  const TARGETS = Object.freeze([
    'LineOA_Template_一般 01',
    'LineOA_Template_創貼 05',
    'LineOA_Template_25 spike 創貼 14',
  ]);

  const LOGO_ASSETS = Object.freeze({
    '蝦皮購物袋': '蝦皮購物_LOGO_白.svg',
    '蝦皮商城': '蝦皮商城_LOGO_白.svg',
    '直式_蝦皮直營': '直式_蝦皮直營_LOGO_白.svg',
    '蝦皮直營': '直式_蝦皮直營_LOGO_白.svg',
  });

  const CTA_DISABLED = /^(?:x(?:\s*請拿掉)?|請拿掉|不需要|無|none)$/i;
  const CTA_CORNER_RULE = Object.freeze({
    'CTA_BG': { fixed: 22 },
    '券1_CTA_BG': { fixed: 10 },
    '券2_CTA_BG': { fixed: 10 },
  });

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }
  function entries(template) { return Object.entries(template?.layers || {}); }
  function nameOf(key, layer) { return String(layer?.psdName || layer?.name || key || '').trim(); }
  function findLayer(template, name) { return L?.findLayer?.(template, name) || entries(template).find(([key, layer]) => nameOf(key, layer) === name)?.[1] || null; }
  function sourceId(template) {
    return String(template?.sheetTemplateRoute?.sourceTemplateId || template?.canvas?.templateId || template?.batchSourceName || '').trim();
  }
  function setVisible(layer, visible) { if (layer) layer.hidden = !visible; }

  function dynamicPadding(template) {
    const width = Number(template?.canvas?.width || 0);
    const height = Number(template?.canvas?.height || 0);
    const minSide = Math.max(1, Math.min(width || 1, height || 1));
    return Math.max(10, Math.min(50, Math.round(minSide * 0.045)));
  }

  function styleRoundedCtaBackground(layer, fixedRadius) {
    if (!layer || layer.type !== 'shape') return false;
    const height = Math.max(1, Number(layer.height || layer.shape?.pathBounds?.height || 0));
    const radius = Number.isFinite(Number(fixedRadius))
      ? Number(fixedRadius)
      : Math.max(1, Math.round(height * 0.2));
    layer.useDynamicBounds = true;
    layer.shape = layer.shape || {};
    layer.shape.kind = 'roundedRectangle';
    layer.shape.cornerRadius = radius;
    layer.shape.geometry = layer.shape.geometry || {};
    layer.shape.geometry.kind = 'roundedRectangle';
    layer.shape.fill = layer.shape.fill || layer.fill || '#EE4D2D';
    layer.shape.pathBounds = {
      x: Number(layer.x || 0),
      y: Number(layer.y || 0),
      width: Number(layer.width || 0),
      height: Number(layer.height || 0),
      centerX: Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : Number(layer.x || 0) + Number(layer.width || 0) / 2,
      centerY: Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) : Number(layer.y || 0) + Number(layer.height || 0) / 2,
    };
    delete layer.shape.vectorPath;
    delete layer.shape.bezierPoints;
    return true;
  }

  function styleAllLineOACtaBackgrounds(template) {
    Object.entries(CTA_CORNER_RULE).forEach(([layerName, rule]) => {
      const layer = findLayer(template, layerName);
      if (!layer) return;
      styleRoundedCtaBackground(layer, rule.fixed);
    });
  }

  function rebuildSubtitleHexagon(bg, targetWidth, centerX) {
    if (!bg) return false;
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
    bg.centerX = round2(Number(centerX));
    bg.centerY = round2(currentCenterY);
    bg.hidden = false;
    bg.type = 'shape';
    bg.useDynamicBounds = true;
    bg.fill = fill;
    bg.shape = bg.shape || {};
    bg.shape.kind = 'path';
    bg.shape.fill = fill;
    bg.shape.stroke = { ...(bg.shape.stroke || {}), enabled: false };
    bg.shape.fillEnabled = true;
    bg.shape.vectorPath = vectorPath;
    bg.shape.bezierPoints = vectorPath.map((point) => JSON.parse(JSON.stringify(point)));
    bg.shape.pathBounds = {
      x: bg.x, y: bg.y, width: bg.width, height: bg.height,
      centerX: bg.centerX, centerY: bg.centerY,
    };
    if (bg.shape.geometry) delete bg.shape.geometry;
    delete bg.shape.polygonSides;
    delete bg.shape.startAngleDeg;
    return true;
  }

  function applyLineOASubtitleHexagon(template, helpers) {
    const bg = findLayer(template, '副標題_底色');
    const subtitle = findLayer(template, '副標題');
    if (!bg || !subtitle || subtitle.type !== 'text') return false;

    window.SPTextStandard?.applyNonPriceTextLayer?.(subtitle, subtitle.psdName || '副標題');
    const textWidth = Math.max(1, Number(helpers?.measureTextWidth?.(subtitle) || subtitle.width || 1));
    subtitle.width = textWidth;

    const centerX = Number.isFinite(Number(bg.centerX))
      ? Number(bg.centerX)
      : Number(subtitle.centerX || subtitle.x || 0) + textWidth / 2;

    subtitle.centerX = centerX;
    subtitle.x = centerX - textWidth / 2;

    const width = textWidth + dynamicPadding(template) * 2;
    rebuildSubtitleHexagon(bg, width, centerX);
    return true;
  }

  function applyText(template, layerName, value, diagnostics, field = layerName) {
    if (value == null || String(value).trim() === '') return false;
    const layer = findLayer(template, layerName);
    if (!layer || layer.type !== 'text') {
      diagnostics?.push({ field, status: 'missing-layer', value: String(value), target: layerName });
      return false;
    }
    layer.text = String(value).trim();
    layer.hidden = false;
    window.SPTextStandard?.applyNonPriceTextLayer?.(layer, layerName);
    diagnostics?.push({ field, status: 'ok', value: layer.text, target: layerName });
    return true;
  }
  function applyImage(template, layerName, filename, assetProject, diagnostics, field, rawValue) {
    const layer = findLayer(template, layerName);
    if (!layer || layer.type !== 'image') {
      diagnostics?.push({ field, status: 'missing-layer', value: rawValue || filename, target: layerName });
      return false;
    }
    L?.assignImageAsset?.(layer, filename, assetProject || '');
    layer.hidden = false;
    diagnostics?.push({ field, status: 'ok', value: rawValue || filename, target: `${layerName} → ${filename}` });
    return true;
  }

  function resolvePromoAsset(value) {
    const raw = String(value || '').trim();
    const compact = raw.toLowerCase().replace(/[\s_()（）\[\]【】]/g, '');
    if (compact.includes('蝦幣icon')) return '蝦幣Icon_60蝦幣.png';
    if (compact.includes('免運車')) return '免運車.png';
    if (compact.includes('vip') && compact.includes('券') && compact.includes('5折')) return 'VIP_單券_5折_有皇冠.png';
    return '';
  }

  function applyCtaGroup(template, prefix, rawValue, diagnostics) {
    if (rawValue == null || String(rawValue).trim() === '') return false; // 沒寫 CTA：保留 JSON 原狀。
    const value = String(rawValue).trim();
    const disabled = CTA_DISABLED.test(value);
    const names = [`${prefix}CTA_文案`, `${prefix}CTA_BG`, `${prefix}CTA_三角形`, `${prefix}CTA_箭頭`];
    names.forEach((name) => {
      const layer = findLayer(template, name);
      if (layer) setVisible(layer, !disabled);
    });
    if (!disabled) applyText(template, `${prefix}CTA_文案`, value, diagnostics, `${prefix}CTA`);
    else diagnostics?.push({ field: `${prefix}CTA`, status: 'ok', value, target: 'CTA 整組隱藏' });
    return true;
  }

  function applyCouponSections(template, record, diagnostics) {
    ['券1', '券2'].forEach((section) => {
      const logoValue = String(record?.[`${section}_LOGO`] || '').trim();
      if (logoValue) {
        const filename = LOGO_ASSETS[logoValue] || '';
        if (filename) applyImage(template, `${section}_LOGO`, filename, '', diagnostics, `${section}_LOGO`, logoValue);
        else diagnostics?.push({ field: `${section}_LOGO`, status: 'missing', value: logoValue, target: 'LineOA Logo 對照表' });
      }
      applyText(template, `${section}_主標題`, record?.[`${section}_主標`], diagnostics, `${section}_主標`);
      applyText(template, `${section}_副標題`, record?.[`${section}_副標`], diagnostics, `${section}_副標`);
      applyCtaGroup(template, `${section}_`, record?.[`${section}_CTA`], diagnostics);
    });
  }

  function applyLowerSections(template, record, diagnostics) {
    ['下左', '下中', '下右'].forEach((section) => {
      const promo = String(record?.[`${section}_曝品`] || '').trim();
      if (promo) {
        const filename = resolvePromoAsset(promo);
        if (filename) applyImage(template, `${section}_曝品`, filename, '共用素材', diagnostics, `${section}_曝品`, promo);
        else diagnostics?.push({ field: `${section}_曝品`, status: 'missing', value: promo, target: 'LineOA 曝品關鍵字' });
      }
      applyText(template, `${section}_文案`, record?.[`${section}_文案`], diagnostics, `${section}_文案`);
      // 一般 01 目前沒有 CTA layer；仍解析 X/請拿掉，若未來 JSON 新增 CTA，這裡會自動套用。
      applyCtaGroup(template, `${section}_`, record?.[`${section}_CTA`], diagnostics);
    });
  }

  function ensureBnUploadSlot(template, options = {}) {
    if (sourceId(template) !== 'LineOA_Template_一般 01') return null;
    const mask = findLayer(template, '載入BN範圍');
    const outline = findLayer(template, '載入BN範圍_線條');
    if (!mask) return null;

    // 這兩個 Shape 只負責視覺與遮罩，不要攔截畫布點擊；點擊要落到「載入BN圖片」。
    mask.locked = true;
    mask.__nonInteractive = true;
    if (outline) {
      outline.locked = true;
      outline.__nonInteractive = true;
      outline.useDynamicBounds = true;
      outline.fillEnabled = false;
      outline.shape = outline.shape || {};
      outline.shape.fillEnabled = false;
      outline.shape.cornerRadius = 20;
      outline.shape.kind = 'roundedRectangle';
      outline.shape.geometry = { ...(outline.shape.geometry || {}), kind: 'roundedRectangle' };
      outline.shape.stroke = { ...(outline.shape.stroke || {}), enabled: true, width: 3, color: '#FFFFFF' };
    }
    mask.useDynamicBounds = true;
    mask.fill = '#D0011B';
    mask.shape = mask.shape || {};
    mask.shape.fill = '#D0011B';
    mask.shape.cornerRadius = 20;
    mask.shape.kind = 'roundedRectangle';
    mask.shape.geometry = { ...(mask.shape.geometry || {}), kind: 'roundedRectangle' };

    const key = '__lineoa_bn_upload';
    let layer = template.layers?.[key];
    if (!layer) {
      layer = {
        type: 'image',
        psdName: '載入BN圖片',
        assetFilename: '',
        assetCandidates: [],
        assetProject: '',
        keepAspectRatio: true,
        sizingMode: 'coverByPBox',
        maskLayerName: '載入BN範圍',
        role: 'lineoa_bn_upload',
        hidden: false,
        locked: false,
        __uploadSlot: true,
        __uploadPrompt: '+上傳圖片',
        __uploadPromptColor: '#FFFFFF',
        __uploadPromptFontSize: 30,
      };
      template.layers[key] = layer;
    }

    if (options.resetGeometry || !Number.isFinite(Number(layer.centerX))) {
      const width = Number(mask.width || 1);
      const height = Number(mask.height || 1);
      const centerX = Number.isFinite(Number(mask.centerX)) ? Number(mask.centerX) : Number(mask.x || 0) + width / 2;
      const centerY = Number.isFinite(Number(mask.centerY)) ? Number(mask.centerY) : Number(mask.y || 0) + height / 2;
      layer.x = Number(mask.x || 0);
      layer.y = Number(mask.y || 0);
      layer.width = width;
      layer.height = height;
      layer.centerX = centerX;
      layer.centerY = centerY;
      layer.targetWidth = width;
      layer.targetHeight = height;
      layer.rotation = 0;
      layer.sizingMode = 'coverByPBox';
    }

    template.renderOrder = Array.isArray(template.renderOrder) ? template.renderOrder : [];
    template.renderOrder = template.renderOrder.filter((item) => item !== key);
    const outlineEntry = entries(template).find(([candidateKey, candidateLayer]) => candidateLayer === outline);
    const outlineKey = outlineEntry?.[0];
    const outlineIndex = outlineKey ? template.renderOrder.indexOf(outlineKey) : -1;
    template.renderOrder.splice(outlineIndex >= 0 ? outlineIndex : template.renderOrder.length, 0, key);
    return layer;
  }

  function applyTopLevel(template, record, diagnostics, helpers) {
    applyText(template, '主標題', record?.['主標'], diagnostics, '主標');
    applyText(template, '副標題', record?.['副標'], diagnostics, '副標');
    applyText(template, '警語', record?.['警語'], diagnostics, '警語');
    applyCtaGroup(template, '', record?.['CTA'], diagnostics);

    const couponHeaderLogo = String(record?.['券頭LOGO'] || '').trim();
    if (couponHeaderLogo) {
      const filename = LOGO_ASSETS[couponHeaderLogo] || '';
      if (filename) applyImage(template, '券頭LOGO', filename, '', diagnostics, '券頭LOGO', couponHeaderLogo);
      else diagnostics?.push({ field: '券頭LOGO', status: 'missing', value: couponHeaderLogo, target: 'LineOA Logo 對照表' });
    }
    applyLineOASubtitleHexagon(template, helpers);
    // 券頭底色依已確認規格 C：本版不處理，完整保留 JSON 原始顏色。
  }

  function beforeApplyRecordToTemplate({ template, record, diagnostics, skipExactLayout }) {
    L?.applyStaticAssets?.(template, record);
    styleAllLineOACtaBackgrounds(template);
    ensureBnUploadSlot(template, { resetGeometry: !skipExactLayout });
    diagnostics?.push({ field: 'LineOA', status: 'ok', value: record?.__layoutNo || '', target: sourceId(template) });
  }

  function afterApplyRecordToTemplate({ template, record, diagnostics, helpers }) {
    applyTopLevel(template, record, diagnostics, helpers);
    applyCouponSections(template, record, diagnostics);
    applyLowerSections(template, record, diagnostics);
    styleAllLineOACtaBackgrounds(template);
    window.SPTextStandard?.applyTemplateNonPriceText?.(template);
  }

  function resolveOutputNameForTemplate({ record, template }) {
    const width = Math.max(1, Math.round(Number(template?.canvas?.width || 0)));
    const height = Math.max(1, Math.round(Number(template?.canvas?.height || 0)));
    const layoutNo = String(record?.__layoutNo || '').trim();
    if (!width || !height || !layoutNo) return '';
    return M.normalizeOutputName(`lineoa_${width}x${height}_${layoutNo}`);
  }

  window.TemplateRuleRegistry.register(FAMILY, {
    label: 'LineOA',
    priority: 500,
    targets: TARGETS,
    tokens: ['LineOA_Template', 'lineoa'],
    rules: {
      beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate,
      resolveRecordTemplateRoute: L.makeRoute(FAMILY),
      resolveOutputNameForTemplate,
    },
  });
})();
