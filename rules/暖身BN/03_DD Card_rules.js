/* 03_DD Card 公版規則
 *
 * 與 HBN 共用資料、標題、價格與素材解析流程；差異：
 * 1. 主標題／LOGO+主標題群組置中於 DD Card 畫布中心。
 * 2. 副標題、副標題_底色、保護文字對齊主標題群組中心。
 * 3. 主標、副標字級與基線皆取自 templates/03_DD Card.json 原始圖層。
 */
(function registerDdCardWarmupRule() {
  'use strict';

  window.WarmupBannerRuleFactory.register({
    ruleKey: 'dd_card_25_bn_warmup',
    label: '25節 暖身 DD Card',
    tokens: ['DD Card', 'DDCard', 'DD Banner Card'],
    targets: ['03_DD Card', 'DD Card', 'DD Banner Card'],
    priority: 30,
    templateType: 'dd_card_bn_warmup',
    outputPrefix: '03_DD_Card',
    templateAssetFolder: '03_DD Card',
    productAssetFolder: '共用素材',
    smartAssetIdentity: '03_DD Card',
    priceLayoutKeys: ['03_DD Card', 'DD Card', 'DD Banner Card'],
    mainCenterX: function (template) {
      return Number(template && template.canvas && template.canvas.width) / 2;
    },
    mainGroupGap: 9,
    priceBigFontSize: 48,
    // 留空表示使用 JSON 載入時保存的原始字級：一般55 / VIP46.02 / 直營55 / 副標40。
    fontSizes: {},
  });

  window.__DD_CARD_RULE_VERSION = '2026-08-05a｜新增03_DD Card｜HBN共用架構＋群組中心對齊';
})();
