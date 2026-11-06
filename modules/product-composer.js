/* 整合版（自 18節 移植，2026-11-06）— 「編輯商品」商品合成視窗（18節 2026-11-02 封測第二輪；25節 封測 P0-2／P0-4）
 *
 * 做法比照 Circle 編輯器的「調整商品／人物」視窗，底層直接用 Circle 的三支檔案（vendor/circle/，逐 byte 相同）：
 *   shadow-layout-receiver.js  拖曳／拉角縮放／旋轉把手／對齊參考線與吸附／多選群組／Ctrl+Z
 *   shadow-plugin.js           貼地陰影（光源角度 左／中／右）
 *   erase-editor.js            去背（橡皮擦／裁切／自動去背／點色去背）
 * 這支只負責：把目前製作物的商品圖層（含「A + B」拆出來的多張）變成視窗裡的素材、畫公版背景當底、
 * 「組合」預設（並排／一大一小／三角，與 modules/multi-product.js 共用同一套格子）、陰影開關，
 * 以及「確認並套用」：把素材＋陰影烤成一張 PNG（裁到內容外框），放回第一個商品圖層（走手動上傳替換同一條路，
 * 價格錨點跟著新外框），其餘複製層移除；原素材（dataURL）、位置、組合、陰影設定存在圖層 productCompose，跟存檔走、重開可接續。
 * 匯入工單產圖後（importflow:generated），有 ≥2 張商品的製作物會自動逐張開這個視窗確認。
 * 三支 vendor 檔只在第一次開視窗時才載入，自動產圖與黃金回歸完全不碰。
 */
(function initProductComposer() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const core = () => ({ AppState: window.AppState, BatchManager: window.BatchManager, Renderer: window.Renderer, LayerManager: window.LayerManager, Inspector: window.Inspector, ManualAssetControls: window.ManualAssetControls, MultiProduct: window.MultiProduct, HistoryManager: window.HistoryManager, Geometry: window.Geometry });
  const VENDOR = ['vendor/circle/shadow-plugin.js', 'vendor/circle/shadow-layout-receiver.js', 'vendor/circle/erase-editor.js'];
  const SCALE_MAX_EDGE = 2400;
  const PRESET_LABELS = { row: '平均並排', pair: '一大一小', triangle: '三角（中大兩小）' };
  const ANGLE_LABELS = { left: '左', top: '中', right: '右' };

  let vendorReady = null;
  let receiver = null;
  let state = null; // { template, key, items:[{id,name,src,img}], preset, shadow, angle, scale, bg, queue }

  // ── vendor 載入（只在第一次開視窗時） ──

  function loadScript(src) {
    return new Promise((resolve, reject) => { const el = document.createElement('script'); el.src = src; el.onload = resolve; el.onerror = () => reject(new Error(`載入失敗：${src}`)); document.head.appendChild(el); });
  }
  async function ensureVendor() {
    if (!vendorReady) vendorReady = (async () => { for (const src of VENDOR) await loadScript(src); })().catch((error) => { vendorReady = null; throw error; });
    await vendorReady;
  }

  // ── 工具 ──

  const loadImage = (src) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('圖片讀不到')); img.src = src; });
  const fileToDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
  function imageToDataUrl(img) { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); return c.toDataURL('image/png'); }

  function productKeys(template) {
    const { MultiProduct } = core();
    const base = MultiProduct?.productLayerKeys?.(template) || [];
    const key = base[0];
    if (!key) return [];
    const clones = Object.keys(template.layers).filter((k) => template.layers[k]?.__multiProductOf === key);
    return [key, ...clones];
  }

  function productBox(template, key) {
    const { BatchManager } = core();
    const saved = template.__multiProduct?.[key]?.box;
    if (saved) return saved;
    const rule = BatchManager.resolveTemplateProductImageRule?.(template);
    return core().MultiProduct.normalizeBox(rule?.productImageBox || BatchManager.getProductImageBoxFromLayer(template.layers[key])) || { x: 0, y: 0, width: template.canvas.width, height: template.canvas.height };
  }

  /** 公版背景（商品圖層先藏起來）畫成一張圖，當視窗底圖＋陰影取色用。 */
  function renderBackground(template, keys) {
    const { Renderer, AppState } = core();
    const canvas = document.createElement('canvas');
    canvas.width = template.canvas.width; canvas.height = template.canvas.height;
    const hidden = keys.map((k) => [k, template.layers[k].hidden]);
    try {
      keys.forEach((k) => { template.layers[k].hidden = true; });
      Renderer.renderSceneTo(canvas.getContext('2d'), template, AppState.images);
    } finally { hidden.forEach(([k, value]) => { template.layers[k].hidden = value; }); }
    return canvas;
  }

  // ── 視窗 DOM ──

  function ensureModal() {
    if ($('productComposerModal')) return;
    const modal = document.createElement('div');
    modal.id = 'productComposerModal';
    modal.className = 'composer-modal hidden';
    modal.innerHTML = `
      <div class="composer-panel" role="dialog" aria-label="編輯商品">
        <div class="composer-head"><strong>編輯商品</strong><span id="composerItemName" class="composer-sub"></span><span id="composerQueueHint" class="composer-queue hidden"></span><button type="button" id="composerClose" class="composer-x" title="關閉">×</button></div>
        <div class="composer-body">
          <div class="composer-side">
            <label class="composer-row"><span>組合</span><select id="composerPreset" class="word-select"></select></label>
            <label class="composer-row"><input id="composerShadow" type="checkbox" checked /> 陰影</label>
            <div class="composer-row"><span>光源</span><div id="composerAngle" class="composer-seg"></div></div>
            <div class="adjust-section-title">素材清單</div>
            <div id="composerItems" class="composer-items"></div>
            <input id="composerFile" type="file" accept="image/png,image/jpeg,image/webp" hidden />
            <p class="composer-hint">拖曳移動；拉角落縮放；選取單一素材時上方有旋轉把手（靠近 0°/45°/90° 會自動吸附；雙擊歸零）；拖到畫布正中間會自動吸附；多選（Shift／Ctrl 點選）可整組拖曳／縮放；Ctrl+Z 復原。確認後會烤成一張圖放回商品圖層。</p>
          </div>
          <div class="composer-stage"><canvas id="composerCanvas"></canvas></div>
        </div>
        <div class="composer-foot"><button type="button" id="composerSkip" class="secondary-btn hidden">這張先不動</button><button type="button" id="composerCancel" class="secondary-btn">取消</button><button type="button" id="composerApply" class="primary-btn">確認並套用</button></div>
      </div>`;
    document.body.appendChild(modal);

    $('composerClose').addEventListener('click', () => close(true));
    $('composerCancel').addEventListener('click', () => close(true));
    $('composerSkip').addEventListener('click', () => close(true));
    $('composerApply').addEventListener('click', apply);
    $('composerPreset').addEventListener('change', (e) => { if (state) { state.preset = e.target.value; placeAll(true); } });
    $('composerShadow').addEventListener('change', (e) => { if (state) { state.shadow = e.target.checked; redraw(); } });
    $('composerFile').addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; const id = e.target.dataset.itemId; e.target.value = '';
      const item = state?.items.find((it) => it.id === id);
      if (!file || !item) return;
      try { await replaceItemSource(item, await fileToDataUrl(file)); } catch (error) { alert(`圖片讀不到：${error.message}`); }
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(true); });

    // 視窗沒開時擋掉 vendor 的全域 Ctrl+Z（它會 preventDefault，會吃掉主畫面的復原）
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || String(e.key).toLowerCase() !== 'z') return;
      if (!state) e.stopImmediatePropagation();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state && !document.getElementById('skbnEraseEditor')?.classList.contains('open')) close(true); });
  }

  function renderAngleButtons() {
    const box = $('composerAngle');
    box.innerHTML = '';
    Object.entries(ANGLE_LABELS).forEach(([preset, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = label; btn.classList.toggle('active', state.angle === preset);
      btn.addEventListener('click', () => { state.angle = preset; receiver.handleMessage({ type: 'LC_SET_ANGLE', preset }, redraw); renderAngleButtons(); });
      box.appendChild(btn);
    });
  }

  /** 素材清單：由上而下＝由前到後（最上面壓在最上層）；▲▼ 調整順序，順序跟著存進 productCompose。 */
  function renderItemList() {
    const box = $('composerItems');
    box.innerHTML = '';
    const byId = Object.fromEntries(state.items.map((it) => [it.id, it]));
    state.order.forEach((id, position) => {
      const item = byId[id];
      if (!item) return;
      const row = document.createElement('div');
      row.className = 'composer-item';
      const thumb = document.createElement('img'); thumb.src = item.src; thumb.alt = '';
      const name = document.createElement('span'); name.className = 'composer-item-name'; name.textContent = item.name; name.title = item.name;
      const up = document.createElement('button'); up.type = 'button'; up.className = 'composer-mini'; up.textContent = '▲'; up.title = '往前（往上一層）'; up.disabled = position === 0;
      up.addEventListener('click', () => moveOrder(id, -1));
      const down = document.createElement('button'); down.type = 'button'; down.className = 'composer-mini'; down.textContent = '▼'; down.title = '往後（往下一層）'; down.disabled = position === state.order.length - 1;
      down.addEventListener('click', () => moveOrder(id, 1));
      const erase = document.createElement('button'); erase.type = 'button'; erase.className = 'composer-mini'; erase.textContent = '去背';
      erase.addEventListener('click', () => openErase(item));
      const swap = document.createElement('button'); swap.type = 'button'; swap.className = 'composer-mini'; swap.textContent = '換圖';
      swap.addEventListener('click', () => { const input = $('composerFile'); input.dataset.itemId = item.id; input.click(); });
      row.append(thumb, name, up, down, erase, swap);
      row.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') { receiver.setSelectedSlots([item.id], redraw); } });
      box.appendChild(row);
    });
  }

  function moveOrder(id, delta) {
    const at = state.order.indexOf(id);
    const to = at + delta;
    if (at < 0 || to < 0 || to >= state.order.length) return;
    state.order.splice(at, 1); state.order.splice(to, 0, id);
    placeOrder(); renderItemList();
  }

  /** 預設疊放（使用者 2026-11-03 決定）：圖層由上而下 左→右→中——主商品（第 1 張）在最下面、其餘依序往上。 */
  const defaultOrder = (items) => [...items.slice(1).map((it) => it.id), items[0].id];

  function renderPresetSelect() {
    const select = $('composerPreset');
    const n = state.items.length;
    const options = n <= 1 ? ['row'] : n === 2 ? ['pair', 'row'] : ['triangle', 'row'];
    select.innerHTML = options.map((p) => `<option value="${p}">${PRESET_LABELS[p]}</option>`).join('');
    if (!options.includes(state.preset)) state.preset = options[0];
    select.value = state.preset;
    select.disabled = n <= 1;
  }

  // ── 素材 ──

  function slotTransform(item, slot) {
    const img = item.img;
    const k = Math.min(slot.width / img.naturalWidth, slot.height / img.naturalHeight);
    const w0 = img.naturalWidth * k; const h0 = img.naturalHeight * k;
    return { x: slot.centerX, y: slot.y + slot.height, w0, h0, scaleMul: 1, rot: 0 };
  }

  /** 依目前組合把每張放到預設格子（reset=true 連使用者調過的也重排）。 */
  function placeAll(reset) {
    const { MultiProduct } = core();
    const box = state.box;
    const scaled = { x: box.x * state.scale, y: box.y * state.scale, width: box.width * state.scale, height: box.height * state.scale };
    const slots = MultiProduct.layoutSlots(scaled, state.items.length, state.preset);
    state.items.forEach((item, index) => {
      const transform = (!reset && item.saved) ? item.saved : slotTransform(item, slots[index]);
      if (reset) { receiver.handleMessage({ type: 'LC_REMOVE_SLOT', slotId: item.id }); }
      receiver.handleMessage({ type: 'LC_UPSERT_SLOT', slotId: item.id, slotType: 'product', dataUrl: item.src, transform }, redraw);
    });
    placeOrder();
  }

  async function replaceItemSource(item, dataUrl) {
    const saved = receiver.getSlotRaw(item.id);
    item.src = dataUrl; item.img = await loadImage(dataUrl);
    receiver.handleMessage({ type: 'LC_REMOVE_SLOT', slotId: item.id });
    receiver.handleMessage({ type: 'LC_UPSERT_SLOT', slotId: item.id, slotType: 'product', dataUrl, transform: saved ? { ...saved, w0: saved.w0, h0: saved.h0 } : undefined }, redraw);
    placeOrder();
    renderItemList();
  }
  /** receiver 的陣列是「前面＝後方」，清單是「上面＝前面」，所以反過來送。 */
  function placeOrder() { receiver.handleMessage({ type: 'LC_SET_ENABLED', ids: [...state.order].reverse() }, redraw); }

  function openErase(item) {
    window.SkbnEraseEditor?.open(item.src, { title: `去背：${item.name}`, onApply: (result) => { replaceItemSource(item, result.dataUrl).catch((error) => alert(error.message)); } });
  }

  // ── 畫 ──

  function redraw() {
    if (!state || !receiver) return;
    const canvas = $('composerCanvas'); const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.bg, 0, 0, canvas.width, canvas.height);
    // P 框（虛線）提醒自動排版的範圍
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(90,184,255,.55)'; ctx.lineWidth = 2;
    ctx.strokeRect(state.box.x * state.scale, state.box.y * state.scale, state.box.width * state.scale, state.box.height * state.scale); ctx.restore();
    drawItems(ctx, false);
  }

  function drawItems(ctx, forExport) {
    if (state.shadow) receiver.drawItems(ctx, forExport ? { skipSelection: true } : undefined);
    else {
      window.ShadowPlugin.renderPhotosOnly(ctx, receiver.getOrderedStates());
      if (!forExport) receiver.drawItems(ctx, { onlyIds: [] }); // 只畫選取框／參考線
    }
  }

  // ── 開／關／套用 ──

  async function open(options = {}) {
    const { AppState, BatchManager } = core();
    const template = AppState?.template;
    if (!template?.layers) { alert('先選一張製作物'); return; }
    const keys = productKeys(template);
    if (!keys.length) { alert('這張公版沒有商品圖層'); return; }
    try { await ensureVendor(); } catch (error) { alert(error.message); return; }
    ensureModal();

    const key = keys[0];
    const base = template.layers[key];
    const saved = base.productCompose;
    const canvasW = template.canvas.width; const canvasH = template.canvas.height;
    const scale = Math.min(2, SCALE_MAX_EDGE / Math.max(canvasW, canvasH));
    const names = template.__multiProduct?.[key]?.parts || [];

    let items;
    if (saved?.items?.length) {
      items = await Promise.all(saved.items.map(async (it, i) => ({ id: `item${i}`, name: it.name, src: it.src, img: await loadImage(it.src), saved: it.transform ? scaleTransform(it.transform, scale / (saved.scale || 1)) : null })));
    } else {
      items = [];
      for (let i = 0; i < keys.length; i += 1) {
        const img = AppState.images?.[keys[i]];
        if (!img?.naturalWidth) continue;
        const src = imageToDataUrl(img);
        // 名字＝工單上的商品名；單一商品沒有拆名就用素材檔名（券面定義、價格跟券都靠名字認「券」）
        const assetStem = String(template.layers[keys[i]].assetFilename || '').split(/[\\/]/).pop().replace(/^\d{10,}_/, '').replace(/\.[^.]+$/, '').replace(/_compose$/, '');
        items.push({ id: `item${i}`, name: names[i] || assetStem || template.layers[keys[i]].psdName || keys[i], src, img: await loadImage(src), saved: null });
      }
      if (!items.length) { alert('商品圖還沒載入，請稍候再試'); return; }
    }

    state = {
      template, key, keys, items, scale,
      box: productBox(template, key),
      preset: saved?.preset || template.__multiProduct?.[key]?.preset || core().MultiProduct.defaultPreset(items.length),
      shadow: saved ? saved.shadow !== false : true,
      angle: saved?.angle || 'left',
      bg: null,
      queue: options.queue || null,
      order: null,
    };
    const ids = new Set(items.map((it) => it.id));
    state.order = Array.isArray(saved?.order) && saved.order.length === items.length && saved.order.every((id) => ids.has(id)) ? [...saved.order] : defaultOrder(items);
    state.bg = renderBackground(template, keys);

    const canvas = $('composerCanvas');
    canvas.width = Math.round(canvasW * scale); canvas.height = Math.round(canvasH * scale);
    if (!receiver) { receiver = window.ShadowLayoutReceiver.create(canvas, { stageId: '__25tool', guides: true }); receiver.attachPointerEvents(redraw); bindWheel(canvas); }
    else { state.items.forEach((it) => receiver.handleMessage({ type: 'LC_REMOVE_SLOT', slotId: it.id })); for (let i = 0; i < 10; i += 1) receiver.handleMessage({ type: 'LC_REMOVE_SLOT', slotId: `item${i}` }); }
    receiver.handleMessage({ type: 'LC_SET_BG', dataUrl: state.bg.toDataURL('image/png') });
    receiver.handleMessage({ type: 'LC_SET_ANGLE', preset: state.angle });

    $('composerItemName').textContent = AppState.templates?.[AppState.activeIndex]?.name || template.templateId || '';
    $('composerShadow').checked = state.shadow;
    renderPresetSelect(); renderAngleButtons(); renderItemList();
    const hint = $('composerQueueHint'); const skip = $('composerSkip');
    hint.classList.toggle('hidden', !state.queue?.length); skip.classList.toggle('hidden', !state.queue);
    if (state.queue?.length) hint.textContent = `還有 ${state.queue.length} 張有多個商品，確認後會接著開`;
    $('productComposerModal').classList.remove('hidden');
    placeAll(false);
    // 圖片在 receiver 內是非同步載入，稍後再畫一次確保顯示；疊放順序也再送一次保險
    setTimeout(redraw, 150); setTimeout(() => { if (state) { placeOrder(); redraw(); } }, 600);
  }

  // ── 滾輪：只縮放「選取中」的那一張（游標要在它的範圍內；沒選到就不動） ──
  let wheelPending = null;
  function bindWheel(canvas) {
    canvas.addEventListener('wheel', (e) => {
      if (!state || !receiver) return;
      const selected = receiver.getSelectedSlots();
      if (selected.length !== 1) return;
      const id = selected[0];
      const item = receiver.getOrderedStates().find((st) => st.id === id);
      if (!item) return;
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) * canvas.width / rect.width; const py = (e.clientY - rect.top) * canvas.height / rect.height;
      if (px < item.x - item.w / 2 || px > item.x + item.w / 2 || py < item.y - item.h || py > item.y) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0012);
      wheelPending = { id, factor: (wheelPending?.id === id ? wheelPending.factor : 1) * factor };
      if (!wheelPending.scheduled) { wheelPending.scheduled = true; requestAnimationFrame(applyWheel); }
    }, { passive: false });
  }
  function applyWheel() {
    const pending = wheelPending; wheelPending = null;
    if (!pending || !state || !receiver) return;
    const raw = receiver.getSlotRaw(pending.id);
    const item = state.items.find((it) => it.id === pending.id);
    if (!raw || !item) return;
    const scaleMul = Math.max(0.05, Math.min(10, raw.scaleMul * pending.factor));
    // receiver 沒有直接改縮放的 API：移除再以同一組位置＋新倍率放回（以底部中心為錨點），載好後恢復選取
    receiver.handleMessage({ type: 'LC_REMOVE_SLOT', slotId: pending.id });
    receiver.handleMessage({ type: 'LC_UPSERT_SLOT', slotId: pending.id, slotType: 'product', dataUrl: item.src, transform: { ...raw, scaleMul } }, redraw);
    setTimeout(() => { if (state && receiver) { placeOrder(); receiver.setSelectedSlots([pending.id], redraw); } }, 60);
  }

  function scaleTransform(t, k) { return { ...t, x: t.x * k, y: t.y * k, w0: t.w0 * k, h0: t.h0 * k }; }

  /** 程式化改某一張的縮放／位置（測試與自動化用；跟滾輪同一條路：移除再放回）。 */
  function setItemTransform(id, { scaleMul, dx = 0, dy = 0 } = {}) {
    if (!state || !receiver) return false;
    const raw = receiver.getSlotRaw(id);
    const item = state.items.find((it) => it.id === id);
    if (!raw || !item) return false;
    const next = { ...raw, x: raw.x + dx, y: raw.y + dy, scaleMul: Number.isFinite(scaleMul) ? Math.max(0.05, Math.min(10, scaleMul)) : raw.scaleMul };
    receiver.handleMessage({ type: 'LC_REMOVE_SLOT', slotId: id });
    receiver.handleMessage({ type: 'LC_UPSERT_SLOT', slotId: id, slotType: 'product', dataUrl: item.src, transform: next }, redraw);
    setTimeout(() => { if (state && receiver) { placeOrder(); redraw(); } }, 60);
    return true;
  }

  function close(cancelled) {
    const queue = state?.queue;
    state = null;
    $('productComposerModal')?.classList.add('hidden');
    if (queue?.length) openNext(queue);
    void cancelled;
  }

  // ── 價格跟著券走（2026-11-04 封測回饋）──
  // 價格層是程式依「券」素材自動貼上去的；合成後商品圖被換成一張烤好的圖、框也變了，原本的價格重算會因檔名沒有「券」而把價格拿掉。
  // 做法：確認前先記下每個價格層相對「券那一張」的位置與字級比例，確認後依券在合成圖裡的新位置／大小，等比貼回去；還原自動排版也一樣。

  const couponIndexOf = (items) => Math.max(0, core().MultiProduct.couponIndexOf(items.map((it) => it.name)));

  /** receiver 的 slot 狀態（底部中心錨點、合成畫布像素）→ 公版座標的框 */
  function slotBoxOf(id, scale) {
    const st = receiver?.getOrderedStates?.().find((item) => item.id === id);
    if (!st) return null;
    return { x: (st.x - st.w / 2) / scale, y: (st.y - st.h) / scale, width: st.w / scale, height: st.h / scale };
  }
  const capturePriceRel = (template, box) => core().MultiProduct.capturePriceRel(template, box);
  const applyPriceRel = (template, key, rel, box) => core().MultiProduct.applyPriceRel(template, key, rel, box);

  async function apply() {
    if (!state) return;
    const { template, key, keys, scale, items } = state;
    const { ManualAssetControls, BatchManager, HistoryManager, Geometry } = core();
    // 價格相對「券」的比例：基準是券目前的框（沒合成過＝自動排版那一層；合成過＝上次合成時記下的券框）
    const couponIndex = couponIndexOf(items);
    const couponKeyBefore = keys[couponIndex];
    const baseBox = template.layers[key]?.productCompose?.couponBox || (couponKeyBefore && template.layers[couponKeyBefore] ? Geometry.getLayerBox(couponKeyBefore, template.layers[couponKeyBefore]) : null);
    const priceRel = capturePriceRel(template, baseBox);
    const couponBox = slotBoxOf(items[couponIndex]?.id, scale);
    // 第一次合成時把價格層的原值整組記下（位置／字級／逐段字級／錨點）：單一商品「還原自動排版」直接寫回，不經比例換算（25節：還原後與黃金逐 byte 相同）
    const PRICE_KEYS = ['x', 'y', 'width', 'height', 'centerX', 'centerY', 'fontSizePx', 'fontSizePt', 'lineHeight', 'lineHeightMultiplier', 'letterSpacing', 'textStyleRanges', 'anchor', 'hidden'];
    const priceSnapshot = template.layers[key]?.productCompose?.priceSnapshot || Object.fromEntries(Object.entries(template.layers).filter(([k, l]) => l?.source === 'auto_price_v2' || String(k).startsWith('__auto_price_v2_'))
      .map(([k, l]) => [k, JSON.parse(JSON.stringify(Object.fromEntries(PRICE_KEYS.filter((prop) => l[prop] !== undefined).map((prop) => [prop, l[prop]]))))]));
    // 第一次合成時記下商品層原本的素材與框（單一商品沒有自動排版可以「還原」，就靠這個回去）
    const GEOMETRY_KEYS = ['x', 'y', 'width', 'height', 'centerX', 'centerY', 'targetWidth', 'targetHeight', 'maxTargetHeight', 'sizingMode', 'keepAspectRatio', 'widthLimitPolicy', 'productImageSizingRule'];
    // 25節 A 系（智慧物件引擎接管商品圖）：替換會把素材改掛到手動上傳桶（assetProject／smartAssetId／logicalAssetKey），還原時要一起回去
    const ASSET_KEYS = ['assetProject', 'smartAssetId', 'logicalAssetKey', 'role'];
    const original = template.layers[key]?.productCompose?.original || {
      assetFilename: template.layers[key]?.assetFilename || '',
      geometry: Object.fromEntries(GEOMETRY_KEYS.filter((k) => template.layers[key]?.[k] !== undefined).map((k) => [k, template.layers[key][k]])),
      asset: Object.fromEntries(ASSET_KEYS.filter((k) => template.layers[key]?.[k] !== undefined).map((k) => [k, template.layers[key][k]])),
    };
    const canvas = $('composerCanvas');
    const out = document.createElement('canvas'); out.width = canvas.width; out.height = canvas.height;
    const octx = out.getContext('2d');
    drawItems(octx, true);
    const bbox = alphaBounds(out);
    if (!bbox) { alert('畫布上沒有東西'); return; }
    const crop = document.createElement('canvas'); crop.width = bbox.width; crop.height = bbox.height;
    crop.getContext('2d').drawImage(out, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);
    const blob = await new Promise((resolve) => crop.toBlob(resolve, 'image/png'));
    if (!blob) { alert('合成失敗'); return; }

    HistoryManager?.push?.('product-compose');
    const compose = {
      items: items.map((it) => ({ name: it.name, src: it.src, transform: receiver.getSlotRaw(it.id) })),
      preset: state.preset, shadow: state.shadow, angle: state.angle, scale, order: [...state.order],
      original, couponIndex, couponBox, priceRel, priceSnapshot, // 原本的素材與框；價格跟著券：券在合成圖裡的框、價格相對券的比例（還原自動排版時用）
    };
    // 複製層移除（烤成一張後只剩第一層）
    const cloneKeys = keys.slice(1);
    cloneKeys.forEach((k) => { delete template.layers[k]; });
    if (Array.isArray(template.renderOrder)) template.renderOrder = template.renderOrder.filter((k) => !cloneKeys.includes(k)); // 只清複製層，程式產生的膠囊層要留
    const layer = template.layers[key];
    const box = { x: bbox.x / scale, y: bbox.y / scale, width: bbox.width / scale, height: bbox.height / scale };
    BatchManager.applyProductImageBox(layer, { ...box, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2, targetWidth: box.width, targetHeight: box.height, maxTargetHeight: box.height, sizingMode: 'containByPBox' });
    delete layer.widthLimitPolicy; delete layer.productImageSizingRule;
    layer.hidden = false; layer.visible = true;
    const file = new File([blob], `${String(layer.psdName || key).replace(/[\\/:*?"<>|]+/g, '_')}_compose.png`, { type: 'image/png' });
    // 先記狀態再替換：替換流程會重畫「調整」面板，面板要讀得到 productCompose 才會顯示「已合成／重新調整」
    const previousCompose = layer.productCompose;
    layer.productCompose = compose;
    if (template.__multiProduct?.[key]) template.__multiProduct[key].composed = true;
    const ok = await ManualAssetControls?.replaceLayerAsset?.(key, layer, file, template, { priceSync: false });
    if (ok) {
      // 券在合成圖裡的位置（相對商品層現在的框，之後商品層被拖動也算得回來；券面定義 modules/coupon-slots.js 用）
      const baseBox = Geometry.getLayerBox(key, layer);
      if (couponBox && baseBox.width > 0 && baseBox.height > 0) compose.couponRel = { x: (couponBox.x - baseBox.x) / baseBox.width, y: (couponBox.y - baseBox.y) / baseBox.height, width: couponBox.width / baseBox.width, height: couponBox.height / baseBox.height };
      const priced = applyPriceRel(template, key, priceRel, couponBox);
      window.CouponSlots?.applyToTemplate?.(template); // 有券面定義的券以定義為準
      if (priced) { core().Renderer?.render?.(); if (core().AppState.activeIndex >= 0) { BatchManager?.markThumbsStale?.([core().AppState.activeIndex]); BatchManager?.refreshThumbsForIndexes?.([core().AppState.activeIndex]); } }
      window.showToast?.(priced ? '商品已合成套用，價格已依券的位置貼回' : '商品已合成套用');
    }
    else { layer.productCompose = previousCompose; if (template.__multiProduct?.[key]) template.__multiProduct[key].composed = !!previousCompose; alert('套用失敗：商品圖層不能手動替換'); }
    window.Inspector?.render?.();
    close(false);
  }

  function alphaBounds(canvas) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 2) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  // ── 還原自動排版（放棄合成，回到多張自動排好的狀態） ──

  async function restoreAuto() {
    const { AppState, BatchManager, HistoryManager, Renderer, LayerManager, Inspector, MultiProduct } = core();
    const template = AppState?.template;
    const keys = productKeys(template);
    const key = keys[0];
    const layer = template?.layers?.[key];
    if (!layer?.productCompose) return false;
    const compose = layer.productCompose;
    HistoryManager?.push?.('product-compose-restore');
    if (template.__manualAssetOverrides) delete template.__manualAssetOverrides[key];
    delete layer.__manualAsset; delete layer.__assetCleared; delete layer.__manualGeometry; delete layer.productCompose;
    if (!MultiProduct.relayout(template, key)) {
      const first = template.__multiProduct?.[key]?.parts?.[0];
      if (first) { const match = MultiProduct.findProductAsset(template, first, layer, template.__multiProduct?.[key]?.field || '商品圖1', BatchManager.getTemplateAssetPrefix?.(template) || ''); layer.assetFilename = match.found ? match.filename : ''; }
      else if (compose.original) {
        // 單一商品：回到第一次合成前的素材與框（A 系連手動上傳桶的掛載一起拆掉，智慧物件引擎才會回到原素材）
        layer.assetFilename = compose.original.assetFilename;
        ['widthLimitPolicy', 'productImageSizingRule', '__manualUploadFolder', 'assetProject', 'smartAssetId', 'logicalAssetKey'].forEach((k) => { delete layer[k]; });
        Object.assign(layer, compose.original.geometry || {}, compose.original.asset || {});
      }
    }
    delete AppState.images[key];
    try { await window.TemplateLoader?.loadImagesForActiveTemplate?.({ project: AppState.templates?.[AppState.activeIndex]?.project }); } catch (_) { /* 圖片載入失敗仍重繪 */ }
    // 價格跟著券回到自動排版的位置：多張 → 貼到券那一格（圖載好後用實際顯示的框）；單張 → 回到原本的框
    if (template.__multiProduct?.[key]) MultiProduct.replacePricesOnCoupon?.(template);
    else if (compose.priceSnapshot && Object.keys(compose.priceSnapshot).every((k) => template.layers[k])) {
      Object.entries(compose.priceSnapshot).forEach(([k, props]) => Object.assign(template.layers[k], JSON.parse(JSON.stringify(props))));
    }
    else if (compose.priceRel) applyPriceRel(template, key, compose.priceRel, core().Geometry.getLayerBox(key, template.layers[key]));
    window.CouponSlots?.applyToTemplate?.(template);
    Renderer?.render?.(); LayerManager?.render?.(); Inspector?.render?.();
    if (AppState.activeIndex >= 0) { BatchManager?.markThumbsStale?.([AppState.activeIndex]); BatchManager?.refreshThumbsForIndexes?.([AppState.activeIndex]); }
    window.showToast?.('已還原成自動排版');
    return true;
  }

  /** 給調整面板：目前製作物的合成狀態（null＝沒合成過） */
  function composeStatus(template) {
    const key = productKeys(template)[0];
    const compose = key ? template?.layers?.[key]?.productCompose : null;
    return compose ? { preset: compose.preset, presetLabel: PRESET_LABELS[compose.preset] || compose.preset, items: compose.items?.length || 0 } : null;
  }

  // ── 匯入後自動逐張開 ──

  function pendingIndexes() {
    const { AppState } = core();
    return (AppState?.templates || []).map((item, index) => ({ item, index }))
      .filter(({ item }) => Object.values(item?.data?.__multiProduct || {}).some((m) => (m.parts?.length || 0) >= 2 && !m.composed))
      .map(({ index }) => index);
  }

  async function openNext(queue) {
    const { BatchManager } = core();
    const index = queue.shift();
    if (index === undefined) return;
    await BatchManager.selectGenerated(index);
    await new Promise((resolve) => setTimeout(resolve, 200));
    open({ queue });
  }

  function bind() {
    const button = $('editProductBtn');
    if (button) { button.disabled = false; button.title = '拖曳／縮放／旋轉／去背，加陰影，確認後烤成一張圖放回商品圖層'; button.addEventListener('click', () => open()); }
    $('restoreProductBtn')?.addEventListener('click', () => { if (confirm('放棄這張的合成結果，回到自動排版？')) restoreAuto(); });
    document.addEventListener('importflow:generated', () => { const queue = pendingIndexes(); if (queue.length) openNext(queue); });
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(bind); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.ProductComposer = Object.freeze({ open, close, restoreAuto, composeStatus, pendingIndexes, openNext, setItemTransform, debugOrder: () => receiver?.getEnabledOrder?.(), debugStates: () => receiver?.getOrderedStates?.() });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
