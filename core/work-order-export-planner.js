/* 25節 暖正 MS – 工單下載歸檔規劃器
 *
 * 「依規格表（推薦）」專用：依工單「使用公版」原始順序，將
 * 上蓋_XXX 起、直到第一個 下蓋_XXX（含）視為同一輸出資料夾。
 *
 * 規格：
 * - 資料夾：01_XXX、02_YYY ...，XXX 取該群組第一個上蓋名稱去掉「上蓋_」。
 * - 群組內檔名：01_上蓋_XXX、02_中標_XXX ...，每個群組重新由 01 起算。
 * - 群組尚未遇到下蓋前，即使再次遇到上蓋，也不另開新群組。
 * - 不在任何上蓋→下蓋區段內的項目不強制歸檔，由既有匯出邏輯處理。
 */
(function initWorkOrderExportArchivePlanner(global) {
  'use strict';

  function clean(value) {
    return String(value ?? '')
      .replace(/_x000d_/gi, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  function stripJsonExtension(value) {
    return clean(value).replace(/\.(?:template\.)?json$/i, '').trim();
  }

  function sanitizePathSegment(value, fallback = '未命名') {
    const sanitized = stripJsonExtension(value)
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/^\.+|\.+$/g, '')
      .trim();
    return sanitized || fallback;
  }

  function pad2(value) {
    return String(Math.max(0, Number(value) || 0)).padStart(2, '0');
  }

  function getItem(entry) {
    return entry?.item || entry || {};
  }

  function getSourceTemplateName(entry) {
    const item = getItem(entry);
    const data = item?.data || {};
    return stripJsonExtension(
      data.batchSourceName
      || item?.batchRecord?.__sourceTemplateName
      || data?.batchRecord?.__sourceTemplateName
      || data?.sheetTemplateRoute?.sourceTemplateId
      || data?.sourceTemplateId
      || item?.name
      || data?.templateId
      || ''
    );
  }

  function isTopCover(sourceName) {
    return /^上蓋(?:_|\s|$)/.test(stripJsonExtension(sourceName));
  }

  function isBottomCover(sourceName) {
    return /^下蓋(?:_|\s|$)/.test(stripJsonExtension(sourceName));
  }

  function getTopCoverLabel(sourceName) {
    const source = stripJsonExtension(sourceName);
    const label = source.replace(/^上蓋(?:_|\s)*/i, '').trim();
    return sanitizePathSegment(label, '未命名');
  }

  function build(entries = []) {
    let groupIndex = 0;
    let activeGroup = null;

    return (entries || []).map((entry, sourceIndex) => {
      const sourceName = getSourceTemplateName(entry);

      if (!activeGroup && isTopCover(sourceName)) {
        groupIndex += 1;
        activeGroup = {
          groupIndex,
          folderName: `${pad2(groupIndex)}_${getTopCoverLabel(sourceName)}`,
          itemIndex: 0,
          firstSourceName: sourceName,
        };
      }

      if (!activeGroup) {
        return Object.freeze({
          grouped: false,
          sourceIndex,
          sourceName,
          folderName: '',
          itemIndex: 0,
          fileStem: '',
        });
      }

      activeGroup.itemIndex += 1;
      const itemIndex = activeGroup.itemIndex;
      const meta = Object.freeze({
        grouped: true,
        sourceIndex,
        sourceName,
        groupIndex: activeGroup.groupIndex,
        firstSourceName: activeGroup.firstSourceName,
        folderName: activeGroup.folderName,
        itemIndex,
        fileStem: `${pad2(itemIndex)}_${sanitizePathSegment(sourceName)}`,
      });

      if (isBottomCover(sourceName)) activeGroup = null;
      return meta;
    });
  }

  global.WorkOrderExportArchivePlanner = Object.freeze({
    build,
    getSourceTemplateName,
    getTopCoverLabel,
    isTopCover,
    isBottomCover,
    sanitizePathSegment,
  });
})(window);
