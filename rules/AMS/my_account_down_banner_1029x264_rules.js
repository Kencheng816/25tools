/* 我的帳戶Down banner_1029x264 專屬規則
 *
 * 版位分流以工單「版位」欄為主：我的帳戶Down banner
 * 商品圖遮罩用「右_上方Bar」，讓商品圖只出現在上方Bar的圓角範圍內。
 */
(function () {
  'use strict';

  const AMS = window.LineShoppingAMS;
  const FAMILY = 'my_account_down_banner_1029x264';
  const TEMPLATE_ID = '我的帳戶Down banner_1029x264';
  const PLACEMENT = '我的帳戶Down banner';

  window.TemplateRuleRegistry.register(FAMILY, {
    label: TEMPLATE_ID,
    priority: 170,
    // targets 用來從已載入的公版清單裡挑出對應的 JSON。
    targets: [TEMPLATE_ID, PLACEMENT],
    // tokens 只放完整版位名稱，不放「首頁Top banner」這種會跨版位誤命中的片段。
    tokens: [PLACEMENT],

    rules: {
      resolveRecordTemplateRoute: AMS.makeRoute({ family: FAMILY, templateId: TEMPLATE_ID, placement: PLACEMENT }),

      beforeApplyRecordToTemplate({ template, record }) {
        // 輸出檔名直接用工單「檔名」欄（星號換成 x）。
        AMS.applyOutputName(record);
        // 素材查找的「專案」＝本版位的素材子資料夾（assets/<公版名稱>/）。
        // KV_BG 屬於背景類、不允許跨專案 fallback，沒有這一行就只會搜尋
        // 共用素材與 assets 根目錄，找不到公版子資料夾裡的 KV_BG。
        record.__project = TEMPLATE_ID;
        // 工單「文案」欄先收起來，避免引擎的通用文案映射誤塞到 CTA_文案 / 短文案。
        AMS.stashRawCopy(record);
        record.__outputFormat = 'jpg';

        // 本版位只有一張商品圖，來源是工單「GD摳圖LINK」欄（引擎已對應成商品圖1）。
        record['商品圖2'] = '';

        // P_範圍 在 25節 是參考框，商品圖層由規則檔生成。
        AMS.createProductLayer(template, { layerName: '商品圖1', guideName: 'P_範圍', maskName: '右_上方Bar' });
      },

      afterApplyRecordToTemplate({ template, record, helpers }) {
        AMS.applySinglePlacement(template, record, helpers, {
          hasShopName: true,
          hasLinePoints: true,
        });
      },
    },
  });
})();
