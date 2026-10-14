/* LINE購物OAPush(分眾)_1040x1040 專屬規則
 *
 * 這是唯一一個「一個版位名稱底下有六列資料」的版位：工單第一列寫版位/檔名，
 * 接著六列各自在「商品資訊提供」欄標示槽位（左上1 / 中上2 / …），
 * 「短文案+回饋%」欄放三行（品名兩行 + Line Point X%），「GD摳圖LINK」欄放該槽的商品圖。
 *
 * 25節公版與 18節的差異：
 *   - 槽位圖層前綴不帶數字：左上_ / 中上_ / 右上_ / 左下_ / 中下_ / 右下_
 *   - 短文案只有一層（18節分成 _短文案_上 / _短文案_下），塞前兩行含換行
 *   - 每槽多一層「{槽}_LINE POINTS %」；六組無前綴的 LINE POINTS / LINE POINTS_Bar
 *     是公版固定內容，規則檔不碰
 *   - 多一層「指定廠商LOGO_壓條」，固定用公版素材
 */
(function () {
  'use strict';

  const AMS = window.LineShoppingAMS;
  const FAMILY = 'line_shopping_oa_push_segmented_1040x1040';
  const TEMPLATE_ID = 'LINE購物OAPush(分眾)_1040x1040';
  const PLACEMENT = 'LINE購物OAPush (分眾)';

  const getCell = (row, columnIndex) =>
    (columnIndex === undefined || columnIndex < 0 ? '' : AMS.toText(row?.[columnIndex]));

  function findColumn(headerRow, aliases) {
    const wanted = aliases.map(AMS.normalizeKey);
    return (headerRow || []).findIndex((cell) => {
      const key = AMS.normalizeKey(cell);
      return !!key && wanted.some((alias) => key === alias || key.includes(alias));
    });
  }

  // 「商品資訊提供」欄的第一行是槽位標記。工單仍寫「左上1」，公版圖層是「左上」。
  function detectSlot(cellValue) {
    const key = AMS.normalizeKey(String(AMS.toText(cellValue).split('\n')[0] || ''));
    if (!key) return '';
    return AMS.SLOT_NAMES.find((slot) =>
      (AMS.SLOT_ALIASES[slot] || [slot]).some((alias) => key.startsWith(AMS.normalizeKey(alias)))
    ) || '';
  }

  // 「短文案+回饋%」欄：前兩行是品名，最後一行是 Line Point X%。
  function parseProductCopy(rawCopy, rawPercent) {
    const lines = AMS.toText(rawCopy).split('\n').map((line) => line.trim()).filter(Boolean);
    const percentLine = lines.find((line) => /line\s*point/i.test(line)) || '';
    const nameLines = lines.filter((line) => line !== percentLine);

    const percentFromCopy = (percentLine.match(/([\d.]+\s*%)/) || [])[1] || '';
    return {
      name: nameLines.slice(0, 2).join('\n'),
      percent: AMS.normalizePercent(percentFromCopy || rawPercent),
    };
  }

  window.TemplateRuleRegistry.register(FAMILY, {
    label: TEMPLATE_ID,
    priority: 180,
    targets: [TEMPLATE_ID, PLACEMENT],
    tokens: [PLACEMENT],

    rules: {
      resolveRecordTemplateRoute: AMS.makeRoute({ family: FAMILY, templateId: TEMPLATE_ID, placement: PLACEMENT }),

      // 主列 + 六列延伸資料要合併成「一筆製作物」，所以走自訂 blockParser，
      // 並回報 consumedUntilRow，避免那六列又被逐列模式各自解析成獨立預覽。
      blockParser({ rows, header, rowIndex, nextHeaderRow, productName }) {
        if (AMS.normalizeKey(productName) !== AMS.normalizeKey(PLACEMENT)) return null;

        const headerRow = rows?.[header?.headerRow] || [];
        const infoCol = findColumn(headerRow, ['商品資訊提供']);
        const copyCol = findColumn(headerRow, ['短文案+回饋%']);
        const imageCol = findColumn(headerRow, ['GD摳圖LINK', 'GD摳圖連結']);
        const percentCol = findColumn(headerRow, ['LINE POINTS %', 'LINE POINTS%']);
        if ([infoCol, copyCol, imageCol].some((index) => index < 0)) return null;

        const baseRow = rows?.[rowIndex] || [];
        const record = {
          '版位': productName,
          '檔名': getCell(baseRow, header?.colMap?.['檔名']),
          '文案': getCell(baseRow, header?.colMap?.['文案']),
          '店名': getCell(baseRow, header?.colMap?.['店名']),
          '商品圖1': '',
          '商品圖2': '',
          __sourceRow: rowIndex + 1,
        };

        const foundSlots = new Set();
        let consumedUntilRow = rowIndex;
        for (let row = rowIndex; row < Math.min(nextHeaderRow, rowIndex + 12); row += 1) {
          const source = rows?.[row] || [];
          const slot = detectSlot(source[infoCol]);
          if (!slot || foundSlots.has(slot)) continue;

          const parsed = parseProductCopy(source[copyCol], getCell(source, percentCol));
          record[`${slot}_短文案`] = parsed.name;
          record[`${slot}_LINE_POINTS_PERCENT`] = parsed.percent;
          record[`${slot}_商品圖`] = getCell(source, imageCol);
          foundSlots.add(slot);
          consumedUntilRow = row;
        }

        if (foundSlots.size !== AMS.SLOT_NAMES.length) return null;
        return { records: [record], quantity: 1, templateType: 'oa-push-grid', consumedUntilRow };
      },

      beforeApplyRecordToTemplate({ template, record }) {
        AMS.applyOutputName(record);
        // 素材查找的「專案」＝本版位的素材子資料夾（assets/<公版名稱>/）。
        // KV_BG 屬於背景類、不允許跨專案 fallback，沒有這一行就只會搜尋
        // 共用素材與 assets 根目錄，找不到公版子資料夾裡的 KV_BG。
        record.__project = TEMPLATE_ID;
        // 工單「文案」欄先收起來，避免引擎的通用文案映射誤塞到 CTA_文案 / 短文案。
        AMS.stashRawCopy(record);
        record.__outputFormat = 'jpg';

        // 六槽的商品圖由本規則檔自己套素材，不走引擎的通用商品圖1/2流程。
        record['商品圖1'] = '';
        record['商品圖2'] = '';

        AMS.SLOT_NAMES.forEach((slot) => {
          AMS.createProductLayer(template, {
            layerName: `${slot}_商品圖`,
            guideName: `${slot}_P_範圍`,
            maskName: `${slot}_上方Bar`,
          });
        });
      },

      afterApplyRecordToTemplate({ template, record, diagnostics, helpers }) {
        const copy = AMS.parseCopy(AMS.rawCopy(record));
        AMS.setText(template, '回饋文案', copy.reward);
        AMS.setText(template, '回饋警語', copy.legal);

        AMS.SLOT_NAMES.forEach((slot) => {
          // 短文案兩行：行高＝字級＋8px，讓兩行之間的視覺空隙固定約 8px。
          const copyLayer = AMS.setText(template, `${slot}_短文案`, record[`${slot}_短文案`]);
          AMS.applyLineGap(copyLayer);

          AMS.setText(template, `${slot}_LINE POINTS %`, record[`${slot}_LINE_POINTS_PERCENT`]);

          const productLayer = AMS.findLayer(template, `${slot}_商品圖`);
          if (!productLayer) return;

          const rawAsset = String(record[`${slot}_商品圖`] || '').trim();
          const match = helpers.findAssetFilename(rawAsset, {
            template,
            layer: productLayer,
            layerKey: `${slot}_商品圖`,
          });
          productLayer.assetFilename = match.found ? match.filename : '';
          diagnostics.push({
            field: `${slot}_商品圖`,
            status: match.found ? 'ok' : 'missing',
            value: rawAsset,
            filename: match.filename || '',
            attempts: match.attempts || [],
          });
        });

        AMS.applySharedDecoAssets(template, helpers);
        AMS.clipGreenBlockIfNeeded(template);
        AMS.clearShadows(template);
      },
    },
  });
})();
