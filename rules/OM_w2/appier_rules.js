(function registerAppierRules() {
  'use strict';
  const L = window.OMWave1Layout;
  window.TemplateRuleRegistry.register('om_wave1_appier', {
    label: 'Appier', priority: 300,
    targets: [
      'Appier_1200x627', 'Appier_1536x2048', 'Appier_160x600', 'Appier_2048x1536',
      'Appier_300x600', 'Appier_320x480', 'Appier_320x50', 'Appier_336x280', 'Appier_480x320',
      'Appier_600x1200', 'Appier_600x500', 'Appier_640x100', 'Appier_640x200', 'Appier_640x960',
      'Appier_672x560', 'Appier_960x640', 'Appier_970x250',
    ],
    tokens: ['Appier'],
    rules: {
      priceRules: L.PRICE_RULES,
      beforeApplyRecordToTemplate: L.beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: L.afterApplyRecordToTemplate,
      resolveRecordTemplateRoute: L.makeRoute('om_wave1_appier'),
    },
  });
})();
