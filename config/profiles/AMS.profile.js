/* 分類設定：AMS（Line購物AMS V0.6）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:AMS"] = {
  "id": "AMS",
  "label": "Line購物AMS V0.6",
  "family": "b",
  "sheetHints": [
    "2026.4_Line購物_4.19-4.25",
    "Line購物"
  ],
  "rulesNamespace": "rules/AMS/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.b）不同的旗標；其餘沿用預設。",
  "flags": {
    "batch.extraHeaderAliases": "ams",
    "batch.extraFields": "lineShoppingAms",
    "render.shapeLegacyTriangleOverride": false,
    "render.maskScope": "all",
    "render.shapeFillEnabledMode": "flagStrict",
    "render.shapeRotationSource": "corners",
    "render.shapePsdCornerRadii": true,
    "render.shapeCornerCurve": "bezier",
    "assets.lookupProjectMode": "explicitFirstNonEmpty",
    "templates.layerDefaults": true,
    "export.compressMode": "none",
    "export.diagnostics": "none",
    "ui.manualUploadExcludeLocked": true
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
    "renderers/shape-renderer.ams.js",
    "core/app.core.js",
    "smart-assets/product-shadow.engine.js",
    "smart-assets/smart-asset-manager.b.js",
    "modules/multi-size-asset-sync.network.js"
  ],
  "templatesDir": "templates/AMS",
  "assetsDir": "assets/AMS",
  "_notes": [
    "shape-renderer 採 AMS 原版檔（renderers/shape-renderer.ams.js）：角點旋轉、未旋轉框、Bezier 圓角、PSD 四角半徑、填色/筆畫獨立；flags 中 render.shape* 為記錄用。"
  ]
};
