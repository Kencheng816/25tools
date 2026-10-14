/* 分類設定：跨夜（跨夜直播 V0.5）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:跨夜"] = {
  "id": "跨夜",
  "label": "跨夜直播 V0.5",
  "family": "b",
  "sheetHints": [
    "425跨夜_線上宣傳圖",
    "跨夜"
  ],
  "rulesNamespace": "rules/跨夜/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.b）不同的旗標；其餘沿用預設。",
  "flags": {
    "batch.assetSpecEngineFirst": false,
    "render.shapeFillEnabledMode": "flagOrNoFill",
    "render.shapeStrokeInset": true,
    "render.shapeBoxSource": "pathBoundsFirstOverlap",
    "assets.missingDiagnostics": "batchDiagnosticsAlways",
    "assets.waitFontsBeforeLoad": true,
    "assets.captureRenderModel": true,
    "assets.multiSizeMaterialPredicate": "anyAssetFilename",
    "templates.prepareHook": "ruleHook",
    "export.compressMode": "kLimit",
    "export.diagnostics": "batchDiagnostics",
    "interaction.dblclickReplace": "uploadSlot",
    "text.afterEditHook": "markManualTextEdited",
    "ui.specOverlaySkip": "specDriven",
    "ui.thumbWhiteOnMultiSize": false,
    "ui.toolName": "25節生成工具_跨夜直播宣傳圖"
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
    "renderers/shape-renderer.crossnight.js",
    "core/app.core.js",
    "smart-assets/product-shadow.engine.js",
    "smart-assets/smart-asset-manager.crossnight.js",
    "modules/multi-size-asset-sync.crossnight.js"
  ],
  "templatesDir": "templates/跨夜",
  "assetsDir": "assets/跨夜"
};
