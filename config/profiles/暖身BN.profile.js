/* 分類設定：暖身BN（暖身BN V1.5）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:暖身BN"] = {
  "id": "暖身BN",
  "label": "暖身BN V1.5",
  "family": "a",
  "sheetHints": [
    "BN 暖身"
  ],
  "rulesNamespace": "rules/暖身BN/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.a）不同的旗標；其餘沿用預設。",
  "flags": {
    "batch.sellerHeaderDetect": true,
    "templates.variant": "warmup",
    "export.zipPrefix": "18SaleTool",
    "export.formatSource": "specTable",
    "export.folderStrategy": "sourceTemplate",
    "export.slices": false,
    "price.normalizeDecimalPercent": false,
    "smartAsset.multiProductLink": false,
    "smartAsset.skipHiddenProduct": false,
    "interaction.markThumbStale": false,
    "ui.rotateHandleAnchor": "topRight"
  },
  "_inapplicable": [
    "assets.shopeeVipGuard",
    "ui.manualUploadExcludeLocked"
  ],
  "_todo": [],
  "templatesDir": "templates/BN",
  "assetsDir": "assets/暖身BN"
};
