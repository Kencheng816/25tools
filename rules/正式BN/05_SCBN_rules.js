/* 05_SCBN 公版規則（25節 正式，2026-08-14）
 * 1200x200（使用者確認：本次為此尺寸，工單尺寸標示由使用者自行調整）。
 * 主標：VIP → 蝦皮VIP_LOGO＋蝦皮VIP_文案_右；非 VIP → 文案（63pt 白）。
 * 共用流程見 rules/shared/simple-banner-rule-factory.js。
 */
(function registerScbnRule() {
  'use strict';

  window.SimpleBannerRuleFactory.register({
    ruleKey: 'scbn_25_bn_formal',
    label: '25節 正式 SCBN',
    tokens: ['SCBN'],
    targets: ['05_SCBN', 'SCBN'],
    priority: 60,
    templateType: 'scbn_bn_formal',
    outputPrefix: '05_SCBN',
    templateAssetFolder: '05_SCBN',
    layerKeys: {
      titlePlain: '文案',
      vipLogo: '蝦皮VIP_LOGO',
      vipRight: '蝦皮VIP_文案_右',
    },
    priceBigFontSize: 44,
    exportConfig: { format: 'jpg', folder: '05_SCBN' },
  });

  window.__SCBN_RULE_VERSION = '2026-08-14a｜新版位05_SCBN';
})();
