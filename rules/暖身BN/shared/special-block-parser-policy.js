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
    sellerbanner: true,
    mepage: true,
    mepagecircle: true,
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
    if (placement === 'sellerbn' || placement === 'sellerbanner') {
      return trim(row.__sellerVariant || row['版型']) !== '';
    }

    return false;
  }

  function isSpecialHeaderRow(headerRow) {
    var row = Array.isArray(headerRow) ? headerRow : [];
    var normalized = row.map(normalizeHeader);
    if (normalized.some(function (value) { return value.indexOf('mepage案型') === 0; })) return true;
    var sellerRequired = ['版型', '宣傳案型', '左', '中', '右'];
    return sellerRequired.every(function (value) { return normalized.indexOf(value) >= 0; });
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
    VERSION: '1.2.0',
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
