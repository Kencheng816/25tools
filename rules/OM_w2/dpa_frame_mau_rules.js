(function registerDpaFrameMauRules() {
  'use strict';
  const L = window.OMWave1Layout;
  window.TemplateRuleRegistry.register('om_wave1_dpa_frame_mau', {
    label: 'DPA Frame_MAU', priority: 300,
    targets: ['DPA Frame_MAU_1080x1080'],
    tokens: ['DPA', 'DPA Frame_MAU'],
    rules: {
      priceRules: L.PRICE_RULES,
      beforeApplyRecordToTemplate: L.beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: L.afterApplyRecordToTemplate,
      resolveRecordTemplateRoute: L.makeRoute('om_wave1_dpa_frame_mau'),
    },
  });
})();
