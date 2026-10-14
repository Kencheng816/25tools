/* 整合版（自 18節 移植）— 智慧型物件：同一個素材在不同版位之間連動
 *
 * 2026-10-06 回饋第 3 項：不同版位用了同一個素材時，在其中一張移動／放大縮小／旋轉，其他張的同素材也跟著動。
 * 使用者決定：預設「開」、可單張斷開（工具列「連動」開關／快捷鍵 D，沿用跨夜的 LinkSync）；文字層不連動。
 *
 * 規則：
 *   - 以素材檔名（去路徑、去副檔名、小寫）當同一個智慧物件；只處理 type=image 且有素材的圖層；鎖定中的目標不動。
 *   - 只有「同版型」（同一個公版 PSD／畫板產生）的版位才連動；不同版位（例如 HBN 與 DD Card）不連動（2026-10-06 回饋）。
 *   - 同版型一律同尺寸 → 位置／大小／旋轉一比一複製（不同尺寸的比例換算仍保留，以防日後同版型不同尺寸）。
 *   - 透過 core 的 AssetSyncHub（Interaction 拖曳／縮放／旋轉、Inspector 數值都會走 begin／update／finish）。
 *   - 被改到的其他張縮圖交給 BatchManager.markThumbsStale（去抖動後局部重畫）。
 * 只影響互動，不改任何自動產圖輸出。
 */
(function initAssetLinkSync() {
  'use strict';

  const core = () => ({ AppState: window.AppState, Geometry: window.Geometry, BatchManager: window.BatchManager, LinkSync: window.LinkSync, AssetSyncHub: window.AssetSyncHub });
  const flag = (name, fallback) => { const value = window.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };

  let nextId = 1;
  function ensureLinkId(template) {
    if (!template) return '';
    if (!template.__linkSyncId) template.__linkSyncId = `link-${Date.now().toString(36)}-${nextId++}`; // 可列舉：存檔後開關狀態還對得上這一張
    return template.__linkSyncId;
  }

  const AssetLinkSync = {
    session: null,

    materialKey(layer) {
      const name = String(layer?.assetFilename || '').split('/').pop().replace(/\.[^.]+$/, '');
      return name.trim().normalize('NFKC').toLowerCase();
    },

    isEligible(key, layer, template) {
      if (!layer || layer.type !== 'image' || layer.__nonInteractive || !String(layer.assetFilename || '').trim()) return false;
      // single-size-asset-sync 設定的圖層（同素材同尺寸一比一同步）由它負責，這裡讓開避免重複套用。
      if (window.SingleSizeAssetSync?.config?.eligibleLayers?.includes?.(key)) return false;
      // network／跨夜的規格素材由 multi-size-asset-sync 連動（有自己的比例邏輯），也讓開。
      const multi = window.MultiSizeAssetSync;
      if (multi && (layer.__assetSpec || layer.__networkAssetSpec || (typeof multi.isSyncTarget === 'function' && multi.isSyncTarget(key, layer, template)))) return false;
      return true;
    },

    templates() {
      const { AppState } = core();
      const seen = new Set();
      const result = [];
      (AppState.templates || []).forEach((entry, index) => {
        const template = entry?.data || entry;
        if (!template?.layers || seen.has(template)) return;
        seen.add(template);
        result.push({ index, template });
      });
      if (AppState.template && !seen.has(AppState.template)) result.push({ index: AppState.activeIndex, template: AppState.template });
      return result;
    },

    /** 其他版位裡用同一個素材的圖層（不含來源自己那一層；同一張裡的其他同素材圖層也算）。 */
    /** 版型識別：同一個公版（PSD／畫板）產生的版位才算同版型（2026-10-06 回饋：只有同版型的同名素材連動，不同版位不連動）。 */
    layoutKey(template) {
      return String(template?.canvas?.templateId || template?.source?.psdName || template?.batchSourceName || template?.templateId || '').trim().toLowerCase();
    },

    usages(materialKey, source) {
      const { LinkSync } = core();
      const result = [];
      if (!materialKey) return result;
      const sourceLayout = this.layoutKey(source.template);
      this.templates().forEach(({ index, template }) => {
        if (template !== source.template && LinkSync && !LinkSync.isEnabled(template)) return;
        if (template !== source.template && (!sourceLayout || this.layoutKey(template) !== sourceLayout)) return; // 不同版型不連動
        Object.entries(template.layers).forEach(([key, layer]) => {
          if (template === source.template && key === source.key) return;
          if (!this.isEligible(key, layer, template) || layer.locked) return;
          if (this.materialKey(layer) !== materialKey) return;
          result.push({ index, template, key, layer });
        });
      });
      return result;
    },

    box(key, layer, template) {
      const { Geometry } = core();
      const box = Geometry.getLayerBox(key, layer);
      return { x: box.x, y: box.y, width: Math.max(1, box.width), height: Math.max(1, box.height), rotation: Number(layer.rotation || 0), canvas: { width: Number(template?.canvas?.width) || 1, height: Number(template?.canvas?.height) || 1 } };
    },

    begin(template, key) {
      const { LinkSync } = core();
      const layer = template?.layers?.[key];
      if (!this.isEligible(key, layer, template) || (LinkSync && !LinkSync.isEnabled(template))) { this.session = null; return false; }
      ensureLinkId(template);
      const source = { template, key, layer };
      const targets = this.usages(this.materialKey(layer), source).map((usage) => ({
        ...usage,
        start: this.box(usage.key, usage.layer, usage.template),
        // 目標若是商品圖，它配對的價格也要等比跟著（商品組，modules/product-group-sync.js）。
        group: window.ProductGroupSync?.captureGroup?.(usage.template, usage.key) || null,
      }));
      if (!targets.length) { this.session = null; return false; }
      this.session = { template, key, start: this.box(key, layer, template), targets, touched: new Set(), changed: false };
      return true;
    },

    update(template, key) {
      const session = this.session;
      const layer = template?.layers?.[key];
      if (!session || session.template !== template || session.key !== key || !layer) return 0;
      const { Geometry } = core();
      const current = this.box(key, layer, template);
      const scaleW = current.width / session.start.width;
      const scaleH = current.height / session.start.height;
      const dx = current.x - session.start.x;
      const dy = current.y - session.start.y;
      let count = 0;
      session.targets.forEach((target) => {
        const sameSize = target.start.canvas.width === current.canvas.width && target.start.canvas.height === current.canvas.height;
        const next = sameSize
          ? { x: current.x, y: current.y, width: current.width, height: current.height }
          : {
            x: target.start.x + dx * (target.start.canvas.width / current.canvas.width),
            y: target.start.y + dy * (target.start.canvas.height / current.canvas.height),
            width: target.start.width * scaleW,
            height: target.start.height * scaleH,
          };
        Geometry.applyBox(target.key, target.layer, next, { template: target.template, notifyPrice: false });
        target.layer.rotation = current.rotation;
        if (target.group) window.ProductGroupSync.applyGroup(target.group, this.box(target.key, target.layer, target.template));
        if (target.template !== template) session.touched.add(target.index);
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
      const indexes = [...session.touched].filter((index) => Number.isInteger(index) && index >= 0);
      if (indexes.length) core().BatchManager?.markThumbsStale?.(indexes);
      if (indexes.length) window.showToast?.(`已同步到其他 ${indexes.length} 張同素材版位`);
      return indexes.length;
    },

    /** Inspector 提示用：這個素材在批次中被幾張使用。 */
    usageCount(key, layer, template) {
      if (!this.isEligible(key, layer, template)) return 0;
      return this.usages(this.materialKey(layer), { template, key, layer }).length + 1;
    },
  };

  function wire() {
    const { AssetSyncHub } = core();
    if (!AssetSyncHub || AssetSyncHub.engines?.has?.('asset-link-sync')) return;
    if (flag('sync.assetLink', false) !== true) return;
    AssetSyncHub.register('asset-link-sync', AssetLinkSync);
    window.AssetLinkSync = AssetLinkSync;
  }

  const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
  whenReady();
})();
