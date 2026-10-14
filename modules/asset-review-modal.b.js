/* asset-review-modal — 選用模組 · Asset Review Modal
 *
 * 用途：批次產圖過程中，遇到自動貼合結果需要使用者人工確認的素材（例如去背人像對不太準）
 * 時，跳出一個小 canvas 讓使用者拖曳/滾輪縮放後確認。確認結果會快取，之後同素材的
 * 其他版位直接套用、不再跳彈窗。
 *
 * 通用性：本模組不寫死任何圖層名稱，完全由 template 屬性驅動：
 *   template.__reviewLayerKey       — 必填，要調整的圖層 key
 *   template.__reviewGuideKey       — 選填，疊在上面的參考輪廓圖層 key
 *   template.__reviewTitle          — 選填，彈窗標題（預設中文）
 *   template.__reviewHint           — 選填，彈窗說明文字（預設中文）
 *   template.__reviewConfirmLabel   — 選填，確認按鈕文字（預設中文）
 *
 * 使用時機：rules 檔在圖層貼合完成後，如果 IoU 低於門檻，就把上述屬性寫到 template 上，
 * 然後在 BatchManager 產圖流程呼叫 await AssetReviewModal.show(template)。
 *
 * 快取存取：window.AssetReviewModal.adjustmentCache 是一個 Map<materialKey, snapshot>，
 * rules 檔可讀取此快取，遇到同素材時直接套用 snapshot、跳過本次確認。
 *
 * 依賴：core 的 AppState / Renderer / AssetSyncHub / TemplateRuleUtils (可選，用於算 IoU)
 */
(() => {
  'use strict';

  const AppState = window.AppState;
  const Renderer = window.Renderer;
  const AssetSyncHub = window.AssetSyncHub;

  const missing = [];
  if (!AppState) missing.push('AppState');
  if (!Renderer) missing.push('Renderer');
  if (!AssetSyncHub) missing.push('AssetSyncHub');
  if (missing.length) {
    console.warn('[asset-review-modal] 缺少 core 依賴：', missing.join(', '), '— 模組未載入');
    return;
  }

  const AssetReviewModal = {
    // 使用者手動調整過的素材版位快照：key = 素材檔名 normalized,
    // value = { x, y, width, height, centerX, centerY, rotation }
    // 供 rules 檔查快取（同素材第二次遇到時直接套用，跳過審核彈窗）。
    adjustmentCache: new Map(),

    show(template) {
      return new Promise((resolve) => {
        const layerKey = template.__reviewLayerKey;
        const guideKey = template.__reviewGuideKey;
        const layer = template.layers?.[layerKey];
        const guideLayer = template.layers?.[guideKey];
        if (!layer) { resolve(); return; }
        if (guideLayer) guideLayer.hidden = false;
        window.__suspendBlobRevocation = true;

        // 客製化文案（rules 可覆寫）
        const title = template.__reviewTitle || '素材貼合不太準，麻煩確認一下';
        const hint = template.__reviewHint || '拖曳照片可以移動，滑鼠滾輪可以等比例放大/縮小；跟灰色輪廓對準後按下面按鈕繼續。';
        const confirmLabel = template.__reviewConfirmLabel || '確認，套用並繼續';

        const canvasW = Number(template.canvas?.width || 720);
        const canvasH = Number(template.canvas?.height || 720);
        const displaySize = Math.min(560, canvasW);

        const backdrop = document.createElement('div');
        backdrop.className = 'v3-modal-backdrop open';
        backdrop.innerHTML = `
          <div class="v3-modal" style="width:min(94vw, ${displaySize + 80}px);">
            <h3>${title}</h3>
            <p>${hint}</p>
            <div style="display:flex;justify-content:center;">
              <canvas class="asset-review-canvas" width="${canvasW}" height="${canvasH}"
                style="width:${displaySize}px;height:${displaySize}px;border:1px solid #d1d5db;border-radius:8px;cursor:grab;touch-action:none;"></canvas>
            </div>
            <div style="text-align:center;margin-top:6px;color:#94a3b8;font-size:13px;" class="asset-review-score">重疊度：計算中...</div>
            <div class="v3-modal-actions" style="grid-template-columns:1fr;">
              <button type="button" class="primary-btn asset-review-confirm">${confirmLabel}</button>
            </div>
          </div>`;
        document.body.appendChild(backdrop);

        const canvas = backdrop.querySelector('.asset-review-canvas');
        const cctx = canvas.getContext('2d');
        const scoreEl = backdrop.querySelector('.asset-review-score');
        const scaleFactor = canvasW / displaySize;

        const updateScore = () => {
          const guideImg = guideKey ? AppState.images?.[guideKey] : null;
          const photoImg = AppState.images?.[layerKey];
          const iou = (guideImg && photoImg && window.TemplateRuleUtils?.computeFitIoU)
            ? window.TemplateRuleUtils.computeFitIoU({ layer, image: photoImg, guideImage: guideImg, canvasSize: canvasW })
            : null;
          scoreEl.textContent = iou === null ? '重疊度：無法計算' : `重疊度：${Math.round(iou * 100)}%`;
        };

        const redraw = () => {
          cctx.clearRect(0, 0, canvasW, canvasH);
          Renderer.renderSceneTo(cctx);
          updateScore();
        };
        redraw();

        // 把畫面座標（考慮 CSS 縮放）換算成公版原始座標。
        const toTemplateXY = (event) => {
          const rect = canvas.getBoundingClientRect();
          return {
            x: (event.clientX - rect.left) * scaleFactor,
            y: (event.clientY - rect.top) * scaleFactor,
          };
        };

        let dragging = false;
        let dragStart = null;
        let layerStart = null;

        canvas.addEventListener('mousedown', (event) => {
          dragging = true;
          canvas.style.cursor = 'grabbing';
          dragStart = toTemplateXY(event);
          layerStart = { x: layer.x, y: layer.y, centerX: layer.centerX, centerY: layer.centerY };
        });
        window.addEventListener('mousemove', (event) => {
          if (!dragging) return;
          const now = toTemplateXY(event);
          const dx = now.x - dragStart.x;
          const dy = now.y - dragStart.y;
          layer.x = layerStart.x + dx;
          layer.y = layerStart.y + dy;
          layer.centerX = layerStart.centerX + dx;
          layer.centerY = layerStart.centerY + dy;
          redraw();
        });
        window.addEventListener('mouseup', () => {
          if (!dragging) return;
          dragging = false;
          canvas.style.cursor = 'grab';
        });
        canvas.addEventListener('wheel', (event) => {
          event.preventDefault();
          const pivot = toTemplateXY(event);
          const factor = event.deltaY < 0 ? 1.05 : 1 / 1.05;
          const width = Number(layer.width || 0);
          const height = Number(layer.height || 0);
          const newWidth = width * factor;
          const newHeight = height * factor;
          // 以滑鼠游標為中心縮放，而不是以圖層中心，這樣使用者盯著哪裡調整、哪裡就不會跑掉。
          const cx = Number(layer.centerX || 0);
          const cy = Number(layer.centerY || 0);
          const newCx = pivot.x + (cx - pivot.x) * factor;
          const newCy = pivot.y + (cy - pivot.y) * factor;
          layer.width = newWidth;
          layer.height = newHeight;
          layer.x = newCx - newWidth / 2;
          layer.y = newCy - newHeight / 2;
          layer.centerX = newCx;
          layer.centerY = newCy;
          redraw();
        }, { passive: false });

        backdrop.querySelector('.asset-review-confirm').addEventListener('click', () => {
          // 記錄使用者手動調整的結果，之後同素材的其他生成物直接套用、跳過審核彈窗。
          // Key 用 normalized 過的素材檔名，跟 rules 檔查快取的邏輯保持一致。
          const materialKey = String(layer.assetFilename || '').trim().normalize('NFKC').toLowerCase();
          if (materialKey) {
            const snapshot = {
              x: layer.x, y: layer.y, width: layer.width, height: layer.height,
              centerX: layer.centerX, centerY: layer.centerY, rotation: Number(layer.rotation || 0),
            };
            AssetReviewModal.adjustmentCache.set(materialKey, snapshot);
            // 這張的預設版位快照也一併更新，供 SingleSizeAssetSync 的「還原成預設版位」使用。
            // 欄位名對齊 SingleSizeAssetSync.config.defaultBoxKey (預設 '__defaultBox')。
            const defaultBoxKey = window.SingleSizeAssetSync?.config?.defaultBoxKey || '__defaultBox';
            template[defaultBoxKey] = { ...snapshot };
            // 順便同步到批次中所有同素材的其他版位。
            // 透過 AssetSyncHub 統一觸發，兩種 sync 引擎都會收到。
            AssetSyncHub.begin(template, layerKey);
            AssetSyncHub.update(template, layerKey);
            AssetSyncHub.finish(template, layerKey);
          }

          if (guideLayer) guideLayer.hidden = true;
          window.__suspendBlobRevocation = false;
          document.body.removeChild(backdrop);
          Renderer.render();
          resolve();
        });
      });
    },
  };


  window.AssetReviewModal = AssetReviewModal;
})();
