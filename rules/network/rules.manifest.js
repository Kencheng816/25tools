/* network V0.7 Template Rules Manifest – 整合版補建。
 * 原工具沒有 manifest：template-rule-utils 在 core 之前、network-affiliate_rules 在 core 與模組之後載入（rulesAfterCore）。 */
window.TemplateRulesManifest = Object.freeze({
  ruleFiles: [
    '@shared/template-rule-utils.js',
    'rules/network-affiliate_rules.js',
  ],
});
