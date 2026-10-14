/* 06_SKBN NUZ_APP 公版規則（25節 正式，2026-08-14）
 * 600x360。主標必為 VIP 型（模板無一般標題圖層，非 VIP 報錯——使用者確認）。
 * 工單「商品圖2」表頭視為價格（過渡相容）。
 */
(function registerSkbnNuzAppRule() {
  'use strict';

  window.SimpleBannerRuleFactory.register({
    ruleKey: 'skbn_nuz_app_25_bn_formal',
    label: '25節 正式 SKBN NUZ_APP',
    tokens: ['SKBN NUZ_APP', 'SKBNNUZAPP'],
    targets: ['06_SKBN NUZ_APP', 'SKBN NUZ_APP'],
    priority: 61,
    templateType: 'skbn_nuz_app_bn_formal',
    outputPrefix: '06_SKBN_NUZ_APP',
    templateAssetFolder: '06_SKBN NUZ_APP',
    layerKeys: {
      titlePlain: '',
      vipLogo: '蝦皮VIP_LOGO',
      vipRight: '蝦皮VIP_主標題_右',
    },
    priceBigFontSize: 44,
    exportConfig: { format: 'jpg', folder: '06_SKBN NUZ_APP' },
  });

  window.__SKBN_NUZ_APP_RULE_VERSION = '2026-08-14a｜新版位06_SKBN NUZ_APP';
})();
