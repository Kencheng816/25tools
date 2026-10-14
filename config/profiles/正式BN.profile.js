/* 分類設定：正式BN（正式BN V0.8）— flags 只放與 _defaults 不同的旗標
 * 由 core/profile-loader.js 以 <script> 載入（不用 fetch，雙擊 index.html 用 file:// 開也能跑）。
 * 內容就是原本的 JSON，只多包一行登錄到 window.__profileRegistry。 */
window.__profileRegistry = window.__profileRegistry || {};
window.__profileRegistry["profile:正式BN"] = {
  "id": "正式BN",
  "label": "正式BN V0.8",
  "family": "a",
  "sheetHints": [
    " BN 正式",
    "BN 正式"
  ],
  "rulesNamespace": "rules/正式BN/",
  "_comment": "flags 只放與 _defaults.json（defaults ＋ families.a）不同的旗標；其餘沿用預設。",
  "flags": {
    "templates.variant": "formal",
    "export.folderStrategy": "sourceTemplate"
  },
  "_inapplicable": [
    "assets.shopeeVipGuard",
    "ui.manualUploadExcludeLocked"
  ],
  "_todo": [],
  "templatesDir": "templates/BN",
  "assetsDir": "assets/正式BN"
};
