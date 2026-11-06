/* 整合版（自 18節 移植）— 診斷資料彙整（四級分類）
 *
 * 2026-10-07 回饋 3／7：把散在各處的診斷（未匹配、素材檢查、解析診斷、略過列…）整理成同一份資料，
 * 依「重要 × 緊急」分四級，給左側診斷面板（diagnostics-panel.js）與下載 zip 的 診斷報告.txt 共用。
 *
 *   critical  重要且緊急（紅）：找不到公版、素材缺少、有價格卻沒顯示 → 不處理就會出錯圖
 *   important 重要不緊急（橘）：文字超出畫布／比框寬 50% 以上、素材比例被拉伸、素材退回預設、版面提醒 → 圖會出但可能不好看
 *   minor     不重要但緊急（黃）：範例列／空白列被略過、輸出名重複、版位沒有對應圖層 → 要知道、但多半是預期中
 *   info      不重要不緊急（灰）：解析統計、匯出備註、刻意略過、超過公版文字框（工單字數建議）
 *
 * 2026-11-05 自 18節 一校一修轉換過來的四項（25節 的 missing-layer 仍維持「版位沒有對應圖層」提醒，不升級）：
 *   1. 工單固定寫法不報：表頭統計列、括號開頭的備註列、「沒有數量也沒有可套用欄位」這類設定列（旗標 diagnostics.mutedWarnings 可再加各分類自己的字串）。
 *   2. 刻意略過（旗標 diagnostics.skipBlocks，前綴比對）：工單有、但這個工具刻意不做的製作物 → 找不到公版／略過的列不報紅，改列資訊層。
 *   3. CTA 誤報：CTA 由規則或公版自己處理（文字層、或公版根本沒有 CTA 層）時，core 仍拿工單 CTA 文字去找圖片而報缺 → 不算缺素材。
 *   4. 價格層（auto_price_v2）由價格引擎自己縮放貼合，框寬不代表實際寬度，不做「文字可能超出框」檢查。
 *
 * 只讀 AppState，不改任何狀態；collect() 同步，collectWithImages() 會多載一次圖片檢查比例。
 */
(function initDiagnosticsReport() {
  'use strict';

  const TIERS = Object.freeze([
    { id: 'critical', label: '重要且緊急', tone: 'red', hint: '不處理就會出錯圖' },
    { id: 'important', label: '重要不緊急', tone: 'orange', hint: '圖會出，但可能不好看' },
    { id: 'minor', label: '不重要但緊急', tone: 'yellow', hint: '多半是預期中的略過' },
    { id: 'info', label: '資訊', tone: 'grey', hint: '統計與備註' },
  ]);
  const TEXT_OVERFLOW_TOLERANCE = 1.15;
  const ASPECT_TOLERANCE = 0.05;
  const PRICE_SOURCE = 'auto_price_v2';

  const core = () => ({ AppState: window.AppState, Renderer: window.Renderer, TemplateLoader: window.TemplateLoader, ProfileLoader: window.ProfileLoader });
  const clean = (value) => String(value ?? '').replace(/_x000d_/gi, '\n').replace(/\r\n?/g, '\n').trim();
  const isMissingStatus = (status) => String(status || '').startsWith('missing');

  function makeCollector() {
    const items = Object.fromEntries(TIERS.map((tier) => [tier.id, []]));
    return {
      items,
      add(tierId, kind, title, detail = '', templateIndex = -1) {
        items[tierId].push({ kind, title: clean(title), detail: clean(detail), templateIndex });
      },
    };
  }

  // ── 工單固定寫法（不進診斷；解析統計仍有數字） ──
  /** 括號開頭的備註列（例「(綁VID)」）、目前沒有公版的「FB post」版位。 */
  const MUTED_UNMATCHED = /^\s*[（(]|FB\s*post/i;
  /** 表頭統計表列、製作內容只填在每組第一列（下方 B 欄空白）、設定列（顏色／背景圖等「沒有數量也沒有可套用欄位」）。 */
  const MUTED_WARNING = /找到「製作內容」，但同列沒有|沒有數量，也沒有可套用欄位|製作內容欄空白/;
  const MUTED_SKIP_REASON = /製作內容欄空白|沒有數量，也沒有主標|勾選欄是 FALSE|範例/;

  const flagList = (name) => {
    const value = core().ProfileLoader?.getFlag?.(name, undefined);
    return Array.isArray(value) ? value.map((item) => clean(item)).filter(Boolean) : [];
  };
  /** 各分類自己的固定寫法（旗標 diagnostics.mutedWarnings，子字串比對），與上面的共用規則一起生效。 */
  const isMutedWarning = (message, extra) => MUTED_WARNING.test(message) || extra.some((pattern) => message.includes(pattern));
  /** 刻意略過的製作物（旗標 diagnostics.skipBlocks，前綴比對）。 */
  const isSkippedBlock = (name, patterns) => patterns.some((pattern) => clean(name).startsWith(pattern));

  function collectUnmatched(collector, AppState) {
    const patterns = flagList('diagnostics.skipBlocks');
    const skipped = [];
    (AppState.unmatchedBatchItems || []).forEach((item) => {
      const reason = clean(item?.reason);
      const name = clean(item?.name);
      if (MUTED_UNMATCHED.test(name)) return;
      if (isSkippedBlock(name, patterns)) { skipped.push(name); return; }
      if (/空白/.test(reason)) collector.add('minor', '欄位空白', item?.name, reason);
      else collector.add('critical', '找不到公版', item?.name, reason);
    });
    if (skipped.length) collector.add('info', '刻意略過', [...new Set(skipped)].join('、'), '這個工具沒有這些公版（或只有圖、沒有案型），依設定不製作');
  }

  /** CTA 由規則自己處理（文字層、或公版的 CTA 圖層自帶素材；或公版根本沒有 CTA 層）時，core 仍會拿工單的 CTA 文字去找圖片而報缺，不是真的缺素材。 */
  function isCtaTextFalseAlarm(entry, template) {
    if (entry.field !== 'CTA' || !isMissingStatus(entry.status)) return false;
    const ctaLayers = Object.entries(template?.layers || {}).filter(([key, layer]) => layer && /cta|按鈕|button|立即領/i.test(`${key} ${layer.psdName || ''}`));
    if (!ctaLayers.length) return true;
    return ctaLayers.some(([, layer]) => layer.hidden !== true && (layer.type === 'text' ? !!clean(layer.text) : !!clean(layer.assetFilename)));
  }

  function collectAssetDiagnostics(collector, entries) {
    entries.forEach(({ item, index }) => {
      const list = Array.isArray(item.data?.batchDiagnostics) ? item.data.batchDiagnostics : [];
      list.forEach((entry) => {
        const detail = `${entry.field || ''}「${entry.value || ''}」${entry.target ? `（${entry.target}）` : ''}`;
        if (isCtaTextFalseAlarm(entry, item.data)) return;
        // 25節：'missing-layer'＝這個版位本來就沒有該圖層（例如 600x400 沒有商品圖槽），是版型差異不是缺素材 → 只列為提醒。
        if (entry.status === 'missing-layer') collector.add('minor', '版位沒有對應圖層', item.name, detail, index);
        else if (isMissingStatus(entry.status)) collector.add('critical', '素材缺少', item.name, detail, index);
        else if (entry.status === 'warning') collector.add('important', entry.kind || '素材退回預設', item.name, detail, index); // 規則檔可自帶 kind（例：AR 的「版面提醒」）
      });
    });
  }

  function collectPriceIssues(collector, entries) {
    entries.forEach(({ item, index }) => {
      const template = item.data || {};
      const layers = Object.values(template.layers || {});
      const priceLayers = layers.filter((layer) => layer?.source === PRICE_SOURCE);
      priceLayers.filter((layer) => !layer.hidden && !clean(layer.text)).forEach(() => collector.add('critical', '價格空白', item.name, '價格圖層沒有文字', index));
      const rawPrice = clean(template.pricePresetMeta?.rawPrice);
      const couponAsset = layers.find((layer) => layer?.type === 'image' && /券/.test(String(layer.assetFilename || '')));
      if (rawPrice && couponAsset && !priceLayers.some((layer) => !layer.hidden)) {
        collector.add('critical', '有價格卻沒顯示', item.name, `工單價格「${rawPrice}」，票券 ${couponAsset.assetFilename}`, index);
      }
    });
  }

  // ── 文字超出框（2026-11-06 封測診斷：使用者決定的分級） ──
  //   重要不緊急（橘）：文字超出畫布，或比公版文字框寬 50% 以上（很可能壓到旁邊的東西）
  //   資訊（灰）     ：只比公版框寬一點（15%～50%）、仍在畫布內 → 多半是工單超過字數建議，附上「工單建議 約14字，實際 18 字」給填寫者看
  //   不報           ：公版範例文字本身就比框寬（PSD 點文字框，框不是限制）
  const TEXT_OVERFLOW_SEVERE = 1.5;
  const SPEC_FIELDS = ['保護文字', '券文案', '主標', '副標', '警語', 'CTA'];
  const specCache = { sheet: null, specs: null };

  /** 工單表頭的字數建議（「保護文字 約14字」「副標 8字內(藍底)」「券文案 10字內」）：掃目前分頁的表頭格，依欄位名取數字。 */
  function workbookCharSpecs(AppState) {
    const sheetName = AppState?.batchDiagnostics?.sheetName || '';
    const sheet = AppState?.excelWorkbook?.Sheets?.[sheetName];
    if (!sheet || !window.XLSX) return {};
    if (specCache.sheet === sheetName && specCache.specs) return specCache.specs;
    const specs = {};
    try {
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      rows.forEach((row) => (row || []).forEach((cell) => {
        const text = clean(cell);
        if (!text || text.length > 24) return;
        const field = SPEC_FIELDS.find((name) => text.startsWith(name));
        if (!field || specs[field]) return;
        const match = /約\s*(\d+)\s*字|(\d+)\s*字內/.exec(text);
        if (match) specs[field] = { limit: Number(match[1] || match[2]), label: text.replace(/\s+/g, ' ') };
      }));
    } catch (_) { /* 讀不到表頭就不附字數建議 */ }
    specCache.sheet = sheetName; specCache.specs = specs;
    return specs;
  }

  const specFieldOf = (key, layer) => SPEC_FIELDS.find((name) => `${key} ${layer?.psdName || ''}`.includes(name)) || '';
  const charCount = (text) => Array.from(clean(text).replace(/\n/g, '')).length;

  /** 公版範例（來源公版）的同一層文字寬度；找不到回 0。 */
  function sampleTextWidth(AppState, Renderer, template, key, probe) {
    const sourceId = window.SnapshotManager?.sourceTemplateId?.(template) || template?.sheetTemplateRoute?.sourceTemplateId || '';
    const source = (AppState?.sourceTemplates || []).find((item) => String(item?.data?.templateId || item?.name || '') === String(sourceId))?.data
      || (AppState?.sourceTemplates || []).find((item) => item?.data?.layers?.[key] && String(item?.data?.templateId || '').startsWith(String(sourceId)))?.data;
    const layer = source?.layers?.[key];
    if (!layer || layer.type !== 'text' || !clean(layer.text)) return 0;
    try { return clean(layer.text).split('\n').reduce((max, line) => Math.max(max, Number(Renderer.measureRenderedTextWidth({ ...layer, text: line }, probe)) || 0), 0); } catch (_) { return 0; }
  }

  function textBounds(layer, widest) {
    const box = Number(layer.width) || 0;
    const x = Number(layer.x) || 0;
    const centerX = Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : x + box / 2;
    if (layer.align === 'left') return { left: x, right: x + widest };
    if (layer.align === 'right') return { left: x + box - widest, right: x + box };
    return { left: centerX - widest / 2, right: centerX + widest / 2 };
  }

  function collectTextOverflow(collector, entries, Renderer, AppState) {
    if (typeof Renderer?.measureRenderedTextWidth !== 'function') return;
    const probe = document.createElement('canvas').getContext('2d');
    const specs = workbookCharSpecs(AppState);
    entries.forEach(({ item, index }) => {
      const template = item.data || {};
      const canvasWidth = Number(template.canvas?.width) || 0;
      Object.entries(template.layers || {}).forEach(([key, layer]) => {
        if (!layer || layer.type !== 'text' || layer.hidden || !(Number(layer.width) > 0) || !clean(layer.text)) return;
        if (layer.source === PRICE_SOURCE) return;
        try {
          const widest = clean(layer.text).split('\n').reduce((max, line) => Math.max(max, Number(Renderer.measureRenderedTextWidth({ ...layer, text: line }, probe)) || 0), 0);
          const box = Number(layer.width);
          if (widest <= box * TEXT_OVERFLOW_TOLERANCE) return;
          const name = layer.psdName || key;
          const bounds = textBounds(layer, widest);
          const outsideCanvas = canvasWidth > 0 && (bounds.left < -1 || bounds.right > canvasWidth + 1);
          const field = specFieldOf(key, layer);
          const spec = field ? specs[field] : null;
          const count = charCount(layer.text);
          const specNote = spec ? `；工單建議 ${spec.label}，實際 ${count} 字` : `；實際 ${count} 字`;
          if (outsideCanvas) { collector.add('important', '文字超出畫布', item.name, `${name}：寬 ${Math.round(widest)}px，畫布 ${canvasWidth}px${specNote}`, index); return; }
          if (widest > box * TEXT_OVERFLOW_SEVERE) { collector.add('important', '文字可能超出框', item.name, `${name}：寬 ${Math.round(widest)}px，框 ${Math.round(box)}px${specNote}`, index); return; }
          // 公版範例本身就比框寬 → 這個框不是限制，不報
          if (sampleTextWidth(AppState, Renderer, template, key, probe) > box * TEXT_OVERFLOW_TOLERANCE) return;
          collector.add('info', '超過公版文字框', item.name, `${name}：寬 ${Math.round(widest)}px，框 ${Math.round(box)}px${specNote}`, index);
        } catch (_) { /* 量測失敗就不報 */ }
      });
    });
  }

  /** 同一個原因的略過列合成一條：「第 18、41、42 列」（超過 8 列只列前 8 列＋共幾列）。 */
  function collectSkippedRows(collector, AppState) {
    const byReason = new Map();
    const patterns = flagList('diagnostics.skipBlocks');
    (AppState.batchDiagnostics?.skippedRows || []).forEach((row) => {
      const reason = clean(row.reason);
      if (MUTED_SKIP_REASON.test(reason)) return;
      if (patterns.some((pattern) => reason.includes(pattern))) return; // 刻意略過的製作物，略過原因裡會帶名稱
      if (!byReason.has(reason)) byReason.set(reason, []);
      byReason.get(reason).push(row.row);
    });
    byReason.forEach((rows, reason) => {
      const shown = rows.slice(0, 8).join('、');
      const title = rows.length > 8 ? `第 ${shown}… 列（共 ${rows.length} 列）` : `第 ${shown} 列`;
      collector.add('minor', '略過的列', title, reason);
    });
  }

  function collectDuplicateNames(collector, entries) {
    const seen = new Map();
    entries.forEach(({ item }) => seen.set(item.name, (seen.get(item.name) || 0) + 1));
    [...seen.entries()].filter(([, count]) => count > 1).forEach(([name, count]) => collector.add('minor', '輸出名重複', name, `${count} 張同名，下載時會互相覆蓋或補 _2`));
  }

  function collectInfo(collector, AppState, entries) {
    const diag = AppState.batchDiagnostics || {};
    const stats = [
      diag.sheetName ? `分頁：${diag.sheetName}` : '',
      `製作內容標記：${diag.anchorCount || 0} 個`,
      `製作物區塊：${diag.parsedBlockCount || 0} 個`,
      `資料筆數：${diag.recordCount || 0} 筆`,
      `產出圖片：${entries.length} 張`,
      `目前載入公版：${(diag.sourceTemplateNames || []).join('、') || '無'}`,
    ].filter(Boolean);
    stats.forEach((line) => collector.add('info', '解析統計', line));
    const mutedExtra = flagList('diagnostics.mutedWarnings');
    (diag.warnings || []).forEach((message) => { if (!isMutedWarning(clean(message), mutedExtra)) collector.add('important', '解析警告', message); });
    (diag.__exportNotes || []).forEach((note) => collector.add('info', '匯出備註', note));
  }

  function templateEntries(AppState) {
    return (AppState?.templates || []).map((item, index) => ({ item, index }));
  }

  /** 同步彙整（不載圖片）。 */
  function collect() {
    const { AppState, Renderer } = core();
    const collector = makeCollector();
    if (!AppState) return finish(collector);
    const entries = templateEntries(AppState);
    collectUnmatched(collector, AppState);
    collectAssetDiagnostics(collector, entries);
    collectPriceIssues(collector, entries);
    collectTextOverflow(collector, entries, Renderer, AppState);
    collectSkippedRows(collector, AppState);
    collectDuplicateNames(collector, entries);
    collectInfo(collector, AppState, entries);
    return finish(collector);
  }

  /** 多檢查「素材比例被拉伸」：沒有 keepAspectRatio 的圖片層，框比例與圖片原始比例差 5% 以上。 */
  async function collectWithImages() {
    const report = collect();
    const { AppState, TemplateLoader } = core();
    if (!AppState || typeof TemplateLoader?.loadImagesForTemplate !== 'function') return report;
    for (const { item, index } of templateEntries(AppState)) {
      let images = {};
      try { images = await TemplateLoader.loadImagesForTemplate(item.data, { project: item.project }); } catch (_) { continue; }
      Object.entries(item.data?.layers || {}).forEach(([key, layer]) => {
        const image = images?.[key];
        if (!layer || layer.type !== 'image' || layer.hidden || layer.keepAspectRatio || !image?.naturalWidth || !image?.naturalHeight) return;
        const frameRatio = Number(layer.width) / Number(layer.height);
        const imageRatio = image.naturalWidth / image.naturalHeight;
        if (!Number.isFinite(frameRatio) || Math.abs(frameRatio - imageRatio) / imageRatio <= ASPECT_TOLERANCE) return;
        report.tiers.find((tier) => tier.id === 'important').items.push({ kind: '素材比例被拉伸', title: item.name, detail: `${layer.psdName || key}：框 ${Math.round(layer.width)}×${Math.round(layer.height)}，圖 ${image.naturalWidth}×${image.naturalHeight}`, templateIndex: index });
      });
    }
    report.total = report.tiers.reduce((sum, tier) => sum + tier.items.length, 0);
    return report;
  }

  function finish(collector) {
    const tiers = TIERS.map((tier) => ({ ...tier, items: collector.items[tier.id] }));
    return { tiers, total: tiers.reduce((sum, tier) => sum + tier.items.length, 0), generatedAt: new Date() };
  }

  function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /** 一模一樣的訊息（同一種、同標題、同內容）合併成一條並標 ×N。 */
  function groupIdentical(items) {
    const groups = new Map();
    items.forEach((entry) => {
      const key = `${entry.kind}\u0001${entry.title}\u0001${entry.detail}`;
      if (groups.has(key)) groups.get(key).count += 1;
      else groups.set(key, { entry, count: 1 });
    });
    return [...groups.values()];
  }

  /** 純文字版（zip 內 診斷報告.txt）：條列、依四級分段。 */
  function text(report = collect()) {
    const { ProfileLoader, AppState } = core();
    const profile = ProfileLoader?.active;
    const toolName = ProfileLoader?.getFlag?.('ui.toolName', '') || '生成工具';
    const lines = [
      `${toolName} 診斷報告`,
      `產生時間：${formatDate(report.generatedAt || new Date())}`,
      `工具：${profile?.label || profile?.id || '—'}　分頁：${AppState?.batchDiagnostics?.sheetName || '—'}`,
      `摘要：${report.tiers.map((tier) => `${tier.label} ${tier.items.length}`).join(' ・ ')}`,
      '',
    ];
    report.tiers.forEach((tier) => {
      lines.push(`■ ${tier.label}（${tier.items.length}）— ${tier.hint}`);
      if (!tier.items.length) lines.push('  • 無');
      groupIdentical(tier.items).forEach(({ entry, count }) => lines.push(`  • [${entry.kind}] ${entry.title}${entry.detail ? `：${entry.detail}` : ''}${count > 1 ? `　×${count}` : ''}`));
      lines.push('');
    });
    return lines.join('\n');
  }

  window.DiagnosticsReport = Object.freeze({ TIERS, collect, collectWithImages, groupIdentical, text });
})();
