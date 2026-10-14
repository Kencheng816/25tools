/* single-size-asset-sync — 選用模組 · Single-Size Asset Sync Engine
 *
 * 用途：批次中如果有多張輸出檔用了同一個素材，且各張都是相同尺寸/公版，
 * 手動調整其中一張的版位(拖曳/縮放/旋轉/微調)時，其他張要一比一同步（不需要比例換算）。
 * 也提供「還原成預設版位」，把同素材所有張還原成 template.__defaultBox 記錄的初始版位。
 *
 * 適用情境：單一尺寸公版跨張同步（例如 KOL 代播圖 720x720 統一版位）。
 * 若不同張是不同尺寸/公版，請改用 multi-size-asset-sync（有比例換算邏輯）。
 *
 * 啟用方式：
 *   1. 在 index.html 於 core/app.core.js 之後引入本檔
 *   2. 在專案入口呼叫 SingleSizeAssetSync.configure({ eligibleLayers: ['直播主_人像'] })
 *   3. (可選) 專案的 rules 檔在圖層完成自動貼合當下，記錄 template.__defaultBox = {x,y,width,height,...}
 *      供本模組的「還原成預設版位」使用
 *
 * 依賴：core 的 AppState / BatchManager (可選)
 */
(() => {
  'use strict';

  const AppState = window.AppState;
  const AssetSyncHub = window.AssetSyncHub;

  const missing = [];
  if (!AppState) missing.push('AppState');
  if (!AssetSyncHub) missing.push('AssetSyncHub');
  if (missing.length) {
    console.warn('[single-size-asset-sync] 缺少 core 依賴：', missing.join(', '), '— 模組未載入');
    return;
  }

const SingleSizeAssetSync = {
  session: null,
  // 由專案在載入時呼叫 configure({ eligibleLayers, defaultBoxKey }) 覆寫預設。
  // 預設值 eligibleLayers 是空陣列，代表未配置時模組不會啟用（safe by default）。
  config: {
    eligibleLayers: [],             // 例如 ['直播主_人像', 'KOL_人像']
    defaultBoxKey: '__defaultBox',  // template 上儲存還原用預設版位的欄位名
  },
  configure(overrides = {}) {
    Object.assign(this.config, overrides);
  },

  isEligible(key, layer) {
    return this.config.eligibleLayers.includes(key)
      && layer?.type === 'image'
      && !!String(layer?.assetFilename || '').trim();
  },

  materialKey(layer) {
    return String(layer?.assetFilename || '').trim().normalize('NFKC').toLowerCase();
  },

  // 回傳目前所有「批次生成物」清單；非批次模式（只有單一 AppState.template）時，
  // 至少要包含目前這個 template，讓同步/還原在單張編輯情境下也能正常運作（雖然此時不會有其他張可以同步）。
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

  // 支援多個 eligibleLayers：逐一檢查每個 template 的每個註冊 layer key。
  usages(materialKey) {
    const result = [];
    if (!materialKey) return result;
    this.templates().forEach(({ index, template }) => {
      this.config.eligibleLayers.forEach((layerKey) => {
        const layer = template.layers?.[layerKey];
        if (!this.isEligible(layerKey, layer)) return;
        if (this.materialKey(layer) !== materialKey) return;
        result.push({ index, template, layer, layerKey });
      });
    });
    return result;
  },

  begin(template, key) {
    const layer = template?.layers?.[key];
    if (!this.isEligible(key, layer)) { this.session = null; return false; }
    this.session = { template, key, materialKey: this.materialKey(layer), touchedIndexes: new Set(), changed: false };
    return true;
  },

  update(template, key) {
    const session = this.session;
    const layer = template?.layers?.[key];
    if (!session || session.template !== template || session.key !== key || !layer) return 0;
    let count = 0;
    this.usages(session.materialKey).forEach((usage) => {
      if (usage.template === template && usage.layerKey === session.key) return; // 自己不用同步自己
      const target = usage.layer;
      target.x = layer.x; target.y = layer.y;
      target.width = layer.width; target.height = layer.height;
      target.centerX = layer.centerX; target.centerY = layer.centerY;
      target.rotation = Number(layer.rotation || 0);
      target.keepAspectRatio = false; // 已經是使用者手動調整過的精確版位，不需要再被自動貼合邏輯二次調整
      session.touchedIndexes.add(usage.index);
      count += 1;
    });
    session.changed = session.changed || count > 0;
    return count;
  },

  finish(template, key) {
    const session = this.session;
    if (!session || session.template !== template || session.key !== key) { this.session = null; return 0; }
    this.update(template, key);
    this.session = null;
    if (!session.changed) return 0;
    const indexes = [...session.touchedIndexes];
    // 只針對被同步到的那幾張版位重繪縮圖；不用整批 renderPreviewGrid（否則30張批次每次拖曳都要
    // 等6~12秒把整批重畫，且過程會暫時切 AppState.template 造成潛在的競態問題）。
    // 這個路徑保持保守：不刷新縮圖也不會影響資料正確性，只影響縮圖顯示；縮圖會在下次
    // 使用者手動觸發「重新整理批次預覽」時自動更新。
    if (indexes.length && AppState.batchMode) {
      this._refreshSyncedThumbs(indexes);
    }
    return indexes.length;
  },

  // 委派給 BatchManager 的統一縮圖刷新佇列（避免兩套實作並存造成不一致）。
  _refreshSyncedThumbs(indexes) {
    window.BatchManager?.queueThumbRefresh?.(indexes);
  },

  // 還原：把目前這張、以及所有使用相同素材檔案的其他張，全部還原成
  // 規則檔在自動貼合完成當下記錄的 __hostPhotoDefaultBox。
  restoreGroup(template, key) {
    const layer = template?.layers?.[key];
    if (!this.isEligible(key, layer)) return { restored: false, count: 0 };
    const materialKey = this.materialKey(layer);
    const usages = this.usages(materialKey);
    let count = 0;
    const touchedIndexes = new Set();
    usages.forEach((usage) => {
      const defaultBox = usage.template?.[this.config.defaultBoxKey];
      if (!defaultBox) return;
      Object.assign(usage.layer, defaultBox);
      count += 1;
      if (usage.template !== template) touchedIndexes.add(usage.index);
    });
    if (touchedIndexes.size && AppState.batchMode) {
      this._refreshSyncedThumbs([...touchedIndexes]);
    }
    return { restored: count > 0, count };
  },
};

  window.SingleSizeAssetSync = SingleSizeAssetSync;
  AssetSyncHub.register('single-size-asset-sync', SingleSizeAssetSync);
})();
