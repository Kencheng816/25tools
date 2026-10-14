/* Warmup Price Style Resolver
 *
 * Single source of truth for semantic price styling shared by HBN / DD Card / POPUP.
 * This module owns price meaning only (layout kind, typography, colors, double-coupon semantics).
 * It never owns placement geometry; each Rule/Placement Preset remains responsible for X/Y/size/rotation.
 */
(function initWarmupPriceStyleResolver() {
  'use strict';

  var PRICE_COLORS = Object.freeze({
    ALL_SITE: '#EE4D2D',
    MALL: '#D0011B',
  });

  var DEFAULT_COLOR_RULES = Object.freeze([
    Object.freeze({ keyword: '蝦皮直營', category: 'SCS0', color: PRICE_COLORS.MALL }),
    Object.freeze({ keyword: '商城', color: PRICE_COLORS.MALL }),
    Object.freeze({ keyword: '全站', color: PRICE_COLORS.ALL_SITE }),
  ]);

  function create(config) {
    config = config || {};
    var rules = {
      typography: {
        defaultBigFontSize: Number(config.priceBigFontSize || 48),
        smallRatio: 0.795,
        bigTokens: ['現折', '回饋'],
        smallTokens: ['蝦幣', '折', '起'],
        defaultSize: 'big',
        fontSizeRules: [{ default: true, fontSizePx: Number(config.priceBigFontSize || 48) }],
      },
      colorRules: Array.isArray(config.priceColorRules)
        ? config.priceColorRules
        : DEFAULT_COLOR_RULES,
      slotColorRules: [
        {
          // 商品圖由上至下為：商城券、全站券。
          keyword: '商城券加全站券',
          colors: { bottom: PRICE_COLORS.MALL, top: PRICE_COLORS.ALL_SITE },
        },
        {
          // 商品圖由上至下為：全站券、商城券。
          keyword: '全站券加商城券',
          colors: { bottom: PRICE_COLORS.ALL_SITE, top: PRICE_COLORS.MALL },
        },
        {
          regex: 'VIP.*商城|VIP加商城券',
          flags: 'i',
          colors: { bottom: '#FF770F', top: PRICE_COLORS.MALL },
        },
      ],
    };

    // 只允許樣式/語意覆寫；任何定位、anchor、rotation、templateLayouts 都不屬於本 Resolver。
    var overrides = config.priceStyleOverrides || {};
    var forbiddenGeometryKeys = { templateLayouts: true, anchorLayerNames: true, doublePrice: true };
    Object.keys(overrides).forEach(function (key) {
      if (forbiddenGeometryKeys[key]) return;
      rules[key] = overrides[key];
    });
    return rules;
  }

  window.WarmupPriceStyleResolver = Object.freeze({
    VERSION: '1.1.1',
    PRICE_COLORS: PRICE_COLORS,
    DEFAULT_COLOR_RULES: DEFAULT_COLOR_RULES,
    create: create,
  });
})();
