/* 25節 整合版 — 工具登錄表（單一入口用）
 *
 * 每個工具一筆：id（＝config/profiles/<id>.profile.js）、label、version、group、
 * sheetHints（工單分頁名含這些字就判定為此工具；與 config/profiles/index.js 的 sheetHints 一致）。
 * 入口頁（index.html）依 sheetHints 對上傳工單的分頁名打分，列出候選；使用者也可直接點選，
 * 選到的工具以 app.html?profile=<id> 載進 iframe。
 * 用 <script> 載入（不用 fetch），雙擊 index.html 以 file:// 開啟也能用。
 */
window.TOOL_REGISTRY = [
  { id: 'OM_w1',  label: '外廣 OM Wave 1',    version: 'V0.5', group: '外廣',     sheetHints: ['外廣_Wave1', 'Wave1'] },
  { id: 'OM_w2',  label: '外廣 OM Wave 2',    version: 'V0.4', group: '外廣',     sheetHints: ['外廣_wave2', 'wave2'] },
  { id: 'LineOA', label: 'Line OA',           version: 'V0.5', group: '外廣',     sheetHints: ['Line OA', 'LineOA_Wave1'] },
  { id: 'network', label: 'Affiliate network', version: 'V0.7', group: 'Affiliate', sheetHints: ['Network_'] },
  { id: 'AMS',    label: 'Line購物 AMS',      version: 'V0.6', group: 'Affiliate', sheetHints: ['Line購物'] },
  { id: '鏡面',   label: '跨夜 鏡面',         version: 'V0.2', group: '跨夜直播', sheetHints: ['_鏡面', '鏡面'] },
  { id: '跨夜',   label: '跨夜直播宣傳圖',    version: 'V0.5', group: '跨夜直播', sheetHints: ['跨夜_線上宣傳圖', '跨夜'] },
  { id: 'KV',     label: 'KV（工單KV+Logo）', version: 'V0.2', group: 'KV',       sheetHints: ['工單KV+Logo', 'KV'] },
  { id: 'MS',     label: '暖正 MS',           version: 'V0.5', group: 'BN／MS',   sheetHints: ['攻略頁_GD做圖列表', '攻略頁'] },
  { id: '暖身BN', label: '暖身 BN',           version: 'V1.5', group: 'BN／MS',   sheetHints: ['BN 暖身'] },
  { id: '正式BN', label: '正式 BN',           version: 'V0.8', group: 'BN／MS',   sheetHints: ['BN 正式'] },
];
