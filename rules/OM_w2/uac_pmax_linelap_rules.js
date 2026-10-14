(function registerUacPmaxLineLapRules() {
  'use strict';
  const L = window.OMWave1Layout;
  window.TemplateRuleRegistry.register('om_wave1_uac_pmax_linelap', {
    label: 'UAC/Pmax/LineLAP', priority: 300,
    targets: ['UAC_Pmax_LineLAP_1200x1200', 'UAC_Pmax_LineLAP_1200x628', 'UAC_Pmax_LineLAP_600x400', 'UAC_Pmax_LineLAP_960x1200'],
    tokens: ['UAC_Pmax_LineLAP', 'UAC/Pmax/LineLAP'],
    rules: {
      priceRules: L.PRICE_RULES,
      beforeApplyRecordToTemplate: L.beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: L.afterApplyRecordToTemplate,
      resolveRecordTemplateRoute: L.makeRoute('om_wave1_uac_pmax_linelap'),
    },
  });
})();
