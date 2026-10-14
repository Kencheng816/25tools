/* Example_Template 範例規則檔
 * 這是一個「複製起點」，示範新公版規則檔該有的最小結構。
 * 實際開發新公版時：
 *   1. 複製這個檔案，改名成 rules/你的公版名稱_rules.js
 *   2. 把 register() 第一個參數（family key）跟 targets 改成對應你的公版
 *   3. 在 rules 區塊內視需要加上 priceRules / capsuleRules / layoutRules /
 *      beforeApplyRecordToTemplate / afterApplyRecordToTemplate 等規則區塊
 *      （完整說明見 docs/ADD_TEMPLATE_GUIDE.md）
 *   4. 到 index.html 加上對應的 <script> 標籤
 *
 * 跨公版共用的邏輯，請寫進 rules/shared/template-rule-utils.js，
 * 掛在 window.TemplateRuleUtils 底下，不要在每個 xxx_rules.js 裡各自複製貼上。
 */
(function () {
  'use strict';

  window.TemplateRuleRegistry.register('example_template', {
    label: 'Example Template',
    targets: ['Example_Template'],

    rules: {
      // 這裡放這個公版專屬的規則區塊，例如：
      // priceRules: {...},
      // capsuleRules: {...},
      // layoutRules: { applyProgrammaticLayout(ctx) {...} },
      // beforeApplyRecordToTemplate({ template, record }) {...},
      // afterApplyRecordToTemplate({ template, record }) {
      //   window.TemplateRuleUtils.findLayerByWords(template, { type: 'text', words: ['主標'] });
      // },
    },
  });
})();
