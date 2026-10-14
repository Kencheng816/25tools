/* OM Wave 1 Rule Manifest – single source of truth for rule load order. */
window.TemplateRulesManifest = Object.freeze({
  ruleFiles: [
    '@shared/template-rule-utils.js',
    '@shared/sp-text-standard.js',
    'rules/shared/om-wave1-template-matcher.js',
    'rules/shared/om-wave1-parser.js',
    'rules/shared/om-wave1-initial-placements.js',
    'rules/shared/om-wave1-layout.js',
    'rules/om-wave1-router_rules.js',
    'rules/template_rules.js',
    'rules/uac_pmax_linelap_rules.js',
    'rules/rtbhouse_rules.js',
    'rules/appier_rules.js',
    'rules/dpa_frame_mau_rules.js',
  ],
});
