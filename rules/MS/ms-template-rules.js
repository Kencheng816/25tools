/* 25節 暖正 MS – Template / 工單規則
 *
 * 原則：
 * 1. 「使用公版」是唯一公版路由來源；標準化後必須精準命中，不做相似公版 fallback。
 * 2. 「案型」依換行順序映射為 主標 / 副標 / 法務小字；特殊 LOGO 組合由各公版 Rule 接手。
 * 3. 副標題底色保留 JSON 初始寬度；只有文字實際寬度超過初始寬度時，才改成文字寬 + 40px。
 * 4. 表格_免運的物流 LOGO 完全依工單關鍵字顯示 / 隱藏。
 */
(function registerMsTemplateRules() {
  'use strict';

  const manager = window.TemplateRuleManager || window.TemplateRuleRegistry;
  if (!manager?.register) throw new Error('MS Template Rules: TemplateRuleRegistry is not ready');

  const TEMPLATE_DEFINITIONS = Object.freeze([
    { family: 'ms_上蓋_25號激省', target: '上蓋_25號激省' },
    { family: 'ms_上蓋_vip', target: '上蓋_VIP' },
    { family: 'ms_上蓋_免運懶人包', target: '上蓋_免運懶人包' },
    { family: 'ms_上蓋_加碼券', target: '上蓋_加碼券' },
    { family: 'ms_上蓋_常態', target: '上蓋_常態' },
    { family: 'ms_上蓋_為您推薦', target: '上蓋_為您推薦' },
    { family: 'ms_上蓋_蝦皮直營', target: '上蓋_蝦皮直營' },
    { family: 'ms_上蓋_限時特賣', target: '上蓋_限時特賣' },
    { family: 'ms_上蓋_精選品牌', target: '上蓋_精選品牌' },
    { family: 'ms_下蓋_藍底', target: '下蓋_藍底' },
    { family: 'ms_下蓋_綠底', target: '下蓋_綠底' },
    { family: 'ms_下蓋_黃底', target: '下蓋_黃底' },
    { family: 'ms_中標_全綠', target: '中標_全綠' },
    { family: 'ms_中標_全藍', target: '中標_全藍' },
    { family: 'ms_中標_全黃', target: '中標_全黃' },
    { family: 'ms_免運懶人包_msbn', target: '免運懶人包_MSBN' },
    { family: 'ms_票券_vip', target: '票券_VIP' },
    { family: 'ms_表格_免運', target: '表格_免運' },
  ]);

  const PRODUCT_ASSET_ALIASES = new Map([
    ['免運車+免運券', '免運車加免運券.png'],
    ['免運車＋免運券', '免運車加免運券.png'],
    ['免運車和免運券', '免運車加免運券.png'],
    ['免運車加免運券', '免運車加免運券.png'],
  ].map(([key, value]) => [normalizeAssetAlias(key), value]));

  const SHAPE_RULES = Object.freeze({
    '副標題_底色': Object.freeze({ renderer: 'hexRectangle', useLayerBounds: true, slantRatio: 0.5 }),
    '副標題_BG': Object.freeze({ renderer: 'hexRectangle', useLayerBounds: true, slantRatio: 0.5 }),
    // 中標白線是動態排版物件：實際輸出必須與編輯框共用 live layer bounds，
    // 不得回頭使用 PSD 匯出的 geometry.bbox / pathBounds。
    '文案_白色直線': Object.freeze({ renderer: 'rectangle', useLayerBounds: true }),
    '蝦皮直營_白色直線': Object.freeze({ renderer: 'rectangle', useLayerBounds: true }),
    // 中標題_BG 為動態伸縮物件，實際輸出與編輯框共用 live layer bounds。
    '中標題_BG': Object.freeze({ renderer: 'roundedRectangle', useLayerBounds: true }),
    '中標_BG': Object.freeze({ renderer: 'roundedRectangle', useLayerBounds: true }),
  });

  function clean(value) {
    return String(value ?? '')
      .replace(/_x000d_/gi, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  function normalizeIdentity(value) {
    const raw = clean(value).normalize('NFKC').toLowerCase().replace(/\.(?:template\.)?json$/i, '');
    return raw.replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.＿－—–]+/g, '');
  }

  function normalizeAssetAlias(value) {
    return clean(value).normalize('NFKC').toLowerCase().replace(/[\s\u00a0\u3000\t\r\n_\-()（）\[\]【】.]+/g, '');
  }

  function splitSemanticCase(value) {
    const lines = clean(value).split('\n').map((line) => line.trim()).filter(Boolean);
    return {
      主標: lines[0] || '',
      副標: lines[1] || '',
      警語: lines.slice(2).join('\n'),
      __caseLines: lines,
    };
  }

  function findHeader(rows) {
    for (let rowIndex = 0; rowIndex < (rows || []).length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const caseCol = row.findIndex((cell) => normalizeIdentity(cell) === normalizeIdentity('案型'));
      const templateCol = row.findIndex((cell) => normalizeIdentity(cell) === normalizeIdentity('使用公版'));
      if (caseCol >= 0 && templateCol >= 0) return { rowIndex, caseCol, templateCol };
    }
    return null;
  }

  function findTemplateSpanEnd(rows, startRow, templateCol, templateName) {
    const wanted = normalizeIdentity(templateName);
    let rowIndex = startRow + 1;
    while (rowIndex < (rows || []).length && normalizeIdentity(rows[rowIndex]?.[templateCol]) === wanted) rowIndex += 1;
    return rowIndex;
  }

  function normalizeProductAsset(value) {
    const raw = clean(value).replace(/^曝品\s*[:：]?\s*/i, '').trim();
    if (!raw) return '';
    const mapped = PRODUCT_ASSET_ALIASES.get(normalizeAssetAlias(raw));
    if (mapped) return mapped;
    return /\.(?:png|jpe?g|webp|svg)$/i.test(raw) ? raw : `${raw}.png`;
  }

  function normalizeProductAssets(value) {
    const raw = clean(value).replace(/^曝品\s*[:：]?\s*/i, '').trim();
    if (!raw) return [];

    // 完整 alias 優先。像「免運車+免運券」本來就是一張合成素材，不能拆開。
    const mapped = PRODUCT_ASSET_ALIASES.get(normalizeAssetAlias(raw));
    if (mapped) return [mapped];

    // 其餘 A+B / A＋B 代表多張獨立商品素材，依工單順序分別套入商品圖1、商品圖2。
    const parts = raw.split(/[+＋]/).map((part) => clean(part)).filter(Boolean);
    const sources = parts.length > 1 ? parts : [raw];
    return sources.map(normalizeProductAsset).filter(Boolean);
  }

  function extractProductAssetsFromRow(row, caseCol, templateCol) {
    const candidates = (row || []).slice(caseCol + 1, templateCol);
    for (const value of candidates) {
      const raw = clean(value);
      if (!raw || !/^曝品\s*[:：]?/i.test(raw)) continue;
      const withoutLabel = raw.replace(/^曝品\s*[:：]?\s*/i, '').trim();
      const lines = withoutLabel.split('\n').map((line) => line.trim()).filter(Boolean);
      const source = lines.join(' ').trim();
      if (source) return normalizeProductAssets(source);
    }
    return [];
  }

  function looksLikePrice(value) {
    return /[$＄]\s*[\d,.]+|\d[\d,.]*\s*起/.test(clean(value));
  }

  function normalizePrice(value) {
    const raw = clean(value).replace(/^＄/, '$');
    if (!raw) return '';
    if (/^\d[\d,.]*(?:\s*起)?$/.test(raw)) return `$${raw}`;
    return raw;
  }

  function parseFreeShippingTable(rows, startRow, endRow, caseCol, templateCol) {
    const logisticsRow = rows[startRow] || [];
    const dataColumns = [];
    const rowLabel = normalizeIdentity(logisticsRow[caseCol]);
    for (let col = caseCol + 1; col < templateCol; col += 1) {
      const value = clean(logisticsRow[col]);
      if (!value) continue;
      // A9:B9 之類的合併儲存格會被 Core 補值；與案型欄完全相同者不是物流資料欄。
      if (rowLabel && normalizeIdentity(value) === rowLabel) continue;
      dataColumns.push(col);
    }

    const sectionRows = (rows || []).slice(startRow + 1, endRow);
    const priceRow = sectionRows.find((row) => dataColumns.some((col) => looksLikePrice(row?.[col]))) || [];
    const vipRow = sectionRows.find((row) => normalizeIdentity(row?.[caseCol]).includes(normalizeIdentity('蝦皮VIP'))) || [];
    const actionRow = sectionRows.find((row) => normalizeIdentity(row?.[caseCol]).includes(normalizeIdentity('訂閱'))) || [];

    const columns = dataColumns.map((columnIndex) => ({
      columnIndex,
      logistics: clean(logisticsRow[columnIndex]),
      price: normalizePrice(priceRow[columnIndex]),
    }));

    const vipLabel = clean(vipRow[caseCol]);
    const vipCells = vipRow.slice(caseCol + 1, templateCol).map(clean).filter(Boolean);
    const vipOffer = vipCells.find((value) => /[|｜]/.test(value)) || vipCells.find((value) => !looksLikePrice(value)) || '';
    const vipPrice = normalizePrice([...vipCells].reverse().find(looksLikePrice) || '');
    const vipLines = vipOffer.split('\n').map((line) => line.trim()).filter(Boolean);
    const firstOfferLine = vipLines[0] || '';
    const [vipLeft = '', ...vipRightParts] = firstOfferLine.split(/[|｜]/).map((value) => value.trim()).filter(Boolean);

    return {
      columns,
      vip: {
        label: vipLabel,
        left: vipLeft,
        right: vipRightParts.join('｜'),
        bottom: vipLines.slice(1).join('\n'),
        price: vipPrice,
      },
      action: clean(actionRow[caseCol]),
    };
  }

  function parseGuideSheet({ rows }) {
    const header = findHeader(rows);
    if (!header) return null;

    const { rowIndex: headerRow, caseCol, templateCol } = header;
    const blocks = [];
    const warnings = [];
    const skippedRows = [];

    for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const templateName = clean(row[templateCol]);
      if (!templateName) continue;

      const caseText = clean(row[caseCol]);
      const record = {
        ...splitSemanticCase(caseText),
        __sourceRow: rowIndex + 1,
        __sourceTemplateName: templateName,
      };

      const isFreeShippingTable = normalizeIdentity(templateName) === normalizeIdentity('表格_免運');
      if (isFreeShippingTable) {
        // 「使用公版」G9:G12 是合併儲存格，Core 會補成四列相同值。
        // 只讓合併區塊第一列建立一筆 record，其餘列是該表格的內容列，不是四張獨立輸出。
        const previousTemplate = rowIndex > headerRow + 1 ? clean(rows[rowIndex - 1]?.[templateCol]) : '';
        if (normalizeIdentity(previousTemplate) === normalizeIdentity(templateName)) continue;
        const spanEnd = findTemplateSpanEnd(rows, rowIndex, templateCol, templateName);
        record.__freeShippingTable = parseFreeShippingTable(rows, rowIndex, spanEnd, caseCol, templateCol);
      }

      const productAssets = extractProductAssetsFromRow(row, caseCol, templateCol);
      if (productAssets.length) {
        productAssets.slice(0, 2).forEach((asset, index) => { record[`商品圖${index + 1}`] = asset; });
        record.__productAssets = productAssets;
        record.__productAssetSource = '共用素材';
      }

      const hasRecordData = Object.entries(record).some(([key, value]) => !key.startsWith('__') && clean(value));
      if (!hasRecordData && !normalizeIdentity(templateName).includes(normalizeIdentity('下蓋'))) {
        skippedRows.push({ row: rowIndex + 1, name: templateName, reason: '使用公版有值，但案型與可套用資料皆為空白' });
        continue;
      }

      blocks.push({
        name: templateName,
        headerRow,
        startRow: rowIndex,
        quantity: 1,
        records: [record],
        colMap: { 案型: caseCol, 使用公版: templateCol },
        templateType: 'ms_guide_sheet',
      });
    }

    return {
      blocks,
      anchorCount: 1,
      warnings,
      skippedRows,
      parser: 'MS_GUIDE_SHEET',
    };
  }

  function findLayerEntryExact(template, names = [], type = '') {
    const wanted = names.map(normalizeIdentity).filter(Boolean);
    return Object.entries(template?.layers || {}).find(([key, layer]) => {
      if (!layer || (type && layer.type !== type)) return false;
      const identities = [key, layer.psdName, layer.name].map(normalizeIdentity).filter(Boolean);
      return wanted.some((name) => identities.includes(name));
    }) || null;
  }

  function findLayerExact(template, names = [], type = '') {
    return findLayerEntryExact(template, names, type)?.[1] || null;
  }

  function setTextLayer(template, names, value, diagnostics = [], field = '') {
    const layer = findLayerExact(template, names, 'text');
    if (!layer) return false;
    const text = clean(value);
    layer.text = text;
    layer.hidden = !text;
    if (text && field) diagnostics.push({ field, status: 'ok', value: text, target: layer.psdName || names[0] });
    return true;
  }

  function setImageLayer(template, key, { visible, assetFilename, assetProject = '表格_免運' }, diagnostics = []) {
    const layer = template?.layers?.[key];
    if (!layer || layer.type !== 'image') return false;
    layer.hidden = !visible;
    if (visible && assetFilename) {
      layer.assetFilename = assetFilename;
      layer.assetProject = assetProject;
      diagnostics.push({ field: '表格_免運 LOGO', status: 'ok', value: assetFilename, target: key });
    }
    return true;
  }

  function keywordIncluded(value, keyword) {
    return normalizeIdentity(value).includes(normalizeIdentity(keyword));
  }

  function applyFreeShippingTable(template, record, diagnostics = []) {
    const table = record?.__freeShippingTable;
    if (!table) return;

    const slotRules = [
      {
        priceLayer: '價格_蝦皮店到店',
        logos: [{ key: '蝦皮店到店_LOGO', keyword: '蝦皮店到店', file: '蝦皮店到店_LOGO.png' }],
      },
      {
        priceLayer: '價格_隔日到貨',
        logos: [
          { key: '蝦皮店到店_LOGO_2', keyword: '蝦皮店到店', file: '蝦皮店到店_LOGO.png' },
          { key: '隔日到貨_LOGO', keyword: '隔日到貨', file: '隔日到貨_LOGO.png' },
        ],
      },
      {
        priceLayer: '價格_環保無包裝',
        logos: [
          { key: '蝦皮店到店_LOGO_3', keyword: '蝦皮店到店', file: '蝦皮店到店_LOGO.png' },
          { key: '環保無包裝_LOGO', keyword: '環保無包裝', file: '環保無包裝_LOGO.png' },
        ],
      },
      {
        priceLayer: '價格_店到家宅配',
        logos: [{ key: '店到家宅配_LOGO', keyword: '店到家宅配', file: '店到家宅配_LOGO.png' }],
      },
    ];

    slotRules.forEach((slot, index) => {
      const column = table.columns?.[index] || { logistics: '', price: '' };
      slot.logos.forEach((logo) => setImageLayer(template, logo.key, {
        visible: keywordIncluded(column.logistics, logo.keyword),
        assetFilename: logo.file,
      }, diagnostics));
      setTextLayer(template, [slot.priceLayer], column.price, diagnostics, slot.priceLayer);
    });

    const fourthLogisticsLines = clean(table.columns?.[3]?.logistics).split('\n').map((line) => line.trim()).filter(Boolean);
    const fourthExtra = fourthLogisticsLines.filter((line) => !keywordIncluded(line, '店到家宅配')).join('\n');
    setTextLayer(template, ['含新竹物流_海外宅配', '含新竹物流, 海外宅配'], fourthExtra, diagnostics, '物流補充文字');

    const vipVisible = keywordIncluded(table.vip?.label, '蝦皮VIP');
    setImageLayer(template, '蝦皮VIP直式LOGO', {
      visible: vipVisible,
      assetFilename: '蝦皮VIP直式LOGO.png',
    }, diagnostics);
    setTextLayer(template, ['表格案型_左'], table.vip?.left, diagnostics, '表格案型_左');
    setTextLayer(template, ['表格案型_右'], table.vip?.right, diagnostics, '表格案型_右');
    setTextLayer(template, ['表格案型_下'], table.vip?.bottom, diagnostics, '表格案型_下');
    setTextLayer(template, ['價格_蝦皮VIP'], table.vip?.price, diagnostics, '價格_蝦皮VIP');

    const gridLine = findLayerExact(template, ['表格案型_格線'], 'shape');
    if (gridLine) gridLine.hidden = !(clean(table.vip?.left) && clean(table.vip?.right));
  }

  function applyVipSplitTitle(template, record, diagnostics = []) {
    const raw = clean(record?.__semanticMainTitle || record?.['主標']);
    if (!raw) return;
    const match = raw.match(/^(.*?)VIP(.*)$/i);
    const left = clean(match ? match[1] : raw);
    const right = clean(match ? match[2] : '');
    setTextLayer(template, ['蝦皮VIP_主標題_左'], left, diagnostics, '主標題_左');
    setTextLayer(template, ['蝦皮VIP_主標題_右'], right, diagnostics, '主標題_右');
  }

  function applyShopeeDirectTitle(template, record, diagnostics = []) {
    const raw = clean(record?.__semanticMainTitle || record?.['主標']);
    if (!raw) return;
    const text = raw.replace(/^蝦皮直營\s*[｜|]?\s*/i, '').trim();
    setTextLayer(template, ['蝦皮直營_主標題_右'], text || raw, diagnostics, '主標題');
  }

  function setLayerVisible(template, names, visible) {
    const wanted = names.map(normalizeIdentity).filter(Boolean);
    Object.entries(template?.layers || {}).forEach(([key, layer]) => {
      const identities = [key, layer?.psdName, layer?.name].map(normalizeIdentity).filter(Boolean);
      if (wanted.some((name) => identities.includes(name))) layer.hidden = !visible;
    });
  }

  function applyMiddleBackgroundCorners(template, diagnostics = []) {
    const background = findLayerExact(template, ['中標題_BG', '中標_BG'], 'shape');
    if (!background) return;

    const shape = background.shape ||= {};
    const sourceRadii = shape.cornerRadii || background.cornerRadii || {};
    const fallbackRadius = Math.max(0, Number(shape.cornerRadius || 0));
    const topRight = Math.max(0, Number(sourceRadii.topRight ?? sourceRadii.tr ?? fallbackRadius));
    const bottomRight = Math.max(0, Number(sourceRadii.bottomRight ?? sourceRadii.br ?? fallbackRadius));
    const cornerRadii = {
      topLeft: 0,
      topRight,
      bottomRight,
      bottomLeft: 0,
    };

    background.cornerRadii = { ...cornerRadii };
    shape.cornerRadii = { ...cornerRadii };
    diagnostics.push({
      field: '中標題_BG',
      status: 'ok',
      value: `左上 0px / 左下 0px / 右上 ${topRight}px / 右下 ${bottomRight}px`,
      target: background.psdName || '中標題_BG',
    });
  }

  function isAsciiNumericOrEnglish(value) {
    const text = clean(value).replace(/\n+/g, ' ').trim();
    if (!text) return false;
    if (/[\u3400-\u9fff\uf900-\ufaff]/.test(text)) return false;
    return /[A-Za-z0-9]/.test(text) && /^[A-Za-z0-9\s.,%$＄+:/&\-]+$/.test(text);
  }

  function setLayerVerticalShift(layer, offsetY) {
    if (!layer) return;
    if (!Number.isFinite(Number(layer.__msBaseY))) {
      layer.__msBaseY = Number(layer.y || 0);
      layer.__msBaseCenterY = Number(layer.centerY ?? (Number(layer.y || 0) + Number(layer.height || 0) / 2));
    }
    const nextY = Number(layer.__msBaseY || 0) + Number(offsetY || 0);
    layer.y = Math.round(nextY * 100) / 100;
    if (Number.isFinite(Number(layer.__msBaseCenterY))) {
      layer.centerY = Math.round((Number(layer.__msBaseCenterY) + Number(offsetY || 0)) * 100) / 100;
    }
  }

  function applyHorizontalGroupSpacing(template, group, diagnostics = [], helpers = {}) {
    const left = findLayerExact(template, [group.left], 'text');
    const divider = findLayerExact(template, [group.divider], 'shape');
    const right = findLayerExact(template, [group.right], 'text');
    if (!left || !divider || !right) return;

    const spacing = Math.max(0, Number(group.spacing ?? 12));
    window.SPTextStandard?.applyNonPriceTextLayer?.(left, group.left);
    window.SPTextStandard?.applyNonPriceTextLayer?.(right, group.right);

    const measureInk = helpers.measureRenderedTextInkBounds
      || ((layer) => window.Renderer?.measureRenderedTextInkBounds?.(layer)
        || { left: Number(layer?.x || 0), right: Number(layer?.x || 0) + Number(layer?.width || 0) });

    const leftInk = measureInk(left) || {};
    const leftVisibleRight = Number.isFinite(Number(leftInk.right))
      ? Number(leftInk.right)
      : Number(left.x || 0) + Number(left.width || 0);
    const dividerWidth = Number(divider.width || 0);

    // 以「實際字形右緣」而不是文字框右緣定位白線。
    divider.x = Math.round((leftVisibleRight + spacing) * 100) / 100;
    divider.centerX = Math.round((divider.x + dividerWidth / 2) * 100) / 100;

    // 右文字保留 JSON 的 width / align，只平移 layer，直到實際字形左緣與白線相距 12px。
    const rightInk = measureInk(right) || {};
    const rightVisibleLeft = Number.isFinite(Number(rightInk.left)) ? Number(rightInk.left) : Number(right.x || 0);
    const desiredRightVisibleLeft = divider.x + dividerWidth + spacing;
    const deltaX = desiredRightVisibleLeft - rightVisibleLeft;
    const previousRightX = Number(right.x || 0);
    const previousRightCenterX = Number(right.centerX ?? (previousRightX + Number(right.width || 0) / 2));
    right.x = Math.round((previousRightX + deltaX) * 100) / 100;
    right.centerX = Math.round((previousRightCenterX + deltaX) * 100) / 100;

    diagnostics.push({
      field: group.diagnosticField || '中標文案間距',
      status: 'ok',
      value: `${spacing}px（實際字形邊界）`,
      target: `${group.left} / ${group.divider} / ${group.right}`,
    });
  }

  function applyMiddleTitle(template, target, record, diagnostics = [], helpers = {}) {
    const raw = clean(record?.__semanticMainTitle || record?.['主標']);
    if (!raw) return;

    if (target === '中標_全綠' || target === '中標_全黃') {
      setTextLayer(template, ['中標題'], raw, diagnostics, '主標題');
      return;
    }

    if (target !== '中標_全藍') return;
    const parts = raw.split(/[|｜]/).map((part) => part.trim()).filter(Boolean);
    const direct = /^蝦皮直營/i.test(raw);
    if (direct) {
      const left = (parts[0] || raw).replace(/^蝦皮直營\s*/i, '').trim();
      const right = parts.slice(1).join('｜');
      setLayerVisible(template, ['蝦皮直營_LOGO', '蝦皮直營_白色直線', '蝦皮直營_文案_左', '蝦皮直營_文案_右'], true);
      setLayerVisible(template, ['文案_左', '文案_白色直線', '文案_右'], false);
      setTextLayer(template, ['蝦皮直營_文案_左'], left, diagnostics, '主標題_左');
      setTextLayer(template, ['蝦皮直營_文案_右'], right, diagnostics, '主標題_右');
      const directDivider = findLayerExact(template, ['蝦皮直營_白色直線'], 'shape');
      if (directDivider) directDivider.hidden = !right;
      const directLeft = findLayerExact(template, ['蝦皮直營_文案_左'], 'text');
      setLayerVerticalShift(directLeft, isAsciiNumericOrEnglish(left) ? -3 : 0);
      applyHorizontalGroupSpacing(template, {
        left: '蝦皮直營_文案_左',
        divider: '蝦皮直營_白色直線',
        right: '蝦皮直營_文案_右',
        spacing: 12,
        diagnosticField: '蝦皮直營中標文案間距',
      }, diagnostics, helpers);
    } else {
      const left = parts[0] || raw;
      const right = parts.slice(1).join('｜');
      setLayerVisible(template, ['蝦皮直營_LOGO', '蝦皮直營_白色直線', '蝦皮直營_文案_左', '蝦皮直營_文案_右'], false);
      setLayerVisible(template, ['文案_左', '文案_白色直線', '文案_右'], true);
      setTextLayer(template, ['文案_左'], left, diagnostics, '主標題_左');
      setTextLayer(template, ['文案_右'], right, diagnostics, '主標題_右');
      const divider = findLayerExact(template, ['文案_白色直線'], 'shape');
      if (divider) divider.hidden = !right;
      applyHorizontalGroupSpacing(template, {
        left: '文案_左',
        divider: '文案_白色直線',
        right: '文案_右',
        spacing: 12,
        diagnosticField: '中標文案間距',
      }, diagnostics, helpers);
    }
  }

  function applyMiddleBackgroundWidth(template, diagnostics = [], helpers = {}) {
    const background = findLayerExact(template, ['中標題_BG', '中標_BG'], 'shape');
    if (!background) return;

    const measureInk = helpers.measureRenderedTextInkBounds
      || ((layer) => window.Renderer?.measureRenderedTextInkBounds?.(layer)
        || { left: Number(layer?.x || 0), right: Number(layer?.x || 0) + Number(layer?.width || 0) });

    const textCandidates = Object.entries(template?.layers || {})
      .filter(([, layer]) => layer?.type === 'text' && layer.hidden !== true && clean(layer.text))
      .filter(([key, layer]) => {
        const ids = [key, layer?.psdName, layer?.name].map(normalizeIdentity).filter(Boolean);
        const wanted = ['中標題', '文案_右', '蝦皮直營_文案_右'].map(normalizeIdentity);
        return ids.some((id) => wanted.includes(id));
      })
      .map(([, layer]) => layer);

    if (!textCandidates.length) return;
    textCandidates.forEach((layer) => window.SPTextStandard?.applyNonPriceTextLayer?.(layer, layer.psdName || '中標題'));
    const rightEdge = Math.max(...textCandidates.map((layer) => {
      const bounds = measureInk(layer) || {};
      return Number.isFinite(Number(bounds.right))
        ? Number(bounds.right)
        : Number(layer.x || 0) + Number(layer.width || 0);
    }));
    if (!Number.isFinite(rightEdge)) return;

    // 全部中標題_BG 都從畫布 X=0 置左，只向右伸縮；右側固定比實際文字右緣多 20px。
    background.x = 0;
    background.width = Math.max(1, Math.round((rightEdge + 20) * 100) / 100);
    background.centerX = Math.round((background.width / 2) * 100) / 100;
    background.useDynamicBounds = true;
    diagnostics.push({
      field: '中標題_BG寬度',
      status: 'ok',
      value: `${background.width}px`,
      target: `實際文字右緣 ${Math.round(rightEdge * 100) / 100}px + 20px`,
    });
  }

  function applySubtitleHexBackground(template, diagnostics = [], helpers = {}) {
    const subtitle = findLayerExact(template, ['副標題', 'subtitle'], 'text');
    const background = findLayerExact(template, ['副標題_底色', '副標題_BG'], 'shape');
    if (!subtitle || !background) return;

    window.SPTextStandard?.applyNonPriceTextLayer?.(subtitle, '副標題');
    const measure = helpers.measureRenderedTextWidth
      || ((layer) => window.Renderer?.measureRenderedTextWidth?.(layer) || Number(layer?.width || 0));
    const measuredWidth = Math.max(0, Number(measure(subtitle) || 0));

    if (!Number.isFinite(Number(background.__msSubtitleBaseWidth))) {
      background.__msSubtitleBaseWidth = Number(background.width || 0);
      background.__msSubtitleBaseCenterX = Number(background.centerX ?? (Number(background.x || 0) + Number(background.width || 0) / 2));
    }

    const baseWidth = Math.max(1, Number(background.__msSubtitleBaseWidth || background.width || 1));
    const centerX = Number(background.__msSubtitleBaseCenterX ?? background.centerX ?? 0);
    const nextWidth = measuredWidth > baseWidth ? measuredWidth + 40 : baseWidth;
    background.width = Math.round(nextWidth * 100) / 100;
    background.x = Math.round((centerX - background.width / 2) * 100) / 100;
    background.centerX = Math.round(centerX * 100) / 100;
    background.useDynamicBounds = true;
    background.__msHexRectangle = true;
    diagnostics.push({
      field: '副標題_底色',
      status: 'ok',
      value: `${Math.round(measuredWidth * 100) / 100}px`,
      target: `${background.width}px`,
    });
  }

  function createTemplateRules(definition) {
    const { family, target } = definition;
    return {
      shapeLayers: SHAPE_RULES,

      resolveRecordTemplateRoute({ block }) {
        if (normalizeIdentity(block?.name) !== normalizeIdentity(target)) return null;
        return {
          key: family,
          family,
          label: target,
          templateId: target,
          templateFile: `${target}.json`,
          outputPrefix: target,
        };
      },

      beforeApplyRecordToTemplate({ record }) {
        const mainTitle = clean(record?.['主標']);
        if (!mainTitle) return;
        record.__semanticMainTitle = mainTitle;

        // 這兩種主標是「固定 LOGO + 文字」語意，不可讓 Core 把整句塞進第一個命中的文字圖層。
        if (target === '上蓋_VIP') record['主標'] = '';
        if (target === '上蓋_蝦皮直營') record['主標'] = mainTitle.replace(/^蝦皮直營\s*[｜|]?\s*/i, '').trim();
      },

      afterApplyRecordToTemplate({ template, record, diagnostics, helpers }) {
        if (target === '上蓋_VIP') applyVipSplitTitle(template, record, diagnostics);
        if (target === '上蓋_蝦皮直營') applyShopeeDirectTitle(template, record, diagnostics);
        if (target.startsWith('中標_')) {
          applyMiddleTitle(template, target, record, diagnostics, helpers);
          applyMiddleBackgroundCorners(template, diagnostics);
          applyMiddleBackgroundWidth(template, diagnostics, helpers);
        }
        if (target === '表格_免運') applyFreeShippingTable(template, record, diagnostics);
        applySubtitleHexBackground(template, diagnostics, helpers);
      },

      onTextChanged({ template, key, layer }) {
        const identity = normalizeIdentity(`${key} ${layer?.psdName || ''}`);
        if (identity.includes(normalizeIdentity('副標題'))) {
          applySubtitleHexBackground(template, [], {
            measureRenderedTextWidth: (textLayer) => window.Renderer?.measureRenderedTextWidth?.(textLayer) || Number(textLayer?.width || 0),
          });
        }

        if (!target.startsWith('中標_')) return;
        const layerIdentities = [key, layer?.psdName, layer?.name].map(normalizeIdentity).filter(Boolean);
        if (target === '中標_全藍') {
          const directIds = ['蝦皮直營_文案_左', '蝦皮直營_文案_右'].map(normalizeIdentity);
          const genericIds = ['文案_左', '文案_右'].map(normalizeIdentity);
          if (layerIdentities.some((item) => directIds.includes(item))) {
            const directLeft = findLayerExact(template, ['蝦皮直營_文案_左'], 'text');
            setLayerVerticalShift(directLeft, isAsciiNumericOrEnglish(directLeft?.text) ? -3 : 0);
            applyHorizontalGroupSpacing(template, {
              left: '蝦皮直營_文案_左', divider: '蝦皮直營_白色直線', right: '蝦皮直營_文案_右', spacing: 12,
            });
          } else if (layerIdentities.some((item) => genericIds.includes(item))) {
            applyHorizontalGroupSpacing(template, {
              left: '文案_左', divider: '文案_白色直線', right: '文案_右', spacing: 12,
            });
          }
        }
        applyMiddleBackgroundWidth(template, [], {
          measureRenderedTextInkBounds: (textLayer) => window.Renderer?.measureRenderedTextInkBounds?.(textLayer)
            || { left: Number(textLayer?.x || 0), right: Number(textLayer?.x || 0) + Number(textLayer?.width || 0) },
        });
      },
    };
  }

  TEMPLATE_DEFINITIONS.forEach((definition) => {
    const { family, target } = definition;
    manager.register(family, {
      family,
      label: target,
      tokens: [target],
      targets: [target],
      priority: 100,
      rules: createTemplateRules(definition),
    });
  });

  // 工單 parser 與 Template Family 分離：它不參與公版名稱比對，只負責把「案型 / 使用公版」整理成標準 record。
  manager.register('ms_攻略頁工單', {
    family: 'ms_攻略頁工單',
    label: '攻略頁_GD做圖列表',
    tokens: [],
    targets: [],
    priority: 1000,
    rules: { parseSheetBlocks: parseGuideSheet },
  });

  window.MSTemplateRules = Object.freeze({
    templates: TEMPLATE_DEFINITIONS,
    parseGuideSheet,
    normalizeIdentity,
  });
})();
