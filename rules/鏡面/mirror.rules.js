/* 25節鏡面：工單解析、公版分流與人名標套版規則。
 *
 * 這支檔案是鏡面公版唯一的真實來源（rules-as-source-of-truth）：
 *   - sheetParser：解析鏡面工單，一列產出一筆製作物
 *   - resolveRecordTemplateRoute：把「位置」對應到 templates/*.json
 *   - afterApplyRecordToTemplate：只有「人名標」會把 title：後的姓名套進「主持人名稱」圖層
 *   - __specFormat：宣告輸出格式（鏡面一律 png），由 core 的匯出流程遵循
 * core/app.core.js 不含任何鏡面專屬邏輯。
 */
(function registerMirrorRules() {
  'use strict';

  const FAMILY = 'mirror_25';
  const WORKFLOW = 'mirror-25';
  const OUTPUT_FORMAT = 'png';
  const EXPECTED_SIZE = Object.freeze({ width: 1080, height: 1920, label: '1080x1920' });

  // 鏡面工單的「位置」→ 公版。key 為 normalize() 後的字串，必須精準命中才產圖。
  const POSITION_ROUTES = Object.freeze({
    人名標: { templateId: '人名標', outputPrefix: '人名標' },
    天空bar: { templateId: '天空Bar', outputPrefix: '天空Bar' },
    底bar: { templateId: '底Bar', outputPrefix: '底Bar' },
    開框留底字卡: { templateId: '開框留底字卡', outputPrefix: '開框留底字卡' },
    循環動畫底圖: { templateId: '循環動畫底圖', outputPrefix: '循環動畫底圖' },
  });

  const HOST_NAME_TEMPLATE_ID = '人名標';
  const HOST_NAME_LAYER = '主持人名稱';

  const HEADER_ALIASES = Object.freeze({
    position: ['位置', '使用位置'],
    kLimit: ['k數', 'k数', '容量', '檔案大小'],
    size: ['尺寸', 'size'],
    copy: ['文案', '文字'],
  });

  const text = (value) => String(value ?? '')
    .replace(/_x000d_/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .trim();

  const normalize = (value) => text(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u00a0\u3000_\-()（）\[\]【】.]+/g, '');

  const normalizeHeader = (value) => normalize(value).replace(/[：:]/g, '');

  function parseDimensions(value) {
    const match = text(value).normalize('NFKC').match(/(\d{2,4})\s*(?:px)?\s*[x×＊*]\s*(\d{2,4})\s*(?:px)?/i);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return { width, height, label: `${width}x${height}` };
  }

  // K 數欄位只取數字（單位視為 KB）；空白、「x」、或誤填成尺寸時都視為沒有上限。
  function parseKLimit(value) {
    const raw = text(value).normalize('NFKC');
    if (!raw || /^(?:x|-|－|—)$/i.test(raw) || parseDimensions(raw)) return null;
    const match = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const kiloBytes = Number(match[1]);
    return Number.isFinite(kiloBytes) && kiloBytes > 0 ? Math.floor(kiloBytes * 1000) : null;
  }

  // 人名標的姓名寫在文案欄的「title：」後面，同一行為止。
  function parseHostName(rawCopy) {
    const source = text(rawCopy).normalize('NFKC');
    const match = source.match(/title\s*[:：]\s*([^\r\n]+)/i);
    if (!match) return '';
    return text(match[1]).replace(/[。；;，,]+$/g, '').trim();
  }

  // 工單的標題列位置不固定，改用「同一列同時找到 位置 / 尺寸 / 文案」來判斷。
  function findHeader(rows) {
    const aliases = Object.fromEntries(
      Object.entries(HEADER_ALIASES).map(([field, names]) => [field, new Set(names.map(normalizeHeader))]),
    );

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const columnMap = {};
      row.forEach((cell, columnIndex) => {
        const key = normalizeHeader(cell);
        if (!key) return;
        Object.entries(aliases).forEach(([field, values]) => {
          if (columnMap[field] === undefined && values.has(key)) columnMap[field] = columnIndex;
        });
      });
      if (columnMap.position !== undefined && columnMap.size !== undefined && columnMap.copy !== undefined) {
        return { rowIndex, columnMap };
      }
    }
    return null;
  }

  function routeFor(position) {
    const route = POSITION_ROUTES[normalize(position)];
    if (!route) return null;
    return {
      key: FAMILY,
      family: FAMILY,
      label: position,
      templateId: route.templateId,
      templateFile: `${route.templateId}.json`,
      outputPrefix: route.outputPrefix,
    };
  }

  function buildRecord({ row, rowIndex, columnMap, route, sequence }) {
    const rawCopy = text(row[columnMap.copy]);
    return {
      __workflow: WORKFLOW,
      __sourceRow: rowIndex + 1,
      __position: text(row[columnMap.position]),
      __width: EXPECTED_SIZE.width,
      __height: EXPECTED_SIZE.height,
      __size: EXPECTED_SIZE.label,
      __kLimitBytes: parseKLimit(columnMap.kLimit === undefined ? '' : row[columnMap.kLimit]),
      __specFormat: OUTPUT_FORMAT,
      __route: route,
      __templateId: route.templateId,
      __outputName: `${route.outputPrefix}_${String(sequence).padStart(2, '0')}_${EXPECTED_SIZE.label}`,
      __rawCopy: rawCopy,
      __hostName: route.templateId === HOST_NAME_TEMPLATE_ID ? parseHostName(rawCopy) : '',
      __sourceCells: row,
    };
  }

  function parseSheet({ rows, helpers = {} }) {
    const header = findHeader(rows || []);
    if (!header) return null;

    const { rowIndex: headerRow, columnMap } = header;
    // 位置欄是垂直合併儲存格時，工單只是把同一個版位的說明寫成好幾列；
    // 合併範圍內的第二列之後視同空白位置列，不再產圖。
    const isMergedFill = typeof helpers.isMergedFill === 'function' ? helpers.isMergedFill : () => false;
    const blocks = [];
    const warnings = [];
    const skippedRows = [];
    const counters = new Map();
    const skip = (rowIndex, name, reason) => skippedRows.push({ row: rowIndex + 1, name, reason });

    for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const position = text(row[columnMap.position]);
      if (!position) continue; // 鏡面工單的空白位置列不繼承上一列，也不產圖。
      if (isMergedFill(rowIndex, columnMap.position)) continue; // 合併儲存格的延伸列同上。

      const route = routeFor(position);
      if (!route) {
        skip(rowIndex, position, '位置名稱沒有精準對應公版，已略過');
        continue;
      }

      const dimensions = parseDimensions(row[columnMap.size]);
      if (!dimensions) {
        skip(rowIndex, position, '讀不到有效尺寸，已略過');
        continue;
      }
      if (dimensions.width !== EXPECTED_SIZE.width || dimensions.height !== EXPECTED_SIZE.height) {
        skip(rowIndex, position, `尺寸 ${dimensions.label} 與公版 ${EXPECTED_SIZE.label} 不符，已略過`);
        continue;
      }

      const sequence = (counters.get(route.outputPrefix) || 0) + 1;
      const record = buildRecord({ row, rowIndex, columnMap, route, sequence });
      if (route.templateId === HOST_NAME_TEMPLATE_ID && !record.__hostName) {
        skip(rowIndex, position, '文案中找不到 title：姓名，已略過');
        continue;
      }
      counters.set(route.outputPrefix, sequence);

      blocks.push({
        name: position,
        headerRow,
        startRow: rowIndex,
        quantity: 1,
        records: [record],
        colMap: columnMap,
        templateType: FAMILY,
      });
    }

    if (!blocks.length && !skippedRows.length) warnings.push('已找到鏡面工單標題列，但下方沒有可產圖資料。');

    return {
      handled: true,
      workflow: WORKFLOW,
      blocks,
      warnings,
      skippedRows,
      anchorCount: 1,
    };
  }

  // 其他 4 個公版只依位置與尺寸選公版，保留 JSON 原有的 KV_BG 與元件，不套入工單文案。
  function applyRecord({ template, record, diagnostics, skipExactLayout = false }) {
    const sourceTemplateId = String(
      template?.sheetTemplateRoute?.sourceTemplateId
      || template?.canvas?.templateId
      || template?.templateId
      || '',
    ).trim();

    if (sourceTemplateId !== HOST_NAME_TEMPLATE_ID) {
      diagnostics.push({ field: '套版', status: 'ok', value: record.__position, target: sourceTemplateId });
      return;
    }

    const layer = template?.layers?.[HOST_NAME_LAYER];
    if (!layer || layer.type !== 'text') {
      diagnostics.push({ field: HOST_NAME_LAYER, status: 'missing-layer', value: record.__hostName, target: `找不到${HOST_NAME_LAYER}圖層` });
      return;
    }

    // 使用者手動改過主持人名稱之後，縮圖刷新或重新選取時不覆蓋手動文字。
    if (skipExactLayout === true && layer.__manualTextEdited === true) {
      diagnostics.push({ field: HOST_NAME_LAYER, status: 'manual-override', value: layer.text, target: layer.psdName || HOST_NAME_LAYER });
      return;
    }

    layer.text = text(record.__hostName);
    layer.hidden = false;
    diagnostics.push({ field: HOST_NAME_LAYER, status: 'ok', value: layer.text, target: layer.psdName || HOST_NAME_LAYER });
  }

  window.TemplateRuleRegistry.register(FAMILY, {
    label: '25節鏡面',
    priority: 1000,
    targets: Object.values(POSITION_ROUTES).map((route) => route.templateId),
    tokens: Object.values(POSITION_ROUTES).map((route) => route.templateId),
    sheetParser: parseSheet,
    rules: {
      // 素材搜尋範圍：公版同名資料夾 → assets 根目錄 → 共用素材，範圍外不再跨資料夾備援。
      // 鏡面的 KV_BG 都放在 assets/<公版名>/ 底下，靠這個宣告命中，不需要使用者先選專案。
      assetLookup: { scope: 'strict' },
      resolveRecordTemplateRoute({ record }) {
        if (!record?.__route) return null;
        return { ...record.__route, outputName: record.__outputName };
      },
      afterApplyRecordToTemplate: applyRecord,
    },
  });

  window.MirrorRules = Object.freeze({
    FAMILY,
    WORKFLOW,
    EXPECTED_SIZE,
    normalize,
    parseDimensions,
    parseKLimit,
    parseHostName,
    routeFor,
    parseSheet,
  });
})();
