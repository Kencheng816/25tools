/* OM Wave 1 Excel parser. */
(function registerOmWave1Parser() {
  'use strict';

  const M = window.OMWave1TemplateMatcher;

  function clean(value) { return String(value ?? '').trim(); }

  function parseContentCell(value) {
    const record = {};
    String(value || '').split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || /^※/.test(line)) return;
      const match = line.match(/^([^:：]+)\s*[:：]\s*(.*)$/);
      if (!match) return;
      const label = match[1].trim();
      const text = match[2].trim();
      if (!text || /^(不需要|無|none)$/i.test(text)) return;

      if (/^主標(?:題)?$/.test(label)) record['主標'] = text;
      else if (/^副標(?:題)?$/.test(label)) record['副標'] = text;
      else if (/警語|法務/.test(label)) record['警語'] = text;
      else if (/^文案$/.test(label)) record['文案'] = text;
      else if (/Icon\s*\/\s*曝品|曝品|商品圖/.test(label)) {
        const products = text.split(/[、，,]+/).map((item) => item.trim()).filter(Boolean);
        record.__omProducts = products;
        record['商品圖1'] = products[0] || '';
        record['商品圖2'] = products[1] || '';
      } else if (/^價格$/.test(label)) record['價格'] = text;
    });
    return record;
  }

  function contentScore(value) {
    const parsed = parseContentCell(value);
    let score = 0;
    if (parsed['主標']) score += 40;
    if (parsed['副標']) score += 40;
    if (parsed['警語']) score += 25;
    if (parsed['文案']) score += 30;
    if (parsed['價格']) score += 10;
    if (Array.isArray(parsed.__omProducts) && parsed.__omProducts.length) score += 20 + parsed.__omProducts.length;
    return score;
  }

  function findContentInRow(row) {
    const candidates = (row || [])
      .map((value) => clean(value))
      .filter((value) => /(?:主標(?:題)?|副標(?:題)?|警語|法務|Icon\s*\/\s*曝品|曝品|商品圖|文案|價格)\s*[:：]/i.test(value));
    if (!candidates.length) return '';

    // 同一列可能同時存在「素材說明」與真正要代入公版的內容。
    // 不能用字數最長判斷（例如素材說明中的「Icon/曝品：預放3品」可能更長），
    // 改以可解析欄位完整度排序：主標/副標/警語/文案的權重高於單一素材備註。
    return candidates
      .map((value) => ({ value, score: contentScore(value) }))
      .sort((a, b) => b.score - a.score || b.value.length - a.value.length)[0]?.value || '';
  }

  function isHeader(row) {
    const values = (row || []).map(clean);
    return values.some((value) => value === '曝光媒體')
      && values.some((value) => /Layout\s*No\.?/i.test(value))
      && values.some((value) => value.includes('尺寸'))
      && values.some((value) => value.includes('檔案命名'));
  }

  function parse({ rows }) {
    if (!M || !Array.isArray(rows)) return null;
    const headerRows = [];
    rows.forEach((row, index) => { if (isHeader(row)) headerRows.push(index); });
    if (!headerRows.length) return null;

    const rawItems = [];
    for (let h = 0; h < headerRows.length; h += 1) {
      const headerRow = rows[headerRows[h]] || [];
      const headers = headerRow.map(clean);
      const mediaCol = headers.findIndex((value) => value === '曝光媒體');
      const layoutCol = headers.findIndex((value) => /Layout\s*No\.?/i.test(value));
      const sizeCol = headers.findIndex((value) => value.includes('尺寸'));
      const outputCol = headers.findIndex((value) => value.includes('檔案命名'));
      const kCol = headers.findIndex((value) => /K數/i.test(value));
      if ([mediaCol, layoutCol, sizeCol, outputCol].some((index) => index < 0)) continue;

      const start = headerRows[h] + 1;
      const end = h + 1 < headerRows.length ? headerRows[h + 1] : rows.length;
      let media = '';
      let layoutNo = '';
      let kSpec = '';

      for (let r = start; r < end; r += 1) {
        const row = rows[r] || [];
        const rowValues = row.map(clean);
        if (rowValues.some((value) => value.includes('反饋統整'))) break;

        const mediaCell = clean(row[mediaCol]);
        if (mediaCell) media = M.normalizeMedia(mediaCell);
        const layoutCell = clean(row[layoutCol]);
        if (layoutCell) layoutNo = layoutCell;
        const kCell = kCol >= 0 ? clean(row[kCol]) : '';
        if (kCell) kSpec = kCell;

        const size = M.normalizeSize(row[sizeCol]);
        const outputName = clean(row[outputCol]);
        const content = findContentInRow(row);
        if (!size || !outputName || !media) continue;

        rawItems.push({ rowIndex: r, media, layoutNo, kSpec, size, outputName, content });
      }
    }

    if (!rawItems.length) return null;

    // Same media + Layout No. shares the first non-empty content across all resize rows.
    const inheritedContent = new Map();
    rawItems.forEach((item) => {
      if (!item.content) return;
      inheritedContent.set(`${M.normalizeMedia(item.media)}|${item.layoutNo}`, parseContentCell(item.content));
    });

    const blocks = [];
    const skippedRows = [];
    const warnings = [];
    rawItems.forEach((item) => {
      const templateId = M.resolveTemplateId(item.media, item.size, item.layoutNo);
      if (!templateId) {
        skippedRows.push({ row: item.rowIndex + 1, name: item.media, reason: `找不到 ${item.media} / ${item.size} 對應正式公版` });
        return;
      }
      const own = parseContentCell(item.content);
      const fallback = inheritedContent.get(`${M.normalizeMedia(item.media)}|${item.layoutNo}`) || {};
      const contentRecord = Object.keys(own).length ? own : fallback;
      const family = M.familyForMedia(item.media);
      const record = {
        ...contentRecord,
        __sourceRow: item.rowIndex + 1,
        __media: M.normalizeMedia(item.media),
        __layoutNo: item.layoutNo,
        __size: item.size,
        __kSpec: item.kSpec,
        __outputName: M.normalizeOutputName(item.outputName),
        __templateId: templateId,
        __ruleFamily: family,
        版位: M.normalizeMedia(item.media),
      };
      blocks.push({
        name: templateId,
        headerRow: headerRows[0],
        startRow: item.rowIndex,
        quantity: 1,
        records: [record],
        colMap: {},
        templateType: 'om-wave1',
      });

      // 檔名完全依工單原值，不做自動校正；但明顯與 Layout No. 不一致時提出警告，
      // 避免不同版位最後寫成同名 JPG 而在 ZIP 中互相覆蓋。
      const layoutBanner = String(item.layoutNo || '').match(/banner\s*(\d+)/i)?.[1] || '';
      const outputBanner = String(item.outputName || '').match(/banner\s*(\d+)/i)?.[1] || '';
      if (layoutBanner && outputBanner && layoutBanner !== outputBanner) {
        warnings.push(`第 ${item.rowIndex + 1} 列檔案命名「${item.outputName}」與 Layout No.「${item.layoutNo}」不一致；依設定保留工單原檔名，請於工單修正。`);
      } else if (M.normalizeMedia(item.media) !== M.MEDIA.DPA && !outputBanner) {
        warnings.push(`第 ${item.rowIndex + 1} 列檔案命名「${item.outputName}」未包含 banner 編號；依設定保留工單原檔名。`);
      }
    });

    const outputRows = new Map();
    blocks.forEach((block) => {
      const record = block.records?.[0] || {};
      const name = String(record.__outputName || '').trim();
      if (!name) return;
      if (!outputRows.has(name)) outputRows.set(name, []);
      outputRows.get(name).push(record.__sourceRow);
    });
    outputRows.forEach((sourceRows, name) => {
      if (sourceRows.length > 1) {
        warnings.push(`檔案命名重複「${name}」（工單列 ${sourceRows.join('、')}）；依設定不自動改名，匯出前請修正工單避免同名覆蓋。`);
      }
    });

    return { blocks, anchorCount: headerRows.length, warnings, skippedRows };
  }

  window.OMWave1Parser = Object.freeze({ parse, parseContentCell, findContentInRow });
})();
