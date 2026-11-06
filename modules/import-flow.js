/* 整合版（自 18節 移植，2026-11-05）— 匯入工單彈窗與「一次套用」流程
 *
 * 18節 2026-10-29 封測回饋（P1-1）：使用者不知道要按「預覽檔案」。照 Circle 的做法改成一個彈窗：
 *   拖工單 Excel → 選分頁（通常自動選好）→ 拖素材資料夾（可選）→ 確認匯入 → 工具自己跑完「素材 → 工單 → 產生所有預覽」。
 * 匯入前畫布蓋一張空狀態卡（公版雖已內建載好，但不先秀出來，免得被當成已套好的成品）。
 *
 * 不改 core：工單仍塞進原本的 #excelInput 觸發 change（core 讀工單、session-archive 攔到原檔），素材走
 * TemplateLoader.loadAssetFolder()，產圖走 BatchManager.generateFromSelectedSheet()——與黃金回歸同一條路。
 * 工單有多個專案時直接用「All」一次做完，不再問；分頁切換在右側批次預覽做。
 * 群組頁（?group=，外廣 OM／KOL）：確認匯入時先依分頁名啟用分類（window.ToolBootstrap），再走同一流程。
 */
(function initImportFlow() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ALL_PROJECTS_VALUE = '__ALL__';
  const IMAGE_FILE = /\.(png|jpe?g|webp|gif|svg)$/i;
  const WORKBOOK_FILE = /\.(xlsx|xlsm|xls)$/i;
  const SLOW_AFTER_MS = 8000;
  const POLL_MS = 500;

  const state = { workbookFile: null, sheetNames: [], assetFiles: [], busy: false, autoOpened: false };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const overlay = () => window.LoadingOverlay;
  const activeProfile = () => window.ProfileLoader?.active || null;
  const isCoreReady = () => !!window.ToolBootstrap?.isCoreReady?.();

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

  // ── 彈窗 DOM ──

  function ensureModal() {
    let modal = $('importModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'importModal';
    modal.className = 'v3-modal-backdrop hidden';
    modal.innerHTML = `
      <div class="v3-modal import-modal" role="dialog" aria-labelledby="importModalTitle">
        <div class="import-modal-head">
          <h3 id="importModalTitle">匯入工單</h3>
          <button type="button" class="import-modal-close" id="importCloseBtn" aria-label="關閉">×</button>
        </div>
        <div id="importZoneExcel" class="import-dropzone" tabindex="0" role="button">
          <span class="import-dropzone-icon" aria-hidden="true">▤</span>
          <strong id="importExcelTitle">拖曳 Excel 工單到這裡</strong>
          <small>或點擊選擇檔案（一次一份）</small>
        </div>
        <label id="importSheetRow" class="import-sheet-row" hidden>
          <span>要做的分頁</span>
          <select id="importSheetSelect" class="word-select"></select>
        </label>
        <div id="importSheetHint" class="import-hint" hidden></div>
        <div id="importZoneAssets" class="import-dropzone" tabindex="0" role="button">
          <span class="import-dropzone-icon" aria-hidden="true">▣</span>
          <strong id="importAssetsTitle">拖曳素材資料夾到這裡（可選）</strong>
          <small>LOGO／商品／票券等圖片；點擊選擇資料夾，或拖整個資料夾進來（G: 雲端硬碟的資料夾請用點擊）</small>
        </div>
        <div class="import-modal-foot">
          <button type="button" class="secondary-btn" id="importLoadArchiveBtn" title="載入之前儲存的 .25tool.zip 存檔，直接回到上次做到一半的狀態">載入存檔</button>
          <span class="import-spacer"></span>
          <button type="button" class="primary-btn" id="importConfirmBtn">確認匯入</button>
        </div>
      </div>
      <input id="importExcelInput" type="file" accept=".xlsx,.xls,.xlsm" hidden />
      <input id="importAssetInput" type="file" webkitdirectory directory multiple hidden />`;
    document.body.appendChild(modal);
    bindModal(modal);
    return modal;
  }

  function openModal() {
    const modal = ensureModal();
    modal.classList.remove('hidden');
    $('importZoneExcel')?.focus();
  }

  /** 關掉也算「這次開頁已經跳過一次」（回歸測試會在開頁後直接關掉，之後不能再自己跳出來擋住操作）。 */
  function closeModal() { $('importModal')?.classList.add('hidden'); state.autoOpened = true; }

  function bindModal(modal) {
    $('importCloseBtn').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => { if (event.target === modal && !state.busy) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.classList.contains('hidden') && !state.busy) closeModal(); });

    const excelInput = $('importExcelInput');
    const assetInput = $('importAssetInput');
    bindDropzone($('importZoneExcel'), () => excelInput.click(), (files) => {
      const file = files.find((entry) => WORKBOOK_FILE.test(entry.name));
      if (file) setWorkbook(file); else alert('請拖曳 .xlsx／.xls／.xlsm 的工單檔。');
    });
    bindDropzone($('importZoneAssets'), () => assetInput.click(), (files) => setAssets(files));
    bindModalDrop(modal);
    excelInput.addEventListener('change', () => { const file = excelInput.files?.[0]; if (file) setWorkbook(file); excelInput.value = ''; });
    assetInput.addEventListener('change', () => { setAssets([...(assetInput.files || [])]); assetInput.value = ''; });
    $('importSheetSelect').addEventListener('change', () => renderSheetHint());
    $('importLoadArchiveBtn').addEventListener('click', () => { closeModal(); $('loadArchiveBtn')?.click(); });
    $('importConfirmBtn').addEventListener('click', () => runImport());
  }

  const FOLDER_UNREADABLE_HINT = '瀏覽器讀不到拖進來的資料夾內容（放在 G: 共用雲端硬碟、檔案還沒下載到本機時常見）。\n\n請改「點擊這一格選擇資料夾」，或在檔案總管把該資料夾設為「離線可用」後再拖一次。';

  /** 點擊＝開檔案選取；拖曳＝接檔案（資料夾會遞迴展開，見 readDroppedFiles）。 */
  function bindDropzone(zone, onClick, onFiles) {
    zone.addEventListener('click', onClick);
    zone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); } });
    ['dragenter', 'dragover'].forEach((type) => zone.addEventListener(type, (event) => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'copy'; zone.classList.add('is-active'); }));
    zone.addEventListener('dragleave', (event) => { event.preventDefault(); event.stopPropagation(); zone.classList.remove('is-active'); });
    zone.addEventListener('drop', async (event) => {
      event.preventDefault(); event.stopPropagation();
      zone.classList.remove('is-active');
      const result = await readDroppedFiles(event.dataTransfer);
      if (result.files.length) {
        onFiles(result.files);
        if (result.failed) alert(`資料夾裡有 ${result.failed} 個項目讀不到（通常是雲端硬碟還沒下載到本機），已先略過。\n要完整匯入請改「點擊這一格選擇資料夾」或把資料夾設為離線可用。`);
      } else alert((result.hadFolder ? FOLDER_UNREADABLE_HINT : '沒有讀到檔案。請直接從檔案總管拖曳檔案或資料夾過來，或點擊這一格用選取的方式。') + dropDebugLine());
    });
  }

  /** 給回報問題用的一行技術資訊（拖曳失敗時附在提示最後）。 */
  function dropDebugLine() {
    const d = window.__importDropDebug;
    if (!d) return '';
    const dirs = d.entries.filter((entry) => entry?.dir).length;
    const nulls = d.entries.filter((entry) => !entry).length;
    return `\n\n（技術資訊：項目 ${d.entries.length}、資料夾 ${dirs}、取不到結構 ${nulls}、Entry 讀到 ${d.read.files}／失敗 ${d.read.failed} ${d.read.errors.join(' ')}、Handle 讀到 ${d.handles.files}／失敗 ${d.handles.failed} ${d.handles.errors.join(' ')}、一般清單 ${d.plain.map((f) => `${f.name}|${f.type || '-'}|${f.size}`).join(' ; ')}；${navigator.userAgent.replace(/^.*?(Chrome\/[\d.]+|Edg\/[\d.]+).*$/, '$1')}；${location.protocol}）`;
  }

  /**
   * 拖曳進來的東西 → { files, hadFolder, failed }。
   * 先走 DataTransferItem.webkitGetAsEntry()（資料夾才讀得到裡面的檔案，並補上 webkitRelativePath 給 core 分資料夾）；
   * 拿不到 entry 或整個讀不出東西時，退回 dataTransfer.files（拖資料夾時那裡只會有資料夾本身，沒有圖片，所以要另外提示）。
   * 注意：DataTransfer 在事件結束後就清空，所以 entry／files 都要在第一個 await 之前先取出來。
   */
  async function readDroppedFiles(dataTransfer) {
    const empty = { files: [], hadFolder: false, failed: 0, errors: [] };
    if (!dataTransfer) return empty;
    const plainFiles = [...(dataTransfer.files || [])];
    const fileItems = [...(dataTransfer.items || [])].filter((item) => item.kind === 'file');
    const entries = fileItems.map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null));
    // File System Access API（Chrome 86+）：webkitGetAsEntry 讀資料夾在部分 Windows Chrome 會失敗，這條路當備援。
    // 一樣要在第一個 await 之前就先要到 promise，不然 DataTransfer 就清空了。
    const handlePromises = fileItems.map((item) => (typeof item.getAsFileSystemHandle === 'function' ? item.getAsFileSystemHandle().catch(() => null) : Promise.resolve(null)));
    const hadFolder = entries.some((entry) => entry?.isDirectory) || plainFiles.some((file) => !file.type && file.size === 0 && !/\.[a-z0-9]{2,5}$/i.test(file.name));
    const read = entries.some(Boolean) ? await readEntries(entries) : { files: [], failed: 0, errors: [] };
    let viaHandles = { files: [], failed: 0, errors: [] };
    if (!read.files.length) viaHandles = await readHandles(await Promise.all(handlePromises));
    const files = read.files.length ? read.files : viaHandles.files;
    window.__importDropDebug = {
      entries: entries.map((entry) => (entry ? { dir: !!entry.isDirectory, name: entry.name } : null)),
      read: { files: read.files.length, failed: read.failed, errors: read.errors.slice(0, 3) },
      handles: { files: viaHandles.files.length, failed: viaHandles.failed, errors: viaHandles.errors.slice(0, 3) },
      plain: plainFiles.map((file) => ({ name: file.name, type: file.type, size: file.size })),
    };
    if (read.failed || viaHandles.failed) console.warn('[ImportFlow] 拖曳的資料夾有項目讀不到', window.__importDropDebug);
    if (files.length) return { files, hadFolder, failed: read.files.length ? read.failed : viaHandles.failed, errors: [] };
    // 退回一般檔案清單；資料夾本身（沒有型別、大小 0）不算檔案
    const usable = plainFiles.filter((file) => file.type || file.size > 0 || /\.[a-z0-9]{2,5}$/i.test(file.name));
    return { files: usable, hadFolder, failed: read.failed + viaHandles.failed, errors: [] };
  }

  function readEntries(entries) {
    const files = [];
    const errors = [];
    const readEntry = (entry) => new Promise((resolve) => {
      if (!entry) return resolve();
      if (entry.isFile) {
        entry.file((file) => {
          Object.defineProperty(file, 'webkitRelativePath', { value: String(entry.fullPath || file.name).replace(/^\/+/, ''), configurable: true });
          files.push(file);
          resolve();
        }, (error) => { errors.push(`${entry.name}:${error?.name || error}`); resolve(); });
        return;
      }
      if (!entry.isDirectory) return resolve();
      const reader = entry.createReader();
      const collected = [];
      const readBatch = () => reader.readEntries(async (batch) => {
        if (batch.length) { collected.push(...batch); readBatch(); return; }
        for (const child of collected) await readEntry(child);
        resolve();
      }, (error) => { errors.push(`${entry.name}/:${error?.name || error}`); resolve(); });
      readBatch();
    });
    return Promise.all(entries.map(readEntry)).then(() => ({ files, failed: errors.length, errors }));
  }

  /** File System Access API 路徑：遞迴走 FileSystemDirectoryHandle，補上 webkitRelativePath。 */
  async function readHandles(handles) {
    const files = [];
    const errors = [];
    async function walk(handle, prefix) {
      if (!handle) return;
      try {
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          Object.defineProperty(file, 'webkitRelativePath', { value: `${prefix}${file.name}`, configurable: true });
          files.push(file);
          return;
        }
        if (handle.kind === 'directory') {
          for await (const child of handle.values()) await walk(child, `${prefix}${handle.name}/`);
        }
      } catch (error) {
        errors.push(`${handle.name}:${error?.name || error}`);
      }
    }
    for (const handle of handles) await walk(handle, '');
    return { files, failed: errors.length, errors };
  }

  /** 整個彈窗都接受拖曳：丟進來的是工單就當工單、是圖片／資料夾就當素材，不用瞄準格子。 */
  function bindModalDrop(modal) {
    const panel = modal.querySelector('.import-modal');
    ['dragenter', 'dragover'].forEach((type) => panel.addEventListener(type, (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }));
    panel.addEventListener('drop', async (event) => {
      event.preventDefault();
      const result = await readDroppedFiles(event.dataTransfer);
      const { files } = result;
      if (!files.length) { if (result.hadFolder) alert(FOLDER_UNREADABLE_HINT + dropDebugLine()); return; }
      const workbook = files.find((file) => WORKBOOK_FILE.test(file.name));
      const images = files.filter((file) => IMAGE_FILE.test(file.name));
      if (workbook) setWorkbook(workbook);
      if (images.length) setAssets(images);
      if (!workbook && !images.length) alert(result.hadFolder ? FOLDER_UNREADABLE_HINT : '拖進來的不是工單 Excel 或圖片資料夾。');
    });
    // 拖到彈窗外面放開：瀏覽器預設會直接開啟那個檔案，把它擋掉
    ['dragover', 'drop'].forEach((type) => modal.addEventListener(type, (event) => { if (event.target === modal) event.preventDefault(); }));
  }

  // ── 工單與分頁 ──

  async function setWorkbook(file) {
    state.workbookFile = file;
    state.sheetNames = [];
    const title = $('importExcelTitle');
    title.textContent = `已選擇：${file.name}`;
    $('importZoneExcel').classList.add('is-done');
    try {
      const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array', bookSheets: true });
      state.sheetNames = workbook.SheetNames || [];
    } catch (error) {
      console.error('[ImportFlow] 工單讀取失敗', error);
      alert('工單讀取失敗，請確認檔案格式為 .xlsx / .xls / .xlsm。\n\n檔案若放在 G: 共用雲端硬碟，請先在檔案總管確認它已下載到本機（圖示有綠色勾），或先複製到桌面再拖進來。');
      state.workbookFile = null;
      title.textContent = '拖曳 Excel 工單到這裡';
      $('importZoneExcel').classList.remove('is-done');
      return;
    }
    await renderSheetSelect();
  }

  /** 這個分頁對到哪些分類：單一分類頁只認目前分類；群組頁看群組內（由 ToolBootstrap 處理）。 */
  async function profilesForSheet(sheetName) {
    const candidates = await window.ToolBootstrap.detectProfiles(sheetName);
    const active = activeProfile();
    return active ? candidates.filter((id) => id === active.id) : candidates;
  }

  /** 分頁名「完全等於」某個分類的 sheetHints（trim 後）才算精準命中；只是包含關鍵字的算部分命中。 */
  async function isExactSheetMatch(sheetName, profileIds) {
    const index = await window.ProfileLoader.loadIndex();
    const name = String(sheetName).trim();
    return profileIds.some((id) => ((index.find((profile) => profile.id === id)?.sheetHints) || []).some((hint) => String(hint).trim() === name));
  }

  /**
   * 2026-11-05 25節 封測 P0-3：工單同時有「Line OA」「LineOA_Wave1」與「CopyRita原本的Line OA」三個分頁，
   * 以前把「包含關鍵字」的備份分頁也當成候選、還排在前面，使用者就拿它去產圖（當然什麼都做不出來）。
   * 改成：有「分頁名完全等於關鍵字」的精準命中時，只打 ✓ 精準命中的；沒有精準命中才退回部分命中。
   */
  async function renderSheetSelect() {
    const select = $('importSheetSelect');
    const exact = [];
    const partial = [];
    for (const name of state.sheetNames) {
      const ids = await profilesForSheet(name);
      if (!ids.length) continue;
      (await isExactSheetMatch(name, ids) ? exact : partial).push(name);
    }
    const matched = exact.length ? exact : partial;
    select.innerHTML = state.sheetNames.map((name) =>
      `<option value="${escapeHtml(name)}">${matched.includes(name) ? '✓ ' : ''}${escapeHtml(name)}</option>`).join('');
    select.value = matched[0] || state.sheetNames[0] || '';
    $('importSheetRow').hidden = state.sheetNames.length === 0;
    state.matchedSheets = matched;
    renderSheetHint();
  }

  function renderSheetHint() {
    const hint = $('importSheetHint');
    const sheet = $('importSheetSelect').value;
    const matched = state.matchedSheets || [];
    const toolLabel = activeProfile()?.label || window.ToolBootstrap?.group?.label || '這個工具';
    if (!sheet) { hint.hidden = true; return; }
    if (!matched.length) { hint.textContent = `這份工單沒有「${toolLabel}」的分頁，請確認工單是否正確。`; hint.className = 'import-hint is-warning'; hint.hidden = false; return; }
    if (!matched.includes(sheet)) { hint.textContent = `分頁「${sheet}」看起來不是「${toolLabel}」的分頁（打 ✓ 的才是）。`; hint.className = 'import-hint is-warning'; hint.hidden = false; return; }
    hint.textContent = matched.length > 1 ? `這份工單有 ${matched.length} 個分頁可做（打 ✓），一次做一個。` : '';
    hint.className = 'import-hint';
    hint.hidden = !hint.textContent;
  }

  function setAssets(files) {
    state.assetFiles = files.filter((file) => IMAGE_FILE.test(file.name));
    $('importAssetsTitle').textContent = state.assetFiles.length ? `已選擇 ${state.assetFiles.length} 張素材圖片` : '資料夾裡沒有讀到圖片檔，請點擊這一格重新選擇資料夾';
    $('importZoneAssets').classList.toggle('is-done', state.assetFiles.length > 0);
  }

  // ── 確認匯入：分類 → 素材 → 工單 → 分頁／專案 → 產生預覽 ──

  function feedInput(input, files) {
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    const wasDisabled = input.disabled;
    input.disabled = false;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.disabled = wasDisabled;
  }

  async function ensureProfileFor(sheetName) {
    if (isCoreReady()) return;
    const ids = await window.ToolBootstrap.detectProfiles(sheetName);
    const groupLabel = window.ToolBootstrap.group?.label || '這個工具';
    if (!ids.length) throw new Error(`分頁「${sheetName}」不是「${groupLabel}」的工單分頁，請換一份工單或換分頁。`);
    if (ids.length > 1) throw new Error(`分頁「${sheetName}」同時符合 ${ids.join('、')}，請換一個分頁。`);
    overlay()?.show('載入工具與公版…');
    await window.ToolBootstrap.activate(ids[0]);
    if (activeProfile()?.id !== ids[0]) throw new Error('工具啟用失敗，請重新整理再試。');
  }

  async function applyAssets() {
    if (!state.assetFiles.length) return;
    overlay()?.show(`讀取素材 ${state.assetFiles.length} 張…`);
    await window.TemplateLoader.loadAssetFolder(state.assetFiles);
  }

  async function applyWorkbook(file) {
    overlay()?.show(`讀取工單：${file.name}`);
    const appState = window.AppState;
    appState.excelWorkbook = null;
    appState.excelFileName = '';
    feedInput($('excelInput'), [file]);
    await waitFor(() => !!appState.excelWorkbook && appState.excelFileName === file.name, 60000, '工單讀取逾時');
  }

  function selectSheetAndProject(sheetName) {
    const select = $('excelSheetSelect');
    if (select && [...select.options].some((option) => option.value === sheetName)) select.value = sheetName;
    window.BatchManager.detectAndOfferProjectsFromSheet?.(sheetName);
    // 工單有多個專案：一律全部一起做，右側批次預覽再分專案看。
    const projects = window.AppState.detectedExcelProjects || [];
    window.AppState.currentProject = projects.length ? ALL_PROJECTS_VALUE : '';
    window.TemplateLoader.updateCurrentProjectDisplay?.();
  }

  async function runImport() {
    if (state.busy) return;
    if (!state.workbookFile) { alert('請先選擇工單 Excel。'); return; }
    const sheetName = $('importSheetSelect').value;
    const confirmBtn = $('importConfirmBtn');
    state.busy = true;
    confirmBtn.disabled = true;
    try {
      await ensureProfileFor(sheetName);
      closeModal();
      await applyAssets();
      await applyWorkbook(state.workbookFile);
      selectSheetAndProject(sheetName);
      overlay()?.show('產生預覽…');
      await window.BatchManager.generateFromSelectedSheet();
      // 2026-11-02：工單有「A + B」多張商品的製作物 → 產圖後自動開商品合成視窗逐張確認（modules/product-composer.js）
      document.dispatchEvent(new CustomEvent('importflow:generated'));
    } catch (error) {
      console.error('[ImportFlow] 匯入失敗', error);
      alert(`匯入失敗：${error?.message || error}`);
    } finally {
      overlay()?.hide();
      state.busy = false;
      confirmBtn.disabled = false;
      syncEmptyState();
    }
  }

  // ── 空狀態（匯入前蓋住畫布） ──

  function ensureEmptyState() {
    let box = $('importEmptyState');
    if (box) return box;
    const shell = document.querySelector('.canvas-shell');
    if (!shell) return null;
    box = document.createElement('div');
    box.id = 'importEmptyState';
    box.className = 'import-empty';
    box.innerHTML = `
      <div class="import-empty-card">
        <h3>尚未匯入工單</h3>
        <p>匯入工單與素材後，會自動產生所有版位的預覽。</p>
        <button type="button" class="primary-btn" id="importEmptyBtn">匯入工單</button>
        <small id="importEmptyHint">公版載入中…</small>
      </div>`;
    shell.appendChild(box);
    $('importEmptyBtn').addEventListener('click', openModal);
    return box;
  }

  /** 2026-11-04 封測回饋：從入口頁點進工具就直接跳出匯入彈窗（公版載好、或群組頁一進來），不用再找「匯入工單」按；每次開頁只自動跳一次，關掉就不再煩。 */
  function autoOpenOnce() {
    if (state.autoOpened) return;
    const ready = window.ToolBootstrap?.group ? !!window.ToolBootstrap : (isCoreReady() && (window.AppState?.templates || []).length > 0);
    if (!ready) return;
    state.autoOpened = true;
    openModal();
  }

  function syncEmptyState() {
    const box = ensureEmptyState();
    if (!box) return;
    const appState = window.AppState;
    const imported = !!(appState?.batchMode && (appState.batchItems || []).length);
    box.hidden = imported;
    if (imported) return;
    autoOpenOnce();
    const hint = $('importEmptyHint');
    const templateCount = (appState?.templates || []).length;
    if (!isCoreReady()) hint.textContent = window.ToolBootstrap?.group ? '匯入工單後會依分頁自動選定版本並載入公版' : '工具載入中…';
    else hint.textContent = templateCount ? `已內建 ${templateCount} 個公版 ✓` : '公版載入中…';
  }

  // ── 進度視窗太久沒動：給一個出口 ──

  function watchSlowOverlay() {
    let lastKey = '';
    let lastChangeAt = Date.now();
    setInterval(() => {
      const el = $('assetLoadingOverlay');
      const open = el && el.classList.contains('is-open');
      const key = open ? `${$('assetLoadingText')?.textContent}|${$('assetLoadingPercent')?.textContent}` : '';
      if (key !== lastKey) { lastKey = key; lastChangeAt = Date.now(); el?.querySelector('.import-slow-btn')?.remove(); }
      if (!open || Date.now() - lastChangeAt < SLOW_AFTER_MS || el.querySelector('.import-slow-btn')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary-btn import-slow-btn';
      button.textContent = '先關掉視窗，背景繼續';
      button.addEventListener('click', () => overlay()?.hide());
      el.querySelector('.asset-loading-card')?.appendChild(button);
    }, POLL_MS);
  }

  function bindUI() {
    $('importWorkbookBtn')?.addEventListener('click', openModal);
    syncEmptyState();
    setInterval(syncEmptyState, POLL_MS);
    watchSlowOverlay();
  }

  window.ImportFlow = Object.freeze({ open: openModal, close: closeModal, run: runImport, setWorkbook, setAssets });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bindUI, { once: true });
  else bindUI();
})();
