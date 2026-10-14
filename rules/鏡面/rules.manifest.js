/* Rule Manifest – rules 的唯一載入清單與載入順序。
 * 25節Tool_鏡面：本工具只服務鏡面 5 個公版（人名標／天空Bar／底Bar／開框留底字卡／循環動畫底圖），
 * 因此只載入共用工具與 mirror.rules.js。
 * 新增公版規則時，只需要把 rules/xxx.rules.js 加進下面的 ruleFiles，不需要修改 core/app.core.js。 */
window.TemplateRulesManifest = Object.freeze({
  ruleFiles: [
    '@shared/template-rule-utils.js',
    'rules/mirror.rules.js',
  ],
});
