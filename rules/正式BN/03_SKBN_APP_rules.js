/* 03_SKBN_APP 公版規則（25節 正式，2026-08-13）
 * 共用流程見 rules/shared/skbn-rule-factory.js；本檔只宣告 APP 差異設定。
 * 畫布 1200x360；切圖 左358/中484/右358（x=0/358/842）。
 */
(function registerSkbnAppRule() {
  'use strict';

  window.SkbnRuleFactory.register({
    ruleKey: 'skbn_app_25_bn_formal',
    label: '25節 正式 SKBN_APP',
    tokens: ['SKBN_APP', 'SKBNAPP'],
    targets: ['03_SKBN_APP', 'SKBN_APP'],
    priority: 40,
    mode: 'app',
    templateType: 'skbn_app_bn_formal',
    outputPrefix: 'SKBN_APP',
    templateAssetFolder: '03_SKBN_APP',
    layerKeys: {
      kvBg: 'kv_bg',
      leftTop: '左邊_文案_上',
      leftBottom: '左邊_文案_下',
      midTop: '中間_文案_上',
      midBottom: '中間_文案_下',
      directLogo: '蝦皮直營_LOGO',
      vipLeft: '蝦皮VIP_右邊_文案_上_左',
      vipLogo: '蝦皮VIP_LOGO',
      rightBottom: '右邊_文案_下',
      // 2026-08-13：模板商品圖層改名 product（同其他版位 P 圖層邏輯：商品圖1有資料代入、無資料隱藏）。
      product: 'product',
    },
    textLayerKeys: ['左邊_文案_上', '左邊_文案_下', '中間_文案_上', '中間_文案_下', '蝦皮VIP_右邊_文案_上_左', '右邊_文案_下'],
    // 字級（使用者確認）：中下=數字與$符號100/其餘85/純中文100；右下=數字與$符號80/其餘70（純中文70）。
    midBottomBigPt: 100,
    midBottomSmallPt: 85,
    rightBottomBigPt: 80,
    rightBottomSmallPt: 70,
    // 價格（2026-08-13 工單新增欄；錨定 VIP_單券_折扣 券面，位置可用校正檔微調）。
    priceBigFontSize: 48,
    // 匯出（使用者確認）：完整圖＋左中右切圖、JPG、資料夾 03_SKBN_APP/SKBN_APP_XX/。
    exportConfig: {
      format: 'jpg',
      folder: '03_SKBN_APP',
      perItemSubfolder: true,
      slices: [
        { suffix: '左', x: 0, width: 358 },
        { suffix: '中', x: 358, width: 484 },
        { suffix: '右', x: 842, width: 358 },
      ],
    },
  });

  window.__SKBN_APP_RULE_VERSION = '2026-08-13a｜新版位03_SKBN_APP｜三列一組＋切圖匯出';
})();
