/* 整合版（自 18節 移植）— 診斷資料彙整（四級分類）
 *
 * 2026-10-07 回饋 3／7：把散在各處的診斷（未匹配、素材檢查、解析診斷、略過列…）整理成同一份資料，
 * 依「重要 × 緊急」分四級，給左側診斷面板（diagnostics-panel.js）與下載 zip 的 診斷報告.txt 共用。
 *
 *   critical  重要且緊急（紅）：找不到公版、素材缺少、有價格卻沒顯示 → 不處理就會出錯圖
 *   important 重要不緊急（橘）：文字可能超出框、素材比例被拉伸、素材退回預設 → 圖會出但可能不好看
 *   minor     不重要但緊急（黃）：範例列／空白列被略過、輸出名重複、版位沒有對應圖層 → 要知道、但多半是預期中
 *   info      不重要不緊急（灰）：解析統計、匯出備註
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

  function collectUnmatched(collector, AppState) {
    (AppState.unmatchedBatchItems || []).forEach((item) => {
      const reason = clean(item?.reason);
      if (/空白/.test(reason)) collector.add('minor', '欄位空白', item?.name, reason);
      else collector.add('critical', '找不到公版', item?.name, reason);
    });
  }

  function collectAssetDiagnostics(collector, entries) {
    entries.forEach(({ item, index }) => {
      const list = Array.isArray(item.data?.batchDiagnostics) ? item.data.batchDiagnostics : [];
      list.forEach((entry) => {
        const detail = `${entry.field || ''}「${entry.value || ''}」${entry.target ? `（${entry.target}）` : ''}`;
        // 25節：'missing-layer'＝這個版位本來就沒有該圖層（例如 600x400 沒有商品圖槽），是版型差異不是缺素材 → 只列為提醒。
        if (entry.status === 'missing-layer') collector.add('minor', '版位沒有對應圖層', item.name, detail, index);
        else if (isMissingStatus(entry.status)) collector.add('critical', '素材缺少', item.name, detail, index);
        else if (entry.status === 'warning') collector.add('important', '素材退回預設', item.name, detail, index);
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

  /** 單行寬度超過框寬 15% 以上才算（各引擎會自動換行／縮放，只抓明顯超出的）。 */
  function collectTextOverflow(collector, entries, Renderer) {
    if (typeof Renderer?.measureRenderedTextWidth !== 'function') return;
    const probe = document.createElement('canvas').getContext('2d');
    entries.forEach(({ item, index }) => {
      Object.entries(item.data?.layers || {}).forEach(([key, layer]) => {
        if (!layer || layer.type !== 'text' || layer.hidden || !(Number(layer.width) > 0) || !clean(layer.text)) return;
        try {
          const widest = clean(layer.text).split('\n').reduce((max, line) => Math.max(max, Number(Renderer.measureRenderedTextWidth({ ...layer, text: line }, probe)) || 0), 0);
          if (widest > Number(layer.width) * TEXT_OVERFLOW_TOLERANCE) {
            collector.add('important', '文字可能超出框', item.name, `${layer.psdName || key}：寬 ${Math.round(widest)}px，框 ${Math.round(layer.width)}px`, index);
          }
        } catch (_) { /* 量測失敗就不報 */ }
      });
    });
  }

  /** 同一個原因的略過列合成一條：「第 18、41、42 列」（超過 8 列只列前 8 列＋共幾列）。 */
  function collectSkippedRows(collector, AppState) {
    const byReason = new Map();
    (AppState.batchDiagnostics?.skippedRows || []).forEach((row) => {
      const reason = clean(row.reason);
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
    (diag.warnings || []).forEach((message) => collector.add('important', '解析警告', message));
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
    collectTextOverflow(collector, entries, Renderer);
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
