/* 整合版（自 18節 移植，2026-11-06）— 「定義券面案型範圍」視窗（進階模式；2026-11-04 封測回饋）
 *
 * 進階模式打開後，「調整」面板商品區多一顆「定義券面案型範圍」：選到的製作物有券（素材名含「券」）才亮。
 * 視窗左邊放券的原圖（素材檔本身），用矩形工具框出價格該放的白色票面：
 *   單券：價格範圍 1 個；雙券：上券價格範圍、下券價格範圍、上券遮罩（上券＝畫面上方、疊在後面那張；下券＝畫面下方、疊在前面那張；
 *   遮罩框住前面那張券蓋到上券的區域，上券價格被蓋到的部分會像實際疊券一樣被遮住）。
 * 框可拖動、拉角落縮放、拉上方把手旋轉（也可直接打角度）。框好後圖上即時用範例價格畫出結果。
 * 「套用」→ 存進瀏覽器（CouponSlots.save），所有用到這張券的製作物價格馬上重貼；「匯出定義檔」→ 下載 config/coupon-price-slots.js
 * 放進專案一起上 GitHub，之後大家開工具就直接帶這組。
 */
(function initCouponSlotEditor() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const core = () => ({ AppState: window.AppState, CouponSlots: window.CouponSlots, MultiProduct: window.MultiProduct, CouponPriceSync: window.CouponPriceSync, Renderer: window.Renderer });
  const SLOTS = {
    single: [{ id: 'single', label: '價格範圍', color: '#2563eb' }],
    double: [{ id: 'top', label: '上券價格範圍', color: '#2563eb' }, { id: 'bottom', label: '下券價格範圍', color: '#16a34a' }, { id: 'mask', label: '上券遮罩（預設＝下券範圍）', color: '#f59e0b' }],
  };
  const HANDLE = 7; // 把手半徑（螢幕像素）
  const SAMPLE_PRICE = '$350';

  let state = null; // { name, img, kind, defs:{slot:{cx,cy,w,h,angle}}（圖的像素）, active, scale, drag }

  // ── 進入點：目前製作物裡的券 ──
  function currentCoupon() {
    const { AppState, MultiProduct, CouponSlots } = core();
    const template = AppState?.template;
    if (!template?.layers) return null;
    const keys = [...(MultiProduct?.productLayerKeys?.(template) || []), ...Object.keys(template.layers).filter((k) => template.layers[k]?.__multiProductOf)];
    for (const key of keys) {
      const layer = template.layers[key];
      if (!layer || layer.type !== 'image') continue;
      const compose = layer.productCompose;
      const name = compose?.items ? CouponSlots.couponNameOf(compose.items[compose.couponIndex || 0]?.name || '') : CouponSlots.couponNameOf(layer.assetFilename);
      if (/券/.test(name)) return { key, name, src: compose?.items ? compose.items[compose.couponIndex || 0]?.src : null };
    }
    return null;
  }

  /** 券的原圖：素材庫的 File → dataURL；合成過的用合成時存的 src */
  async function loadCouponImage(coupon) {
    if (coupon.src) return loadImage(coupon.src);
    const entries = window.AssetStore?.getFileEntries?.() || [];
    const stem = (name) => core().CouponSlots.couponNameOf(name);
    const entry = entries.find((item) => stem(item.filename) === coupon.name) || entries.find((item) => stem(item.filename).toLowerCase() === coupon.name.toLowerCase());
    if (!entry?.file) {
      const img = window.AppState?.images?.[coupon.key];
      if (img?.naturalWidth) return img;
      throw new Error(`素材庫裡找不到「${coupon.name}」的圖檔`);
    }
    const url = URL.createObjectURL(entry.file);
    try { return await loadImage(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
  }
  const loadImage = (src) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('圖載入失敗')); img.src = src; });

  // ── 視窗 DOM ──
  function ensureModal() {
    let modal = $('couponSlotModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'couponSlotModal';
    modal.className = 'v3-modal-backdrop hidden';
    modal.innerHTML = `
      <div class="v3-modal coupon-slot-modal" role="dialog" aria-labelledby="couponSlotTitle">
        <div class="import-modal-head">
          <h3 id="couponSlotTitle">定義券面案型範圍</h3>
          <button type="button" class="import-modal-close" id="couponSlotClose" aria-label="關閉">×</button>
        </div>
        <div class="coupon-slot-body">
          <div class="coupon-slot-stage"><canvas id="couponSlotCanvas"></canvas></div>
          <div class="coupon-slot-side">
            <div class="coupon-slot-name" id="couponSlotName"></div>
            <label class="coupon-slot-row"><span>券型</span>
              <select id="couponSlotKind" class="word-select"><option value="single">單券（1 個價格）</option><option value="double">雙券（上券＋下券）</option></select></label>
            <div class="adjust-section-title">要畫的框（點一個再到圖上拖出矩形）</div>
            <div id="couponSlotList" class="coupon-slot-list"></div>
            <label class="coupon-slot-row"><span>角度</span><input id="couponSlotAngle" type="number" step="0.5" class="word-size-input" /> <span>°</span></label>
            <label class="coupon-slot-row"><span>範例價格</span><input id="couponSlotSample" type="text" class="word-size-input" value="${SAMPLE_PRICE}" /></label>
            <p class="panel-description">上券＝畫面上方、疊在後面那張；下券＝畫面下方、疊在前面那張。框＝價格文字放的範圍：置中、字級自動縮到塞得下、角度照框。上券遮罩＝前面那張券蓋到上券的區域，沒另外框就用下券價格範圍；上券文字被蓋到的部分會被遮住。</p>
            <div class="coupon-slot-actions">
              <button type="button" id="couponSlotDelete" class="secondary-btn">刪除這個框</button>
              <button type="button" id="couponSlotExport" class="secondary-btn" title="下載 coupon-price-slots.js，放進專案 config/ 一起上 GitHub">匯出定義檔</button>
            </div>
            <div class="coupon-slot-actions">
              <button type="button" id="couponSlotClear" class="secondary-btn" title="刪掉這張券的定義，回到原本規則算法">清除定義</button>
              <button type="button" id="couponSlotApply" class="primary-btn">套用</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    $('couponSlotClose').addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    $('couponSlotKind').addEventListener('change', () => { state.kind = $('couponSlotKind').value; state.active = SLOTS[state.kind][0].id; renderList(); draw(); });
    $('couponSlotAngle').addEventListener('input', () => { const rect = state?.defs[state.active]; if (rect) { rect.angle = Number($('couponSlotAngle').value) || 0; draw(); } });
    $('couponSlotSample').addEventListener('input', draw);
    $('couponSlotDelete').addEventListener('click', () => { if (state) { delete state.defs[state.active]; renderList(); draw(); } });
    $('couponSlotApply').addEventListener('click', apply);
    $('couponSlotExport').addEventListener('click', exportFile);
    $('couponSlotClear').addEventListener('click', () => { if (!state) return; if (!confirm(`清除「${state.name}」的券面定義？價格會回到原本的規則算法。`)) return; core().CouponSlots.save(state.name, null); core().CouponSlots.applyEverywhere(state.name); window.showToast?.('已清除定義'); close(); });
    bindCanvas($('couponSlotCanvas'));
    return modal;
  }

  function renderList() {
    const list = $('couponSlotList');
    list.innerHTML = '';
    SLOTS[state.kind].forEach((slot) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `coupon-slot-item${state.active === slot.id ? ' is-active' : ''}`;
      const status = state.defs[slot.id] ? '已框' : (slot.id === 'mask' && state.defs.bottom ? '用下券範圍' : '未框');
      row.innerHTML = `<span class="coupon-slot-dot" style="background:${slot.color}"></span>${slot.label}<small>${status}</small>`;
      row.addEventListener('click', () => {
        state.active = slot.id;
        // 遮罩還沒畫：先用下券價格範圍當起點（可以再拉大／移動）
        if (slot.id === 'mask' && !state.defs.mask && state.defs.bottom) state.defs.mask = { ...state.defs.bottom };
        renderList(); draw();
      });
      list.appendChild(row);
    });
    const rect = state.defs[state.active];
    $('couponSlotAngle').value = rect ? rect.angle : 0;
  }

  // ── 畫 ──
  const toRad = (deg) => deg * Math.PI / 180;
  function corners(rect) {
    const cos = Math.cos(toRad(rect.angle)); const sin = Math.sin(toRad(rect.angle));
    const at = (dx, dy) => ({ x: rect.cx + dx * cos - dy * sin, y: rect.cy + dx * sin + dy * cos });
    return [at(-rect.w / 2, -rect.h / 2), at(rect.w / 2, -rect.h / 2), at(rect.w / 2, rect.h / 2), at(-rect.w / 2, rect.h / 2)];
  }
  const rotateHandle = (rect) => { const cos = Math.cos(toRad(rect.angle)); const sin = Math.sin(toRad(rect.angle)); const d = -rect.h / 2 - 24 / state.scale; return { x: rect.cx - d * sin, y: rect.cy + d * cos }; };

  function draw() {
    if (!state) return;
    const canvas = $('couponSlotCanvas'); const ctx = canvas.getContext('2d');
    const { img, scale } = state;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 棋盤底
    for (let y = 0; y < canvas.height; y += 16) for (let x = 0; x < canvas.width; x += 16) { ctx.fillStyle = ((x + y) / 16) % 2 ? '#2a3448' : '#1f2838'; ctx.fillRect(x, y, 16, 16); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    const sample = $('couponSlotSample').value.trim(); // 留空＝不畫範例價格（導覽示範用）
    const slots = SLOTS[state.kind];
    // 範例價格（上券＝後面那張，被遮罩裁）
    slots.filter((slot) => sample && slot.id !== 'mask' && state.defs[slot.id]).forEach((slot) => {
      if (state.drag && slot.id === state.active) return; // 正在拉這個框：先不畫範例價格，免得跟框疊在一起看不清楚
      const rect = state.defs[slot.id];
      ctx.save();
      const maskRect = state.defs.mask || state.defs.bottom;
      if (slot.id === 'top' && maskRect) { const pts = corners(maskRect); ctx.beginPath(); ctx.rect(-1e5, -1e5, 2e5, 2e5); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.clip('evenodd'); }
      const fontSize = core().CouponSlots.fitFontSize({ text: sample, fontFamily: 'ShopeeNotoSans Content', fontWeight: '700' }, rect.w, rect.h);
      ctx.translate(rect.cx, rect.cy); ctx.rotate(toRad(rect.angle));
      ctx.font = `700 ${fontSize}px "ShopeeNotoSans Content", sans-serif`; ctx.fillStyle = '#ee4d2d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sample, 0, 0);
      ctx.restore();
    });
    // 框
    slots.forEach((slot) => {
      const rect = state.defs[slot.id]; if (!rect) return;
      const pts = corners(rect); const active = slot.id === state.active;
      ctx.save();
      ctx.lineWidth = (active ? 2.5 : 1.5) / scale; ctx.strokeStyle = slot.color; ctx.setLineDash(slot.id === 'mask' ? [8 / scale, 5 / scale] : []);
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
      if (slot.id === 'mask') { ctx.fillStyle = 'rgba(245,158,11,.12)'; ctx.fill(); }
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.font = `${12 / scale}px sans-serif`; ctx.fillText(slot.label, pts[0].x + 4 / scale, pts[0].y - 6 / scale);
      if (active) {
        pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE / scale, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); });
        const h = rotateHandle(rect); const top = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(h.x, h.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(h.x, h.y, HANDLE / scale, 0, Math.PI * 2); ctx.fillStyle = slot.color; ctx.fill();
      }
      ctx.restore();
    });
  }

  // ── 滑鼠：拖出新框／移動／角落縮放／旋轉 ──
  function bindCanvas(canvas) {
    const pos = (event) => { const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) * canvas.width / r.width / state.scale, y: (event.clientY - r.top) * canvas.height / r.height / state.scale }; };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const inside = (p, rect) => { const cos = Math.cos(-toRad(rect.angle)); const sin = Math.sin(-toRad(rect.angle)); const dx = p.x - rect.cx; const dy = p.y - rect.cy; const lx = dx * cos - dy * sin; const ly = dx * sin + dy * cos; return Math.abs(lx) <= rect.w / 2 && Math.abs(ly) <= rect.h / 2; };
    canvas.addEventListener('pointerdown', (event) => {
      if (!state) return;
      const p = pos(event); const rect = state.defs[state.active]; const tolerance = HANDLE * 1.6 / state.scale;
      canvas.setPointerCapture(event.pointerId);
      if (rect) {
        if (dist(p, rotateHandle(rect)) <= tolerance) { state.drag = { mode: 'rotate', start: p, angle0: rect.angle, base: Math.atan2(p.y - rect.cy, p.x - rect.cx) }; return; }
        const pts = corners(rect);
        const corner = pts.findIndex((c) => dist(p, c) <= tolerance);
        if (corner >= 0) { state.drag = { mode: 'resize', corner, opposite: pts[(corner + 2) % 4], angle: rect.angle }; return; }
        if (inside(p, rect)) { state.drag = { mode: 'move', start: p, cx0: rect.cx, cy0: rect.cy }; return; }
      }
      state.drag = { mode: 'create', start: p };
      state.defs[state.active] = { cx: p.x, cy: p.y, w: 1, h: 1, angle: rect?.angle || 0 };
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!state?.drag) return;
      const p = pos(event); const d = state.drag; const rect = state.defs[state.active]; if (!rect) return;
      if (d.mode === 'create') { rect.cx = (d.start.x + p.x) / 2; rect.cy = (d.start.y + p.y) / 2; rect.w = Math.max(2, Math.abs(p.x - d.start.x)); rect.h = Math.max(2, Math.abs(p.y - d.start.y)); rect.angle = 0; }
      else if (d.mode === 'move') { rect.cx = d.cx0 + (p.x - d.start.x); rect.cy = d.cy0 + (p.y - d.start.y); }
      else if (d.mode === 'rotate') { rect.angle = Math.round((d.angle0 + (Math.atan2(p.y - rect.cy, p.x - rect.cx) - d.base) * 180 / Math.PI) * 2) / 2; $('couponSlotAngle').value = rect.angle; }
      else if (d.mode === 'resize') {
        // 對角固定，依框的角度算新的寬高與中心
        const cos = Math.cos(-toRad(d.angle)); const sin = Math.sin(-toRad(d.angle));
        const dx = p.x - d.opposite.x; const dy = p.y - d.opposite.y;
        const lx = dx * cos - dy * sin; const ly = dx * sin + dy * cos;
        rect.w = Math.max(2, Math.abs(lx)); rect.h = Math.max(2, Math.abs(ly));
        rect.cx = (p.x + d.opposite.x) / 2; rect.cy = (p.y + d.opposite.y) / 2;
      }
      draw();
    });
    const end = () => { if (state?.drag) { state.drag = null; renderList(); draw(); } };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  // ── 開／套用／匯出 ──
  async function open() {
    const { CouponSlots, CouponPriceSync } = core();
    const coupon = currentCoupon();
    if (!coupon) { alert('這張製作物沒有券（素材名要含「券」）'); return; }
    let img;
    try { img = await loadCouponImage(coupon); } catch (error) { alert(error.message); return; }
    ensureModal();
    const existing = CouponSlots.get(coupon.name);
    const W = img.naturalWidth || img.width; const H = img.naturalHeight || img.height;
    const kindGuess = existing ? (existing.single ? 'single' : 'double') : (/雙券/.test(coupon.name) ? 'double' : /單券/.test(coupon.name) ? 'single' : ((await CouponPriceSync?.detectCouponKind?.(coupon.name, null))?.double ? 'double' : 'single'));
    const defs = {};
    Object.entries(existing || {}).forEach(([slot, rel]) => { if (rel && typeof rel === 'object') defs[slot] = { cx: rel.cx * W, cy: rel.cy * H, w: rel.w * W, h: rel.h * H, angle: Number(rel.angle) || 0 }; });
    const maxEdge = Math.min(760, window.innerWidth - 420);
    const scale = Math.min(maxEdge / W, 520 / H, 3);
    const canvas = $('couponSlotCanvas');
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    state = { name: coupon.name, img, W, H, kind: kindGuess, defs, active: SLOTS[kindGuess][0].id, scale, drag: null };
    $('couponSlotName').textContent = `${coupon.name}（${W}×${H}）`;
    $('couponSlotKind').value = kindGuess;
    renderList(); draw();
    $('couponSlotModal').classList.remove('hidden');
  }

  function close() { state = null; $('couponSlotModal')?.classList.add('hidden'); }

  function toDefinition() {
    const { W, H } = state;
    const out = {};
    SLOTS[state.kind].forEach((slot) => { const r = state.defs[slot.id]; if (r) out[slot.id] = { cx: +(r.cx / W).toFixed(4), cy: +(r.cy / H).toFixed(4), w: +(r.w / W).toFixed(4), h: +(r.h / H).toFixed(4), angle: +Number(r.angle).toFixed(1) }; });
    out.image = { width: W, height: H };
    return out;
  }

  function apply() {
    if (!state) return;
    const required = SLOTS[state.kind].filter((slot) => slot.id !== 'mask').map((slot) => slot.id);
    const missing = required.filter((id) => !state.defs[id]);
    if (missing.length) { alert(`還沒框：${missing.map((id) => SLOTS[state.kind].find((s) => s.id === id).label).join('、')}`); return; }
    const { CouponSlots } = core();
    const name = state.name;
    CouponSlots.save(name, toDefinition());
    const touched = CouponSlots.applyEverywhere(name);
    window.showToast?.(`「${name}」券面範圍已套用，${touched} 張製作物的價格已重貼`);
    close();
  }

  function exportFile() {
    if (state) core().CouponSlots.save(state.name, toDefinition());
    const source = core().CouponSlots.exportSource();
    const blob = new Blob([source], { type: 'text/javascript' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'coupon-price-slots.js'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    window.showToast?.('已下載 coupon-price-slots.js，放進專案 config/ 取代原檔');
  }

  // ── 面板按鈕 ──
  function syncButton() {
    const button = $('defineCouponSlotBtn');
    if (!button) return;
    const coupon = currentCoupon();
    button.disabled = !coupon;
    button.title = coupon ? `定義「${coupon.name}」的價格範圍${core().CouponSlots.has(coupon.name) ? '（已有定義）' : ''}` : '選到的製作物沒有券';
    button.classList.toggle('has-def', !!(coupon && core().CouponSlots.has(coupon.name)));
  }

  function wire() {
    $('defineCouponSlotBtn')?.addEventListener('click', open);
    syncButton();
    setInterval(syncButton, 800);
  }
  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }

  // ── 新手導覽用（不動已存的定義；只改視窗裡的畫面） ──
  /** 回到乾淨狀態：雙券、沒有框、範例價格留空（券圖上就不會畫出任何價格） */
  function demoReset() {
    if (!state) return;
    state.kind = 'double'; $('couponSlotKind').value = 'double';
    state.defs = {}; state.active = SLOTS[state.kind][0].id; state.drag = null;
    $('couponSlotSample').value = '';
    renderList(); draw();
  }
  /** 直接把某個框設成 圖的比例座標（x1,y1,x2,y2 為 0～1），導覽用它一格一格把框「拉」出來 */
  function demoSetBox(slotId, x1, y1, x2, y2, angle = 0) {
    if (!state) return;
    const { W, H } = state;
    state.active = slotId;
    state.defs[slotId] = { cx: (x1 + x2) / 2 * W, cy: (y1 + y2) / 2 * H, w: Math.max(2, Math.abs(x2 - x1) * W), h: Math.max(2, Math.abs(y2 - y1) * H), angle };
    $('couponSlotAngle').value = angle;
    renderList(); draw();
  }

  window.CouponSlotEditor = Object.freeze({ open, close, currentCoupon, demoReset, demoSetBox, isOpen: () => !!state });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
