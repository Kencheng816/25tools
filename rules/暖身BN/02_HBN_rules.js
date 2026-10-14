/* 02_HBN 公版規則
 * 共用流程由 rules/shared/warmup-banner-rule-factory.js 管理；本檔只保留 HBN 差異設定。
 */
(function registerHbnWarmupRule() {
  'use strict';

  window.WarmupBannerRuleFactory.register({
    ruleKey: 'hbn_25_bn_warmup',
    label: '25節 暖身 HBN',
    tokens: ['HBN'],
    targets: ['02_HBN', 'HBN'],
    priority: 10,
    templateType: 'hbn_bn_warmup',
    outputPrefix: '02_HBN',
    templateAssetFolder: '02_HBN',
    productAssetFolder: '共用素材',
    smartAssetIdentity: '02_HBN',
    priceLayoutKeys: ['02_HBN', 'HBN'],
    mainCenterX: 340.5,
    mainGroupGap: 9,
    priceBigFontSize: 48,
    fontSizes: {
      plain: 75,
      vip: 60.66,
      direct: 75,
      subtitle: 58,
    },
  });

  window.__HBN_RULE_VERSION = '2026-08-05m｜WarmupBannerRuleFactory Clean Code 重構｜承05k';
})();
