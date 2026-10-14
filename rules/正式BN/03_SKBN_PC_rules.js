/* 03_SKBN_PC 公版規則（25節 正式，2026-08-13）
 * 共用流程見 rules/shared/skbn-rule-factory.js；本檔只宣告 PC 差異設定。
 * 畫布 1200x110；切圖 左400/中400/右400（x=0/400/800）。
 * 顏色（使用者確認）：左/中單行前白(#FFFFFF)後黃(#FFE600)；
 * 蝦皮VIP_右邊_文案_右、蝦皮直營_中間_文案_右 → #FFE600。
 */
(function registerSkbnPcRule() {
  'use strict';

  window.SkbnRuleFactory.register({
    ruleKey: 'skbn_pc_25_bn_formal',
    label: '25節 正式 SKBN_PC',
    tokens: ['SKBN_PC', 'SKBNPC'],
    targets: ['03_SKBN_PC', 'SKBN_PC'],
    priority: 41,
    mode: 'pc',
    templateType: 'skbn_pc_bn_formal',
    outputPrefix: 'SKBN_PC',
    templateAssetFolder: '03_SKBN_PC',
    frontColor: '#FFFFFF',
    backColor: '#FFE600',
    // 2026-08-13 字級規則：中間_文案預設 45pt，案型「0-2點限時灑$200」42pt。
    midFontSizeDefault: 45,
    midFontSizeOverrides: { '0-2點限時灑$200': 42 },
    // 價格（PC 券面較小，字級縮小；位置可用校正檔微調）。
    priceBigFontSize: 26,
    priceBoxWidth: 120,
    layerKeys: {
      kvBg: 'kv_bg',
      left: '左邊_文案',
      mid: '中間_文案',
      directLogo: '蝦皮直營_LOGO',
      directRight: '蝦皮直營_中間_文案_右',
      vipLeft: '蝦皮VIP_右邊_文案_左',
      vipLogo: '蝦皮VIP_LOGO',
      vipRight: '蝦皮VIP_右邊_文案_右',
      // 2026-08-13：模板商品圖層改名 product（同其他版位 P 圖層邏輯：商品圖1有資料代入、無資料隱藏）。
      product: 'product',
    },
    textLayerKeys: ['左邊_文案', '中間_文案', '蝦皮直營_中間_文案_右', '蝦皮VIP_右邊_文案_左', '蝦皮VIP_右邊_文案_右'],
    exportConfig: {
      format: 'jpg',
      folder: '03_SKBN_PC',
      perItemSubfolder: true,
      slices: [
        { suffix: '左', x: 0, width: 400 },
        { suffix: '中', x: 400, width: 400 },
        { suffix: '右', x: 800, width: 400 },
      ],
    },
  });

  window.__SKBN_PC_RULE_VERSION = '2026-08-13a｜新版位03_SKBN_PC｜三列一組＋雙色文案＋切圖匯出';
})();
