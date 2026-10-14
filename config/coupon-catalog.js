/* 整合版 5.4 – 票券型錄（window.CouponCatalog）
 *
 * 一份「票券長什麼樣」的資料表，機械式整理自現有四處票券規則（每筆都標 source）：
 *   1. core PriceColorResolver（A／B 相同）：VIP→#FF770F、SCS／商城券→#D0011B、全站券／全站→#EE4D2D
 *   2. rules/<分類>/shared/warmup-price-style-resolver.js：DEFAULT_COLOR_RULES（蝦皮直營／商城／全站）＋ slotColorRules（三種雙券配色）
 *   3. rules/暖身BN/01_頭巾_rules.js colorRules：^VIP[_ ] → #FF770F（只有頭巾家族）
 *   4. rules/MS/ms-template-rules.js PRODUCT_ASSET_ALIASES：免運車＋免運券 → 免運車加免運券.png（靜態券面，不產價格層）
 *   雙券判斷沿用 core PriceRuleEngine：名稱含「雙券」或命中 slotColorRules 才是雙價格（上／下兩槽）。
 *
 * 定位：疊在現有判斷之上、不取代。工單自動流程照原本 PriceColorResolver／productLayouts 走（零差異）。
 * 型錄只用在兩個新入口：(a) 使用者手動換素材後重新分類、重上價格顏色；(b) Inspector 顯示／手動指定票券類型。
 * 顏色一律優先問目前分類的 PriceColorResolver（規則檔的家族配色會贏），型錄的 colors 只是「找不到規則時」的預設值。
 */
(function initCouponCatalog() {
  'use strict';

  const COLORS = Object.freeze({ ALL_SITE: '#EE4D2D', MALL: '#D0011B', VIP: '#FF770F' });

  /** 名稱正規化：與 core PriceRuleEngine.norm（normStr）一致 — 小寫、去空白與 _-()（）[]【】。 */
  const norm = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[\s 　\t\r\n]+/g, '')
    .replace(/[\-_()（）\[\]【】.]/g, '');

  // 依「先精準、再關鍵字」的順序比對。aliases 為完整名稱（比對前正規化）；keywords 為包含即命中。
  const ENTRIES = Object.freeze([
    // ── 雙券（兩個價格槽，上 top／下 bottom）──
    { id: '商城券加全站券', label: '商城券＋全站券（上全站、下商城）', slots: 2, aliases: ['商城券加全站券'], colors: { bottom: COLORS.MALL, top: COLORS.ALL_SITE }, source: 'warmup-price-style-resolver slotColorRules' },
    { id: '全站券加商城券', label: '全站券＋商城券（上商城、下全站）', slots: 2, aliases: ['全站券加商城券'], colors: { bottom: COLORS.ALL_SITE, top: COLORS.MALL }, source: 'warmup-price-style-resolver slotColorRules' },
    { id: 'VIP加商城券', label: 'VIP＋商城券（上商城、下 VIP）', slots: 2, aliases: ['VIP加商城券'], regex: 'VIP.*商城', colors: { bottom: COLORS.VIP, top: COLORS.MALL }, source: 'warmup-price-style-resolver slotColorRules' },
    { id: '商城券_雙券', label: '商城券雙券', slots: 2, aliases: ['商城券_雙券', '商城券_雙券_長券', 'SCS_雙券'], keywordsAll: ['雙券', '商城'], colors: { top: COLORS.MALL, bottom: COLORS.MALL }, source: 'PriceColorResolver 商城券／SCS ＋ PriceRuleEngine 雙券' },
    { id: '全站券_雙券', label: '全站券雙券', slots: 2, aliases: ['全站券_雙券', '全站券_雙券_長券', '全站券加短影音_雙券'], keywordsAll: ['雙券', '全站'], colors: { top: COLORS.ALL_SITE, bottom: COLORS.ALL_SITE }, source: 'PriceColorResolver 全站券 ＋ PriceRuleEngine 雙券' },
    { id: 'VIP_雙券', label: 'VIP 雙券', slots: 2, aliases: ['VIP_雙券'], keywordsAll: ['雙券', 'vip'], colors: { top: COLORS.VIP, bottom: COLORS.VIP }, source: 'PriceColorResolver VIP ＋ PriceRuleEngine 雙券' },
    // ── 單券（一個價格槽）──
    { id: 'VIP_單券', label: 'VIP 單券', slots: 1, aliases: ['VIP_單券_折扣', 'VIP_單券_蝦幣', 'VIP_單券_蝦幣_有皇冠', 'VIP加蝦幣'], keywords: ['vip'], colors: { single: COLORS.VIP }, source: 'PriceColorResolver VIP；暖身系家族無 VIP 規則時由該家族預設色決定', familyNote: '暖身BN 非頭巾家族的 VIP 單券實際為預設色 #EE4D2D（家族規則沒有 VIP）' },
    { id: '商城券_單券', label: '商城券單券', slots: 1, aliases: ['商城券_單券', '免運車加商城券_長券', '商城券加蝦幣', '除濕機加商城券', '購物車加蝦皮直營券', '黃色購物車加蝦皮直營券'], keywords: ['scs', '商城', '蝦皮直營'], colors: { single: COLORS.MALL }, source: 'PriceColorResolver SCS／商城券；warmup DEFAULT_COLOR_RULES 蝦皮直營／商城' },
    { id: '全站券_單券', label: '全站券單券', slots: 1, aliases: ['全站券_單券', '免運車加全站券', '全站券加禮物', '全站券加蝦幣', '鬧鐘加全站券'], keywords: ['全站'], colors: { single: COLORS.ALL_SITE }, source: 'PriceColorResolver 全站券／全站；warmup DEFAULT_COLOR_RULES 全站' },
    // ── 靜態券面（不產價格層）──
    { id: '免運車加免運券', label: '免運車＋免運券（靜態券面）', slots: 0, aliases: ['免運車加免運券', '免運車+免運券', '免運車＋免運券', '免運車和免運券'], colors: {}, source: 'MS PRODUCT_ASSET_ALIASES' },
  ]);

  const isDoubleName = (normalized) => normalized.includes(norm('雙券'));

  /** 依名稱（工單商品名或素材檔名）找型錄項目。回傳 { entry, matchedBy } 或 null。 */
  function match(name) {
    const raw = String(name || '');
    const normalized = norm(raw);
    if (!normalized) return null;
    const exact = ENTRIES.find((entry) => (entry.aliases || []).some((alias) => norm(alias) === normalized));
    if (exact) return { entry: exact, matchedBy: 'alias' };
    const byRegex = ENTRIES.find((entry) => entry.regex && new RegExp(entry.regex, 'i').test(raw));
    if (byRegex) return { entry: byRegex, matchedBy: 'regex' };
    const doubled = isDoubleName(normalized);
    const byKeyword = ENTRIES.find((entry) => {
      if (entry.slots === 0) return false;
      if ((entry.slots === 2) !== doubled) return false;
      if (entry.keywordsAll) return entry.keywordsAll.every((word) => normalized.includes(norm(word)));
      return (entry.keywords || []).some((word) => normalized.includes(norm(word)));
    });
    return byKeyword ? { entry: byKeyword, matchedBy: 'keyword' } : null;
  }

  /** 某個槽（single／top／bottom）該用的顏色：先問目前分類的 PriceColorResolver（家族規則會贏），再退回型錄預設。 */
  function colorForSlot(entry, name, slot, template) {
    const fallback = entry?.colors?.[slot] || '';
    const resolver = window.PriceColorResolver;
    if (resolver?.resolve) {
      try { return resolver.resolve(name, template, fallback, slot) || fallback; }
      catch (_) { return fallback; }
    }
    return fallback;
  }

  /** 完整分類結果：{ id, label, slots, layoutKey, colors:{slot:color}, matchedBy, name }；找不到回 null。 */
  function classify(name, template) {
    const found = match(name);
    if (!found) return null;
    const { entry, matchedBy } = found;
    const slotNames = entry.slots === 2 ? ['top', 'bottom'] : entry.slots === 1 ? ['single'] : [];
    const colors = {};
    slotNames.forEach((slot) => { colors[slot] = colorForSlot(entry, name, slot, template); });
    return { id: entry.id, label: entry.label, slots: entry.slots, layoutKey: entry.slots === 2 ? 'doubleCoupon' : 'singleCoupon', colors, matchedBy, name: String(name || '') };
  }

  /** 從一張圖現有的價格層讀出「目前的票券判斷」（工單自動流程產出的結果）。
   *  一張圖可能有多個商品（例：Mall Skinny BN 左／中／右），所以回傳每個商品名一組：
   *  [{ name, slots, colors:{slot:color}, layoutKey, priceLayerKeys, catalog }]；沒有價格層回空陣列。 */
  function describeTemplate(template) {
    const groups = new Map();
    Object.entries(template?.layers || {}).forEach(([key, layer]) => {
      if (layer?.source !== 'auto_price_v2') return;
      const name = String(layer.priceProductName || '');
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push([key, layer]);
    });
    return [...groups.entries()].map(([name, priceLayers]) => {
      const colors = {};
      priceLayers.forEach(([, layer]) => { colors[layer.priceSlot || 'single'] = layer.color; });
      return {
        name,
        slots: priceLayers.some(([, layer]) => layer.priceSlot === 'top' || layer.priceSlot === 'bottom') ? 2 : 1,
        colors,
        layoutKey: priceLayers[0][1].priceLayoutKey || '',
        priceLayerKeys: priceLayers.map(([key]) => key),
        catalog: match(name)?.entry || null,
      };
    });
  }

  window.CouponCatalog = Object.freeze({
    VERSION: '1.0.0',
    COLORS,
    entries: ENTRIES,
    norm,
    match,
    classify,
    describeTemplate,
  });
})();
