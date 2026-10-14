/* 分類設定：KV（KV V0.2）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:KV"] = {
  "id": "KV",
  "label": "KV V0.2",
  "family": "ancestor",
  "sheetHints": [
    "工單KV+Logo",
    "KV"
  ],
  "rulesNamespace": "rules/KV/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.ancestor）不同的旗標；其餘沿用預設。",
  "flags": {
    "batch.smartAssetIdMode": "plain",
    "batch.smartAssetApplyPhase": "beforeLayout",
    "batch.previewMode": "mutating",
    "render.textEngine": "legacy",
    "templates.snapshotRestore": false,
    "templates.textBaselinePrepare": false,
    "export.zipPrefix": "18SaleTool",
    "export.batchZipName": "specDrivenOrBatchTs",
    "export.formatSource": "specTable",
    "export.multiSizeForceJpg": true,
    "export.stemSource": "templateId",
    "export.folderStrategy": "specBanner",
    "export.jsonMode": "raw",
    "price.layerBaselineMode": "none",
    "price.specialCharRanges82": false,
    "price.rebuildMemoryMode": "text",
    "smartAsset.engine": "kv",
    "ui.toolName": "18節生成工具",
    "rules.normalizeLegacy": true,
    "rules.loadFailurePolicy": "continue"
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
    "smart-assets/smart-asset-manager.kv.js",
    "modules/asset-review-modal.b.js",
    "modules/single-size-asset-sync.js",
    "modules/multi-size-asset-sync.js"
  ],
  "templatesDir": "templates/KV",
  "assetsDir": "assets/KV"
};
