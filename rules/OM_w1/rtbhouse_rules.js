(function registerRtbhouseRules() {
  'use strict';
  const L = window.OMWave1Layout;
  window.TemplateRuleRegistry.register('om_wave1_rtbhouse', {
    label: 'Rtbhouse', priority: 300,
    targets: ['Rtbhouse_300x250', 'Rtbhouse_300x600', 'Rtbhouse_320x480', 'Rtbhouse_320x50', 'Rtbhouse_360x640', 'Rtbhouse_480x320', 'Rtbhouse_728x90'],
    tokens: ['Rtbhouse'],
    rules: {
      beforeApplyRecordToTemplate: L.beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate: L.afterApplyRecordToTemplate,
      resolveRecordTemplateRoute: L.makeRoute('om_wave1_rtbhouse'),
    },
  });
})();
