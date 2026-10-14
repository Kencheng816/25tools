/* 跨夜直播 V0.5 Template Rules Manifest – 整合版補建。
 * 原工具沒有 manifest：template-rule-utils 在 core 之前、crossnight-live-promo_rules 在 core 與模組之後載入（rulesAfterCore；
 * 規則檔載入時直接呼叫 MultiSizeAssetSync.configure() 與 ManualAssetUpload.configure()）。 */
window.TemplateRulesManifest = Object.freeze({
  ruleFiles: [
    '@shared/template-rule-utils.js',
    'rules/crossnight-live-promo_rules.js',
  ],
});
