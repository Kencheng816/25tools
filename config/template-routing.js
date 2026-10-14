/* Template Routing Config
 * 目前保留這個檔案，是為了給「需要Excel固定欄位分流」的公版一個統一設定的地方。
 * V1.0 開源版：已移除舊「頭巾」公版的固定分流設定（headbandSheetRoutes / sheetCells）。
 *
 * 若你的新公版需要類似「依Excel固定欄位判斷要套用哪個公版變體」的功能，
 * 建議的做法是：在該公版的 rules/*_rules.js 內，透過
 *   window.TemplateRuleRegistry.register(family, { resolveRecordTemplateRoute: fn })
 * 自行註冊判斷邏輯（BatchManager.resolveRecordTemplateRoute 會自動呼叫），
 * 不需要再回頭修改這個檔案或 app.core.js。
 */
window.TemplateRoutingConfig = {
  // 目前沒有任何公版使用這種固定欄位分流模式。
  headbandSheetRoutes: [],
};
