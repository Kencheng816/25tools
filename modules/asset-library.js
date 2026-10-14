/* 整合版（自 18節 移植）— 素材庫＋圖片圖層右鍵選單
 *
 * 2026-10-06 回饋第 6 項。與使用者談定的體驗：
 *   - 右鍵圖片圖層 → 小選單：從素材庫替換… ／ 上傳檔案替換… ／ 清除圖片 ／ 連動 開／關（這一張）
 *   - 點已清除的空槽 → 同一個小選單（素材庫／上傳）
 *   - Inspector「素材庫」按鈕、快捷鍵 L（有選圖層：貼著圖層的浮動面板並鎖定該圖層；沒選：右側抽屜瀏覽模式）
 *   - 面板：搜尋（忽略大小寫／底線／空白／括號）、格狀縮圖（被幾張使用、目前使用打勾）、「＋手動上傳」（放進共用素材資料夾）、「套用到其他同素材版位」
 *   - 清單只列專案共用素材資料夾（素材／共用／shared／common）的檔案；沒有就列全部（2026-10-07 回饋，同時拿掉資料夾 chip 與最近使用）
 *   - 防誤觸：單擊＝選取＋主畫布即時預覽（非正式）；方向鍵在素材間移動；雙擊／Enter／「套用」才正式替換；Esc／點外面還原；
 *     套用後 toast 附「復原」5 秒；把素材拖到畫布圖層上也算確認
 * 替換一律走 ManualAssetControls.replaceLayerAsset（裁透明邊、等比貼合、記 override、刷新縮圖）。只影響互動，不改自動產圖輸出。
 */
(function initAssetLibrary() {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DRAG_TYPE = 'application/x-asset-lookup';
  const core = () => ({
    AppState: window.AppState, AssetStore: window.AssetStore, Geometry: window.Geometry, LayerManager: window.LayerManager, Renderer: window.Renderer,
    Inspector: window.Inspector, HistoryManager: window.HistoryManager, ManualAssetUpload: window.ManualAssetUpload, ManualAssetControls: window.ManualAssetControls,
    LinkSync: window.LinkSync, LinkSyncUI: window.LinkSyncUI, AssetLinkSync: window.AssetLinkSync,
  });
  const normalize = (value) => String(value || '').toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[\s　_\-()（）\[\]【】.]+/g, '');
  const baseName = (value) => String(value || '').split(/[\\/]/).pop();

  const state = {
    root: null, menu: null, toast: null,
    open: false, mode: 'layer',            // 'layer'＝鎖定圖層的浮動面板；'browse'＝右側抽屜
    target: null,                          // { key, layer, template }
    entries: [], filtered: [], query: '', sharedFolder: '',
    selectedIndex: -1,
    preview: null,                         // { key, layer, template, snapshot, image }
    urls: new Map(),                       // file → object URL（關閉時釋放）
    applyToGroup: true,
  };

  // ── 資料 ──
  function loadEntries() {
    const { AssetStore } = core();
    const entries = (AssetStore?.getFileEntries?.() || []).filter((entry) => entry?.file && /^image\//i.test(entry.file.type || '') || /\.(png|jpe?g|webp|gif|svg)$/i.test(entry?.filename || ''));
    const usage = usageMap();
    // 原工具把同一個素材用「相對路徑」與「純檔名」各登記一次 → 以 File 物件去重，只列一次。
    const seen = new Set();
    const unique = entries.filter((entry) => { if (seen.has(entry.file)) return false; seen.add(entry.file); return true; });
    const all = unique.map((entry) => ({ ...entry, norm: normalize(entry.filename), folderLabel: entry.folder || '（根目錄）', uses: usage.get(normalize(entry.filename)) || 0 }));
    // 只列「專案共用素材資料夾」（素材／共用／shared／common）的檔案；沒有這個資料夾才列全部（2026-10-07 回饋）。
    const shared = sharedFolderName(all);
    state.sharedFolder = shared;
    const scoped = shared ? all.filter((entry) => folderBase(entry.folderLabel) === shared) : all;
    return scoped.sort((a, b) => a.filename.localeCompare(b.filename, 'zh-Hant'));
  }

  const SHARED_FOLDER_PATTERN = /^(素材|共用|共用素材|shared|common)$/i;
  const folderBase = (folder) => String(folder || '').split('/').pop();
  /** 專案共用素材資料夾：上傳的素材根目錄底下名為 素材／共用／shared／common 的資料夾（回傳該資料夾名；找不到回傳 ''）。 */
  function sharedFolderName(entries) {
    const found = entries.find((entry) => SHARED_FOLDER_PATTERN.test(folderBase(entry.folderLabel)));
    return found ? folderBase(found.folderLabel) : '';
  }

  /** 每個素材目前被幾張版位使用（以檔名 normalize 比對）。 */
  function usageMap() {
    const { AppState } = core();
    const map = new Map();
    (AppState?.templates || []).forEach((item) => {
      Object.values((item?.data || item)?.layers || {}).forEach((layer) => {
        if (layer?.type !== 'image' || !layer.assetFilename) return;
        const key = normalize(baseName(layer.assetFilename));
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return map;
  }

  function urlFor(file) {
    if (!state.urls.has(file)) state.urls.set(file, URL.createObjectURL(file));
    return state.urls.get(file);
  }
  function releaseUrls() { state.urls.forEach((url) => URL.revokeObjectURL(url)); state.urls.clear(); }


  // ── 面板 DOM ──
  function build() {
    const root = document.createElement('div');
    root.id = 'assetLibrary';
    root.className = 'asset-library hidden';
    root.innerHTML = `
      <div class="al-head">
        <strong class="al-title">素材庫</strong>
        <span class="al-target"></span>
        <button type="button" class="al-close" data-action="close" title="關閉（Esc）">✕</button>
      </div>
      <div class="al-search-row">
        <input type="search" class="al-search" placeholder="輸入檔名片段搜尋…" aria-label="搜尋素材" />
        <span class="al-count"></span>
      </div>
      <div class="al-grid" role="listbox"></div>
      <div class="al-foot">
        <label class="al-upload" title="上傳圖片到專案共用素材資料夾（素材庫會列出、存檔會一併打包）"><input type="file" accept="image/*" multiple hidden />＋ 手動上傳</label>
        <label class="al-group"><input type="checkbox" class="al-group-check" checked /> 同時套用到其他同素材版位</label>
        <button type="button" class="primary-btn al-apply" data-action="apply" disabled>套用</button>
      </div>
      <div class="al-preview-hint hidden">預覽中：雙擊／Enter／「套用」才會正式替換，Esc 還原</div>`;
    document.body.appendChild(root);
    return root;
  }

  function buildMenu() {
    const menu = document.createElement('div');
    menu.id = 'assetContextMenu';
    menu.className = 'asset-context-menu hidden';
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);
    return menu;
  }

  function buildToast() {
    const toast = document.createElement('div');
    toast.id = 'assetLibraryToast';
    toast.className = 'al-toast hidden';
    document.body.appendChild(toast);
    return toast;
  }

  // ── 開關 ──
  function open({ key, layer, template, mode, anchorEvent } = {}) {
    const { AppState } = core();
    state.mode = mode || (key ? 'layer' : 'browse');
    state.target = key && layer ? { key, layer, template: template || AppState.template } : null;
    state.entries = loadEntries();
    state.query = ''; state.selectedIndex = -1;
    state.root.classList.remove('hidden');
    state.root.classList.toggle('is-drawer', state.mode === 'browse');
    state.root.classList.toggle('is-floating', state.mode === 'layer');
    state.root.querySelector('.al-search').value = '';
    state.root.querySelector('.al-target').textContent = state.target ? `替換：${state.target.layer.psdName || state.target.key}` : '瀏覽全部素材';
    state.root.querySelector('.al-group').classList.toggle('hidden', !state.target);
    state.open = true;
    renderGrid();
    position(anchorEvent);
    setTimeout(() => state.root.querySelector('.al-search').focus(), 0);
  }

  function close({ keepPreview = false } = {}) {
    if (!state.open) return;
    if (!keepPreview) revertPreview();
    state.root.classList.add('hidden');
    state.open = false;
    state.selectedIndex = -1;
    releaseUrls();
    const { Renderer } = core();
    Renderer?.render?.();
  }

  /** layer 模式：貼著圖層（右側放不下就放左側／下方）；browse 模式：固定右側抽屜（CSS）。 */
  function position(anchorEvent) {
    if (state.mode !== 'layer' || !state.target) { state.root.style.left = ''; state.root.style.top = ''; return; }
    const { Geometry } = core();
    const box = Geometry.getLayerBox(state.target.key, state.target.layer);
    const rect = Geometry.screenRectForBox(box);
    const width = state.root.offsetWidth || 360;
    const height = state.root.offsetHeight || 480;
    let left = rect.left + rect.width + 12;
    if (left + width > window.innerWidth - 8) left = rect.left - width - 12;
    if (left < 8) left = Math.max(8, Math.min(anchorEvent?.clientX ?? rect.left, window.innerWidth - width - 8));
    let top = Math.max(8, Math.min(rect.top, window.innerHeight - height - 8));
    state.root.style.left = `${Math.round(left)}px`;
    state.root.style.top = `${Math.round(top)}px`;
  }

  // ── 列表 ──
  function applyFilter() {
    const query = normalize(state.query);
    state.filtered = state.entries.filter((entry) => !query || entry.norm.includes(query));
    // 與目標圖層同資料夾的排前面（例如選的是 LOGO 層就先列 LOGO 資料夾）
    const currentFolder = state.target ? state.entries.find((entry) => normalize(entry.filename) === normalize(baseName(state.target.layer.assetFilename)))?.folderLabel : null;
    if (currentFolder) state.filtered.sort((a, b) => (b.folderLabel === currentFolder) - (a.folderLabel === currentFolder));
  }

  function renderGrid() {
    applyFilter();
    const grid = state.root.querySelector('.al-grid');
    const currentName = state.target ? normalize(baseName(state.target.layer.assetFilename)) : '';
    grid.innerHTML = state.filtered.length
      ? state.filtered.map((entry) => tile(entry, state.entries.indexOf(entry), false, entry.norm === currentName)).join('')
      : '<div class="al-empty">沒有符合的素材</div>';
    state.root.querySelector('.al-count').textContent = `${state.filtered.length} / ${state.entries.length}`;
    highlightSelected();
  }

  function tile(entry, index, compact = false, isCurrent = false) {
    return `
      <button type="button" class="al-tile ${compact ? 'is-compact' : ''} ${isCurrent ? 'is-current' : ''}" role="option" data-index="${index}" draggable="true" title="${escapeHtml(entry.relativePath || entry.filename)}">
        <span class="al-thumb"><img src="${urlFor(entry.file)}" alt="" loading="lazy" /></span>
        ${entry.uses ? `<span class="al-uses" title="目前被 ${entry.uses} 張使用">${entry.uses}</span>` : ''}
        ${isCurrent ? '<span class="al-current" title="這一層目前使用">✓</span>' : ''}
        <span class="al-name">${escapeHtml(entry.filename)}</span>
        ${compact ? '' : `<small class="al-folder">${escapeHtml(entry.folderLabel)}</small>`}
      </button>`;
  }

  function highlightSelected() {
    state.root.querySelectorAll('.al-tile').forEach((node) => node.classList.toggle('is-selected', Number(node.dataset.index) === state.selectedIndex));
    const apply = state.root.querySelector('.al-apply');
    apply.disabled = state.selectedIndex < 0 || !state.target;
    state.root.querySelector('.al-preview-hint').classList.toggle('hidden', !state.preview);
  }

  // ── 選取即預覽（非正式） ──
  async function select(index, { scrollIntoView = true } = {}) {
    state.selectedIndex = index;
    highlightSelected();
    if (scrollIntoView) state.root.querySelector(`.al-grid .al-tile[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
    if (state.target) await previewEntry(state.entries[index]);
  }

  const GEOMETRY_FIELDS = ['x', 'y', 'width', 'height', 'centerX', 'centerY', 'targetWidth', 'targetHeight', 'maxTargetHeight', 'keepAspectRatio', 'sizingMode', 'fitMode'];

  async function previewEntry(entry) {
    const { AppState, ManualAssetUpload, Renderer } = core();
    const target = state.target;
    if (!entry || !target || target.template !== AppState.template) return;
    if (!state.preview) {
      const snapshot = {};
      GEOMETRY_FIELDS.forEach((field) => { snapshot[field] = target.layer[field]; });
      state.preview = { key: target.key, layer: target.layer, template: target.template, snapshot, image: AppState.images?.[target.key] || null, cleared: target.layer.__assetCleared === true, prices: window.CouponPriceSync?.snapshotPrices?.(target.template) || null };
    }
    // 和正式替換走同一套幾何（裁透明邊、等比貼合），預覽看到的就是最後的樣子。
    const prepared = await ManualAssetUpload.prepareImageFile(entry.file).catch(() => ({ file: entry.file, width: 0, height: 0 }));
    GEOMETRY_FIELDS.forEach((field) => { if (state.preview.snapshot[field] === undefined) delete target.layer[field]; else target.layer[field] = state.preview.snapshot[field]; });
    if (prepared.width && prepared.height) ManualAssetUpload.fitLayerToImage(target.layer, prepared.width, prepared.height);
    const image = await loadImage(urlFor(prepared.file));
    if (!state.open || state.entries[state.selectedIndex] !== entry) return; // 使用者已經換選別的
    image.__loadedForFilename = target.layer.assetFilename;
    AppState.images[target.key] = image;
    delete target.layer.__assetCleared;
    // （18節 2026-10-07）預覽也即時重算價格：先還原到預覽前的價格層，再依這張素材重算，所見即所得。
    if (state.preview.prices && window.CouponPriceSync) {
      window.CouponPriceSync.restorePrices(target.template, state.preview.prices);
      const result = await window.CouponPriceSync.rebuildForAsset(target.template, target.key, entry.filename, entry.file);
      if (!state.open || state.entries[state.selectedIndex] !== entry) return;
      const hint = state.root.querySelector('.al-preview-hint');
      hint.textContent = result.status === 'none' ? '預覽中：雙擊／Enter／「套用」才會正式替換，Esc 還原' : `預覽中：${result.message}。雙擊／Enter／「套用」才會正式替換，Esc 還原`;
    }
    highlightSelected();
    Renderer?.render?.();
  }

  function revertPreview() {
    const { AppState, Renderer } = core();
    const preview = state.preview;
    state.preview = null;
    if (!preview) return;
    GEOMETRY_FIELDS.forEach((field) => { if (preview.snapshot[field] === undefined) delete preview.layer[field]; else preview.layer[field] = preview.snapshot[field]; });
    if (preview.image) AppState.images[preview.key] = preview.image; else delete AppState.images[preview.key];
    if (preview.cleared) preview.layer.__assetCleared = true;
    if (preview.prices && window.CouponPriceSync) window.CouponPriceSync.restorePrices(preview.template, preview.prices);
    Renderer?.render?.();
  }

  const loadImage = (url) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });

  // ── 正式套用 ──
  async function applySelected() {
    const entry = state.entries[state.selectedIndex];
    const target = state.target;
    if (!entry || !target) return;
    const { ManualAssetControls, AssetLinkSync, HistoryManager } = core();
    const previousName = normalize(baseName(target.layer.assetFilename));
    revertPreview();
    const applyToGroup = state.root.querySelector('.al-group-check').checked;
    const historyDepth = core().AppState?.history?.length ?? null; // core 的 HistoryManager 把交易放在 AppState.history
    const ok = await ManualAssetControls.replaceLayerAsset(target.key, target.layer, entry.file, target.template);
    if (!ok) { window.showToast?.('替換失敗，請改用上傳檔案'); return; }
    let extra = 0;
    if (applyToGroup && previousName && AssetLinkSync) {
      const usages = AssetLinkSync.usages(previousName, { template: target.template, key: target.key, layer: target.layer });
      for (const usage of usages) {
        if (await ManualAssetControls.replaceLayerAsset(usage.key, usage.layer, entry.file, usage.template)) extra += 1;
      }
    }
    close({ keepPreview: true });
    showUndoToast(`已替換為 ${entry.filename}${extra ? `，另同步 ${extra} 張` : ''}`, historyDepth);
  }

  function showUndoToast(message, historyDepth) {
    const { HistoryManager, Renderer, LayerManager, Inspector } = core();
    const toast = state.toast;
    toast.innerHTML = `<span>✓ ${escapeHtml(message)}</span><button type="button">復原</button>`;
    toast.classList.remove('hidden');
    clearTimeout(showUndoToast._timer);
    showUndoToast._timer = setTimeout(() => toast.classList.add('hidden'), 5000);
    toast.querySelector('button').addEventListener('click', () => {
      // 復原到替換前：HistoryManager 每次 replaceLayerAsset 都 push 一筆，連按到替換前的深度。
      const steps = historyDepth === null ? 1 : Math.max(1, (core().AppState?.history?.length ?? historyDepth + 1) - historyDepth);
      for (let i = 0; i < steps; i += 1) HistoryManager?.undo?.();
      Renderer?.render?.(); LayerManager?.render?.(); Inspector?.render?.();
      window.BatchManager?.refreshCurrentThumbIfNeeded?.();
      toast.classList.add('hidden');
      window.showToast?.('已復原');
    }, { once: true });
  }

  // ── 右鍵選單 ──
  function showMenu(event, { key, layer, template }) {
    const { LinkSync, ManualAssetUpload } = core();
    const items = [
      { action: 'library', label: '從素材庫替換…', hint: 'L' },
      { action: 'upload', label: '上傳檔案替換…' },
      ...(ManualAssetUpload?.hasAsset?.(layer) ? [{ action: 'clear', label: '清除圖片', hint: 'Delete' }] : []),
      { action: 'link', label: `連動：${LinkSync?.isEnabled?.(template) ? '開' : '關'}（這一張）`, hint: 'D' },
    ];
    state.menu.innerHTML = items.map((item) => `<button type="button" role="menuitem" data-action="${item.action}">${escapeHtml(item.label)}${item.hint ? `<kbd>${item.hint}</kbd>` : ''}</button>`).join('');
    state.menu.classList.remove('hidden');
    const width = state.menu.offsetWidth || 200; const height = state.menu.offsetHeight || 150;
    state.menu.style.left = `${Math.min(event.clientX, window.innerWidth - width - 8)}px`;
    state.menu.style.top = `${Math.min(event.clientY, window.innerHeight - height - 8)}px`;
    state.menu.__target = { key, layer, template, event };
  }
  function hideMenu() { state.menu.classList.add('hidden'); state.menu.__target = null; }

  async function runMenu(action) {
    const target = state.menu.__target;
    hideMenu();
    if (!target) return;
    const { ManualAssetControls, LinkSyncUI, LinkSync, LayerManager, Renderer, Inspector } = core();
    LayerManager?.select?.(target.key); Inspector?.render?.(); Renderer?.render?.();
    switch (action) {
      case 'library': open({ key: target.key, layer: target.layer, template: target.template, mode: 'layer', anchorEvent: target.event }); break;
      case 'upload': ManualAssetControls?.pickFileFor?.(target.key, target.layer, target.template); break;
      case 'clear': await ManualAssetControls?.clearLayerAsset?.(target.key, target.layer, target.template); break;
      case 'link': if (LinkSyncUI?.apply) LinkSyncUI.apply(!LinkSync.isEnabled(target.template)); else LinkSync?.toggle?.(target.template); break;
      default: break;
    }
  }

  function imageLayerAt(event) {
    const { Geometry, LayerManager, AppState } = core();
    if (!Geometry?.mousePos || !LayerManager?.hitTest || !AppState?.template) return null;
    const key = LayerManager.hitTest(Geometry.mousePos(event));
    const layer = key ? AppState.template.layers?.[key] : null;
    return key && layer && layer.type === 'image' && !layer.__nonInteractive ? { key, layer, template: AppState.template } : null;
  }

  // ── 事件 ──
  function bind() {
    const root = state.root;
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'close') { close(); return; }
      if (action === 'apply') { applySelected(); return; }
      const tile = event.target.closest('.al-tile');
      if (tile) select(Number(tile.dataset.index), { scrollIntoView: false });
    });
    root.addEventListener('dblclick', (event) => { const tile = event.target.closest('.al-tile'); if (tile) { state.selectedIndex = Number(tile.dataset.index); applySelected(); } });
    root.querySelector('.al-search').addEventListener('input', (event) => { state.query = event.target.value; state.selectedIndex = -1; renderGrid(); });
    root.querySelector('.al-group-check').addEventListener('change', (event) => { state.applyToGroup = event.target.checked; });
    root.querySelector('.al-upload input').addEventListener('change', (event) => {
      const { AssetStore } = core();
      // 放進專案共用素材資料夾（沒有共用資料夾時放「手動上傳」桶）：查找名含資料夾，素材庫同一份清單、存檔也打包在該資料夾。
      const folder = state.sharedFolder || '手動上傳';
      [...(event.target.files || [])].forEach((file) => { if (/^image\//i.test(file.type || '')) { AssetStore.registerManualFile(folder, `${folder}/${file.name}`, file); AssetStore.registerManualFile(folder, file.name, file); } });
      event.target.value = '';
      state.entries = loadEntries(); renderGrid();
      window.showToast?.(`已上傳到「${folder}」`);
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key === 'Enter' && state.selectedIndex >= 0 && !event.target.closest('.al-search')) { event.preventDefault(); applySelected(); return; }
      if (event.key === 'Enter' && event.target.closest('.al-search') && state.filtered.length) { event.preventDefault(); select(state.entries.indexOf(state.filtered[0])); return; }
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key) || !state.filtered.length) return;
      event.preventDefault();
      const columns = Math.max(1, Math.floor(root.querySelector('.al-grid').clientWidth / 112));
      const currentPos = Math.max(0, state.filtered.findIndex((entry) => state.entries.indexOf(entry) === state.selectedIndex));
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? columns : -columns;
      const nextPos = Math.max(0, Math.min(state.filtered.length - 1, (state.selectedIndex < 0 ? 0 : currentPos + step)));
      select(state.entries.indexOf(state.filtered[nextPos]));
    });
    // 拖素材到畫布圖層上＝確認替換
    root.addEventListener('dragstart', (event) => {
      const tile = event.target.closest('.al-tile'); if (!tile) return;
      event.dataTransfer.setData(DRAG_TYPE, tile.dataset.index);
      event.dataTransfer.effectAllowed = 'copy';
    });
    const canvas = $('canvas');
    canvas?.addEventListener('dragover', (event) => { if (event.dataTransfer?.types?.includes(DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }, { capture: true });
    canvas?.addEventListener('drop', async (event) => {
      if (!event.dataTransfer?.types?.includes(DRAG_TYPE)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const entry = state.entries[Number(event.dataTransfer.getData(DRAG_TYPE))];
      const hit = imageLayerAt(event);
      if (!entry || !hit) return;
      revertPreview();
      state.target = hit; state.selectedIndex = state.entries.indexOf(entry);
      await applySelected();
    }, { capture: true });

    // 點面板外 → 關閉（還原預覽）；選單外 → 收起選單
    window.addEventListener('pointerdown', (event) => {
      if (state.open && !root.contains(event.target) && !state.menu.contains(event.target)) close();
      if (!state.menu.classList.contains('hidden') && !state.menu.contains(event.target)) hideMenu();
    }, { capture: true });
    window.addEventListener('resize', () => { if (state.open) position(); });

    // 右鍵圖片圖層
    canvas?.addEventListener('contextmenu', (event) => {
      const hit = imageLayerAt(event);
      if (!hit) return;
      event.preventDefault(); event.stopImmediatePropagation();
      showMenu(event, hit);
    }, { capture: true });
    state.menu.addEventListener('click', (event) => { const action = event.target.closest('[data-action]')?.dataset.action; if (action) runMenu(action); });

    // 點已清除的空槽 → 小選單（取代直接開檔案選擇器；manual-asset-controls 的 pointerdown 在 capture 階段，這裡要排在它前面）
    canvas?.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const hit = imageLayerAt(event);
      if (!hit || hit.layer.__assetCleared !== true || String(hit.layer.assetFilename || '').trim()) return;
      event.preventDefault(); event.stopImmediatePropagation();
      core().LayerManager?.select?.(hit.key); core().Renderer?.render?.(); core().Inspector?.render?.();
      showMenu(event, hit);
    }, { capture: true });

    // Inspector「素材庫」按鈕＋快捷鍵 L
    $('libraryAssetBtn')?.addEventListener('click', () => {
      const { AppState } = core();
      const key = AppState?.selectedLayers?.[0]; const layer = key ? AppState.template?.layers?.[key] : null;
      if (layer?.type === 'image') open({ key, layer, template: AppState.template, mode: 'layer' }); else open({ mode: 'browse' });
    });
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() !== 'l' || event.ctrlKey || event.metaKey || event.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const { AppState } = core();
      if (AppState?.editingLayerKey) return;
      event.preventDefault();
      if (state.open) { close(); return; }
      const key = AppState?.selectedLayers?.[0]; const layer = key ? AppState.template?.layers?.[key] : null;
      if (layer?.type === 'image') open({ key, layer, template: AppState.template, mode: 'layer' }); else open({ mode: 'browse' });
    });
  }

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

  function main() {
    state.root = build();
    state.menu = buildMenu();
    state.toast = buildToast();
    bind();
  }

  window.AssetLibrary = Object.freeze({ open, close, isOpen: () => state.open, select, applySelected, showMenu });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
