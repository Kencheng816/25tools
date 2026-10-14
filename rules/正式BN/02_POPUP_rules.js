/* 02_POPUP 公版規則（25節 正式）
 *
 * 工單解析、商品素材、價格語意與 HBN / DD Card 共用 WarmupBannerRuleFactory。
 * 本檔只宣告 POPUP 的差異：
 * - 副標題_底色依實際副標群組寬度動態伸縮（content-padding 模式）
 * - 商品圖必須在 02_POPUP 或 共用素材 中找到
 *
 * 2026-08-12 正式案調整（依新 02_POPUP.json 圖層結構）：
 * 1. targets / 資料夾 / 輸出檔名改用 V0.0 新名稱 02_POPUP（保留通用 token「POPUP」）。
 * 2. 副標底色圖層改用 factory 預設「副標題_底色」（舊版為「副標題_底圖」，已移除覆寫）。
 * 3. VIP 主標改為獨立置中圖層「蝦皮VIP_主標題」，不再與 LOGO 配對（vipLogo 設空）。
 * 4. VIP 副標 LOGO 改用「蝦皮VIP_LOGO」（新 PSD 中該 LOGO 位於副標列，取代舊 蝦皮VIP_LOGO_2）。
 * 5. CTA 已內建於 KV_BG 背景圖，無 CTA 圖層；ctaHandledByBackground: true 補 ok 診斷。
 * 6. 已知限制（使用者確認）：新 JSON 無蝦皮直營圖層，若主標出現「蝦皮直營」開頭將靜默跳過主標。
 * 7. legacyPresetOptional: true 維持——正式案無暖身 Preset，新公版 JSON 即初始基準。
 */
(function registerPopupFormalRule() {
  'use strict';

  window.WarmupBannerRuleFactory.register({
    ruleKey: 'popup_25_bn_formal',
    label: '25節 正式 POPUP',
    tokens: ['POPUP'],
    targets: ['02_POPUP', 'POPUP'],
    priority: 20,
    legacyPresetOptional: true,
    templateType: 'popup_bn_formal',
    outputPrefix: '02_POPUP',
    outputIncludeExposure: false,
    templateAssetFolder: '02_POPUP',
    productAssetFolder: '共用素材',
    smartAssetIdentity: '02_POPUP',
    priceLayoutKeys: ['02_POPUP', 'POPUP'],
    // 2026-08-13：下載圖片依版位分資料夾；依規格表模式 POPUP 一律輸出 PNG（使用者確認）。
    exportConfig: { format: 'png', folder: '02_POPUP' },
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
    // 取自 02_POPUP.json 的原始 Logo/文字間距；只動 X，不改各圖層既有 Y。
    mainGroupGaps: { vip: 6, direct: 7 },
    subtitleGroupGap: 5,
    priceBigFontSize: 48,
    fontSizes: {},
    layerKeys: {
      vipTitle: '蝦皮VIP_主標題',
      vipLogo: '',
      vipSubtitleLogo: '蝦皮VIP_LOGO',
    },
    vipSubtitleSplit: true,
    subtitleBackgroundMode: 'content-padding',
    // POPUP 原比例為 40/62；以目前 65px 高度為基準，左右各縮減 10px 後換算成等比例 padding。
    subtitlePaddingRatio: (40 / 62) - (10 / 65),
    ctaHandledByBackground: true,
    requiredFields: ['主標', '副標', '保護文字', '商品圖1'],
    requireProductAsset: true,
  });

  window.__POPUP_RULE_VERSION = '2026-08-12a｜正式案02_POPUP｜新圖層對應（VIP主標獨立/副標LOGO/底色）＋CTA內建背景';
})();
