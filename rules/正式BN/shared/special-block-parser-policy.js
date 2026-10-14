/* Special Block Parser Policy – placements whose work-order structure must never fall back to the generic row parser. */
(function initSpecialBlockParserPolicy() {
  'use strict';

  function normalize(value) {
    if (window.RuntimePolicy && typeof window.RuntimePolicy.normalizeRuleLabel === 'function') {
      return window.RuntimePolicy.normalizeRuleLabel(value);
    }
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.＿－—–]+/g, '');
  }

  var SPECIAL_ONLY = Object.freeze({
    ar: true,
    sellerbn: true,
    mepage: true,
    mepagecircle: true,
    // 2026-08-13 SKBN 版位：三列一組特規 Parser；
    // 工單「切圖名稱／SKBN_*_切圖_左中右」列的製作內容欄有值，會被逐列誤認成新區塊起點，
    // 一律鎖定為特規專用，禁止回退通用列解析（SKBN parser 對重複觸發回傳 null → 乾淨略過）。
    skbnapp: true,
    skbnpc: true,
    skbnapp切圖左: true,
    skbnapp切圖中: true,
    skbnapp切圖右: true,
    skbnpc切圖左: true,
    skbnpc切圖中: true,
    skbnpc切圖右: true,
    切圖名稱: true,
  });

  function isSpecialOnlyPlacement(value) {
    return SPECIAL_ONLY[normalize(value)] === true;
  }

  function hasUsableRecordData(placementName, record) {
    var placement = normalize(placementName);
    var row = record && typeof record === 'object' ? record : {};

    if (placement === 'mepage' || placement === 'mepagecircle') {
      return trim(row['Mepage案型']) !== '';
    }

    return false;
  }

  function isSpecialHeaderRow(headerRow) {
    var row = Array.isArray(headerRow) ? headerRow : [];
    return row.some(function (cell) {
      var value = normalizeHeader(cell);
      return value.indexOf('mepage案型') === 0;
    });
  }

  function normalizeHeader(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.]+/g, '');
  }

  function findColumn(headerRow, matcher) {
    var row = Array.isArray(headerRow) ? headerRow : [];
    for (var column = 0; column < row.length; column += 1) {
      if (matcher(normalizeHeader(row[column]), row[column], column)) return column;
    }
    return -1;
  }

  function readCell(row, column) {
    return column >= 0 && Array.isArray(row) && row[column] != null ? row[column] : '';
  }

  function trim(value) {
    return String(value == null ? '' : value).replace(/_x000d_/gi, '\n').trim();
  }

  function isWarmupOrFormalExposure(value) {
    var text = trim(value);
    return text.indexOf('暖身') >= 0 || text.indexOf('正式') >= 0;
  }

  function createNoteAllocator(records) {
    var used = new Set();
    (records || []).forEach(function (record) {
      var note = trim(record && record.__備註No);
      if (note) used.add(note);
    });
    var sequence = 1;
    return function allocate(explicitValue) {
      var explicit = trim(explicitValue);
      if (explicit && !used.has(explicit)) {
        used.add(explicit);
        return explicit;
      }
      while (used.has(String(sequence)) || used.has(String(sequence).padStart(2, '0'))) sequence += 1;
      var generated = String(sequence).padStart(2, '0');
      used.add(generated);
      sequence += 1;
      return generated;
    };
  }

  window.SpecialBlockParserPolicy = Object.freeze({
    VERSION: '1.1.0',
    isSpecialOnlyPlacement: isSpecialOnlyPlacement,
    hasUsableRecordData: hasUsableRecordData,
    isSpecialHeaderRow: isSpecialHeaderRow,
    normalizeHeader: normalizeHeader,
    findColumn: findColumn,
    readCell: readCell,
    trim: trim,
    isWarmupOrFormalExposure: isWarmupOrFormalExposure,
    createNoteAllocator: createNoteAllocator,
  });
})();
