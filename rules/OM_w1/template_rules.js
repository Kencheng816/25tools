(function registerTemplateRules() {
  'use strict';
  const L = window.OMWave1Layout;
  window.TemplateRuleRegistry.register('om_wave1_template', {
    label: 'Template', priority: 300,
    targets: ['Template_1200x1200', 'Template_1200x628', 'Template_600x400'],
    tokens: ['Template'],
    rules: {
      priceRules: L.PRICE_RULES,
      beforeApplyRecordToTemplate: L.beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: L.afterApplyRecordToTemplate,
      resolveRecordTemplateRoute: L.makeRoute('om_wave1_template'),
    },
  });
})();
