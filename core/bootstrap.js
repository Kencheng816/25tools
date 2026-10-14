/* 整合版 – 啟動流程（core 載入前）
 *
 * 分類（Profile）必須在 core 載入之前決定，core 才能依分類選用 A／B 兩套模組實作。
 * 所以開頁時只載入這支 bootstrap：
 *   1. 讀網址 ?profile=<分類> → 直接啟用。
 *   2. 否則等使用者上傳工單：用 XLSX 讀出分頁名 → 填入分頁選單 → 依所選分頁自動偵測分類。
 *   3. 也可直接在「工具分類」下拉手動選。
 *   4. 入口頁（index.html）判別用的工單會以 postMessage 送進來，走與手動上傳相同的流程。
 * 啟用後由 ProfileLoader 依序載入規則、分類專屬程式、core；core 起來後把剛上傳的工單交給它，
 * bootstrap 隨即解除自己的監聽，之後所有操作都是 core 在處理（只留一層包裝更新「已載入工單」狀態）。
 */
(function initBootstrap() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const GATED_INPUTS = ['assetInput', 'templateFolderInput', 'generateFromExcelBtn'];
  const listeners = new AbortController();
  /** workbookSource：這份工單怎麼來的（顯示在「1. 開始」狀態列）；coreReady：core 已接手，之後的工單直接交給 BatchManager。 */
  const state = { workbookFile: null, sheetNames: [], selectedSheet: '', workbookSource: '手動上傳', coreReady: false, pendingLauncherReply: null };
  /** 入口頁（index.html）用 postMessage 把工單交過來的訊息型別；用 postMessage 而不是直接碰 iframe 物件，雙擊 index.html（file://）時才不會被同源政策擋下。 */
  const LAUNCHER_MESSAGE = { workbook: 'launcher:workbook', result: 'launcher:workbook-result' };

  const setStatus = (text) => { const el = $('profileStatus'); if (el) el.textContent = text; };
  const setGated = (disabled) => GATED_INPUTS.forEach((id) => { const el = $(id); if (el) el.disabled = disabled; });
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /** 「1. 開始」的工單狀態：載入後把按鈕改成「重新上傳工單」，下方顯示檔名、分頁數與來源。 */
  function showWorkbookLoaded(file, sheetCount, source) {
    const label = $('excelInputLabel'); if (label) label.textContent = '重新上傳工單';
    label?.closest('.upload-btn')?.classList.add('is-loaded');
    const status = $('workbookStatus'); if (!status) return;
    status.innerHTML = `<div><strong>${escapeHtml(file.name)}</strong><small>已載入工單・${sheetCount} 個分頁・${escapeHtml(source)}</small></div>`;
    status.hidden = false;
  }

  async function populateProfileSelect() {
    const select = $('profileSelect'); if (!select) return;
    const index = await window.ProfileLoader.loadIndex();
    const escape = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    select.innerHTML = '<option value="">（自動偵測）</option>' + index.map((p) => `<option value="${escape(p.id)}">${escape(p.label)}</option>`).join('');
  }

  /** placeholder=true 時第一項是「（請選擇分頁）」，使用者選了才偵測分類；否則直接選第一個分頁。 */
  function populateSheetSelect(sheetNames, { placeholder = false } = {}) {
    const select = $('excelSheetSelect'); if (!select) return;
    const options = sheetNames.map((name) => `<option value="${name.replace(/"/g, '&quot;')}">${name}</option>`);
    if (placeholder) options.unshift('<option value="">（請選擇分頁）</option>');
    select.innerHTML = options.join('');
    select.disabled = false;
    state.selectedSheet = placeholder ? '' : (sheetNames[0] || '');
  }

  /** 一份工單可能同時有好幾個工具的分頁（例如跨夜＋鏡面）；分類一旦啟用就要重載才能換，所以要先確定使用者要哪一頁。
   *  只有「所有分頁都指向同一個分類」時才直接啟用；否則先請使用者選分頁。 */
  async function readWorkbook(file) {
    if (!file || !window.XLSX) return;
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array', bookSheets: true });
    state.workbookFile = file;
    state.sheetNames = workbook.SheetNames || [];
    await window.ProfileLoader.loadIndex();
    const perSheet = state.sheetNames.map((name) => window.ProfileLoader.detectBySheetNames([name]));
    const distinct = new Set(perSheet.flat());
    const unanimous = state.sheetNames.length === 1 || (distinct.size === 1 && perSheet.every((list) => list.length === 1));
    populateSheetSelect(state.sheetNames, { placeholder: !unanimous });
    showWorkbookLoaded(file, state.sheetNames.length, state.workbookSource);
    const batchStatus = $('batchStatus'); if (batchStatus) batchStatus.textContent = `已讀取：${file.name}${unanimous ? '' : '，請選擇分頁'}`;
    if (unanimous) await detectForSheet(state.selectedSheet);
    else setStatus(`這份工單有 ${state.sheetNames.length} 個分頁，對應到不同工具分類；請先選要做的分頁。`);
  }

  /** 唯一命中就啟用；多重命中或無命中請使用者手動選。 */
  async function detectForSheet(sheetName) {
    const loader = window.ProfileLoader;
    if (loader.active || !sheetName) return;
    await loader.loadIndex();
    const candidates = loader.detectBySheetNames([sheetName]);
    const chooser = $('profileChooser');
    if (candidates.length === 1) {
      const select = $('profileSelect'); if (select) select.value = candidates[0];
      await activate(candidates[0], `由分頁「${sheetName}」偵測`);
    } else if (candidates.length > 1) {
      setStatus(`分頁「${sheetName}」同時符合：${candidates.join('、')}，請手動選擇分類。`);
      if (chooser) chooser.open = true;
    } else {
      setStatus(`無法由分頁「${sheetName}」判斷分類，請手動選擇。`);
      if (chooser) chooser.open = true;
    }
  }

  async function activate(profileId, reason) {
    const loader = window.ProfileLoader;
    if (loader.active) { if (loader.active.id !== profileId) loader.reloadWithProfile(profileId); return; }
    setStatus(`載入「${profileId}」…`);
    try {
      await loader.activate(profileId);
      await window.__appReady;
      watchCoreWorkbookUploads();
      // 先標記 core 已接手，再交付：交付期間若入口頁的工單剛好送到，會直接走 core 路徑，不會被漏掉。
      state.coreReady = true;
      await handOffToCore(state.workbookFile, state.selectedSheet);
      listeners.abort();
      setGated(false);
      setStatus(`已啟用：${loader.active.label}${reason ? `（${reason}）` : ''}`);
      const versionLabel = $('profileVersionLabel'); if (versionLabel) versionLabel.textContent = loader.active.label || loader.active.id;
      replyToLauncher({ ok: true, sheet: $('excelSheetSelect')?.value || '' });
    } catch (error) {
      replyToLauncher({ ok: false, error: error?.message || String(error) });
      console.error('[Bootstrap]', error);
      setStatus(`分類啟用失敗：${error?.message || error}`);
      alert(`分類「${profileId}」啟用失敗：${error?.message || error}`);
    }
  }

  /** core 起來後，把工單（bootstrap 期間上傳的、或入口頁送來的）與所選分頁交給 core 的 BatchManager。 */
  async function handOffToCore(file, sheetName) {
    if (!file || !window.BatchManager) return;
    await window.BatchManager.handleExcelFile(file);
    const select = $('excelSheetSelect');
    if (select && sheetName && [...select.options].some((option) => option.value === sheetName)) {
      select.value = sheetName;
      window.BatchManager.detectAndOfferProjectsFromSheet?.(sheetName);
    }
  }

  /** 入口頁的工單若是在分類載入中送到，要等 activate() 交付完才回報結果。 */
  function replyToLauncher(payload) {
    const reply = state.pendingLauncherReply;
    state.pendingLauncherReply = null;
    reply?.(payload);
  }

  /** core 接手後，使用者在「1. 開始」重新上傳的工單走 core 的 handleExcelFile；包一層只為了更新狀態列，不動 core 行為。 */
  function watchCoreWorkbookUploads() {
    const manager = window.BatchManager;
    if (!manager?.handleExcelFile || manager.handleExcelFile.__bootstrapWatched) return;
    const original = manager.handleExcelFile;
    const watched = async function handleExcelFileWatched(file) {
      const result = await original.call(this, file);
      const sheetNames = window.AppState?.excelWorkbook?.SheetNames;
      if (file && sheetNames) { showWorkbookLoaded(file, sheetNames.length, state.workbookSource); state.workbookSource = '手動上傳'; }
      return result;
    };
    watched.__bootstrapWatched = true;
    manager.handleExcelFile = watched;
  }

  /**
   * 入口頁送來的工單（{ type, file, preferredSheet }）。core 已接手就直接交給 BatchManager；
   * 分類還在載入（?profile= 啟用中）就先存起來，activate 完成時會一併交付。處理結果回報給入口頁顯示。
   */
  async function receiveWorkbookFromLauncher(event) {
    const data = event.data;
    if (!data || data.type !== LAUNCHER_MESSAGE.workbook || !(data.file instanceof File)) return;
    const reply = (payload) => event.source?.postMessage({ type: LAUNCHER_MESSAGE.result, ...payload }, '*');
    state.workbookSource = '由入口頁帶入';
    try {
      if (state.coreReady) {
        await handOffToCore(data.file, data.preferredSheet);
      } else if (window.ProfileLoader.urlProfile()) {
        state.workbookFile = data.file;
        state.selectedSheet = data.preferredSheet || '';
        state.pendingLauncherReply = reply; // activate() 交付完成後再回報
        return;
      } else {
        await readWorkbook(data.file);
      }
      reply({ ok: true, sheet: $('excelSheetSelect')?.value || data.preferredSheet || '' });
    } catch (error) {
      console.error('[Bootstrap] 入口頁工單帶入失敗', error);
      reply({ ok: false, error: error?.message || String(error) });
    }
  }

  /** 回饋 4：「重置專案」＝整頁重新載入回到「1. 開始」（不帶 ?profile），所有狀態一次乾淨；分類切換本來就得重載。 */
  function bindResetProject() {
    $('resetProjectBtn')?.addEventListener('click', () => {
      if (!confirm('確定要重置專案嗎？\n\n目前的分類、工單、公版、素材、預覽與手動調整都會清掉，回到「1. 開始」。\n（要保留成果請先「儲存存檔」。）')) return;
      const url = new URL(window.location.href);
      url.search = '';
      window.location.replace(url.toString());
    });
  }

  async function main() {
    setGated(true);
    bindResetProject();
    await populateProfileSelect();
    const { signal } = listeners;
    $('profileSelect')?.addEventListener('change', (event) => { if (event.target.value) activate(event.target.value, '手動選擇'); }, { signal });
    $('excelInput')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      try { await readWorkbook(file); }
      catch (error) { console.error('[Bootstrap] 工單讀取失敗', error); alert('工單讀取失敗，請確認檔案格式為 .xlsx / .xls / .xlsm。'); }
    }, { signal });
    $('excelSheetSelect')?.addEventListener('change', (event) => { state.selectedSheet = event.target.value; detectForSheet(event.target.value); }, { signal });

    const fromUrl = window.ProfileLoader.urlProfile();
    if (fromUrl) { const select = $('profileSelect'); if (select) select.value = fromUrl; await activate(fromUrl, '網址參數'); }
  }

  // 入口頁在 iframe load 事件後立刻送工單；監聽器在這裡（腳本解析時）就掛好，不等 DOMContentLoaded，才不會漏接。
  window.addEventListener('message', (event) => { receiveWorkbookFromLauncher(event).catch((error) => console.error('[Bootstrap]', error)); });
  window.addEventListener('DOMContentLoaded', () => { main().catch((error) => console.error('[Bootstrap]', error)); }, { once: true });
})();
