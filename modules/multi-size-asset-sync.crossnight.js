/* multi-size-asset-sync — 選用模組 · Multi-Size Asset Sync Engine
 *
 * 用途：批次中如果有多張輸出檔用了同一個素材，且各張尺寸/公版不同，
 * 手動調整其中一張的版位(拖曳/縮放/旋轉)時，其他張要依比例(對應到各自 P_範圍 參考框)同步。
 * 也提供「還原成預設版位」把同素材所有張還原成 initial render 狀態。
 *
 * 啟用方式：
 *   1. 在 index.html 於 core/app.core.js 之後引入本檔
 *   2. 專案在 rules/*.rules.js 或 batch 建置時，把要啟用的 template 標記：
 *      template.batchRecord = { ...template.batchRecord, __multiSizeSync: true };
 *   3. (可選) 在專案入口呼叫 MultiSizeAssetSync.configure({...}) 覆寫預設判斷邏輯
 *
 * 依賴：core 的 AppState / Geometry / HistoryManager / TemplateLoader / ProductEngine
 *      以及全域函式 normalizeLayerIdentifier / normalizeAssetStemExact / decodeHashUnicode
 *      這些在 core/app.core.js 已定義。本模組在 core 載入後被引入即可。
 */
(() => {
  'use strict';

  // 引用 core 匯出的全域物件/函式（core 是 IIFE，這些都掛在 window 上）
  const AppState = window.AppState;
  const Geometry = window.Geometry;
  const HistoryManager = window.HistoryManager;
  const TemplateLoader = window.TemplateLoader;
  const AssetSyncHub = window.AssetSyncHub;
  const normalizeLayerIdentifier = window.normalizeLayerIdentifier;
  const normalizeAssetStemExact = window.normalizeAssetStemExact;
  const decodeHashUnicode = window.decodeHashUnicode;

  // 依賴檢查：任何一項缺失即拒絕載入，避免產生模糊錯誤
  const missing = [];
  if (!AppState) missing.push('AppState');
  if (!Geometry) missing.push('Geometry');
  if (!HistoryManager) missing.push('HistoryManager');
  if (!TemplateLoader) missing.push('TemplateLoader');
  if (!AssetSyncHub) missing.push('AssetSyncHub');
  if (!normalizeLayerIdentifier) missing.push('normalizeLayerIdentifier');
  if (!normalizeAssetStemExact) missing.push('normalizeAssetStemExact');
  if (!decodeHashUnicode) missing.push('decodeHashUnicode');
  if (missing.length) {
    console.warn('[multi-size-asset-sync] 缺少 core 依賴：', missing.join(', '), '— 模組未載入');
    return;
  }

  // 內部小工具：clone 用 core 相同做法（結構化淺 clone 對 JSON 資料夠用）
  const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
  const round = (value, digits = 2) => {
    const factor = 10 ** digits;
    return Math.round(Number(value) * factor) / factor;
  };

const MultiSizeAssetSync = {
  session: null,
  normalizeMaterial(value) {
    return decodeHashUnicode(String(value || ''))
      .normalize('NFKC')
      .replace(/\\/g, '/')
      .trim()
      .toLowerCase();
  },
  canonicalName(key, layer) {
    return normalizeLayerIdentifier(layer?.__canonicalName || layer?.psdName || layer?.name || key);
  },
  // 由專案在載入時呼叫 configure({ eligibleLayerPatterns, guideLayerResolver, activationFlag })
  // 可覆寫預設判斷。預設值：flag = 'multiSizeSync'，可辨識 P/P_02/logo_01~05，
  // 對應的參考框 (guide) 是 P_範圍 / P_範圍_01~05。
  config: {
    activationFlag: '__multiSizeSync',
    eligibleLayerPatterns: [
      (name) => name === normalizeLayerIdentifier('P'),
      (name) => name === normalizeLayerIdentifier('P_02'),
      (name) => /^logo_0[1-5]$/i.test(name),
    ],
    guideLayerResolver: (canonicalName) => {
      if (canonicalName.startsWith('logo_')) {
        const num = String(canonicalName.match(/(\d+)$/)?.[1] || '').padStart(2, '0');
        return `P_範圍_${num}`;
      }
      return 'P_範圍';
    },
    // 同素材是否還要再分群。回傳同一個字串的版位才會互相連動；
    // 預設回傳空字串＝只要素材相同就全部連動（維持既有行為）。
    // 專案若需要「同素材但不同用途不互相影響」，用 configure({ groupKeyResolver }) 覆寫。
    groupKeyResolver: () => '',
    // 這個圖層目前「有沒有實際素材可以當群組識別」。
    // 舊版在這裡寫死 __assetSpec.kind === 'dynamic-logo'（Network 專屬），
    // 造成非 Network 專案由公版 JSON 帶入的素材永遠不被視為可連動。
    // 現在改成可由規則檔覆寫：configure({ materialPredicate })。
    // 預設只要圖層有 assetFilename 就算，涵蓋「工單自動帶入」與「手動上傳」兩種來源。
    materialPredicate: (key, layer) => Boolean(String(layer?.assetFilename || '').trim()),
    // 完全接管「群組識別」的計算。回傳非空字串時，materialKey 直接採用，
    // 不再依素材檔名推導。專案若要讓群組在「Delete 清空 → 重新上傳」之間保持不斷，
    // 就用這個 hook 回傳一個與素材無關的穩定 key（跨夜以主持人槽位 A/B 當 key）。
    // 舊版是靠 __assetSpec.stem 維持這個識別，該機制已隨 Network 規格素材一併移除。
    materialKeyResolver: null,
  },
  configure(overrides = {}) {
    Object.assign(this.config, overrides);
  },
  // 「這個圖層是不是連動的目標版位」——只看圖層身分，不看連動開關。
  // ManualAssetUpload.groupUsages 與本模組的 usages() 都用這個判斷挑候選版位。
  isSyncTarget(key, layer, template) {
    const flag = this.config.activationFlag;
    if (!template?.batchRecord?.[flag] || layer?.type !== 'image') return false;
    const name = this.canonicalName(key, layer);
    const matched = this.config.eligibleLayerPatterns.some((predicate) => {
      try { return predicate(name); } catch (_err) { return false; }
    });
    if (!matched) return false;
    if (layer.__manualAsset === true) return Boolean(this.normalizeMaterial(layer.assetFilename));
    try { return this.config.materialPredicate(key, layer, template) === true; }
    catch (_err) { return false; }
  },
  isEligible(key, layer, template) {
    // 連動被關掉的公版不參與同步（不推播也不接收，雙向斷開）。
    if (window.LinkSync && !window.LinkSync.isEnabled(template)) return false;
    return this.isSyncTarget(key, layer, template);
  },
  groupKey(template, layer) {
    try { return String(this.config.groupKeyResolver(template, layer) || ''); }
    catch (_err) { return ''; }
  },
  materialKey(layer, template = null) {
    if (!layer) return '';
    const group = this.groupKey(template, layer);
    const prefix = group ? `${group}::` : '';
    if (typeof this.config.materialKeyResolver === 'function') {
      let custom = '';
      try { custom = String(this.config.materialKeyResolver(layer, template) || ''); }
      catch (_err) { custom = ''; }
      if (custom) return `${prefix}${custom}`;
    }
    if (layer.__manualAsset === true && layer.assetFilename) {
      return `${prefix}manual:${this.normalizeMaterial(layer.assetFilename)}`;
    }
    const stem = normalizeAssetStemExact(layer.assetFilename || '');
    return stem ? `${prefix}stem:${stem}` : '';
  },
  templates() {
    const seen = new Set();
    const result = [];
    (AppState.templates || []).forEach((entry, index) => {
      const template = entry?.data || entry;
      if (!template || seen.has(template)) return;
      seen.add(template);
      result.push({ index, template });
    });
    if (AppState.template && !seen.has(AppState.template)) {
      result.push({ index: AppState.activeIndex, template: AppState.template });
    }
    return result;
  },
  findLayerEntry(template, requestedName) {
    const wanted = normalizeLayerIdentifier(requestedName);
    return Object.entries(template?.layers || {}).find(([key, layer]) => this.canonicalName(key, layer) === wanted) || null;
  },
  guideEntry(template, key, layer) {
    const explicitName = layer?.__maskLayerName || layer?.maskLayerName;
    const name = explicitName || this.config.guideLayerResolver(this.canonicalName(key, layer));
    return this.findLayerEntry(template, name);
  },
  rawBox(layer) {
    const width = Math.max(1, Number(layer?.width || layer?.targetWidth || 1));
    const height = Math.max(1, Number(layer?.height || layer?.targetHeight || 1));
    const centerX = Number.isFinite(Number(layer?.centerX)) ? Number(layer.centerX) : Number(layer?.x || 0) + width / 2;
    const centerY = Number.isFinite(Number(layer?.centerY)) ? Number(layer.centerY) : Number(layer?.y || 0) + height / 2;
    return { x: centerX - width / 2, y: centerY - height / 2, width, height, centerX, centerY };
  },
  initialLayerEntry(template, key, layer) {
    const model = template?.__renderModel;
    if (!model?.layers) return null;
    if (model.layers[key]) return [key, model.layers[key]];
    const wanted = this.canonicalName(key, layer);
    return Object.entries(model.layers)
      .find(([initialKey, initialLayer]) => this.canonicalName(initialKey, initialLayer) === wanted) || null;
  },
  renderedBox(layer, image = null) {
    if (layer?.type === 'image' && image && window.ProductEngine?.getRenderedImageBox) {
      return window.ProductEngine.getRenderedImageBox(layer, image);
    }
    return this.rawBox(layer);
  },
  captureRelative(template, key, layer, options = {}) {
    const useInitial = options.initial === true;
    let workingTemplate = template;
    let workingKey = key;
    let workingLayer = layer;

    if (useInitial) {
      const initialEntry = this.initialLayerEntry(template, key, layer);
      if (!initialEntry) return null;
      workingTemplate = template.__renderModel;
      [workingKey, workingLayer] = initialEntry;
    }

    const guide = this.guideEntry(workingTemplate, workingKey, workingLayer);
    if (!guide) return null;
    const guideBox = this.rawBox(guide[1]);
    const box = useInitial
      ? this.renderedBox(workingLayer, options.referenceImage)
      : (template === AppState.template
        ? Geometry.getLayerBox(key, layer, AppState.images)
        : this.rawBox(layer));
    if (!(guideBox.width > 0) || !(guideBox.height > 0)) return null;
    return {
      centerXRatio: (box.x + box.width / 2 - guideBox.x) / guideBox.width,
      centerYRatio: (box.y + box.height / 2 - guideBox.y) / guideBox.height,
      widthRatio: box.width / guideBox.width,
      heightRatio: box.height / guideBox.height,
      rotation: Number(workingLayer.rotation || 0),
    };
  },
  deltaFromInitial(initialRelative, currentRelative) {
    if (!initialRelative || !currentRelative) return null;
    const safeScale = (current, initial) => {
      const denominator = Number(initial);
      if (!Number.isFinite(denominator) || Math.abs(denominator) < 0.000001) return 1;
      const scale = Number(current) / denominator;
      return Number.isFinite(scale) && scale > 0 ? scale : 1;
    };
    return {
      centerXDelta: Number(currentRelative.centerXRatio || 0) - Number(initialRelative.centerXRatio || 0),
      centerYDelta: Number(currentRelative.centerYRatio || 0) - Number(initialRelative.centerYRatio || 0),
      widthScale: safeScale(currentRelative.widthRatio, initialRelative.widthRatio),
      heightScale: safeScale(currentRelative.heightRatio, initialRelative.heightRatio),
      rotationDelta: Number(currentRelative.rotation || 0) - Number(initialRelative.rotation || 0),
    };
  },
  relativeFromDelta(initialRelative, delta) {
    if (!initialRelative || !delta) return null;
    return {
      centerXRatio: Number(initialRelative.centerXRatio || 0) + Number(delta.centerXDelta || 0),
      centerYRatio: Number(initialRelative.centerYRatio || 0) + Number(delta.centerYDelta || 0),
      widthRatio: Math.max(0.000001, Number(initialRelative.widthRatio || 0) * Number(delta.widthScale || 1)),
      heightRatio: Math.max(0.000001, Number(initialRelative.heightRatio || 0) * Number(delta.heightScale || 1)),
      rotation: Number(initialRelative.rotation || 0) + Number(delta.rotationDelta || 0),
    };
  },
  applyRelative(template, key, layer, relative) {
    const guide = this.guideEntry(template, key, layer);
    if (!guide || !relative) return false;
    const guideBox = this.rawBox(guide[1]);
    const width = Math.max(1, guideBox.width * relative.widthRatio);
    const height = Math.max(1, guideBox.height * relative.heightRatio);
    const centerX = guideBox.x + guideBox.width * relative.centerXRatio;
    const centerY = guideBox.y + guideBox.height * relative.centerYRatio;
    layer.x = round(centerX - width / 2, 2);
    layer.y = round(centerY - height / 2, 2);
    layer.width = round(width, 2);
    layer.height = round(height, 2);
    layer.centerX = round(centerX, 2);
    layer.centerY = round(centerY, 2);
    layer.targetWidth = round(width, 2);
    layer.targetHeight = round(height, 2);
    layer.maxTargetHeight = round(height, 2);
    layer.keepAspectRatio = true;
    layer.sizingMode = 'containByPBox';
    layer.rotation = round(relative.rotation, 2);
    layer.__smartObjectEdited = true;
    return true;
  },
  usages(materialKey) {
    const result = [];
    if (!materialKey) return result;
    this.templates().forEach(({ index, template }) => {
      Object.entries(template.layers || {}).forEach(([key, layer]) => {
        if (!this.isEligible(key, layer, template)) return;
        if (this.materialKey(layer, template) !== materialKey) return;
        result.push({ index, template, key, layer });
      });
    });
    return result;
  },
  begin(template, key, options = {}) {
    const layer = template?.layers?.[key];
    if (!this.isEligible(key, layer, template)) { this.session = null; return false; }
    const materialKey = this.materialKey(layer, template);
    const referenceImage = template === AppState.template ? AppState.images?.[key] || null : null;
    const startRelative = this.captureRelative(template, key, layer);
    const sourceInitialRelative = this.captureRelative(template, key, layer, { initial: true, referenceImage });
    if (!materialKey || !startRelative || !sourceInitialRelative) { this.session = null; return false; }
    const attachHistory = options.attachHistory !== false;
    const otherIndexes = [...new Set(this.usages(materialKey)
      .filter((usage) => usage.template !== template)
      .map((usage) => usage.index))];
    const snapshot = attachHistory
      ? otherIndexes.map((index) => ({ index, data: clone(AppState.templates[index]?.data) })).filter((item) => item.data)
      : [];
    this.session = {
      template,
      key,
      materialKey,
      referenceImage,
      startRelative,
      sourceInitialRelative,
      snapshot,
      touchedIndexes: new Set(),
      changed: false,
      attachHistory,
    };
    return true;
  },
  relativeChanged(before, after) {
    if (!before || !after) return false;
    return ['centerXRatio', 'centerYRatio', 'widthRatio', 'heightRatio', 'rotation']
      .some((field) => Math.abs(Number(before[field] || 0) - Number(after[field] || 0)) > 0.0001);
  },
  update(template, key) {
    const session = this.session;
    const layer = template?.layers?.[key];
    if (!session || session.template !== template || session.key !== key || !layer) return 0;
    const currentRelative = this.captureRelative(template, key, layer);
    if (!currentRelative) return 0;
    session.changed = session.changed || this.relativeChanged(session.startRelative, currentRelative);
    const delta = this.deltaFromInitial(session.sourceInitialRelative, currentRelative);
    if (!delta) return 0;
    let count = 0;
    this.usages(session.materialKey).forEach((usage) => {
      if (usage.template === template && usage.key === key) return;
      const targetInitialRelative = this.captureRelative(
        usage.template,
        usage.key,
        usage.layer,
        { initial: true, referenceImage: session.referenceImage },
      );
      const targetRelative = this.relativeFromDelta(targetInitialRelative, delta);
      if (!targetRelative || !this.applyRelative(usage.template, usage.key, usage.layer, targetRelative)) return;
      if (usage.template !== template) session.touchedIndexes.add(usage.index);
      count += 1;
    });
    // 拖曳過程中就把「被連動的版位 ＋ 來源版位自己」標記成待更新。
    // core 的 markThumbsStale 會去抖動，停手 400ms 後才真正重繪一次。
    if (count) this.markGroupStale(template, session.touchedIndexes);
    return count;
  },
  // 來源版位自己的縮圖也必須刷新——它就是使用者剛剛改動的那一張。
  // 舊版只刷 touchedIndexes（僅其他版位），所以來源那張會一直停在變動前的畫面。
  markGroupStale(sourceTemplate, otherIndexes = []) {
    const sourceIndex = window.BatchManager?.indexOfTemplate?.(sourceTemplate) ?? -1;
    const indexes = [...new Set([...otherIndexes, sourceIndex])].filter((index) => index >= 0);
    if (indexes.length) window.BatchManager?.markThumbsStale?.(indexes);
    return indexes;
  },
  finish(template, key) {
    const session = this.session;
    if (!session || session.template !== template || session.key !== key) { this.session = null; return 0; }
    this.update(template, key);
    this.session = null;
    if (!session.changed) return 0;
    if (session.attachHistory) HistoryManager.attachExtra(session.snapshot.length ? session.snapshot : null);
    const indexes = this.markGroupStale(template, session.touchedIndexes);
    return indexes.length;
  },
  async restoreGroup(template, key, options = {}) {
    const layer = template?.layers?.[key];
    if (!this.isEligible(key, layer, template)) return { restored: false, count: 0, indexes: [] };
    const materialKey = this.materialKey(layer, template);
    const usages = this.usages(materialKey);
    if (!materialKey || !usages.length) return { restored: false, count: 0, indexes: [] };
    const attachHistory = options.attachHistory !== false;
    const otherIndexes = [...new Set(usages.filter((usage) => usage.template !== template).map((usage) => usage.index))];
    const snapshot = attachHistory
      ? otherIndexes.map((index) => ({ index, data: clone(AppState.templates[index]?.data) })).filter((item) => item.data)
      : [];
    let count = 0;
    usages.forEach((usage) => {
      const model = usage.template.__renderModel;
      if (!model?.layers) return;
      const initial = model.layers[usage.key]
        || Object.entries(model.layers).find(([initialKey, initialLayer]) => this.canonicalName(initialKey, initialLayer) === this.canonicalName(usage.key, usage.layer))?.[1];
      if (!initial) return;
      usage.template.layers[usage.key] = clone(initial);
      count += 1;
    });
    if (attachHistory) HistoryManager.attachExtra(snapshot.length ? snapshot : null);
    if (template === AppState.template) {
      AppState.images = await TemplateLoader.loadImagesForTemplate(template, { project: template.batchProject || AppState.currentProject || '' });
    }
    const staleIndexes = this.markGroupStale(template, otherIndexes);
    if (staleIndexes.length && AppState.batchMode && window.BatchManager?.refreshThumbsForIndexes) {
      await window.BatchManager.refreshThumbsForIndexes(staleIndexes);
    }
    return { restored: count > 0, count, indexes: otherIndexes };
  },
};
window.MultiSizeAssetSync = MultiSizeAssetSync;

  // 註冊到 AssetSyncHub，讓 core 統一透過 Hub 呼叫
  AssetSyncHub.register('multi-size-asset-sync', MultiSizeAssetSync);
})();
