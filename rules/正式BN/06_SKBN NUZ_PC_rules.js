/* 06_SKBN NUZ_PC 公版規則（25節 正式，2026-08-14）
 * 600x110。常態顯示 25號_白字、白色直線（使用者規則5）。
 * 主標：VIP → 蝦皮VIP_LOGO＋餘文→title（黃字）；非 VIP → 全文進 title、隱藏 VIP LOGO。
 * 輸出 PNG（使用者先前確認 SKBN NUZ_PC 一律 PNG）。
 */
(function registerSkbnNuzPcRule() {
  'use strict';

  window.SimpleBannerRuleFactory.register({
    ruleKey: 'skbn_nuz_pc_25_bn_formal',
    label: '25節 正式 SKBN NUZ_PC',
    tokens: ['SKBN NUZ_PC', 'SKBNNUZPC'],
    targets: ['06_SKBN NUZ_PC', 'SKBN NUZ_PC'],
    priority: 62,
    templateType: 'skbn_nuz_pc_bn_formal',
    outputPrefix: '06_SKBN_NUZ_PC',
    templateAssetFolder: '06_SKBN NUZ_PC',
    layerKeys: {
      titlePlain: 'title',
      vipLogo: '蝦皮VIP_LOGO',
      vipRight: 'title', // VIP 與一般共用 title 圖層（VIP 時 LOGO 顯示、title 放餘文）
    },
    alwaysShowLayers: ['25號_白字', '白色直線'],
    priceBigFontSize: 26,
    priceBoxWidth: 100,
    exportConfig: { format: 'png', folder: '06_SKBN NUZ_PC' },
  });

  window.__SKBN_NUZ_PC_RULE_VERSION = '2026-08-14a｜新版位06_SKBN NUZ_PC';
})();
