/* 整合版 – 啟動流程（core 載入前）
 *
 * 2026-11-05 自 18節 移植：入口頁改成獨立卡片頁（不再用 iframe＋postMessage 帶工單），工單改由匯入彈窗（modules/import-flow.js）
 * 交給 bootstrap／core；?group= 群組頁（外廣 OM Wave 1／2）依分頁自動選定分類；公版改為內建（templates/<分類>/_bundle.js）。
 *
 * 分類（Profile）必須在 core 載入之前決定，core 才能依分類選用 A／B 兩套模組實作。
 * 所以開頁時只載入這支 bootstrap：
 *   1. 讀網址 ?profile=<分類> → 直接啟用。
 *   2. 讀網址 ?group=<卡片 id>（config/tools.js 裡 profiles 多於一個的卡片，例：外廣 OM 的 Wave 1／2、KOL 的第一單／第二單）
 *      → 等使用者上傳工單，依分頁名在這幾個分類裡自動選定；對不上才請使用者在群組內手動選。
 *   3. 都沒有：等使用者上傳工單：用 XLSX 讀出分頁名 → 填入分頁選單 → 依所選分頁自動偵測分類；也可在「工具分類」下拉手動選。
 * 啟用後由 ProfileLoader 依序載入規則、分類專屬程式、core；core 起來後先載入內建公版（templates/<分類>/_bundle.js），
 * 再把剛上傳的工單交給它，bootstrap 隨即解除自己的監聽，之後所有操作都是 core 在處理（只留一層包裝更新「已載入工單」狀態）。
 */
(function initBootstrap() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const GATED_INPUTS = ['assetInput', 'templateFolderInput', 'generateFromExcelBtn'];
  const listeners = new AbortController();
  /** group：網址 ?group= 對應的卡片（null＝沒有限制）；coreReady：core 已接手，之後的工單直接交給 BatchManager。 */
  const state = { workbookFile: null, sheetNames: [], selectedSheet: '', group: null, coreReady: false };

  const setStatus = (text) => { const el = $('profileStatus'); if (el) el.textContent = text; };
  const setGated = (disabled) => GATED_INPUTS.forEach((id) => { const el = $(id); if (el) el.disabled = disabled; });
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /** 網址 ?group=<id> 對應 config/tools.js 的卡片；找不到就當沒有限制。 */
  function resolveGroup() {
    const groupId = new URLSearchParams(window.location.search).get('group') || '';
    const tool = (window.TOOL_REGISTRY || []).find((entry) => entry.id === groupId);
    return tool && Array.isArray(tool.profiles) && tool.profiles.length ? tool : null;
  }

  /** 有群組限制時只留群組內的分類。 */
  const withinGroup = (profileIds) => (state.group ? profileIds.filter((id) => state.group.profiles.includes(id)) : profileIds);

  /** 「1. 開始」的工單狀態：載入後把按鈕改成「重新上傳工單」，下方顯示檔名與分頁數。 */
  function showWorkbookLoaded(file, sheetCount) {
    const label = $('excelInputLabel'); if (label) label.textContent = '重新上傳工單';
    label?.closest('.upload-btn')?.classList.add('is-loaded');
    const status = $('workbookStatus'); if (!status) return;
    status.innerHTML = `<div><strong>${escapeHtml(file.name)}</strong><small>已載入工單・${sheetCount} 個分頁</small></div>`;
    status.hidden = false;
  }

  async function populateProfileSelect() {
    const select = $('profileSelect'); if (!select) return;
    const index = await window.ProfileLoader.loadIndex();
    const options = state.group ? index.filter((p) => state.group.profiles.includes(p.id)) : index;
    select.innerHTML = '<option value="">（自動偵測）</option>' + options.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`).join('');
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
   *  只有「所有分頁都指向同一個分類」時才直接啟用；否則先請使用者選分頁。
   *  有群組限制時，只看群組內的分類：例如 KOL 工單同時有第一單／第二單分頁，兩頁都在群組內，就請使用者選分頁。 */
  async function readWorkbook(file) {
    if (!file || !window.XLSX) return;
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array', bookSheets: true });
    state.workbookFile = file;
    state.sheetNames = workbook.SheetNames || [];
    await window.ProfileLoader.loadIndex();
    const perSheet = state.sheetNames.map((name) => withinGroup(window.ProfileLoader.detectBySheetNames([name])));
    const matchedSheets = state.sheetNames.filter((_, index) => perSheet[index].length);
    const distinct = new Set(perSheet.flat());
    // 群組頁：只有一個分頁對得上群組就直接用那一頁（其他分頁與這個工具無關）。
    const unanimous = state.sheetNames.length === 1 || (distinct.size === 1 && perSheet.every((list) => list.length === 1))
      || (state.group && matchedSheets.length === 1);
    populateSheetSelect(state.sheetNames, { placeholder: !unanimous });
    if (unanimous && state.group && matchedSheets.length === 1) {
      state.selectedSheet = matchedSheets[0];
      const select = $('excelSheetSelect'); if (select) select.value = state.selectedSheet;
    }
    showWorkbookLoaded(file, state.sheetNames.length);
    const batchStatus = $('batchStatus'); if (batchStatus) batchStatus.textContent = `已讀取：${file.name}${unanimous ? '' : '，請選擇分頁'}`;
    if (unanimous) await detectForSheet(state.selectedSheet);
    else if (state.group && matchedSheets.length > 1) setStatus(`這份工單有 ${matchedSheets.length} 個「${state.group.label}」的分頁（${matchedSheets.join('、')}），請先選要做的分頁。`);
    else setStatus(`這份工單有 ${state.sheetNames.length} 個分頁，對應到不同工具分類；請先選要做的分頁。`);
  }

  /** 唯一命中就啟用；多重命中或無命中請使用者手動選。 */
  async function detectForSheet(sheetName) {
    const loader = window.ProfileLoader;
    if (loader.active || !sheetName) return;
    await loader.loadIndex();
    const candidates = withinGroup(loader.detectBySheetNames([sheetName]));
    const chooser = $('profileChooser');
    if (candidates.length === 1) {
      const select = $('profileSelect'); if (select) select.value = candidates[0];
      await activate(candidates[0], `由分頁「${sheetName}」偵測`);
    } else if (candidates.length > 1) {
      setStatus(`分頁「${sheetName}」同時符合：${candidates.join('、')}，請手動選擇分類。`);
      if (chooser) chooser.open = true;
    } else {
      setStatus(state.group
        ? `分頁「${sheetName}」不是「${state.group.label}」的工單分頁，請換一份工單或手動選擇分類。`
        : `無法由分頁「${sheetName}」判斷分類，請手動選擇。`);
      if (chooser) chooser.open = true;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.async = false;
      el.src = src;
      el.addEventListener('load', () => resolve(src), { once: true });
      el.addEventListener('error', () => reject(new Error(`載入失敗：${src}`)), { once: true });
      document.head.appendChild(el);
    });
  }

  /**
   * 內建公版（18節 2026-10-29 封測回饋：照 Circle，公版放在工具裡，使用者不用上傳）。
   * tests/tools/bundle-templates.js 把 templates/<分類>/*.json 打包成 _bundle.js（file:// 也能用 <script> 載入），
   * 這裡還原成 File 物件、照檔名排序，塞進原本的「上傳公版」input 並觸發 change：core 走同一條
   * loadTemplateFolder()，session-archive 也照樣攔到公版原檔（存檔裡才有公版可載回），輸出與手動上傳完全相同。
   */
  async function loadBuiltinTemplates(profile) {
    const dir = String(profile?.templatesDir || '').replace(/\/+$/, '');
    const input = $('templateFolderInput');
    if (!dir || !input) return;
    await loadScript(`${dir}/_bundle.js`);
    const bundle = window.__templateBundles?.[dir];
    if (!bundle?.files?.length) throw new Error(`內建公版讀取失敗：${dir}/_bundle.js`);
    const files = bundle.files.map(({ name, text }) => {
      const file = new File([text], name, { type: 'application/json', lastModified: 0 });
      Object.defineProperty(file, 'webkitRelativePath', { value: `templates/${name}`, configurable: true });
      return file;
    });
    // FileList 無法建構；core 只用 [...fileList]，用陣列取代即可（與黃金擷取器同一招）。
    // input 在啟用完成前是 disabled（瀏覽器不一定把事件送給 disabled 的表單元件），先暫時打開再觸發。
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    const wasDisabled = input.disabled;
    input.disabled = false;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.disabled = wasDisabled;
    await waitFor(() => (window.AppState?.templates || []).length === files.length - countManifest(files), 30000, '內建公版載入逾時');
  }

  const countManifest = (files) => files.filter((file) => file.name === 'manifest.json').length;

  function waitFor(predicate, timeoutMs, message) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        if (predicate()) return resolve();
        if (Date.now() - startedAt > timeoutMs) return reject(new Error(message));
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  async function activate(profileId, reason) {
    const loader = window.ProfileLoader;
    if (loader.active) { if (loader.active.id !== profileId) loader.reloadWithProfile(profileId); return; }
    setStatus(`載入「${profileId}」…`);
    try {
      await loader.activate(profileId);
      await window.__appReady;
      await loadBuiltinTemplates(loader.active);
      watchCoreWorkbookUploads();
      // 先標記 core 已接手，再交付；交付失敗也要解鎖上傳按鈕，不能讓使用者卡住。
      state.coreReady = true;
      try { await handOffToCore(state.workbookFile, state.selectedSheet); }
      catch (error) { console.error('[Bootstrap] 工單交付 core 失敗', error); alert(`工單讀取失敗：${error?.message || error}\n請在「1. 開始」重新上傳工單。`); }
      listeners.abort();
      setGated(false);
      setStatus(`已啟用：${loader.active.label}${reason ? `（${reason}）` : ''}`);
      const versionLabel = $('profileVersionLabel'); if (versionLabel) versionLabel.textContent = loader.active.label || loader.active.id;
    } catch (error) {
      console.error('[Bootstrap]', error);
      setStatus(`分類啟用失敗：${error?.message || error}`);
      alert(`分類「${profileId}」啟用失敗：${error?.message || error}`);
    }
  }

  /** core 起來後，把 bootstrap 期間上傳的工單與所選分頁交給 core 的 BatchManager。 */
  async function handOffToCore(file, sheetName) {
    if (!file || !window.BatchManager) return;
    await window.BatchManager.handleExcelFile(file);
    const select = $('excelSheetSelect');
    if (select && sheetName && [...select.options].some((option) => option.value === sheetName)) {
      select.value = sheetName;
      window.BatchManager.detectAndOfferProjectsFromSheet?.(sheetName);
    }
  }

  /** core 接手後，使用者在「1. 開始」重新上傳的工單走 core 的 handleExcelFile；包一層只為了更新狀態列，不動 core 行為。 */
  function watchCoreWorkbookUploads() {
    const manager = window.BatchManager;
    if (!manager?.handleExcelFile || manager.handleExcelFile.__bootstrapWatched) return;
    const original = manager.handleExcelFile;
    const watched = async function handleExcelFileWatched(file) {
      const result = await original.call(this, file);
      const sheetNames = window.AppState?.excelWorkbook?.SheetNames;
      if (file && sheetNames) showWorkbookLoaded(file, sheetNames.length);
      return result;
    };
    watched.__bootstrapWatched = true;
    manager.handleExcelFile = watched;
  }

  /** 回饋 4：「重置專案」＝整頁重新載入回到「1. 開始」（不帶 ?profile；群組頁保留 ?group），所有狀態一次乾淨；分類切換本來就得重載。 */
  function bindResetProject() {
    $('resetProjectBtn')?.addEventListener('click', () => {
      if (!confirm('確定要重置專案嗎？\n\n目前的分類、工單、公版、素材、預覽與手動調整都會清掉，回到「1. 開始」。\n（要保留成果請先「儲存存檔」。）')) return;
      const url = new URL(window.location.href);
      url.search = state.group ? `?group=${encodeURIComponent(state.group.id)}` : '';
      window.location.replace(url.toString());
    });
  }

  /** 左上品牌區：群組頁先顯示卡片名稱，分類啟用後換成分類名稱（activate 內更新）。 */
  function showGroupLabel() {
    if (!state.group) return;
    const versionLabel = $('profileVersionLabel'); if (versionLabel) versionLabel.textContent = state.group.label;
    document.title = `${state.group.label} — 25節生成工具`;
    setStatus(`上傳「${state.group.label}」的工單，系統會依分頁自動選定版本。`);
  }

  async function main() {
    setGated(true);
    state.group = resolveGroup();
    showGroupLabel();
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

  /**
   * 給匯入工單彈窗（modules/import-flow.js）用的小介面：
   *   group            — 網址 ?group= 對應的卡片（null＝單一分類頁）
   *   isCoreReady()    — 分類已啟用、core 已接手
   *   detectProfiles(sheetName) — 這個分頁對到哪些分類（有群組限制時只看群組內）
   *   activate(profileId)       — 啟用分類（含載入內建公版）；已啟用就不動
   */
  window.ToolBootstrap = Object.freeze({
    get group() { return state.group; },
    isCoreReady: () => state.coreReady,
    detectProfiles: async (sheetName) => {
      await window.ProfileLoader.loadIndex();
      return withinGroup(window.ProfileLoader.detectBySheetNames([sheetName]));
    },
    activate: (profileId) => activate(profileId, '匯入工單'),
  });

  window.addEventListener('DOMContentLoaded', () => { main().catch((error) => console.error('[Bootstrap]', error)); }, { once: true });
})();
