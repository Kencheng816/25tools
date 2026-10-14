/* 08_IG Story 公版規則
 *
 * 與 DD Card / POPUP 共用 WarmupBannerRuleFactory；IG Story 只宣告版位差異：
 * 1. 主標 / VIP 主標群組、副標、保護文字統一置中於 900px 畫布中心（X=450）。
 * 2. VIP 主標使用「蝦皮VIP_LOGO + 蝦皮VIP_主標題_右」，固定 gap 8px。
 * 3. 主標 / VIP 主標 / 副標 / 保護文字保留 JSON 原始字級與顏色；特殊符號由 SPTextStandard 套 82%。
 * 4. 副標題_底色完整沿用 DD Card：主副標寬度比較 / padding / 六角形造型；Y、高度與填色以 IG Story JSON 為基準。
 * 5. 商品圖與素材搜尋沿用共用流程：08_IG Story -> 共用素材。
 */
(function registerIgStoryWarmupRule() {
  'use strict';

  window.WarmupBannerRuleFactory.register({
    ruleKey: 'ig_story_25_bn_warmup',
    label: '25節 暖身 IG Story',
    tokens: ['IG Story', 'IG'],
    targets: ['08_IG Story', 'IG Story'],
    priority: 30,
    legacyPresetOptional: true,
    templateType: 'ig_story_bn_warmup',
    outputPrefix: '08_IG_Story',
    templateAssetFolder: '08_IG Story',
    productAssetFolder: '共用素材',
    smartAssetIdentity: '08_IG Story',
    priceLayoutKeys: ['08_IG Story', 'IG Story'],
    mainCenterX: function (template) {
      return Number(template && template.canvas && template.canvas.width) / 2;
    },
    subtitleCenterX: function (template) {
      return Number(template && template.canvas && template.canvas.width) / 2;
    },
    mainGroupGap: 8,
    enableDirectVariant: false,
    // IG Story 工單曝光欄使用「暖身 - 正式」；不可用 Factory 預設的精確暖身/正式驗證。
    blockParserValidateWarmupExposure: false,
    fontSizes: {},
  });

  window.__IG_STORY_RULE_VERSION = '2026-08-11b｜副標底色六角形｜支援暖身-正式曝光｜保護文字導入修正';
})();
