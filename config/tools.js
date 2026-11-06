/* 25節 整合版 — 入口頁卡片登錄表（2026-11-05 自 18節 移植：入口頁改 SPX 式卡片、工具頁獨立開啟）
 *
 * 每張卡片一筆：id、label（卡片文字）、group（入口頁分區標題）、profiles（這張卡片底下的工具分類，＝config/profiles/<id>.profile.js）。
 *   - profiles 只有一個：點卡片直接開 app.html?profile=<id>。
 *   - profiles 多個（外廣 OM 的 Wave 1／2）：點卡片開 app.html?group=<id>，
 *     進工具後「匯入工單」時，由 core/bootstrap.js 依分頁名在這幾個分類裡自動選定，使用者不用知道有分。
 * 分頁判別用的 sheetHints 在 config/profiles/<id>.profile.js（與 index.js 一致），這裡不重複。
 * 用 <script> 載入（不用 fetch），雙擊 index.html 以 file:// 開啟也能用。
 */
/** 入口頁群組順序（由左至右、由上到下，一排 4 欄）。hidden=true 的群組先不顯示（待開發）。 */
window.TOOL_GROUPS = [
  { name: 'KV' },
  { name: 'BN／MS' },
  { name: '外廣' },
  { name: 'Affiliate' },
  { name: '跨夜直播' },
];

/** 卡片順序＝同群組內由上而下的順序。 */
window.TOOL_REGISTRY = [
  { id: 'KV',      label: 'KV（工單KV+Logo）',   group: 'KV',        profiles: ['KV'] },
  { id: '暖身BN',  label: '暖身 BN',             group: 'BN／MS',    profiles: ['暖身BN'] },
  { id: '正式BN',  label: '正式 BN',             group: 'BN／MS',    profiles: ['正式BN'] },
  { id: 'MS',      label: '暖正 MS',             group: 'BN／MS',    profiles: ['MS'] },
  { id: 'OM',      label: '外廣 OM',            group: '外廣',      profiles: ['OM_w1', 'OM_w2'] },
  { id: 'LineOA',  label: 'Line OA',            group: '外廣',      profiles: ['LineOA'] },
  { id: 'network', label: 'Affiliate network',  group: 'Affiliate', profiles: ['network'] },
  { id: 'AMS',     label: 'Line購物 AMS',        group: 'Affiliate', profiles: ['AMS'] },
  { id: '鏡面',    label: '跨夜 鏡面',           group: '跨夜直播',  profiles: ['鏡面'] },
  { id: '跨夜',    label: '跨夜直播宣傳圖',      group: '跨夜直播',  profiles: ['跨夜'] },
];

/** 卡片要開的工具頁網址（入口頁與工具頁共用）。 */
window.toolPageUrl = function toolPageUrl(tool) {
  if (!tool) return 'app.html';
  return tool.profiles.length === 1
    ? `app.html?profile=${encodeURIComponent(tool.profiles[0])}`
    : `app.html?group=${encodeURIComponent(tool.id)}`;
};
