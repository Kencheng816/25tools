/* 04_POPUP 公版規則
 *
 * 工單解析、商品素材、價格語意與 HBN / DD Card 共用 WarmupBannerRuleFactory。
 * 本檔只宣告 POPUP 的差異：
 * - 一般 / VIP / 蝦皮直營主標三型態
 * - VIP 副標 Logo + 右側文字
 * - 副標題_底圖依實際副標群組寬度動態伸縮
 * - 商品圖必須在 04_POPUP 或 共用素材 中找到
 * - CTA 預設為文字；圖片型 CTA 清單目前為空
 */
(function registerPopupWarmupRule() {
  'use strict';

  window.WarmupBannerRuleFactory.register({
    ruleKey: 'popup_25_bn_warmup',
    label: '25節 暖身 POPUP',
    tokens: ['POPUP'],
    targets: ['04_POPUP', 'POPUP'],
    priority: 20,
    legacyPresetOptional: true,
    templateType: 'popup_bn_warmup',
    outputPrefix: 'POPUP',
    outputIncludeExposure: false,
    templateAssetFolder: '04_POPUP',
    productAssetFolder: '共用素材',
    smartAssetIdentity: '04_POPUP',
    priceLayoutKeys: ['04_POPUP', 'POPUP'],
    mainCenterX: function (template) {
      var title = template && template.layers && template.layers.title;
      var center = Number(title && title.centerX);
      return isFinite(center) ? center : Number(template && template.canvas && template.canvas.width) / 2;
    },
    subtitleCenterX: function (template) {
      var subtitle = template && template.layers && template.layers.subtitle;
      var center = Number(subtitle && subtitle.centerX);
      return isFinite(center) ? center : Number(template && template.canvas && template.canvas.width) / 2;
    },
    // 取自 04_POPUP.json 的原始 Logo/文字間距；只動 X，不改各圖層既有 Y。
    mainGroupGaps: { vip: 6, direct: 7 },
    subtitleGroupGap: 5,
    priceBigFontSize: 48,
    fontSizes: {},
    layerKeys: { subBg: '副標題_底圖' },
    vipSubtitleSplit: true,
    subtitleBackgroundMode: 'content-padding',
    // POPUP 原比例為 40/62；以目前 65px 高度為基準，左右各縮減 10px 後換算成等比例 padding。
    subtitlePaddingRatio: (40 / 62) - (10 / 65),
    hideCtaWhenBlank: true,
    requiredFields: ['主標', '副標', '保護文字', '商品圖1'],
    requireProductAsset: true,
    imageCtaValues: [],
    ctaImageFallbackToText: true,
  });

  window.__POPUP_RULE_VERSION = '2026-08-10b｜POPUP副標底圖左右間距各縮減10px（比例換算）';
})();
