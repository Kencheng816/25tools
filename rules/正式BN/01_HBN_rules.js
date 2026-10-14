/* 01_HBN 公版規則（25節 正式）
 * 共用流程由 rules/shared/warmup-banner-rule-factory.js 管理；本檔只保留 HBN 差異設定。
 *
 * 2026-08-12 正式案調整：
 * 1. targets / 資料夾 / 輸出檔名改用 V0.0 新名稱 01_HBN（保留通用 token「HBN」）。
 * 2. legacyPresetOptional: true —— 正式案無暖身 Preset，新公版 JSON 即初始基準。
 * 3. dualProductLayerKeys 啟用 P_01/P_02 雙商品圖：
 *    預設隱藏 P_01/P_02 顯示 product（商品圖1帶入 product）；
 *    商品圖1、圖2皆有值時 P_01←商品圖1、P_02←商品圖2，隱藏 product；
 *    只填商品圖2 視為工單錯誤（warning，不套圖）。
 */
(function registerHbnFormalRule() {
  'use strict';

  window.WarmupBannerRuleFactory.register({
    ruleKey: 'hbn_25_bn_formal',
    label: '25節 正式 HBN',
    tokens: ['HBN'],
    targets: ['01_HBN', 'HBN'],
    priority: 10,
    legacyPresetOptional: true,
    templateType: 'hbn_bn_formal',
    outputPrefix: '01_HBN',
    templateAssetFolder: '01_HBN',
    productAssetFolder: '共用素材',
    smartAssetIdentity: '01_HBN',
    priceLayoutKeys: ['01_HBN', 'HBN'],
    // 2026-08-13：下載圖片依版位分資料夾；依規格表模式輸出 JPG。
    exportConfig: { format: 'jpg', folder: '01_HBN' },
    dualProductLayerKeys: { p1: 'P_01', p2: 'P_02' },
    // 四型態主/副標變體（2026-08-13）：副標VIP → 主標VIP → 蝦皮直營 → 一般。
    // 圖層名對應 templates/01_HBN.json（2026-08-13 版，25 圖層）；字級/色碼/底色 #1D54A4 皆取自 JSON。
    variantLayerSets: {
      subVip: {
        title: '副蝦皮VIP_主標題',
        subLeft: '副蝦皮VIP_副標題_左',
        subLogo: '副蝦皮VIP_LOGO',
        subRight: '副蝦皮VIP_副標題_右',
        subBg: '副蝦皮VIP_副標題_底色',
        protect: '副蝦皮VIP_保護文字',
        // 特例（2026-08-13 使用者確認僅限此文案）：主標比照 title 字級與Y軸/基線，僅顏色維持自身。
        titleMirror: { source: 'title', texts: ['搶商城92折券'] },
      },
      titleVip: {
        titleLeft: '蝦皮VIP_主標題_左',
        titleLogo: '蝦皮VIP_LOGO',
        titleRight: '蝦皮VIP_主標題_右',
        subtitle: '蝦皮VIP_副標題',
        subBg: '蝦皮VIP_副標題_底色',
        protect: '蝦皮VIP_保護文字',
      },
      direct: {
        titleLogo: '蝦皮直營_LOGO',
        titleRight: '蝦皮直營_主標題_右',
        subtitle: 'subtitle',
        subBg: '副標題_底色',
        protect: '保護文字',
      },
      plain: {
        title: 'title',
        subtitle: 'subtitle',
        subBg: '副標題_底色',
        protect: '保護文字',
      },
    },
    mainCenterX: 340.5,
    mainGroupGap: 9,
    priceBigFontSize: 48,
    // 變體模式字級一律取 JSON 原始圖層（title 75 / 副蝦皮VIP_主標題 62.07 / 蝦皮VIP_主標題_左右 60.54…）。
    fontSizes: {},
  });

  window.__HBN_RULE_VERSION = '2026-08-13a｜正式案01_HBN｜四型態主副標變體＋P_01/P_02雙商品圖';
})();
