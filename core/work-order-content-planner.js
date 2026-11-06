/* 整合版（自 18節 移植，2026-11-06）— 依「製作內容」歸檔規劃器
 *
 * 18節 2026-10-07 回饋 2（25節 使用者 2026-11-05 決定沿用）：下載圖片時依工單「製作內容」由上而下自動分資料夾，檔名用「製作內容_編號」。
 *   資料夾：01_頭巾、02_DD card、03_HBN …（編號＝該製作內容在工單中第一次出現的順序）
 *   檔名：  DD card_01、DD card_02 …（工單有「編號／序號／No」欄就用它，沒有就在「該製作內容＋變體」內由上往下依序，各變體各自從 01 起算）
 *   變體：  同一製作內容若對應不同公版（頭巾_蝦皮購物／頭巾_VIP、POPUP_VIP、Seller BN_Mall+SV），
 *           把來源公版名中「製作內容已經講過的字」去掉，剩下的接在製作內容後面：頭巾_蝦皮購物_01_下單去。
 *   尾綴：  原輸出名在編號後面的尾巴（頭巾的 下單去／點我領／兌換完畢）照舊保留。
 *
 * 以完整工單順序（不只勾選的）規劃，取消勾選部分縮圖不會改變編號。
 * 只在 export.folderStrategy＝workOrderContent 時由 ExportManager 呼叫；沒有製作內容的項目回 null，走原本的歸檔。
 */
(function initWorkOrderContentPlanner(global) {
  'use strict';

  // 25節：core 把工單欄位掛在 __編號／__備註No（頭巾區塊沒有編號欄、只有「備註」的出圖編號 1,2,3,5,6 → 當備援）
  const NUMBER_COLUMNS = ['編號', '__編號', '序號', 'No', 'NO', 'No.', 'NO.', '#', '備註No', '__備註No'];
  const flag = (name, fallback) => { const value = global.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };
  const ABBREVIATION_MAX_LENGTH = 5;

  const clean = (value) => String(value ?? '').replace(/_x000d_/gi, ' ').replace(/\s+/g, ' ').trim();
  const normalize = (value) => clean(value).toLowerCase().replace(/[\s_\-+]+/g, '');
  const pad2 = (value) => String(Math.max(0, Number(value) || 0)).padStart(2, '0');
  const sanitizeSegment = (value, fallback = '未分類') => clean(value).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/^\.+|\.+$/g, '').trim() || fallback;

  /** 短英文縮寫（BN→Banner、DDC→DD card、SKBN→SKBN APP）：字母依序出現在製作內容裡就視為同一個詞。 */
  function isSubsequence(short, long) {
    let position = 0;
    for (const char of short) {
      position = long.indexOf(char, position);
      if (position < 0) return false;
      position += 1;
    }
    return true;
  }

  function tokenAlreadyInContent(token, normalizedContent) {
    const normalizedToken = normalize(token);
    if (!normalizedToken) return true;
    if (normalizedContent.includes(normalizedToken) || normalizedToken.includes(normalizedContent)) return true;
    return /^[a-z0-9()]+$/.test(normalizedToken) && normalizedToken.length <= ABBREVIATION_MAX_LENGTH && isSubsequence(normalizedToken, normalizedContent);
  }

  /** 來源公版名去掉「NN_」前綴與製作內容已涵蓋的字，剩下的就是變體（蝦皮購物／VIP／中_VIP／Mall+SV）。 */
  function variantFromSource(sourceId, contentName) {
    const stripped = clean(sourceId).replace(/\.(?:template\.)?json$/i, '').replace(/^\d+[_\s-]+/, '');
    if (!stripped) return '';
    const normalizedContent = normalize(contentName);
    return stripped.split(/[_\s]+/).filter((token) => !tokenAlreadyInContent(token, normalizedContent)).join('_');
  }

  /** 原輸出名「…_01_下單去」的尾巴；沒有編號段就沒有尾綴。 */
  function suffixFromOutputName(outputName) {
    const match = /_(\d{2,})(?:_(.+))?$/.exec(clean(outputName));
    return match?.[2] ? match[2] : '';
  }

  /**
   * 工單的編號：純數字（18節 1～22、25節 備註No 1,2,3,5,6）回數字；
   * 25節 的編號是代碼（260525HBN01、260525Others01）→ 回代碼字串（去掉檔名不能用的字元），由 build 決定怎麼接進檔名。
   */
  function numberFromRecord(record) {
    if (!record || typeof record !== 'object') return 0;
    for (const column of NUMBER_COLUMNS) {
      const raw = clean(record[column]);
      if (!raw) continue;
      if (/^\d+$/.test(raw)) { const parsed = parseInt(raw, 10); if (parsed > 0) return parsed; continue; }
      if (/^[A-Za-z0-9][A-Za-z0-9_\-]*$/.test(raw) && /\d/.test(raw)) return raw;
    }
    return 0;
  }

  function sourceTemplateIdOf(template) {
    return global.SnapshotManager?.sourceTemplateId?.(template) || template?.sheetTemplateRoute?.sourceTemplateId || '';
  }

  /**
   * @param {Array<{index:number,name:string,data:object}>} entries 完整 AppState.templates（含 index）
   * @returns {Array<{folder:string,fileStem:string,contentName:string}|null>} 以 entry.index 為鍵
   */
  function build(entries) {
    const plan = [];
    const folderOrder = new Map();
    const sequenceByContent = new Map();
    const takenStems = new Set();

    for (const entry of entries || []) {
      const template = entry?.data || {};
      const contentName = clean(template.batchSourceName);
      if (!contentName) { plan[entry.index] = null; continue; }

      if (!folderOrder.has(contentName)) folderOrder.set(contentName, folderOrder.size + 1);
      const folder = `${pad2(folderOrder.get(contentName))}_${sanitizeSegment(contentName)}`;

      // 2026-10-07 使用者決定：同一製作內容下的不同變體（AR_案型／AR_LOGO+案型、頭巾_蝦皮購物／頭巾_VIP）各自從 01 起算。
      const variant = variantFromSource(sourceTemplateIdOf(template) || template.templateId, contentName);
      const sequenceKey = `${contentName}\u0001${variant}`;
      const sequence = (sequenceByContent.get(sequenceKey) || 0) + 1;
      sequenceByContent.set(sequenceKey, sequence);
      // A 系（暖身BN／正式BN）工單記錄掛在清單項目（entry.batchRecord），不在 template 上
      const number = numberFromRecord(template.batchRecord || entry.batchRecord) || sequence;

      const suffix = suffixFromOutputName(template.templateId || entry.name);
      // 25節 編號代碼（260525HBN01）：export.recordNumberMode＝contentCode → 製作內容[_變體]_代碼[_尾綴]；code → 代碼[_尾綴]（代碼本身就認得出版位）
      const isCode = typeof number === 'string';
      const codeOnly = isCode && flag('export.recordNumberMode', 'contentCode') === 'code';
      const baseStem = (codeOnly ? [number, suffix] : [sanitizeSegment(contentName), variant, isCode ? number : pad2(number), suffix]).filter(Boolean).join('_');

      let fileStem = baseStem;
      for (let duplicate = 2; takenStems.has(`${folder}/${fileStem}`); duplicate += 1) fileStem = `${baseStem}_${duplicate}`;
      takenStems.add(`${folder}/${fileStem}`);

      plan[entry.index] = { folder, fileStem, contentName };
    }
    return plan;
  }

  global.WorkOrderContentPlanner = Object.freeze({ build, variantFromSource, suffixFromOutputName, numberFromRecord });
})(window);
