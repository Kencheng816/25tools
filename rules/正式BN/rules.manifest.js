/* Template Rules Manifest – single source of truth for rule load order. */
window.TemplateRulesManifest = Object.freeze({
  ruleFiles: [
    '@shared/runtime-policy.js',
    'rules/shared/special-block-parser-policy.js',
    '@shared/template-rule-utils.js',
    '@shared/sp-text-standard.js',
    'rules/shared/warmup-price-style-resolver.js',
    'rules/shared/warmup-banner-rule-factory.js',
    'rules/shared/warmup-placement-presets.js',
    'rules/shared/skbn-rule-factory.js',
    'rules/01_DD Card_rules.js',
    'rules/01_HBN_rules.js',
    'rules/02_POPUP_rules.js',
    'rules/03_SKBN_APP_rules.js',
    'rules/03_SKBN_PC_rules.js',
    'rules/04_Mall Skinny BN_rules.js',
    'rules/shared/simple-banner-rule-factory.js',
    'rules/05_SCBN_rules.js',
    'rules/06_SKBN NUZ_APP_rules.js',
    'rules/06_SKBN NUZ_PC_rules.js',
  ],
});
