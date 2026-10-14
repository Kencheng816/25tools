/* 整合版 5.3 – 任何圖片圖層都可「上傳替換」「清除圖片」
 *
 * 只在使用者主動操作時生效（Inspector 兩顆按鈕、把圖檔拖到畫布上的圖層、選取圖層後按 Delete）；
 * 工單自動流程完全不變。手動結果（含貼合後的外框）記在 template.__manualAssetOverrides，之後每次重新套版都會套回
 * （core 的 applyRecordToTemplate 尾端呼叫 ManualAssetUpload.applyOverrides），存檔也會一起保存。
 *
 * 替換走兩條既有路：
 *   - 一般圖層：ManualAssetUpload.applyFile（network／跨夜的上傳槽機制），檔案進「手動替換」桶。
 *   - A 系（正式BN／暖身BN／MS）由智慧物件管理的商品圖：交給 Interaction.applyManualProductUpload（MS 的補圖流程），
 *     它會把智慧物件身分一起換掉，避免下一次同步把舊圖拉回來。
 * 本檔是靜態載入的模組，不分 A／B 血緣，只在事件發生時用 core 掛在 window 上的介面。
 */
(function initManualAssetControls() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
  const isImageFile = (file) => !!file && (/^image\//i.test(file.type || '') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name || ''));

  const core = () => ({
    AppState: window.AppState,
    ManualAssetUpload: window.ManualAssetUpload,
    Interaction: window.Interaction,
    LayerManager: window.LayerManager,
    Geometry: window.Geometry,
    HistoryManager: window.HistoryManager,
    Renderer: window.Renderer,
    Inspector: window.Inspector,
    BatchManager: window.BatchManager,
    TemplateLoader: window.TemplateLoader,
  });
  const ready = () => !!(window.AppState && window.ManualAssetUpload && window.LayerManager);

  function activeSelection() {
    const { AppState } = core();
    const key = AppState?.selectedLayers?.[0];
    const layer = key ? AppState.template?.layers?.[key] : null;
    return { key, layer, template: AppState?.template };
  }

  // ── Inspector 控制列 ──
  function render(key, layer) {
    const box = $('assetControls');
    if (!box) return;
    const { ManualAssetUpload } = core();
    const editable = !!(ManualAssetUpload && ManualAssetUpload.canManuallyEdit(key, layer));
    box.classList.toggle('hidden', !editable);
    if (!editable) return;
    const hasAsset = ManualAssetUpload.hasAsset(layer);
    const clearBtn = $('clearAssetBtn');
    if (clearBtn) clearBtn.disabled = !hasAsset;
    const status = $('assetControlStatus');
    if (status) {
      status.textContent = layer.__assetCleared === true
        ? '已清除（輸出時這一層不會出現）'
        : layer.__manualAsset === true
          ? `手動替換：${String(layer.assetFilename || '').split('/').pop()}`
          : hasAsset ? `目前素材：${String(layer.assetFilename || '').split('/').pop()}` : '沒有素材';
    }
  }

  /** （自 18節 移植）換了票券素材 → 價格依新素材的規則重算（modules/coupon-price-sync.js，只在該層是價格錨點時生效）。回傳提示文字。 */
  async function rebuildPricesForAsset(template, key, file) {
    const result = await window.CouponPriceSync?.rebuildForAsset?.(template, key, file.name, file);
    return result?.message || '';
  }

  /** 重算價格的提示要在 refreshAfterChange（Inspector 重畫會寫回「目前素材：…」）之後再放進狀態列。 */
  function showPriceMessage(message) {
    if (!message) return;
    const status = $('assetControlStatus'); if (status) status.textContent = message;
    window.showToast?.(message);
  }

  // ── 替換 ──
  async function replaceLayerAsset(key, layer, file, template) {
    const { ManualAssetUpload, Interaction, HistoryManager, AppState } = core();
    if (!ManualAssetUpload.canManuallyEdit(key, layer)) return false;
    if (!isImageFile(file)) { alert('請提供圖片檔（png / jpg / webp / svg）。'); return false; }
    HistoryManager?.push?.();

    const useSmartAssetPath = typeof Interaction?.applyManualProductUpload === 'function'
      && typeof Interaction?.isSmartAssetLayer === 'function'
      && Interaction.isSmartAssetLayer(key, layer, template);
    if (useSmartAssetPath && template === AppState.template) {
      // A 系智慧物件商品圖：借用 MS 的補圖流程（它只接受「待補圖」佔位框，所以先標記）。
      layer.__manualUploadRequired = true;
      layer.assetFilename = '';
      const ok = await Interaction.applyManualProductUpload(key, file);
      if (!ok) { delete layer.__manualUploadRequired; return false; }
      ManualAssetUpload.recordOverride(template, key, {
        mode: 'replace',
        assetFilename: layer.assetFilename,
        assetProject: layer.assetProject || '',
        smartAssetId: layer.smartAssetId,
      });
      window.showToast?.('已替換商品圖');
      // 5.4：商品／票券圖換了 → 用新檔名查型錄、重上價格顏色。
      window.CouponControls?.onAssetReplaced?.(template, key, layer, file);
      // （自 18節 移植）A 系商品圖也是價格錨點：換了票券素材 → 價格依新素材的規則重算。
      const priceMessage = await rebuildPricesForAsset(template, key, file);
      refreshAfterChange(template);
      showPriceMessage(priceMessage);
      return true;
    }

    // 一般圖層：沿用上傳槽機制（會記錄 override）。manualGeometry=false → 不套 network 上傳槽的 contain；
    // fitToImage=true（自 18節 移植）→ 裁掉透明邊、等比塞進原外框、外框縮成貼合圖片（清除後上傳與直接替換都一樣）。
    const count = await ManualAssetUpload.applyFile(key, layer, file, { template, manualGeometry: false, fitToImage: true });
    if (count > 0) {
      window.CouponControls?.onAssetReplaced?.(template, key, layer, file);
      const priceMessage = await rebuildPricesForAsset(template, key, file);
      refreshAfterChange(template);
      showPriceMessage(priceMessage);
    }
    return count > 0;
  }

  async function clearLayerAsset(key, layer, template) {
    const { ManualAssetUpload, HistoryManager } = core();
    if (!ManualAssetUpload.canManuallyEdit(key, layer) || !ManualAssetUpload.hasAsset(layer)) return false;
    HistoryManager?.push?.();
    const count = await ManualAssetUpload.clearAsset(key, layer, { template, manual: true });
    if (count > 0) refreshAfterChange(template);
    return count > 0;
  }

  function refreshAfterChange(template) {
    const { Renderer, LayerManager, Inspector, BatchManager, AppState } = core();
    Renderer?.render?.();
    LayerManager?.render?.();
    Inspector?.render?.();
    if (!AppState?.batchMode || !BatchManager) return;
    // B 系有逐張刷新縮圖；A 系只有整批重畫（預覽是唯讀快照，重畫不會動到正式資料）。
    const index = BatchManager.indexOfTemplate?.(template) ?? -1;
    if (typeof BatchManager.refreshThumbsForIndexes === 'function' && index >= 0) {
      BatchManager.markThumbsStale?.([index]);
      BatchManager.refreshThumbsForIndexes([index]);
    } else {
      BatchManager.renderPreviewGrid?.({ revealWhenDone: true });
    }
  }

  function pickFileFor(key, layer, template) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT;
    input.hidden = true;
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (file) await replaceLayerAsset(key, layer, file, template);
    }, { once: true });
    input.addEventListener('cancel', () => input.remove(), { once: true });
    input.click();
  }

  // ── 畫布：點「已清除」的空槽選檔；把圖檔拖到任何圖片圖層上＝替換 ──
  function layerAt(event) {
    const { Geometry, LayerManager, AppState } = core();
    if (!Geometry?.mousePos || !LayerManager?.hitTest || !AppState?.template) return null;
    const key = LayerManager.hitTest(Geometry.mousePos(event));
    const layer = key ? AppState.template.layers?.[key] : null;
    return key && layer && layer.type === 'image' ? { key, layer } : null;
  }

  // 既有各分類自己的拖放／點擊補圖流程（network 上傳槽、LineOA UploadSlot、MS 待補圖框）優先，避免同一個動作被處理兩次。
  function handledByLegacyFlow(key, layer) {
    const { ManualAssetUpload, Interaction, AppState } = core();
    const flag = (name, fallback) => { const value = window.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };
    const mode = flag('interaction.dropUpload', 'none');
    if (mode === 'manualAssetUpload' && layer.__assetMissing && ManualAssetUpload.isUploadSlot(key, layer, AppState.template)) return true;
    if (mode === 'uploadSlot' && layer.__uploadSlot === true && !String(layer.assetFilename || '').trim()) return true;
    if (mode === 'manualProduct' && Interaction?.isManualUploadPlaceholder?.(layer)) return true;
    return false;
  }

  function bindCanvas(canvas) {
    if (!canvas || canvas.__manualAssetControlsBound) return;
    canvas.__manualAssetControlsBound = true;

    canvas.addEventListener('pointerdown', (event) => {
      if (!ready() || event.button !== 0) return;
      const hit = layerAt(event);
      if (!hit || hit.layer.__assetCleared !== true || String(hit.layer.assetFilename || '').trim()) return;
      if (handledByLegacyFlow(hit.key, hit.layer)) return;
      // 已清除的空槽：點一下就選檔，不進入拖曳。
      event.preventDefault();
      event.stopImmediatePropagation();
      core().LayerManager.select(hit.key);
      pickFileFor(hit.key, hit.layer, core().AppState.template);
    }, { capture: true });

    canvas.addEventListener('dragover', (event) => {
      if (!ready() || !event.dataTransfer?.types?.includes?.('Files')) return;
      const hit = layerAt(event);
      if (!hit || handledByLegacyFlow(hit.key, hit.layer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    canvas.addEventListener('drop', async (event) => {
      if (!ready()) return;
      const file = event.dataTransfer?.files?.[0];
      if (!isImageFile(file)) return;
      const hit = layerAt(event);
      if (!hit || handledByLegacyFlow(hit.key, hit.layer)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      core().LayerManager.select(hit.key);
      await replaceLayerAsset(hit.key, hit.layer, file, core().AppState.template);
    }, { capture: true });
  }

  // ── 鍵盤：選取圖片圖層後按 Delete／Backspace 清除（既有分類的 Delete 流程先處理，我們只補沒被處理的） ──
  function bindKeyboard() {
    window.addEventListener('keydown', async (event) => {
      if (!ready() || (event.key !== 'Delete' && event.key !== 'Backspace')) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const { key, layer, template } = activeSelection();
      const { ManualAssetUpload } = core();
      if (!key || !layer || layer.type !== 'image' || layer.locked) return;
      // 既有流程（interaction.deleteClearsUploadSlot）能處理的上傳槽交給它。
      if (ManualAssetUpload.canClear(key, layer, template)) return;
      if (!ManualAssetUpload.hasAsset(layer)) return;
      event.preventDefault();
      await clearLayerAsset(key, layer, template);
    });
  }

  function bindUI() {
    $('uploadAssetBtn')?.addEventListener('click', () => {
      const { key, layer, template } = activeSelection();
      if (key && layer) pickFileFor(key, layer, template);
    });
    $('clearAssetBtn')?.addEventListener('click', async () => {
      const { key, layer, template } = activeSelection();
      if (key && layer) await clearLayerAsset(key, layer, template);
    });
    bindKeyboard();
    const canvas = $('canvas') || document.querySelector('canvas#mainCanvas, canvas.main-canvas');
    if (canvas) bindCanvas(canvas);
  }

  window.ManualAssetControls = Object.freeze({ render, replaceLayerAsset, clearLayerAsset, pickFileFor });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bindUI, { once: true });
  else bindUI();
})();
