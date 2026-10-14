/* asset-review-modal — optional, transactional manual fit review.
 * Default OFF. A Rule must explicitly set reviewRequired / __reviewRequired.
 * Preview uses a working copy; Render is read-only. Only Confirm commits.
 */
(() => {
  'use strict';

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const reviewEnabled = (template) => template?.__reviewRequired === true
    || template?.reviewRequired === true
    || template?.smartAssetPolicy?.reviewRequired === true;

  function overwrite(target, source) {
    Object.keys(target || {}).forEach((key) => delete target[key]);
    Object.assign(target, clone(source));
  }

  const AssetReviewModal = {
    adjustmentCache: new Map(),

    async show(template) {
      if (!template || !reviewEnabled(template)) return;
      const layerKey = template.__reviewLayerKey;
      if (!layerKey || !template.layers?.[layerKey]) return;

      const working = clone(template);
      const guideKey = working.__reviewGuideKey;
      const layer = working.layers[layerKey];
      const guideLayer = guideKey ? working.layers?.[guideKey] : null;
      if (guideLayer) guideLayer.hidden = false;
      const images = await window.TemplateLoader?.loadImagesForTemplate?.(working, { project: working.batchProject || '' }) || {};

      return new Promise((resolve) => {
        window.__suspendBlobRevocation = true;
        const title = working.__reviewTitle || '素材貼合不太準，麻煩確認一下';
        const hint = working.__reviewHint || '拖曳照片可以移動，滑鼠滾輪可以等比例放大/縮小；確認後才會套用。';
        const confirmLabel = working.__reviewConfirmLabel || '確認，套用並繼續';
        const canvasW = Number(working.canvas?.width || 720);
        const canvasH = Number(working.canvas?.height || 720);
        const displaySize = Math.min(560, canvasW);
        const backdrop = document.createElement('div');
        backdrop.className = 'v3-modal-backdrop open';
        backdrop.innerHTML = `
          <div class="v3-modal" style="width:min(94vw, ${displaySize + 80}px);">
            <h3>${title}</h3><p>${hint}</p>
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
          const guideImg = guideKey ? images?.[guideKey] : null;
          const photoImg = images?.[layerKey];
          const iou = (guideImg && photoImg && window.TemplateRuleUtils?.computeFitIoU)
            ? window.TemplateRuleUtils.computeFitIoU({ layer, image: photoImg, guideImage: guideImg, canvasSize: canvasW })
            : null;
          scoreEl.textContent = iou == null ? '重疊度：無法計算' : `重疊度：${Math.round(iou * 100)}%`;
        };
        const redraw = () => {
          cctx.clearRect(0, 0, canvasW, canvasH);
          window.Renderer?.renderSceneTo?.(cctx, working, images, { readOnly: true });
          updateScore();
        };
        redraw();

        const toTemplateXY = (event) => {
          const rect = canvas.getBoundingClientRect();
          return { x: (event.clientX - rect.left) * scaleFactor, y: (event.clientY - rect.top) * scaleFactor };
        };
        let dragging = false;
        let dragStart = null;
        let layerStart = null;
        const onMove = (event) => {
          if (!dragging) return;
          const now = toTemplateXY(event);
          const dx = now.x - dragStart.x;
          const dy = now.y - dragStart.y;
          layer.x = layerStart.x + dx;
          layer.y = layerStart.y + dy;
          layer.centerX = layerStart.centerX + dx;
          layer.centerY = layerStart.centerY + dy;
          redraw();
        };
        const onUp = () => { dragging = false; canvas.style.cursor = 'grab'; };
        canvas.addEventListener('pointerdown', (event) => {
          dragging = true;
          canvas.style.cursor = 'grabbing';
          dragStart = toTemplateXY(event);
          layerStart = { x: Number(layer.x || 0), y: Number(layer.y || 0), centerX: Number(layer.centerX || 0), centerY: Number(layer.centerY || 0) };
          try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
        });
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        canvas.addEventListener('wheel', (event) => {
          event.preventDefault();
          const pivot = toTemplateXY(event);
          const factor = event.deltaY < 0 ? 1.05 : 1 / 1.05;
          const width = Number(layer.width || 1);
          const height = Number(layer.height || 1);
          const newWidth = Math.max(1, width * factor);
          const newHeight = Math.max(1, height * factor);
          const cx = Number(layer.centerX ?? (Number(layer.x || 0) + width / 2));
          const cy = Number(layer.centerY ?? (Number(layer.y || 0) + height / 2));
          const newCx = pivot.x + (cx - pivot.x) * factor;
          const newCy = pivot.y + (cy - pivot.y) * factor;
          Object.assign(layer, { width: newWidth, height: newHeight, x: newCx - newWidth / 2, y: newCy - newHeight / 2, centerX: newCx, centerY: newCy });
          redraw();
        }, { passive: false });

        const cleanup = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          window.__suspendBlobRevocation = false;
          backdrop.remove();
        };

        backdrop.querySelector('.asset-review-confirm').addEventListener('click', () => {
          const before = clone(template);
          if (guideLayer) guideLayer.hidden = true;
          overwrite(template, working);
          const materialKey = String(template.layers?.[layerKey]?.logicalAssetKey || template.layers?.[layerKey]?.assetFilename || '').normalize('NFKC').toLowerCase();
          if (materialKey) {
            const committed = template.layers[layerKey];
            AssetReviewModal.adjustmentCache.set(materialKey, {
              x: committed.x, y: committed.y, width: committed.width, height: committed.height,
              centerX: committed.centerX, centerY: committed.centerY, rotation: Number(committed.rotation || 0),
            });
          }
          const committedLayer = template.layers?.[layerKey];
          try {
            if (window.SmartAssetManager?.ownsLayer?.(layerKey, committedLayer, template)) {
              const assetId = window.SmartAssetManager.getAssetId?.(template);
              if (assetId && window.SmartAssetManager.isProduct?.(layerKey, committedLayer)) {
                window.SmartAssetManager.syncFromSource?.(assetId, template, layerKey, { sourceBefore: before, attachHistory: false });
              }
            } else {
              window.AssetSyncHub?.begin?.(template, layerKey, { attachHistory: false });
              window.AssetSyncHub?.update?.(template, layerKey);
              window.AssetSyncHub?.finish?.(template, layerKey);
            }
          } catch (error) {
            overwrite(template, before);
            console.error('[AssetReviewModal] 套用失敗，已還原', error);
          }
          cleanup();
          if (template === window.AppState?.template) window.Renderer?.render?.();
          resolve();
        });
      });
    },
  };

  window.AssetReviewModal = AssetReviewModal;
})();
