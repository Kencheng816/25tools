/* FB/Linelap 公版規則（25節 外廣 OM wave2 新增）
 * 對應公版：templates/FB_Linelap_{1200x1200,1200x628,960x1200,600x400}.json
 * 工單「曝光媒體」欄位值為 FB/Linelap，由 OMWave1TemplateMatcher 正規化後路由到本家族。
 * 版型邏輯與 UAC_Pmax_LineLAP 同一套 PSD，因此共用 OMWave1Layout 的 hook 與價格規則。
 */
(function registerFbLinelapRules() {
  'use strict';
  const L = window.OMWave1Layout;
  window.TemplateRuleRegistry.register('om_wave1_fb_linelap', {
    label: 'FB/Linelap', priority: 300,
    targets: ['FB_Linelap_1200x1200', 'FB_Linelap_1200x628', 'FB_Linelap_600x400', 'FB_Linelap_960x1200'],
    tokens: ['FB_Linelap', 'FB/Linelap'],
    rules: {
      priceRules: L.PRICE_RULES,
      beforeApplyRecordToTemplate: L.beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: L.afterApplyRecordToTemplate,
      resolveRecordTemplateRoute: L.makeRoute('om_wave1_fb_linelap'),
    },
  });
})();
