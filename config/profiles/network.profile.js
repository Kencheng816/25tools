/* 分類設定：network（Affiliate network V0.7）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:network"] = {
  "id": "network",
  "label": "Affiliate network V0.7",
  "family": "b",
  "sheetHints": [
    "Network_5.19-5.25",
    "Network_"
  ],
  "rulesNamespace": "rules/network/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.b）不同的旗標；其餘沿用預設。",
  "flags": {
    "export.scaleMode": "multiSize2x",
    "export.whiteFill": "multiSize"
  },
  "_inapplicable": [
    "assets.moduleCommonFolder",
    "smartAsset.multiProductLink",
    "smartAsset.skipHiddenProduct"
  ],
  "_todo": [],
  "rulesAfterCore": true,
  "coreScripts": [
    "core/product-engine.js",
    "renderers/shape-renderer.js",
    "core/app.core.js",
    "smart-assets/product-shadow.engine.js",
    "smart-assets/smart-asset-manager.b.js",
    "modules/multi-size-asset-sync.network.js"
  ],
  "templatesDir": "templates/network",
  "assetsDir": "assets/network"
};
