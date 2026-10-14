/* 分類設定：LineOA（Line OA V0.5）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:LineOA"] = {
  "id": "LineOA",
  "label": "Line OA V0.5",
  "family": "b",
  "sheetHints": [
    "Line OA",
    "LineOA_Wave1"
  ],
  "rulesNamespace": "rules/LineOA/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.b）不同的旗標；其餘沿用預設。",
  "flags": {
    "batch.rowsFromZero": true,
    "batch.explicitTemplateIdRoute": "omWave1",
    "render.autoLogoShadow": true,
    "render.applyBoxSyncCenterForAllTypes": true,
    "render.applyBoxCoverSyncHeight": true,
    "render.shapeFillEnabledMode": "flag",
    "render.productSizingHeightPriority": "explicit",
    "assets.lookupEngine": "flatFuzzyScoped",
    "assets.missingDiagnostics": "templateList",
    "export.formatSource": "outputFormatOmMedia",
    "export.folderStrategy": "omMedia",
    "export.scaleMode": "multiSize2x",
    "export.whiteFill": "multiSize",
    "price.specialCharRanges82": true,
    "price.fitBoxToInk": true,
    "price.syncSeparatePositionScale": true,
    "interaction.dropUpload": "uploadSlot",
    "interaction.replaceAssetImpl": "legacy",
    "interaction.deleteClearsUploadSlot": false,
    "text.afterEditHook": "omWave1Subtitle",
    "text.priceRecalcOnCommit": "spTextCapture",
    "ui.rotateHandleAnchor": "topCenter",
    "ui.thumbShowUploadPrompt": true,
    "ui.assetReviewMode": "live",
    "ui.hitLockedPassthrough": true
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
  "templatesDir": "templates/LineOA",
  "assetsDir": "assets/LineOA"
};
