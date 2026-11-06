/* 整合版（自 18節 移植，2026-11-06）— 輸出檔名用工單的「編號」欄（18節 封測第二輪 P0-3；25節 封測 P0-5）
 *
 * 工單每個製作物區塊的表頭多了「編號」欄（DD card 1～22、HBN 1～22…）。使用者決定：
 *   - 工單有「檔名」欄（AMS／KOL）照舊用檔名欄；
 *   - 沒有檔名欄但有「編號」欄 → 檔名＝製作內容_編號（補兩位）：DD card_01、HBN_07、POPUP_03；一筆多張的接變體：頭巾_01_下單去、SKBN APP_中_03；
 *   - 編號空白或重複 → 退回流水號，診斷警告一行；
 *   - 縮圖、製作物清單也顯示同一個名字（原本是 DDC_17 這種內部代號）。
 *
 * 做法（純加法）：
 *   1. 包住 BatchManager.parseRows／readRecordFromRow：A 系解析器（暖身BN／正式BN 覆寫版）的欄位清單沒有「編號」，這裡先掃表頭找出
 *      「編號／序號／No」欄在哪一欄，讀每一列時把值補進 record['編號']（core/work-order-content-planner.js 本來就會優先用它排檔名）；
 *      解析完再檢查空白／重複。
 *   2. 包住 BatchManager.generateForCurrentProject：產完後用 WorkOrderContentPlanner 算出每張的檔名，寫回 item.name／file（內部 templateId 不動，
 *      規則與價格引擎照舊）。只有 export.folderStrategy＝workOrderContent 的分類（暖身BN／正式BN／MS）才改名。
 */
(function initRecordNumberNaming() {
  'use strict';

  const NUMBER_COLUMNS = ['編號', '序號', 'no', 'no.', '#'];
  const flag = (name, fallback) => { const value = window.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const isNumberHeader = (cell) => NUMBER_COLUMNS.includes(clean(cell).toLowerCase());

  function numberColumnOf(rows, headerRow) {
    const header = rows[headerRow] || [];
    return header.findIndex(isNumberHeader);
  }

  /** 區塊沒帶 headerRow（B 系解析器）：從第一筆往上找有「編號」字樣的列 */
  function findHeaderAbove(rows, fromRow) {
    for (let r = fromRow; r >= 0 && r >= fromRow - 40; r -= 1) if ((rows[r] || []).some(isNumberHeader)) return r;
    return -1;
  }

  // 列 → 編號欄位置（parseRows 進來時先掃一遍：每個表頭列往下到下一個表頭列為止，都用那一列的編號欄）
  const numberColumnByRow = new WeakMap();
  function indexRows(rows) {
    let current = -1;
    (rows || []).forEach((row) => {
      if (!Array.isArray(row)) return;
      const headerCol = row.findIndex(isNumberHeader);
      if (headerCol >= 0) { current = headerCol; return; }
      if (row.some((cell) => clean(cell) === '製作內容')) current = -1; // 沒有編號欄的表頭
      if (current >= 0) numberColumnByRow.set(row, current);
    });
  }

  /** A 系解析器的 readRecordFromRow(row, colMap) 只讀它認得的欄位：這裡把同一列的編號補進去 */
  function withNumber(record, row) {
    if (!record || typeof record !== 'object' || !Array.isArray(row)) return record;
    const col = numberColumnByRow.get(row);
    if (col === undefined || clean(record['編號'])) return record;
    const raw = clean(row[col]);
    if (raw) record['編號'] = raw;
    return record;
  }

  /** 解析完：編號空白／重複 → 警告（檔名會退回流水號） */
  function auditNumbers(result) {
    const warnings = Array.isArray(result?.warnings) ? result.warnings : (result.warnings = []);
    (result?.blocks || []).forEach((block) => {
      const records = block.records || [];
      if (!records.some((record) => clean(record?.['編號']))) return; // 這個區塊沒有編號欄
      const seen = new Map();
      records.forEach((record, index) => {
        const raw = clean(record?.['編號']);
        const where = record?.__sourceRow ? `第 ${record.__sourceRow} 列` : `第 ${index + 1} 筆`;
        // 25節 的編號是代碼（260525HBN01）：整串當鍵；純數字（18節）正規化成數字
        const isCode = /[A-Za-z]/.test(raw);
        const number = isCode ? raw : parseInt(raw.replace(/[^\d]/g, ''), 10);
        if (!raw || (!isCode && (!Number.isFinite(number) || number <= 0))) { warnings.push(`「${block.name}」${where}：編號空白，檔名改用流水號`); delete record['編號']; return; }
        if (seen.has(number)) { warnings.push(`「${block.name}」${where}：編號 ${number} 跟${seen.get(number)}重複，檔名改用流水號`); delete record['編號']; return; }
        seen.set(number, where);
        record['編號'] = String(number);
      });
    });
    return result;
  }

  /** 產完圖：縮圖／清單名稱改成「製作內容_編號[_變體]」（跟下載檔名一致） */
  function renameGenerated(result) {
    const Planner = window.WorkOrderContentPlanner;
    if (!Planner?.build || flag('export.folderStrategy', '') !== 'workOrderContent') return result;
    const entries = (result?.generated || []).map((item, index) => ({ ...item, index }));
    const plan = Planner.build(entries);
    entries.forEach((entry, index) => {
      const planned = plan[index];
      if (!planned?.fileStem) return;
      const item = result.generated[index];
      item.displayName = planned.fileStem;
      item.name = planned.fileStem;
      item.file = `${planned.fileStem}.generated`;
    });
    return result;
  }

  function wrap(target, method, after, { async = false } = {}) {
    const original = target?.[method];
    if (typeof original !== 'function' || original.__recordNumberWired) return;
    const wrapped = async
      ? async function wrappedAsync(...args) { const result = await original.apply(this, args); try { return after(result, ...args) || result; } catch (_) { return result; } }
      : function wrappedSync(...args) { const result = original.apply(this, args); try { return after(result, ...args) || result; } catch (_) { return result; } };
    wrapped.__recordNumberWired = true;
    target[method] = wrapped;
  }

  function wireParser() {
    const BatchManager = window.BatchManager;
    const parseRows = BatchManager?.parseRows;
    if (typeof parseRows === 'function' && !parseRows.__recordNumberWired) {
      const wrapped = function parseRowsWithNumbers(rows, ...rest) { indexRows(rows); return auditNumbers(parseRows.call(this, rows, ...rest)); };
      wrapped.__recordNumberWired = true;
      BatchManager.parseRows = wrapped;
    }
    const readRecordFromRow = BatchManager?.readRecordFromRow;
    if (typeof readRecordFromRow === 'function' && !readRecordFromRow.__recordNumberWired) {
      const wrapped = function readRecordWithNumber(row, ...rest) { return withNumber(readRecordFromRow.call(this, row, ...rest), row); };
      wrapped.__recordNumberWired = true;
      BatchManager.readRecordFromRow = wrapped;
    }
  }

  function wire() {
    const BatchManager = window.BatchManager;
    wireParser();
    wrap(BatchManager, 'generateForCurrentProject', (result) => renameGenerated(result), { async: true });
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.RecordNumberNaming = Object.freeze({ auditNumbers, renameGenerated });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
