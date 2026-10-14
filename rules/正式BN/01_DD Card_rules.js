/* 01_DD Card 公版規則（25節 正式）
 *
 * 與 HBN 共用資料、標題、價格與素材解析流程；差異：
 * 1. 主標題／LOGO+主標題群組置中於 DD Card 畫布中心。
 * 2. 副標題、副標題_底色、保護文字對齊主標題群組中心。
 * 3. 主標、副標字級與基線皆取自 templates/01_DD Card.json 原始圖層。
 *
 * 2026-08-12 正式案調整：
 * 1. targets / 資料夾 / 輸出檔名改用 V0.0 新名稱 01_DD Card（保留通用 token）。
 * 2. legacyPresetOptional: true —— 正式案無暖身 Preset，新公版 JSON 即初始基準。
 * 3. dualProductLayerKeys 啟用 P_01/P_02 雙商品圖（規則同 01_HBN）。
 */
(function registerDdCardFormalRule() {
  'use strict';

  window.WarmupBannerRuleFactory.register({
    ruleKey: 'dd_card_25_bn_formal',
    label: '25節 正式 DD Card',
    tokens: ['DD Card', 'DDCard', 'DD Banner Card'],
    targets: ['01_DD Card', 'DD Card', 'DD Banner Card'],
    priority: 30,
    legacyPresetOptional: true,
    templateType: 'dd_card_bn_formal',
    outputPrefix: '01_DD_Card',
    templateAssetFolder: '01_DD Card',
    productAssetFolder: '共用素材',
    smartAssetIdentity: '01_DD Card',
    priceLayoutKeys: ['01_DD Card', 'DD Card', 'DD Banner Card'],
    // 2026-08-13：下載圖片依版位分資料夾；依規格表模式輸出 JPG。
    exportConfig: { format: 'jpg', folder: '01_DD Card' },
    dualProductLayerKeys: { p1: 'P_01', p2: 'P_02' },
    // 四型態主/副標變體（2026-08-13）：副標VIP → 主標VIP → 蝦皮直營 → 一般。
    // 圖層名對應 templates/01_DD Card.json（2026-08-13 使用者更新版，26 圖層）。
    // DD Card 主標 VIP 例外（titleIcon 機制）：
    //   VIP 左邊有文案 → 蝦皮VIP_主標題_左 ＋ 蝦皮VIP_icon_白色 ＋ 蝦皮VIP_主標題_右（隱藏 LOGO）
    //   VIP 左邊無文案 → 蝦皮VIP_LOGO ＋ 蝦皮VIP_主標題_右（隱藏 icon 與 _左）
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
        titleIcon: '蝦皮VIP_icon_白色',
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
    mainCenterX: function (template) {
      return Number(template && template.canvas && template.canvas.width) / 2;
    },
    mainGroupGap: 9,
    priceBigFontSize: 48,
    // 變體模式字級一律取 JSON 原始圖層（title 55 / 副蝦皮VIP_主標題 51.93 / 蝦皮VIP_主標題_右 46.02…）。
    fontSizes: {},
  });

  window.__DD_CARD_RULE_VERSION = '2026-08-13b｜正式案01_DD Card｜主標VIP例外（icon白色/LOGO雙形態）＋四型態變體';
})();
