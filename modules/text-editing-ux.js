/* 整合版（自 18節 移植）— 文字編輯體驗：游標在真正的插入點、點擊定位、拖曳選取反白、文字框即時貼合
 *
 * 2026-10-02 回饋：連點兩下可以改字，但游標只畫在整段最後、沒有選取反白、文字框固定不動，不夠直覺。
 *
 * 做法（只影響「編輯中」的畫面與操作，不改任何產圖輸出）：
 *   1. 鍵盤輸入仍打進藏起來的 #inlineTextEditor（已改為 <textarea>，selectionStart／End 就是游標與選取範圍，
 *      中文輸入法也由瀏覽器處理）。core 用 textContent／innerText 讀寫它，這裡用 instance accessor 轉到 value。
 *   2. 主畫布畫「編輯中那一層」時，暫時攔截 canvasCtx.fillText，記下每一行實際畫在哪裡（x／y／字型／對齊／座標轉換），
 *      之後的游標、反白、點擊定位都用這份紀錄算——所以 A 系原文 drawText 與 B 系文字引擎都對得準，不用各寫一套。
 *   3. 取代 Renderer.drawTextCaret：在插入點畫對比色游標（深色字→深色游標＋白邊；淺色字相反），有選取就畫半透明反白。
 *   4. 畫布上：編輯中點編輯層＝移動游標、拖曳＝選取、雙擊＝選一個詞；Enter＝換行、Ctrl/Cmd+Enter 或點外面＝確認、Esc＝取消。
 *   5. 文字變了就依實際行寬／行數重算文字框（寬度跟著文字長，不自動換行；Enter 才換行），置中對齊保持中心、左右對齊保持該邊。
 *
 * 依賴（執行期才取用）：AppState、Renderer、TextEditor、Geometry、LayerManager、Interaction、HistoryManager。
 * 由 app.html 靜態載入；等 __coreScriptsReady＋__appReady 才接線（所有 coreScripts 載完，之後才能安全包住 Renderer／TextEditor）。
 */
(function initTextEditingUx() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const core = () => ({
    AppState: window.AppState, Renderer: window.Renderer, TextEditor: window.TextEditor, Geometry: window.Geometry,
    LayerManager: window.LayerManager, HistoryManager: window.HistoryManager, Inspector: window.Inspector,
  });

  const state = {
    editor: null,
    mainCtx: null,
    layout: null,          // 最近一次主畫布畫「編輯層」的行紀錄
    layoutKey: null,
    layoutText: null,      // 行紀錄對應的文字（反白要畫在文字底下，用上一幀的紀錄時要確認文字沒變）
    selecting: false,      // 畫布上拖曳選取中
    anchorOffset: 0,
    composing: null,       // IME 組字中：{ start, end }
    inkBoxes: new Map(),   // key → 選取中文字層的墨跡外框（選取框貼合用）
    dirty: false,          // 這次編輯有沒有動過（文字／字級／對齊…）；沒動過不貼合框
    settling: false,
  };

  // ── 1. 隱藏編輯框：<textarea>，但讓 core 的 textContent／innerText 讀寫照常運作 ──
  function shimEditor(editor) {
    if (!editor || editor.__textEditingUxShimmed) return editor;
    editor.__textEditingUxShimmed = true;
    // 不自動換行：1px 寬的 textarea 若會換行，Home／End／↑／↓ 會以「視覺行」為單位，等於一個字一行。
    editor.setAttribute('wrap', 'off');
    editor.style.whiteSpace = 'pre';
    const valueAccessor = { configurable: true, get() { return this.value; }, set(text) { this.value = text == null ? '' : String(text); } };
    Object.defineProperty(editor, 'textContent', valueAccessor);
    Object.defineProperty(editor, 'innerText', valueAccessor);
    return editor;
  }

  const flag = (name, fallback) => { const value = window.ProfileLoader?.getFlag?.(name, undefined); return value === undefined || value === null ? fallback : value; };
  const inkFitEnabled = () => flag('ui.selectionBoxMode', 'layer') === 'inkFitAll';

  /** 由行紀錄算出這一層文字的墨跡外框（公版座標；旋轉層以圖層中心換算回未旋轉座標）。 */
  function rememberInkBox(key, layer, layout) {
    if (!layout?.length) { state.inkBoxes.delete(key); return; }
    const drawn = layout.filter((line) => line.text.trim());
    const lines = drawn.length ? drawn : layout;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    lines.forEach((line) => {
      left = Math.min(left, line.inkLeft ?? line.left); right = Math.max(right, line.inkRight ?? line.right);
      top = Math.min(top, line.inkTop ?? line.top); bottom = Math.max(bottom, line.inkBottom ?? line.bottom);
    });
    if (!Number.isFinite(left) || right <= left || bottom <= top) { state.inkBoxes.delete(key); return; }
    const transform = lines[0].transform;
    if (!isIdentity(transform)) {
      // 旋轉層：drawText 先 translate 到圖層中心，紀錄是以中心為原點的局部座標。
      const cx = (Number(layer.x) || 0) + (Number(layer.width) || 0) / 2;
      const cy = (Number(layer.y) || 0) + (Number(layer.height) || 0) / 2;
      left += cx; right += cx; top += cy; bottom += cy;
    }
    const pad = 2;
    state.inkBoxes.set(key, { x: left - pad, y: top - pad, width: right - left + pad * 2, height: bottom - top + pad * 2, text: String(layer.text || ''), fontSizePx: layer.fontSizePx });
  }

  const editingKey = () => core().AppState?.editingLayerKey || null;
  const editingLayer = () => { const key = editingKey(); return key ? core().AppState?.template?.layers?.[key] : null; };
  const currentText = () => state.editor ? state.editor.value : '';

  // ── 2. 行紀錄：攔截 fillText ──
  function parseFontSize(font) {
    const match = /(\d+(?:\.\d+)?)px/.exec(String(font || ''));
    return match ? Number(match[1]) : 24;
  }

  /** 攔截這一層的 fillText，回傳 { result, layout }。順便用 measureText 的 actualBoundingBox 記下墨跡上下緣（選取框貼合用）。 */
  function recordDrawText(canvasCtx, draw) {
    const records = [];
    const measure = (text) => { try { return canvasCtx.measureText(text); } catch (_) { return null; } };
    Object.defineProperty(canvasCtx, 'fillText', {
      configurable: true,
      value(text, x, y, maxWidth) {
        const string = text == null ? '' : String(text);
        const metrics = measure(string);
        records.push({
          text: string, x, y, width: metrics?.width || 0, font: this.font, align: this.textAlign, baseline: this.textBaseline, transform: this.getTransform(),
          ink: metrics && Number.isFinite(metrics.actualBoundingBoxAscent) ? { ascent: metrics.actualBoundingBoxAscent, descent: metrics.actualBoundingBoxDescent, fontAscent: metrics.fontBoundingBoxAscent, fontDescent: metrics.fontBoundingBoxDescent, left: metrics.actualBoundingBoxLeft, right: metrics.actualBoundingBoxRight } : null,
        });
        return CanvasRenderingContext2D.prototype.fillText.apply(this, arguments);
      },
    });
    let result;
    try { result = draw(); } finally { delete canvasCtx.fillText; }
    return { result, layout: buildLayout(records) };
  }

  function recordEditingLayer(canvasCtx, draw) {
    const { result, layout } = recordDrawText(canvasCtx, draw);
    state.layout = layout; state.layoutKey = editingKey(); state.layoutText = currentText();
    return result;
  }

  /** 把 fillText 紀錄整理成行：同一條 y（同一組 transform）的片段合成一行，每個字算出左右邊界。 */
  function buildLayout(records) {
    const seen = new Set();
    const unique = records.filter((record) => {
      const id = `${record.text}|${record.x.toFixed(2)}|${record.y.toFixed(2)}|${record.font}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const lines = [];
    unique.forEach((record) => {
      const fontSize = parseFontSize(record.font);
      const left = record.align === 'center' ? record.x - record.width / 2 : record.align === 'right' || record.align === 'end' ? record.x - record.width : record.x;
      const { top, bottom } = verticalExtent(record.y, record.baseline, fontSize);
      const ink = inkExtent(record, left, top, bottom);
      let line = lines.find((entry) => Math.abs(entry.y - record.y) < fontSize * 0.35 && sameTransform(entry.transform, record.transform));
      if (!line) { line = { y: record.y, top, bottom, inkTop: ink.top, inkBottom: ink.bottom, inkLeft: ink.left, inkRight: ink.right, transform: record.transform, segments: [] }; lines.push(line); }
      line.top = Math.min(line.top, top); line.bottom = Math.max(line.bottom, bottom);
      if (record.text.trim()) {
        line.inkTop = Math.min(line.inkTop, ink.top); line.inkBottom = Math.max(line.inkBottom, ink.bottom);
        line.inkLeft = Math.min(line.inkLeft, ink.left); line.inkRight = Math.max(line.inkRight, ink.right);
      }
      line.segments.push({ text: record.text, left, right: left + record.width, font: record.font });
    });
    lines.sort((a, b) => a.y - b.y);
    return lines.map((line) => {
      line.segments.sort((a, b) => a.left - b.left);
      const boundaries = []; // boundaries[i] = 第 i 個字左邊的 x；最後一個是整行右邊
      let text = '';
      line.segments.forEach((segment) => {
        const chars = [...segment.text];
        const scratch = scratchContext();
        scratch.font = segment.font;
        let prefix = '';
        chars.forEach((ch) => {
          boundaries.push(segment.left + scratch.measureText(prefix).width);
          prefix += ch;
        });
        text += segment.text;
        line.lastRight = segment.right;
      });
      boundaries.push(line.segments.length ? line.segments[line.segments.length - 1].right : 0);
      const left = line.segments.length ? line.segments[0].left : 0;
      return { text, chars: [...text], boundaries, left, right: boundaries[boundaries.length - 1], top: line.top, bottom: line.bottom, inkTop: line.inkTop, inkBottom: line.inkBottom, inkLeft: line.inkLeft, inkRight: line.inkRight, transform: line.transform };
    });
  }

  function sameTransform(a, b) {
    return ['a', 'b', 'c', 'd', 'e', 'f'].every((part) => Math.abs(a[part] - b[part]) < 1e-6);
  }

  /** 這一筆字實際墨跡的上下左右。measureText 的 actualBoundingBox* 都是相對「目前 textBaseline 的對齊點 (x, y)」量的，
   *  所以不論 baseline 是 top／middle／alphabetic，墨跡都是 y - ascent ～ y + descent、x - left ～ x + right。沒有 metrics 時退回字級估算。 */
  function inkExtent(record, left, top, bottom) {
    const ink = record.ink;
    if (!ink) return { top, bottom, left, right: left + record.width };
    return { top: record.y - ink.ascent, bottom: record.y + ink.descent, left: record.x - ink.left, right: record.x + ink.right };
  }

  function verticalExtent(y, baseline, fontSize) {
    switch (baseline) {
      case 'top': case 'hanging': return { top: y, bottom: y + fontSize };
      case 'middle': return { top: y - fontSize / 2, bottom: y + fontSize / 2 };
      case 'bottom': case 'ideographic': return { top: y - fontSize, bottom: y };
      default: return { top: y - fontSize * 0.82, bottom: y + fontSize * 0.22 }; // alphabetic
    }
  }

  let scratch = null;
  function scratchContext() {
    if (!scratch) scratch = document.createElement('canvas').getContext('2d');
    return scratch;
  }

  // ── 文字位移 ⇄ 行／字位置 ──
  /** value 的位移 → { lineIndex, charIndex }。畫出來的行數可能比 value 的行少（空行沒畫），用「扣掉換行後的流水位置」對應。 */
  function locateOffset(offset) {
    const text = currentText();
    const lines = state.layout || [];
    if (!lines.length) return null;
    const valueLines = text.split('\n');
    // 先用 value 自己的行列：第幾行、行內第幾個字
    let remaining = Math.max(0, Math.min(offset, text.length));
    let valueLineIndex = 0;
    for (; valueLineIndex < valueLines.length; valueLineIndex += 1) {
      const length = [...valueLines[valueLineIndex]].length;
      const rawLength = valueLines[valueLineIndex].length;
      if (remaining <= rawLength) { remaining = [...valueLines[valueLineIndex].slice(0, remaining)].length; break; }
      remaining -= rawLength + 1;
      void length;
    }
    if (valueLineIndex >= valueLines.length) { valueLineIndex = valueLines.length - 1; remaining = [...valueLines[valueLineIndex]].length; }
    // 畫出來的行與 value 的行數相同 → 直接對應；否則把空行補成虛擬行
    const drawn = alignDrawnLines(lines, valueLines);
    const line = drawn[valueLineIndex] || drawn[drawn.length - 1];
    const charIndex = Math.max(0, Math.min(remaining, line.chars.length));
    return { lineIndex: valueLineIndex, charIndex, line };
  }

  /** 讓畫出來的行數對上 value 的行數：空行沒有 fillText 紀錄，依前後行的間距補一個零寬虛擬行。 */
  function alignDrawnLines(lines, valueLines) {
    if (lines.length === valueLines.length) return lines;
    const pitch = lines.length > 1 ? (lines[lines.length - 1].top - lines[0].top) / (lines.length - 1) : (lines[0].bottom - lines[0].top) * 1.05;
    const result = [];
    let drawnIndex = 0;
    const layer = editingLayer();
    const alignX = (reference) => layer?.align === 'left' ? reference.left : layer?.align === 'right' ? reference.right : (reference.left + reference.right) / 2;
    valueLines.forEach((valueLine, index) => {
      const drawnLine = lines[drawnIndex];
      if (valueLine.trim() !== '' && drawnLine) { result.push(drawnLine); drawnIndex += 1; return; }
      if (valueLine === '' || !drawnLine) {
        const reference = result[result.length - 1] || lines[drawnIndex] || lines[lines.length - 1];
        const top = result.length ? reference.bottom + (pitch - (reference.bottom - reference.top)) : reference.top - pitch * (valueLines.length - index);
        const x = alignX(reference);
        result.push({ text: '', chars: [], boundaries: [x], left: x, right: x, top, bottom: top + (reference.bottom - reference.top), transform: reference.transform, virtual: true });
        return;
      }
      result.push(drawnLine); drawnIndex += 1;
    });
    return result;
  }

  /** value 位移（UTF-16）。line／char 都以 code point 計。 */
  function offsetFromLocation(lineIndex, charIndex) {
    const valueLines = currentText().split('\n');
    let offset = 0;
    for (let i = 0; i < lineIndex && i < valueLines.length; i += 1) offset += valueLines[i].length + 1;
    const line = valueLines[Math.min(lineIndex, valueLines.length - 1)] || '';
    return offset + [...line].slice(0, charIndex).join('').length;
  }

  function caretRect(location) {
    const { line, charIndex } = location;
    const x = line.boundaries[Math.min(charIndex, line.boundaries.length - 1)] ?? line.left;
    return { x, top: line.top, bottom: line.bottom, transform: line.transform };
  }

  /** 畫布座標（公版像素）→ 文字位移：先找最近的一行，再找最近的字邊界。 */
  function offsetAtPoint(point) {
    const valueLines = currentText().split('\n');
    const lines = alignDrawnLines(state.layout || [], valueLines);
    if (!lines.length) return currentText().length;
    let best = null;
    lines.forEach((line, lineIndex) => {
      const local = toLocal(point, line.transform);
      const distance = local.y < line.top ? line.top - local.y : local.y > line.bottom ? local.y - line.bottom : 0;
      if (!best || distance < best.distance) best = { line, lineIndex, local, distance };
    });
    const { line, lineIndex, local } = best;
    let charIndex = 0;
    let nearest = Infinity;
    line.boundaries.forEach((boundary, index) => {
      const gap = Math.abs(boundary - local.x);
      if (gap < nearest) { nearest = gap; charIndex = index; }
    });
    return offsetFromLocation(lineIndex, charIndex);
  }

  function toLocal(point, transform) {
    try { const p = transform.inverse().transformPoint(new DOMPoint(point.x, point.y)); return { x: p.x, y: p.y }; }
    catch (_) { return point; }
  }

  // ── 3. 游標與反白 ──
  function caretColors(layer) {
    const hex = String(layer?.color || '#000000').trim();
    const rgb = /^#([0-9a-f]{6})$/i.test(hex) ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : /^#([0-9a-f]{3})$/i.test(hex) ? [1, 2, 3].map((i) => parseInt(hex[i] + hex[i], 16)) : [0, 0, 0];
    const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    return luminance < 0.55 ? { caret: '#0f172a', halo: 'rgba(255,255,255,.95)', selection: 'rgba(59,130,246,.35)' } : { caret: '#ffffff', halo: 'rgba(15,23,42,.9)', selection: 'rgba(59,130,246,.45)' };
  }

  /** 反白畫在文字「底下」：主畫布畫編輯層之前，用上一幀的行紀錄（文字沒變才用）。 */
  function drawSelectionUnderText(canvasCtx, key, layer) {
    if (!state.editor || state.layoutKey !== key || !state.layout?.length || state.layoutText !== currentText()) return;
    const start = Math.min(state.editor.selectionStart, state.editor.selectionEnd);
    const end = Math.max(state.editor.selectionStart, state.editor.selectionEnd);
    if (end <= start) return;
    const colors = caretColors(layer);
    const lines = alignDrawnLines(state.layout, currentText().split('\n'));
    const from = locateOffset(start); const to = locateOffset(end);
    if (!from || !to) return;
    canvasCtx.save();
    for (let lineIndex = from.lineIndex; lineIndex <= to.lineIndex; lineIndex += 1) {
      const line = lines[lineIndex]; if (!line) continue;
      const fromX = lineIndex === from.lineIndex ? line.boundaries[Math.min(from.charIndex, line.boundaries.length - 1)] : line.left;
      const toX = lineIndex === to.lineIndex ? line.boundaries[Math.min(to.charIndex, line.boundaries.length - 1)] : line.right;
      canvasCtx.setTransform(line.transform);
      canvasCtx.fillStyle = colors.selection;
      canvasCtx.fillRect(Math.min(fromX, toX), line.top, Math.max(2, Math.abs(toX - fromX)), line.bottom - line.top);
    }
    canvasCtx.restore();
  }

  function drawCaretAndSelection(canvasCtx, key, layer) {
    const { AppState } = core();
    if (!state.editor || state.layoutKey !== key || !state.layout) return;
    const start = Math.min(state.editor.selectionStart, state.editor.selectionEnd);
    const end = Math.max(state.editor.selectionStart, state.editor.selectionEnd);
    const colors = caretColors(layer);
    const valueLines = currentText().split('\n');
    const lines = state.layout.length ? alignDrawnLines(state.layout, valueLines) : [];
    void start; void end;

    canvasCtx.save();
    if (state.composing && state.composing.end > state.composing.start && lines.length) {
      const from = locateOffset(state.composing.start); const to = locateOffset(state.composing.end);
      if (from && to && from.lineIndex === to.lineIndex) {
        const line = from.line;
        canvasCtx.setTransform(line.transform);
        canvasCtx.strokeStyle = colors.caret; canvasCtx.lineWidth = 1.5; canvasCtx.setLineDash([3, 2]);
        canvasCtx.beginPath(); canvasCtx.moveTo(line.boundaries[from.charIndex], line.bottom + 1); canvasCtx.lineTo(line.boundaries[Math.min(to.charIndex, line.boundaries.length - 1)], line.bottom + 1); canvasCtx.stroke();
        canvasCtx.setLineDash([]);
      }
    }
    if (AppState.caretVisible !== false) {
      const location = state.layout.length ? locateOffset(state.editor.selectionDirection === 'backward' ? start : end) : null;
      if (!location) {
        // 文字是空的（還沒有任何一行畫出來）：游標畫在文字框內、依對齊方式靠左／置中／靠右，高度用字級。
        const fontSize = Number(layer.fontSizePx) || 24;
        const x = layer.align === 'left' ? Number(layer.x) || 0 : layer.align === 'right' ? (Number(layer.x) || 0) + (Number(layer.width) || 0) : (Number(layer.x) || 0) + (Number(layer.width) || 0) / 2;
        const top = (Number(layer.y) || 0) + Math.max(0, ((Number(layer.height) || fontSize) - fontSize) / 2);
        canvasCtx.lineCap = 'round';
        canvasCtx.strokeStyle = colors.halo; canvasCtx.lineWidth = Math.max(3.5, fontSize * 0.1);
        canvasCtx.beginPath(); canvasCtx.moveTo(x, top); canvasCtx.lineTo(x, top + fontSize); canvasCtx.stroke();
        canvasCtx.strokeStyle = colors.caret; canvasCtx.lineWidth = Math.max(1.5, fontSize * 0.05);
        canvasCtx.beginPath(); canvasCtx.moveTo(x, top); canvasCtx.lineTo(x, top + fontSize); canvasCtx.stroke();
      } else {
        const rect = caretRect(location);
        const fontSize = Math.max(8, rect.bottom - rect.top);
        canvasCtx.setTransform(rect.transform);
        canvasCtx.lineCap = 'round';
        canvasCtx.strokeStyle = colors.halo; canvasCtx.lineWidth = Math.max(3.5, fontSize * 0.1);
        canvasCtx.beginPath(); canvasCtx.moveTo(rect.x, rect.top - 1); canvasCtx.lineTo(rect.x, rect.bottom + 1); canvasCtx.stroke();
        canvasCtx.strokeStyle = colors.caret; canvasCtx.lineWidth = Math.max(1.5, fontSize * 0.05);
        canvasCtx.beginPath(); canvasCtx.moveTo(rect.x, rect.top - 1); canvasCtx.lineTo(rect.x, rect.bottom + 1); canvasCtx.stroke();
      }
    }
    canvasCtx.restore();
  }

  function restartCaretBlink() {
    const { AppState, TextEditor } = core();
    if (!AppState) return;
    AppState.caretVisible = true;
    TextEditor?.startCaret?.();
  }

  function rerender() { core().Renderer?.render?.(); }

  // ── 5. 文字框即時貼合 ──
  /** 文字變了：依實際行寬／行數重算文字框。寬度跟著最長一行；高度＝行數×行距；置中保持中心、左右對齊保持該邊、上緣不動。 */
  function fitBoxToText(key, layer) {
    const { Geometry, AppState } = core();
    const lines = state.layout;
    if (!layer || !lines?.length || !Geometry?.applyBox) return false;
    const valueLines = currentText().split('\n');
    const aligned = alignDrawnLines(lines, valueLines);
    const left = Math.min(...aligned.map((line) => line.left));
    const right = Math.max(...aligned.map((line) => line.right));
    const pitch = aligned.length > 1 ? (aligned[aligned.length - 1].top - aligned[0].top) / (aligned.length - 1) : (aligned[0].bottom - aligned[0].top) * 1.05;
    const contentWidth = Math.max(8, right - left);
    const contentHeight = Math.max(8, (aligned.length - 1) * pitch + (aligned[0].bottom - aligned[0].top));
    const rotated = !isIdentity(aligned[0].transform);
    const box = { x: Number(layer.x) || 0, y: Number(layer.y) || 0, width: Number(layer.width) || contentWidth, height: Number(layer.height) || contentHeight };
    const next = { width: Math.ceil(contentWidth), height: Math.ceil(contentHeight) };
    if (rotated || !layer.align || layer.align === 'center') next.x = box.x + box.width / 2 - next.width / 2;
    else if (layer.align === 'right') next.x = box.x + box.width - next.width;
    else next.x = box.x;
    next.y = rotated ? box.y + box.height / 2 - next.height / 2 : box.y;
    if (Math.abs(next.width - box.width) < 0.5 && Math.abs(next.height - box.height) < 0.5 && Math.abs(next.x - box.x) < 0.5 && Math.abs(next.y - box.y) < 0.5) return false;
    Geometry.applyBox(key, layer, next, { template: AppState.template });
    return true;
  }

  function isIdentity(transform) {
    return Math.abs(transform.a - 1) < 1e-6 && Math.abs(transform.d - 1) < 1e-6 && Math.abs(transform.b) < 1e-6 && Math.abs(transform.c) < 1e-6 && Math.abs(transform.e) < 1e-6 && Math.abs(transform.f) < 1e-6;
  }

  /** 文字變動：標記「這次編輯動過了」並重畫；重畫結束時 settleBox 會依新行紀錄貼合文字框。 */
  function afterTextChanged() {
    if (!editingKey()) return;
    state.dirty = true;
    rerender();
  }

  /** 工具列／Inspector 改了字級、對齊、行距等也要重新貼合：標記 dirty，下一次重畫就會處理。 */
  function markDirty() { if (editingKey()) { state.dirty = true; } }

  /** 主畫布每次重畫後：這次編輯有動過才貼合（只是雙擊看看就離開，不動原本的框）。貼合有改到框就再重畫一次。 */
  function settleBox() {
    const key = editingKey(); const layer = editingLayer();
    if (!key || !layer || !state.dirty || state.settling || state.layoutKey !== key) return;
    state.settling = true;
    try { if (fitBoxToText(key, layer)) rerender(); }
    finally { state.settling = false; }
  }

  // ── 4. 畫布互動 ──
  function hitEditingLayer(event) {
    const { Geometry, LayerManager, AppState } = core();
    const key = editingKey();
    if (!key || !Geometry?.mousePos || !LayerManager?.hitTest) return null;
    const pos = Geometry.mousePos(event);
    if (LayerManager.hitHandle?.(pos)) return null;
    const hit = LayerManager.hitTest(pos);
    const layer = AppState.template?.layers?.[key];
    if (hit !== key || !layer) return null;
    return { key, layer, pos };
  }

  function setSelection(start, end, direction) {
    if (!state.editor) return;
    const length = currentText().length;
    const from = Math.max(0, Math.min(start, length)); const to = Math.max(0, Math.min(end, length));
    state.editor.setSelectionRange(Math.min(from, to), Math.max(from, to), direction || (to < from ? 'backward' : 'forward'));
    state.editor.focus({ preventScroll: true });
    restartCaretBlink();
    rerender();
  }

  function wordRangeAt(offset) {
    const text = currentText();
    const classOf = (ch) => (/\s/.test(ch) ? 'space' : /[぀-ヿ㐀-鿿豈-﫿]/.test(ch) ? 'cjk' : /[\p{L}\p{N}_]/u.test(ch) ? 'word' : 'punct');
    if (!text) return { start: 0, end: 0 };
    const index = Math.max(0, Math.min(offset, text.length - 1));
    const cls = classOf(text[index]);
    if (cls === 'cjk') return { start: index, end: index + 1 };
    let start = index; let end = index + 1;
    while (start > 0 && classOf(text[start - 1]) === cls && text[start - 1] !== '\n') start -= 1;
    while (end < text.length && classOf(text[end]) === cls && text[end] !== '\n') end += 1;
    return { start, end };
  }

  function bindCanvas(canvas) {
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const hit = hitEditingLayer(event);
      if (!hit) return;
      // 編輯中點到編輯層：移動游標／開始選取，不讓 Interaction 的 onMouseDown 去 commit 或拖曳圖層；
      // preventDefault 也擋掉焦點轉移，隱藏編輯框才不會 blur → commit。
      event.preventDefault();
      event.stopImmediatePropagation();
      const offset = offsetAtPoint(hit.pos);
      state.selecting = true;
      state.anchorOffset = offset;
      setSelection(offset, offset);
    }, { capture: true });

    window.addEventListener('pointermove', (event) => {
      if (!state.selecting || !editingKey()) return;
      const { Geometry } = core();
      const offset = offsetAtPoint(Geometry.mousePos(event));
      setSelection(state.anchorOffset, offset);
    }, { capture: true });
    window.addEventListener('pointerup', () => { state.selecting = false; }, { capture: true });

    canvas.addEventListener('dblclick', (event) => {
      const hit = hitEditingLayer(event);
      if (!hit) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const offset = offsetAtPoint(hit.pos);
      const range = wordRangeAt(offset);
      setSelection(range.start, range.end);
    }, { capture: true });

    // 編輯中滑鼠在編輯層上顯示 I 型游標
    canvas.addEventListener('pointermove', (event) => {
      if (!editingKey()) return;
      const hit = hitEditingLayer(event);
      if (hit) canvas.style.cursor = 'text';
    });
  }

  function bindEditor(editor) {
    // Enter＝換行（core 原本的 Enter＝確認改成 Ctrl/Cmd+Enter）；在 capture 階段攔下，core 的 keydown 監聽不會再收到。
    editor.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      if (event.ctrlKey || event.metaKey) { event.preventDefault(); event.stopImmediatePropagation(); core().TextEditor?.commit?.(); return; }
      event.stopImmediatePropagation(); // 交給 textarea 原生插入換行 → input 事件 → syncFromEditor
    }, { capture: true });
    editor.addEventListener('keyup', () => { restartCaretBlink(); rerender(); });
    editor.addEventListener('input', () => { restartCaretBlink(); afterTextChanged(); });
    editor.addEventListener('compositionstart', () => { state.composing = { start: editor.selectionStart, end: editor.selectionStart }; });
    editor.addEventListener('compositionupdate', (event) => {
      const length = String(event.data || '').length;
      state.composing = { start: editor.selectionEnd - length, end: editor.selectionEnd };
    });
    editor.addEventListener('compositionend', () => { state.composing = null; afterTextChanged(); });
    document.addEventListener('selectionchange', () => {
      if (document.activeElement !== editor || !editingKey()) return;
      restartCaretBlink();
      rerender();
    });
  }

  // ── 接線（__appReady 之後，A 系覆寫檔已套用） ──
  function wireCore() {
    const { Renderer, TextEditor, AppState, Geometry } = core();
    if (!Renderer || !TextEditor || !AppState || !Geometry || Renderer.__textEditingUxWired) return;
    Renderer.__textEditingUxWired = true;
    state.mainCtx = $('canvas')?.getContext('2d') || null;

    const originalDrawText = Renderer.drawText;
    Renderer.drawText = function drawTextRecorded(canvasCtx, key, layer, ...rest) {
      if (canvasCtx !== state.mainCtx) return originalDrawText.call(this, canvasCtx, key, layer, ...rest);
      if (key === AppState.editingLayerKey) {
        drawSelectionUnderText(canvasCtx, key, layer);
        const result = recordEditingLayer(canvasCtx, () => originalDrawText.call(this, canvasCtx, key, layer, ...rest));
        rememberInkBox(key, layer, state.layout);
        return result;
      }
      if (inkFitEnabled() && layer?.type === 'text') {
        // 每個文字層都記下墨跡範圍（點選判定與選取框貼合用；幾何不動）。一層一次 measureText，成本可忽略。
        const { result, layout } = recordDrawText(canvasCtx, () => originalDrawText.call(this, canvasCtx, key, layer, ...rest));
        rememberInkBox(key, layer, layout);
        return result;
      }
      return originalDrawText.call(this, canvasCtx, key, layer, ...rest);
    };

    // ── 選取框貼合（2026-10-06 回饋追加 2／3）：主標／副標／法務小字／價格的選取框與控制點貼著實際文字；圖層幾何不變，輸出不變。
    const originalGetSelectionBox = Geometry.getSelectionBox;
    Geometry.getSelectionBox = function getSelectionBoxInkFit(key, layer, ...rest) {
      const base = originalGetSelectionBox.call(this, key, layer, ...rest);
      if (!inkFitEnabled() || !layer || layer.type !== 'text') return base;
      const ink = state.inkBoxes.get(key);
      if (!ink || ink.text !== String(layer.text || '') || ink.fontSizePx !== layer.fontSizePx) return base;
      return { ...base, x: ink.x, y: ink.y, width: ink.width, height: ink.height, centerX: ink.x + ink.width / 2, centerY: ink.y + ink.height / 2 };
    };
    Renderer.drawTextCaret = function drawTextCaretAtInsertion(canvasCtx, key, layer) {
      drawCaretAndSelection(canvasCtx, key, layer);
    };
    const originalRender = Renderer.render;
    Renderer.render = function renderThenSettleTextBox(...args) {
      const result = originalRender.apply(this, args);
      settleBox();
      return result;
    };
    // 左側 Inspector 的文字控制（字級、顏色、對齊、行距）在編輯中被操作 → 也要重新貼合。
    const textControls = $('textControls');
    ['click', 'input', 'change'].forEach((type) => textControls?.addEventListener(type, markDirty, { capture: true }));

    const originalOpen = TextEditor.open;
    TextEditor.open = function openWithCaretAtEnd(key, ...rest) {
      const result = originalOpen.call(this, key, ...rest);
      if (AppState.editingLayerKey === key && state.editor) {
        state.dirty = false;
        const length = currentText().length;
        state.editor.setSelectionRange(length, length);
        state.editor.focus({ preventScroll: true });
        rerender();
      }
      return result;
    };
    ['commit', 'cancel'].forEach((name) => {
      const original = TextEditor[name];
      TextEditor[name] = function finishEditing(...args) {
        // core 的 commit 會把結尾換行去掉；先在這裡去掉並重新貼合，文字框才不會多留一行空白。
        if (name === 'commit' && state.editor && AppState.editingLayerKey && /\n$/.test(state.editor.value)) {
          state.editor.value = state.editor.value.replace(/\n+$/, '');
          TextEditor.syncFromEditor?.();
          afterTextChanged();
        }
        state.selecting = false; state.composing = null; state.layout = null; state.layoutKey = null; state.dirty = false;
        const canvas = $('canvas'); if (canvas) canvas.style.cursor = '';
        return original.apply(this, args);
      };
    });
  }

  function main() {
    const editor = $('inlineTextEditor');
    if (!editor) return;
    state.editor = shimEditor(editor);
    bindEditor(editor);
    const canvas = $('canvas');
    if (canvas) bindCanvas(canvas);
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wireCore); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.TextEditingUx = Object.freeze({ markDirty, offsetAtPoint, getLayout: () => state.layout });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
