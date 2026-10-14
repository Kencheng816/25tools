/* OM Wave 1 Excel parser. */
(function registerOmWave1Parser() {
  'use strict';

  const M = window.OMWave1TemplateMatcher;

  function clean(value) { return String(value ?? '').trim(); }

  // 把一列轉成「無空洞」的字串陣列。
  // 工單分頁的 !ref 若不是從 A 欄起算，上游可能傳進稀疏陣列（index 0 是 hole）；
  // Array.prototype.map 會保留 hole，而 findIndex 不會跳過 hole，
  // callback 會拿到 undefined 導致 value.includes(...) 丟 TypeError。
  // Array.from 會把 hole 補成 undefined 再交給 clean()，統一變成空字串。
  function rowValues(row) { return Array.from(row || [], clean); }

  function parseContentCell(value) {
    const record = {};
    let section = '';
    const supportedSections = new Set(['券1', '券2', '下左', '下中', '下右']);

    const assign = (field, text) => {
      const scopedKey = section ? `${section}_${field}` : field;
      record[scopedKey] = text;
    };

    String(value || '').split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      // 空行代表區段結束。這一點很重要：券2 後方可能還有「全版副標題」，不可繼續算在券2內。
      if (!line) { section = ''; return; }
      if (/^※/.test(line)) return;

      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        const nextSection = sectionMatch[1].trim();
        section = supportedSections.has(nextSection) ? nextSection : '';
        return;
      }

      const match = line.match(/^([^:：]+)\s*[:：]\s*(.*)$/);
      if (!match) return;
      const label = match[1].trim();
      const text = match[2].trim();
      if (!text || /^(不需要|無|none)$/i.test(text)) return;

      if (/^Layout\s*編號$/i.test(label)) record.__layoutNo = text;
      else if (/^券頭LOGO$/i.test(label)) record['券頭LOGO'] = text;
      else if (/^券頭底色$/i.test(label)) record['券頭底色'] = text;
      else if (/^Logo$/i.test(label)) assign('LOGO', text);
      else if (/^CTA$/i.test(label)) assign('CTA', text);
      else if (/^主標(?:題)?$/.test(label)) assign('主標', text);
      else if (/^副標(?:題)?$/.test(label)) assign('副標', text);
      else if (/警語|法務/.test(label)) assign('警語', text);
      else if (/^文案$/.test(label)) assign('文案', text);
      else if (/Icon\s*\/\s*曝品|曝品|商品圖/.test(label)) {
        // LineOA 的 [下左]/[下中]/[下右] 曝品是「一格一個描述」，保留完整文字給專屬 Rule 做關鍵字解析；
        // 一般 OM 的商品圖欄位仍維持原本的逗號/頓號拆品邏輯。
        if (section) {
          assign('曝品', text);
        } else {
          const products = text.split(/[、，,]+/).map((item) => item.trim()).filter(Boolean);
          record.__omProducts = products;
          record['商品圖1'] = products[0] || '';
          record['商品圖2'] = products[1] || '';
        }
      } else if (/^價格$/.test(label)) assign('價格', text);
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
    if (parsed.__layoutNo) score += 30;
    if (Object.keys(parsed).some((key) => /^(券[12]|下左|下中|下右)_/.test(key))) score += 60;
    return score;
  }

  function findContentInRow(row) {
    const candidates = rowValues(row)
      .filter((value) => /(?:Layout\s*編號|券頭LOGO|主標(?:題)?|副標(?:題)?|警語|法務|Icon\s*\/\s*曝品|曝品|商品圖|文案|CTA|Logo|價格)\s*[:：]/i.test(value));
    if (!candidates.length) return '';

    // 同一列可能同時存在「素材說明」與真正要代入公版的內容。
    // 不能用字數最長判斷（例如素材說明中的「Icon/曝品：預放3品」可能更長），
    // 改以可解析欄位完整度排序：主標/副標/警語/文案的權重高於單一素材備註。
    return candidates
      .map((value) => ({ value, score: contentScore(value) }))
      .sort((a, b) => b.score - a.score || b.value.length - a.value.length)[0]?.value || '';
  }

  function isHeader(row) {
    const values = rowValues(row);
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
      const headers = rowValues(rows[headerRows[h]]);
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
        const values = rowValues(row);
        if (values.some((value) => value.includes('反饋統整'))) break;

        const mediaCell = clean(row[mediaCol]);
        if (mediaCell) media = M.normalizeMedia(mediaCell);
        const layoutCell = clean(row[layoutCol]);
        if (layoutCell) layoutNo = layoutCell;
        const kCell = kCol >= 0 ? clean(row[kCol]) : '';
        if (kCell) kSpec = kCell;

        const size = M.normalizeSize(row[sizeCol]);
        const outputName = clean(row[outputCol]);
        const content = findContentInRow(row);
        const parsedContent = parseContentCell(content);
        // LineOA 的 Layout 編號寫在內容欄，而不是 Layout No. 欄。
        // 不能沿用上一列的 layoutNo，否則會把前一個 Appier banner 編號帶進 LineOA。
        const effectiveLayoutNo = M.normalizeMedia(media) === M.MEDIA.LINEOA
          ? String(parsedContent.__layoutNo || layoutCell || '').trim()
          : layoutNo;
        if (!size || !outputName || !media) continue;

        rawItems.push({ rowIndex: r, media, layoutNo: effectiveLayoutNo, kSpec, size, outputName, content });
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
        __hasContent: true,
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
      if (M.normalizeMedia(item.media) === M.MEDIA.LINEOA) return;
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
        const lineOaOnly = blocks.filter((block) => String(block.records?.[0]?.__outputName || '').trim() === name)
          .every((block) => M.normalizeMedia(block.records?.[0]?.__media) === M.MEDIA.LINEOA);
        if (!lineOaOnly) warnings.push(`檔案命名重複「${name}」（工單列 ${sourceRows.join('、')}）；依設定不自動改名，匯出前請修正工單避免同名覆蓋。`);
      }
    });

    return { blocks, anchorCount: headerRows.length, warnings, skippedRows };
  }

  window.OMWave1Parser = Object.freeze({ parse, parseContentCell, findContentInRow });
})();
