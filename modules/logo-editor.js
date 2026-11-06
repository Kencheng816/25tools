/* 整合版（自 18節 移植，2026-11-06）— 「編輯 LOGO」視窗（2026-11-02 封測第二輪，做法比照 Circle 的 logo2-editor.js）
 *
 * 在「調整」面板的品牌 LOGO 區按「編輯 LOGO」：
 *   - 視窗裡一塊工作畫布（比例＝這個 LOGO 圖層的外框），素材放中間：滾輪縮放、拖曳移動；
 *   - 自動底色：PNG 一律白色、JPG 取原圖四角＋四邊中點共 8 個取樣點最常見的顏色；可改色、可「不加底色」（透明＋棋盤格示意）；
 *   - 固定圓角（短邊 6%）；「重新選圖」換素材、「重設」回到自動置中（有色範圍填 82%）；
 *   - 「確認套用」把畫面烤成一張 PNG，走 ManualAssetControls.replaceLayerAsset 放回 LOGO 圖層（跟手動上傳替換同一條路：
 *     History、手動覆寫記錄、縮圖刷新都一樣）；原素材（dataURL）與縮放位移存在圖層 logoEdit 欄位，跟存檔走、重開視窗可接續編。
 * 純加法、只有使用者按了才動，自動產圖與黃金不變。
 */
(function initLogoEditor() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const core = () => ({ AppState: window.AppState, ManualAssetControls: window.ManualAssetControls, AdjustPanel: window.AdjustPanel });
  const RADIUS_RATIO = 0.06;
  const INIT_FILL = 0.82;
  const WORK_MAX = 640;
  const SCALE_LIMITS = [0.05, 20];
  const FIXED_LOGO_WORDS = ['蝦皮', '會員日', 'kol代播', 'shopee'];

  let state = null; // { key, layer, template, img, sourceDataUrl, scale, offX, offY, bgColor, fill, dim, pointer }

  // ── 工具 ──

  function dataUrlOfImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  const loadImage = (src) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('圖片讀不到')); img.src = src; });
  const fileToDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });

  /** 有色範圍（alpha > 10）在原圖座標的外框；全透明回 null。 */
  function tightBounds(img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    let data;
    try { data = ctx.getImageData(0, 0, w, h).data; } catch (_) { return null; }
    const step = Math.max(1, Math.floor(Math.max(w, h) / 900));
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 10) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    return maxX < 0 ? null : { x: minX, y: minY, width: Math.max(1, maxX - minX + 1), height: Math.max(1, maxY - minY + 1) };
  }

  /** 底色：PNG 固定白；其他格式取原圖四角＋四邊中點最常見的顏色。 */
  function sampleBgColor(img, dataUrl) {
    if (/^data:image\/png/i.test(dataUrl)) return '#ffffff';
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const points = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2], [w >> 1, 1], [w >> 1, h - 2], [1, h >> 1], [w - 2, h >> 1]];
      const counts = new Map();
      points.forEach(([x, y]) => {
        const d = ctx.getImageData(Math.max(0, Math.min(w - 1, x)), Math.max(0, Math.min(h - 1, y)), 1, 1).data;
        if (d[3] < 200) return;
        const key = `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      let best = '#ffffff', bestCount = 0;
      counts.forEach((count, key) => { if (count > bestCount) { bestCount = count; best = key; } });
      return best;
    } catch (_) { return '#ffffff'; }
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawChecker(ctx, w, h) {
    const cell = 12;
    for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) { ctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#e3e3e3' : '#f6f6f6'; ctx.fillRect(x, y, cell, cell); }
  }

  // ── 目標圖層 ──

  function pickLogoKey(template) {
    const { AdjustPanel } = core();
    const candidates = (AdjustPanel?.logoLayers?.(template) || []).filter(([key, layer]) => {
      const label = `${key} ${layer.psdName || ''}`.toLowerCase();
      return !FIXED_LOGO_WORDS.some((word) => label.includes(word.toLowerCase()));
    });
    const select = $('logoEditTarget');
    if (select) {
      select.innerHTML = candidates.map(([key, layer]) => `<option value="${key}">${layer.psdName || key}</option>`).join('');
      select.classList.toggle('hidden', candidates.length <= 1);
    }
    const preferred = candidates.find(([key]) => key.toLowerCase() === 'logo') || candidates[0];
    if (select && preferred && !candidates.some(([key]) => key === select.value)) select.value = preferred[0];
    return select?.value || preferred?.[0] || '';
  }

  // ── 視窗 ──

  function ensureModal() {
    if ($('logoEditorModal')) return;
    const modal = document.createElement('div');
    modal.id = 'logoEditorModal';
    modal.className = 'logo-editor-modal hidden';
    modal.innerHTML = `
      <div class="logo-editor-panel" role="dialog" aria-label="編輯 LOGO">
        <div class="logo-editor-head"><strong>編輯 LOGO</strong><span id="logoEditorLayerName" class="logo-editor-sub"></span><button type="button" id="logoEditorClose" class="logo-editor-x" title="關閉">×</button></div>
        <div class="logo-editor-body">
          <div class="logo-editor-side">
            <label class="logo-editor-row"><span>底色</span><input id="logoEditorBg" type="color" value="#ffffff" /></label>
            <label class="logo-editor-row"><input id="logoEditorFill" type="checkbox" /> 不加底色（透明、不裁圓角）</label>
            <label class="logo-editor-row"><span>縮放</span><input id="logoEditorScale" type="range" min="10" max="400" step="1" value="100" /><span id="logoEditorScaleValue">100%</span></label>
            <div class="logo-editor-actions">
              <button type="button" id="logoEditorPick" class="secondary-btn">重新選圖</button>
              <button type="button" id="logoEditorReset" class="secondary-btn">重設位置</button>
            </div>
            <input id="logoEditorFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden />
            <p class="logo-editor-hint">滾輪縮放、拖曳移動。PNG 預設白底；JPG 自動取原圖邊緣顏色當底色。確認後會烤成一張圖放回 LOGO 圖層，之後要改再開這個視窗。</p>
          </div>
          <div class="logo-editor-stage"><canvas id="logoEditorCanvas"></canvas></div>
        </div>
        <div class="logo-editor-foot"><button type="button" id="logoEditorCancel" class="secondary-btn">取消</button><button type="button" id="logoEditorApply" class="primary-btn">確認套用</button></div>
      </div>`;
    document.body.appendChild(modal);

    $('logoEditorClose').addEventListener('click', close);
    $('logoEditorCancel').addEventListener('click', close);
    $('logoEditorApply').addEventListener('click', apply);
    $('logoEditorBg').addEventListener('input', (e) => { if (state) { state.bgColor = e.target.value; draw(); } });
    $('logoEditorFill').addEventListener('change', (e) => { if (state) { state.fill = e.target.checked; draw(); } });
    $('logoEditorScale').addEventListener('input', (e) => { if (state) { state.scale = state.baseScale * Number(e.target.value) / 100; draw(); } });
    $('logoEditorReset').addEventListener('click', () => { if (state) { initFit(); draw(); } });
    $('logoEditorPick').addEventListener('click', () => $('logoEditorFile').click());
    $('logoEditorFile').addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; e.target.value = '';
      if (!file || !state) return;
      try { await loadSource(await fileToDataUrl(file)); initFit(); state.bgColor = sampleBgColor(state.img, state.sourceDataUrl); $('logoEditorBg').value = state.bgColor; draw(); }
      catch (error) { alert(`圖片讀不到：${error.message}`); }
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    const canvas = $('logoEditorCanvas');
    canvas.addEventListener('wheel', (e) => { if (!state) return; e.preventDefault(); const factor = Math.exp(-e.deltaY * 0.0015); state.scale = clampScale(state.scale * factor); syncScaleSlider(); draw(); }, { passive: false });
    canvas.addEventListener('pointerdown', (e) => { if (!state) return; e.preventDefault(); canvas.setPointerCapture(e.pointerId); state.pointer = { x: e.clientX, y: e.clientY, offX: state.offX, offY: state.offY }; });
    canvas.addEventListener('pointermove', (e) => { if (!state?.pointer) return; const ratio = state.dim.w / canvas.getBoundingClientRect().width; state.offX = state.pointer.offX + (e.clientX - state.pointer.x) * ratio; state.offY = state.pointer.offY + (e.clientY - state.pointer.y) * ratio; draw(); });
    ['pointerup', 'pointercancel'].forEach((type) => canvas.addEventListener(type, () => { if (state) state.pointer = null; }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state) close(); });
  }

  const clampScale = (value) => Math.max(SCALE_LIMITS[0], Math.min(SCALE_LIMITS[1], value));
  function syncScaleSlider() { if (!state) return; const pct = Math.round(state.scale / state.baseScale * 100); $('logoEditorScale').value = Math.max(10, Math.min(400, pct)); $('logoEditorScaleValue').textContent = `${pct}%`; }

  async function loadSource(dataUrl) {
    state.sourceDataUrl = dataUrl;
    state.img = await loadImage(dataUrl);
    state.tight = tightBounds(state.img);
  }

  /** 初始：有色範圍填工作畫布的 82%、置中。 */
  function initFit() {
    const { dim, img, tight } = state;
    const tw = tight ? tight.width : img.naturalWidth; const th = tight ? tight.height : img.naturalHeight;
    state.baseScale = Math.min(dim.w * INIT_FILL / tw, dim.h * INIT_FILL / th);
    state.scale = state.baseScale; state.offX = 0; state.offY = 0;
    syncScaleSlider();
  }

  function compose(canvas, forDisplay) {
    const { dim, img, scale, offX, offY, bgColor, fill, tight } = state;
    canvas.width = dim.w; canvas.height = dim.h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, dim.w, dim.h);
    const r = Math.min(dim.w, dim.h) * RADIUS_RATIO;
    ctx.save();
    if (!fill) { roundRectPath(ctx, 0, 0, dim.w, dim.h, r); ctx.clip(); ctx.fillStyle = bgColor || '#ffffff'; ctx.fillRect(0, 0, dim.w, dim.h); }
    else if (forDisplay) drawChecker(ctx, dim.w, dim.h);
    if (img) {
      // 以有色範圍的中心當置中基準（素材四周透明留白常不對稱）
      const cx = tight ? tight.x + tight.width / 2 : img.naturalWidth / 2;
      const cy = tight ? tight.y + tight.height / 2 : img.naturalHeight / 2;
      ctx.drawImage(img, dim.w / 2 + offX - cx * scale, dim.h / 2 + offY - cy * scale, img.naturalWidth * scale, img.naturalHeight * scale);
    }
    ctx.restore();
    if (forDisplay) { ctx.save(); if (!fill) roundRectPath(ctx, 0.5, 0.5, dim.w - 1, dim.h - 1, r); else ctx.rect(0.5, 0.5, dim.w - 1, dim.h - 1); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
  }

  function draw() { if (state) compose($('logoEditorCanvas'), true); }

  function workDim(layer) {
    const w = Math.max(1, Number(layer.width) || 1); const h = Math.max(1, Number(layer.height) || 1);
    const k = WORK_MAX / Math.max(w, h);
    return { w: Math.round(w * k), h: Math.round(h * k) };
  }

  // ── 開／關／套用 ──

  async function open(key) {
    const { AppState } = core();
    const template = AppState?.template;
    const targetKey = key || pickLogoKey(template);
    const layer = template?.layers?.[targetKey];
    if (!layer) { alert('這張公版沒有可編輯的 LOGO 圖層'); return; }
    ensureModal();
    state = { key: targetKey, layer, template, dim: workDim(layer), scale: 1, baseScale: 1, offX: 0, offY: 0, bgColor: '#ffffff', fill: false, pointer: null };
    $('logoEditorLayerName').textContent = layer.psdName || targetKey;
    try {
      const saved = layer.logoEdit;
      if (saved?.sourceDataUrl) {
        await loadSource(saved.sourceDataUrl);
        initFit();
        Object.assign(state, { scale: Number(saved.scale) || state.scale, offX: Number(saved.offX) || 0, offY: Number(saved.offY) || 0, bgColor: saved.bgColor || '#ffffff', fill: saved.fill === true });
      } else {
        const img = AppState.images?.[targetKey];
        if (!img?.naturalWidth) throw new Error('這一層目前沒有圖片，請先用「重新選圖」挑一張');
        await loadSource(dataUrlOfImage(img));
        initFit();
        state.bgColor = sampleBgColor(state.img, state.sourceDataUrl);
      }
    } catch (error) {
      state.img = null; state.tight = null;
      window.showToast?.(error.message) || console.warn(error);
    }
    $('logoEditorBg').value = state.bgColor; $('logoEditorFill').checked = state.fill; syncScaleSlider();
    $('logoEditorModal').classList.remove('hidden');
    draw();
  }

  function close() { state = null; $('logoEditorModal')?.classList.add('hidden'); }

  async function apply() {
    if (!state?.img) { alert('還沒有圖片'); return; }
    const { ManualAssetControls } = core();
    const { key, layer, template } = state;
    const canvas = document.createElement('canvas');
    compose(canvas, false);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) { alert('合成失敗'); return; }
    const stem = String(layer.assetFilename || key).split('/').pop().replace(/\.[a-z0-9]+$/i, '') || key;
    const file = new File([blob], `${stem}_logo-edit.png`, { type: 'image/png' });
    const edit = { sourceDataUrl: state.sourceDataUrl, scale: state.scale, offX: state.offX, offY: state.offY, bgColor: state.bgColor, fill: state.fill, dim: state.dim };
    const ok = await ManualAssetControls?.replaceLayerAsset?.(key, layer, file, template);
    if (ok) { layer.logoEdit = edit; window.showToast?.('LOGO 已套用'); }
    else alert('套用失敗：這一層不能手動替換');
    close();
  }

  function bindPanel() {
    const button = $('editLogoBtn');
    if (!button) return;
    button.disabled = false; button.title = '縮放、位移、底色、圓角，確認後烤成一張圖放回 LOGO 圖層';
    button.addEventListener('click', () => open());
    $('logoEditTarget')?.addEventListener('change', () => {});
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(bindPanel); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.LogoEditor = Object.freeze({ open, close, pickLogoKey });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
