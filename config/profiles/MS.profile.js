/* 分類設定：MS（暖正MS V0.5）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:MS"] = {
  "id": "MS",
  "label": "暖正MS V0.5",
  "family": "a",
  "sheetHints": [
    "攻略頁_GD做圖列表",
    "攻略頁"
  ],
  "rulesNamespace": "rules/MS/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.a）不同的旗標；其餘沿用預設。",
  "flags": {
    "batch.assetSpecEngineFirst": false,
    "batch.specialParserPolicy": false,
    "batch.explicitTemplateIdRoute": "none",
    "batch.coreSubtitleTextMap": true,
    "batch.missingProductAssetMode": "manualUpload",
    "batch.placementPreset": false,
    "batch.smartAssetApplyPhase": "afterLayout",
    "render.applyBoxDdcardHeightRule": false,
    "assets.roleClassify": false,
    "assets.moduleCommonFolder": "always",
    "assets.urlCommonFolder": "always",
    "assets.urlExtensionExpand": true,
    "assets.templatePrefixVariants": true,
    "assets.missingDiagnostics": "none",
    "templates.prepareHook": "none",
    "export.batchZipName": "batchTs",
    "export.multiSizeForceJpg": false,
    "export.multiOutputSizeSuffix": false,
    "export.scaleMode": "fixed4x",
    "export.whiteFill": "none",
    "export.compressMode": "none",
    "export.diagnostics": "none",
    "interaction.syncMode": "smartOnly",
    "interaction.dropUpload": "manualProduct",
    "interaction.dblclickReplace": "none",
    "interaction.replaceAssetImpl": "none",
    "ui.specOverlaySkip": "none",
    "ui.thumbWhiteOnMultiSize": false,
    "ui.assetReviewMode": "off",
    "rules.registryMode": "strictExact"
  },
  "_inapplicable": [
    "assets.shopeeVipGuard",
    "assets.multiSizeMaterialPredicate",
    "ui.manualUploadExcludeLocked"
  ],
  "_todo": [],
  "scripts": [
    "core/work-order-export-planner.js"
  ],
  "templatesDir": "templates/MS",
  "assetsDir": "assets/MS",
  "_notes": [
    "2026-09-14：smart-asset 採 a 引擎（正式BN 版），黃金樣本 33/33 通過，multiProductLink/skipHiddenProduct 取正式BN 值。"
  ]
};
