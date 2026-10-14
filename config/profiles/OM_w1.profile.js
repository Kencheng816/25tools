/* 分類設定：OM_w1（外廣OM wave1 V0.5）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:OM_w1"] = {
  "id": "OM_w1",
  "label": "外廣OM wave1 V0.5",
  "family": "ancestor",
  "sheetHints": [
    "外廣_Wave1",
    "Wave1"
  ],
  "rulesNamespace": "rules/OM_w1/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.ancestor）不同的旗標；其餘沿用預設。",
  "flags": {
    "rules.omWaveProfile": "wave1"
  },
  "_inapplicable": [
    "assets.moduleCommonFolder",
    "smartAsset.multiProductLink",
    "smartAsset.skipHiddenProduct",
    "ui.manualUploadExcludeLocked"
  ],
  "_todo": [],
  "coreScripts": [
    "core/product-engine.js",
    "renderers/shape-renderer.js",
    "core/app.core.js",
    "smart-assets/product-shadow.engine.js",
    "smart-assets/smart-asset-manager.b.js",
    "modules/asset-review-modal.b.js",
    "modules/single-size-asset-sync.js",
    "modules/multi-size-asset-sync.js"
  ],
  "templatesDir": "templates/OM_w1",
  "assetsDir": "assets/OM_w1"
};
