/* Rule Manifest – single source of truth for rule load order.
 * V0.2（25節 LineOA 選單專用版）：本工具只服務 LineOA 選單公版 03_LineOA_Template_RM，
 * 其他媒體（Appier / Rtbhouse / DPA / FB_Linelap / UAC_Pmax / Template）的規則與
 * OM Wave1 共用模組（parser / matcher / layout / initial-placements）已全數移除。 */
window.TemplateRulesManifest = Object.freeze({
  ruleFiles: [
    '@shared/template-rule-utils.js',
    '@shared/sp-text-standard.js',
    'rules/lineoa_rules.js',
  ],
});
