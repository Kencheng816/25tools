/* 25節 整合版 — 單一入口（對齊 18節 整合版的入口頁）
 *
 * 職責：列出工具、依工單分頁名判別工具、把選到的工具（app.html?profile=<id>）載進 iframe，
 * 並把判別用的工單直接交給工具的「1. 開始 → 上傳工單」（不必上傳兩次）。
 * 工具清單在 config/tools.js；輸出經 tests/run-golden 驗證與原工具一致。
 */
(function initLauncher() {
  'use strict';

  const TOOLS = window.TOOL_REGISTRY || [];
  const $ = (id) => document.getElementById(id);
  const DOM = {
    select: $('toolSelect'), grid: $('toolGrid'), frame: $('toolFrame'), welcome: $('welcome'),
    detectInput: $('detectInput'), detectStatus: $('detectStatus'), reloadBtn: $('reloadBtn'), openTabLink: $('openTabLink'),
  };

  const toolPath = (id) => `app.html?profile=${encodeURIComponent(id)}`;
  const findTool = (id) => TOOLS.find((tool) => tool.id === id) || null;

  /** 依分頁名對 sheetHints 打分；回傳命中的工具（分數高者在前）。 */
  function detectTools(sheetNames) {
    return TOOLS
      .map((tool) => ({ tool, score: sheetNames.filter((name) => tool.sheetHints.some((hint) => name.includes(hint))).length }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.tool);
  }

  function renderToolList() {
    const groups = [...new Set(TOOLS.map((tool) => tool.group))];
    DOM.select.innerHTML = '<option value="">— 請選擇工具 —</option>' + groups.map((group) => `
      <optgroup label="${escapeHtml(group)}">
        ${TOOLS.filter((tool) => tool.group === group).map((tool) => `<option value="${escapeHtml(tool.id)}">${escapeHtml(tool.label)}（${escapeHtml(tool.version)}）</option>`).join('')}
      </optgroup>`).join('');

    DOM.grid.innerHTML = TOOLS.map((tool) => `
      <button type="button" class="launcher-card" data-id="${escapeHtml(tool.id)}">
        <small>${escapeHtml(tool.group)}</small>
        <strong>${escapeHtml(tool.label)}</strong>
        <span>${escapeHtml(tool.version)}</span>
      </button>`).join('');
  }

  /** 最近一次「上傳工單自動判別」的工單；開工具後直接交給工具的「1. 開始 → 上傳工單」，不用再上傳一次。 */
  let pendingWorkbook = null;

  /** 與工具頁 core/bootstrap.js 約定的訊息型別。 */
  const LAUNCHER_MESSAGE = { workbook: 'launcher:workbook', result: 'launcher:workbook-result' };
  const HAND_OFF_TIMEOUT_MS = 30000;
  let handOffTimer = null;

  /**
   * 工具頁載入後，用 postMessage 把工單檔與要選的分頁送給它的 bootstrap（等同使用者在「1. 開始」上傳工單）。
   * 用 postMessage 而不是直接碰 iframe 的物件：雙擊 index.html（file://）時每個頁面都是獨立來源，直接存取會被同源政策擋下。
   * 結果由工具頁回報（launcher:workbook-result）；逾時或失敗就提示使用者在工具內手動上傳。
   */
  function handOffWorkbook(tool) {
    if (!pendingWorkbook) return;
    const { file, sheetNames } = pendingWorkbook;
    // sheetHints 依「先具體、後概括」排列（例：'攻略頁_GD做圖列表' 在 '攻略頁' 前），依序找第一個命中的分頁，
    // 工單同時有「新版配_攻略頁」與「攻略頁_GD做圖列表」時才會選到正確那頁。
    const preferredSheet = tool.sheetHints.map((hint) => sheetNames.find((name) => name.includes(hint))).find(Boolean) || '';
    DOM.detectStatus.textContent = `判別為「${tool.label}」，正在把工單「${file.name}」帶入工具…`;
    DOM.frame.contentWindow.postMessage({ type: LAUNCHER_MESSAGE.workbook, file, preferredSheet }, '*');
    clearTimeout(handOffTimer);
    handOffTimer = setTimeout(() => showHandOffResult(tool, file, { ok: false, error: '工具頁逾時未回應' }), HAND_OFF_TIMEOUT_MS);
  }

  function showHandOffResult(tool, file, result) {
    clearTimeout(handOffTimer);
    if (result.ok) {
      DOM.detectStatus.textContent = `判別為「${tool.label}」，工單「${file.name}」已帶入${result.sheet ? `（分頁：${result.sheet}）` : ''}`;
    } else {
      console.warn('[launcher] 工單帶入失敗：', result.error);
      DOM.detectStatus.textContent = `判別為「${tool.label}」，但工單帶入失敗，請在工具內「1. 開始」手動上傳`;
    }
  }

  function bindHandOffResult() {
    window.addEventListener('message', (event) => {
      if (event.source !== DOM.frame.contentWindow || event.data?.type !== LAUNCHER_MESSAGE.result) return;
      const tool = findTool(DOM.select.value);
      if (tool && pendingWorkbook) showHandOffResult(tool, pendingWorkbook.file, event.data);
    });
  }

  function openTool(id) {
    const tool = findTool(id);
    if (!tool) return;
    DOM.select.value = tool.id;
    DOM.frame.addEventListener('load', () => handOffWorkbook(tool), { once: true });
    DOM.frame.src = toolPath(tool.id);
    DOM.frame.hidden = false;
    DOM.welcome.hidden = true;
    DOM.openTabLink.href = toolPath(tool.id);
    DOM.openTabLink.hidden = false;
    document.title = `${tool.label}（${tool.version}）— 25節生成工具`;
    highlightCards([tool.id]);
  }

  function highlightCards(ids) {
    document.querySelectorAll('.launcher-card').forEach((card) => card.classList.toggle('is-hit', ids.includes(card.dataset.id)));
  }

  async function detectFromWorkbook(file) {
    if (!file) return;
    if (!window.XLSX) { DOM.detectStatus.textContent = '讀不到 xlsx 程式庫（vendor/xlsx-0.18.5.full.min.js）'; return; }
    DOM.detectStatus.textContent = `讀取 ${file.name}…`;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', bookSheets: true });
      const sheetNames = workbook.SheetNames || [];
      pendingWorkbook = { file, sheetNames };
      const hits = detectTools(sheetNames);
      if (!hits.length) { DOM.detectStatus.textContent = '分頁名對不到任何工具，請手動選擇（選了工具後工單一樣會帶入）'; highlightCards([]); return; }
      highlightCards(hits.map((tool) => tool.id));
      if (hits.length === 1) {
        DOM.detectStatus.textContent = `判別為「${hits[0].label}」`;
        openTool(hits[0].id);
      } else {
        DOM.detectStatus.textContent = `工單同時符合：${hits.map((tool) => tool.label).join('、')}，請點選其中一個`;
        DOM.welcome.hidden = false; DOM.frame.hidden = true;
      }
    } catch (error) {
      DOM.detectStatus.textContent = `工單讀取失敗：${error.message || error}`;
    } finally {
      DOM.detectInput.value = '';
    }
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function bindUI() {
    DOM.select.addEventListener('change', (event) => { if (event.target.value) openTool(event.target.value); });
    DOM.grid.addEventListener('click', (event) => { const card = event.target.closest('.launcher-card'); if (card) openTool(card.dataset.id); });
    DOM.detectInput.addEventListener('change', (event) => detectFromWorkbook(event.target.files?.[0]));
    DOM.reloadBtn.addEventListener('click', () => { if (!DOM.frame.hidden) DOM.frame.contentWindow?.location.reload(); });
    // 網址帶 #tool=<id> 可直接開某工具（方便書籤／分享）。
    const hashTool = new URLSearchParams(location.hash.replace(/^#/, '')).get('tool');
    if (hashTool && findTool(hashTool)) openTool(hashTool);
  }

  renderToolList();
  bindHandOffResult();
  bindUI();
})();
