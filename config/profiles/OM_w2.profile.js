/* 分類設定：OM_w2（外廣OM wave2 V0.4）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:OM_w2"] = {
  "id": "OM_w2",
  "label": "外廣OM wave2 V0.4",
  "family": "ancestor",
  "sheetHints": [
    "外廣_wave2",
    "wave2"
  ],
  "rulesNamespace": "rules/OM_w2/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.ancestor）不同的旗標；其餘沿用預設。",
  "flags": {
    "batch.rowsFromZero": true,
    "render.applyBoxSyncCenterForAllTypes": true,
    "render.applyBoxCoverSyncHeight": true,
    "render.shapeFillEnabledMode": "flag",
    "render.productSizingHeightPriority": "explicit",
    "export.dedupeOutputName": true,
    "price.fitBoxToInk": true,
    "price.syncSeparatePositionScale": true,
    "interaction.dropUpload": "uploadSlot",
    "text.priceRecalcOnCommit": "spTextCapture",
    "ui.rotateHandleAnchor": "topCenter",
    "ui.thumbShowUploadPrompt": true,
    "rules.omWaveProfile": "wave2"
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
  "templatesDir": "templates/OM_w2",
  "assetsDir": "assets/OM_w2"
};
