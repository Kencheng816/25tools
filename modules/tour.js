/* 整合版（自 18節 移植，2026-11-06）— 新手導覽（18節 2026-11-05 封測回饋；做法照 Mall-SKBN 的 js/tour.js）
 *
 * 第一次開工具頁自動跑：載入內建的範例工單＋素材（tour/tour-sample-data.js，開始導覽時才載入），
 * 一步一步把畫面上的功能打亮、旁邊出現說明框，有些步驟會用假游標示範實際操作（匯入拖曳、雙擊改字、滾輪縮放、右鍵換素材、合成商品）。
 * 頂部列多一顆「使用教學」可隨時重看；網址加 ?tour 強制再跑。導覽結束整頁重新載入（範例資料清掉、回到匯入視窗）。
 *
 * 完全獨立：只呼叫既有的全域物件（ImportFlow、AppState、BatchManager、LayerManager、Renderer、Geometry、TextEditor、ProductComposer、PreviewZoom）。
 * 步驟只改 STEPS；每一步：target（CSS 選擇器／回傳元素或元素陣列的函式／null＝畫面正中）、title、body（可 HTML）、
 * before／after（進入前／離開時要做的事，可回傳 Promise）、place（說明框偏好位置）、pad、anim（示範動畫，重複播放；animOnce 只播一次）、
 * optional（目標找不到就跳過這一步）。
 */
(function initTour() {
  'use strict';

  const TOUR_KEY = '25tool_tour_seen_v1';
  const SAMPLE_SRC = 'tour/tour-sample-data.js';
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);
  const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = (fn, timeout = 4000) => new Promise((resolve) => { const t0 = Date.now(); (function poll() { let v = null; try { v = fn(); } catch (_) { /* 還沒好 */ } if (v || Date.now() - t0 > timeout) return resolve(v); setTimeout(poll, 60); })(); });
  const core = () => ({ AppState: window.AppState, BatchManager: window.BatchManager, LayerManager: window.LayerManager, Renderer: window.Renderer, Geometry: window.Geometry, TextEditor: window.TextEditor, Inspector: window.Inspector, PreviewZoom: window.PreviewZoom });

  // ── 範例資料裡的三張：1 全站券加蝦幣 $200（改字示範）、2 商城券_雙券 $200（素材操作／右鍵換素材）、3 免運車＋禮物盒（多商品合成） ──
  function selectItem(index) {
    const { AppState, BatchManager } = core();
    if (!AppState?.batchMode || !AppState.templates?.[index]) return;
    if (AppState.activeIndex !== index) { const thumb = document.querySelectorAll('.batch-thumb')[index]; if (thumb) thumb.click(); else BatchManager?.selectGenerated?.(index); }
  }
  const layerKey = (predicate) => { const layers = core().AppState?.template?.layers || {}; return Object.keys(layers).find((key) => predicate(key, layers[key])) || null; };
  const titleKey = () => layerKey((key, layer) => layer.type === 'text' && !layer.hidden && /^title$|主標/.test(`${key} ${layer.psdName || ''}`)) || layerKey((key, layer) => layer.type === 'text' && !layer.hidden);
  const productKey = () => (window.MultiProduct?.productLayerKeys?.(core().AppState?.template) || [])[0] || layerKey((key, layer) => layer.type === 'image' && !layer.hidden && /product|商品/i.test(key));

  /** 圖層在螢幕上的位置（畫布縮放後）；順便把畫布捲到看得到 */
  function layerScreenBox(key) {
    const { AppState, Geometry } = core();
    const canvas = byId('canvas'); const layer = AppState?.template?.layers?.[key];
    if (!canvas || !layer) return null;
    const rect = canvas.getBoundingClientRect(); const scale = rect.width / (AppState.template.canvas.width || 1);
    const box = Geometry.getLayerBox(key, layer);
    return { x: rect.left + box.x * scale, y: rect.top + box.y * scale, w: box.width * scale, h: box.height * scale, cx: rect.left + (box.x + box.width / 2) * scale, cy: rect.top + (box.y + box.height / 2) * scale };
  }
  /** 畫布縮到整張看得到（導覽期間；結束整頁重載就回預設） */
  function fitCanvas() {
    const { AppState, PreviewZoom } = core();
    const shell = $('.canvas-shell'); const t = AppState?.template;
    if (!shell || !t || !PreviewZoom) return;
    const zoom = Math.min((shell.clientWidth - 80) / t.canvas.width, (shell.clientHeight - 80) / t.canvas.height, 1);
    if (zoom > 0 && Math.abs((AppState.previewZoom || 1) - zoom) > 0.01) { AppState.previewZoom = zoom; PreviewZoom.apply(); }
  }

  // ══════════════ 假游標 ══════════════
  let root, spot, card, idx = 0, active = false, raf = 0, curTargets = null, busy = false;
  let animToken = 0, cursorEl = null, chipEl = null;
  const ABORT = { tourAbort: true };

  function makeCursor() {
    if (cursorEl) return;
    cursorEl = document.createElement('div'); cursorEl.id = 'tour-cursor';
    cursorEl.innerHTML = '<svg width="26" height="30" viewBox="0 0 26 30"><path d="M3 2v22l6-6 4.5 9.5 4-2L13 16h9z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="tour-ripple"></span>';
    root.appendChild(cursorEl);
    chipEl = document.createElement('div'); chipEl.id = 'tour-chip'; root.appendChild(chipEl);
  }
  function hideCursor() { if (cursorEl) cursorEl.style.opacity = '0'; if (chipEl) chipEl.style.opacity = '0'; }

  function Anim(token) {
    const self = this; let x = window.innerWidth * 0.6, y = window.innerHeight * 0.6, chipOn = false;
    const alive = () => { if (token !== animToken || !active) throw ABORT; };
    const place = () => { cursorEl.style.transform = `translate(${x}px,${y}px)`; if (chipOn) chipEl.style.transform = `translate(${x + 16}px,${y + 20}px)`; };
    self.show = (px, py) => { alive(); x = px; y = py; place(); cursorEl.style.opacity = '1'; };
    self.wait = (ms) => new Promise((resolve, reject) => setTimeout(() => { try { alive(); resolve(); } catch (e) { reject(e); } }, ms));
    self.move = (tx, ty, ms = 600, onStep) => { alive(); const sx = x, sy = y, t0 = performance.now(); return new Promise((resolve, reject) => { (function frame(now) { try { alive(); } catch (e) { return reject(e); } const k = Math.min(1, (now - t0) / ms); const e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2; x = sx + (tx - sx) * e; y = sy + (ty - sy) * e; place(); if (onStep) onStep(x, y); if (k < 1) requestAnimationFrame(frame); else resolve(); })(t0); }); };
    self.ripple = () => { const r = cursorEl.querySelector('.tour-ripple'); r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); };
    self.chip = (html) => { chipEl.innerHTML = html; chipOn = true; chipEl.style.opacity = '1'; place(); };
    self.dropChip = () => { chipOn = false; chipEl.style.opacity = '0'; };
    self.pos = () => ({ x, y });
    /* 示範中途被切到下一步：登記的復原動作會被呼叫（把改到一半的字、角度、顏色還原） */
    self.cleanup = null;
    self.onAbort = (fn) => { self.cleanup = fn; };
  }
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };

  function startAnim() {
    const token = ++animToken; const step = STEPS[idx];
    if (!step?.anim) { hideCursor(); return; }
    makeCursor();
    const a = new Anim(token);
    (function loopAnim() {
      Promise.resolve().then(() => step.anim(a)).then(() => { if (step.animOnce) throw ABORT; return a.wait(1400); }).then(loopAnim)
        .catch((e) => { if (e !== ABORT) console.warn('[tour anim]', e); try { a.cleanup?.(); } catch (_) { /* 復原失敗不影響導覽 */ } a.cleanup = null; if (token === animToken) hideCursor(); });
    })();
  }
  function stopAnim() { animToken += 1; hideCursor(); }

  // ── 示範：匯入工單（只是畫面效果，不會真的匯入） ──
  const ICON_XLS = '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="1" width="12" height="14" rx="2" fill="#1d7a45"/><path d="M5 5l6 6M11 5l-6 6" stroke="#fff" stroke-width="1.6"/></svg>';
  const ICON_DIR = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1.5 4a1 1 0 011-1h3.5l1.5 1.5h6a1 1 0 011 1V12a1 1 0 01-1 1h-11a1 1 0 01-1-1z" fill="#f2b33d"/></svg>';
  function resetImportZones() {
    [['importZoneExcel', 'importExcelTitle', '拖曳 Excel 工單到這裡'], ['importZoneAssets', 'importAssetsTitle', '拖曳素材資料夾到這裡（可選）']].forEach(([zone, title, text]) => {
      const el = byId(zone); if (!el) return; el.classList.remove('is-done', 'is-active'); const t = byId(title); if (t) t.textContent = text;
    });
    const b = byId('importConfirmBtn'); if (b) b.style.transform = '';
  }
  function animImport(a) {
    const panel = $('#importModal .import-modal'), ze = byId('importZoneExcel'), zf = byId('importZoneAssets'), btn = byId('importConfirmBtn');
    if (!panel || !ze || !zf || !btn) return a.wait(500);
    resetImportZones();
    const pr = panel.getBoundingClientRect(); const start = { x: pr.right + 60, y: pr.top + pr.height * 0.35 };
    const e = center(ze), f = center(zf), c = center(btn);
    a.show(start.x, start.y); a.chip(`${ICON_XLS}<span>2026.5.25商城狂購節_美術工單.xlsx</span>`);
    return a.wait(350)
      .then(() => a.move(e.x, e.y, 900, (x, y) => ze.classList.toggle('is-active', x < e.r.right && y > e.r.top && y < e.r.bottom)))
      .then(() => a.wait(200))
      .then(() => { a.dropChip(); a.ripple(); ze.classList.remove('is-active'); ze.classList.add('is-done'); const t = byId('importExcelTitle'); if (t) t.textContent = '已選擇：2026.5.25商城狂購節_美術工單.xlsx'; return a.wait(500); })
      .then(() => a.move(start.x, start.y + 40, 600))
      .then(() => { a.chip(`${ICON_DIR}<span>素材</span>`); return a.wait(250); })
      .then(() => a.move(f.x, f.y, 900, (x, y) => zf.classList.toggle('is-active', x < f.r.right && y > f.r.top && y < f.r.bottom)))
      .then(() => a.wait(200))
      .then(() => { a.dropChip(); a.ripple(); zf.classList.remove('is-active'); zf.classList.add('is-done'); const t = byId('importAssetsTitle'); if (t) t.textContent = '已選擇 73 張素材圖片'; return a.wait(600); })
      .then(() => a.move(c.x, c.y, 700))
      .then(() => { a.ripple(); btn.style.transition = 'transform .12s'; btn.style.transform = 'scale(.94)'; return a.wait(140); })
      .then(() => { btn.style.transform = ''; return a.wait(1200); })
      .then(() => resetImportZones());
  }

  // ── 示範：右側縮圖點選切換 ──
  function animThumbs(a) {
    const thumbs = document.querySelectorAll('.batch-thumb');
    if (thumbs.length < 2) return a.wait(500);
    const first = center(thumbs[0]), second = center(thumbs[1]);
    a.show(first.x + 80, first.y + 120);
    return a.move(second.x, second.y, 700).then(() => { a.ripple(); thumbs[1].click(); return a.wait(1200); })
      .then(() => a.move(first.x, first.y, 700)).then(() => { a.ripple(); thumbs[0].click(); return a.wait(900); })
      .then(() => { hideCursor(); return a.wait(300); });
  }

  // ── 示範：雙擊主標進入改字，把「$200」打成「$300」（畫面即時更新；示範結束還原） ──
  function animDoubleClick(a) {
    const key = titleKey(); const box = key && layerScreenBox(key);
    if (!box) return a.wait(500);
    const { AppState, Renderer, TextEditor } = core();
    const canvas = byId('canvas'); const layer = AppState.template.layers[key]; const original = layer.text;
    const render = () => Renderer?.render?.();
    // 雙擊後是「編輯中」：畫布畫的是 AppState.editingText（不是 layer.text），兩個一起改畫面才會跟著動
    const setText = (text) => { layer.text = text; if (AppState.editingLayerKey === key) { AppState.editingText = text; const editor = byId('inlineTextEditor'); if (editor) editor.innerText = text; } render(); };
    const restore = () => { TextEditor?.cancel?.(); const live = AppState.template?.layers?.[key]; if (live) { live.text = original; } layer.text = original; render(); };
    a.onAbort(restore);
    a.show(box.cx + 120, box.cy + 80);
    let p = a.move(box.cx + box.w * 0.42, box.cy, 700)
      .then(() => { a.ripple(); return a.wait(130); })
      .then(() => { a.ripple(); canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: box.cx + box.w * 0.42, clientY: box.cy, bubbles: true, cancelable: true })); return a.wait(700); });
    // 退掉「200」三個字、打「300」
    const base = original.replace(/200$/, '');
    const hasTarget = /\$200$/.test(original);
    if (hasTarget) {
      ['20', '2', ''].forEach((tail) => { p = p.then(() => { setText(base + tail); return a.wait(180); }); });
      ['3', '30', '300'].forEach((tail) => { p = p.then(() => { setText(base + tail); return a.wait(220); }); });
    }
    return p.then(() => a.wait(1200))
      .then(() => { restore(); a.cleanup = null; hideCursor(); return a.wait(500); });
  }

  // ── 示範：點選商品 → 滾輪放大縮小 → 拖曳移動 ──
  function canvasPointer(type, x, y, extra = {}) {
    const canvas = byId('canvas'); if (!canvas) return;
    canvas.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', isPrimary: true, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, ...extra }));
  }
  function animProduct(a) {
    const key = productKey(); const { LayerManager, Renderer, Inspector, AppState } = core();
    if (!key) return a.wait(500);
    LayerManager?.select?.(key); Renderer?.render?.(); Inspector?.render?.();
    let box = layerScreenBox(key); if (!box) return a.wait(500);
    const layer = AppState.template.layers[key]; const rotation0 = Number(layer.rotation || 0);
    // 旋轉時券上的價格要跟著轉：價格層錨在券上，標 _anchorDirty 讓 core 的 PriceTransformEngine 同步位置與角度
    const priceKeys = Object.entries(AppState.template.layers).filter(([, l]) => l?.source === 'auto_price_v2' && l.anchor?.layerKey === key).map(([k]) => k);
    const setRotation = (deg) => { layer.rotation = deg; priceKeys.forEach((k) => { AppState.template.layers[k]._anchorDirty = true; }); window.PriceTransformEngine?.syncTemplate?.(AppState.template); Renderer?.render?.(); };
    a.onAbort(() => { setRotation(rotation0); });
    const shell = $('.canvas-shell');
    const wheel = (delta) => shell?.dispatchEvent(new WheelEvent('wheel', { clientX: box.cx, clientY: box.cy, deltaY: delta, bubbles: true, cancelable: true }));
    a.show(box.cx + 140, box.cy + 100);
    let p = a.move(box.cx, box.cy, 500);
    // 1) 滾輪：放大四格、縮回來
    for (let i = 0; i < 4; i += 1) p = p.then(() => { wheel(-100); return a.wait(90); });
    p = p.then(() => a.wait(300));
    for (let i = 0; i < 4; i += 1) p = p.then(() => { wheel(100); return a.wait(90); });
    // 2) 拖曳：往左上拖再拖回來
    p = p.then(() => a.wait(300))
      // 拖曳點在券的左側票根（券中間疊著價格文字層，點中間會抓到價格）
      .then(() => { box = layerScreenBox(key) || box; const gx = box.x + box.w * 0.12, gy = box.cy; return a.move(gx, gy, 350).then(() => { a.ripple(); canvasPointer('pointerdown', gx, gy); return a.move(gx - 60, gy - 30, 550, (x, y) => canvasPointer('pointermove', x, y)); }); })
      .then(() => a.wait(200))
      .then(() => { const gx = box.x + box.w * 0.12; return a.move(gx, box.cy, 500, (x, y) => canvasPointer('pointermove', x, y)); })
      .then(() => { const pos = a.pos(); canvasPointer('pointerup', pos.x, pos.y); return a.wait(300); });
    // 3) 旋轉：游標繞到上方的旋轉把手，轉 15° 再轉回來（券上的價格跟著轉；示範完歸位）
    p = p.then(() => { box = layerScreenBox(key) || box; const hx = box.cx, hy = box.y - 26; return a.move(hx, hy, 450).then(() => { a.ripple(); return a.wait(120); }); })
      .then(() => {
        const radius = box.h / 2 + 26; let angle = 0;
        const turn = (to, ms) => { const from = angle; const t0 = performance.now(); return a.move(a.pos().x, a.pos().y, ms, () => { const k = Math.min(1, (performance.now() - t0) / ms); angle = from + (to - from) * k; setRotation(rotation0 + angle); const rad = (angle - 90) * Math.PI / 180; cursorEl.style.transform = `translate(${box.cx + radius * Math.cos(rad)}px,${box.cy + radius * Math.sin(rad)}px)`; }); };
        return turn(15, 650).then(() => a.wait(250)).then(() => turn(0, 550));
      })
      .then(() => { setRotation(rotation0); a.cleanup = null; return a.wait(300); })
      .then(() => { hideCursor(); return a.wait(400); });
    return p;
  }

  // ── 示範：點選券 → 右鍵 → 從素材庫替換… → 點另一張券 → 套用（真的換；範例資料導覽結束就清掉） ──
  const LIBRARY_PICK = '全站券_雙券.png'; // 把商城券換成全站券（價格會依新券重算）
  function animContextMenu(a) {
    const key = productKey(); const box = key && layerScreenBox(key);
    if (!box) return a.wait(500);
    const { LayerManager, Renderer, Inspector } = core();
    const canvas = byId('canvas');
    // 右鍵點在券的左側票根（價格文字層疊在券中間，點到中間會變成文字的右鍵）
    const px = box.x + box.w * 0.12, py = box.cy;
    a.show(box.cx + 120, box.cy + 90);
    return a.move(px, py, 700)
      .then(() => { a.ripple(); LayerManager?.select?.(key); Renderer?.render?.(); Inspector?.render?.(); return a.wait(400); })
      .then(() => { a.ripple(); canvas.dispatchEvent(new MouseEvent('contextmenu', { clientX: px, clientY: py, bubbles: true, cancelable: true, button: 2 })); return a.wait(500); })
      .then(() => { const item = byId('assetContextMenu')?.querySelector('[data-action="library"]'); if (!item || !visible(item)) return a.wait(600); const c = center(item); return a.move(c.x, c.y, 600).then(() => { a.ripple(); item.click(); return a.wait(900); }); })
      .then(() => {
        const tiles = [...document.querySelectorAll('.al-grid .al-tile')]; const tile = tiles.find((el) => el.textContent.replace(/\s+/g, '').includes(LIBRARY_PICK)) || tiles.find((el) => /雙券/.test(el.textContent) && !/有價格/.test(el.textContent)) || tiles[1];
        if (!tile || !visible(tile)) return a.wait(600);
        tile.scrollIntoView({ block: 'nearest' });
        const c = center(tile);
        return a.move(c.x, c.y, 800).then(() => { a.ripple(); tile.click(); return a.wait(1200); });
      })
      .then(() => { const apply = $('.al-apply'); if (!apply || !visible(apply) || apply.disabled) return a.wait(300); const c = center(apply); return a.move(c.x, c.y, 600).then(() => { a.ripple(); apply.click(); return a.wait(1500); }); })
      .then(() => { hideCursor(); return a.wait(500); });
  }

  // ── 示範：調整面板打字（加兩個驚嘆號再刪掉）＋ 點色票換顏色（示範完還原） ──
  function animTextField(a) {
    const input = $('#itemTextFields textarea'); if (!input) return a.wait(500);
    const c = center(input); const original = input.value;
    const fire = () => input.dispatchEvent(new Event('input', { bubbles: true }));
    const swatch0 = $('#itemTextFields .item-text-color'); const color0 = swatch0?.value;
    a.onAbort(() => { if (input.value !== original) { input.value = original; fire(); input.dispatchEvent(new Event('change', { bubbles: true })); } if (swatch0 && color0 && swatch0.value !== color0) { swatch0.value = color0; swatch0.dispatchEvent(new Event('input', { bubbles: true })); swatch0.dispatchEvent(new Event('change', { bubbles: true })); } input.blur(); });
    a.show(c.x + 80, c.y + 60);
    return a.move(c.x + 30, c.y, 600)
      .then(() => { a.ripple(); input.focus(); return a.wait(300); })
      .then(() => { let p = Promise.resolve(); ['！', '！'].forEach((ch) => { p = p.then(() => { input.value += ch; fire(); return a.wait(260); }); }); return p; })
      .then(() => a.wait(900))
      .then(() => { input.value = original; fire(); input.dispatchEvent(new Event('change', { bubbles: true })); input.blur(); return a.wait(300); })
      .then(() => {
        const swatch = $('#itemTextFields .item-text-color'); if (!swatch) return null;
        const originalColor = swatch.value; const s = center(swatch);
        const setColor = (value) => { swatch.value = value; swatch.dispatchEvent(new Event('input', { bubbles: true })); };
        return a.move(s.x, s.y, 500).then(() => { a.ripple(); return a.wait(300); })
          .then(() => { setColor('#ffe815'); return a.wait(900); })
          .then(() => { setColor('#ffffff'); return a.wait(900); })
          .then(() => { setColor(originalColor); swatch.dispatchEvent(new Event('change', { bubbles: true })); return a.wait(300); });
      })
      .then(() => { a.cleanup = null; hideCursor(); return a.wait(300); });
  }

  // ── 示範：編輯商品視窗：陰影關→開、光源 左／中／右（按鈕每點一次會重畫，所以每次都用文字重新找） ──
  function animComposer(a) {
    const shadow = byId('composerShadow'); const angleBox = byId('composerAngle');
    if (!shadow || !angleBox) return a.wait(500);
    const angleButton = (label) => [...angleBox.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
    const activeLabel = () => angleBox.querySelector('button.active')?.textContent.trim();
    const clickLabel = (label, pause) => { const el = angleButton(label); if (!el) return a.wait(100); const c = center(el); return a.move(c.x, c.y, 450).then(() => { a.ripple(); el.click(); return a.wait(pause); }); };
    const sc = center(shadow);
    a.show(sc.x + 120, sc.y + 100);
    let p = a.move(sc.x, sc.y, 450).then(() => { a.ripple(); shadow.click(); return a.wait(800); }).then(() => { a.ripple(); shadow.click(); return a.wait(600); });
    const before = activeLabel();
    ['左', '中', '右'].forEach((label) => { p = p.then(() => clickLabel(label, 800)); });
    if (before) p = p.then(() => clickLabel(before, 400));
    return p.then(() => { hideCursor(); return a.wait(400); });
  }

  // ── 示範：定義券面案型範圍 ──
  // 每一輪：① 視窗重設（雙券、沒有框、範例價格留空＝券圖上不畫價格）② 點「上券價格範圍」→ 游標從左上角拉到右下角，框跟著長出來、填角度
  // ③ 同樣拉「下券價格範圍」④ 停一下 → 重播（回到 ①，不會留著上一輪的框）。不按套用，不動已存的定義。
  const SLOT_DEMO = [['top', '上券價格範圍', [0.34, 0.12, 0.92, 0.40], -6], ['bottom', '下券價格範圍', [0.34, 0.50, 0.92, 0.80], 2]];
  function animCouponSlots(a) {
    const Editor = window.CouponSlotEditor; const canvas = byId('couponSlotCanvas');
    if (!Editor?.demoReset || !canvas || !visible(canvas)) return a.wait(500);
    Editor.demoReset();
    const r = canvas.getBoundingClientRect();
    const at = (fx, fy) => ({ x: r.left + fx * r.width, y: r.top + fy * r.height });
    a.show(r.right + 40, r.top + 40);
    let p = a.wait(500);
    SLOT_DEMO.forEach(([slotId, label, [x1, y1, x2, y2], angle]) => {
      p = p.then(() => {
        const row = [...document.querySelectorAll('.coupon-slot-item')].find((el) => el.textContent.includes(label)); if (!row) return null;
        const c = center(row);
        return a.move(c.x, c.y, 450).then(() => { a.ripple(); row.click(); return a.wait(300); })
          .then(() => { const s = at(x1, y1); return a.move(s.x, s.y, 450); })
          .then(() => { a.ripple(); const e = at(x2, y2); return a.move(e.x, e.y, 800, (x, y) => { const fx = (x - r.left) / r.width, fy = (y - r.top) / r.height; Editor.demoSetBox(slotId, x1, y1, fx, fy, 0); }); })
          .then(() => { Editor.demoSetBox(slotId, x1, y1, x2, y2, angle); return a.wait(900); });
      });
    });
    return p.then(() => { hideCursor(); return a.wait(1800); });
  }

  // ══════════════ 步驟 ══════════════
  const STEPS = [
    { target: null, intro: true, title: '歡迎使用 25節生成工具 👋', body: '帶你 2 分鐘上手：匯入工單 → 看預覽 → 微調 → 下載。' },

    { target: '#importModal .import-modal', place: 'right',
      before: () => { window.ImportFlow?.open?.(); return waitFor(() => byId('importConfirmBtn'), 2000); },
      after: () => { window.ImportFlow?.close?.(); return wait(100); },
      anim: animImport,
      title: '匯入工單', body: '拖進 Excel 工單和素材資料夾，按「確認匯入」就會自動產生所有製作物的預覽。公版已經內建，不用再上傳。' },

    { target: '#batchBody', place: 'right',
      title: '製作物清單', body: '依工單的製作內容分組。<b>有警告的會標黃</b>，點開就能快速檢視是哪一筆缺素材、超字或找不到圖層。' },

    { target: '#batchPreviewPanel', place: 'left',
      anim: animThumbs,
      title: '批次預覽', body: '點縮圖切換到那一張；勾選框決定下載時要不要包含它。' },

    { target: '#canvas', place: 'left', pad: 4,
      before: () => { selectItem(0); fitCanvas(); return wait(400); },
      after: () => { core().TextEditor?.cancel?.(); },
      anim: animDoubleClick,
      title: '主畫布：文字', body: '<b>雙擊文字</b>就能直接在畫布上改字（例如把 $200 改成 $300），方向鍵可以微調位置。' },

    { target: '#canvas', place: 'left', pad: 4,
      before: () => { selectItem(1); fitCanvas(); return wait(400); },
      anim: animProduct,
      title: '主畫布：圖片素材', body: '點一下選取素材後，<b>滑鼠滾輪</b>放大縮小、拖曳移動、拉上方的把手<b>旋轉</b>；也可以<b>拉框的角落</b>縮放。' },

    { target: () => [byId('canvas'), byId('assetContextMenu'), byId('assetLibrary')].filter((el) => el && visible(el)), place: 'left', pad: 4,
      before: () => { selectItem(1); fitCanvas(); return wait(300); },
      after: () => { byId('assetContextMenu')?.classList.add('hidden'); window.AssetLibrary?.close?.(); },
      anim: animContextMenu,
      title: '右鍵更換素材', body: '在素材上<b>按右鍵</b> → 「從素材庫替換」→ 點一張 → 「套用」就換好了；也可以上傳新圖或清除。' },

    { target: '#itemTextFields', place: 'right',
      before: () => { selectItem(0); return wait(300); },
      anim: animTextField,
      title: '調整面板：文案', body: '主標、副標、警語直接在這裡改，打字即時更新；旁邊的<b>色票</b>可以改顏色。' },

    { target: '#itemLogoSection', place: 'right', optional: true,
      before: () => { selectItem(0); return wait(300); },
      title: '品牌 LOGO', body: '「編輯 LOGO」可以縮放、裁切、加白底，確認後烤成一張圖放回去。' },

    { target: '#productComposerModal .composer-panel', place: 'right', pad: 2,
      before: () => { selectItem(2); return wait(400).then(() => { if (byId('productComposerModal')?.classList.contains('hidden') !== false) byId('editProductBtn')?.click(); return waitFor(() => byId('composerCanvas') && !byId('productComposerModal')?.classList.contains('hidden'), 8000).then(() => wait(900)); }); },
      after: () => { if (!byId('productComposerModal')?.classList.contains('hidden')) byId('composerCancel')?.click(); return wait(200); },
      anim: animComposer,
      title: '編輯商品', body: '工單商品圖寫「免運車 + 禮物盒icon」會自動拆成兩張一大一小（名字有「券」的不拆）。這裡可以拖曳、滾輪縮放、旋轉，<b>陰影</b>可開關、<b>光源</b>選左／中／右，也能去背；確認後烤成一張圖放回去。不滿意按「還原自動排版」。' },

    { target: '#couponSlotModal .coupon-slot-modal', place: 'left', pad: 2,
      before: () => {
        if (!byId('productComposerModal')?.classList.contains('hidden')) byId('composerCancel')?.click();
        selectItem(1);
        if (!document.body.classList.contains('is-advanced')) byId('advancedToggleBtn')?.click();
        return wait(500).then(() => window.CouponSlotEditor?.open?.()).then(() => waitFor(() => byId('couponSlotCanvas') && !byId('couponSlotModal')?.classList.contains('hidden'), 8000)).then(() => wait(600));
      },
      after: () => { window.CouponSlotEditor?.close?.(); if (document.body.classList.contains('is-advanced')) byId('advancedToggleBtn')?.click(); return wait(200); },
      anim: animCouponSlots,
      title: '定義券面案型範圍（進階）', body: '價格要印在券的哪裡，每一種券框一次就好：在券圖上拉出<b>上券／下券價格範圍</b>（可旋轉），「套用」後所有用這張券的製作物價格都會貼在範圍裡，公版換、縮放、合成都不會跑掉。' },

    { target: '#advancedToggleBtn', place: 'bottom',
      title: '進階模式', body: '平常用不到。打開後多出逐層微調（座標、字級）、輸出 JSON、診斷面板和上面那個「定義券面案型範圍」。' },

    { target: '#saveArchiveBtn', place: 'bottom',
      title: '儲存存檔', body: '做到一半先存成 .25tool.zip，下次在匯入視窗按「載入存檔」就能接著改。' },

    { target: '#downloadImageBtn', place: 'bottom',
      title: '下載圖片', body: '勾選的製作物一鍵打包，資料夾依工單製作內容分（01_頭巾、02_HBN…）、檔名用工單「編號」欄（HBN_260525HBN01）。' },

    { target: '#tourLaunchBtn', place: 'bottom',
      title: '導覽結束 🎉', body: '按「完成」會清掉範例、回到匯入視窗。之後隨時可以按這顆「使用教學」重看。' },
  ];

  // ══════════════ 樣式 ══════════════
  const ACCENT = '#ee4d2d';
  const CSS = `
#tour-root{position:fixed;inset:0;z-index:100070;pointer-events:none;font-family:inherit;}
#tour-block{position:fixed;inset:0;pointer-events:auto;background:transparent;}
#tour-spot{position:fixed;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.62);border:2px solid ${ACCENT};transition:left .25s,top .25s,width .25s,height .25s;pointer-events:none;}
#tour-spot.tour-none{width:0!important;height:0!important;left:50%!important;top:50%!important;border-width:0;}
#tour-card{position:fixed;width:340px;max-width:calc(100vw - 24px);background:#1a2233;color:#f0f0f0;border:1px solid #334155;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.5);padding:16px 18px 14px;pointer-events:auto;transition:left .25s,top .25s;}
#tour-card .tour-step{font-size:11px;color:${ACCENT};font-weight:700;letter-spacing:.04em;margin-bottom:6px;}
#tour-card .tour-title{font-size:16px;font-weight:700;margin-bottom:8px;}
#tour-card .tour-body{font-size:13px;line-height:1.75;color:#cbd5e1;}
#tour-card .tour-body b{color:#fff;}
#tour-card .tour-bar{height:3px;background:#334155;border-radius:2px;margin:14px 0 12px;overflow:hidden;}
#tour-card .tour-bar i{display:block;height:100%;background:${ACCENT};transition:width .25s;}
#tour-card .tour-foot{display:flex;align-items:center;gap:8px;}
#tour-card .tour-skip{background:none;border:0;color:#94a3b8;font-size:12px;cursor:pointer;padding:6px 0;margin-right:auto;}
#tour-card .tour-skip:hover{color:#fff;}
#tour-card .tour-btn{border-radius:6px;padding:7px 14px;font-size:12px;cursor:pointer;border:1px solid #334155;background:transparent;color:#f0f0f0;width:auto;min-height:0;font-weight:700;}
#tour-card .tour-btn:hover{border-color:${ACCENT};}
#tour-card .tour-btn.primary{background:${ACCENT};border-color:${ACCENT};color:#fff;}
#tour-card .tour-btn[disabled]{opacity:.35;cursor:default;}
#tour-card.tour-intro{width:420px;text-align:center;padding:26px 28px 20px;}
#tour-card.tour-intro .tour-step,#tour-card.tour-intro .tour-bar,#tour-card.tour-intro .tour-skip,#tour-card.tour-intro .tour-prev{display:none;}
#tour-card.tour-intro .tour-title{font-size:20px;margin-bottom:10px;}
#tour-card .tour-later{display:none;}
#tour-card.tour-intro .tour-later{display:inline-block;}
#tour-card.tour-intro .tour-foot{justify-content:center;margin-top:20px;gap:10px;}
#tour-card .tour-meta{display:none;}
#tour-card.tour-intro .tour-meta{display:block;margin-top:12px;font-size:11.5px;color:#64748b;}
#tour-cursor{position:fixed;left:0;top:0;width:26px;height:30px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:3;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));}
#tour-cursor svg{position:absolute;left:-3px;top:-2px;}
#tour-cursor .tour-ripple{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:2px solid #fff;opacity:0;}
#tour-cursor .tour-ripple.go{animation:tourRipple .45s ease-out;}
@keyframes tourRipple{from{transform:scale(.3);opacity:.9;}to{transform:scale(1.4);opacity:0;}}
#tour-chip{position:fixed;left:0;top:0;opacity:0;transition:opacity .15s;pointer-events:none;z-index:2;display:flex;align-items:center;gap:6px;background:#fff;color:#222;font-size:12px;padding:6px 10px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.35);white-space:nowrap;}
#tour-loading{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100071;background:#1a2233;color:#f0f0f0;border:1px solid #334155;border-radius:12px;padding:18px 24px;font-size:13px;}
#tourLaunchBtn{display:inline-flex;align-items:center;gap:6px;}
`;

  // ══════════════ 引擎 ══════════════
  function build() {
    if (root) return;
    const st = document.createElement('style'); st.id = 'tour-style'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'tour-root';
    root.innerHTML = '<div id="tour-block"></div><div id="tour-spot" class="tour-none"></div>'
      + '<div id="tour-card"><div class="tour-step"></div><div class="tour-title"></div><div class="tour-body"></div>'
      + '<div class="tour-bar"><i></i></div><div class="tour-foot">'
      + '<button class="tour-skip" type="button">跳過導覽</button>'
      + '<button class="tour-btn tour-later" type="button">先不用，直接開始工作</button>'
      + '<button class="tour-btn tour-prev" type="button">上一步</button>'
      + '<button class="tour-btn primary tour-next" type="button">下一步</button></div>'
      + `<div class="tour-meta">共 ${STEPS.length} 步・之後隨時可以按頂部列「使用教學」重看</div></div>`;
    document.body.appendChild(root);
    spot = root.querySelector('#tour-spot'); card = root.querySelector('#tour-card');
    card.querySelector('.tour-skip').onclick = end;
    card.querySelector('.tour-later').onclick = end;
    card.querySelector('.tour-prev').onclick = () => go(idx - 1, -1);
    card.querySelector('.tour-next').onclick = () => { if (idx >= STEPS.length - 1) end(); else go(idx + 1, 1); };
  }

  function resolveTargets(step) {
    const t = step.target; if (!t) return null;
    const v = typeof t === 'function' ? t() : document.querySelector(t);
    const arr = (Array.isArray(v) ? v : [v]).filter((el) => el && visible(el));
    return arr.length ? arr : null;
  }
  function unionRect(els) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    els.forEach((el) => { const r = el.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
    return { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0 };
  }

  function layout() {
    if (!active) return;
    const step = STEPS[idx], vw = window.innerWidth, vh = window.innerHeight, M = 12;
    if (curTargets && (step.anim || curTargets.some((el) => !el.isConnected))) { const re = resolveTargets(step); if (re) curTargets = re; }
    const cw = card.offsetWidth, ch = card.offsetHeight; let x, y;
    root.querySelector('#tour-block').style.background = curTargets ? 'transparent' : 'rgba(0,0,0,.62)';
    if (!curTargets) { spot.classList.add('tour-none'); x = (vw - cw) / 2; y = (vh - ch) / 2; }
    else {
      const pad = step.pad != null ? step.pad : 6; const r = unionRect(curTargets);
      const sx = Math.max(4, r.left - pad), sy = Math.max(4, r.top - pad);
      const sw = Math.min(vw - 4, r.right + pad) - sx, sh = Math.min(vh - 4, r.bottom + pad) - sy;
      spot.classList.remove('tour-none');
      spot.style.left = `${sx}px`; spot.style.top = `${sy}px`; spot.style.width = `${sw}px`; spot.style.height = `${sh}px`;
      const gap = 14; const room = { right: vw - (sx + sw) - gap - M, left: sx - gap - M, bottom: vh - (sy + sh) - gap - M, top: sy - gap - M };
      const order = [step.place || 'right', 'right', 'left', 'bottom', 'top']; let place = null;
      for (const p of order) { if ((p === 'right' || p === 'left') && room[p] >= cw) { place = p; break; } if ((p === 'top' || p === 'bottom') && room[p] >= ch) { place = p; break; } }
      if (place === 'right') { x = sx + sw + gap; y = sy + sh / 2 - ch / 2; }
      else if (place === 'left') { x = sx - gap - cw; y = sy + sh / 2 - ch / 2; }
      else if (place === 'bottom') { x = sx + sw / 2 - cw / 2; y = sy + sh + gap; }
      else if (place === 'top') { x = sx + sw / 2 - cw / 2; y = sy - gap - ch; }
      else { x = vw - cw - M; y = vh - ch - M; }
    }
    card.style.left = `${Math.max(M, Math.min(vw - cw - M, x))}px`;
    card.style.top = `${Math.max(M, Math.min(vh - ch - M, y))}px`;
  }
  function loop() { if (!busy) layout(); raf = requestAnimationFrame(loop); }

  function go(n, direction = 1) {
    if (busy || n < 0 || n >= STEPS.length) return;
    busy = true; stopAnim();
    const prev = STEPS[idx];
    Promise.resolve(prev?.after && idx !== n ? prev.after() : null)
      .then(() => { idx = n; const step = STEPS[idx]; return step.before ? step.before() : null; })
      .then(() => { const step = STEPS[idx]; return step.target ? waitFor(() => resolveTargets(step), step.optional ? 800 : 4000) : null; })
      .then((targets) => {
        const step = STEPS[idx];
        if (!targets && step.optional) { busy = false; const next = idx + direction; if (next >= 0 && next < STEPS.length) return go(next, direction); return end(); }
        curTargets = targets;
        if (targets?.[0]) { targets[0].scrollIntoView({ block: 'nearest' }); const r = unionRect(targets); if (r.top < 60 || r.bottom > window.innerHeight - 20) targets[0].scrollIntoView({ block: 'center' }); }
        card.querySelector('.tour-step').textContent = `${idx + 1} / ${STEPS.length}`;
        card.querySelector('.tour-title').textContent = step.title;
        card.querySelector('.tour-body').innerHTML = step.body;
        card.querySelector('.tour-bar i').style.width = `${(idx + 1) / STEPS.length * 100}%`;
        card.querySelector('.tour-prev').disabled = idx === 0;
        card.classList.toggle('tour-intro', !!step.intro);
        card.querySelector('.tour-next').textContent = step.intro ? '開始導覽' : (idx === STEPS.length - 1 ? '完成' : '下一步');
        layout(); busy = false; startAnim();
        return null;
      })
      .catch((e) => { console.warn('[tour]', e); busy = false; });
  }

  function onKey(e) {
    if (!active) return;
    e.stopPropagation(); e.stopImmediatePropagation();
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); card.querySelector('.tour-next').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1, -1); }
    else if (e.key === 'Escape') { e.preventDefault(); end(); }
  }

  // ══════════════ 範例資料 ══════════════
  function b64File(b64, name, type, relativePath) {
    const bin = atob(b64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u[i] = bin.charCodeAt(i);
    const file = new File([u], name, { type: type || '' });
    if (relativePath) Object.defineProperty(file, 'webkitRelativePath', { value: relativePath, configurable: true });
    return file;
  }
  function loadSampleScript() {
    if (window.TOUR_SAMPLE) return Promise.resolve();
    return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = SAMPLE_SRC; s.onload = resolve; s.onerror = () => reject(new Error(`找不到導覽用的範例資料（${SAMPLE_SRC}）`)); document.head.appendChild(s); });
  }
  async function loadSample() {
    await loadSampleScript();
    const S = window.TOUR_SAMPLE;
    const ImportFlow = window.ImportFlow;
    if (!S || !ImportFlow?.setWorkbook) throw new Error('匯入流程還沒準備好');
    ImportFlow.close();
    await ImportFlow.setWorkbook(b64File(S.excel, S.excelName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    const select = byId('importSheetSelect'); if (select && S.sheet) { select.value = S.sheet; select.dispatchEvent(new Event('change')); }
    ImportFlow.setAssets(S.files.map((f) => b64File(f.b64, f.name, f.type, f.path)));
    await ImportFlow.run();
    await waitFor(() => (core().AppState?.batchItems || []).length > 0 && !byId('assetLoadingOverlay')?.classList.contains('is-open'), 90000);
    await wait(800);
    // 範例裡有「免運車 + 禮物盒icon」，匯入後會自動跳出商品合成視窗逐張確認：導覽先關掉（到「編輯商品」那一步才示範）
    for (let i = 0; i < 5 && byId('productComposerModal') && !byId('productComposerModal').classList.contains('hidden'); i += 1) { byId('composerSkip')?.click(); await wait(300); }
    await wait(300);
  }
  const hasUserData = () => !!(core().AppState?.batchMode && (core().AppState.batchItems || []).length);

  // ══════════════ 開始／結束 ══════════════
  let loadingEl = null;
  function showLoading(text) { if (!loadingEl) { loadingEl = document.createElement('div'); loadingEl.id = 'tour-loading'; document.body.appendChild(loadingEl); } loadingEl.textContent = text; loadingEl.style.display = ''; }
  function hideLoading() { if (loadingEl) loadingEl.style.display = 'none'; }

  async function start() {
    if (active || busy) return;
    if (hasUserData() && !confirm('導覽會載入一份範例工單，目前的製作物會被清掉（要保留請先按「儲存存檔」）。\n\n要開始導覽嗎？')) return;
    if (!window.ToolBootstrap?.isCoreReady?.()) { alert('這一頁要先選好分類（上傳工單）才能跑導覽；請到「暖身BN」工具頁按「使用教學」。'); return; }
    busy = true;
    try {
      build(); if (!root.querySelector('#tour-style')) document.head.appendChild(byId('tour-style'));
      showLoading('載入導覽範例工單中…');
      await loadSample();
    } catch (error) { hideLoading(); busy = false; alert(error.message || '導覽範例載入失敗'); return; }
    hideLoading();
    root.style.display = '';
    active = true; idx = 0; curTargets = null; busy = false;
    document.addEventListener('keydown', onKey, true);
    cancelAnimationFrame(raf); loop();
    go(0);
  }

  function end() {
    if (!active) return;
    stopAnim();
    const step = STEPS[idx]; if (step?.after) { try { step.after(); } catch (_) { /* 關不掉也沒關係，等等整頁重載 */ } }
    active = false; cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey, true);
    if (root) root.style.display = 'none';
    try { localStorage.setItem(TOUR_KEY, '1'); } catch (_) { /* 隱私模式 */ }
    // 範例資料清掉、回到乾淨的匯入視窗：整頁重新載入（去掉 ?tour）
    const url = new URL(window.location.href); url.searchParams.delete('tour');
    window.location.replace(url.toString());
  }

  // ══════════════ 「使用教學」按鈕＋第一次自動開始 ══════════════
  function addLaunchButton() {
    if (byId('tourLaunchBtn')) return;
    const anchor = byId('advancedToggleBtn'); if (!anchor?.parentNode) return;
    const btn = document.createElement('button');
    btn.id = 'tourLaunchBtn'; btn.type = 'button'; btn.className = 'topbar-btn'; btn.title = '新手導覽：用範例工單一步一步看功能';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M6.2 6.2a1.9 1.9 0 113 1.5c-.7.4-1.2.8-1.2 1.6M8 11.6v.1"/></svg>使用教學';
    btn.addEventListener('click', start);
    anchor.parentNode.insertBefore(btn, anchor);
  }
  const seen = () => { try { return localStorage.getItem(TOUR_KEY) === '1'; } catch (_) { return true; } };
  const forced = () => /[?&]tour\b/.test(location.search);

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }
  function wire() {
    addLaunchButton();
    if (window.ToolBootstrap?.group) return; // 群組頁（OM／KOL）要先選分頁，導覽只在單一分類頁自動跑
    // 自動化測試（navigator.webdriver）不自動跑，免得黃金回歸被導覽打斷；?tour 仍可強制
    const automated = navigator.webdriver === true;
    if (((!seen() && !automated) || forced()) && location.search.indexOf('tour=0') < 0) {
      // 等公版載好再開始（匯入視窗會自動跳出，start 會把它關掉）
      waitFor(() => (core().AppState?.templates || []).length > 0, 60000).then(() => wait(600)).then(start);
    }
  }

  window.Tour = Object.freeze({ start, end, steps: STEPS, isActive: () => active, go: (n) => go(n, 1) });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
