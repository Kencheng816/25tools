/* OM Wave 1 sheet parser router. */
(function registerOmWave1Router() {
  'use strict';
  window.TemplateRuleRegistry.register('om_wave1_router', {
    label: 'OM Wave 1 Router',
    priority: 1000,
    targets: [],
    tokens: [],
    sheetParser: (context) => window.OMWave1Parser?.parse?.(context) || null,
  });
})();
