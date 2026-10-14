/* 25節Tool V5.0.0 – 通用開源版
 * 以 V4.25.0 為底，整合 KOL 通用機制(半身照確認/單一尺寸同步/去背貼合)、
 * 新增通用素材同步 Hub (AssetSyncHub)、選用模組獨立到 modules/、
 * DOM 版型編輯器 common plugins 抽離到 dom-editor-plugins/。
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const round = (num, d = 1) => Number(Number(num || 0).toFixed(d));
  /**
   * 整合版：讀取目前工具分類（Profile）的行為選項。
   * 選項定義在 config/profiles/flags.registry.json；fallback 一律填「正式BN 的原行為」，
   * 這樣分類尚未啟用或選項缺漏時，core 就是原本的正式BN。
   */
  const flag = (key, fallback) => {
    const value = window.ProfileLoader?.getFlag?.(key, undefined);
    return value === undefined || value === null ? fallback : value;
  };
  // Shared normaliser used by multiple engines.
  /**
   * 整合版：core 血緣。A＝正式BN／暖身BN／MS 這一系；B＝以外廣 wave1 為底的 KV／OM／LineOA／network／AMS／鏡面／跨夜。
   * 以下凡是 `X_A` / `X_B` 成對出現的模組，皆依 profile.family 在 core 建構時擇一；其餘模組只有一套實作＋小旗標。
   */
  const CORE_LINEAGE = window.__profile?.family && window.__profile.family !== 'a' ? 'b' : 'a';
  const pickLineage = (implA, implB) => (CORE_LINEAGE === 'b' ? implB : implA);
  const normStr = (value) => String(value || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[\s\u00a0\u3000\t\r\n_\-()（）\[\]【】.]+/g, '');

  // Shared helper: get rules for a given family+section from the registry.
  // V4.17: legacy window.XxxTemplateRules globals removed; rules/* files now only register().
  const getRuleSection = (family, section) =>
    (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(family, section) || {};
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const encodeAssetPath = (path) => String(path || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  // ── 通用 Blob URL 延遲釋放 ──
  // blob URL 用完後預設 1.2 秒內釋放，避免長批次跑很多張圖時記憶體一直往上疊。
  // 但如果中途跳出需要使用者手動操作的確認視窗（例如選用模組 asset-review-modal），
  // 使用者確認時間可能超過 1.2 秒，若原本排定要釋放的圖片網址在此時被釋放掉，
  // 該圖片之後可能就畫不出來了（某些瀏覽器對已釋放的 blob URL 圖片重繪行為不穩定）。
  // 這裡的機制：釋放前先檢查 window.__suspendBlobRevocation 旗標，
  // 有的話延後 500ms 再重試，直到旗標被解除；旗標由選用模組在跳彈窗時控制。
  window.__suspendBlobRevocation = false;
  function scheduleBlobRevoke(url, delay = 1200) {
    const tryRevoke = () => {
      if (window.__suspendBlobRevocation) { setTimeout(tryRevoke, 500); return; }
      URL.revokeObjectURL(url);
    };
    setTimeout(tryRevoke, delay);
  }
  window.scheduleBlobRevoke = scheduleBlobRevoke;

  // ── 通用短暫 Toast 提示 ──
  // 動態建立單一 DOM 節點（重用相同 id），避免重複觸發時堆疊多個 toast。
  // 樣式類別 .app-toast / .is-open 由 style.css 提供。
  function showToast(message) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('appToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'appToast';
      el.className = 'app-toast';
      document.body.appendChild(el);
    }
    el.textContent = `✓ ${message}`;
    el.classList.add('is-open');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.remove('is-open'), 1800);
  }
  window.showToast = showToast;
  const decodeHashUnicode = (value) => String(value || '')
    .replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const normalizeAssetStemExact = (value) => decodeHashUnicode(String(value || ''))
    .normalize('NFKC')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase();
  const normalizeLayerIdentifier = (value) => decodeHashUnicode(String(value || ''))
    .normalize('NFKC')
    .replace(/\u3000/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // 這些 helpers 是選用模組 (modules/*.js) 會用到的通用轉換工具，暴露到 window 便於引用。
  window.decodeHashUnicode = decodeHashUnicode;
  window.normalizeAssetStemExact = normalizeAssetStemExact;
  window.normalizeLayerIdentifier = normalizeLayerIdentifier;
  const SVG = {
    eye: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 18 18"/><path d="M10.6 10.6A3 3 0 0 0 13.4 13.4"/><path d="M9.88 4.24A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-3.2 4.35"/><path d="M6.6 6.6A18 18 0 0 0 2 12s3.5 8 10 8a10.8 10.8 0 0 0 4.18-.82"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
    unlock: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.3-2.3"/></svg>`,
  };

  // 全域向量修正規則：PSD 匯出的部分簡單 shape 可能只有 pathBounds、沒有完整三角形頂點。
  // 這裡只用「圖層命名」判斷通用 UI 元件，不綁定任何單一公版，避免每個 rules/json 重複補同一段邏輯。
  const GLOBAL_VECTOR_RULES = Object.freeze({
    [normStr('CTA_三角形')]: { renderer: 'triangle', direction: 'right' },
  });

  // Slim build: built-in images were extracted to ./assets/ to reduce JS size.
  const EMBEDDED_ASSETS = Object.freeze({});

  // V1.0 開源版：移除內嵌的 DDcard 保底範本（DEFAULT_TEMPLATE）。
  // 找不到公版時不再偷塞假範本，而是明確提示「沒有已載入的公版」。

  // V1.0 開源版：移除頭巾票券專屬的 HEADBAND_SHEET_ROUTES / TEMPLATE_ROUTING_CELLS 固定分流設定。
  // 若未來某個公版需要「工單固定欄位分流」這種特殊解析模式，
  // 請透過 window.TemplateRuleRegistry.register(family, { sheetRouting: {...} }) 由該公版的 rules/*.rules.js 自行註冊，
  // 不要再把任何公版專屬的欄位代號（如 B17/F16）寫回 app.core.js。
  const AppState = {
    templates: [], activeIndex: 0, template: null, selectedLayers: [], hoverLayer: null,
    images: {}, assetFiles: new Map(), isDragging: false, isResizing: false, isRotating: false,
    dragOffset: { x: 0, y: 0 }, resizeStart: null, rotateStart: null,
    currentProject: '',
    detectedExcelProjects: [],
    availableProjectOptions: [],
    history: [], future: [], historyExtras: [], futureExtras: [], historySequence: 0, layerSearch: '', exportScale: 4, handleSize: 10,
    previewZoom: 1, previewZoomMin: 0.25, previewZoomMax: 4,
    editingLayerKey: null,
    editingOriginalText: '',
    editingOriginalSnapshot: null,
    editingOriginalIndex: -1,
    editingText: '',
    caretVisible: true,
    caretTimer: null,
    excelWorkbook: null,
    excelFileName: '',
    batchMode: false,
    sourceTemplates: null,
    batchItems: [],
    unmatchedBatchItems: [],
    imageLoadSeq: 0,
    selectionRevision: 0,
    batchPreviewRendering: false,
    batchGroupsOpen: {},
    showSpecOverlay: true,
    specOverlayImage: null,
    specOverlayFilename: '',
    templateFilter: 'All',
    templateGroupsOpen: {},
  };

  // 「目前專案」選單裡的特殊選項：代表「All，全部專案一起做」，不是真正的專案資料夾名稱。
  const ALL_PROJECTS_VALUE = '__ALL__';

  // V0.9：素材角色只用於決定合法搜尋範圍；公版素材禁止跨其他公版資料夾，商品圖才可 fallback 到「共用素材」。
  const ASSET_POLICY = Object.freeze({
    background: { allowCrossProjectFallback: false, allowFuzzyMatch: false },
    product: { allowCrossProjectFallback: false, allowFuzzyMatch: false },
    ticket: { allowCrossProjectFallback: false, allowFuzzyMatch: false },
    logo: { allowCrossProjectFallback: true, allowFuzzyMatch: true },
    cta: { allowCrossProjectFallback: true, allowFuzzyMatch: true },
    decoration: { allowCrossProjectFallback: true, allowFuzzyMatch: true },
  });
  const classifyAssetRole = ({ layer = null, layerKey = '', filename = '' } = {}) => {
    const label = normStr([
      layerKey,
      layer?.psdName,
      layer?.name,
      layer?.role,
      layer?.assetFilename,
      filename,
    ].filter(Boolean).join(' '));
    const baseName = normStr(String(filename || layer?.assetFilename || '').split(/[\\/]/).pop());
    const roleText = normStr(layer?.role || '');

    if (label.includes('kvbg') || label.includes(normStr('KV_BG')) || label.includes(normStr('背景')) || roleText.includes(normStr('背景'))) return 'background';
    if (label.includes('logo')) return 'logo';
    if (label.includes('cta') || label.includes('button') || label.includes(normStr('按鈕'))) return 'cta';
    if (label.includes(normStr('票券')) || label.includes(normStr('單券')) || label.includes(normStr('雙券')) || label.includes('coupon') || label.includes(normStr('蝦幣')) || label.includes(normStr('全站券')) || label.includes(normStr('商城券'))) return 'ticket';
    if (roleText.includes(normStr('曝品')) || roleText.includes('product') || label.includes(normStr('商品圖')) || label.includes(normStr('曝品')) || label.includes('product') || baseName === 'p') return 'product';
    return 'decoration';
  };


  // V0.7：素材改成「依資料夾分類」儲存（不再攤平成單一Map），解決同名檔案跨專案互相覆蓋的問題。
  // AppState.assetFiles 的形狀：Map<資料夾名稱, Map<檔名, File>>
  //   - key 是使用者選取的 assets 根資料夾底下，第一層子資料夾的名稱，例如 "4.17 直播日"、"共用素材"
  //   - 檔案如果直接放在使用者選取的根資料夾下（沒有再包一層子資料夾），歸類到 key = ''（根目錄）
  // 圖片載入快取：同一份素材（同一個 File 物件、或同一個解析出來的路徑字串）在批次匯出/預覽時
  // 常常會被很多個版位重複用到（共用背景、同一組商品照片用在多個尺寸），載入一次之後快取起來，
  // 避免重複下載/解碼——這是批次匯出效能最主要的瓶頸。
  const getAssetPolicy = (args = {}) => ASSET_POLICY[classifyAssetRole(args)] || ASSET_POLICY.decoration;

  // （LineOA／鏡面）素材查找「嚴格範圍」：由規則透過 rules.assetLookup={scope:'strict'} 宣告，未宣告即無作用。
  const normalizeIdentityLoose = (value) => String(value || '').normalize?.('NFKC').toLowerCase().replace(/[\s_\-]+/g, '') || '';  const resolveTemplateFolderName = (templateId) => {
    const id = String(templateId || '').trim();
    if (!id) return '';
    let group = [id];
    Object.entries(window.TemplateIdentityAliases || {}).forEach(([canonical, aliases]) => {
      const members = [canonical, ...(Array.isArray(aliases) ? aliases : [aliases])];
      if (members.some((member) => normalizeIdentityLoose(member) === normalizeIdentityLoose(id))) {
        group = [...new Set([id, ...members])];
      }
    });
    const buckets = typeof AppState.assetFiles?.keys === 'function' ? [...AppState.assetFiles.keys()] : [];
    for (const candidate of group) {
      const hit = buckets.find((bucket) => bucket && normalizeIdentityLoose(bucket) === normalizeIdentityLoose(candidate));
      if (hit) return hit;
    }
    return id;
  };  const getAssetLookupScope = (template) => {
    const family = CapsuleRuleEngine?.getTemplateFamily?.(template) || null;
    const section = getRuleSection(family, 'assetLookup') || {};
    const strictScope = section.scope === 'strict';
    const templateFolder = strictScope
      ? resolveTemplateFolderName(template?.canvas?.templateId || template?.templateId || '')
      : '';
    return { strictScope, templateFolder };
  };

  // V0.7：素材改成「依資料夾分類」儲存（不再攤平成單一Map），解決同名檔案跨專案互相覆蓋的問題。
  // AppState.assetFiles 的形狀：Map<資料夾名稱, Map<檔名, File>>
  //   - key 是使用者選取的 assets 根資料夾底下，第一層子資料夾的名稱，例如 "4.17 直播日"、"共用素材"
  //   - 檔案如果直接放在使用者選取的根資料夾下（沒有再包一層子資料夾），歸類到 key = ''（根目錄）
  // 圖片載入快取：同一份素材（同一個 File 物件、或同一個解析出來的路徑字串）在批次匯出/預覽時
  // 常常會被很多個版位重複用到（共用背景、同一組商品照片用在多個尺寸），載入一次之後快取起來，
  // 避免重複下載/解碼——這是批次匯出效能最主要的瓶頸。

  // V0.7：素材改成「依資料夾分類」儲存（不再攤平成單一Map），解決同名檔案跨專案互相覆蓋的問題。
  // AppState.assetFiles 的形狀：Map<資料夾名稱, Map<檔名, File>>
  //   - key 是使用者選取的 assets 根資料夾底下，第一層子資料夾的名稱，例如 "4.17 直播日"、"共用素材"
  //   - 檔案如果直接放在使用者選取的根資料夾下（沒有再包一層子資料夾），歸類到 key = ''（根目錄）
  // 圖片載入快取：同一份素材（同一個 File 物件、或同一個解析出來的路徑字串）在批次匯出/預覽時
  // 常常會被很多個版位重複用到（共用背景、同一組商品照片用在多個尺寸），載入一次之後快取起來，
  // 避免重複下載/解碼——這是批次匯出效能最主要的瓶頸。
  const imageLoadCache = new Map();
  // ── AssetStore：B 系實作（外廣 wave1 V0.5 原文）──
  // ── AssetStore：B 系實作（外廣 wave1 V0.5 原文）──
  const AssetStore_B = {
    getBucket(folderName) {
      return AppState.assetFiles?.get(String(folderName ?? '')) || new Map();
    },
    /** 手動素材（上傳替換／拖曳／上傳槽）登記進素材索引；整合核心模組一律經這裡，不直接走訪 AppState.assetFiles。 */
    registerManualFile(bucketName, lookupName, file) {
      if (!(AppState.assetFiles instanceof Map)) AppState.assetFiles = new Map();
      if (!AppState.assetFiles.has(bucketName)) AppState.assetFiles.set(bucketName, new Map());
      AppState.assetFiles.get(bucketName).set(lookupName, file);
    },
    getTotalFileCount() {
      let total = 0;
      for (const bucket of (AppState.assetFiles || new Map()).values()) total += bucket.size;
      return total;
    },
    getFolderNames() {
      return [...(AppState.assetFiles || new Map()).keys()];
    },
    // 依「目前專案」（或指定的 project 參數）組出一份合併後的扁平素材表，供檔名查找使用。
    // 優先序：① 該專案資料夾 → ② 共用素材資料夾 → ③ 使用者選取資料夾的根目錄檔案 → ④ 其他所有資料夾（最終備援，
    // 避免使用者素材沒有依規範歸類資料夾時，程式完全找不到檔案）。
    getFlatForLookup(project, options = {}) {
      const result = new Map();
      const addBucket = (bucket) => { for (const [k, v] of bucket) if (!result.has(k)) result.set(k, v); };
      const target = project !== undefined ? project : AppState.currentProject;
      const currentProject = target && target !== ALL_PROJECTS_VALUE ? target : '';
      const allowCrossProjectFallback = options.allowCrossProjectFallback !== false;
      // （LineOA／鏡面）templateFolder 永遠排第一；strictScope 時：公版同名資料夾 → 專案 → 根目錄 → 共用素材 → 停止。
      const templateFolder = String(options.templateFolder || '').trim();
      if (templateFolder) addBucket(this.getBucket(templateFolder));
      if (options.strictScope === true) {
        if (currentProject && currentProject !== templateFolder) addBucket(this.getBucket(currentProject));
        addBucket(this.getBucket(''));
        addBucket(this.getBucket('共用素材'));
        return result;
      }

      if (currentProject) addBucket(this.getBucket(currentProject));
      addBucket(this.getBucket('共用素材'));
      addBucket(this.getBucket(''));

      // 只有被明確標記為「專案鎖定」的素材（目前是 KV_BG / 背景類）不可跨專案 fallback。
      // 其他像 P.png、CTA、單券/雙券素材仍保留舊版寬鬆搜尋，避免因各專案素材命名不完全一致導致縮圖失敗。
      if (allowCrossProjectFallback) {
        for (const [name, bucket] of (AppState.assetFiles || new Map())) {
          if (name === currentProject || name === '共用素材' || name === '') continue;
          addBucket(bucket);
        }
      }
      return result;
    },
    getFileEntries() {
      const entries = [];
      const seenFiles = new Set();
      for (const [folder, bucket] of (AppState.assetFiles || new Map())) {
        for (const [lookupName, file] of bucket) {
          if (!file || seenFiles.has(file)) continue;
          seenFiles.add(file);
          const relativePath = decodeHashUnicode(file.webkitRelativePath || lookupName || file.name || '');
          entries.push({
            file,
            folder: decodeHashUnicode(folder || ''),
            filename: decodeHashUnicode(file.name || String(lookupName || '').split(/[\\/]/).pop()),
            lookupName: relativePath || decodeHashUnicode(lookupName || file.name || ''),
            relativePath,
          });
        }
      }
      return entries;
    },
  };
  // ── AssetStore：A 系實作（正式BN V0.8 為底）──
  const AssetStore_A = {
    registerManualFile(bucketName, lookupName, file) {
      if (!(AppState.assetFiles instanceof Map)) AppState.assetFiles = new Map();
      if (!AppState.assetFiles.has(bucketName)) AppState.assetFiles.set(bucketName, new Map());
      AppState.assetFiles.get(bucketName).set(lookupName, file);
    },
    getBucket(folderName) {
      return AppState.assetFiles?.get(String(folderName ?? '')) || new Map();
    },
    getTotalFileCount() {
      let total = 0;
      for (const bucket of (AppState.assetFiles || new Map()).values()) total += bucket.size;
      return total;
    },
    getFolderNames() {
      return [...(AppState.assetFiles || new Map()).keys()];
    },
    // 合併合法素材範圍；不再掃描其他公版資料夾。
    // 共用素材僅由呼叫端在「商品圖」情境明確開啟。
    getFlatForLookup(project, options = {}) {
      const result = new Map();
      const addBucket = (bucket) => { for (const [k, v] of bucket) if (!result.has(k)) result.set(k, v); };
      const target = project !== undefined ? project : AppState.currentProject;
      const currentProject = target && target !== ALL_PROJECTS_VALUE ? String(target) : '';
      if (currentProject) addBucket(this.getBucket(currentProject));
      if (options.includeCommon === true) addBucket(this.getBucket('共用素材'));
      if (options.includeRoot !== false) addBucket(this.getBucket(''));
      return result;
    },
    getFileEntries() {
      const entries = [];
      const seenFiles = new Set();
      for (const [folder, bucket] of (AppState.assetFiles || new Map())) {
        for (const [lookupName, file] of bucket) {
          if (!file || seenFiles.has(file)) continue;
          seenFiles.add(file);
          const relativePath = decodeHashUnicode(file.webkitRelativePath || lookupName || file.name || '');
          entries.push({
            file,
            folder: decodeHashUnicode(folder || ''),
            filename: decodeHashUnicode(file.name || String(lookupName || '').split(/[\\/]/).pop()),
            lookupName: relativePath || decodeHashUnicode(lookupName || file.name || ''),
            relativePath,
          });
        }
      }
      return entries;
    },
  };

  // 素材解析單一入口：只在合法資料夾範圍內搜尋，並對歧義明確報錯。
  // 優先序：版位專屬資料夾 →（僅商品圖）共用素材 → assets 根目錄。
  const AssetStore = pickLineage(AssetStore_A, AssetStore_B);
  const AssetLookup = {
    _entriesForFolder(folder) {
      const bucket = AssetStore.getBucket(folder);
      const seen = new Set();
      const entries = [];
      for (const [lookupName, file] of bucket) {
        if (!file || seen.has(file)) continue;
        seen.add(file);
        const filename = window.RuntimePolicy?.decodeHashUnicode?.(file.name || String(lookupName || '').split(/[\\/]/).pop())
          || decodeHashUnicode(file.name || String(lookupName || '').split(/[\\/]/).pop());
        entries.push({ file, folder: String(folder || ''), filename, lookupName: filename });
      }
      return entries;
    },
    _folderOrder(folder, role) {
      const result = [];
      const push = (value) => { const key = String(value ?? ''); if (!result.includes(key)) result.push(key); };
      if (folder) push(folder);
      // 整合版：assets.moduleCommonFolder＝always（MS）時不分角色一律找共用素材。
      if (role === 'product' || flag('assets.moduleCommonFolder', 'productOnly') === 'always') push('共用素材');
      push('');
      return result;
    },
    match(name, { folder = '', role = 'decoration', prefix = '', allowFuzzy = true } = {}) {
      const raw = String(name || '').trim();
      const attempts = [];
      if (!raw) return { found: false, filename: '', lookupName: '', folder: '', file: null, attempts };
      const policy = window.RuntimePolicy || {};
      const basename = (value) => policy.decodeHashUnicode?.(String(value || '').split(/[\\/]/).pop()) || String(value || '').split(/[\\/]/).pop();
      const nfkc = (value) => policy.nfkc?.(value) || String(value || '').normalize('NFKC');
      const exactName = (value) => nfkc(basename(value)).trim().toLowerCase();
      const exactStem = (value) => policy.normalizeAssetExact?.(value) || exactName(value).replace(/\.[a-z0-9]+$/i, '');
      const loose = (value) => policy.normalizeAssetLoose?.(value) || exactStem(value).replace(/[\s_\-+()（）\[\]【】.]+/g, '');
      const rawBase = basename(raw);
      const hasExt = (value) => /\.[a-z0-9]+$/i.test(basename(value));
      const variants = [];
      const pushVariant = (value) => { const text = String(value || '').trim(); if (text && !variants.includes(text)) variants.push(text); };
      pushVariant(raw);
      pushVariant(rawBase);
      if (prefix) {
        const cleanPrefix = String(prefix).trim();
        pushVariant(`${cleanPrefix}_${rawBase}`);
        pushVariant(`${cleanPrefix}_${raw}`);
      }
      const describe = (list) => list.map((entry) => entry.filename).join('、');

      for (const currentFolder of this._folderOrder(folder, role)) {
        const entries = this._entriesForFolder(currentFolder);
        if (!entries.length) continue;

        // 1. 完整檔名精準命中（含大小寫/NFKC 正規化）。
        for (const variant of variants) {
          attempts.push(`${currentFolder || '(根目錄)'}:${variant}`);
          if (!hasExt(variant)) continue;
          const hits = entries.filter((entry) => exactName(entry.filename) === exactName(variant));
          if (hits.length === 1) return { found: true, ...hits[0], attempts };
          if (hits.length > 1) throw new Error(`素材名稱衝突：${variant} 同時命中 ${describe(hits)}`);
        }

        // 2. 未指定副檔名：同 stem 只能有唯一候選；不同副檔名並存就報錯。
        for (const variant of variants) {
          if (hasExt(variant)) continue;
          const hits = entries.filter((entry) => exactStem(entry.filename) === exactStem(variant));
          if (hits.length === 1) return { found: true, ...hits[0], attempts };
          if (hits.length > 1) throw new Error(`素材副檔名不明確：${variant} 同時存在 ${describe(hits)}`);
        }

        // 3. 寬鬆正規化後的精準命中。
        for (const variant of variants) {
          const wanted = loose(variant);
          if (!wanted) continue;
          const hits = entries.filter((entry) => loose(entry.filename) === wanted);
          if (hits.length === 1) return { found: true, ...hits[0], attempts };
          if (hits.length > 1) throw new Error(`素材正規化後衝突：${variant} 同時命中 ${describe(hits)}`);
        }

        // 4. 同一合法資料夾內才允許唯一模糊候選。
        // （暖身BN V1.5）Seller BN 等要求「精準檔名」的 Rule 可透過 allowFuzzy:false 關閉；預設 true 保持既有版位行為。
        if (allowFuzzy !== false) {
          const wantedKeys = [...new Set(variants.map(loose).filter(Boolean))];
          const hits = entries.filter((entry) => {
            const key = loose(entry.filename);
            return wantedKeys.some((wanted) => key && (key.includes(wanted) || wanted.includes(key)));
          });
          if (hits.length === 1) return { found: true, ...hits[0], attempts };
          if (hits.length > 1) throw new Error(`素材模糊比對不明確：${raw} 候選為 ${describe(hits)}`);
        }
      }
      return { found: false, filename: '', lookupName: '', folder: '', file: null, attempts };
    },
  };

  /** （暖正MS V0.5）候選檔名多一個「剝掉 <templateId>_ 前綴」的版本；由 assets.templatePrefixVariants 開關。 */
  function assetNameVariantsForTemplate(name, template) {
    const raw = String(name || '').trim();
    if (!raw) return [];
    if (!flag('assets.templatePrefixVariants', false)) return [raw];
    const slashNormalized = raw.replace(/\\/g, '/');
    const parts = slashNormalized.split('/');
    const base = parts.pop() || '';
    const prefixes = [
      template?.sheetTemplateRoute?.sourceTemplateId,
      template?.sourceTemplateId,
      template?.canvas?.templateId,
      template?.templateId,
      template?.batchSourceName,
    ].map((value) => String(value || '').trim()).filter(Boolean);
    const variants = [raw];
    const lowerBase = base.normalize('NFKC').toLowerCase();
    prefixes.forEach((prefix) => {
      const token = `${String(prefix).normalize('NFKC')}_`;
      if (!lowerBase.startsWith(token.toLowerCase())) return;
      const stripped = base.slice(token.length);
      if (stripped && !variants.includes(stripped)) variants.push(stripped);
    });
    return variants;
  }
  const activeLayerKey = () => AppState.selectedLayers[0] || null;
  const activeLayer = () => AppState.template?.layers?.[activeLayerKey()] || null;
  const DOM = {
    canvas: $('canvas'), templateList: $('templateList'), templateFilter: $('templateFilter'), layerList: $('layerList'), layerSearch: $('layerSearch'), loadStatus: $('loadStatus'),
    activeTemplateName: $('activeTemplateName'), canvasSize: $('canvasSize'), selectedLayerName: $('selectedLayerName'), emptyInspector: $('emptyInspector'),
    commonControls: $('commonControls'), textControls: $('textControls'), inlineEditor: $('inlineTextEditor') || $('inlineEditor'), resizeHint: $('resizeHint'), rotateHint: $('rotateHint'),
    statusX: $('statusX'), statusY: $('statusY'), statusW: $('statusW'), statusH: $('statusH'),
    canvasShell: qs('.canvas-shell'), canvasStage: qs('.canvas-stage'),
    // V3.4.1 Excel 批次產圖 DOM：修復原本未快取導致選擇 Excel 後沒有反應
    excelInput: $('excelInput'),
    excelSheetSelect: $('excelSheetSelect'),
    generateFromExcelBtn: $('generateFromExcelBtn'),
    batchStatus: $('batchStatus'),
    batchItemList: $('batchItemList'),
    batchPreviewPanel: $('batchPreviewPanel'),
    batchPreviewGrid: $('batchPreviewGrid'),
    unmatchedBox: $('unmatchedBox') || $('unmatchedBatchItems') || $('batchDiagnostics'),
    currentProjectDisplay: $('currentProjectDisplay'),
    openProjectModalBtn: $('openProjectModalBtn'),
    projectModalOverlay: $('projectModalOverlay'),
    projectModalOptions: $('projectModalOptions'),
    projectModalDescription: $('projectModalDescription'),
    projectModalOkBtn: $('projectModalOkBtn'),
    projectModalCancelBtn: $('projectModalCancelBtn'),
  };
  const ctx = DOM.canvas.getContext('2d');
  const ManualOverrideManager = {
    mark(layer, properties) {
      if (!layer) return;
      const list = Array.isArray(properties) ? properties : [properties];
      layer.__manualOverrides = layer.__manualOverrides || {};
      list.filter(Boolean).forEach((property) => { layer.__manualOverrides[property] = true; });
    },
    clearLayer(layer) {
      if (layer) delete layer.__manualOverrides;
    },
    clearTemplate(template = AppState.template) {
      Object.values(template?.layers || {}).forEach((layer) => this.clearLayer(layer));
    },
    isManual(layer, property) {
      return !!layer?.__manualOverrides?.[property];
    },
  };

  // V0.9 History：每一筆操作保存「受影響 Template 的 before/after snapshot」，並維持單一時間線。
  // 一般 Canvas 操作只影響目前縮圖；Smart Asset 可透過 attachExtra() 把其他版位加入同一原子 Transaction。
  // （回饋：文字手動調整要保留、縮圖要即時更新）
  // 做法不去攔每一個編輯入口，而是「比對」：工單套版完成時記一份文字層基線（__textBaseline），
  // 主畫布每次重繪時把目前文字層跟基線比，有差的就是使用者改過的 → 記進 template.__manualTextOverrides。
  // 之後任何重新套版（切換縮圖、重新載素材、匯出前刷新）在 applyRecordToTemplate 尾端把紀錄套回，手動調整不會被蓋掉；
  // 存檔一起保存（不是 transientKeys）。價格層（auto_price_v2）幾何由商品連動決定，只記文字內容與顏色。
  const ManualTextOverrides = {
    TEXT_PROPS: ['text', 'fontSizePx', 'fontSizePt', 'lineHeight', 'lineHeightMultiplier', 'letterSpacing', 'color', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 'align', 'x', 'y', 'width', 'height', 'centerX', 'centerY', 'rotation', 'hidden', 'textStyleRanges'],
    PRICE_PROPS: ['text', 'color', 'textStyleRanges'],
    propsFor(layer) { return layer?.source === 'auto_price_v2' ? this.PRICE_PROPS : this.TEXT_PROPS; },
    snapshotLayer(layer) {
      const out = {};
      this.propsFor(layer).forEach((prop) => { if (layer[prop] !== undefined) out[prop] = clone(layer[prop]); });
      return out;
    },
    snapshotTemplate(template) {
      const out = {};
      Object.entries(template?.layers || {}).forEach(([key, layer]) => { if (layer?.type === 'text') out[key] = this.snapshotLayer(layer); });
      return out;
    },
    /** 套版完成後呼叫：標記「下一次主畫布重繪、跑完 Layout 之後」再記基線（B 系 render 時還會跑 LayoutRuleEngine／價格連動）。 */
    markBaselinePending(template) {
      if (!template?.layers) return;
      Object.defineProperty(template, '__textBaselinePending', { value: true, writable: true, configurable: true, enumerable: false });
    },
    setBaseline(template) {
      if (!template?.layers) return;
      Object.defineProperty(template, '__textBaseline', { value: this.snapshotTemplate(template), writable: true, configurable: true, enumerable: false });
      template.__textBaselinePending = false;
    },
    /** 主畫布重繪（Layout 之後）呼叫：第一次記基線，之後比對差異。回傳是否有新的手動變化。 */
    settle(template) {
      if (!template?.layers) return false;
      if (template.__textBaselinePending || !template.__textBaseline) { this.setBaseline(template); return false; }
      return this.captureChanges(template);
    },
    /** 主畫布重繪時呼叫：跟基線不同的文字層記成手動覆寫。回傳是否有新變化。 */
    captureChanges(template) {
      const baseline = template?.__textBaseline;
      if (!baseline || !template.layers) return false;
      let changed = false;
      Object.entries(template.layers).forEach(([key, layer]) => {
        if (layer?.type !== 'text' || !baseline[key]) return;
        const current = this.snapshotLayer(layer);
        if (JSON.stringify(current) === JSON.stringify(baseline[key])) return;
        const previous = template.__manualTextOverrides?.[key];
        if (previous && JSON.stringify(previous) === JSON.stringify(current)) return;
        if (!template.__manualTextOverrides) template.__manualTextOverrides = {};
        template.__manualTextOverrides[key] = current;
        changed = true;
      });
      return changed;
    },
    /** 重新套版尾端呼叫：把手動覆寫套回去。 */
    applyAll(template) {
      const overrides = template?.__manualTextOverrides;
      if (!overrides || typeof overrides !== 'object') return 0;
      let applied = 0;
      Object.entries(overrides).forEach(([key, props]) => {
        const layer = template.layers?.[key];
        if (!layer || layer.type !== 'text' || !props) return;
        Object.entries(props).forEach(([prop, value]) => { layer[prop] = clone(value); });
        applied += 1;
      });
      return applied;
    },
    clear(template, key) {
      if (template?.__manualTextOverrides) delete template.__manualTextOverrides[key];
    },
  };
  window.ManualTextOverrides = ManualTextOverrides;

  const HistoryManager = {
    _snapshot(index = AppState.activeIndex, data = null) {
      const entry = AppState.templates?.[index];
      const value = data || (index === AppState.activeIndex ? AppState.template : entry?.data);
      return value ? { index, data: clone(value) } : null;
    },
    _capture(indices) {
      return [...new Set(indices || [])].map((index) => this._snapshot(index)).filter(Boolean);
    },
    _restore(snapshots) {
      const changed = [];
      for (const snapshot of snapshots || []) {
        const entry = AppState.templates?.[snapshot.index];
        if (!entry) continue;
        entry.data = clone(snapshot.data);
        changed.push(snapshot.index);
        if (snapshot.index === AppState.activeIndex) AppState.template = entry.data;
      }
      AppState.selectedLayers = [];
      if (changed.includes(AppState.activeIndex)) {
        TemplateLoader.loadImagesForActiveTemplate().catch(() => {});
        App.sync();
      }
      if (AppState.batchMode && changed.length) {
        window.BatchManager?.refreshPreviewIndexes?.(changed, { showProgress: false });
      }
    },
    push(label = 'edit', beforeSnapshot = null, index = AppState.activeIndex) {
      if (!AppState.template) return null;
      const before = beforeSnapshot ? { index, data: clone(beforeSnapshot) } : this._snapshot(index);
      if (!before) return null;
      const tx = { id: ++AppState.historySequence, label, before: [before], after: null, smartAssetBefore: null, smartAssetAfter: null, createdAt: Date.now() };
      AppState.history.push(tx);
      if (AppState.history.length > 80) AppState.history.shift();
      // 新操作一律切斷 Redo 分支（第67題）。
      AppState.future = [];
      return tx;
    },
    pushCoalesced(label = 'edit', windowMs = 650, index = AppState.activeIndex) {
      const last = AppState.history?.[AppState.history.length - 1];
      if (last && !AppState.future?.length && last.label === label && last.before?.length === 1 && last.before[0].index === index && Date.now() - last.createdAt <= windowMs) {
        last.createdAt = Date.now();
        return last;
      }
      return this.push(label, null, index);
    },
    pushSnapshot(beforeSnapshot, index = AppState.activeIndex, label = 'edit') {
      return this.push(label, beforeSnapshot, index);
    },
    attachExtra(snapshot) {
      const tx = AppState.history?.[AppState.history.length - 1];
      if (!tx || !Array.isArray(snapshot)) return;
      const seen = new Set(tx.before.map((item) => item.index));
      snapshot.forEach(({ index, data }) => {
        if (!Number.isInteger(index) || !data || seen.has(index)) return;
        tx.before.push({ index, data: clone(data) });
        seen.add(index);
      });
    },
    attachSmartAssetState(snapshot) {
      const tx = AppState.history?.[AppState.history.length - 1];
      if (!tx || !snapshot) return;
      tx.smartAssetBefore = clone(snapshot);
    },
    undo() {
      const tx = AppState.history.pop();
      if (!tx) return;
      tx.after = this._capture(tx.before.map((item) => item.index));
      if (tx.smartAssetBefore) tx.smartAssetAfter = window.SmartAssetManager?.snapshotSession?.() || null;
      this._restore(tx.before);
      if (tx.smartAssetBefore) window.SmartAssetManager?.restoreSession?.(tx.smartAssetBefore);
      AppState.future.push(tx);
    },
    redo() {
      const tx = AppState.future.pop();
      if (!tx?.after?.length) return;
      this._restore(tx.after);
      if (tx.smartAssetAfter) window.SmartAssetManager?.restoreSession?.(tx.smartAssetAfter);
      AppState.history.push(tx);
    },
    clear() {
      AppState.history = [];
      AppState.future = [];
      AppState.historySequence = 0;
      AppState.historyExtras = [];
      AppState.futureExtras = [];
    },
  };

  /**
   * 整合版：一份公版檔可內含多組版型（例：HBN 的「正式」與「暖身」）。
   * 檔案格式：{ "variants": { "<variantId>": { "sourceFile": "01_HBN.json", "template": {…原公版 JSON…} } } }
   * 依 profile 的 templates.variant 選一組；沒有 variants 的檔案就是一般公版。
   * 選出來的 template 與原工具的 JSON 逐位元相同，sourceFile 也沿用原檔名，所以輸出不會改變。
   */
  const TemplateVariants = {
    resolve(raw, fileName) {
      if (!raw || typeof raw !== 'object' || !raw.variants || typeof raw.variants !== 'object') return { data: raw, fileName };
      const variantId = String(flag('templates.variant', 'formal'));
      const variant = raw.variants[variantId];
      if (!variant?.template) {
        throw new Error(`公版「${fileName}」沒有「${variantId}」版型（可用：${Object.keys(raw.variants).join('、')}）`);
      }
      return { data: variant.template, fileName: String(variant.sourceFile || fileName) };
    },
  };
  // ── TemplateLoader：B 系實作（外廣 wave1 V0.5 原文）──
  // ── TemplateLoader：B 系實作（外廣 wave1 V0.5 原文）──
  const TemplateLoader_B = {
    async boot() {
      try { if (window.FontPreloader?.ready) await window.FontPreloader.ready; await document.fonts.ready; } catch (_) {}

      // 已移除 npm run build / 自動產生清單（templates.generated.js、assets.generated.js、rules.manifest.js）的機制，
      // 現在一律採「手動上傳」模式：公版／素材／工單都由使用者透過左側面板的按鈕自行選擇資料夾或檔案載入。
      // 規則檔（rules/*.rules.js）改成直接在 index.html 用 <script> 標籤引入，開頁時就同步註冊完成，不需要等待非同步載入。
      const rulesLoaded = (window.TemplateRuleRegistry?.list?.() || []).length;

      // 開頁不再顯示「載入完成」浮動視窗；使用者手動上傳素材/公版/工單。
      this.clearTemplates('尚未上傳公版，請點擊左側「上傳公版」選擇 templates 資料夾');
      this.populateProjectOptions();

      App.sync();
    },

    // 「目前專案」的選項清單，完全依上傳工單時偵測到的矩陣式工單專案名稱（例如「4.17 直播日」）而定。
    // 這份清單現在餵給浮動視窗（projectModalOverlay）使用，不再是側欄的下拉選單。
    populateProjectOptions() {
      const projects = Array.isArray(AppState.detectedExcelProjects) ? [...new Set(AppState.detectedExcelProjects)] : [];
      AppState.availableProjectOptions = projects;
      // 保留使用者原本選的專案（如果新清單裡還有這個選項，或本來就是All）；沒有的話才清空。
      if (AppState.currentProject !== ALL_PROJECTS_VALUE && !projects.includes(AppState.currentProject)) {
        AppState.currentProject = '';
      }
      this.updateCurrentProjectDisplay();
      this.renderProjectModalOptions();
    },

    updateCurrentProjectDisplay() {
      if (!DOM.currentProjectDisplay) return;
      const value = AppState.currentProject;
      DOM.currentProjectDisplay.textContent = value === ALL_PROJECTS_VALUE
        ? 'All（全部專案一起做）'
        : (value || '（尚未選擇）');
    },

    // 畫出浮動視窗裡的專案選項（3個偵測到的專案 + 一個「All」選項）。
    renderProjectModalOptions() {
      if (!DOM.projectModalOptions) return;
      const projects = AppState.availableProjectOptions || [];
      if (!projects.length) {
        DOM.projectModalOptions.innerHTML = '<div class="modal-description">目前的工單分頁沒有偵測到專案欄位，不需要選擇專案。</div>';
        return;
      }
      const options = [...projects, ALL_PROJECTS_VALUE];
      DOM.projectModalOptions.innerHTML = options.map((value) => {
        const isAll = value === ALL_PROJECTS_VALUE;
        const label = isAll ? 'All（全部專案一起做）' : value;
        const checked = AppState.currentProject === value ? 'checked' : '';
        return `<label class="modal-option${isAll ? ' is-all-option' : ''}"><input type="radio" name="projectModalRadio" value="${escapeHtml(value)}" ${checked}/> ${escapeHtml(label)}</label>`;
      }).join('');
    },

    openProjectModal() {
      this.renderProjectModalOptions();
      DOM.projectModalOverlay?.classList.remove('hidden');
    },

    closeProjectModal() {
      DOM.projectModalOverlay?.classList.add('hidden');
    },

    async bootEmpty() {
      try { if (window.FontPreloader?.ready) await window.FontPreloader.ready; await document.fonts.ready; } catch (_) {}
      this.clearTemplates('請先上傳公版');
      App.sync();
    },

    clearTemplates(message = '尚未載入公版') {
      window.SmartAssetManager?.resetSession?.();
      AppState.templates = [];
      AppState.activeIndex = 0;
      AppState.template = null;
      AppState.selectedLayers = [];
      AppState.hoverLayer = null;
      AppState.images = {};
      AppState.specOverlayImage = null;
      AppState.specOverlayFilename = '';
      AppState.sourceTemplates = null;
      AppState.batchItems = [];
      AppState.unmatchedBatchItems = [];
      AppState.batchGroupsOpen = {};
      AppState.batchDiagnostics = null;
      AppState.templateFilter = 'All';
      AppState.templateGroupsOpen = {};
      AppState.batchMode = false;
      AppState.history = [];
      AppState.future = [];
      this.setStatus(message);
      this.clearTemplateUI();
    },

    clearTemplateUI() {
      if (DOM.templateList) DOM.templateList.innerHTML = '';
      if (DOM.layerList) DOM.layerList.innerHTML = '';
      if (DOM.batchItemList) DOM.batchItemList.innerHTML = '';
      if (DOM.batchPreviewGrid) DOM.batchPreviewGrid.innerHTML = '';
      DOM.batchPreviewPanel?.classList.add('hidden');
      DOM.canvasShell?.classList.remove('batch-mode');
      if (DOM.unmatchedBox) {
        DOM.unmatchedBox.innerHTML = '';
        DOM.unmatchedBox.classList.add('hidden');
      }
      if (DOM.selectedLayerName) DOM.selectedLayerName.textContent = '未選取';
      if (DOM.emptyInspector) DOM.emptyInspector.classList.remove('hidden');
      if (DOM.commonControls) DOM.commonControls.classList.add('hidden');
      if (DOM.textControls) DOM.textControls.classList.add('hidden');
      if (DOM.activeTemplateName) DOM.activeTemplateName.textContent = '未載入';
      if (DOM.canvasSize) DOM.canvasSize.textContent = '0 × 0';
      ['statusX', 'statusY', 'statusW', 'statusH'].forEach((id) => { const el = $(id); if (el) el.textContent = '0'; });
      if (DOM.canvas) {
        ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
      }
    },

    resetAll() {
      this.clearTemplates('請先上傳公版');
      AppState.assetFiles = new Map();
      AppState.excelWorkbook = null;
      AppState.excelFileName = '';
      AppState.layerSearch = '';
      AppState.previewZoom = 1;
      AppState.showSpecOverlay = $('specToggle') ? $('specToggle').checked : true;

      if (DOM.layerSearch) DOM.layerSearch.value = '';
      if (DOM.templateFilter) DOM.templateFilter.value = 'All';
      if (DOM.excelSheetSelect) {
        DOM.excelSheetSelect.innerHTML = '<option value="">尚未上傳工單</option>';
        DOM.excelSheetSelect.disabled = true;
      }
      if (DOM.generateFromExcelBtn) DOM.generateFromExcelBtn.disabled = true;
      if (DOM.batchStatus) DOM.batchStatus.textContent = '尚未產生預覽檔案';
      ['assetInput', 'templateFolderInput', 'excelInput'].forEach((id) => { const el = $(id); if (el) el.value = ''; });
      TextEditor.cancel();
    },
    setStatus(message) { if (DOM.loadStatus) DOM.loadStatus.textContent = message; },
    resolveAssetLookupProject(template = AppState.template, options = {}) {
      // （AMS）assets.lookupProjectMode＝explicitFirstNonEmpty：取第一個非空且非 All 的值（options.project 常為空字串，不可直接勝出）。
      if (flag('assets.lookupProjectMode', 'explicit') === 'explicitFirstNonEmpty') {
        const firstNonEmpty = [options.project, template?.batchProject, template?.batchRecord?.__project]
          .map((value) => String(value ?? '').trim())
          .find((value) => value && value !== ALL_PROJECTS_VALUE);
        if (firstNonEmpty) return firstNonEmpty;
        return AppState.currentProject && AppState.currentProject !== ALL_PROJECTS_VALUE ? AppState.currentProject : '';
      }
      const explicitProject = options.project ?? template?.batchProject ?? template?.batchRecord?.__project ?? '';
      if (explicitProject && explicitProject !== ALL_PROJECTS_VALUE) return explicitProject;
      return AppState.currentProject && AppState.currentProject !== ALL_PROJECTS_VALUE ? AppState.currentProject : '';
    },
    // （LineOA／鏡面）一般圖層素材缺失記到 template.batchDiagnostics（assets.missingDiagnostics＝templateList 才啟用）。
    recordAssetLoadDiagnostic(template, key, layer, candidates = [], missing = false) {
      if (!template || !key) return;
      // 防禦：batchDiagnostics 若被其他流程放了非陣列結構（例如 spec 工單的物件），不動它也不記錄。
      if (template.batchDiagnostics != null && !Array.isArray(template.batchDiagnostics)) return;
      const token = `__assetLoad:${key}`;
      const list = Array.isArray(template.batchDiagnostics) ? template.batchDiagnostics : (template.batchDiagnostics = []);
      const index = list.findIndex((entry) => entry && entry.__assetToken === token);
      if (!missing) {
        if (index >= 0) list.splice(index, 1);
        return;
      }
      const field = String(layer?.psdName || key || '').trim() || String(key);
      const entry = {
        __assetToken: token,
        field,
        status: 'missing',
        value: candidates.filter(Boolean).join(' / '),
        target: '素材資料夾範圍內找不到，未載入',
      };
      if (index >= 0) list[index] = entry; else list.push(entry);
    },
    updateSpecAssetWarning(template, token, message = '') {
      const diagnostics = AppState.batchDiagnostics;
      if (!diagnostics?.specDriven || !token) return;
      if (!diagnostics.__baseWarnings) diagnostics.__baseWarnings = [...(diagnostics.warnings || [])];
      if (!diagnostics.__assetWarnings) diagnostics.__assetWarnings = {};
      if (message) diagnostics.__assetWarnings[token] = message;
      else delete diagnostics.__assetWarnings[token];
      diagnostics.warnings = [
        ...diagnostics.__baseWarnings,
        ...Object.values(diagnostics.__assetWarnings),
      ];
    },
    // （跨夜）跨版位同步的「初始狀態基準」。只建一次；assets.captureRenderModel=true 才建立。
    // 註：這個基準原本沒有任何地方會建立（multi-size-asset-sync 三處在讀），跨夜版補上後位置／尺寸同步才生效。
    captureRenderModel(template) {
      if (!flag('assets.captureRenderModel', false)) return false;
      if (!template?.layers || template.__renderModel) return false;
      template.__renderModel = { layers: clone(template.layers) };
      return true;
    },
    resolveAssetSpec(template, key, layer) {
      const spec = layer?.__assetSpec;
      if (!spec || layer.__manualAsset === true) return null;
      const stem = normalizeAssetStemExact(spec.stem);
      const sourceRow = template?.__meta?.sourceRow || template?.batchRecord?.__sourceRow || '?';
      const canonicalName = String(layer.__canonicalName || layer.psdName || key || '').trim();
      const warningToken = `${template?.templateId || 'network'}::${key}`;
      const extensions = window.AssetSpecEngine?.imageExtensions || ['svg', 'png', 'webp', 'jpg', 'jpeg'];
      // （network）使用者按 Delete 手動清掉的素材：保留 __assetSpec.stem 當群組識別，但不再依 stem 找回檔案。
      if (layer.__assetCleared === true) {
        layer.assetFilename = '';
        layer.assetCandidates = [];
        layer.__assetMissing = true;
        this.updateSpecAssetWarning(template, warningToken, '');
        return { found: false, candidates: [], cleared: true };
      }
      if (!stem) {
        layer.assetFilename = '';
        layer.__assetMissing = true;
        this.updateSpecAssetWarning(template, warningToken, `第 ${sourceRow} 列 ${canonicalName} 沒有可配對的素材來源`);
        return { found: false, candidates: [] };
      }

      const entries = AssetStore.getFileEntries().filter((entry) => normalizeAssetStemExact(entry.filename) === stem);
      const wantedFolder = String(spec.preferredFolder || '').trim().toLowerCase();
      const isDynamicLogo = spec.kind === 'dynamic-logo';
      const isKvBackground = spec.kind === 'kv-bg';
      const scopedEntries = (isDynamicLogo || isKvBackground)
        ? entries.filter((entry) => String(entry.folder || '').trim().toLowerCase() === wantedFolder)
        : entries;
      const candidates = scopedEntries.length ? scopedEntries : (isDynamicLogo || isKvBackground ? [] : entries);
      const extensionOrder = (filename) => {
        const ext = String(filename || '').match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
        const index = extensions.indexOf(ext);
        return index < 0 ? extensions.length : index;
      };
      const folderOrder = (entry) => {
        const folder = String(entry.folder || '').trim().toLowerCase();
        if (wantedFolder && folder === wantedFolder) return 0;
        if (!folder) return 1;
        return 2;
      };
      candidates.sort((a, b) => folderOrder(a) - folderOrder(b)
        || extensionOrder(a.filename) - extensionOrder(b.filename)
        || String(a.relativePath || a.filename).localeCompare(String(b.relativePath || b.filename), 'zh-Hant'));

      if (candidates.length) {
        const best = candidates[0];
        const equallyPreferred = candidates.filter((entry) => folderOrder(entry) === folderOrder(best)
          && extensionOrder(entry.filename) === extensionOrder(best.filename));
        layer.assetFilename = best.lookupName || best.filename;
        layer.assetProject = best.folder || spec.preferredFolder || '';
        layer.assetCandidates = [];
        layer.__assetMissing = false;
        if (equallyPreferred.length > 1) {
          this.updateSpecAssetWarning(
            template,
            warningToken,
            `第 ${sourceRow} 列 ${canonicalName} 找到多個同名素材；使用 ${best.relativePath || best.filename}`,
          );
        } else {
          this.updateSpecAssetWarning(template, warningToken, '');
        }
        return { found: true, candidate: best };
      }

      // No uploaded asset index yet: keep deterministic candidates so the packaged ./assets tree can still load.
      layer.assetFilename = `${spec.stem}.${extensions[0]}`;
      layer.assetCandidates = extensions.slice(1).map((ext) => `${spec.stem}.${ext}`);
      layer.assetProject = spec.preferredFolder || '';
      layer.__assetMissing = false;
      return { found: false, candidates: [layer.assetFilename, ...layer.assetCandidates], unresolved: true };
    },
    async loadImagesForActiveTemplate(options = {}) {
      const seq = ++AppState.imageLoadSeq;
      const images = await this.loadImagesForTemplate(AppState.template, options);
      // 防止批次縮圖背景載入時覆蓋目前畫布的圖片快取。
      if (seq === AppState.imageLoadSeq) {
        AppState.images = images;
        try { await new Promise(requestAnimationFrame); } catch (_) {}
        // 圖片載入完成後，只讓非 edited-json absolute 的價格圖層重新依圖片實際尺寸同步。
        // edited JSON 寫回的 absolute 價格座標必須先保持原始絕對值；
        // 商品圖若由使用者手動移動 / 縮放，會由 handleLayerBoxApplied 即時連動價格。
        Object.values(AppState.template?.layers || {}).forEach((layer) => {
          if (
            layer?.source === 'auto_price_v2' &&
            layer.anchor?.layerKey &&
            layer.lockToEditedJson !== true &&
            layer.positioningMode !== 'absolute'
          ) {
            layer._anchorDirty = true;
          }
        });
      }
      return images;
    },
    setResolvedAssetMetadata(layer, { file = null, candidate = '', folderHint = '', url = '', embedded = false } = {}) {
      if (!layer) return;
      let folder = String(folderHint || '').trim();
      let filename = String(candidate || layer.assetFilename || '').split(/[\\/]/).pop();

      if (file) {
        const entry = AssetStore.getFileEntries().find((item) => item.file === file);
        if (entry) {
          folder = String(entry.folder || '').trim();
          filename = String(entry.filename || file.name || filename).trim();
          // webkitRelativePath 可能含「使用者選取的 assets 根資料夾」與更深的公版子資料夾。
          // Smart Object Identity 必須保留實際命中的完整相對路徑，不能只留第一層 folder。
          const relativeParts = String(entry.relativePath || '').replace(/\\/g, '/').split('/').filter(Boolean);
          if (folder) {
            const folderIndex = relativeParts.findIndex((part) => part === folder);
            if (folderIndex >= 0 && relativeParts.length > folderIndex + 1) {
              folder = relativeParts.slice(folderIndex, -1).join('/');
            }
          }
        } else {
          filename = String(file.name || filename).trim();
        }
      } else if (embedded) {
        folder = '@embedded';
      } else if (url) {
        const decodedUrl = (() => { try { return decodeURIComponent(String(url)); } catch (_) { return String(url); } })();
        const normalizedUrl = decodedUrl.replace(/\\/g, '/').replace(/^\.\//, '');
        const assetIndex = normalizedUrl.toLowerCase().lastIndexOf('assets/');
        if (assetIndex >= 0) {
          const relativeAssetPath = normalizedUrl.slice(assetIndex + 'assets/'.length).split(/[?#]/)[0];
          const parts = relativeAssetPath.split('/').filter(Boolean);
          if (parts.length) {
            filename = parts.pop() || filename;
            folder = parts.join('/');
          }
        }
      }

      layer.__resolvedAssetFolder = folder;
      layer.__resolvedAssetFilename = filename;
      layer.__resolvedAssetPath = `${folder || '@root'}/${filename}`;
    },
    async loadImagesForTemplate(template, options = {}) {
      const images = {};
      if (!template) return images;

      const lookupProject = this.resolveAssetLookupProject(template, options);
      const entries = Object.entries(template.layers || {});
      const missingDiagnosticsMode = flag('assets.missingDiagnostics', 'spec');
      // templateList（LineOA）／templateListMarkMissing（鏡面：同上，且載入失敗一律標 __assetMissing）。
      const templateListDiagnostics = missingDiagnosticsMode === 'templateList' || missingDiagnosticsMode === 'templateListMarkMissing';
      // （跨夜）任何載入失敗一律標記缺素材並記到 BatchDiagnostics（上傳槽才能畫出「＋ 上傳圖片」空槽）。
      const alwaysMarkMissing = missingDiagnosticsMode === 'batchDiagnosticsAlways';
      const markMissingOnFailure = missingDiagnosticsMode === 'templateListMarkMissing';
      // （跨夜）依賴文字實際量測寬度的版型必須等字型就緒才算得準。
      if (flag('assets.waitFontsBeforeLoad', false)) await TextBaselineModel.waitForFonts();
      await Promise.all(entries.map(async ([key, layer]) => {
        if (layer.type !== 'image' || layer.hidden) return;
        const specResolution = this.resolveAssetSpec(template, key, layer);
        // Spec-driven assets are supplied through the uploaded assets folder. Before that index exists,
        // do not probe a sequence of packaged URL fallbacks that are expected to be absent; loading
        // the assets folder will rerun this function and resolve the exact file deterministically.
        if (specResolution?.unresolved && AssetStore.getTotalFileCount() === 0) {
          layer.__assetMissing = true;
          return;
        }
        if (!layer.assetFilename) {
          if (specResolution || alwaysMarkMissing) layer.__assetMissing = true;
          return;
        }

        // 一般公版素材仍以 JSON assetFilename 為準；有 __assetSpec 的圖層則由共用解析器覆寫。（例如「LOGO」這個共用圖層，
        // JSON裡就應該直接寫 assetFilename: "直播日_LOGO.svg"）。app.core.js 不會針對任何
        // 特定圖層名稱寫死覆寫規則——JSON是主要資料來源，共用素材則靠下面的「共用素材資料夾」比對路徑找到。
        const filename = String(layer.assetFilename || '').trim();
        const candidates = [
          filename,
          ...(Array.isArray(layer.assetCandidates) ? layer.assetCandidates : []),
        ].map((name) => String(name || '').trim()).filter(Boolean);
        const uniqueCandidates = [...new Set(candidates)];

        for (const candidate of uniqueCandidates) {
          const layerProject = String(layer.assetProject || lookupProject || '').trim();
          const localFile = this.findLocalAssetFile(candidate, template, { project: layerProject, layerKey: key, layer });

          // 1) 使用者手動上傳素材：最穩，使用 blob URL，不會污染 Canvas。
          // 用 localFile（File 物件本身）當快取 key：同一個專案下同一個檔名，AssetStore
          // 一定回傳同一個 File 物件，所以這個 key 天然就是「這個檔案」的正確識別，不用擔心
          // 跨專案搞混；使用者重新上傳同名檔案時，AssetStore 內部會換成新的 File 物件，
          // key 自然對不上舊快取，會重新載入，不會吃到過期的快取。
          if (localFile) {
            if (!imageLoadCache.has(localFile)) {
              imageLoadCache.set(localFile, (async () => {
                const objectUrl = URL.createObjectURL(localFile);
                try { return await this.loadImage(objectUrl); }
                finally { scheduleBlobRevoke(objectUrl); }
              })());
            }
            try {
              images[key] = await imageLoadCache.get(localFile);
              this.setResolvedAssetMetadata(layer, { file: localFile, candidate, folderHint: layerProject });
              layer.__assetMissing = false;
              if (templateListDiagnostics) this.recordAssetLoadDiagnostic(template, key, layer, [], false);
              if (specResolution) this.updateSpecAssetWarning(template, `${template?.templateId || 'network'}::${key}`, '');
              return;
            } catch (_) { imageLoadCache.delete(localFile); }
          }

          // 2) 內建素材 fallback：直接用 Data URI，讓本機 file:// 開啟也能正常顯示與下載。
          if (typeof EMBEDDED_ASSETS !== 'undefined' && EMBEDDED_ASSETS[candidate]) {
            const cacheKey = `embedded::${candidate}`;
            if (!imageLoadCache.has(cacheKey)) imageLoadCache.set(cacheKey, this.loadImage(EMBEDDED_ASSETS[candidate]));
            try {
              images[key] = await imageLoadCache.get(cacheKey);
              this.setResolvedAssetMetadata(layer, { candidate, embedded: true });
              layer.__assetMissing = false;
              if (templateListDiagnostics) this.recordAssetLoadDiagnostic(template, key, layer, [], false);
              return;
            }
            catch (_) { imageLoadCache.delete(cacheKey); }
          }

          // 3) 依「目前專案」資料夾優先找，找不到再退到共用素材資料夾、assets/ 根目錄；
          //    這些都是直接用 <img src> 讀取本機檔案，file:// 下可正常運作（不受 fetch() 的安全限制影響）。
          const encodedCandidate = encodeAssetPath(candidate);
          const urls = [];
          const urlProject = String(layer.assetProject || lookupProject || '').trim();
          const lookupScope = getAssetLookupScope(template);
          if (lookupScope.strictScope) {
            // （LineOA／鏡面）嚴格範圍：assets/<公版同名資料夾>/ → 專案 → assets/ 根目錄 → assets/共用素材/ → 停止。
            if (lookupScope.templateFolder) urls.push(`./assets/${encodeAssetPath(lookupScope.templateFolder)}/${encodedCandidate}`);
            if (urlProject && urlProject !== lookupScope.templateFolder) urls.push(`./assets/${encodeAssetPath(urlProject)}/${encodedCandidate}`);
            urls.push(`./assets/${encodedCandidate}`);
            urls.push(`./assets/共用素材/${encodedCandidate}`);
          } else if (urlProject) {
            const project = urlProject;
            // 扁平：assets/<專案>/<檔案>（檔名本身通常已經包含公版名稱前綴，例如 "C2C BN_360_KV_BG.png"）。
            urls.push(`./assets/${encodeAssetPath(project)}/${encodedCandidate}`);
            // 巢狀：assets/<專案>/<公版名稱>/<檔案>（保留相容，早期文件建議的歸檔方式）。
            const templateFolderName = AppState.templates?.[AppState.activeIndex]?.name || template?.templateId || '';
            if (templateFolderName) {
              urls.push(`./assets/${encodeAssetPath(project)}/${encodeAssetPath(templateFolderName)}/${encodedCandidate}`);
            }
          }
          if (!lookupScope.strictScope) {
            // 共用素材資料夾（不分專案、不分公版，任何素材都能放在這裡共用）。
            urls.push(`./assets/共用素材/${encodedCandidate}`);
            // 一般路徑載入：適合用 Live Server / http 開啟，也是「共用素材（assets根目錄）」的比對路徑。
            // zip 內部分中文檔名會保留為 #Uxxxx；URL 需要 encode，否則 # 會被瀏覽器視為 fragment。
            urls.push(`./assets/${encodedCandidate}`, `./${encodedCandidate}`, `assets/${encodedCandidate}`, encodedCandidate);
          }
          for (const url of urls) {
            // 同一個路徑字串（同一個檔案），批次跑很多版位時常常會重複用到（共用背景、同一組
            // 商品照片用在多個尺寸），快取起來避免重複下載/解碼，是批次匯出最主要的效能瓶頸。
            if (!imageLoadCache.has(url)) imageLoadCache.set(url, this.loadImage(url));
            try {
              images[key] = await imageLoadCache.get(url);
              this.setResolvedAssetMetadata(layer, { candidate, folderHint: urlProject, url });
              layer.__assetMissing = false;
              if (templateListDiagnostics) this.recordAssetLoadDiagnostic(template, key, layer, [], false);
              if (specResolution) this.updateSpecAssetWarning(template, `${template?.templateId || 'network'}::${key}`, '');
              return;
            }
            catch (_) { imageLoadCache.delete(url); }
          }
        }

        console.warn('[Assets] 圖片載入失敗:', key, uniqueCandidates.join(' / '));
        images[key] = null;
        if (templateListDiagnostics) this.recordAssetLoadDiagnostic(template, key, layer, uniqueCandidates, true);
        if (specResolution) {
          layer.__assetMissing = true;
          const sourceRow = template?.__meta?.sourceRow || template?.batchRecord?.__sourceRow || '?';
          const canonicalName = String(layer.__canonicalName || layer.psdName || key || '').trim();
          this.updateSpecAssetWarning(
            template,
            `${template?.templateId || 'network'}::${key}`,
            `第 ${sourceRow} 列 ${canonicalName} 找不到素材：${specResolution?.candidates?.join(' / ') || uniqueCandidates.join(' / ')}`,
          );
        } else if (markMissingOnFailure) {
          layer.__assetMissing = true;
        } else if (alwaysMarkMissing) {
          layer.__assetMissing = true;
          const sourceRow = template?.__meta?.sourceRow || template?.batchRecord?.__sourceRow || '?';
          const canonicalName = String(layer.__canonicalName || layer.psdName || key || '').trim();
          BatchDiagnostics.addAssetWarning(
            `${template?.templateId || 'template'}::${key}`,
            `第 ${sourceRow} 列 ${canonicalName} 找不到素材：${uniqueCandidates.join(' / ')}`,
          );
        }
      }));

      // （跨夜）字型與素材都就緒後讓規則檔重算依賴文字量測的版型（純重算，沒有工單資料也安全）。
      if (flag('assets.waitFontsBeforeLoad', false)) {
        window.BatchManager?.applyTemplateRuleHook?.('afterTemplateAssetsReady', template, template.batchRecord || {}, [], { images });
      }
      this.captureRenderModel(template);
      return images;
    },
    findLocalAssetFile(filename, template = AppState.template, options = {}) {
      const lookupProject = this.resolveAssetLookupProject(template, options);
      const assetPolicy = getAssetPolicy({ layer: options.layer, layerKey: options.layerKey, filename });
      const lookupScope = getAssetLookupScope(template);
      const files = AssetStore.getFlatForLookup(lookupProject, {
        allowCrossProjectFallback: assetPolicy.allowCrossProjectFallback !== false && !lookupScope.strictScope,
        templateFolder: lookupScope.templateFolder,
        strictScope: lookupScope.strictScope,
      });
      if (!filename || !files.size) return null;

      const basename = (value) => String(value || '').split(/[\\/]/).pop();
      const keys = [...files.keys()];
      const directName = String(filename || '').trim();
      const directBase = basename(directName);

      // Restore Snapshot 記錄的是當時實際命中的相對素材路徑。
      // 若 assets 內有同名檔案，必須先精準找回原路徑，而不是只靠檔名選第一個。
      const resolvedPath = String(options.layer?.__resolvedAssetPath || '').trim();
      if (SnapshotManager.shouldProtectVisualState(template) && resolvedPath && !resolvedPath.startsWith('@')) {
        const normalizePath = (value) => decodeHashUnicode(String(value || ''))
          .replace(/\\/g, '/')
          .replace(/^\.\//, '')
          .replace(/^assets\//i, '')
          .replace(/^\/+|\/+$/g, '')
          .toLowerCase();
        const wantedResolvedPath = normalizePath(resolvedPath);
        const exactResolvedKey = keys.find((name) => {
          const candidatePath = normalizePath(name);
          return candidatePath === wantedResolvedPath || candidatePath.endsWith(`/${wantedResolvedPath}`);
        });
        if (exactResolvedKey) return files.get(exactResolvedKey);
      }

      if (files.has(directName)) return files.get(directName);
      if (files.has(directBase)) return files.get(directBase);

      const clean = (value) => decodeHashUnicode(value).toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[\s\u00a0\u3000\t\r\n]+/g, '')
        .replace(/[\-_()（）\[\]【】.]/g, '');

      const templateLabels = [
        template?.canvas?.templateId,
        template?.templateId,
        template?.batchSourceName,
        template?.sheetTemplateRoute?.sourceTemplateId,
        template?.source?.psdName,
        AppState.templates?.[AppState.activeIndex]?.name,
        AppState.templates?.[AppState.activeIndex]?.file,
      ].filter(Boolean);
      const templateKeys = [...new Set(templateLabels.map(clean).filter(Boolean))];
      const fileBaseKey = clean(directBase);
      const fileFullKey = clean(directName);
      const baseMatches = (name) => {
        const keyBase = clean(basename(name));
        return keyBase === fileBaseKey || keyBase === fileFullKey;
      };
      const pathMatchesTemplate = (name) => {
        const path = clean(String(name || '').replace(/[\\/][^\\/]+$/g, ''));
        return templateKeys.some((templateKey) => path.includes(templateKey) || templateKey.includes(path));
      };

      // 公版素材優先：若使用者載入整包 assets，優先命中與目前公版名稱相同/相近的子資料夾。
      const preferredHit = keys.find((name) => baseMatches(name) && pathMatchesTemplate(name));
      if (preferredHit) return files.get(preferredHit);

      const exactBaseHit = keys.find((name) => baseMatches(name));
      if (exactBaseHit) return files.get(exactBaseHit);

      const wanted = clean(directName);
      const wantedBase = clean(directBase);
      const shopeeVipKey = clean('蝦皮VIP_LOGO.svg');

      // 蝦皮 VIP 與一般 VIP 是不同素材：找「蝦皮VIP_LOGO.svg」時不可 fallback 到「VIP_LOGO.svg」。
      if (wanted.includes(shopeeVipKey) || wantedBase === shopeeVipKey) {
        const shopeeVipHit = keys.find((name) => {
          const baseKey = clean(basename(name));
          return baseKey === shopeeVipKey && (!templateKeys.length || pathMatchesTemplate(name));
        }) || keys.find((name) => clean(basename(name)) === shopeeVipKey);
        return shopeeVipHit ? files.get(shopeeVipHit) : null;
      }

      const exactNormalizedHit = keys.find((name) => {
        const key = clean(name);
        const baseKey = clean(basename(name));
        return key === wanted || baseKey === wantedBase;
      });
      if (exactNormalizedHit) return files.get(exactNormalizedHit);

      // 背景、商品圖、票券必須精準命中，禁止進入 includes 模糊搜尋，以免同名近似素材誤套。
      if (assetPolicy.allowFuzzyMatch === false) return null;

      const fuzzyPreferredHit = keys.find((name) => {
        const baseKey = clean(basename(name));
        return pathMatchesTemplate(name) && (baseKey.includes(wantedBase) || wantedBase.includes(baseKey));
      });
      if (fuzzyPreferredHit) return files.get(fuzzyPreferredHit);

      // 最終備援：完全沒有路徑線索可用時（前面幾層都沒命中），
      // 蒐集所有模糊比對候選，優先選「清理後字串長度跟目標最接近」的，
      // 不再是「陣列裡第一個」——避免結果因檔案列舉順序不同而改變。
      const finalCandidates = keys
        .map((name) => {
          const key = clean(name);
          const baseKey = clean(basename(name));
          const isMatch = key === wanted || baseKey === wantedBase || key.includes(wanted) || wanted.includes(key) || baseKey.includes(wantedBase) || wantedBase.includes(baseKey);
          if (!isMatch) return null;
          const lengthDiff = Math.min(Math.abs(key.length - wanted.length), Math.abs(baseKey.length - wantedBase.length));
          return { name, lengthDiff };
        })
        .filter(Boolean);
      if (!finalCandidates.length) return null;
      finalCandidates.sort((a, b) => a.lengthDiff - b.lengthDiff);
      return files.get(finalCandidates[0].name);
    },
    loadImage(src) { return new Promise((resolve, reject) => { const img = new Image(); const s = String(src); if (/^https?:\/\//i.test(s)) img.crossOrigin = 'anonymous';
        const timer = setTimeout(() => reject(new Error('image load timeout')), 8000);
        img.onload = async () => { clearTimeout(timer); try { if (img.decode) await img.decode(); } catch (_) {} await new Promise(requestAnimationFrame); resolve(img); };
        img.onerror = (err) => { clearTimeout(timer); reject(err); };
        img.src = src;
      });
    },
    async loadAssetFolder(fileList) {
      const imageFiles = [...fileList].filter((file) => /^image\//i.test(file.type) || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name));
      const byFolder = new Map();
      imageFiles.forEach((file) => {
        const decodeUnicodeName = (value) => String(value || '').replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const relPath = decodeUnicodeName(file.webkitRelativePath || file.name);
        const parts = relPath.split('/').filter(Boolean);
        // parts[0] 是使用者選取的資料夾本身（例如「assets」）；parts[1] 是底下第一層子資料夾
        // （專案名稱，例如「4.17 直播日」，或「共用素材」）。如果檔案直接放在選取資料夾的根目錄下
        // （parts.length < 3，沒有再包一層子資料夾），歸類到 folderName = ''（根目錄）。
        const folderName = parts.length >= 3 ? parts[1] : '';
        if (!byFolder.has(folderName)) byFolder.set(folderName, new Map());
        const bucket = byFolder.get(folderName);
        const decodedName = decodeUnicodeName(file.name);
        if (!bucket.has(decodedName)) bucket.set(decodedName, file);
        if (!bucket.has(relPath)) bucket.set(relPath, file);
      });
      AppState.assetFiles = byFolder;
      await this.loadImagesForActiveTemplate();
      window.SpecOverlayManager?.refresh?.();
      Renderer.render();
      const totalCount = AssetStore.getTotalFileCount();
      const folderSummary = [...byFolder.entries()]
        .map(([name, bucket]) => `${name || '(根目錄)'} ${bucket.size}個`)
        .join('、');
      this.setStatus(`已載入 ${totalCount} 個素材${folderSummary ? `（${folderSummary}）` : ''}`);

      // 批次預覽縮圖必須在素材重新載入後主動重建。
      // 原本只更新目前主畫布的 AppState.images，已經產出的縮圖 DOM 不會自動重畫；
      // 所以使用者第一次載入素材後會看到縮圖仍是缺圖/失敗，第二次再上傳素材才因其他流程被觸發而顯示。
      // 這裡在素材索引完成後，若目前已經是批次模式，先把每張圖自己的 batchRecord
      // 重新套回 template，再重跑縮圖產生流程。這可確保「第一次缺素材造成的暫存狀態」
      // 不會殘留到縮圖，縮圖與下載 ZIP 使用相同的最新套版資料。
      if (AppState.batchMode && (AppState.batchItems?.length || AppState.templates?.length) && window.BatchManager?.renderPreviewGrid) {
        try {
          LoadingOverlay.show('正在重新套用資料並產生縮圖...', 0);
          window.BatchManager.refreshGeneratedTemplatesFromBatchRecords?.();
          await window.BatchManager.renderPreviewGrid({ showProgress: true, revealWhenDone: true });
        } catch (error) {
          console.warn('[Assets] 素材載入後重新產生縮圖失敗:', error);
        } finally {
          LoadingOverlay.hide();
        }
      }
    },
    async loadTemplateFolder(fileList) {
      const files = [...fileList].filter((file) => file.name.endsWith('.json') && file.name !== 'manifest.json');
      AppState.templates = [];
      for (const file of files) {
        try {
          const data = JSON.parse(await file.text());
          const isRestoreSnapshot = flag('templates.snapshotRestore', true) && SnapshotManager.prepareLoadedSnapshot(data);
          // Snapshot 已保存文字 baseline / ranges；prepareTemplate 只補缺少的 reference，既有 version 2 baseline 不會重算。
          // 整合版：templates.textBaselinePrepare=false（KV）維持舊行為，不建立文字基線參考。
          if (flag('templates.textBaselinePrepare', true)) await TextBaselineModel.prepareTemplate(data, { source: isRestoreSnapshot ? 'snapshot-restore' : 'json' });
          // 一般公版可由 AssetSpecEngine 補初始化資料；Restore Snapshot 禁止任何額外 prepare 覆寫最終狀態。
          if (!isRestoreSnapshot) {
            // 整合版 templates.prepareHook：'assetSpecEngine'（network 等）／'ruleHook'（跨夜：交給規則檔的 prepareTemplate）。
            if (flag('templates.prepareHook', 'assetSpecEngine') === 'ruleHook') window.BatchManager?.applyTemplateRuleHook?.('prepareTemplate', data, {}, []);
            else window.AssetSpecEngine?.prepareTemplate?.(data);
          }
          // （AMS）templates.layerDefaults：公版載入時套用規則宣告的預設鎖定；快照不套。
          if (!isRestoreSnapshot && flag('templates.layerDefaults', false)) LayerDefaults.apply(data);
          AppState.templates.push({
            name: data.templateId || file.name.replace(/\.template\.json$/i, ''),
            file: file.name,
            visible: true,
            data,
            restoreSnapshot: isRestoreSnapshot,
          });
        } catch (_) {}
      }
      if (!AppState.templates.length) return;
      AppState.activeIndex = 0;
      AppState.template = AppState.templates[0].data;
      AppState.selectedLayers = [];
      const snapshotCount = AppState.templates.filter((item) => item.restoreSnapshot).length;
      const statusSuffix = snapshotCount ? `（其中 ${snapshotCount} 個為完整還原 JSON）` : '';
      this.setStatus(`已從資料夾載入 ${AppState.templates.length} 個公版${statusSuffix}`);
      await this.loadImagesForActiveTemplate();
      window.SpecOverlayManager?.refresh?.();
      App.sync();
    },
  };
  // ── TemplateLoader：A 系實作（正式BN V0.8 為底）──
  const TemplateLoader_A = {
    async boot() {
      try { if (window.FontPreloader?.ready) await window.FontPreloader.ready; await document.fonts.ready; } catch (_) {}

      // 使用者資料（公版／素材／工單）維持手動上傳；Rule 程式由 rules/rules.manifest.js 集中管理，
      // TemplateRulesLoader.ready 會在 App.init() 之前完成逐支載入與註冊，因此此處只讀取註冊結果。
      const rulesLoaded = (window.TemplateRuleRegistry?.list?.() || []).length;

      // 開頁不再顯示「載入完成」浮動視窗；使用者手動上傳素材/公版/工單。
      this.clearTemplates('尚未上傳公版，請點擊左側「上傳公版」選擇 templates 資料夾');
      this.populateProjectOptions();

      App.sync();
    },

    // 「目前專案」的選項清單，完全依上傳工單時偵測到的矩陣式工單專案名稱（例如「4.17 直播日」）而定。
    // 這份清單現在餵給浮動視窗（projectModalOverlay）使用，不再是側欄的下拉選單。
    populateProjectOptions() {
      const projects = Array.isArray(AppState.detectedExcelProjects) ? [...new Set(AppState.detectedExcelProjects)] : [];
      AppState.availableProjectOptions = projects;
      // 保留使用者原本選的專案（如果新清單裡還有這個選項，或本來就是All）；沒有的話才清空。
      if (AppState.currentProject !== ALL_PROJECTS_VALUE && !projects.includes(AppState.currentProject)) {
        AppState.currentProject = '';
      }
      this.updateCurrentProjectDisplay();
      this.renderProjectModalOptions();
    },

    updateCurrentProjectDisplay() {
      if (!DOM.currentProjectDisplay) return;
      const value = AppState.currentProject;
      DOM.currentProjectDisplay.textContent = value === ALL_PROJECTS_VALUE
        ? 'All（全部專案一起做）'
        : (value || '（尚未選擇）');
    },

    // 畫出浮動視窗裡的專案選項（3個偵測到的專案 + 一個「All」選項）。
    renderProjectModalOptions() {
      if (!DOM.projectModalOptions) return;
      const projects = AppState.availableProjectOptions || [];
      if (!projects.length) {
        DOM.projectModalOptions.innerHTML = '<div class="modal-description">目前的工單分頁沒有偵測到專案欄位，不需要選擇專案。</div>';
        return;
      }
      const options = [...projects, ALL_PROJECTS_VALUE];
      DOM.projectModalOptions.innerHTML = options.map((value) => {
        const isAll = value === ALL_PROJECTS_VALUE;
        const label = isAll ? 'All（全部專案一起做）' : value;
        const checked = AppState.currentProject === value ? 'checked' : '';
        return `<label class="modal-option${isAll ? ' is-all-option' : ''}"><input type="radio" name="projectModalRadio" value="${escapeHtml(value)}" ${checked}/> ${escapeHtml(label)}</label>`;
      }).join('');
    },

    openProjectModal() {
      this.renderProjectModalOptions();
      DOM.projectModalOverlay?.classList.remove('hidden');
    },

    closeProjectModal() {
      DOM.projectModalOverlay?.classList.add('hidden');
    },

    async bootEmpty() {
      try { if (window.FontPreloader?.ready) await window.FontPreloader.ready; await document.fonts.ready; } catch (_) {}
      this.clearTemplates('請先上傳公版');
      App.sync();
    },

    clearTemplates(message = '尚未載入公版') {
      AppState.templates = [];
      AppState.activeIndex = 0;
      AppState.template = null;
      AppState.selectedLayers = [];
      AppState.hoverLayer = null;
      AppState.images = {};
      AppState.specOverlayImage = null;
      AppState.specOverlayFilename = '';
      AppState.sourceTemplates = null;
      AppState.batchItems = [];
      AppState.unmatchedBatchItems = [];
      AppState.batchGroupsOpen = {};
      AppState.batchDiagnostics = null;
      AppState.templateFilter = 'All';
      AppState.templateGroupsOpen = {};
      AppState.batchMode = false;
      AppState.history = [];
      AppState.future = [];
      AppState.historySequence = 0;
      this.setStatus(message);
      this.clearTemplateUI();
    },

    clearTemplateUI() {
      if (DOM.templateList) DOM.templateList.innerHTML = '';
      if (DOM.layerList) DOM.layerList.innerHTML = '';
      if (DOM.batchItemList) DOM.batchItemList.innerHTML = '';
      if (DOM.batchPreviewGrid) DOM.batchPreviewGrid.innerHTML = '';
      DOM.batchPreviewPanel?.classList.add('hidden');
      DOM.canvasShell?.classList.remove('batch-mode');
      if (DOM.unmatchedBox) {
        DOM.unmatchedBox.innerHTML = '';
        DOM.unmatchedBox.classList.add('hidden');
      }
      if (DOM.selectedLayerName) DOM.selectedLayerName.textContent = '未選取';
      if (DOM.emptyInspector) DOM.emptyInspector.classList.remove('hidden');
      if (DOM.commonControls) DOM.commonControls.classList.add('hidden');
      if (DOM.textControls) DOM.textControls.classList.add('hidden');
      if (DOM.activeTemplateName) DOM.activeTemplateName.textContent = '未載入';
      if (DOM.canvasSize) DOM.canvasSize.textContent = '0 × 0';
      ['statusX', 'statusY', 'statusW', 'statusH'].forEach((id) => { const el = $(id); if (el) el.textContent = '0'; });
      if (DOM.canvas) {
        ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
      }
    },

    resetAll() {
      this.clearTemplates('請先上傳公版');
      AppState.assetFiles = new Map();
      AppState.excelWorkbook = null;
      AppState.excelFileName = '';
      AppState.layerSearch = '';
      AppState.previewZoom = 1;
      AppState.showSpecOverlay = $('specToggle') ? $('specToggle').checked : true;

      if (DOM.layerSearch) DOM.layerSearch.value = '';
      if (DOM.templateFilter) DOM.templateFilter.value = 'All';
      if (DOM.excelSheetSelect) {
        DOM.excelSheetSelect.innerHTML = '<option value="">尚未上傳工單</option>';
        DOM.excelSheetSelect.disabled = true;
      }
      if (DOM.generateFromExcelBtn) DOM.generateFromExcelBtn.disabled = true;
      if (DOM.batchStatus) DOM.batchStatus.textContent = '尚未產生預覽檔案';
      ['assetInput', 'templateFolderInput', 'excelInput'].forEach((id) => { const el = $(id); if (el) el.value = ''; });
      TextEditor.cancel();
    },
    setStatus(message) { if (DOM.loadStatus) DOM.loadStatus.textContent = message; },
    resolveAssetLookupProject(template = AppState.template, options = {}) {
      const explicitProject = options.project ?? template?.batchProject ?? template?.batchRecord?.__project ?? '';
      if (explicitProject && explicitProject !== ALL_PROJECTS_VALUE && AssetStore.getBucket(explicitProject).size) return explicitProject;
      const normalize = (value) => window.RuntimePolicy?.normalizeTemplateIdentity?.(value) || normStr(value);
      const identity = normalize(
        template?.sheetTemplateRoute?.sourceTemplateId || template?.sheetTemplateRoute?.sourceTemplateFile || template?.sourceTemplateId || template?.canvas?.templateId || template?.templateId || ''
      );
      const candidates = AssetStore.getFolderNames()
        .filter((folder) => folder && folder !== '共用素材')
        .map((folder) => ({ folder, key: normalize(folder) }))
        .filter(({ key }) => key && identity && (key === identity || identity.startsWith(key) || key.startsWith(identity)))
        .sort((a, b) => b.key.length - a.key.length);
      if (candidates.length) return candidates[0].folder;
      if (AppState.currentProject && AppState.currentProject !== ALL_PROJECTS_VALUE && AssetStore.getBucket(AppState.currentProject).size) return AppState.currentProject;
      return '';
    },
    updateSpecAssetWarning(template, token, message = '') {
      const diagnostics = AppState.batchDiagnostics;
      if (!diagnostics?.specDriven || !token) return;
      if (!diagnostics.__baseWarnings) diagnostics.__baseWarnings = [...(diagnostics.warnings || [])];
      if (!diagnostics.__assetWarnings) diagnostics.__assetWarnings = {};
      if (message) diagnostics.__assetWarnings[token] = message;
      else delete diagnostics.__assetWarnings[token];
      diagnostics.warnings = [
        ...diagnostics.__baseWarnings,
        ...Object.values(diagnostics.__assetWarnings),
      ];
    },
    resolveAssetSpec(template, key, layer) {
      const spec = layer?.__assetSpec;
      if (!spec || layer.__manualAsset === true) return null;
      const stem = normalizeAssetStemExact(spec.stem);
      const sourceRow = template?.__meta?.sourceRow || template?.batchRecord?.__sourceRow || '?';
      const canonicalName = String(layer.__canonicalName || layer.psdName || key || '').trim();
      const warningToken = `${template?.templateId || 'network'}::${key}`;
      const extensions = window.AssetSpecEngine?.imageExtensions || ['svg', 'png', 'webp', 'jpg', 'jpeg'];
      if (!stem) {
        layer.assetFilename = '';
        layer.__assetMissing = true;
        this.updateSpecAssetWarning(template, warningToken, `第 ${sourceRow} 列 ${canonicalName} 沒有可配對的素材來源`);
        return { found: false, candidates: [] };
      }

      const entries = AssetStore.getFileEntries().filter((entry) => normalizeAssetStemExact(entry.filename) === stem);
      const wantedFolder = String(spec.preferredFolder || '').trim().toLowerCase();
      const isDynamicLogo = spec.kind === 'dynamic-logo';
      const isKvBackground = spec.kind === 'kv-bg';
      const scopedEntries = (isDynamicLogo || isKvBackground)
        ? entries.filter((entry) => String(entry.folder || '').trim().toLowerCase() === wantedFolder)
        : entries;
      const candidates = scopedEntries.length ? scopedEntries : (isDynamicLogo || isKvBackground ? [] : entries);
      const extensionOrder = (filename) => {
        const ext = String(filename || '').match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
        const index = extensions.indexOf(ext);
        return index < 0 ? extensions.length : index;
      };
      const folderOrder = (entry) => {
        const folder = String(entry.folder || '').trim().toLowerCase();
        if (wantedFolder && folder === wantedFolder) return 0;
        if (!folder) return 1;
        return 2;
      };
      candidates.sort((a, b) => folderOrder(a) - folderOrder(b)
        || extensionOrder(a.filename) - extensionOrder(b.filename)
        || String(a.relativePath || a.filename).localeCompare(String(b.relativePath || b.filename), 'zh-Hant'));

      if (candidates.length) {
        const best = candidates[0];
        const equallyPreferred = candidates.filter((entry) => folderOrder(entry) === folderOrder(best)
          && extensionOrder(entry.filename) === extensionOrder(best.filename));
        layer.assetFilename = best.lookupName || best.filename;
        layer.assetProject = best.folder || spec.preferredFolder || '';
        layer.assetCandidates = [];
        layer.__assetMissing = false;
        if (equallyPreferred.length > 1) {
          this.updateSpecAssetWarning(
            template,
            warningToken,
            `第 ${sourceRow} 列 ${canonicalName} 找到多個同名素材；使用 ${best.relativePath || best.filename}`,
          );
        } else {
          this.updateSpecAssetWarning(template, warningToken, '');
        }
        return { found: true, candidate: best };
      }

      // No uploaded asset index yet: keep deterministic candidates so the packaged ./assets tree can still load.
      layer.assetFilename = `${spec.stem}.${extensions[0]}`;
      layer.assetCandidates = extensions.slice(1).map((ext) => `${spec.stem}.${ext}`);
      layer.assetProject = spec.preferredFolder || '';
      layer.__assetMissing = false;
      return { found: false, candidates: [layer.assetFilename, ...layer.assetCandidates], unresolved: true };
    },
    async loadImagesForActiveTemplate(options = {}) {
      const seq = ++AppState.imageLoadSeq;
      const images = await this.loadImagesForTemplate(AppState.template, options);
      // 防止批次縮圖背景載入時覆蓋目前畫布的圖片快取。
      if (seq === AppState.imageLoadSeq) {
        AppState.images = images;
        try { await new Promise(requestAnimationFrame); } catch (_) {}
        // 圖片載入完成後，只讓非 edited-json absolute 的價格圖層重新依圖片實際尺寸同步。
        // edited JSON 寫回的 absolute 價格座標必須先保持原始絕對值；
        // 商品圖若由使用者手動移動 / 縮放，會由 handleLayerBoxApplied 即時連動價格。
        Object.values(AppState.template?.layers || {}).forEach((layer) => {
          if (
            layer?.source === 'auto_price_v2' &&
            layer.anchor?.layerKey &&
            layer.lockToEditedJson !== true &&
            layer.positioningMode !== 'absolute'
          ) {
            layer._anchorDirty = true;
          }
        });
      }
      return images;
    },
    async loadImagesForTemplate(template, options = {}) {
      const images = {};
      if (!template) return images;

      const lookupProject = this.resolveAssetLookupProject(template, options);
      const entries = Object.entries(template.layers || {});
      await Promise.all(entries.map(async ([key, layer]) => {
        // （暖身BN V1.5）一般隱藏圖層維持既有行為；只有明確標記為「缺檔後可重試」的動態素材，
        // 才允許在使用者之後補上素材資料夾時再次解析。預設 false，不影響既有版位。
        if (layer.type !== 'image' || (layer.hidden && layer.__retryMissingAssetWhenHidden !== true)) return;
        const specResolution = this.resolveAssetSpec(template, key, layer);
        // Spec-driven assets are supplied through the uploaded assets folder. Before that index exists,
        // do not probe a sequence of packaged URL fallbacks that are expected to be absent; loading
        // the assets folder will rerun this function and resolve the exact file deterministically.
        if (specResolution?.unresolved && AssetStore.getTotalFileCount() === 0) {
          layer.__assetMissing = true;
          return;
        }
        if (!layer.assetFilename) {
          if (specResolution) layer.__assetMissing = true;
          return;
        }

        // 一般公版素材仍以 JSON assetFilename 為準；有 __assetSpec 的圖層則由共用解析器覆寫。（例如「LOGO」這個共用圖層，
        // JSON裡就應該直接寫 assetFilename: "直播日_LOGO.svg"）。app.core.js 不會針對任何
        // 特定圖層名稱寫死覆寫規則——JSON是主要資料來源，共用素材則靠下面的「共用素材資料夾」比對路徑找到。
        const filename = String(layer.assetFilename || '').trim();
        const candidates = [
          filename,
          ...(Array.isArray(layer.assetCandidates) ? layer.assetCandidates : []),
        ].flatMap((name) => assetNameVariantsForTemplate(name, template));
        const uniqueCandidates = [...new Set(candidates.map((name) => String(name || '').trim()).filter(Boolean))];

        for (const candidate of uniqueCandidates) {
          const layerProject = String(layer.assetProject || lookupProject || '').trim();
          const localFile = this.findLocalAssetFile(candidate, template, { project: layerProject, layerKey: key, layer, allowFuzzy: layer.__exactAssetMatch !== true });

          // 1) 使用者手動上傳素材：最穩，使用 blob URL，不會污染 Canvas。
          // 用 localFile（File 物件本身）當快取 key：同一個專案下同一個檔名，AssetStore
          // 一定回傳同一個 File 物件，所以這個 key 天然就是「這個檔案」的正確識別，不用擔心
          // 跨專案搞混；使用者重新上傳同名檔案時，AssetStore 內部會換成新的 File 物件，
          // key 自然對不上舊快取，會重新載入，不會吃到過期的快取。
          if (localFile) {
            if (!imageLoadCache.has(localFile)) {
              imageLoadCache.set(localFile, (async () => {
                const objectUrl = URL.createObjectURL(localFile);
                try { return await this.loadImage(objectUrl); }
                finally { scheduleBlobRevoke(objectUrl); }
              })());
            }
            try {
              images[key] = await imageLoadCache.get(localFile);
              layer.__assetMissing = false;
              if (specResolution) this.updateSpecAssetWarning(template, `${template?.templateId || 'network'}::${key}`, '');
              return;
            } catch (_) { imageLoadCache.delete(localFile); }
          }

          // 2) 內建素材 fallback：直接用 Data URI，讓本機 file:// 開啟也能正常顯示與下載。
          if (typeof EMBEDDED_ASSETS !== 'undefined' && EMBEDDED_ASSETS[candidate]) {
            const cacheKey = `embedded::${candidate}`;
            if (!imageLoadCache.has(cacheKey)) imageLoadCache.set(cacheKey, this.loadImage(EMBEDDED_ASSETS[candidate]));
            try { images[key] = await imageLoadCache.get(cacheKey); layer.__assetMissing = false; return; }
            catch (_) { imageLoadCache.delete(cacheKey); }
          }

          // 3) 內建檔案路徑 fallback 仍遵守 AssetLookup 的相同邊界：
          //    公版專屬素材只查自己的資料夾；商品圖才可再查「共用素材」；最後才查 assets 根目錄。
          const urls = [];
          const role = classifyAssetRole({ layer, layerKey: key, filename: candidate });
          const urlProject = String(layer.assetProject || lookupProject || '').trim();
          const commonAlways = flag('assets.urlCommonFolder', 'productOnly') === 'always';
          // （暖正MS V0.5）assets.urlExtensionExpand：每個候選再展開 6 種副檔名。
          const extensionMatch = String(candidate).match(/^(.*?)(\.[a-z0-9]+)?$/i);
          const diskCandidates = flag('assets.urlExtensionExpand', false)
            ? [...new Set([(extensionMatch?.[2] || '').toLowerCase(), '.png', '.svg', '.webp', '.jpg', '.jpeg'].filter(Boolean).map((ext) => `${extensionMatch?.[1] || String(candidate)}${ext}`))]
            : [candidate];
          diskCandidates.forEach((diskCandidate) => {
            const encodedCandidate = encodeAssetPath(diskCandidate);
            if (urlProject) {
              const project = urlProject;
              urls.push(`./assets/${encodeAssetPath(project)}/${encodedCandidate}`);
              // 舊式巢狀資料夾保留相容，但只能以「正在載入的 template」本身決定，不得讀 AppState.activeIndex。
              const templateFolderName = template?.sheetTemplateRoute?.sourceTemplateId || template?.sourceTemplateId || template?.templateId || template?.name || '';
              if (templateFolderName && project !== '共用素材') {
                urls.push(`./assets/${encodeAssetPath(project)}/${encodeAssetPath(templateFolderName)}/${encodedCandidate}`);
              }
            }
            if ((role === 'product' || commonAlways) && urlProject !== '共用素材') urls.push(`./assets/共用素材/${encodedCandidate}`);
            if (role !== 'product' && !commonAlways && layer.__allowCommonAssetFallback === true && urlProject !== '共用素材') urls.push(`./assets/共用素材/${encodedCandidate}`);
            // assets 根目錄是真正的全域素材來源；不掃描任何其他公版子資料夾。
            urls.push(`./assets/${encodedCandidate}`, `./${encodedCandidate}`, `assets/${encodedCandidate}`, encodedCandidate);
          });
          for (const url of urls) {
            // 同一個路徑字串（同一個檔案），批次跑很多版位時常常會重複用到（共用背景、同一組
            // 商品照片用在多個尺寸），快取起來避免重複下載/解碼，是批次匯出最主要的效能瓶頸。
            if (!imageLoadCache.has(url)) imageLoadCache.set(url, this.loadImage(url));
            try { images[key] = await imageLoadCache.get(url); layer.__assetMissing = false; if (specResolution) this.updateSpecAssetWarning(template, `${template?.templateId || 'network'}::${key}`, ''); return; }
            catch (_) { imageLoadCache.delete(url); }
          }
        }

        console.warn('[Assets] 圖片載入失敗:', key, uniqueCandidates.join(' / '));
        images[key] = null;
        if (flag('assets.missingDiagnostics', 'spec') === 'none') layer.__assetMissing = true;
        if (specResolution) {
          layer.__assetMissing = true;
          const sourceRow = template?.__meta?.sourceRow || template?.batchRecord?.__sourceRow || '?';
          const canonicalName = String(layer.__canonicalName || layer.psdName || key || '').trim();
          this.updateSpecAssetWarning(
            template,
            `${template?.templateId || 'network'}::${key}`,
            `第 ${sourceRow} 列 ${canonicalName} 找不到素材：${specResolution?.candidates?.join(' / ') || uniqueCandidates.join(' / ')}`,
          );
        }
      }));
      // （暖身BN V1.5）Rule 可在所有圖片實際載入後做「雙素材 separator 僅在兩張都成功時顯示」等後處理。
      // 未註冊 hook 的既有版位不受影響。
      if (window.BatchManager?.applyTemplateRuleHook) {
        const diagnostics = Array.isArray(template.batchDiagnostics) ? template.batchDiagnostics : [];
        window.BatchManager.applyTemplateRuleHook('afterLoadImagesForTemplate', template, template.batchRecord || {}, diagnostics, { images });
        template.batchDiagnostics = diagnostics;
      }
      return images;
    },
    findLocalAssetFile(filename, template = AppState.template, options = {}) {
      if (!filename) return null;
      const folder = this.resolveAssetLookupProject(template, options);
      const role = classifyAssetRole({ layer: options.layer, layerKey: options.layerKey, filename });
      return AssetLookup.match(filename, { folder, role, prefix: options.prefix || '', allowFuzzy: options.allowFuzzy !== false }).file || null;
    },
    loadImage(src) { return new Promise((resolve, reject) => { const img = new Image(); const s = String(src); if (/^https?:\/\//i.test(s)) img.crossOrigin = 'anonymous';
        const timer = setTimeout(() => reject(new Error('image load timeout')), 8000);
        img.onload = async () => { clearTimeout(timer); try { if (img.decode) await img.decode(); } catch (_) {} await new Promise(requestAnimationFrame); resolve(img); };
        img.onerror = (err) => { clearTimeout(timer); reject(err); };
        img.src = src;
      });
    },
    async loadAssetFolder(fileList) {
      const imageFiles = [...fileList].filter((file) => /^image\//i.test(file.type) || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name));
      const byFolder = new Map();
      imageFiles.forEach((file) => {
        const decodeUnicodeName = (value) => window.RuntimePolicy?.decodeHashUnicode?.(value) || decodeHashUnicode(value);
        const relPath = decodeUnicodeName(file.webkitRelativePath || file.name);
        const parts = relPath.split('/').filter(Boolean);
        const folderName = parts.length >= 3 ? parts[1] : '';
        if (!byFolder.has(folderName)) byFolder.set(folderName, new Map());
        const bucket = byFolder.get(folderName);
        const decodedName = decodeUnicodeName(file.name);
        if (!bucket.has(decodedName)) bucket.set(decodedName, file);
        if (!bucket.has(relPath)) bucket.set(relPath, file);
      });

      // 第35/36題：重載素材只換內容，不重跑 Excel/Rule 幾何；所有圖片 cache 強制失效。
      AppState.assetFiles = byFolder;
      imageLoadCache.clear();
      window.ShapeRenderer?.invalidateAssetCache?.();
      AppState.images = await this.loadImagesForTemplate(AppState.template, { project: AppState.template?.batchProject || AppState.currentProject });
      window.SpecOverlayManager?.refresh?.();
      Renderer.render();

      const totalCount = AssetStore.getTotalFileCount();
      const folderSummary = [...byFolder.entries()].map(([name, bucket]) => `${name || '(根目錄)'} ${bucket.size}個`).join('、');
      this.setStatus(`已載入 ${totalCount} 個素材${folderSummary ? `（${folderSummary}）` : ''}`);

      // 僅用唯讀 snapshot 更新縮圖；History / Manual Override / Smart Asset Session 狀態全部保留。
      if (AppState.batchMode && AppState.templates?.length && window.BatchManager?.refreshPreviewIndexes) {
        try {
          LoadingOverlay.show('正在更新素材縮圖...', 0);
          await window.BatchManager.refreshPreviewIndexes(AppState.templates.map((_, index) => index), { showProgress: true });
        } catch (error) {
          console.warn('[Assets] 素材載入後更新縮圖失敗:', error);
        } finally { LoadingOverlay.hide(); }
      }
    },
    async loadTemplateFolder(fileList) {
      const files = [...fileList].filter((file) => file.name.endsWith('.json') && file.name !== 'manifest.json');
      const parsed = [];
      const errors = [];
      const identityGroups = new Map();

      // 第34題：Template 系統重載時清除舊批次/編輯狀態，但保留 Excel 與 assets。
      TextEditor.cancel();
      AppState.selectionRevision += 1;
      HistoryManager.clear();
      window.SmartAssetManager?.resetSession?.();
      AppState.batchMode = false;
      AppState.batchItems = [];
      AppState.unmatchedBatchItems = [];
      AppState.sourceTemplates = null;
      AppState.selectedLayers = [];
      AppState.images = {};
      if (DOM.batchPreviewGrid) DOM.batchPreviewGrid.innerHTML = '';
      DOM.batchPreviewPanel?.classList.add('hidden');

      for (const file of files) {
        try {
          const { data, fileName } = TemplateVariants.resolve(JSON.parse(await file.text()), file.name);
          await TextBaselineModel.prepareTemplate(data, { source: 'json' });
          window.AssetSpecEngine?.prepareTemplate?.(data);
          data.__templateFile = fileName;
          const identity = window.RuntimePolicy?.normalizeTemplateIdentity?.(fileName) || normStr(fileName);
          const entry = { name: data.templateId || fileName.replace(/\.template\.json$/i, '').replace(/\.json$/i, ''), file: fileName, visible: true, data, identity };
          parsed.push(entry);
          if (!identityGroups.has(identity)) identityGroups.set(identity, []);
          identityGroups.get(identity).push(entry);
        } catch (error) {
          errors.push(`公版 JSON 解析失敗：${file.name}｜${error?.message || error}`);
        }
      }

      // 第24題：正規化後同名的 Template 全部排除，不依載入順序猜。
      const conflicted = new Set();
      for (const [identity, group] of identityGroups) {
        if (!identity || group.length < 2) continue;
        group.forEach((entry) => conflicted.add(entry));
        errors.push(`公版名稱衝突：${group.map((entry) => entry.file).join('、')}（identity=${identity}）`);
      }
      AppState.templates = parsed.filter((entry) => !conflicted.has(entry));
      if (!AppState.templates.length) {
        this.clearTemplates(errors.length ? errors.join('\n') : '找不到可用公版 JSON');
        return;
      }

      AppState.activeIndex = 0;
      AppState.template = AppState.templates[0].data;
      AppState.selectedLayers = [];
      this.setStatus(`已從資料夾載入 ${AppState.templates.length} 個公版${errors.length ? `；${errors.length} 個問題請查看 Console` : ''}`);
      errors.forEach((message) => console.error('[Templates]', message));
      if (errors.length) window.alert?.(errors.join('\n'));
      await this.loadImagesForActiveTemplate();
      window.SpecOverlayManager?.refresh?.();
      App.sync();
    },
  };
  const TemplateLoader = pickLineage(TemplateLoader_A, TemplateLoader_B);
  // （回饋 3）ui.selectionBoxMode='inkFit'：自動產生的價格層（auto_price_v2）選取框貼合實際文字的寬與高，
  // 文字改變時框跟著變（每次重繪都重新量測）。只影響選取框與控制點，不改 layer.width/height、不影響輸出。
  // 寬：Renderer.measureRenderedTextWidth；高：行數 × 行高（layer.lineHeight，沒有就字級 × 1.08）。框以圖層中心為中心。
  const inkFitSelectionBox = (layer, box) => {
    if (!layer || layer.type !== 'text' || layer.source !== 'auto_price_v2') return box;
    try {
      const width = Number(Renderer?.measureRenderedTextWidth?.(layer, ctx)) || 0;
      const lines = String(layer.text || '').replace(/_x000d_/gi, '\n').replace(/\r\n?/g, '\n').split('\n').length || 1;
      const lineHeight = Number(layer.lineHeight) || Number(layer.fontSizePx || 24) * Number(layer.lineHeightMultiplier || 1.08);
      const height = Math.ceil(lines * lineHeight);
      if (width <= 0 || height <= 0) return box;
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      return { ...box, x: centerX - width / 2, y: centerY - height / 2, width, height, centerX, centerY };
    } catch (_) { return box; }
  };
  // ── Geometry：B 系實作（外廣 wave1 V0.5 原文）──
  const Geometry_B = {
    // 判斷某個image layer的圖片是否已經「真正可以依照片比例正確繪製」。
    // 對於 keepAspectRatio 的layer，圖片物件存在但 naturalWidth 還沒就緒時，
    // getRenderedImageBox() 會先用容器滿版寬高當暫時值，直接畫出來會是被拉伸/未依比例縮放的錯誤畫面。
    // images 參數預設是 AppState.images，保持跟原本呼叫方式 100% 相容；只有需要針對「非目前
    // 使用中版位」畫圖時（例如縮圖產生），才會明確傳入該版位自己的 images map，不會去讀到
    // 目前使用者正在編輯的版位的圖片。
    isImageReady(key, layer, images = AppState.images) {
      const img = images?.[key];
      if (!img) return false;
      if (layer?.keepAspectRatio) return Number(img.naturalWidth) > 0 && Number(img.naturalHeight) > 0;
      return true;
    },
    getRenderedImageBox(key, layer, images = AppState.images) {
      const img = images[key];
      if (window.ProductEngine?.getRenderedImageBox) {
        return window.ProductEngine.getRenderedImageBox(layer, img);
      }

      // Fallback kept for environments that load app.core.js without ProductEngine.
      const cx = Number.isFinite(layer.centerX) ? layer.centerX : (layer.x || 0) + (layer.width || 0) / 2;
      const cy = Number.isFinite(layer.centerY) ? layer.centerY : (layer.y || 0) + (layer.height || 0) / 2;
      const width = layer.width || layer.targetWidth || 0;
      const height = layer.height || 0;
      return { x: cx - width / 2, y: cy - height / 2, width, height, centerX: cx, centerY: cy };
    },
    getLayerBox(key, layer, images = AppState.images) {
      if (!layer) return { x: 0, y: 0, width: 0, height: 0 };
      return layer.type === 'image' ? this.getRenderedImageBox(key, layer, images) : { x: layer.x || 0, y: layer.y || 0, width: layer.width || 0, height: layer.height || 0 };
    },
    // （整合版）選取框：ui.selectionBoxMode='layer'（B 系原行為）／'inkFit'（回饋 3：價格層貼合文字寬高）。
    getSelectionBox(key, layer, images = AppState.images) {
      const box = this.getLayerBox(key, layer, images);
      return flag('ui.selectionBoxMode', 'layer') === 'inkFit' ? inkFitSelectionBox(layer, box) : box;
    },
    applyBox(key, layer, box) {
      const previousBox = clone(this.getLayerBox(key, layer));
      layer.x = round(box.x);
      layer.y = round(box.y);
      layer.width = round(Math.max(1, box.width));
      layer.height = round(Math.max(1, box.height));
      // （OM_w2）render.applyBoxSyncCenterForAllTypes：所有圖層型別都同步 centerX/centerY，避免價格文字讀到舊 center 跳位。
      if (flag('render.applyBoxSyncCenterForAllTypes', false)) {
        layer.centerX = round(layer.x + layer.width / 2);
        layer.centerY = round(layer.y + layer.height / 2);
      }
      if (layer.type === 'image') {
        layer.centerX = round(layer.x + layer.width / 2);
        layer.centerY = round(layer.y + layer.height / 2);
        if (layer.keepAspectRatio) {
          layer.targetWidth = round(layer.width);
          const normalizedSizingMode = String(layer.sizingMode || '').replace(/[\s_-]+/g, '').toLowerCase();
          const isContainByPBox = normalizedSizingMode === 'containbypbox';
          const isCoverByPBox = flag('render.applyBoxCoverSyncHeight', false) && (normalizedSizingMode === 'coverbypbox' || normalizedSizingMode === 'cover');
          const isHeightBased = normalizedSizingMode === 'heightbased';
          const isHeightPriorityNoWidthLimit = layer.productImageSizingRule === 'ddcardHeightPriorityNoWidthLimit';

          // DDcard 的「高度優先、不限寬」只用於初始載入商品圖。
          // 使用者用滑鼠滾輪、控制點或 Inspector 手動縮放後，必須同步更新高度基準，
          // 否則 heightBased 會用舊的 targetHeight / maxTargetHeight 把 P 圖層拉回原尺寸。
          if (isContainByPBox || isCoverByPBox || isHeightBased || isHeightPriorityNoWidthLimit) {
            layer.targetHeight = round(layer.height);
            layer.maxTargetHeight = round(layer.height);
          }
        }
      }
      window.LayoutRuleEngine?.handleLayerBoxApplied?.(key, layer, previousBox, AppState.template);
      window.PriceTransformEngine?.handleLayerBoxApplied?.(key, layer, previousBox);
    },
    rotatePointAround(point, center, degrees) {
      const rad = (Number(degrees) || 0) * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
    },
    // rotationDeg：該素材目前的旋轉角度。控制點/旋轉握把的實際畫面座標，
    // 都是先算出「未旋轉時的位置」，再繞素材中心點旋轉這個角度得到的。
    handles(box, rotationDeg = 0) {
      const s = AppState.handleSize;
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const corners = [
        { name: 'nw', x: box.x, y: box.y, cursor: 'nwse-resize' },
        { name: 'ne', x: box.x + box.width, y: box.y, cursor: 'nesw-resize' },
        { name: 'sw', x: box.x, y: box.y + box.height, cursor: 'nesw-resize' },
        { name: 'se', x: box.x + box.width, y: box.y + box.height, cursor: 'nwse-resize' },
      ].map((h) => {
        const rotated = this.rotatePointAround(h, center, rotationDeg);
        return { ...h, x: rotated.x, y: rotated.y, size: s };
      });

      // 旋轉握把：位於未旋轉時「右上角外側」，再跟著整個框一起旋轉。
      const rotateHandleGap = 26;
      const unrotatedRotateHandle = { x: flag('ui.rotateHandleAnchor', 'topRight') === 'topCenter' ? box.x + box.width / 2 : box.x + box.width, y: box.y - rotateHandleGap };
      const rotateHandlePoint = this.rotatePointAround(unrotatedRotateHandle, center, rotationDeg);
      corners.push({
        name: 'rotate',
        x: rotateHandlePoint.x,
        y: rotateHandlePoint.y,
        cursor: 'grab',
        size: s + 2,
        isRotateHandle: true,
      });

      return corners;
    },
    mousePos(event) {
      const rect = DOM.canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (DOM.canvas.width / rect.width), y: (event.clientY - rect.top) * (DOM.canvas.height / rect.height) };
    },
    screenRectForBox(box) {
      const rect = DOM.canvas.getBoundingClientRect();
      return { left: rect.left + box.x * (rect.width / DOM.canvas.width), top: rect.top + box.y * (rect.height / DOM.canvas.height), width: box.width * (rect.width / DOM.canvas.width), height: box.height * (rect.height / DOM.canvas.height) };
    },
  };


  // ── 通用素材同步 Hub ──
  // 目的：讓 Interaction/Inspector/BatchManager 只用一個統一介面觸發同步生命週期，
  // 不必知道目前實際載入了哪些同步引擎（single-size / multi-size / 未來新加的）。
  // 每個同步引擎在自己模組載入時呼叫 AssetSyncHub.register(name, engine) 掛進來，
  // Hub 會依註冊順序依序呼叫每個引擎的 begin/update/finish；引擎自身的 isEligible()
  // 會判斷「這個 template/key 是不是我要處理的」，不是的話直接 no-op。
  // ── Geometry：A 系實作（正式BN V0.8 為底）──
  const Geometry_A = {
    // 判斷某個image layer的圖片是否已經「真正可以依照片比例正確繪製」。
    // 對於 keepAspectRatio 的layer，圖片物件存在但 naturalWidth 還沒就緒時，
    // getRenderedImageBox() 會先用容器滿版寬高當暫時值，直接畫出來會是被拉伸/未依比例縮放的錯誤畫面。
    // images 參數預設是 AppState.images，保持跟原本呼叫方式 100% 相容；只有需要針對「非目前
    // 使用中版位」畫圖時（例如縮圖產生），才會明確傳入該版位自己的 images map，不會去讀到
    // 目前使用者正在編輯的版位的圖片。
    isImageReady(key, layer, images = AppState.images) {
      const img = images?.[key];
      if (!img) return false;
      if (layer?.keepAspectRatio) return Number(img.naturalWidth) > 0 && Number(img.naturalHeight) > 0;
      return true;
    },
    getRenderedImageBox(key, layer, images = AppState.images) {
      const img = images[key];
      if (window.ProductEngine?.getRenderedImageBox) {
        return window.ProductEngine.getRenderedImageBox(layer, img);
      }

      // Fallback kept for environments that load app.core.js without ProductEngine.
      const cx = Number.isFinite(layer.centerX) ? layer.centerX : (layer.x || 0) + (layer.width || 0) / 2;
      const cy = Number.isFinite(layer.centerY) ? layer.centerY : (layer.y || 0) + (layer.height || 0) / 2;
      const width = layer.width || layer.targetWidth || 0;
      const height = layer.height || 0;
      return { x: cx - width / 2, y: cy - height / 2, width, height, centerX: cx, centerY: cy };
    },
    getLayerBox(key, layer, images = AppState.images) {
      if (!layer) return { x: 0, y: 0, width: 0, height: 0 };
      return layer.type === 'image' ? this.getRenderedImageBox(key, layer, images) : { x: layer.x || 0, y: layer.y || 0, width: layer.width || 0, height: layer.height || 0 };
    },
    // 2026-08-13 調整1：價格圖層（auto_price_v2）的「選取框／控制點」貼合實際渲染文字寬。
    // 只影響視覺框與點選判定；layer.width 仍是幾何與連動縮放的唯一基準，不在此收斂。
    getSelectionBox(key, layer, images = AppState.images) {
      const box = this.getLayerBox(key, layer, images);
      const mode = flag('ui.selectionBoxMode', 'inkFitPrice');
      if (mode === 'inkFit') return inkFitSelectionBox(layer, box);
      if (mode !== 'inkFitPrice') return box;
      if (!layer || layer.type !== 'text' || layer.source !== 'auto_price_v2') return box;
      try {
        const measured = Number(Renderer?.measureRenderedTextWidth?.(layer, ctx)) || 0;
        if (measured > 0 && measured < box.width) {
          const centerX = box.x + box.width / 2;
          return { ...box, x: centerX - measured / 2, width: measured, centerX };
        }
      } catch (_) { /* 量測失敗時退回原框 */ }
      return box;
    },
    applyBox(key, layer, box, options = {}) {
      if (!layer || !box) return;
      const previousBox = clone(this.getLayerBox(key, layer));
      layer.x = round(box.x);
      layer.y = round(box.y);
      layer.width = round(Math.max(1, box.width));
      layer.height = round(Math.max(1, box.height));
      // x/y/width/height 與 centerX/centerY 必須永遠由同一份 box 同步更新。
      // 舊版只有 image 會更新 center，文字價格在重繪時可能分別讀到新 x/y 與舊 center，造成跳位。
      layer.centerX = round(layer.x + layer.width / 2);
      layer.centerY = round(layer.y + layer.height / 2);
      if (layer.type === 'image' && layer.keepAspectRatio) {
        layer.targetWidth = round(layer.width);
        const normalizedSizingMode = String(layer.sizingMode || '').replace(/[\s_-]+/g, '').toLowerCase();
        const isContainByPBox = normalizedSizingMode === 'containbypbox';
        const isHeightBased = normalizedSizingMode === 'heightbased';
        const isHeightPriorityNoWidthLimit = flag('render.applyBoxDdcardHeightRule', true) && layer.productImageSizingRule === 'ddcardHeightPriorityNoWidthLimit';

        // DDcard 的「高度優先、不限寬」只用於初始載入商品圖。
        // 使用者用滑鼠滾輪、控制點或 Inspector 手動縮放後，必須同步更新高度基準，
        // 否則 heightBased 會用舊的 targetHeight / maxTargetHeight 把 P 圖層拉回原尺寸。
        if (isContainByPBox || isHeightBased || isHeightPriorityNoWidthLimit) {
          layer.targetHeight = round(layer.height);
          layer.maxTargetHeight = round(layer.height);
        }
      }
      const targetTemplate = options.template || AppState.template;
      if (options.notifyLayout !== false) {
        window.LayoutRuleEngine?.handleLayerBoxApplied?.(key, layer, previousBox, targetTemplate);
      }
      if (options.notifyPrice !== false) {
        window.PriceTransformEngine?.handleLayerBoxApplied?.(key, layer, previousBox, targetTemplate);
      }
    },
    rotatePointAround(point, center, degrees) {
      const rad = (Number(degrees) || 0) * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
    },
    // rotationDeg：該素材目前的旋轉角度。控制點/旋轉握把的實際畫面座標，
    // 都是先算出「未旋轉時的位置」，再繞素材中心點旋轉這個角度得到的。
    handles(box, rotationDeg = 0) {
      const s = AppState.handleSize;
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const corners = [
        { name: 'nw', x: box.x, y: box.y, cursor: 'nwse-resize' },
        { name: 'ne', x: box.x + box.width, y: box.y, cursor: 'nesw-resize' },
        { name: 'sw', x: box.x, y: box.y + box.height, cursor: 'nesw-resize' },
        { name: 'se', x: box.x + box.width, y: box.y + box.height, cursor: 'nwse-resize' },
      ].map((h) => {
        const rotated = this.rotatePointAround(h, center, rotationDeg);
        return { ...h, x: rotated.x, y: rotated.y, size: s };
      });

      // 旋轉握把：位於未旋轉時「框水平中央上方外側」（2026-08-13 調整2，原為右上角），再跟著整個框一起旋轉。
      const rotateHandleGap = 26;
      const rotateAnchorX = flag('ui.rotateHandleAnchor', 'topCenter') === 'topRight' ? box.x + box.width : box.x + box.width / 2;
      const unrotatedRotateHandle = { x: rotateAnchorX, y: box.y - rotateHandleGap };
      const rotateHandlePoint = this.rotatePointAround(unrotatedRotateHandle, center, rotationDeg);
      corners.push({
        name: 'rotate',
        x: rotateHandlePoint.x,
        y: rotateHandlePoint.y,
        cursor: 'grab',
        size: s + 2,
        isRotateHandle: true,
      });

      return corners;
    },
    mousePos(event) {
      const rect = DOM.canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (DOM.canvas.width / rect.width), y: (event.clientY - rect.top) * (DOM.canvas.height / rect.height) };
    },
    screenRectForBox(box) {
      const rect = DOM.canvas.getBoundingClientRect();
      return { left: rect.left + box.x * (rect.width / DOM.canvas.width), top: rect.top + box.y * (rect.height / DOM.canvas.height), width: box.width * (rect.width / DOM.canvas.width), height: box.height * (rect.height / DOM.canvas.height) };
    },
  };


  // ── 通用素材同步 Hub ──
  // 目的：讓 Interaction/Inspector/BatchManager 只用一個統一介面觸發同步生命週期，
  // 不必知道目前實際載入了哪些同步引擎（single-size / multi-size / 未來新加的）。
  // 每個同步引擎在自己模組載入時呼叫 AssetSyncHub.register(name, engine) 掛進來，
  // Hub 會依註冊順序依序呼叫每個引擎的 begin/update/finish；引擎自身的 isEligible()
  // 會判斷「這個 template/key 是不是我要處理的」，不是的話直接 no-op。
  const Geometry = pickLineage(Geometry_A, Geometry_B);
  const AssetSyncHub = {
    engines: new Map(),
    register(name, engine) {
      if (!name || !engine) return;
      this.engines.set(name, engine);
    },
    unregister(name) {
      this.engines.delete(name);
    },
    shouldSkipProduct(template, key) {
      const layer = template?.layers?.[key];
      return !!window.SmartAssetManager?.ownsLayer?.(key, layer, template);
    },
    // （跨夜）連動被關掉的公版不進入同步生命週期；LinkSync 未啟用時 isEnabled 恆 true。
    shouldSkip(template, key) {
      return this.shouldSkipProduct(template, key) || !LinkSync.isEnabled(template);
    },
    begin(template, key, options) {
      if (this.shouldSkip(template, key)) return;
      this.engines.forEach((engine) => { try { engine.begin?.(template, key, options); } catch (_err) {} });
    },
    update(template, key) {
      if (this.shouldSkip(template, key)) return;
      this.engines.forEach((engine) => { try { engine.update?.(template, key); } catch (_err) {} });
    },
    finish(template, key) {
      if (this.shouldSkip(template, key)) return;
      this.engines.forEach((engine) => { try { engine.finish?.(template, key); } catch (_err) {} });
    },
  };
  window.AssetSyncHub = AssetSyncHub;

  // （network 起）手動素材上傳槽：由規則 configure({ isUploadSlot }) 決定哪些圖層是上傳槽；未設定一律 false。
  const ManualAssetUpload = {
    config: {
      isUploadSlot: () => false,
      accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
      label: '＋ 上傳圖片',
    },
    configure(overrides = {}) {
      Object.assign(this.config, overrides);
    },
    isUploadSlot(key, layer, template = AppState.template) {
      if (!layer || layer.type !== 'image' || layer.__nonInteractive) return false;
      // （AMS）ui.manualUploadExcludeLocked：鎖定中的圖層不當上傳槽。
      if (flag('ui.manualUploadExcludeLocked', false) && layer.locked) return false;
      try { return this.config.isUploadSlot(key, layer, template) === true; }
      catch (_err) { return false; }
    },
    // 缺素材時畫出來的上傳槽。box 已由呼叫端平移到圖層中心，這裡以 (0,0) 為中心繪製。
    drawSlot(canvasCtx, box, hovered = false, template = AppState.template) {
      const width = Math.max(8, box.width);
      const height = Math.max(8, box.height);
      const radius = Math.min(10, width / 6, height / 6);
      const left = -width / 2;
      const top = -height / 2;
      canvasCtx.fillStyle = hovered ? 'rgba(37, 99, 235, .12)' : 'rgba(148, 163, 184, .16)';
      canvasCtx.strokeStyle = hovered ? 'rgba(37, 99, 235, .95)' : 'rgba(100, 116, 139, .85)';
      canvasCtx.lineWidth = hovered ? 3 : 2;
      canvasCtx.beginPath();
      if (typeof canvasCtx.roundRect === 'function') {
        canvasCtx.roundRect(left, top, width, height, radius);
      } else {
        canvasCtx.rect(left, top, width, height);
      }
      canvasCtx.fill();
      canvasCtx.setLineDash([8, 6]);
      canvasCtx.stroke();
      canvasCtx.setLineDash([]);

      const fontSize = Math.max(12, Math.min(40, width / 10));
      canvasCtx.fillStyle = hovered ? '#1d4ed8' : '#475569';
      canvasCtx.font = `${fontSize}px sans-serif`;
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      // 文字放在「外框 ∩ 版面」的中心：外框超出版面時，使用者看得到的那一塊中央才看得到提示。
      const labelOffset = this.visibleLabelOffset(box, template);
      canvasCtx.fillText(this.config.label, labelOffset.x, labelOffset.y, Math.max(20, Math.min(width, labelOffset.visibleWidth) - 12));
    },
    // 外框與版面交集區域的中心，相對於外框中心的位移（繪製端已 translate 到外框中心）。外框完全在版面內時為 (0,0)。
    // 有旋轉的圖層不處理（維持外框中心），避免算錯方向。
    visibleLabelOffset(box, template = AppState.template) {
      const canvasWidth = Number(template?.canvas?.width) || 0;
      const canvasHeight = Number(template?.canvas?.height) || 0;
      const width = Math.max(8, Number(box?.width) || 0);
      const height = Math.max(8, Number(box?.height) || 0);
      const none = { x: 0, y: 0, visibleWidth: width };
      if (!canvasWidth || !canvasHeight || Math.abs(Number(box?.rotation) || 0) > 0.01) return none;
      const centerX = Number.isFinite(Number(box?.centerX)) ? Number(box.centerX) : (Number(box?.x) || 0) + width / 2;
      const centerY = Number.isFinite(Number(box?.centerY)) ? Number(box.centerY) : (Number(box?.y) || 0) + height / 2;
      const left = Math.max(0, centerX - width / 2);
      const top = Math.max(0, centerY - height / 2);
      const right = Math.min(canvasWidth, centerX + width / 2);
      const bottom = Math.min(canvasHeight, centerY + height / 2);
      if (right <= left || bottom <= top) return none;
      return { x: (left + right) / 2 - centerX, y: (top + bottom) / 2 - centerY, visibleWidth: right - left };
    },
    // ── （整合版 5.3）手動素材紀錄 ──
    // 使用者主動清除／替換的結果記在 template.__manualAssetOverrides[layerKey]，
    // 每次工單重新套版（預覽刷新、重新上傳素材、匯出前刷新）之後由 applyOverrides 套回，
    // 所以手動決定不會被自動流程蓋掉；存檔時一併保存。沒有紀錄的公版完全不受影響。
    recordOverride(template, key, override) {
      if (!template || !key) return;
      if (!template.__manualAssetOverrides || typeof template.__manualAssetOverrides !== 'object') template.__manualAssetOverrides = {};
      template.__manualAssetOverrides[key] = { ...override, at: Date.now() };
    },
    applyOverrides(template) {
      const overrides = template?.__manualAssetOverrides;
      if (!overrides || typeof overrides !== 'object') return 0;
      let applied = 0;
      Object.entries(overrides).forEach(([key, override]) => {
        const layer = template.layers?.[key];
        if (!layer || layer.type !== 'image' || !override) return;
        if (override.mode === 'clear') {
          layer.assetFilename = '';
          layer.assetCandidates = [];
          layer.__manualAsset = false;
          layer.__assetMissing = true;
          layer.__assetCleared = true;
        } else if (override.mode === 'replace' && override.assetFilename) {
          layer.assetFilename = override.assetFilename;
          layer.assetCandidates = [];
          layer.assetProject = override.assetProject || layer.assetProject || '';
          layer.__manualAsset = true;
          layer.__assetMissing = false;
          delete layer.__assetCleared;
          delete layer.__resolvedAssetFolder;
          delete layer.__resolvedAssetFilename;
          delete layer.__resolvedAssetPath;
          if (override.smartAssetId !== undefined) layer.smartAssetId = override.smartAssetId;
          // 貼合上傳（fitToImage）連外框一起記：工單重新套版會把框還原成公版預設，套回時要連框一起還原，新圖才不會又被拉滿。
          if (override.box && typeof override.box === 'object') Object.assign(layer, override.box);
        } else {
          return;
        }
        applied += 1;
      });
      return applied;
    },
    // 任何圖片圖層（不限規則檔認定的上傳槽）在使用者主動操作時都可以清除／替換。
    canManuallyEdit(key, layer) {
      return !!(key && layer && layer.type === 'image' && !layer.__nonInteractive);
    },
    hasAsset(layer) {
      return !!(layer && (String(layer.assetFilename || '').trim() || layer.__manualAsset === true));
    },
    // 找出「使用同一素材、且屬於同一同步群組」的所有版位。
    // 分群完全交給 MultiSizeAssetSync 的 materialKey（含專案自訂的 groupKeyResolver），
    // 模組沒載入時就只回傳目前這一張。
    groupUsages(template, key, layer) {
      const sync = window.MultiSizeAssetSync;
      const fallback = [{ template, key, layer }];
      if (!sync?.materialKey) return fallback;
      const materialKey = sync.materialKey(layer, template);
      if (!materialKey) return fallback;
      // （跨夜）來源公版自己關掉連動 → 只作用在當前這一張。
      if (!LinkSync.isEnabled(template)) return fallback;
      const result = [];
      (AppState.templates || []).forEach((entry) => {
        const candidateTemplate = entry?.data || entry;
        if (!candidateTemplate?.layers) return;
        // （跨夜）目標公版關掉連動 → 不接收（雙向斷開）。來源本身一定要留著。
        if (candidateTemplate !== template && !LinkSync.isEnabled(candidateTemplate)) return;
        Object.entries(candidateTemplate.layers).forEach(([candidateKey, candidateLayer]) => {
          // 模組有 isSyncTarget（跨夜版）就用它判斷；否則沿用 network 的 __assetSpec 條件。
          const isTarget = typeof sync.isSyncTarget === 'function'
            ? sync.isSyncTarget(candidateKey, candidateLayer, candidateTemplate)
            : !!candidateLayer?.__assetSpec;
          if (!isTarget) return;
          if (sync.materialKey(candidateLayer, candidateTemplate) !== materialKey) return;
          result.push({ template: candidateTemplate, key: candidateKey, layer: candidateLayer });
        });
      });
      const hasSource = result.some((usage) => usage.template === template && usage.key === key);
      if (!hasSource) result.push({ template, key, layer });
      return result.length ? result : fallback;
    },
    registerFile(file) {
      const bucketName = '手動替換';
      const safeFileName = decodeHashUnicode(file.name || 'manual-image').replace(/[\\/:*?"<>|]/g, '_');
      const lookupName = `manual/${Date.now()}_${safeFileName}`;
      AssetStore.registerManualFile(bucketName, lookupName, file);
      AssetStore.registerManualFile(bucketName, safeFileName, file);
      return { bucketName, lookupName };
    },
    // ── （自 18節 整合版移植）手動上傳的圖片：維持比例、外框貼合不透明像素 ──
    // 1) 讀出圖片尺寸；2) PNG／WebP 掃描 alpha，把透明邊裁掉（另存成新的 PNG File，之後所有血緣的 drawImage 都是畫整張圖，
    //    不需要各自支援裁切）；3) 回傳 { file, width, height }。JPEG 沒有透明、SVG 不掃描，原檔照用。
    async prepareImageFile(file) {
      const loadImage = (blob) => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片無法解碼')); };
        img.src = url;
      });
      const img = await loadImage(file);
      const width = Number(img.naturalWidth) || 0;
      const height = Number(img.naturalHeight) || 0;
      if (!width || !height) return { file, width, height };
      if (!/^image\/(png|webp)$/i.test(file.type || '')) return { file, width, height };

      const scan = document.createElement('canvas');
      scan.width = width; scan.height = height;
      const scanCtx = scan.getContext('2d', { willReadFrequently: true });
      scanCtx.drawImage(img, 0, 0);
      const bounds = this.findOpaqueBounds(scanCtx.getImageData(0, 0, width, height));
      if (!bounds || (bounds.left === 0 && bounds.top === 0 && bounds.width === width && bounds.height === height)) return { file, width, height };

      const cropped = document.createElement('canvas');
      cropped.width = bounds.width; cropped.height = bounds.height;
      cropped.getContext('2d').drawImage(scan, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
      const blob = await new Promise((resolve) => cropped.toBlob(resolve, 'image/png'));
      if (!blob) return { file, width, height };
      const trimmedName = String(file.name || 'manual-image').replace(/\.[^.]+$/, '') + '.png';
      return { file: new File([blob], trimmedName, { type: 'image/png', lastModified: file.lastModified || Date.now() }), width: bounds.width, height: bounds.height };
    },
    // 不透明像素（alpha > 0）的最小包圍框；整張全透明回傳 null。
    findOpaqueBounds(imageData) {
      const { width, height, data } = imageData;
      let left = width, top = height, right = -1, bottom = -1;
      for (let y = 0; y < height; y += 1) {
        const rowStart = y * width * 4;
        for (let x = 0; x < width; x += 1) {
          if (data[rowStart + x * 4 + 3] === 0) continue;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
      if (right < 0) return null;
      return { left, top, width: right - left + 1, height: bottom - top + 1 };
    },
    /** 主畫布重繪（Layout 之後）呼叫：使用者後來又拖曳／縮放過的手動替換圖層，把最新外框記回 override，
     *  下次工單重新套版（縮圖刷新）套回時才不會被上傳當下的外框蓋掉。回傳是否有更新。 */
    settleOverrideBoxes(template) {
      const overrides = template?.__manualAssetOverrides;
      if (!overrides || typeof overrides !== 'object') return false;
      let changed = false;
      Object.entries(overrides).forEach(([key, override]) => {
        const layer = template.layers?.[key];
        if (!layer || override?.mode !== 'replace' || !override.box) return;
        const current = this.snapshotBox(layer);
        if (JSON.stringify(current) === JSON.stringify(override.box)) return;
        override.box = current;
        changed = true;
      });
      return changed;
    },
    snapshotBox(layer) {
      const picked = {};
      ['x', 'y', 'width', 'height', 'centerX', 'centerY', 'targetWidth', 'targetHeight', 'maxTargetHeight', 'keepAspectRatio', 'sizingMode'].forEach((field) => { if (layer[field] !== undefined) picked[field] = layer[field]; });
      return picked;
    },
    // 新圖等比縮放塞進原外框（contain），外框縮成剛好包住圖片並置中在原外框中心；之後拉控制點維持比例（widthBased）。
    fitLayerToImage(layer, imageWidth, imageHeight) {
      if (!layer || !imageWidth || !imageHeight) return;
      const boxWidth = Math.max(1, Number(layer.width) || Number(layer.targetWidth) || 1);
      const boxHeight = Math.max(1, Number(layer.height) || Number(layer.targetHeight) || boxWidth);
      const centerX = Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : (Number(layer.x) || 0) + boxWidth / 2;
      const centerY = Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) : (Number(layer.y) || 0) + boxHeight / 2;
      const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
      const width = round(Math.max(1, imageWidth * scale));
      const height = round(Math.max(1, imageHeight * scale));
      Object.assign(layer, {
        width, height, targetWidth: width,
        x: round(centerX - width / 2), y: round(centerY - height / 2), centerX: round(centerX), centerY: round(centerY),
        keepAspectRatio: true, sizingMode: 'widthBased',
      });
      // 只留寬度基準：targetHeight 留著的話，B 系 render.productSizingHeightPriority=legacy 會改以高度為準，
      // 之後拉控制點時 applyBox 只更新 targetWidth，畫面就「縮放不動」。
      delete layer.targetHeight;
      delete layer.maxTargetHeight;
      delete layer.fitMode;
    },
    async applyFile(key, layer, file, options = {}) {
      if (!file || !/^image\//i.test(file.type || '')) {
        alert('請提供圖片檔（png / jpg / webp / svg）。');
        return 0;
      }
      const template = options.template || AppState.template;
      // fitToImage：清除後上傳／上傳替換（modules/manual-asset-controls.js）走這條：裁透明邊、維持比例、外框貼合。
      const prepared = options.fitToImage === true ? await this.prepareImageFile(file).catch(() => ({ file, width: 0, height: 0 })) : { file, width: 0, height: 0 };
      const { bucketName, lookupName } = this.registerFile(prepared.file);
      const targets = options.syncGroup === false
        ? [{ template, key, layer }]
        : this.groupUsages(template, key, layer);

      targets.forEach(({ template: targetTemplate, key: targetKey, layer: targetLayer }) => {
        targetLayer.assetFilename = lookupName;
        targetLayer.assetCandidates = [];
        targetLayer.assetProject = bucketName;
        targetLayer.__manualAsset = true;
        targetLayer.__assetMissing = false;
        // 上傳就是把「已清除」狀態解除，之後重新載圖不會再被當成空槽。
        delete targetLayer.__assetCleared;
        // 整合版 5.3：manualGeometry=false（一般圖層）維持原本框與縮放方式；上傳槽沿用 network 行為（contain）。
        if (options.manualGeometry !== false) {
          targetLayer.keepAspectRatio = true;
          targetLayer.fitMode = 'contain';
        }
        // fitToImage → 外框改成貼合新圖（等比、置中原外框），並連外框一起記進 override。
        const fitted = options.fitToImage === true && prepared.width && prepared.height;
        if (fitted) this.fitLayerToImage(targetLayer, prepared.width, prepared.height);
        this.recordOverride(targetTemplate, targetKey, { mode: 'replace', assetFilename: lookupName, assetProject: bucketName, ...(fitted ? { box: this.snapshotBox(targetLayer) } : {}) });
      });

      const touchedIndexes = [...new Set(targets
        .map(({ template: targetTemplate }) => window.BatchManager?.indexOfTemplate?.(targetTemplate) ?? -1)
        .filter((index) => index >= 0))];
      // 先灰化被影響到的縮圖（含目前這一張），讓使用者立刻知道哪幾張會變。
      if (touchedIndexes.length) window.BatchManager?.markThumbsStale?.(touchedIndexes);

      await TemplateLoader.loadImagesForActiveTemplate({ project: AppState.templates?.[AppState.activeIndex]?.project });
      Renderer.render();
      LayerManager.render();
      Inspector.render();
      if (AppState.batchMode && window.BatchManager?.refreshThumbsForIndexes && touchedIndexes.length) {
        await window.BatchManager.refreshThumbsForIndexes(touchedIndexes);
      }
      const count = targets.length;
      showToast(count > 1 ? `已套用到 ${count} 個版位` : '已套用素材');
      return count;
    },
    // 這個圖層現在有沒有東西可以刪？只有「本來就是上傳槽」且目前確實有素材的才給刪。
    canClear(key, layer, template = AppState.template) {
      if (!this.isUploadSlot(key, layer, template)) return false;
      if (layer.__assetMissing === true) return false;
      return Boolean(layer.assetFilename) || layer.__manualAsset === true;
    },
    // 按 Delete 清除素材：整個同步群組一起清空，變回「＋ 上傳圖片」空槽。
    // 保留 __assetSpec.stem 不動，群組識別才不會斷掉——之後補上傳時仍會同步回同一組版位。
    async clearAsset(key, layer, options = {}) {
      const template = options.template || AppState.template;
      // 整合版 5.3：manual=true 是使用者從 Inspector／Delete 主動清除，任何有素材的圖片圖層都可以；否則維持只清上傳槽。
      const allowed = options.manual === true
        ? (this.canManuallyEdit(key, layer) && this.hasAsset(layer))
        : this.canClear(key, layer, template);
      if (!allowed) return 0;
      const targets = options.syncGroup === false
        ? [{ template, key, layer }]
        : this.groupUsages(template, key, layer);

      targets.forEach(({ template: targetTemplate, key: targetKey, layer: targetLayer }) => {
        targetLayer.assetFilename = '';
        targetLayer.assetCandidates = [];
        targetLayer.__manualAsset = false;
        targetLayer.__assetMissing = true;
        targetLayer.__assetCleared = true;
        this.recordOverride(targetTemplate, targetKey, { mode: 'clear' });
        // Renderer.drawImage 是先看 AppState.images[key] 這份已解碼的圖片快取，
        // 快取還在就照畫，跟 __assetMissing 無關。不一起清掉的話，主畫布上的
        // 素材要等切換版位重新載圖才會消失。只有目前主畫布這一張有快取需要清。
        if (targetTemplate === AppState.template) delete AppState.images[targetKey];
      });

      const touchedIndexes = [...new Set(targets
        .map(({ template: targetTemplate }) => window.BatchManager?.indexOfTemplate?.(targetTemplate) ?? -1)
        .filter((index) => index >= 0))];
      if (touchedIndexes.length) window.BatchManager?.markThumbsStale?.(touchedIndexes);

      Renderer.render();
      LayerManager.render();
      Inspector.render();
      const count = targets.length;
      showToast(count > 1 ? `已清除 ${count} 個版位的素材` : '已清除素材');
      return count;
    },
    pickFile(key, layer, options = {}) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = this.config.accept;
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) return;
        await this.applyFile(key, layer, file, options);
      }, { once: true });
      input.addEventListener('cancel', () => input.remove(), { once: true });
      input.click();
    },
    // 拖拉：只有落在上傳槽上的檔案才接受，其餘一律 dropEffect = 'none'。
    slotAt(pos) {
      const key = LayerManager.hitTest(pos);
      if (!key) return null;
      const layer = AppState.template?.layers?.[key];
      if (!layer || !layer.__assetMissing) return null;
      if (!this.isUploadSlot(key, layer, AppState.template)) return null;
      return { key, layer };
    },
    bindDropZone(element) {
      if (!element || element.__manualUploadBound) return;
      element.__manualUploadBound = true;

      const setHover = (key) => {
        if (AppState.manualUploadHoverKey === key) return;
        AppState.manualUploadHoverKey = key;
        Renderer.render();
      };

      element.addEventListener('dragover', (event) => {
        if (!event.dataTransfer?.types?.includes('Files')) return;
        const slot = this.slotAt(Geometry.mousePos(event));
        event.preventDefault();
        event.dataTransfer.dropEffect = slot ? 'copy' : 'none';
        setHover(slot?.key || null);
      });
      element.addEventListener('dragleave', (event) => {
        if (event.target !== element && element.contains(event.relatedTarget)) return;
        setHover(null);
      });
      element.addEventListener('drop', async (event) => {
        const slot = this.slotAt(Geometry.mousePos(event));
        if (!slot) { setHover(null); return; }
        event.preventDefault();
        setHover(null);
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        await this.applyFile(slot.key, slot.layer, file);
      });
    },
  };
  window.ManualAssetUpload = ManualAssetUpload;

  // （AMS 起）公版載入時的圖層預設狀態（例如預設鎖定），由規則 configure({ lockOnLoad }) 決定；未設定即無作用。
  const LayerDefaults = {
    config: {
      lockOnLoad: () => false,
    },
    configure(overrides = {}) {
      Object.assign(this.config, overrides);
    },
    apply(template) {
      const layers = template?.layers;
      if (!layers) return;
      Object.entries(layers).forEach(([key, layer]) => {
        if (!layer || layer.locked === true) return;
        try {
          if (this.config.lockOnLoad(key, layer, template) === true) layer.locked = true;
        } catch (_err) {}
      });
    },
  };
  window.LayerDefaults = LayerDefaults;

  // （跨夜 起）通用批次診斷、跨版位連動開關、手動改字標記。未啟用相關旗標時皆為 no-op／恆 true。
  const BatchDiagnostics = {
    ensure() {
      if (!AppState.batchDiagnostics) AppState.batchDiagnostics = {};
      const diagnostics = AppState.batchDiagnostics;
      if (!diagnostics.__baseWarnings) diagnostics.__baseWarnings = [...(diagnostics.warnings || [])];
      if (!diagnostics.__assetWarnings) diagnostics.__assetWarnings = {};
      if (!Array.isArray(diagnostics.__exportNotes)) diagnostics.__exportNotes = [];
      return diagnostics;
    },
    addAssetWarning(token, message = '') {
      if (!AppState.batchMode || !token) return;
      const diagnostics = this.ensure();
      if (message) diagnostics.__assetWarnings[token] = message;
      else delete diagnostics.__assetWarnings[token];
      diagnostics.warnings = [
        ...diagnostics.__baseWarnings,
        ...Object.values(diagnostics.__assetWarnings),
      ];
    },
    resetExportNotes() {
      this.ensure().__exportNotes = [];
    },
    addExportNote(message) {
      if (!message) return;
      this.ensure().__exportNotes.push(String(message));
    },
    exportNotes() {
      return [...(AppState.batchDiagnostics?.__exportNotes || [])];
    },
    formatBytes(bytes) {
      const value = Number(bytes || 0);
      if (!Number.isFinite(value) || value <= 0) return '0 KB';
      if (value < 1000) return `${value} B`;
      return `${(value / 1000).toFixed(1)} KB`;
    },
    text(elapsedMs = 0) {
      const diagnostics = AppState.batchDiagnostics || {};
      const skipped = diagnostics.skippedRows || [];
      const unmatched = AppState.unmatchedBatchItems || [];
      const assetWarnings = Object.values(diagnostics.__assetWarnings || {});
      const exportNotes = diagnostics.__exportNotes || [];
      const lines = [
        '【工單解析】',
        `分頁：${diagnostics.sheetName || ''}`,
        `製作物區塊：${diagnostics.parsedBlockCount || 0} 個`,
        `資料筆數：${diagnostics.recordCount || 0} 筆`,
        `產出張數：${diagnostics.generatedCount || AppState.batchItems?.length || 0}`,
        '',
      ];
      const section = (title, items, format = (value) => String(value)) => {
        lines.push(`【${title}】`);
        if (!items.length) lines.push('（無）');
        else items.forEach((item) => lines.push(format(item)));
        lines.push('');
      };
      section('略過的資料列', skipped, (row) => `第 ${row.row} 列「${row.name || ''}」：${row.reason || ''}`);
      section('未匹配公版', unmatched, (item) => `${item.name || ''}：${item.reason || ''}`);
      section('素材警告', assetWarnings);
      section('匯出備註', exportNotes);
      lines.push('【統計】');
      lines.push(`略過：${skipped.length}`);
      lines.push(`未匹配：${unmatched.length}`);
      lines.push(`素材警告：${assetWarnings.length}`);
      lines.push(`匯出備註：${exportNotes.length}`);
      lines.push(`耗時：${(Number(elapsedMs || 0) / 1000).toFixed(2)} 秒`);
      return lines.join('\r\n');
    },
  };
  window.BatchDiagnostics = BatchDiagnostics;

  // ── 跨版位連動開關（LinkSync）──
  // 以「單一公版」為單位，雙向斷開：關掉連動的那一張既不推播自己的調整給別張，
  // 也不接收別張推過來的調整。重新開啟只恢復「之後」的同步，不會回頭補推播。
  // 狀態存在記憶體，不跨重新整理保留（開頁一律是連動開啟）。
  const LinkSync = {
    disabled: new Set(),
    idOf(template) {
      if (!template) return '';
      return String(template.__linkSyncId
        || template.batchRecord?.__outputName
        || template.templateId
        || template.canvas?.templateId
        || '');
    },
    isEnabled(template) {
      if (!flag('interaction.linkSync', false)) return true;
      const id = this.idOf(template);
      if (!id) return true;
      return !this.disabled.has(id);
    },
    setEnabled(template, enabled) {
      const id = this.idOf(template);
      if (!id) return false;
      if (enabled) this.disabled.delete(id);
      else this.disabled.add(id);
      return true;
    },
    toggle(template = AppState.template) {
      const next = !this.isEnabled(template);
      if (!this.setEnabled(template, next)) return null;
      return next;
    },
  };
  window.LinkSync = LinkSync;

  // 手動編輯文字後：標記該圖層不再被工單覆寫，並觸發規則檔的
  // afterManualTextMetricsChanged 鉤子（依「實際量測後的文字寬度」重算相依版型）。
  const markManualTextEdited = (template, layerKey, layer) => {
    if (!template || !layerKey) return;
    if (layer && layer.type === 'text') layer.__manualTextEdited = true;
    window.BatchManager?.applyTemplateRuleHook?.(
      'afterManualTextMetricsChanged',
      template,
      template.batchRecord || {},
      template.batchDiagnostics || [],
      { layerKey },
    );
  };

  // ── 手動素材上傳槽 ──
  // 素材讀取失敗的圖層，若被專案認定為「可手動補圖」，畫布上會畫成一個虛線上傳槽
  // （「＋ 上傳圖片」），可以單擊選檔，也可以直接把圖片檔拖進去。
  // 哪些圖層算上傳槽由專案自己決定：在 rules/*_rules.js 呼叫
  //   window.ManualAssetUpload.configure({ isUploadSlot: (key, layer, template) => boolean })
  // 未設定時一律回傳 false，核心不會自作主張把任何圖層變成上傳槽。
  const SpecOverlayManager = {
    cache: new Map(),
    currentSignature: '',
    loadingSignature: '',

    get enabled() {
      return AppState.showSpecOverlay && !!AppState.specOverlayImage;
    },

    init() {
      const toggle = $('specToggle') || $('guideToggle');
      AppState.showSpecOverlay = toggle ? toggle.checked : true;
      this.loadForActiveTemplate();
    },

    refresh() {
      this.cache.clear();
      this.currentSignature = '';
      this.loadingSignature = '';
      AppState.specOverlayImage = null;
      AppState.specOverlayFilename = '';
      if (AppState.showSpecOverlay) this.loadForActiveTemplate();
    },

    normalizeName(value) {
      return String(value || '')
        .replace(/\.json$/i, '')
        .replace(/\.template$/i, '')
        .replace(/\.generated$/i, '')
        .trim();
    },

    normalizeAssetKey(value) {
      return String(value || '')
        .replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[\s\u00a0\u3000\t\r\n]+/g, '')
        .replace(/[\-_()（）\[\]【】.]/g, '');
    },

    getTemplateSpecKeyword(template = AppState.template) {
      const templateInfo = AppState.templates?.[AppState.activeIndex] || {};
      const names = [
        templateInfo.name,
        template?.templateId,
        template?.batchSourceName,
        template?.source?.psdName,
        templateInfo.file,
      ]
        .map((name) => this.normalizeName(name))
        .filter(Boolean);

      const rawName = names[0] || '';
      const normalized = rawName.toLowerCase().replace(/[\s_\-]+/g, '');
      if (!rawName) return '';

      // 批次輸出名稱常見為 HBN_01 / DDC_01 這類「前綴_編號」格式，規範檔統一取前綴比對。
      // 若你的公版命名有特殊斷字需求（例如名稱中間有空格但仍算同一個字），
      // 可在此依需要新增規則；目前保留最單純的「取第一個 _/-/空白 前的字」。
      return rawName.split(/[_\-\s]+/)[0].trim();
    },

    getAllowedSpecFilenames(template = AppState.template) {
      // 整合版 ui.specOverlaySkip：'specDrivenAndMultiSize'（network／AMS）／'specDriven'（跨夜：多版位同步的公版仍顯示規格線）。
      const skipMultiSize = flag('ui.specOverlaySkip', 'specDrivenAndMultiSize') !== 'specDriven';
      if (template?.ruleFamily === 'spec-driven' || (skipMultiSize && template?.batchRecord?.__multiSizeSync)) return [];
      const keyword = this.getTemplateSpecKeyword(template);
      if (!keyword) return [];

      const candidates = [
        `${keyword}_規範.png`,
        `${keyword} 規範.png`,
      ];

      return [...new Set(candidates)];
    },

    isAllowedSpecFilename(filename, template = AppState.template) {
      const wanted = this.getAllowedSpecFilenames(template)
        .map((name) => this.normalizeAssetKey(name));
      const current = this.normalizeAssetKey(filename);
      return !!current && wanted.includes(current);
    },

    getCandidateFilenames(template = AppState.template) {
      // 嚴格規則：只允許「檔名關鍵字 + 規範」。
      // 例如 DDC 只會找 DDC_規範.png / DDC 規範.png；
      // 若素材名稱不是這種組合，就忽略讀入，不顯示於 Canvas。
      return this.getAllowedSpecFilenames(template);
    },

    findLocalAssetFile(filename) {
      const files = AssetStore.getFlatForLookup();
      if (!filename || !files.size) return null;

      const wanted = this.normalizeAssetKey(filename);
      const hit = [...files.keys()].find((name) =>
        this.normalizeAssetKey(name) === wanted &&
        this.isAllowedSpecFilename(name)
      );

      return hit ? files.get(hit) : null;
    },

    async loadImage(filename) {
      if (!this.isAllowedSpecFilename(filename)) return null;

      const localFile = this.findLocalAssetFile(filename);
      const cacheKey = localFile ? `local:${localFile.name}:${localFile.size}:${localFile.lastModified}` : `asset:${filename}`;
      if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

      if (localFile) {
        const objectUrl = URL.createObjectURL(localFile);
        const result = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = objectUrl;
        });
        scheduleBlobRevoke(objectUrl);
        this.cache.set(cacheKey, result);
        return result;
      }

      const result = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = `./assets/${filename}`;
      });
      this.cache.set(cacheKey, result);
      return result;
    },

    async loadForActiveTemplate() {
      if (!AppState.showSpecOverlay) return;
      const candidates = this.getCandidateFilenames();
      const signature = `${candidates.join('|')}::assets:${AssetStore.getTotalFileCount()}::project:${AppState.currentProject || ''}`;
      if (!candidates.length) {
        AppState.specOverlayImage = null;
        AppState.specOverlayFilename = '';
        this.loadingSignature = '';
        this.currentSignature = '';
        return;
      }
      if (this.loadingSignature === signature || this.currentSignature === signature) return;

      this.loadingSignature = signature;
      AppState.specOverlayImage = null;
      AppState.specOverlayFilename = '';

      for (const filename of candidates) {
        const image = await this.loadImage(filename);
        if (this.loadingSignature !== signature) return;
        if (image) {
          AppState.specOverlayImage = image;
          AppState.specOverlayFilename = filename;
          this.currentSignature = signature;
          this.loadingSignature = '';
          Renderer.render();
          return;
        }
      }

      this.currentSignature = signature;
      this.loadingSignature = '';
      Renderer.render();
    },

    setVisible(visible) {
      AppState.showSpecOverlay = !!visible;
      if (AppState.showSpecOverlay) this.refresh();
      else {
        AppState.specOverlayImage = null;
        AppState.specOverlayFilename = '';
      }
      Renderer.render();
    },

    draw(canvasCtx) {
      if (!AppState.showSpecOverlay) return;
      this.loadForActiveTemplate();
      if (!this.enabled || !AppState.template?.canvas) return;
      const { width, height } = AppState.template.canvas;
      canvasCtx.save();
      canvasCtx.drawImage(AppState.specOverlayImage, 0, 0, width, height);
      canvasCtx.restore();
    },
  };
  const CapsuleRuleEngine = {
    defaultRules: Object.freeze({
      horizontalPaddingPx: 55,
      subtitleWiderPaddingPx: 55,
      titleWiderPaddingPx: 55,
      titleWiderPaddingMaxDiffPx: 70,
      subtitleWiderPaddingMaxDiffPx: null,
      verticalGapPx: 13,
      verticalPaddingPx: 13,
      legalGapPx: 11,
      minWidthPx: 1,
      fill: '#0053d1',
    }),

    getRules(template = AppState.template) {
      return {
        ...this.defaultRules,
        ...this.getExternalRules(template),
      };
    },

    getExternalRules(template = AppState.template) {
      return getRuleSection(this.getTemplateFamily(template), 'capsuleRules');
    },

    getTemplateFamily(template = AppState.template) {
      const explicitFamily = template?.ruleFamily || template?.sheetTemplateRoute?.family;
      if (explicitFamily) return explicitFamily;

      // 修正批次產圖時的家族誤判：原本這裡會額外把
      // AppState.templates[AppState.activeIndex] 的名稱/檔名一起塞進判斷字串裡，
      // 當作「萬一 template 自己沒帶識別資訊時」的備援。但批次產圖迴圈要等
      // 全部記錄都處理完，才會更新 AppState.templates / activeIndex，處理每一筆
      // 記錄的當下，這兩個全域變數其實還停留在「使用者上一次操作」的舊內容。
      // 如果剛好含有其他家族的關鍵字，就會被誤判成那個家族，套用到錯誤的
      // 專屬處理邏輯。template 自己的 templateId / batchSourceName / source.psdName
      // 已經足夠識別，不應該再依賴這種容易過期、跟目前處理的記錄無關的全域狀態。
      const labelParts = [
        template?.templateId,
        template?.batchSourceName,
        template?.source?.psdName,
      ].filter(Boolean);

      const label = this.norm(labelParts.join(' '));

      const registeredFamily = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.detectFamily?.(labelParts, null);
      if (registeredFamily) return registeredFamily;

      // V1.0 開源版：不再硬編碼任何舊公版名稱作為 fallback。
      // 找不到已註冊的家族規則時，回傳 null；呼叫端的 getRuleSection(null, ...) 會拿到空規則物件 {}，
      // 引擎會用最基本的通用邏輯運作，不會套用任何公版專屬效果。
      return null;
    },

    norm: normStr,

    measureTextWidth(layer, measureContext) {
      if (!layer || !measureContext) return 0;
      if (layer.hbnTitleLogoGroupProxy === true && Number.isFinite(Number(layer.hbnTitleLogoGroupWidth))) {
        return Math.ceil(Math.max(1, Number(layer.hbnTitleLogoGroupWidth)));
      }
      measureContext.save();
      measureContext.font = Renderer.font(layer);
      const letterSpacing = Number(layer.letterSpacing || 0);
      const lines = String(layer.text || '').replace(/_x000d_/gi, '\n').replace(/\r\n/g, '\n').replace(/[\r\u0003\u2028\u2029]/g, '\n').split('\n');
      const width = lines.reduce((maxWidth, line) => {
        const chars = [...String(line || '')];
        const textWidth = chars.reduce((sum, ch) => sum + measureContext.measureText(ch).width, 0);
        const spacingWidth = letterSpacing * Math.max(0, chars.length - 1);
        return Math.max(maxWidth, textWidth + spacingWidth);
      }, 0);
      measureContext.restore();
      return Math.ceil(width);
    },

    calculateWidth({ titleTextWidth, subtitleTextWidth, rules }) {
      const titleWidth = Number(titleTextWidth || 0);
      const subtitleWidth = Number(subtitleTextWidth || 0);
      const widthDiff = Math.abs(titleWidth - subtitleWidth);
      const basePadding = Number(rules.horizontalPaddingPx ?? 55);

      if (subtitleWidth > titleWidth) {
        const limit = rules.subtitleWiderPaddingMaxDiffPx;
        const shouldPad = limit === null || limit === undefined || widthDiff < Number(limit);
        const padding = Number(rules.subtitleWiderPaddingPx ?? basePadding);
        return subtitleWidth + (shouldPad ? padding * 2 : 0);
      }

      if (titleWidth > subtitleWidth) {
        const limit = rules.titleWiderPaddingMaxDiffPx;
        const shouldPad = limit === null || limit === undefined || widthDiff < Number(limit);
        const padding = Number(rules.titleWiderPaddingPx ?? basePadding);
        return titleWidth + (shouldPad ? padding * 2 : 0);
      }

      return Math.max(titleWidth, subtitleWidth);
    },

    buildLayer({ template, title, subtitle, legal, titleTextWidth, subtitleTextWidth }) {
      const rules = this.getRules(template);
      const isolatedCapsule = rules.isolatedIGCapsule === true;
      const isGroupedSubtitle = subtitle?.hbnTitleLogoGroupProxy === true;
      let computedWidth = this.calculateWidth({ titleTextWidth, subtitleTextWidth, rules });

      // IG Story 有自己的膠囊規則，不能更動其他一般公版沿用的膠囊排版流程。
      // 只有明確設定 isolatedIGCapsule 的公版，才能覆蓋膠囊寬度並保留副標題/法務小字的原始框。
      if (isolatedCapsule && typeof rules.resolveCapsuleWidth === 'function') {
        try {
          const customWidth = rules.resolveCapsuleWidth({
            template,
            title,
            subtitle,
            legal,
            titleTextWidth,
            subtitleTextWidth,
            measureTextWidth: (layer) => this.measureTextWidth(layer, ctx),
            round,
          });
          if (Number.isFinite(Number(customWidth))) computedWidth = Number(customWidth);
        } catch (error) {
          console.warn('[CapsuleRuleEngine] isolated capsule width failed:', error);
        }
      }

      const capsuleWidth = Math.max(Number(rules.minWidthPx || 1), computedWidth);
      const verticalGap = Number(rules.verticalGapPx ?? 13);
      const verticalPadding = Number(rules.verticalPaddingPx ?? 13);
      const legalGap = Number(rules.legalGapPx ?? 11);
      const centerSource = isolatedCapsule && rules.centerSource === 'subtitle' ? subtitle : title;
      const centerX = (centerSource.x || 0) + (centerSource.width || 0) / 2;
      const x = round(centerX - capsuleWidth / 2, 2);
      const preserveTextLayerLayout = !!rules.preserveTextLayerLayout;
      const preserveSubtitleY = (isolatedCapsule || preserveTextLayerLayout) && !!rules.preserveSubtitleY;
      const preserveSubtitleBox = (isolatedCapsule || preserveTextLayerLayout) && !!rules.preserveSubtitleBox;
      const preserveLegalY = (isolatedCapsule || preserveTextLayerLayout) && !!rules.preserveLegalY;
      const y = preserveSubtitleY
        ? round((subtitle.y || 0) - verticalPadding, 2)
        : round((title.y || 0) + (title.height || 0) + verticalGap, 2);
      const subtitleHasVip = /VIP/i.test(String(subtitle?.text || ''));
      const subtitleVipFixedHeight = Number(rules.subtitleVipFixedHeightPx || 0);
      const groupedSubtitleHeight = Number(rules.groupedSubtitleHeightPx || 0);
      const height = isGroupedSubtitle && groupedSubtitleHeight > 0
        ? round(groupedSubtitleHeight, 2)
        : subtitleHasVip && subtitleVipFixedHeight > 0
          ? round(subtitleVipFixedHeight, 2)
          : round((subtitle.height || 0) + verticalPadding * 2, 2);

      if (!preserveSubtitleBox) {
        subtitle.x = x;
        subtitle.width = round(capsuleWidth, 2);
      }
      if (!preserveSubtitleY) subtitle.y = round(y + verticalPadding, 2);
      if (legal && !preserveLegalY) legal.y = round(y + height + legalGap, 2);

      return {
        type: 'shape',
        x,
        y,
        width: round(capsuleWidth, 2),
        height,
        fill: rules.fill || template.generatedLayers?.subtitle_frame?.fill || '#0053d1',
        radius: rules.radius === 'capsule' || rules.radius === undefined ? height / 2 : Number(rules.radius || 0),
      };
    },
  };
  const LayoutRuleEngine = {
    getRules(template = AppState.template) {
      return getRuleSection(CapsuleRuleEngine.getTemplateFamily(template), 'layoutRules');
    },

    norm: normStr,

    findLayerEntry(template, candidates = [], options = {}) {
      const entries = Object.entries(template?.layers || {});
      const normalizedCandidates = candidates.map((name) => this.norm(name)).filter(Boolean);
      const type = options.type || '';
      const nearLayer = options.nearLayer || null;
      const maxDistanceY = Number(options.maxDistanceY || 0);
      const preferLeftOfNear = !!options.preferLeftOfNear;

      const matched = entries
        .filter(([, layer]) => !type || layer.type === type)
        .map(([key, layer]) => ({ key, layer }))
        .filter(({ key, layer }) => {
          const label = this.norm(`${key} ${layer?.psdName || ''} ${layer?.role || ''}`);
          return normalizedCandidates.some((candidate) => label === candidate || label.includes(candidate));
        })
        .filter(({ layer }) => {
          if (!nearLayer) return true;
          const nearCenterY = Number(nearLayer.y || 0) + Number(nearLayer.height || 0) / 2;
          const layerCenterY = Number(layer.y || 0) + Number(layer.height || 0) / 2;
          if (maxDistanceY && Math.abs(layerCenterY - nearCenterY) > maxDistanceY) return false;
          if (preferLeftOfNear && Number(layer.x || 0) > Number(nearLayer.x || 0)) return false;
          return true;
        });

      return matched[0] || null;
    },

    measureTextWidth(layer) {
      if (!layer || layer.type !== 'text') return Number(layer?.width || 0);
      return CapsuleRuleEngine.measureTextWidth(layer, ctx);
    },

    getLayerCenterX(layer) {
      return Number(layer?.centerX ?? (Number(layer?.x || 0) + Number(layer?.width || 0) / 2));
    },

    getLayerCenterY(layer) {
      return Number(layer?.centerY ?? (Number(layer?.y || 0) + Number(layer?.height || 0) / 2));
    },

    setLayerCenterX(layer, centerX) {
      if (!layer) return;
      const width = Number(layer.width || 0);
      layer.x = round(Number(centerX || 0) - width / 2, 2);
      layer.centerX = round(Number(centerX || 0), 2);
    },

    getCombinedBox(layers = []) {
      const visibleLayers = layers.filter(Boolean);
      if (!visibleLayers.length) return { x: 0, y: 0, width: 1, height: 1, centerX: 0.5, centerY: 0.5 };
      const left = Math.min(...visibleLayers.map((layer) => Number(layer.x || 0)));
      const top = Math.min(...visibleLayers.map((layer) => Number(layer.y || 0)));
      const right = Math.max(...visibleLayers.map((layer) => Number(layer.x || 0) + Number(layer.width || 0)));
      const bottom = Math.max(...visibleLayers.map((layer) => Number(layer.y || 0) + Number(layer.height || 0)));
      return {
        x: left,
        y: top,
        width: Math.max(1, right - left),
        height: Math.max(1, bottom - top),
        centerX: left + (right - left) / 2,
        centerY: top + (bottom - top) / 2,
      };
    },

    ensureLayer(template, key, baseLayer = {}) {
      if (!template.layers[key]) template.layers[key] = baseLayer;
      return template.layers[key];
    },

    insertBefore(template, layerKey, beforeKeys = []) {
      template.renderOrder = (template.renderOrder || []).filter((key) => key !== layerKey);
      const targetIndex = template.renderOrder.findIndex((key) => beforeKeys.includes(key));
      template.renderOrder.splice(targetIndex >= 0 ? targetIndex : template.renderOrder.length, 0, layerKey);
    },

    apply(template = AppState.template) {
      const rules = this.getRules(template);
      if (typeof rules?.applyProgrammaticLayout === 'function') {
        rules.applyProgrammaticLayout({
          template,
          helpers: {
            round,
            findLayerEntry: this.findLayerEntry.bind(this),
            measureTextWidth: this.measureTextWidth.bind(this),
            setLayerCenterX: this.setLayerCenterX.bind(this),
            getLayerCenterX: this.getLayerCenterX.bind(this),
            getLayerCenterY: this.getLayerCenterY.bind(this),
            getCombinedBox: this.getCombinedBox.bind(this),
            applyProgrammaticCapsule: this.applyProgrammaticCapsule.bind(this),
            insertBefore: this.insertBefore.bind(this),
          },
        });
      }
      // V1.0 開源版：頭巾VIP/頭巾蝦皮購物專屬的標題排版（headbandShopeeTitleLine/headbandVipTitleLine）已移除。
      // 若你的新公版需要類似「LOGO+副標題自動置中、動態底色膠囊寬度」的排版效果，
      // 請直接透過上面的 rules.applyProgrammaticLayout(helpers) 掛勾實作——
      // helpers 已提供 findLayerEntry / measureTextWidth / setLayerCenterX / applyProgrammaticCapsule 等通用工具，
      // 不需要在 app.core.js 內新增任何公版專屬函式。
    },

    applyProgrammaticCapsule({ template, bgKey, centerX, centerY, width, fill }) {
      const bg = this.ensureLayer(template, bgKey, {
        type: 'shape',
        psdName: bgKey,
        source: 'generated_layout',
      });
      const height = 58;
      const radius = height / 2;

      bg.type = 'shape';
      bg.psdName = bg.psdName || bgKey;
      bg.source = 'generated_layout';
      bg.fill = fill || bg.fill || '#0053D1';
      bg.shape = null;
      bg.useDynamicBounds = true;
      bg.x = round(Number(centerX || 0) - Number(width || 1) / 2, 2);
      bg.y = round(Number(centerY || 0) - height / 2, 2);
      bg.width = round(Math.max(1, Number(width || 1)), 2);
      bg.height = height;
      bg.radius = radius;
      bg.centerX = round(bg.x + bg.width / 2, 2);
      bg.centerY = round(bg.y + bg.height / 2, 2);
      bg.hidden = false;
      return bg;
    },
  };
  const TextBaselineModel = {
    VERSION: 2,
    SOURCE_MODE: 'source-baseline',
    _measureCanvas: null,
    _fontsReadyPromise: null,

    normalizeText(value) {
      return String(value || '')
        .replace(/_x000d_/gi, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/[\r\u0003\u2028\u2029]/g, '\n');
    },

    async waitForFonts() {
      if (!this._fontsReadyPromise) {
        this._fontsReadyPromise = (async () => {
          try {
            if (window.FontPreloader?.ready) await window.FontPreloader.ready;
            if (document.fonts?.load) {
              await Promise.allSettled(['400', '500', '700'].map((weight) =>
                document.fonts.load(`${weight} 24px "ShopeeNotoSans Content"`)));
            }
            if (document.fonts?.ready) await document.fonts.ready;
          } catch (error) {
            console.warn('[TextBaselineModel] 字型等待失敗，將使用瀏覽器備援 metrics。', error);
          }
        })();
      }
      await this._fontsReadyPromise;
    },

    getMeasureContext() {
      if (!this._measureCanvas) this._measureCanvas = document.createElement('canvas');
      return this._measureCanvas.getContext('2d');
    },

    fontForReference(layer, reference = {}) {
      const fontStyleName = String(reference.fontStyleName || reference.fontStyle || layer?.fontStyle || '').toLowerCase();
      const italic = Boolean(reference.italic ?? layer?.italic) || fontStyleName.includes('italic');
      const weight = reference.fontWeight || layer?.fontWeight || 400;
      const size = Math.max(1, Number(reference.fontSizePx || layer?.fontSizePx || layer?.fontSizePt || 24));
      const familyName = reference.fontFamily || layer?.fontFamily || '';
      const family = familyName
        ? `"${familyName}","ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif`
        : '"ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif';
      return `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
    },

    measureInk(layer, reference = {}) {
      const canvasCtx = this.getMeasureContext();
      const text = String(reference.sampleText || '國') || '國';
      const fontSizePx = Math.max(1, Number(reference.fontSizePx || layer?.fontSizePx || 24));
      if (!canvasCtx) {
        return { ascent: fontSizePx * 0.8, descent: fontSizePx * 0.2, source: 'ratio-fallback' };
      }

      canvasCtx.font = this.fontForReference(layer, reference);
      canvasCtx.textBaseline = 'alphabetic';
      const metrics = canvasCtx.measureText(text);
      const hasActualBounds = Number.isFinite(metrics.actualBoundingBoxAscent)
        && Number.isFinite(metrics.actualBoundingBoxDescent)
        && Number(metrics.actualBoundingBoxAscent) + Number(metrics.actualBoundingBoxDescent) > 0;
      const ascent = hasActualBounds
        ? Number(metrics.actualBoundingBoxAscent)
        : (Number.isFinite(metrics.fontBoundingBoxAscent)
          ? Number(metrics.fontBoundingBoxAscent)
          : fontSizePx * 0.8);
      const descent = hasActualBounds
        ? Number(metrics.actualBoundingBoxDescent)
        : (Number.isFinite(metrics.fontBoundingBoxDescent)
          ? Number(metrics.fontBoundingBoxDescent)
          : fontSizePx * 0.2);
      return {
        ascent: Math.max(0, ascent),
        descent: Math.max(0, descent),
        source: hasActualBounds ? 'actual-bounds' : 'font-bounds-fallback',
      };
    },

    getSourceValues(layer) {
      const legacy = layer?.textBaselineReference && layer.textBaselineReference.version !== this.VERSION
        ? layer.textBaselineReference
        : null;
      const text = this.normalizeText(legacy?.sampleText || layer?.text || '');
      const lines = text.split('\n');
      const fontSizePx = Math.max(1, Number(legacy?.fontSizePx || layer?.fontSizePx || layer?.fontSizePt || 24));
      const lineHeight = Math.max(1, Number(legacy?.lineHeight || layer?.lineHeight || fontSizePx * 1.05));
      const boxHeight = Math.max(1, Number(legacy?.boxHeight || layer?.height || lineHeight));
      return {
        text,
        sampleText: String(lines[0] || '').trim() ? lines[0] : '國',
        lineCount: Math.max(1, Number(legacy?.lineCount || lines.length)),
        fontSizePx,
        lineHeight,
        boxHeight,
        fontFamily: legacy?.fontFamily || layer?.fontFamily || '',
        fontWeight: legacy?.fontWeight || layer?.fontWeight || 400,
        fontStyle: legacy?.fontStyle || layer?.fontStyle || '',
        fontStyleName: legacy?.fontStyleName || '',
        italic: Boolean(legacy?.italic ?? layer?.italic),
      };
    },

    createReference(layer, source = 'json') {
      const values = this.getSourceValues(layer);
      const ink = this.measureInk(layer, values);
      const inkBlockHeight = ink.ascent + ink.descent + Math.max(0, values.lineCount - 1) * values.lineHeight;
      const topPadding = Math.max(0, (values.boxHeight - inkBlockHeight) / 2);
      const baselineOffsetY = topPadding + ink.ascent;

      return {
        version: this.VERSION,
        source,
        baselineOffsetY: round(baselineOffsetY, 4),
        boxHeight: round(values.boxHeight, 4),
        fontSizePx: round(values.fontSizePx, 4),
        lineHeight: round(values.lineHeight, 4),
        lineCount: values.lineCount,
        topPadding: round(topPadding, 4),
        inkAscent: round(ink.ascent, 4),
        inkDescent: round(ink.descent, 4),
        inkBlockHeight: round(inkBlockHeight, 4),
        measurementSource: ink.source,
        sampleText: values.sampleText,
        fontFamily: values.fontFamily,
        fontWeight: values.fontWeight,
        fontStyle: values.fontStyle,
        italic: values.italic,
      };
    },

    captureLayer(layer, { source = 'json', force = false } = {}) {
      if (!layer || layer.type !== 'text') return null;
      if (!force && layer.textBaselineReference?.version === this.VERSION
        && Number.isFinite(Number(layer.textBaselineReference.baselineOffsetY))) {
        return layer.textBaselineReference;
      }
      layer.textBaselineReference = this.createReference(layer, source);
      return layer.textBaselineReference;
    },

    captureTemplate(template, options = {}) {
      Object.values(template?.layers || {}).forEach((layer) => this.captureLayer(layer, options));
      return template;
    },

    async prepareTemplate(template, options = {}) {
      await this.waitForFonts();
      return this.captureTemplate(template, options);
    },

    isSourceMode(layer) {
      const mode = String(layer?.textVerticalAlign || layer?.styledTextVerticalAlign || '')
        .trim()
        .toLowerCase();
      return mode === this.SOURCE_MODE
        || mode === 'json-baseline'
        || mode === 'template-baseline';
    },
  };
  window.TextBaselineModel = TextBaselineModel;
  // ── Renderer：B 系實作（外廣 wave1 V0.5 原文）──
  // ── Renderer：B 系實作（外廣 wave1 V0.5 原文）──
  const Renderer_B = {
    computeGeneratedLayer(key, template = AppState.template) {
      if (key !== 'subtitle_frame') return null;
      const t = template;
      // V1.1：副標題藍色膠囊改為「預設隱藏」，只有該公版JSON明確寫 hidden:false 才會繪製。
      // 舊行為是「預設顯示，明確寫 hidden:true 才隱藏」，這裡整個反過來。
      if (t?.generatedLayers?.subtitle_frame?.hidden !== false) return null;
      const title = t.layers.title;
      const subtitle = t.layers.subtitle;
      const legal = t.layers.legal;
      if (!title || !subtitle) return null;

      const titleTextWidth = CapsuleRuleEngine.measureTextWidth(title, ctx);
      const subtitleTextWidth = CapsuleRuleEngine.measureTextWidth(subtitle, ctx);

      return CapsuleRuleEngine.buildLayer({
        template: t,
        title,
        subtitle,
        legal,
        titleTextWidth,
        subtitleTextWidth,
      });
    },
    getRuleShape(key, layer, template = AppState.template) {
      const rules = getRuleSection(CapsuleRuleEngine.getTemplateFamily(template), 'shapeLayers');
      const names = [key, layer?.psdName].filter(Boolean);
      return names.map((name) => rules[name]).find(Boolean) || null;
    },
    drawRuleShape(canvasCtx, key, layer, template = AppState.template) {
      const rule = this.getRuleShape(key, layer, template);
      return !!(rule && window.ShapeRenderer?.render?.(canvasCtx, layer, rule));
    },
    getTextRule(key, layer, template = AppState.template) {
      const rules = getRuleSection(CapsuleRuleEngine.getTemplateFamily(template), 'textRules');
      const names = [key, layer?.psdName].filter(Boolean);
      return names.map((name) => rules[name]).find(Boolean) || null;
    },
    _drawLayers(canvasCtx, t, ui = false, images = AppState.images, renderOptions = {}) {
      const placementGuides = [];
      for (const key of t.renderOrder || []) {
        if (key === 'subtitle_frame') {
          const generatedLayer = this.computeGeneratedLayer(key, t);
          if (generatedLayer && generatedLayer.hidden !== true) this.drawShape(canvasCtx, generatedLayer);
          continue;
        }
        const layer = t.layers[key];
        if (!layer || layer.hidden) continue;
        if (window.SmartAssetManager?.isPlacementGuide?.(key, layer)) {
          // 參考框永遠最後畫，避免被後續 LOGO / 商品圖蓋住。主畫布與批次預覽顯示，正式匯出不畫。
          placementGuides.push([key, layer]);
          continue;
        }
        // （AMS）render.maskScope＝all：遮罩統一在這裡套用，shape / image / text 共用同一套裁切；image 則改由此處而非 drawImage 套用。
        const maskAll = flag('render.maskScope', 'image') === 'all';
        if (maskAll) { canvasCtx.save(); this.applyLayerMask(canvasCtx, layer, t); }
        if (this.drawRuleShape(canvasCtx, key, layer, t)) { if (maskAll) canvasCtx.restore(); continue; }
        if (layer.type === 'shape') this.drawShape(canvasCtx, layer);
        if (layer.type === 'image') this.drawImage(canvasCtx, key, layer, images, { template: t, showMissing: ui || renderOptions.showMissing === true, showUploadPrompt: ui || renderOptions.showUploadPrompt === true });
        if (layer.type === 'text') { this.drawText(canvasCtx, key, layer, t); if (ui && AppState.editingLayerKey === key) this.drawTextCaret(canvasCtx, key, layer); }
        if (maskAll) canvasCtx.restore();
      }
      if (ui || renderOptions.showGuides === true) {
        placementGuides.forEach(([key, layer]) => this.drawPlacementGuide(canvasCtx, key, layer));
      }
    },
    // P_範圍 的參考線畫法：虛線外框 + 小標籤，跟一般素材的實線外觀明顯不同，提醒這只是輔助
    // 排版用的參考框，不是實際會出現在成品裡的內容。只會在編輯畫布（ui=true）被呼叫到。
    drawPlacementGuide(canvasCtx, key, layer) {
      const box = Geometry.getLayerBox(key, layer);
      canvasCtx.save();
      canvasCtx.setLineDash([6, 4]);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgba(0, 102, 255, .5)';
      canvasCtx.strokeRect(box.x + .5, box.y + .5, box.width, box.height);
      canvasCtx.setLineDash([]);
      canvasCtx.font = '11px -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif';
      canvasCtx.fillStyle = 'rgba(0, 102, 255, .75)';
      const labelY = box.y - 6 > 12 ? box.y - 6 : box.y + 14;
      canvasCtx.fillText('P_範圍（僅供參考，不會匯出）', box.x + 4, labelY);
      canvasCtx.restore();
    },
    render(options = { ui: true }, canvasCtx = ctx) {
      const t = AppState.template;
      if (!t) return;
      DOM.canvas.width = t.canvas.width;
      DOM.canvas.height = t.canvas.height;
      window.PriceTransformEngine?.syncTemplate?.(t);
      LayoutRuleEngine.apply(t);
      // （回饋：文字保留＋縮圖即時更新）Layout 跑完後比對文字層：第一次記基線，之後有差＝使用者手動改了 → 記錄並排程刷新縮圖。
      if (options.ui && ManualTextOverrides.settle(t)) window.BatchManager?.scheduleThumbRefresh?.(t);
      // （自 18節 移植）手動替換圖層的最新外框記回 override（見 ManualAssetUpload.settleOverrideBoxes）。
      if (options.ui) ManualAssetUpload.settleOverrideBoxes(t);
      canvasCtx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      this._drawLayers(canvasCtx, t, options.ui, AppState.images);
      if (options.ui && $('gridToggle')?.checked) this.drawGrid(canvasCtx);
      if (options.ui) this.drawSelection(canvasCtx);
      if (options.ui) SpecOverlayManager.draw(canvasCtx);
      Inspector.syncStatus();
      PreviewZoom.apply();
    },
    // template/images 都可以明確傳入——不指定的話維持原本行為（畫目前使用中的版位）。
    // 這是刻意設計成「純函式」的畫法：只要傳入不同的 template/images，就能安全地畫出
    // 「目前並非使用中」的其他版位縮圖，完全不需要（也不會）去動 AppState.template/activeIndex，
    // 不會跟使用者當下在主畫布上的操作互相干擾。
    renderSceneTo(canvasCtx, template = AppState.template, images = AppState.images, renderOptions = {}) {
      const t = template;
      window.PriceTransformEngine?.syncTemplate?.(t);
      LayoutRuleEngine.apply(t);
      canvasCtx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      this._drawLayers(canvasCtx, t, false, images, renderOptions);
    },
    roundRect(canvasCtx, x, y, width, height, radius = 0) {
      const r = Math.max(0, Math.min(radius, width / 2, height / 2));
      canvasCtx.beginPath();
      canvasCtx.moveTo(x + r, y);
      canvasCtx.arcTo(x + width, y, x + width, y + height, r);
      canvasCtx.arcTo(x + width, y + height, x, y + height, r);
      canvasCtx.arcTo(x, y + height, x, y, r);
      canvasCtx.arcTo(x, y, x + width, y, r);
      canvasCtx.closePath();
    },
    drawShape(canvasCtx, layer) {
      if (!layer) return;

      const shapeKind = String(layer.shape?.kind || layer.shape?.geometry?.kind || '').toLowerCase();
      const vectorRuleKey = [layer.psdName, layer.name]
        .map((name) => normStr(name))
        .find((name) => GLOBAL_VECTOR_RULES[name]);
      const vectorRule = vectorRuleKey ? GLOBAL_VECTOR_RULES[vectorRuleKey] : null;
      // （AMS）render.shapeLegacyTriangleOverride=false：不攔截 CTA_三角形／triangle，全部交給 ShapeRenderer 依 rotation 繪製。
      const legacyTriangleOverride = flag('render.shapeLegacyTriangleOverride', true);
      const isRightArrowTriangle = legacyTriangleOverride && ((vectorRule?.renderer === 'triangle' && vectorRule?.direction === 'right')
        || shapeKind === 'righttriangle'
        || shapeKind === 'ctaarrow'
        || shapeKind === 'ctaarrowright');

      // 全域 CTA 箭頭：固定用圖層外框重畫成「向右」三角形，避免 PSD 匯出的 polygon/vectorPath
      // 方向資料不完整時被 ShapeRenderer 解讀成向上或旋轉 90 度。
      if (isRightArrowTriangle) {
        const x = Number(layer.x || 0);
        const y = Number(layer.y || 0);
        const width = Number(layer.width || 0);
        const height = Number(layer.height || 0);
        const corners = [
          { x, y },
          { x: x + width, y: y + height / 2 },
          { x, y: y + height },
        ];
        canvasCtx.save();
        canvasCtx.fillStyle = layer.fill || layer.shape?.fill || '#ffffff';
        canvasCtx.beginPath();
        canvasCtx.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach((point) => canvasCtx.lineTo(point.x, point.y));
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.restore();
        return;
      }

      // 一般 triangle 仍優先沿用 JSON geometry.corners；沒有 corners 時才用向右三角形 fallback。
      if (legacyTriangleOverride && shapeKind === 'triangle') {
        const corners = Array.isArray(layer.shape?.geometry?.corners) && layer.shape.geometry.corners.length >= 3
          ? layer.shape.geometry.corners
          : [
              { x: Number(layer.x || 0), y: Number(layer.y || 0) },
              { x: Number(layer.x || 0) + Number(layer.width || 0), y: Number(layer.y || 0) + Number(layer.height || 0) / 2 },
              { x: Number(layer.x || 0), y: Number(layer.y || 0) + Number(layer.height || 0) },
            ];
        canvasCtx.save();
        canvasCtx.fillStyle = layer.fill || layer.shape?.fill || '#ffffff';
        canvasCtx.beginPath();
        canvasCtx.moveTo(Number(corners[0].x || 0), Number(corners[0].y || 0));
        corners.slice(1).forEach((point) => canvasCtx.lineTo(Number(point.x || 0), Number(point.y || 0)));
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.restore();
        return;
      }

      // V3.29.2：PSD 公版小工具 V2.2 / V2.3 匯出的 JSON shape
      // 非 CTA 箭頭的 shape 仍交給 ShapeRenderer 依 shape.kind 繪製。
      if (
        layer.type === 'shape' &&
        layer.shape &&
        window.ShapeRenderer?.renderJsonShape?.(canvasCtx, layer)
      ) {
        return;
      }

      canvasCtx.save();
      canvasCtx.fillStyle = layer.fill || '#ffffff';
      const fallbackRadius = Number(layer.radius ?? layer.shape?.cornerRadius ?? layer.shape?.geometry?.cornerRadius ?? 0) || 0;
      this.roundRect(canvasCtx, layer.x, layer.y, layer.width, layer.height, fallbackRadius);
      canvasCtx.fill();
      canvasCtx.restore();
    },
    font(layer) {
      const style  = layer.fontStyle === 'italic' ? 'italic ' : '';
      const weight = layer.fontWeight || 400;
      const size   = layer.fontSizePx || 24;
      const family = layer.fontFamily
        ? `"${layer.fontFamily}","ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif`
        : '"ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif';
      return `${style}${weight} ${size}px ${family}`;
    },
    drawText(canvasCtx, key, layer, template = AppState.template) {
      if (flag('render.textEngine', 'baselineModel') === 'legacy') return this.drawTextLegacy(canvasCtx, key, layer, template);
      const renderLayer = (AppState.editingLayerKey === key && canvasCtx === ctx)
        ? { ...layer, text: AppState.editingText }
        : layer;
      const drawableLayer = { ...renderLayer };
      const textRule = this.getTextRule?.(key, drawableLayer, template) || null;
      if (Number.isFinite(Number(textRule?.lineHeightPx))) {
        drawableLayer.lineHeight = Number(textRule.lineHeightPx);
      }
      const rotation = Number(drawableLayer.rotation || 0);

      canvasCtx.save();
      if (rotation) {
        const cx = (drawableLayer.x || 0) + (drawableLayer.width || 0) / 2;
        const cy = (drawableLayer.y || 0) + (drawableLayer.height || 0) / 2;
        canvasCtx.translate(cx, cy);
        canvasCtx.rotate((rotation * Math.PI) / 180);
        drawableLayer.x = -(drawableLayer.width || 0) / 2;
        drawableLayer.y = -(drawableLayer.height || 0) / 2;
      }

      canvasCtx.fillStyle = drawableLayer.color || '#000000';
      canvasCtx.font = this.font(drawableLayer);
      canvasCtx.textAlign = drawableLayer.align || 'center';
      canvasCtx.textBaseline = 'top';
      // 貼近 Photoshop：啟用字型內建 kerning 與清晰度優化（不支援的瀏覽器會靜默略過）
      canvasCtx.fontKerning = 'normal';
      canvasCtx.textRendering = 'optimizeLegibility';
      const textValue = String(drawableLayer.text || '').replace(/_x000d_/gi, '\n').replace(/\r\n/g, '\n').replace(/[\r\u0003\u2028\u2029]/g, '\n');
      const lines = textValue.split('\n');
      const fontSize = drawableLayer.fontSizePx || 24;
      const lineHeight = drawableLayer.lineHeight || fontSize * 1.05;
      const letterSpacing = Number(drawableLayer.letterSpacing || 0);
      const bottomAligned = this.isTextBottomAligned(drawableLayer);
      const sourceBaselineAligned = this.isTextSourceBaselineAligned(drawableLayer);
      const bottomPadding = Math.max(0, Number(drawableLayer.textBottomPaddingPx || 0));
      const defaultStartY = drawableLayer.y + Math.max(0, (drawableLayer.height - lines.length * lineHeight) / 2);
      const x = drawableLayer.align === 'left'
        ? drawableLayer.x
        : drawableLayer.align === 'right'
          ? drawableLayer.x + drawableLayer.width
          : drawableLayer.x + drawableLayer.width / 2;

      // 先建立每行的分段資料，確保一般文字與大小字共用同一套垂直定位。
      let charOffset = 0;
      const lineEntries = lines.map((line) => {
        const segments = this.getTextStyleSegments(drawableLayer, line, charOffset);
        const hasRangeTypography = segments.some((segment) =>
          (segment?.color && segment.color !== (drawableLayer.color || '#000000'))
          || Number(segment?.fontSizePx || 0) !== Number(drawableLayer.fontSizePx || 0)
          || String(segment?.fontFamily || '') !== String(drawableLayer.fontFamily || '')
          || String(segment?.fontWeight || '') !== String(drawableLayer.fontWeight || '')
          || Boolean(segment?.italic) !== Boolean(drawableLayer.italic)
          || Number(segment?.letterSpacing || 0) !== Number(drawableLayer.letterSpacing || 0)
          || Number(segment?.baselineOffset || 0) !== 0
        );
        charOffset += String(line || '').length + 1;
        return { line, segments, hasRangeTypography };
      });

      // bottom 模式以最後一行「實際字形下緣」貼齊文字框底部；前面的行依 lineHeight 向上排列。
      // 不使用 fontSize 或 lineHeight 猜測下緣，避免中文字、數字與符號的字形高度不同而漂移。
      const lastLineMetrics = bottomAligned
        ? this.getStyledLineInkMetrics(canvasCtx, lineEntries[lineEntries.length - 1]?.segments || [], drawableLayer)
        : null;
      const lastBaselineY = bottomAligned
        ? drawableLayer.y + drawableLayer.height - bottomPadding - Number(lastLineMetrics?.descent || 0)
        : null;
      const sourceFirstBaselineY = sourceBaselineAligned
        ? this.getSourceTextBaseline(canvasCtx, drawableLayer, drawableLayer.y)
        : null;
      const lineY = (index) => {
        if (bottomAligned) return lastBaselineY - (lineEntries.length - 1 - index) * lineHeight;
        if (sourceBaselineAligned) return sourceFirstBaselineY + index * lineHeight;
        return defaultStartY + index * lineHeight;
      };

      lineEntries.forEach(({ line, segments, hasRangeTypography }, i) => {
        const drawY = lineY(i);
        if (segments.length > 1 || hasRangeTypography) {
          this.drawStyledTextLine(
            canvasCtx,
            segments,
            x,
            drawY,
            drawableLayer.align || 'center',
            letterSpacing,
            drawableLayer.color || '#000000',
            drawableLayer,
            (bottomAligned || sourceBaselineAligned) ? 'baseline' : 'auto'
          );
        } else {
          canvasCtx.font = this.font(drawableLayer);
          canvasCtx.textBaseline = (bottomAligned || sourceBaselineAligned) ? 'alphabetic' : 'top';
          this.drawTextLine(canvasCtx, line, x, drawY, drawableLayer.align || 'center', letterSpacing);
        }
      });

      // 底線
      if (drawableLayer.textDecoration?.includes('underline')) {
        canvasCtx.strokeStyle = drawableLayer.color || '#000000';
        canvasCtx.lineWidth = Math.max(1, fontSize * 0.06);
        lineEntries.forEach(({ line, segments }, i) => {
          canvasCtx.font = this.font(drawableLayer);
          const w = canvasCtx.measureText(line).width;
          const x0 = drawableLayer.align === 'right'  ? x - w
                   : drawableLayer.align === 'center' ? x - w / 2
                   : x;
          const metrics = this.getStyledLineInkMetrics(canvasCtx, segments, drawableLayer);
          const y0 = (bottomAligned || sourceBaselineAligned)
            ? lineY(i) + Number(metrics.descent || 0) + 2
            : lineY(i) + fontSize + 2;
          canvasCtx.beginPath(); canvasCtx.moveTo(x0, y0); canvasCtx.lineTo(x0 + w, y0); canvasCtx.stroke();
        });
      }

      // 刪除線（line-through）：貫穿整行（含大小字混排的完整實測寬度），顏色跟隨字色、粗細與底線一致（字級 6%）。
      // 垂直位置＝「該行最大字級分段（價格情境即實際數字）ink 高度」的中線：
      // 小字符號（$、逗號）不參與定位——逗號的 ink 垂在基線以下，若納入會把中線往下拉，
      // 造成刪除線低於數字視覺中央。整行同字級時即為該行字形中線。
      // 通用能力：任何文字圖層設定 textDecoration = 'line-through' 即生效，引擎不針對特定圖層寫死。
      if (drawableLayer.textDecoration?.includes('line-through')) {
        canvasCtx.strokeStyle = drawableLayer.color || '#000000';
        canvasCtx.lineWidth = Math.max(1, fontSize * 0.06);
        lineEntries.forEach(({ line, segments }, i) => {
          let w = this.measureTextSegments(canvasCtx, segments, letterSpacing, drawableLayer);
          if (!(Number.isFinite(w) && w > 0)) {
            canvasCtx.font = this.font(drawableLayer);
            w = canvasCtx.measureText(line).width;
          }
          const x0 = drawableLayer.align === 'right'  ? x - w
                   : drawableLayer.align === 'center' ? x - w / 2
                   : x;
          // 取該行「最大字級」的分段（實際數字/大字）量測 ink 高度；沒有可見分段時退回整行量測。
          const visibleSegments = segments.filter((segment) => String(segment?.text || '').length);
          const segmentSize = (segment) => {
            const size = Number(segment?.fontSizePx);
            return Number.isFinite(size) && size > 0 ? size : Number(drawableLayer.fontSizePx || fontSize);
          };
          const maxFontSize = visibleSegments.length ? Math.max(...visibleSegments.map(segmentSize)) : Number(drawableLayer.fontSizePx || fontSize);
          const digitSegments = visibleSegments.filter((segment) => Math.abs(segmentSize(segment) - maxFontSize) < 0.01);
          // 重要：measureText 的 actualBoundingBoxAscent/Descent 是「相對於當下 textBaseline」量測的。
          // drawText 開頭把 textBaseline 設為 'top'，若直接量測，數字的 ink 全在 top 線下方
          // → ascent≈0、descent≈字高，中線公式會把刪除線推到基線以下（看起來像底線）。
          // 量測前必須切到 'alphabetic'（基線相對），量完還原。
          const savedTextBaseline = canvasCtx.textBaseline;
          canvasCtx.textBaseline = 'alphabetic';
          const metrics = this.getStyledLineInkMetrics(canvasCtx, digitSegments.length ? digitSegments : segments, drawableLayer);
          canvasCtx.textBaseline = savedTextBaseline;
          const ascent = Number(metrics.ascent || 0);
          const descent = Number(metrics.descent || 0);
          // baseline 定位模式下 lineY(i) 是基線；大字 ink 介於 [基線-ascent, 基線+descent]，中線 = 基線 - (ascent-descent)/2。
          // top 定位模式下 lineY(i) 是行頂，以 lineY + fontSize 近似基線（與底線的 fontSize+2 同一套近似邏輯）。
          const y0 = (bottomAligned || sourceBaselineAligned)
            ? lineY(i) - (ascent - descent) / 2
            : lineY(i) + fontSize - (ascent - descent) / 2;
          canvasCtx.beginPath(); canvasCtx.moveTo(x0, y0); canvasCtx.lineTo(x0 + w, y0); canvasCtx.stroke();
        });
      }

      canvasCtx.restore();
    },
    getTextStyleSegments(layer, line, lineStartOffset = 0) {
      const text = String(line || '');
      if (!text) return [{ text: '', color: layer?.color || '#000000' }];

      const ranges = Array.isArray(layer?.textStyleRanges)
        ? layer.textStyleRanges
            .map((range) => {
              const style = range?.style && typeof range.style === 'object' ? range.style : {};
              return {
                from: Math.max(0, Number(range?.from ?? 0)),
                to: Math.max(0, Number(range?.to ?? 0)),
                color: range?.color || range?.fill || style.color || style.fill || layer?.color || '#000000',
                fontSizePx: Number(range?.fontSizePx ?? style.fontSizePx ?? layer?.fontSizePx),
                fontFamily: range?.fontFamily || style.fontFamily || layer?.fontFamily || '',
                fontWeight: range?.fontWeight || style.fontWeight || layer?.fontWeight || 400,
                fontStyle: range?.fontStyle || range?.fontStyleName || style.fontStyle || style.fontStyleName || layer?.fontStyle || '',
                italic: Boolean(range?.italic ?? style.italic ?? layer?.italic),
                lineHeight: Number(range?.lineHeight ?? style.lineHeight ?? layer?.lineHeight),
                letterSpacing: Number(range?.letterSpacing ?? style.letterSpacing ?? layer?.letterSpacing ?? 0),
                // Reserved for future PSD exports. Auto-centering works even when this value is absent.
                baselineOffset: Number(range?.baselineOffset ?? range?.baselineShift ?? style.baselineOffset ?? style.baselineShift ?? 0),
              };
            })
            .filter((range) => range.to > range.from)
            .sort((a, b) => a.from - b.from)
        : [];

      if (!ranges.length) return [{
        text,
        color: layer?.color || '#000000',
        fontSizePx: Number(layer?.fontSizePx || 24),
        fontFamily: layer?.fontFamily || '',
        fontWeight: layer?.fontWeight || 400,
        fontStyle: layer?.fontStyle || '',
        italic: Boolean(layer?.italic),
        lineHeight: Number(layer?.lineHeight || 0),
        letterSpacing: Number(layer?.letterSpacing || 0),
        baselineOffset: 0,
      }];

      const lineEndOffset = lineStartOffset + text.length;
      const boundaries = new Set([0, text.length]);
      ranges.forEach((range) => {
        const from = Math.max(lineStartOffset, range.from) - lineStartOffset;
        const to = Math.min(lineEndOffset, range.to) - lineStartOffset;
        if (from > 0 && from < text.length) boundaries.add(from);
        if (to > 0 && to < text.length) boundaries.add(to);
      });

      const points = [...boundaries].sort((a, b) => a - b);
      const segments = [];
      for (let i = 0; i < points.length - 1; i += 1) {
        const from = points[i];
        const to = points[i + 1];
        if (to <= from) continue;
        const absoluteIndex = lineStartOffset + from;
        const matchedRange = ranges.find((range) => absoluteIndex >= range.from && absoluteIndex < range.to);
        segments.push({
          text: text.slice(from, to),
          color: matchedRange?.color || layer?.color || '#000000',
          fontSizePx: Number(matchedRange?.fontSizePx || layer?.fontSizePx || 24),
          fontFamily: matchedRange?.fontFamily || layer?.fontFamily || '',
          fontWeight: matchedRange?.fontWeight || layer?.fontWeight || 400,
          fontStyle: matchedRange?.fontStyle || layer?.fontStyle || '',
          italic: Boolean(matchedRange?.italic ?? layer?.italic),
          lineHeight: Number(matchedRange?.lineHeight || layer?.lineHeight || 0),
          letterSpacing: Number.isFinite(Number(matchedRange?.letterSpacing))
            ? Number(matchedRange.letterSpacing)
            : Number(layer?.letterSpacing || 0),
          baselineOffset: Number(matchedRange?.baselineOffset || 0),
        });
      }
      return segments.length ? segments : [{ text, color: layer?.color || '#000000' }];
    },
    fontForTextStyle(layer, style = {}) {
      const fontStyleName = String(style.fontStyle || '').toLowerCase();
      const italic = Boolean(style.italic) || fontStyleName.includes('italic');
      const weight = style.fontWeight || layer?.fontWeight || 400;
      const size = Number(style.fontSizePx || layer?.fontSizePx || 24);
      const familyName = style.fontFamily || layer?.fontFamily || '';
      const family = familyName
        ? `"${familyName}","ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif`
        : '"ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif';
      return `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
    },
    getTextInkMetrics(canvasCtx, segment = {}) {
      const text = String(segment.text || '') || '國';
      const metrics = canvasCtx.measureText(text);
      const fontSize = Number(segment.fontSizePx || 24);
      const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
        ? metrics.actualBoundingBoxAscent
        : fontSize * 0.8;
      const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
        ? metrics.actualBoundingBoxDescent
        : fontSize * 0.2;
      return { ascent, descent };
    },
    isTextBottomAligned(layer) {
      const mode = String(layer?.textVerticalAlign || '').trim().toLowerCase();
      return mode === 'bottom' || mode === 'ink-bottom' || mode === 'bottom-ink';
    },
    isTextSourceBaselineAligned(layer) {
      if (TextBaselineModel.isSourceMode(layer)) return true;
      return !!(layer?.textBaselineReference && this.shouldUseOriginalStyledBaseline(layer));
    },
    getSourceTextBaseline(canvasCtx, layer, boxY = 0) {
      const reference = TextBaselineModel.captureLayer(layer, { source: 'runtime' });
      if (!reference || !Number.isFinite(Number(reference.baselineOffsetY))) {
        return this.getOriginalTextBaseline(canvasCtx, layer, layer?.text || '', boxY);
      }

      const sourceFontSize = Math.max(0.01, Number(reference.fontSizePx || layer?.fontSizePx || 24));
      const currentFontSize = Math.max(0.01, Number(layer?.fontSizePx || sourceFontSize));
      const fontScale = currentFontSize / sourceFontSize;
      return Number(boxY || 0) + Number(reference.baselineOffsetY) * fontScale;
    },
    getStyledLineInkMetrics(canvasCtx, segments = [], layer = null) {
      const visibleSegments = segments.filter((segment) => String(segment.text || '').length);
      const fallback = [{
        text: '國',
        fontSizePx: Number(layer?.fontSizePx || 24),
        fontFamily: layer?.fontFamily,
        fontWeight: layer?.fontWeight,
        italic: layer?.italic,
        baselineOffset: 0,
      }];
      const originalFont = canvasCtx.font;
      const result = (visibleSegments.length ? visibleSegments : fallback).reduce((metricsResult, segment) => {
        canvasCtx.font = this.fontForTextStyle(layer, segment);
        const metrics = this.getTextInkMetrics(canvasCtx, segment);
        const offset = Number(segment?.baselineOffset || 0);
        return {
          ascent: Math.max(metricsResult.ascent, Number(metrics.ascent || 0) - offset),
          descent: Math.max(metricsResult.descent, Number(metrics.descent || 0) + offset),
        };
      }, { ascent: 0, descent: 0 });
      canvasCtx.font = originalFont;
      return result;
    },
    measureTextSegments(canvasCtx, segments = [], letterSpacing = 0, layer = null) {
      const visibleSegments = segments.filter((segment) => String(segment.text || '').length);
      const totalChars = visibleSegments.reduce((sum, segment) => sum + [...String(segment.text || '')].length, 0);
      let measuredChars = 0;
      return visibleSegments.reduce((sum, segment) => {
        canvasCtx.font = this.fontForTextStyle(layer, segment);
        const spacing = Number.isFinite(Number(segment.letterSpacing))
          ? Number(segment.letterSpacing)
          : Number(letterSpacing || 0);
        return sum + [...String(segment.text || '')].reduce((width, ch) => {
          measuredChars += 1;
          return width + canvasCtx.measureText(ch).width + (measuredChars < totalChars ? spacing : 0);
        }, 0);
      }, 0);
    },
    shouldUseOriginalStyledBaseline(layer, segments = []) {
      if (layer?.styledTextVerticalAlign === 'original-baseline') return true;
      // 舊旗標全部轉入新版「維持單一字級原始基線」邏輯，避免舊 JSON 上下跳動。
      if (layer?.styledTextVerticalAlign === 'first-segment-baseline'
        || layer?.styledTextVerticalAlign === 'first-segment-center') return true;
      const baseSize = Number(layer?.fontSizePx || 0);
      return Array.isArray(layer?.textStyleRanges)
        && layer.textStyleRanges.some((range) => Math.abs(Number(range?.fontSizePx || baseSize) - baseSize) > 0.01);
    },
    getOriginalTextBaseline(canvasCtx, layer, text, y) {
      const reference = {
        text: String(text || '') || '國',
        fontSizePx: Number(layer?.fontSizePx || 24),
        fontFamily: layer?.fontFamily,
        fontWeight: layer?.fontWeight,
        fontStyle: layer?.fontStyle,
        italic: layer?.italic,
      };
      const originalFont = canvasCtx.font;
      canvasCtx.font = this.fontForTextStyle(layer, reference);
      const metrics = this.getTextInkMetrics(canvasCtx, reference);
      canvasCtx.font = originalFont;
      return Number(y || 0) + Number(metrics.ascent || 0);
    },
    drawStyledTextLine(canvasCtx, segments = [], x, y, align = 'center', letterSpacing = 0, fallbackColor = '#000000', layer = null, positionMode = 'auto') {
      if (flag('render.textEngine', 'baselineModel') === 'legacy') return this.drawStyledTextLineLegacy(canvasCtx, segments, x, y, align, letterSpacing, fallbackColor, layer);
      const visibleSegments = segments.filter((segment) => String(segment.text || '').length);
      if (!visibleSegments.length) return;

      const originalAlign = canvasCtx.textAlign;
      const originalFill = canvasCtx.fillStyle;
      const originalFont = canvasCtx.font;
      const originalBaseline = canvasCtx.textBaseline;
      canvasCtx.fontKerning = 'normal';
      canvasCtx.textRendering = 'optimizeLegibility';
      const totalWidth = this.measureTextSegments(canvasCtx, visibleSegments, letterSpacing, layer);
      let cursorX = align === 'right' ? x - totalWidth : align === 'center' ? x - totalWidth / 2 : x;
      canvasCtx.textAlign = 'left';

      const baselineProvided = positionMode === 'baseline';
      const bottomAligned = this.isTextBottomAligned(layer);
      const sourceBaselineAligned = this.isTextSourceBaselineAligned(layer);
      const useOriginalBaseline = !baselineProvided
        && !bottomAligned
        && !sourceBaselineAligned
        && this.shouldUseOriginalStyledBaseline(layer, visibleSegments);
      const baselineY = baselineProvided
        ? Number(y || 0)
        : (bottomAligned
          ? Number(y || 0)
          : (sourceBaselineAligned
            ? this.getSourceTextBaseline(canvasCtx, layer, Number(layer?.y || y || 0))
            : (useOriginalBaseline
              ? this.getOriginalTextBaseline(canvasCtx, layer, visibleSegments.map((segment) => segment.text).join(''), y)
              : null)));
      const alphabeticBaseline = baselineProvided || bottomAligned || sourceBaselineAligned || useOriginalBaseline;
      canvasCtx.textBaseline = alphabeticBaseline ? 'alphabetic' : 'top';

      const totalChars = visibleSegments.reduce((sum, segment) => sum + [...String(segment.text || '')].length, 0);
      let drawnChars = 0;
      visibleSegments.forEach((segment) => {
        canvasCtx.font = this.fontForTextStyle(layer, segment);
        canvasCtx.fillStyle = segment.color || fallbackColor;
        const spacing = Number.isFinite(Number(segment.letterSpacing))
          ? Number(segment.letterSpacing)
          : Number(letterSpacing || 0);
        const drawY = alphabeticBaseline
          ? baselineY + Number(segment.baselineOffset || 0)
          : y + Number(segment.baselineOffset || 0);
        [...String(segment.text || '')].forEach((ch) => {
          canvasCtx.fillText(ch, cursorX, drawY);
          cursorX += canvasCtx.measureText(ch).width;
          drawnChars += 1;
          if (drawnChars < totalChars) cursorX += spacing;
        });
      });

      canvasCtx.fillStyle = originalFill;
      canvasCtx.font = originalFont;
      canvasCtx.textAlign = originalAlign;
      canvasCtx.textBaseline = originalBaseline;
    },
    // （OM_w2）價格外框收斂到實測字形；由 price.fitBoxToInk 旗標的呼叫端決定是否使用。
    fitTextLayerToInk(key, layer, measureContext = ctx) {
      if (!layer || layer.type !== 'text' || !measureContext) return false;
      const rawText = String(layer.text || '');
      if (!rawText.trim()) return false;

      const oldWidth = Math.max(0, Number(layer.width || 0));
      const oldHeight = Math.max(0, Number(layer.height || 0));
      const oldX = Number.isFinite(Number(layer.x)) ? Number(layer.x) : Number(layer.centerX || 0) - oldWidth / 2;
      const oldY = Number.isFinite(Number(layer.y)) ? Number(layer.y) : Number(layer.centerY || 0) - oldHeight / 2;
      // 中心一律由 x/y/width/height 推導，不可直接讀 layer.centerX / centerY。
      // Geometry.getLayerBox() 對文字圖層本來就只認 x/y/width/height，
      // 若這裡改讀 center，只要有任何一條路徑先寫了 x/y 卻沒同步 center，收框就會把圖層拉回舊位置。
      const oldCenterX = oldX + oldWidth / 2;
      const centerY = oldY + oldHeight / 2;

      const width = Math.max(1, this.measureRenderedTextWidth(layer, measureContext));

      const lines = String(rawText).replace(/_x000d_/gi, '\n').replace(/\r\n/g, '\n').replace(/[\r\u0003\u2028\u2029]/g, '\n').split('\n');
      const fontSize = Number(layer.fontSizePx || 24);
      const lineHeight = Number(layer.lineHeight || fontSize * (Number(layer.lineHeightMultiplier) || 1.08));

      let height;
      if (this.isTextSourceBaselineAligned(layer)) {
        const originalFont = measureContext.font;
        let charOffset = 0;
        const perLine = lines.map((line) => {
          const segments = this.getTextStyleSegments(layer, line, charOffset);
          charOffset += String(line || '').length + 1;
          return this.getStyledLineInkMetrics(measureContext, segments, layer);
        });
        measureContext.font = originalFont;
        const ascent = Number(perLine[0]?.ascent || 0);
        const descent = Number(perLine[perLine.length - 1]?.descent || 0);
        height = ascent + descent + Math.max(0, lines.length - 1) * lineHeight;
      } else {
        height = lines.length * lineHeight;
      }
      height = Math.max(1, height);

      // 水平方向依對齊方式固定不會動的那一側，避免 left / right 對齊的文字被推走。
      const align = String(layer.align || 'center');
      const nextX = align === 'left'
        ? oldX
        : align === 'right'
          ? oldX + oldWidth - width
          : oldCenterX - width / 2;

      layer.width = round(width, 2);
      layer.height = round(height, 2);
      layer.x = round(nextX, 2);
      layer.y = round(centerY - height / 2, 2);
      layer.centerX = round(nextX + width / 2, 2);
      layer.centerY = round(centerY, 2);

      // 框改了，baseline 參考值必須用新的 boxHeight 重算，否則字會跟著框一起往上跑。
      TextBaselineModel.captureLayer(layer, { source: 'ink-fit', force: true });
      return true;
    },
    measureRenderedTextWidth(layer, measureContext = ctx) {
      if (!layer || layer.type !== 'text' || !measureContext) return Math.max(0, Number(layer?.width || 0));
      const textValue = String(layer.text || '').replace(/_x000d_/gi, '\n').replace(/\r\n/g, '\n').replace(/[\r\u0003\u2028\u2029]/g, '\n');
      const lines = textValue.split('\n');
      let charOffset = 0;
      let maxWidth = 0;
      const originalFont = measureContext.font;
      lines.forEach((line) => {
        const segments = this.getTextStyleSegments(layer, line, charOffset);
        const width = this.measureTextSegments(measureContext, segments, Number(layer.letterSpacing || 0), layer);
        maxWidth = Math.max(maxWidth, Number(width || 0));
        charOffset += String(line || '').length + 1;
      });
      measureContext.font = originalFont;
      return Math.ceil(maxWidth);
    },
    // ── render.textEngine＝legacy（KV V0.2 舊文字引擎）：無 fontKerning/textRendering、無 TextBaselineModel，
    //    大小字以 usp_上/中/下 首段置中或最大字級墨水底端對齊。以下四支為 KV 原文。 ──
    shouldCenterStyledTextByFirstSegmentLegacy(layer) {
      const name = String(layer?.psdName || '')
        .replace(/[\u00a0\u3000]/g, ' ')
        .trim()
        .toLowerCase();
      return /^usp_(上|中|下)$/.test(name);
    },
    drawTextLegacy(canvasCtx, key, layer, template = AppState.template) {
      const renderLayer = (AppState.editingLayerKey === key && canvasCtx === ctx)
        ? { ...layer, text: AppState.editingText }
        : layer;
      const drawableLayer = { ...renderLayer };
      const textRule = this.getTextRule?.(key, drawableLayer, template) || null;
      if (Number.isFinite(Number(textRule?.lineHeightPx))) {
        drawableLayer.lineHeight = Number(textRule.lineHeightPx);
      }
      const rotation = Number(drawableLayer.rotation || 0);

      canvasCtx.save();
      if (rotation) {
        const cx = (drawableLayer.x || 0) + (drawableLayer.width || 0) / 2;
        const cy = (drawableLayer.y || 0) + (drawableLayer.height || 0) / 2;
        canvasCtx.translate(cx, cy);
        canvasCtx.rotate((rotation * Math.PI) / 180);
        drawableLayer.x = -(drawableLayer.width || 0) / 2;
        drawableLayer.y = -(drawableLayer.height || 0) / 2;
      }

      canvasCtx.fillStyle = drawableLayer.color || '#000000';
      canvasCtx.font = this.font(drawableLayer);
      canvasCtx.textAlign = drawableLayer.align || 'center';
      canvasCtx.textBaseline = 'top';
      const textValue = String(drawableLayer.text || '').replace(/_x000d_/gi, '\n').replace(/\r\n/g, '\n').replace(/[\r\u0003\u2028\u2029]/g, '\n');
      const lines = textValue.split('\n');
      const fontSize = drawableLayer.fontSizePx || 24;
      const lineHeight = drawableLayer.lineHeight || fontSize * 1.05;
      const letterSpacing = Number(drawableLayer.letterSpacing || 0);
      const startY = drawableLayer.y + Math.max(0, (drawableLayer.height - lines.length * lineHeight) / 2);
      const x = drawableLayer.align === 'left'
        ? drawableLayer.x
        : drawableLayer.align === 'right'
          ? drawableLayer.x + drawableLayer.width
          : drawableLayer.x + drawableLayer.width / 2;

      let charOffset = 0;
      lines.forEach((line, i) => {
        const segments = this.getTextStyleSegments(drawableLayer, line, charOffset);
        const hasRangeTypography = segments.some((segment) =>
          (segment?.color && segment.color !== (drawableLayer.color || '#000000'))
          || Number(segment?.fontSizePx || 0) !== Number(drawableLayer.fontSizePx || 0)
          || String(segment?.fontFamily || '') !== String(drawableLayer.fontFamily || '')
          || String(segment?.fontWeight || '') !== String(drawableLayer.fontWeight || '')
          || Boolean(segment?.italic) !== Boolean(drawableLayer.italic)
          || Number(segment?.letterSpacing || 0) !== Number(drawableLayer.letterSpacing || 0)
          || Number(segment?.baselineOffset || 0) !== 0
        );
        if (segments.length > 1 || hasRangeTypography) {
          this.drawStyledTextLineLegacy(
            canvasCtx,
            segments,
            x,
            startY + i * lineHeight,
            drawableLayer.align || 'center',
            letterSpacing,
            drawableLayer.color || '#000000',
            drawableLayer
          );
        } else {
          this.drawTextLine(canvasCtx, line, x, startY + i * lineHeight, drawableLayer.align || 'center', letterSpacing);
        }
        // +1 accounts for the newline removed by split(). It is harmless for the last line.
        charOffset += String(line || '').length + 1;
      });

      // 底線
      if (drawableLayer.textDecoration?.includes('underline')) {
        canvasCtx.strokeStyle = drawableLayer.color || '#000000';
        canvasCtx.lineWidth = Math.max(1, fontSize * 0.06);
        lines.forEach((line, i) => {
          const w = canvasCtx.measureText(line).width;
          const x0 = drawableLayer.align === 'right'  ? x - w
                   : drawableLayer.align === 'center' ? x - w / 2
                   : x;
          const y0 = startY + i * lineHeight + fontSize + 2;
          canvasCtx.beginPath(); canvasCtx.moveTo(x0, y0); canvasCtx.lineTo(x0 + w, y0); canvasCtx.stroke();
        });
      }

      canvasCtx.restore();
    },
    drawStyledTextLineLegacy(canvasCtx, segments = [], x, y, align = 'center', letterSpacing = 0, fallbackColor = '#000000', layer = null) {
      const visibleSegments = segments.filter((segment) => String(segment.text || '').length);
      if (!visibleSegments.length) return;

      const originalAlign = canvasCtx.textAlign;
      const originalFill = canvasCtx.fillStyle;
      const originalFont = canvasCtx.font;
      const originalBaseline = canvasCtx.textBaseline;
      const totalWidth = this.measureTextSegments(canvasCtx, visibleSegments, letterSpacing, layer);
      let cursorX = align === 'right' ? x - totalWidth : align === 'center' ? x - totalWidth / 2 : x;
      canvasCtx.textAlign = 'left';

      const centerByFirstSegment = this.shouldCenterStyledTextByFirstSegmentLegacy(layer);
      // source-baseline：混合字級分段的垂直對齊（比照 25節_暖身BN 的視覺行為）。
      // 82% 縮小字（$、% 等）若用 textBaseline='top' 會貼上緣；規格為「貼下緣」：
      // 以「最大字級分段」的墨水底端為整行基準線，各分段 drawY = 底端 − 自身 descent，
      // 大字位置不變、小字底端與大字底端精確切齊，再加各 range 的 baselineOffset。
      const sourceBaselineAligned = !centerByFirstSegment
        && String(layer?.styledTextVerticalAlign || '') === 'source-baseline';
      let targetCenterY = null;
      let inkBottomY = null;
      if (centerByFirstSegment) {
        const reference = visibleSegments[0];
        canvasCtx.font = this.fontForTextStyle(layer, reference);
        const { ascent, descent } = this.getTextInkMetrics(canvasCtx, reference);
        // Keep the first segment's visual top at the original y, then align every
        // following segment to the same actual glyph centre.
        targetCenterY = y + (ascent + descent) / 2;
        canvasCtx.textBaseline = 'alphabetic';
      } else if (sourceBaselineAligned) {
        // 基準分段 = 字級最大的分段；其 top 維持在原 y，墨水底端作為全行底線。
        let reference = visibleSegments[0];
        visibleSegments.forEach((segment) => {
          if (Number(segment.fontSizePx || 0) > Number(reference.fontSizePx || 0)) reference = segment;
        });
        canvasCtx.font = this.fontForTextStyle(layer, reference);
        const refMetrics = this.getTextInkMetrics(canvasCtx, reference);
        inkBottomY = y + Number(refMetrics.ascent || 0) + Number(refMetrics.descent || 0);
        canvasCtx.textBaseline = 'alphabetic';
      } else {
        canvasCtx.textBaseline = 'top';
      }

      const totalChars = visibleSegments.reduce((sum, segment) => sum + [...String(segment.text || '')].length, 0);
      let drawnChars = 0;
      visibleSegments.forEach((segment) => {
        canvasCtx.font = this.fontForTextStyle(layer, segment);
        canvasCtx.fillStyle = segment.color || fallbackColor;
        const spacing = Number.isFinite(Number(segment.letterSpacing))
          ? Number(segment.letterSpacing)
          : Number(letterSpacing || 0);
        let drawY = y;
        if (centerByFirstSegment) {
          const { ascent, descent } = this.getTextInkMetrics(canvasCtx, segment);
          drawY = targetCenterY + (ascent - descent) / 2 + Number(segment.baselineOffset || 0);
        } else if (sourceBaselineAligned) {
          // 貼下緣：本分段墨水底端 = 全行底線（inkBottomY）
          const { descent } = this.getTextInkMetrics(canvasCtx, segment);
          drawY = inkBottomY - Number(descent || 0) + Number(segment.baselineOffset || 0);
        }
        [...String(segment.text || '')].forEach((ch) => {
          canvasCtx.fillText(ch, cursorX, drawY);
          cursorX += canvasCtx.measureText(ch).width;
          drawnChars += 1;
          if (drawnChars < totalChars) cursorX += spacing;
        });
      });

      canvasCtx.fillStyle = originalFill;
      canvasCtx.font = originalFont;
      canvasCtx.textAlign = originalAlign;
      canvasCtx.textBaseline = originalBaseline;
    },
    drawTextCaretLegacy(canvasCtx, key, layer) {
      if (!AppState.caretVisible) return;
      const text = AppState.editingLayerKey === key ? (AppState.editingText || '') : (layer.text || '');
      canvasCtx.save();
      canvasCtx.font = this.font(layer);
      canvasCtx.textBaseline = 'top';
      const lines    = String(text).split('\n');
      const fontSize = layer.fontSizePx || 24;
      const lh       = layer.lineHeight || fontSize * 1.05;
      const lastLine = lines[lines.length - 1] || '';
      const lineIdx  = lines.length - 1;
      const lastW    = canvasCtx.measureText(lastLine).width;
      let caretX;
      if (layer.align === 'left')        caretX = layer.x + lastW;
      else if (layer.align === 'right')  caretX = layer.x + layer.width;
      else                               caretX = layer.x + layer.width / 2
                                                - canvasCtx.measureText(lines[lineIdx] || '').width / 2
                                                + lastW;
      const startY = layer.y + Math.max(0, (layer.height - lines.length * lh) / 2);
      const caretY = startY + lineIdx * lh;
      canvasCtx.strokeStyle = layer.color || '#ffffff';
      canvasCtx.lineWidth   = Math.max(1.5, fontSize * 0.06);
      canvasCtx.lineCap     = 'round';
      canvasCtx.beginPath();
      canvasCtx.moveTo(caretX, caretY);
      canvasCtx.lineTo(caretX, caretY + fontSize * 1.1);
      canvasCtx.stroke();
      canvasCtx.restore();
    },
    drawTextLine(canvasCtx, text, x, y, align = 'center', letterSpacing = 0) {
      if (!letterSpacing) {
        canvasCtx.fillText(text, x, y);
        return;
      }
      const chars = [...String(text || '')];
      if (!chars.length) return;
      const totalWidth = chars.reduce((sum, ch) => sum + canvasCtx.measureText(ch).width, 0) + letterSpacing * Math.max(0, chars.length - 1);
      let cursorX = align === 'right' ? x - totalWidth : align === 'center' ? x - totalWidth / 2 : x;
      canvasCtx.textAlign = 'left';
      chars.forEach((ch) => {
        canvasCtx.fillText(ch, cursorX, y);
        cursorX += canvasCtx.measureText(ch).width + letterSpacing;
      });
      canvasCtx.textAlign = align;
    },
    drawTextCaret(canvasCtx, key, layer) {
      if (flag('render.textEngine', 'baselineModel') === 'legacy') return this.drawTextCaretLegacy(canvasCtx, key, layer);
      if (!AppState.caretVisible) return;
      const text = AppState.editingLayerKey === key ? (AppState.editingText || '') : (layer.text || '');
      canvasCtx.save();
      canvasCtx.font = this.font(layer);
      const bottomAligned = this.isTextBottomAligned(layer);
      const sourceBaselineAligned = this.isTextSourceBaselineAligned(layer);
      canvasCtx.textBaseline = (bottomAligned || sourceBaselineAligned) ? 'alphabetic' : 'top';
      const lines    = String(text).split('\n');
      const fontSize = layer.fontSizePx || 24;
      const lh       = layer.lineHeight || fontSize * 1.05;
      const lastLine = lines[lines.length - 1] || '';
      const lineIdx  = lines.length - 1;
      const lastW    = canvasCtx.measureText(lastLine).width;
      let caretX;
      if (layer.align === 'left')        caretX = layer.x + lastW;
      else if (layer.align === 'right')  caretX = layer.x + layer.width;
      else                               caretX = layer.x + layer.width / 2
                                                - canvasCtx.measureText(lines[lineIdx] || '').width / 2
                                                + lastW;
      const startY = layer.y + Math.max(0, (layer.height - lines.length * lh) / 2);
      const metrics = canvasCtx.measureText(lastLine || '國');
      const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
        ? metrics.actualBoundingBoxDescent
        : fontSize * 0.2;
      const bottomPadding = Math.max(0, Number(layer.textBottomPaddingPx || 0));
      const caretY = bottomAligned
        ? layer.y + layer.height - bottomPadding - descent
        : (sourceBaselineAligned
          ? this.getSourceTextBaseline(canvasCtx, layer, layer.y) + lineIdx * lh
          : startY + lineIdx * lh);
      canvasCtx.strokeStyle = layer.color || '#ffffff';
      canvasCtx.lineWidth   = Math.max(1.5, fontSize * 0.06);
      canvasCtx.lineCap     = 'round';
      canvasCtx.beginPath();
      if (bottomAligned || sourceBaselineAligned) {
        canvasCtx.moveTo(caretX, caretY - fontSize);
        canvasCtx.lineTo(caretX, caretY + descent);
      } else {
        canvasCtx.moveTo(caretX, caretY);
        canvasCtx.lineTo(caretX, caretY + fontSize * 1.1);
      }
      canvasCtx.stroke();
      canvasCtx.restore();
    },
    drawImageShadow(canvasCtx, img, box, shadow = {}) {
      if (!img || shadow?.enabled !== true) return;
      const opacity = Math.max(0, Math.min(1, Number(shadow.opacity ?? 0.51)));
      const angle = Number(shadow.angleDeg ?? 117) * Math.PI / 180;
      const distance = Number(shadow.distancePx ?? 2);
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;
      const blur = Math.max(0, Number(shadow.blurPx ?? 6));
      const width = Math.max(1, Math.ceil(box.width));
      const height = Math.max(1, Math.ceil(box.height));
      const pad = Math.ceil(blur * 3 + Math.abs(distance) + 2);
      const off = document.createElement('canvas');
      off.width = width + pad * 2;
      off.height = height + pad * 2;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(img, pad, pad, width, height);
      offCtx.globalCompositeOperation = 'source-in';
      offCtx.fillStyle = shadow.color || '#f26602';
      offCtx.fillRect(0, 0, off.width, off.height);

      canvasCtx.save();
      canvasCtx.globalAlpha = opacity;
      canvasCtx.globalCompositeOperation = shadow.blendMode === 'multiply' ? 'multiply' : 'source-over';
      canvasCtx.filter = blur ? `blur(${blur}px)` : 'none';
      canvasCtx.drawImage(off, -box.width / 2 - pad + offsetX, -box.height / 2 - pad + offsetY, off.width, off.height);
      canvasCtx.restore();
    },
    findLayerByCanonicalName(template, requestedName) {
      const wanted = normalizeLayerIdentifier(requestedName);
      return Object.entries(template?.layers || {}).find(([candidateKey, candidateLayer]) =>
        normalizeLayerIdentifier(candidateLayer?.__canonicalName || candidateLayer?.psdName || candidateLayer?.name || candidateKey) === wanted
      ) || null;
    },
    // （AMS）通用遮罩：支援 effects.maskBy / effects.clipBy；render.maskScope＝all 時由 _drawLayers 對所有型別套用。
    // （跨夜）以下兩個遮罩模式皆由規則檔透過圖層欄位（__maskEdges／__shadowMaskLayerName）啟用，未設定時不影響任何工具。
    // 只裁「下緣」的遮罩區域：
    //   - 左、右、上三個方向完全不裁，素材可自由超出遮罩圖層
    //   - 下緣以遮罩圖層的底邊為界，超出的部分不繪製
    //   - 在遮罩圖層自己的 x 範圍內，底邊沿用該圖層的左下／右下圓角；
    //     x 範圍外則維持底邊直線（圓角只存在於形狀本身的範圍內）
    // 圓角為 0（一般矩形）時會自然退化成一條直線，等同單純的水平裁切。
    clipToBottomEdge(canvasCtx, maskKey, maskLayer) {
      const box = Geometry.getLayerBox(maskKey, maskLayer);
      const bottom = Number(box.y) + Number(box.height);
      const left = Number(box.x);
      const right = left + Number(box.width);
      if (!Number.isFinite(bottom) || !Number.isFinite(left) || !Number.isFinite(right)) return false;

      const shape = maskLayer?.shape || {};
      const radii = maskLayer?.cornerRadii || shape.cornerRadii || null;
      const uniform = Number(shape.cornerRadius || 0) || 0;
      const limit = Math.max(0, Math.min(Number(box.width) / 2, Number(box.height) / 2));
      const clampRadius = (value) => {
        const radius = Number(value);
        if (!Number.isFinite(radius) || radius <= 0) return 0;
        return Math.min(radius, limit);
      };
      const bottomLeft = clampRadius(radii ? radii.bottomLeft : uniform);
      const bottomRight = clampRadius(radii ? radii.bottomRight : uniform);

      // BIG 只要遠大於任何公版尺寸即可（最大公版為 1080x1920）。
      const BIG = 100000;
      canvasCtx.beginPath();
      canvasCtx.moveTo(-BIG, -BIG);
      canvasCtx.lineTo(BIG, -BIG);
      canvasCtx.lineTo(BIG, bottom);
      canvasCtx.lineTo(right, bottom);
      if (bottomRight > 0) {
        canvasCtx.lineTo(right, bottom - bottomRight);
        canvasCtx.quadraticCurveTo(right, bottom, right - bottomRight, bottom);
      }
      if (bottomLeft > 0) {
        canvasCtx.lineTo(left + bottomLeft, bottom);
        canvasCtx.quadraticCurveTo(left, bottom, left, bottom - bottomLeft);
        canvasCtx.lineTo(left, bottom);
      } else {
        canvasCtx.lineTo(left, bottom);
      }
      canvasCtx.lineTo(-BIG, bottom);
      canvasCtx.closePath();
      canvasCtx.clip();
      return true;
    },
    // 陰影專屬遮罩：把陰影裁在指定圖層的**完整形狀**內（含圓角），
    // 與圖片本身的 __maskEdges 遮罩獨立。
    // 用途：主持人圖片本身允許超出 P_範圍 的左/右/上（只裁下緣），
    // 但陰影（角度 57°、距離 15px、模糊 40px）不允許溢出 P_範圍。
    // 圖層名稱由規則檔透過 layer.__shadowMaskLayerName 指定，引擎不寫死任何名稱。
    applyShadowMask(canvasCtx, layer, template) {
      const maskName = layer?.__shadowMaskLayerName;
      if (!maskName || !template) return false;
      const maskEntry = this.findLayerByCanonicalName(template, maskName);
      if (!maskEntry) return false;
      const maskLayer = maskEntry[1];
      if (window.ShapeRenderer?.clipJsonShape) {
        return window.ShapeRenderer.clipJsonShape(canvasCtx, maskLayer, { useLayerBounds: true });
      }
      const box = Geometry.getLayerBox(maskEntry[0], maskLayer);
      canvasCtx.beginPath();
      canvasCtx.rect(box.x, box.y, box.width, box.height);
      canvasCtx.clip();
      return true;
    },
    applyLayerMask(canvasCtx, layer, template) {
      const effects = flag('render.maskScope', 'image') === 'all' ? (layer?.effects || {}) : {};
      const maskName = layer?.__maskLayerName || layer?.maskLayerName || effects.maskBy || effects.clipBy;
      if (!maskName || !template) return false;
      const maskEntry = this.findLayerByCanonicalName(template, maskName);
      if (!maskEntry) return false;
      const maskLayer = maskEntry[1];
      // （跨夜）__maskEdges = 'bottom'：只裁下緣；未指定時維持「整個遮罩形狀」裁切。
      if (String(layer.__maskEdges || '').toLowerCase() === 'bottom') {
        return this.clipToBottomEdge(canvasCtx, maskEntry[0], maskLayer);
      }
      if (window.ShapeRenderer?.clipJsonShape) {
        return window.ShapeRenderer.clipJsonShape(canvasCtx, maskLayer, { useLayerBounds: true });
      }
      const box = Geometry.getLayerBox(maskEntry[0], maskLayer);
      canvasCtx.beginPath();
      canvasCtx.rect(box.x, box.y, box.width, box.height);
      canvasCtx.clip();
      return true;
    },
    drawImage(canvasCtx, key, layer, images = AppState.images, options = {}) {
      const box = Geometry.getRenderedImageBox(key, layer, images);
      const img = images[key];
      const ready = Geometry.isImageReady(key, layer, images);
      const template = options.template || AppState.template;
      const rotationRad = ((layer.rotation || 0) * Math.PI) / 180;
      canvasCtx.save();
      if (flag('render.maskScope', 'image') !== 'all') this.applyLayerMask(canvasCtx, layer, template);
      // （跨夜）陰影與圖片分開繪製（各自 save/restore）：陰影可另外套 __shadowMaskLayerName 的完整形狀裁切。
      // 遮罩必須在 translate/rotate 之前套用，裁切區才是公版座標。drawImageShadow 本身 save/restore，拆開後結果不變。
      if (img && ready) {
        canvasCtx.save();
        this.applyShadowMask(canvasCtx, layer, template);
        canvasCtx.translate(box.centerX, box.centerY);
        canvasCtx.rotate(rotationRad);
        const logoShadowNames = new Set([
          '蝦皮購物_LOGO_白',
          '直式_18號會員日_LOGO_白',
          '蝦皮購物18號會員日_LOGO_白',
          '18號會員日_LOGO_白',
        ]);
        const labels = [key, layer?.psdName, String(layer?.assetFilename || '').replace(/\.[^.]+$/, '')];
        // 整合版：render.autoLogoShadow=false（network/AMS/跨夜）時陰影一律由 layer.dropShadow 提供。
        const automaticLogoShadow = flag('render.autoLogoShadow', true) && labels.some((name) => logoShadowNames.has(String(name || '').trim()))
          ? { enabled: true, color: '#f26602', opacity: 0.51, blendMode: 'multiply', angleDeg: 117, distancePx: 2, blurPx: 6 }
          : null;
        this.drawImageShadow(canvasCtx, img, box, layer.dropShadow || automaticLogoShadow);
        canvasCtx.restore();
      }

      canvasCtx.translate(box.centerX, box.centerY);
      canvasCtx.rotate(rotationRad);
      if (img && ready) {
        canvasCtx.drawImage(img, -box.width / 2, -box.height / 2, box.width, box.height);
      } else if (layer.__uploadSlot === true && !layer.assetFilename && options.showUploadPrompt) {
        // （OM_w2 / LineOA）上傳槽尚無素材時畫「+上傳圖片」提示（僅預覽）。
        canvasCtx.fillStyle = layer.__uploadPromptColor || '#ffffff';
        canvasCtx.font = `600 ${Math.max(14, Number(layer.__uploadPromptFontSize || 30))}px -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif`;
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'middle';
        canvasCtx.fillText(layer.__uploadPrompt || '+上傳圖片', 0, 0, Math.max(20, box.width - 24));
      } else if (options.showMissing && ((layer.__assetCleared === true && !layer.assetFilename) || (layer.__assetMissing && ManualAssetUpload.isUploadSlot(key, layer, options.template || AppState.template)))) {
        // （network）規則認定的上傳槽，或（整合版 5.3）使用者手動清除的圖層：畫「＋ 上傳圖片」虛線槽（僅預覽）。
        ManualAssetUpload.drawSlot(canvasCtx, { ...box, rotation: layer.rotation }, key === AppState.manualUploadHoverKey, options.template || AppState.template);
      } else if (layer.__assetMissing && options.showMissing) {
        canvasCtx.fillStyle = 'rgba(220, 38, 38, .22)';
        canvasCtx.fillRect(-box.width / 2, -box.height / 2, box.width, box.height);
        canvasCtx.strokeStyle = 'rgba(220, 38, 38, .95)';
        canvasCtx.lineWidth = 2;
        canvasCtx.setLineDash([7, 5]);
        canvasCtx.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
        canvasCtx.setLineDash([]);
        canvasCtx.fillStyle = '#b91c1c';
        canvasCtx.font = `${Math.max(12, Math.min(24, box.width / 8))}px sans-serif`;
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'middle';
        canvasCtx.fillText('素材缺失', 0, 0, Math.max(20, box.width - 12));
      } else if (!layer.assetFilename && options.showMissing) {
        canvasCtx.strokeStyle = 'rgba(255,255,255,.85)';
        canvasCtx.setLineDash([6, 4]);
        canvasCtx.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
        canvasCtx.fillStyle = '#ffffff';
        canvasCtx.font = '14px sans-serif';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText(layer.psdName || key, 0, 4);
      }
      // 有指定素材檔名、但圖片還沒真正 decode 完成時，這裡刻意先不畫任何東西，
      // 而不是用容器滿版寬高畫出未依照片比例縮放的暫時畫面。
      canvasCtx.restore();
    },
    drawGrid(canvasCtx) {
      const t = AppState.template;
      canvasCtx.save();
      canvasCtx.strokeStyle = 'rgba(37,99,235,.18)';
      canvasCtx.lineWidth = 1;
      for (let x = 0; x < t.canvas.width; x += 24) { canvasCtx.beginPath(); canvasCtx.moveTo(x, 0); canvasCtx.lineTo(x, t.canvas.height); canvasCtx.stroke(); }
      for (let y = 0; y < t.canvas.height; y += 24) { canvasCtx.beginPath(); canvasCtx.moveTo(0, y); canvasCtx.lineTo(t.canvas.width, y); canvasCtx.stroke(); }
      canvasCtx.restore();
    },
    drawSelection(canvasCtx) {
      const key = activeLayerKey(); const layer = activeLayer();
      if (!key || !layer) return;
      const box = Geometry.getSelectionBox(key, layer);
      const rotationDeg = Number(layer.rotation || 0);
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

      // 外框：用 canvas transform 旋轉整個矩形，畫出來的外框會跟著素材角度一起轉。
      canvasCtx.save();
      canvasCtx.translate(center.x, center.y);
      canvasCtx.rotate((rotationDeg * Math.PI) / 180);
      canvasCtx.strokeStyle = '#3b82f6';
      canvasCtx.lineWidth = 2;
      canvasCtx.setLineDash([6, 4]);
      canvasCtx.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
      canvasCtx.setLineDash([]);
      canvasCtx.restore();

      // 控制點/旋轉握把：座標已經是旋轉後的實際畫面位置（見 Geometry.handles），直接畫在該位置即可。
      for (const h of Geometry.handles(box, rotationDeg)) {
        if (h.isRotateHandle) {
          // 旋轉握把畫成一個小圓點，並用一條細線連到框的右上角，視覺上明確跟「縮放用的方形握把」區分。
          const unrotatedCorner = { x: flag('ui.rotateHandleAnchor', 'topRight') === 'topCenter' ? box.x + box.width / 2 : box.x + box.width, y: box.y };
          const corner = Geometry.rotatePointAround(unrotatedCorner, center, rotationDeg);
          canvasCtx.save();
          canvasCtx.strokeStyle = '#3b82f6';
          canvasCtx.lineWidth = 1;
          canvasCtx.beginPath();
          canvasCtx.moveTo(corner.x, corner.y);
          canvasCtx.lineTo(h.x, h.y);
          canvasCtx.stroke();
          canvasCtx.beginPath();
          canvasCtx.arc(h.x, h.y, h.size / 2, 0, Math.PI * 2);
          canvasCtx.fillStyle = '#ffffff';
          canvasCtx.fill();
          canvasCtx.strokeStyle = '#3b82f6';
          canvasCtx.stroke();
          canvasCtx.restore();
          continue;
        }
        canvasCtx.beginPath();
        this.roundRect(canvasCtx, h.x - h.size / 2, h.y - h.size / 2, h.size, h.size, 3);
        canvasCtx.fillStyle = '#ffffff'; canvasCtx.fill();
        canvasCtx.strokeStyle = '#3b82f6'; canvasCtx.stroke();
      }
    },
  };
  // ── Renderer：A 系實作（正式BN V0.8 為底）──
  const Renderer_A = {
    computeGeneratedLayer(key, template = AppState.template) {
      if (key !== 'subtitle_frame') return null;
      const t = template;
      // V1.1：副標題藍色膠囊改為「預設隱藏」，只有該公版JSON明確寫 hidden:false 才會繪製。
      // 舊行為是「預設顯示，明確寫 hidden:true 才隱藏」，這裡整個反過來。
      if (t?.generatedLayers?.subtitle_frame?.hidden !== false) return null;
      const title = t.layers.title;
      const subtitle = t.layers.subtitle;
      const legal = t.layers.legal;
      if (!title || !subtitle) return null;

      const titleTextWidth = CapsuleRuleEngine.measureTextWidth(title, ctx);
      const subtitleTextWidth = CapsuleRuleEngine.measureTextWidth(subtitle, ctx);

      return CapsuleRuleEngine.buildLayer({
        template: t,
        title,
        subtitle,
        legal,
        titleTextWidth,
        subtitleTextWidth,
      });
    },
    getRuleShape(key, layer, template = AppState.template) {
      const rules = getRuleSection(CapsuleRuleEngine.getTemplateFamily(template), 'shapeLayers');
      const names = [key, layer?.psdName].filter(Boolean);
      return names.map((name) => rules[name]).find(Boolean) || null;
    },
    drawRuleShape(canvasCtx, key, layer, template = AppState.template) {
      const rule = this.getRuleShape(key, layer, template);
      return !!(rule && window.ShapeRenderer?.render?.(canvasCtx, layer, rule));
    },
    getTextRule(key, layer, template = AppState.template) {
      const rules = getRuleSection(CapsuleRuleEngine.getTemplateFamily(template), 'textRules');
      const names = [key, layer?.psdName].filter(Boolean);
      return names.map((name) => rules[name]).find(Boolean) || null;
    },
    _drawLayers(canvasCtx, t, ui = false, images = AppState.images, renderOptions = {}) {
      const placementGuides = [];
      for (const key of t.renderOrder || []) {
        if (key === 'subtitle_frame') {
          const generatedLayer = this.computeGeneratedLayer(key, t);
          if (generatedLayer && generatedLayer.hidden !== true) this.drawShape(canvasCtx, generatedLayer);
          continue;
        }
        const layer = t.layers[key];
        if (!layer || layer.hidden) continue;
        if (window.SmartAssetManager?.isPlacementGuide?.(key, layer)) {
          // 參考框永遠最後畫，避免被後續 LOGO / 商品圖蓋住。主畫布與批次預覽顯示，正式匯出不畫。
          placementGuides.push([key, layer]);
          continue;
        }
        if (this.drawRuleShape(canvasCtx, key, layer, t)) continue;
        if (layer.type === 'shape') this.drawShape(canvasCtx, layer);
        if (layer.type === 'image') this.drawImage(canvasCtx, key, layer, images, { template: t, showMissing: ui || renderOptions.showMissing === true });
        if (layer.type === 'text') { this.drawText(canvasCtx, key, layer, t); if (ui && AppState.editingLayerKey === key) this.drawTextCaret(canvasCtx, key, layer); }
      }
      if (ui || renderOptions.showGuides === true) {
        placementGuides.forEach(([key, layer]) => this.drawPlacementGuide(canvasCtx, key, layer));
      }
    },
    // P_範圍 的參考線畫法：虛線外框 + 小標籤，跟一般素材的實線外觀明顯不同，提醒這只是輔助
    // 排版用的參考框，不是實際會出現在成品裡的內容。只會在編輯畫布（ui=true）被呼叫到。
    drawPlacementGuide(canvasCtx, key, layer) {
      const box = Geometry.getLayerBox(key, layer);
      canvasCtx.save();
      canvasCtx.setLineDash([6, 4]);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgba(0, 102, 255, .5)';
      canvasCtx.strokeRect(box.x + .5, box.y + .5, box.width, box.height);
      canvasCtx.setLineDash([]);
      canvasCtx.font = '11px -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif';
      canvasCtx.fillStyle = 'rgba(0, 102, 255, .75)';
      const labelY = box.y - 6 > 12 ? box.y - 6 : box.y + 14;
      canvasCtx.fillText('P_範圍（僅供參考，不會匯出）', box.x + 4, labelY);
      canvasCtx.restore();
    },
    render(options = { ui: true }, canvasCtx = ctx) {
      const t = AppState.template;
      if (!t) return;
      DOM.canvas.width = t.canvas.width;
      DOM.canvas.height = t.canvas.height;
      // （回饋：文字保留＋縮圖即時更新）主畫布重繪＝使用者可能剛改了東西：記下手動文字變化並排程刷新縮圖。
      if (options.ui && ManualTextOverrides.settle(t)) window.BatchManager?.scheduleThumbRefresh?.(t);
      // （自 18節 移植）手動替換圖層的最新外框記回 override（見 ManualAssetUpload.settleOverrideBoxes）。
      if (options.ui) ManualAssetUpload.settleOverrideBoxes(t);
      // Render 必須唯讀：幾何同步 / Layout 只能在明確初始化或編輯 Transaction 執行。
      canvasCtx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      this._drawLayers(canvasCtx, t, options.ui, AppState.images);
      if (options.ui && $('gridToggle')?.checked) this.drawGrid(canvasCtx);
      if (options.ui) this.drawSelection(canvasCtx);
      if (options.ui) SpecOverlayManager.draw(canvasCtx);
      Inspector.syncStatus();
      PreviewZoom.apply();
    },
    // template/images 都可以明確傳入——不指定的話維持原本行為（畫目前使用中的版位）。
    // 這是刻意設計成「純函式」的畫法：只要傳入不同的 template/images，就能安全地畫出
    // 「目前並非使用中」的其他版位縮圖，完全不需要（也不會）去動 AppState.template/activeIndex，
    // 不會跟使用者當下在主畫布上的操作互相干擾。
    renderSceneTo(canvasCtx, template = AppState.template, images = AppState.images, renderOptions = {}) {
      const t = template;
      // Render 必須唯讀：幾何同步 / Layout 只能在明確初始化或編輯 Transaction 執行。
      canvasCtx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      this._drawLayers(canvasCtx, t, false, images, renderOptions);
    },
    roundRect(canvasCtx, x, y, width, height, radius = 0) {
      const r = Math.max(0, Math.min(radius, width / 2, height / 2));
      canvasCtx.beginPath();
      canvasCtx.moveTo(x + r, y);
      canvasCtx.arcTo(x + width, y, x + width, y + height, r);
      canvasCtx.arcTo(x + width, y + height, x, y + height, r);
      canvasCtx.arcTo(x, y + height, x, y, r);
      canvasCtx.arcTo(x, y, x + width, y, r);
      canvasCtx.closePath();
    },
    drawShape(canvasCtx, layer) {
      if (!layer) return;

      const shapeKind = String(layer.shape?.kind || layer.shape?.geometry?.kind || '').toLowerCase();
      const vectorRuleKey = [layer.psdName, layer.name]
        .map((name) => normStr(name))
        .find((name) => GLOBAL_VECTOR_RULES[name]);
      const vectorRule = vectorRuleKey ? GLOBAL_VECTOR_RULES[vectorRuleKey] : null;
      const isRightArrowTriangle = (vectorRule?.renderer === 'triangle' && vectorRule?.direction === 'right')
        || shapeKind === 'righttriangle'
        || shapeKind === 'ctaarrow'
        || shapeKind === 'ctaarrowright';

      // 全域 CTA 箭頭：固定用圖層外框重畫成「向右」三角形，避免 PSD 匯出的 polygon/vectorPath
      // 方向資料不完整時被 ShapeRenderer 解讀成向上或旋轉 90 度。
      if (isRightArrowTriangle) {
        const x = Number(layer.x || 0);
        const y = Number(layer.y || 0);
        const width = Number(layer.width || 0);
        const height = Number(layer.height || 0);
        const corners = [
          { x, y },
          { x: x + width, y: y + height / 2 },
          { x, y: y + height },
        ];
        canvasCtx.save();
        canvasCtx.fillStyle = layer.fill || layer.shape?.fill || '#ffffff';
        canvasCtx.beginPath();
        canvasCtx.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach((point) => canvasCtx.lineTo(point.x, point.y));
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.restore();
        return;
      }

      // 一般 triangle 仍優先沿用 JSON geometry.corners；沒有 corners 時才用向右三角形 fallback。
      if (shapeKind === 'triangle') {
        const corners = Array.isArray(layer.shape?.geometry?.corners) && layer.shape.geometry.corners.length >= 3
          ? layer.shape.geometry.corners
          : [
              { x: Number(layer.x || 0), y: Number(layer.y || 0) },
              { x: Number(layer.x || 0) + Number(layer.width || 0), y: Number(layer.y || 0) + Number(layer.height || 0) / 2 },
              { x: Number(layer.x || 0), y: Number(layer.y || 0) + Number(layer.height || 0) },
            ];
        canvasCtx.save();
        canvasCtx.fillStyle = layer.fill || layer.shape?.fill || '#ffffff';
        canvasCtx.beginPath();
        canvasCtx.moveTo(Number(corners[0].x || 0), Number(corners[0].y || 0));
        corners.slice(1).forEach((point) => canvasCtx.lineTo(Number(point.x || 0), Number(point.y || 0)));
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.restore();
        return;
      }

      // V3.29.2：PSD 公版小工具 V2.2 / V2.3 匯出的 JSON shape
      // 非 CTA 箭頭的 shape 仍交給 ShapeRenderer 依 shape.kind 繪製。
      if (
        layer.type === 'shape' &&
        layer.shape &&
        window.ShapeRenderer?.renderJsonShape?.(canvasCtx, layer)
      ) {
        return;
      }

      canvasCtx.save();
      canvasCtx.fillStyle = layer.fill || '#ffffff';
      const fallbackRadius = Number(layer.radius ?? layer.shape?.cornerRadius ?? layer.shape?.geometry?.cornerRadius ?? 0) || 0;
      this.roundRect(canvasCtx, layer.x, layer.y, layer.width, layer.height, fallbackRadius);
      canvasCtx.fill();
      canvasCtx.restore();
    },
    font(layer) {
      const style  = layer.fontStyle === 'italic' ? 'italic ' : '';
      const weight = layer.fontWeight || 400;
      const size   = layer.fontSizePx || 24;
      const family = layer.fontFamily
        ? `"${layer.fontFamily}","ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif`
        : '"ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif';
      return `${style}${weight} ${size}px ${family}`;
    },
    drawText(canvasCtx, key, layer, template = AppState.template) {
      const renderLayer = (AppState.editingLayerKey === key && canvasCtx === ctx)
        ? { ...layer, text: AppState.editingText }
        : layer;
      const drawableLayer = { ...renderLayer };
      const textRule = this.getTextRule?.(key, drawableLayer, template) || null;
      if (Number.isFinite(Number(textRule?.lineHeightPx))) {
        drawableLayer.lineHeight = Number(textRule.lineHeightPx);
      }
      const rotation = Number(drawableLayer.rotation || 0);

      canvasCtx.save();
      if (rotation) {
        const cx = (drawableLayer.x || 0) + (drawableLayer.width || 0) / 2;
        const cy = (drawableLayer.y || 0) + (drawableLayer.height || 0) / 2;
        canvasCtx.translate(cx, cy);
        canvasCtx.rotate((rotation * Math.PI) / 180);
        drawableLayer.x = -(drawableLayer.width || 0) / 2;
        drawableLayer.y = -(drawableLayer.height || 0) / 2;
      }

      canvasCtx.fillStyle = drawableLayer.color || '#000000';
      canvasCtx.font = this.font(drawableLayer);
      canvasCtx.textAlign = drawableLayer.align || 'center';
      canvasCtx.textBaseline = 'top';
      // 貼近 Photoshop：啟用字型內建 kerning 與清晰度優化（不支援的瀏覽器會靜默略過）
      canvasCtx.fontKerning = 'normal';
      canvasCtx.textRendering = 'optimizeLegibility';
      const textValue = String(drawableLayer.text || '').replace(/_x000d_/gi, '\n').replace(/\r\n/g, '\n').replace(/[\r\u0003\u2028\u2029]/g, '\n');
      const lines = textValue.split('\n');
      const fontSize = drawableLayer.fontSizePx || 24;
      const lineHeight = drawableLayer.lineHeight || fontSize * 1.05;
      const letterSpacing = Number(drawableLayer.letterSpacing || 0);
      const bottomAligned = this.isTextBottomAligned(drawableLayer);
      const sourceBaselineAligned = this.isTextSourceBaselineAligned(drawableLayer);
      const bottomPadding = Math.max(0, Number(drawableLayer.textBottomPaddingPx || 0));
      const defaultStartY = drawableLayer.y + Math.max(0, (drawableLayer.height - lines.length * lineHeight) / 2);
      const x = drawableLayer.align === 'left'
        ? drawableLayer.x
        : drawableLayer.align === 'right'
          ? drawableLayer.x + drawableLayer.width
          : drawableLayer.x + drawableLayer.width / 2;

      // 先建立每行的分段資料，確保一般文字與大小字共用同一套垂直定位。
      let charOffset = 0;
      const lineEntries = lines.map((line) => {
        const segments = this.getTextStyleSegments(drawableLayer, line, charOffset);
        const hasRangeTypography = segments.some((segment) =>
          (segment?.color && segment.color !== (drawableLayer.color || '#000000'))
          || Number(segment?.fontSizePx || 0) !== Number(drawableLayer.fontSizePx || 0)
          || String(segment?.fontFamily || '') !== String(drawableLayer.fontFamily || '')
          || String(segment?.fontWeight || '') !== String(drawableLayer.fontWeight || '')
          || Boolean(segment?.italic) !== Boolean(drawableLayer.italic)
          || Number(segment?.letterSpacing || 0) !== Number(drawableLayer.letterSpacing || 0)
          || Number(segment?.baselineOffset || 0) !== 0
        );
        charOffset += String(line || '').length + 1;
        return { line, segments, hasRangeTypography };
      });

      // bottom 模式以最後一行「實際字形下緣」貼齊文字框底部；前面的行依 lineHeight 向上排列。
      // 不使用 fontSize 或 lineHeight 猜測下緣，避免中文字、數字與符號的字形高度不同而漂移。
      const lastLineMetrics = bottomAligned
        ? this.getStyledLineInkMetrics(canvasCtx, lineEntries[lineEntries.length - 1]?.segments || [], drawableLayer)
        : null;
      const lastBaselineY = bottomAligned
        ? drawableLayer.y + drawableLayer.height - bottomPadding - Number(lastLineMetrics?.descent || 0)
        : null;
      const sourceFirstBaselineY = sourceBaselineAligned
        ? this.getSourceTextBaseline(canvasCtx, drawableLayer, drawableLayer.y)
        : null;
      const lineY = (index) => {
        if (bottomAligned) return lastBaselineY - (lineEntries.length - 1 - index) * lineHeight;
        if (sourceBaselineAligned) return sourceFirstBaselineY + index * lineHeight;
        return defaultStartY + index * lineHeight;
      };

      lineEntries.forEach(({ line, segments, hasRangeTypography }, i) => {
        const drawY = lineY(i);
        if (segments.length > 1 || hasRangeTypography) {
          this.drawStyledTextLine(
            canvasCtx,
            segments,
            x,
            drawY,
            drawableLayer.align || 'center',
            letterSpacing,
            drawableLayer.color || '#000000',
            drawableLayer,
            (bottomAligned || sourceBaselineAligned) ? 'baseline' : 'auto'
          );
        } else {
          canvasCtx.font = this.font(drawableLayer);
          canvasCtx.textBaseline = (bottomAligned || sourceBaselineAligned) ? 'alphabetic' : 'top';
          this.drawTextLine(canvasCtx, line, x, drawY, drawableLayer.align || 'center', letterSpacing);
        }
      });

      // 底線
      if (drawableLayer.textDecoration?.includes('underline')) {
        canvasCtx.strokeStyle = drawableLayer.color || '#000000';
        canvasCtx.lineWidth = Math.max(1, fontSize * 0.06);
        lineEntries.forEach(({ line, segments }, i) => {
          canvasCtx.font = this.font(drawableLayer);
          const w = canvasCtx.measureText(line).width;
          const x0 = drawableLayer.align === 'right'  ? x - w
                   : drawableLayer.align === 'center' ? x - w / 2
                   : x;
          const metrics = this.getStyledLineInkMetrics(canvasCtx, segments, drawableLayer);
          const y0 = (bottomAligned || sourceBaselineAligned)
            ? lineY(i) + Number(metrics.descent || 0) + 2
            : lineY(i) + fontSize + 2;
          canvasCtx.beginPath(); canvasCtx.moveTo(x0, y0); canvasCtx.lineTo(x0 + w, y0); canvasCtx.stroke();
        });
      }

      canvasCtx.restore();
    },
    getTextStyleSegments(layer, line, lineStartOffset = 0) {
      const text = String(line || '');
      if (!text) return [{ text: '', color: layer?.color || '#000000' }];

      const ranges = Array.isArray(layer?.textStyleRanges)
        ? layer.textStyleRanges
            .map((range) => {
              const style = range?.style && typeof range.style === 'object' ? range.style : {};
              return {
                from: Math.max(0, Number(range?.from ?? 0)),
                to: Math.max(0, Number(range?.to ?? 0)),
                color: range?.color || range?.fill || style.color || style.fill || layer?.color || '#000000',
                fontSizePx: Number(range?.fontSizePx ?? style.fontSizePx ?? layer?.fontSizePx),
                fontFamily: range?.fontFamily || style.fontFamily || layer?.fontFamily || '',
                fontWeight: range?.fontWeight || style.fontWeight || layer?.fontWeight || 400,
                fontStyle: range?.fontStyle || range?.fontStyleName || style.fontStyle || style.fontStyleName || layer?.fontStyle || '',
                italic: Boolean(range?.italic ?? style.italic ?? layer?.italic),
                lineHeight: Number(range?.lineHeight ?? style.lineHeight ?? layer?.lineHeight),
                letterSpacing: Number(range?.letterSpacing ?? style.letterSpacing ?? layer?.letterSpacing ?? 0),
                // Reserved for future PSD exports. Auto-centering works even when this value is absent.
                baselineOffset: Number(range?.baselineOffset ?? range?.baselineShift ?? style.baselineOffset ?? style.baselineShift ?? 0),
              };
            })
            .filter((range) => range.to > range.from)
            .sort((a, b) => a.from - b.from)
        : [];

      if (!ranges.length) return [{
        text,
        color: layer?.color || '#000000',
        fontSizePx: Number(layer?.fontSizePx || 24),
        fontFamily: layer?.fontFamily || '',
        fontWeight: layer?.fontWeight || 400,
        fontStyle: layer?.fontStyle || '',
        italic: Boolean(layer?.italic),
        lineHeight: Number(layer?.lineHeight || 0),
        letterSpacing: Number(layer?.letterSpacing || 0),
        baselineOffset: 0,
      }];

      const lineEndOffset = lineStartOffset + text.length;
      const boundaries = new Set([0, text.length]);
      ranges.forEach((range) => {
        const from = Math.max(lineStartOffset, range.from) - lineStartOffset;
        const to = Math.min(lineEndOffset, range.to) - lineStartOffset;
        if (from > 0 && from < text.length) boundaries.add(from);
        if (to > 0 && to < text.length) boundaries.add(to);
      });

      const points = [...boundaries].sort((a, b) => a - b);
      const segments = [];
      for (let i = 0; i < points.length - 1; i += 1) {
        const from = points[i];
        const to = points[i + 1];
        if (to <= from) continue;
        const absoluteIndex = lineStartOffset + from;
        const matchedRange = ranges.find((range) => absoluteIndex >= range.from && absoluteIndex < range.to);
        segments.push({
          text: text.slice(from, to),
          color: matchedRange?.color || layer?.color || '#000000',
          fontSizePx: Number(matchedRange?.fontSizePx || layer?.fontSizePx || 24),
          fontFamily: matchedRange?.fontFamily || layer?.fontFamily || '',
          fontWeight: matchedRange?.fontWeight || layer?.fontWeight || 400,
          fontStyle: matchedRange?.fontStyle || layer?.fontStyle || '',
          italic: Boolean(matchedRange?.italic ?? layer?.italic),
          lineHeight: Number(matchedRange?.lineHeight || layer?.lineHeight || 0),
          letterSpacing: Number.isFinite(Number(matchedRange?.letterSpacing))
            ? Number(matchedRange.letterSpacing)
            : Number(layer?.letterSpacing || 0),
          baselineOffset: Number(matchedRange?.baselineOffset || 0),
        });
      }
      return segments.length ? segments : [{ text, color: layer?.color || '#000000' }];
    },
    fontForTextStyle(layer, style = {}) {
      const fontStyleName = String(style.fontStyle || '').toLowerCase();
      const italic = Boolean(style.italic) || fontStyleName.includes('italic');
      const weight = style.fontWeight || layer?.fontWeight || 400;
      const size = Number(style.fontSizePx || layer?.fontSizePx || 24);
      const familyName = style.fontFamily || layer?.fontFamily || '';
      const family = familyName
        ? `"${familyName}","ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif`
        : '"ShopeeNotoSans Content","Noto Sans TC","Microsoft JhengHei",sans-serif';
      return `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
    },
    getTextInkMetrics(canvasCtx, segment = {}) {
      const text = String(segment.text || '') || '國';
      const metrics = canvasCtx.measureText(text);
      const fontSize = Number(segment.fontSizePx || 24);
      const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
        ? metrics.actualBoundingBoxAscent
        : fontSize * 0.8;
      const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
        ? metrics.actualBoundingBoxDescent
        : fontSize * 0.2;
      return { ascent, descent };
    },
    isTextBottomAligned(layer) {
      const mode = String(layer?.textVerticalAlign || '').trim().toLowerCase();
      return mode === 'bottom' || mode === 'ink-bottom' || mode === 'bottom-ink';
    },
    isTextSourceBaselineAligned(layer) {
      if (TextBaselineModel.isSourceMode(layer)) return true;
      return !!(layer?.textBaselineReference && this.shouldUseOriginalStyledBaseline(layer));
    },
    getSourceTextBaseline(canvasCtx, layer, boxY = 0) {
      const reference = TextBaselineModel.captureLayer(layer, { source: 'runtime' });
      if (!reference || !Number.isFinite(Number(reference.baselineOffsetY))) {
        return this.getOriginalTextBaseline(canvasCtx, layer, layer?.text || '', boxY);
      }

      const sourceFontSize = Math.max(0.01, Number(reference.fontSizePx || layer?.fontSizePx || 24));
      const currentFontSize = Math.max(0.01, Number(layer?.fontSizePx || sourceFontSize));
      const fontScale = currentFontSize / sourceFontSize;
      return Number(boxY || 0) + Number(reference.baselineOffsetY) * fontScale;
    },
    getStyledLineInkMetrics(canvasCtx, segments = [], layer = null) {
      const visibleSegments = segments.filter((segment) => String(segment.text || '').length);
      const fallback = [{
        text: '國',
        fontSizePx: Number(layer?.fontSizePx || 24),
        fontFamily: layer?.fontFamily,
        fontWeight: layer?.fontWeight,
        italic: layer?.italic,
        baselineOffset: 0,
      }];
      const originalFont = canvasCtx.font;
      const result = (visibleSegments.length ? visibleSegments : fallback).reduce((metricsResult, segment) => {
        canvasCtx.font = this.fontForTextStyle(layer, segment);
        const metrics = this.getTextInkMetrics(canvasCtx, segment);
        const offset = Number(segment?.baselineOffset || 0);
        return {
          ascent: Math.max(metricsResult.ascent, Number(metrics.ascent || 0) - offset),
          descent: Math.max(metricsResult.descent, Number(metrics.descent || 0) + offset),
        };
      }, { ascent: 0, descent: 0 });
      canvasCtx.font = originalFont;
      return result;
    },
    measureTextSegments(canvasCtx, segments = [], letterSpacing = 0, layer = null) {
      const visibleSegments = segments.filter((segment) => String(segment.text || '').length);
      const totalChars = visibleSegments.reduce((sum, segment) => sum + [...String(segment.text || '')].length, 0);
      let measuredChars = 0;
      return visibleSegments.reduce((sum, segment) => {
        canvasCtx.font = this.fontForTextStyle(layer, segment);
        const spacing = Number.isFinite(Number(segment.letterSpacing))
          ? Number(segment.letterSpacing)
          : Number(letterSpacing || 0);
        return sum + [...String(segment.text || '')].reduce((width, ch) => {
          measuredChars += 1;
          return width + canvasCtx.measureText(ch).width + (measuredChars < totalChars ? spacing : 0);
        }, 0);
      }, 0);
    },
    shouldUseOriginalStyledBaseline(layer, segments = []) {
      if (layer?.styledTextVerticalAlign === 'original-baseline') return true;
      // 舊旗標全部轉入新版「維持單一字級原始基線」邏輯，避免舊 JSON 上下跳動。
      if (layer?.styledTextVerticalAlign === 'first-segment-baseline'
        || layer?.styledTextVerticalAlign === 'first-segment-center') return true;
      const baseSize = Number(layer?.fontSizePx || 0);
      return Array.isArray(layer?.textStyleRanges)
        && layer.textStyleRanges.some((range) => Math.abs(Number(range?.fontSizePx || baseSize) - baseSize) > 0.01);
    },
    getOriginalTextBaseline(canvasCtx, layer, text, y) {
      const reference = {
        text: String(text || '') || '國',
        fontSizePx: Number(layer?.fontSizePx || 24),
        fontFamily: layer?.fontFamily,
        fontWeight: layer?.fontWeight,
        fontStyle: layer?.fontStyle,
        italic: layer?.italic,
      };
      const originalFont = canvasCtx.font;
      canvasCtx.font = this.fontForTextStyle(layer, reference);
      const metrics = this.getTextInkMetrics(canvasCtx, reference);
      canvasCtx.font = originalFont;
      return Number(y || 0) + Number(metrics.ascent || 0);
    },
    drawStyledTextLine(canvasCtx, segments = [], x, y, align = 'center', letterSpacing = 0, fallbackColor = '#000000', layer = null, positionMode = 'auto') {
      const visibleSegments = segments.filter((segment) => String(segment.text || '').length);
      if (!visibleSegments.length) return;

      const originalAlign = canvasCtx.textAlign;
      const originalFill = canvasCtx.fillStyle;
      const originalFont = canvasCtx.font;
      const originalBaseline = canvasCtx.textBaseline;
      canvasCtx.fontKerning = 'normal';
      canvasCtx.textRendering = 'optimizeLegibility';
      const totalWidth = this.measureTextSegments(canvasCtx, visibleSegments, letterSpacing, layer);
      let cursorX = align === 'right' ? x - totalWidth : align === 'center' ? x - totalWidth / 2 : x;
      canvasCtx.textAlign = 'left';

      const baselineProvided = positionMode === 'baseline';
      const bottomAligned = this.isTextBottomAligned(layer);
      const sourceBaselineAligned = this.isTextSourceBaselineAligned(layer);
      const useOriginalBaseline = !baselineProvided
        && !bottomAligned
        && !sourceBaselineAligned
        && this.shouldUseOriginalStyledBaseline(layer, visibleSegments);
      const baselineY = baselineProvided
        ? Number(y || 0)
        : (bottomAligned
          ? Number(y || 0)
          : (sourceBaselineAligned
            ? this.getSourceTextBaseline(canvasCtx, layer, Number(layer?.y || y || 0))
            : (useOriginalBaseline
              ? this.getOriginalTextBaseline(canvasCtx, layer, visibleSegments.map((segment) => segment.text).join(''), y)
              : null)));
      const alphabeticBaseline = baselineProvided || bottomAligned || sourceBaselineAligned || useOriginalBaseline;
      canvasCtx.textBaseline = alphabeticBaseline ? 'alphabetic' : 'top';

      const totalChars = visibleSegments.reduce((sum, segment) => sum + [...String(segment.text || '')].length, 0);
      let drawnChars = 0;
      visibleSegments.forEach((segment) => {
        canvasCtx.font = this.fontForTextStyle(layer, segment);
        canvasCtx.fillStyle = segment.color || fallbackColor;
        const spacing = Number.isFinite(Number(segment.letterSpacing))
          ? Number(segment.letterSpacing)
          : Number(letterSpacing || 0);
        const drawY = alphabeticBaseline
          ? baselineY + Number(segment.baselineOffset || 0)
          : y + Number(segment.baselineOffset || 0);
        [...String(segment.text || '')].forEach((ch) => {
          canvasCtx.fillText(ch, cursorX, drawY);
          cursorX += canvasCtx.measureText(ch).width;
          drawnChars += 1;
          if (drawnChars < totalChars) cursorX += spacing;
        });
      });

      canvasCtx.fillStyle = originalFill;
      canvasCtx.font = originalFont;
      canvasCtx.textAlign = originalAlign;
      canvasCtx.textBaseline = originalBaseline;
    },
    measureRenderedTextWidth(layer, measureContext = ctx) {
      if (!layer || layer.type !== 'text' || !measureContext) return Math.max(0, Number(layer?.width || 0));
      const textValue = String(layer.text || '').replace(/_x000d_/gi, '\n').replace(/\r\n/g, '\n').replace(/[\r\u0003\u2028\u2029]/g, '\n');
      const lines = textValue.split('\n');
      let charOffset = 0;
      let maxWidth = 0;
      const originalFont = measureContext.font;
      lines.forEach((line) => {
        const segments = this.getTextStyleSegments(layer, line, charOffset);
        const width = this.measureTextSegments(measureContext, segments, Number(layer.letterSpacing || 0), layer);
        maxWidth = Math.max(maxWidth, Number(width || 0));
        charOffset += String(line || '').length + 1;
      });
      measureContext.font = originalFont;
      return Math.ceil(maxWidth);
    },
    // （暖正MS V0.5）量測文字實際墨水邊界，供 Rule hook 使用。
    measureRenderedTextInkBounds(layer, measureContext = ctx) {
      const fallbackLeft = Number(layer?.x || 0);
      const fallbackRight = fallbackLeft + Math.max(0, Number(layer?.width || 0));
      if (!layer || layer.type !== 'text' || !measureContext) {
        return { left: fallbackLeft, right: fallbackRight, width: Math.max(0, fallbackRight - fallbackLeft) };
      }

      const textValue = String(layer.text || '').replace(/_x000d_/gi, '\n').replace(/\r\n/g, '\n').replace(/[\r\u0003\u2028\u2029]/g, '\n');
      const lines = textValue.split('\n');
      const originalFont = measureContext.font;
      const originalAlign = measureContext.textAlign;
      measureContext.textAlign = 'left';

      let charOffset = 0;
      let minLeft = Infinity;
      let maxRight = -Infinity;

      lines.forEach((line) => {
        const segments = this.getTextStyleSegments(layer, line, charOffset);
        const visibleSegments = segments.filter((segment) => String(segment.text || '').length);
        const hasRangeTypography = visibleSegments.some((segment) =>
          (segment?.color && segment.color !== (layer.color || '#000000'))
          || Number(segment?.fontSizePx || 0) !== Number(layer.fontSizePx || 0)
          || String(segment?.fontFamily || '') !== String(layer.fontFamily || '')
          || String(segment?.fontWeight || '') !== String(layer.fontWeight || '')
          || Boolean(segment?.italic) !== Boolean(layer.italic)
          || Number(segment?.letterSpacing || 0) !== Number(layer.letterSpacing || 0)
          || Number(segment?.baselineOffset || 0) !== 0
        );

        let advanceWidth = 0;
        let inkLeft = Infinity;
        let inkRight = -Infinity;

        if (visibleSegments.length > 1 || hasRangeTypography || Number(layer.letterSpacing || 0) !== 0) {
          const totalChars = visibleSegments.reduce((sum, segment) => sum + [...String(segment.text || '')].length, 0);
          let drawnChars = 0;
          let cursorX = 0;
          visibleSegments.forEach((segment) => {
            measureContext.font = this.fontForTextStyle(layer, segment);
            const spacing = Number.isFinite(Number(segment.letterSpacing))
              ? Number(segment.letterSpacing)
              : Number(layer.letterSpacing || 0);
            [...String(segment.text || '')].forEach((ch) => {
              const metrics = measureContext.measureText(ch);
              const glyphLeft = cursorX - Number(metrics.actualBoundingBoxLeft ?? 0);
              const glyphRight = cursorX + Number(metrics.actualBoundingBoxRight ?? metrics.width ?? 0);
              inkLeft = Math.min(inkLeft, glyphLeft);
              inkRight = Math.max(inkRight, glyphRight);
              cursorX += Number(metrics.width || 0);
              drawnChars += 1;
              if (drawnChars < totalChars) cursorX += spacing;
            });
          });
          advanceWidth = cursorX;
        } else {
          const segment = visibleSegments[0] || {
            text: line || '國',
            fontSizePx: Number(layer.fontSizePx || 24),
            fontFamily: layer.fontFamily,
            fontWeight: layer.fontWeight,
            fontStyle: layer.fontStyle,
            italic: layer.italic,
          };
          measureContext.font = this.fontForTextStyle(layer, segment);
          const metrics = measureContext.measureText(String(line || ''));
          advanceWidth = Number(metrics.width || 0);
          inkLeft = -Number(metrics.actualBoundingBoxLeft ?? 0);
          inkRight = Number(metrics.actualBoundingBoxRight ?? advanceWidth);
        }

        if (!Number.isFinite(inkLeft) || !Number.isFinite(inkRight)) {
          inkLeft = 0;
          inkRight = advanceWidth;
        }

        const align = String(layer.align || 'center').toLowerCase();
        const anchorX = align === 'left'
          ? Number(layer.x || 0)
          : align === 'right'
            ? Number(layer.x || 0) + Number(layer.width || 0)
            : Number(layer.x || 0) + Number(layer.width || 0) / 2;
        const startX = align === 'right'
          ? anchorX - advanceWidth
          : align === 'center'
            ? anchorX - advanceWidth / 2
            : anchorX;

        minLeft = Math.min(minLeft, startX + inkLeft);
        maxRight = Math.max(maxRight, startX + inkRight);
        charOffset += String(line || '').length + 1;
      });

      measureContext.font = originalFont;
      measureContext.textAlign = originalAlign;

      if (!Number.isFinite(minLeft) || !Number.isFinite(maxRight)) {
        return { left: fallbackLeft, right: fallbackRight, width: Math.max(0, fallbackRight - fallbackLeft) };
      }
      return {
        left: Math.round(minLeft * 100) / 100,
        right: Math.round(maxRight * 100) / 100,
        width: Math.round(Math.max(0, maxRight - minLeft) * 100) / 100,
      };
    },
    drawTextLine(canvasCtx, text, x, y, align = 'center', letterSpacing = 0) {
      if (!letterSpacing) {
        canvasCtx.fillText(text, x, y);
        return;
      }
      const chars = [...String(text || '')];
      if (!chars.length) return;
      const totalWidth = chars.reduce((sum, ch) => sum + canvasCtx.measureText(ch).width, 0) + letterSpacing * Math.max(0, chars.length - 1);
      let cursorX = align === 'right' ? x - totalWidth : align === 'center' ? x - totalWidth / 2 : x;
      canvasCtx.textAlign = 'left';
      chars.forEach((ch) => {
        canvasCtx.fillText(ch, cursorX, y);
        cursorX += canvasCtx.measureText(ch).width + letterSpacing;
      });
      canvasCtx.textAlign = align;
    },
    drawTextCaret(canvasCtx, key, layer) {
      if (!AppState.caretVisible) return;
      const text = AppState.editingLayerKey === key ? (AppState.editingText || '') : (layer.text || '');
      canvasCtx.save();
      canvasCtx.font = this.font(layer);
      const bottomAligned = this.isTextBottomAligned(layer);
      const sourceBaselineAligned = this.isTextSourceBaselineAligned(layer);
      canvasCtx.textBaseline = (bottomAligned || sourceBaselineAligned) ? 'alphabetic' : 'top';
      const lines    = String(text).split('\n');
      const fontSize = layer.fontSizePx || 24;
      const lh       = layer.lineHeight || fontSize * 1.05;
      const lastLine = lines[lines.length - 1] || '';
      const lineIdx  = lines.length - 1;
      const lastW    = canvasCtx.measureText(lastLine).width;
      let caretX;
      if (layer.align === 'left')        caretX = layer.x + lastW;
      else if (layer.align === 'right')  caretX = layer.x + layer.width;
      else                               caretX = layer.x + layer.width / 2
                                                - canvasCtx.measureText(lines[lineIdx] || '').width / 2
                                                + lastW;
      const startY = layer.y + Math.max(0, (layer.height - lines.length * lh) / 2);
      const metrics = canvasCtx.measureText(lastLine || '國');
      const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
        ? metrics.actualBoundingBoxDescent
        : fontSize * 0.2;
      const bottomPadding = Math.max(0, Number(layer.textBottomPaddingPx || 0));
      const caretY = bottomAligned
        ? layer.y + layer.height - bottomPadding - descent
        : (sourceBaselineAligned
          ? this.getSourceTextBaseline(canvasCtx, layer, layer.y) + lineIdx * lh
          : startY + lineIdx * lh);
      canvasCtx.strokeStyle = layer.color || '#ffffff';
      canvasCtx.lineWidth   = Math.max(1.5, fontSize * 0.06);
      canvasCtx.lineCap     = 'round';
      canvasCtx.beginPath();
      if (bottomAligned || sourceBaselineAligned) {
        canvasCtx.moveTo(caretX, caretY - fontSize);
        canvasCtx.lineTo(caretX, caretY + descent);
      } else {
        canvasCtx.moveTo(caretX, caretY);
        canvasCtx.lineTo(caretX, caretY + fontSize * 1.1);
      }
      canvasCtx.stroke();
      canvasCtx.restore();
    },
    drawImageShadow(canvasCtx, img, box, shadow = {}) {
      if (!img || shadow?.enabled !== true) return;
      const opacity = Math.max(0, Math.min(1, Number(shadow.opacity ?? 0.51)));
      const angle = Number(shadow.angleDeg ?? 117) * Math.PI / 180;
      const distance = Number(shadow.distancePx ?? 2);
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;
      const blur = Math.max(0, Number(shadow.blurPx ?? 6));
      const width = Math.max(1, Math.ceil(box.width));
      const height = Math.max(1, Math.ceil(box.height));
      const pad = Math.ceil(blur * 3 + Math.abs(distance) + 2);
      const off = document.createElement('canvas');
      off.width = width + pad * 2;
      off.height = height + pad * 2;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(img, pad, pad, width, height);
      offCtx.globalCompositeOperation = 'source-in';
      offCtx.fillStyle = shadow.color || '#f26602';
      offCtx.fillRect(0, 0, off.width, off.height);

      canvasCtx.save();
      canvasCtx.globalAlpha = opacity;
      canvasCtx.globalCompositeOperation = shadow.blendMode === 'multiply' ? 'multiply' : 'source-over';
      canvasCtx.filter = blur ? `blur(${blur}px)` : 'none';
      canvasCtx.drawImage(off, -box.width / 2 - pad + offsetX, -box.height / 2 - pad + offsetY, off.width, off.height);
      canvasCtx.restore();
    },
    findLayerByCanonicalName(template, requestedName) {
      const wanted = normalizeLayerIdentifier(requestedName);
      return Object.entries(template?.layers || {}).find(([candidateKey, candidateLayer]) =>
        normalizeLayerIdentifier(candidateLayer?.__canonicalName || candidateLayer?.psdName || candidateLayer?.name || candidateKey) === wanted
      ) || null;
    },
    applyImageMask(canvasCtx, layer, template) {
      const maskName = layer?.__maskLayerName || layer?.maskLayerName;
      if (!maskName || !template) return false;
      const maskEntry = this.findLayerByCanonicalName(template, maskName);
      if (!maskEntry) return false;
      const maskLayer = maskEntry[1];
      if (window.ShapeRenderer?.clipJsonShape) {
        return window.ShapeRenderer.clipJsonShape(canvasCtx, maskLayer, { useLayerBounds: true });
      }
      const box = Geometry.getLayerBox(maskEntry[0], maskLayer);
      canvasCtx.beginPath();
      canvasCtx.rect(box.x, box.y, box.width, box.height);
      canvasCtx.clip();
      return true;
    },
    drawImage(canvasCtx, key, layer, images = AppState.images, options = {}) {
      const box = Geometry.getRenderedImageBox(key, layer, images);
      const img = images[key];
      const ready = Geometry.isImageReady(key, layer, images);
      canvasCtx.save();
      this.applyImageMask(canvasCtx, layer, options.template || AppState.template);
      canvasCtx.translate(box.centerX, box.centerY);
      canvasCtx.rotate(((layer.rotation || 0) * Math.PI) / 180);
      if (img && ready) {
        const logoShadowNames = new Set([
          '蝦皮購物_LOGO_白',
          '直式_18號會員日_LOGO_白',
          '蝦皮購物18號會員日_LOGO_白',
          '18號會員日_LOGO_白',
        ]);
        const labels = [key, layer?.psdName, String(layer?.assetFilename || '').replace(/\.[^.]+$/, '')];
        const automaticLogoShadow = labels.some((name) => logoShadowNames.has(String(name || '').trim()))
          ? { enabled: true, color: '#f26602', opacity: 0.51, blendMode: 'multiply', angleDeg: 117, distancePx: 2, blurPx: 6 }
          : null;
        this.drawImageShadow(canvasCtx, img, box, layer.dropShadow || automaticLogoShadow);
        canvasCtx.drawImage(img, -box.width / 2, -box.height / 2, box.width, box.height);
      } else if (layer.__assetCleared === true && !layer.assetFilename && options.showMissing) {
        // （整合版 5.3）使用者手動清除的圖層：畫「＋ 上傳圖片」虛線槽（僅預覽）。
        ManualAssetUpload.drawSlot(canvasCtx, { ...box, rotation: layer.rotation }, key === AppState.manualUploadHoverKey, options.template || AppState.template);
      } else if (layer.__manualUploadRequired && options.showMissing) {
        canvasCtx.fillStyle = 'rgba(255, 255, 255, .08)';
        canvasCtx.fillRect(-box.width / 2, -box.height / 2, box.width, box.height);
        canvasCtx.strokeStyle = 'rgba(59, 130, 246, .95)';
        canvasCtx.lineWidth = 2;
        canvasCtx.setLineDash([7, 5]);
        canvasCtx.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
        canvasCtx.setLineDash([]);
        canvasCtx.fillStyle = '#2563eb';
        canvasCtx.font = `600 ${Math.max(13, Math.min(22, box.width / 7))}px sans-serif`;
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'middle';
        const labelOffset = ManualAssetUpload.visibleLabelOffset({ ...box, rotation: layer.rotation }, options.template || AppState.template);
        canvasCtx.fillText('+上傳素材', labelOffset.x, labelOffset.y, Math.max(30, Math.min(box.width, labelOffset.visibleWidth) - 16));
      } else if (layer.__assetMissing && options.showMissing) {
        canvasCtx.fillStyle = 'rgba(220, 38, 38, .22)';
        canvasCtx.fillRect(-box.width / 2, -box.height / 2, box.width, box.height);
        canvasCtx.strokeStyle = 'rgba(220, 38, 38, .95)';
        canvasCtx.lineWidth = 2;
        canvasCtx.setLineDash([7, 5]);
        canvasCtx.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
        canvasCtx.setLineDash([]);
        canvasCtx.fillStyle = '#b91c1c';
        canvasCtx.font = `${Math.max(12, Math.min(24, box.width / 8))}px sans-serif`;
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'middle';
        canvasCtx.fillText('素材缺失', 0, 0, Math.max(20, box.width - 12));
      } else if (!layer.assetFilename && options.showMissing) {
        canvasCtx.strokeStyle = 'rgba(255,255,255,.85)';
        canvasCtx.setLineDash([6, 4]);
        canvasCtx.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
        canvasCtx.fillStyle = '#ffffff';
        canvasCtx.font = '14px sans-serif';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText(layer.psdName || key, 0, 4);
      }
      // 有指定素材檔名、但圖片還沒真正 decode 完成時，這裡刻意先不畫任何東西，
      // 而不是用容器滿版寬高畫出未依照片比例縮放的暫時畫面。
      canvasCtx.restore();
    },
    drawGrid(canvasCtx) {
      const t = AppState.template;
      canvasCtx.save();
      canvasCtx.strokeStyle = 'rgba(37,99,235,.18)';
      canvasCtx.lineWidth = 1;
      for (let x = 0; x < t.canvas.width; x += 24) { canvasCtx.beginPath(); canvasCtx.moveTo(x, 0); canvasCtx.lineTo(x, t.canvas.height); canvasCtx.stroke(); }
      for (let y = 0; y < t.canvas.height; y += 24) { canvasCtx.beginPath(); canvasCtx.moveTo(0, y); canvasCtx.lineTo(t.canvas.width, y); canvasCtx.stroke(); }
      canvasCtx.restore();
    },
    drawSelection(canvasCtx) {
      const key = activeLayerKey(); const layer = activeLayer();
      if (!key || !layer) return;
      const box = Geometry.getSelectionBox(key, layer);
      const rotationDeg = Number(layer.rotation || 0);
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

      // 外框：用 canvas transform 旋轉整個矩形，畫出來的外框會跟著素材角度一起轉。
      canvasCtx.save();
      canvasCtx.translate(center.x, center.y);
      canvasCtx.rotate((rotationDeg * Math.PI) / 180);
      canvasCtx.strokeStyle = '#3b82f6';
      canvasCtx.lineWidth = 2;
      canvasCtx.setLineDash([6, 4]);
      canvasCtx.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
      canvasCtx.setLineDash([]);
      canvasCtx.restore();

      // 控制點/旋轉握把：座標已經是旋轉後的實際畫面位置（見 Geometry.handles），直接畫在該位置即可。
      for (const h of Geometry.handles(box, rotationDeg)) {
        if (h.isRotateHandle) {
          // 旋轉握把畫成一個小圓點，並用一條細線連到框的上緣中央（2026-08-13 調整2，原為右上角）。
          const unrotatedCorner = { x: flag('ui.rotateHandleAnchor', 'topCenter') === 'topRight' ? box.x + box.width : box.x + box.width / 2, y: box.y };
          const corner = Geometry.rotatePointAround(unrotatedCorner, center, rotationDeg);
          canvasCtx.save();
          canvasCtx.strokeStyle = '#3b82f6';
          canvasCtx.lineWidth = 1;
          canvasCtx.beginPath();
          canvasCtx.moveTo(corner.x, corner.y);
          canvasCtx.lineTo(h.x, h.y);
          canvasCtx.stroke();
          canvasCtx.beginPath();
          canvasCtx.arc(h.x, h.y, h.size / 2, 0, Math.PI * 2);
          canvasCtx.fillStyle = '#ffffff';
          canvasCtx.fill();
          canvasCtx.strokeStyle = '#3b82f6';
          canvasCtx.stroke();
          canvasCtx.restore();
          continue;
        }
        canvasCtx.beginPath();
        this.roundRect(canvasCtx, h.x - h.size / 2, h.y - h.size / 2, h.size, h.size, 3);
        canvasCtx.fillStyle = '#ffffff'; canvasCtx.fill();
        canvasCtx.strokeStyle = '#3b82f6'; canvasCtx.stroke();
      }
    },
  };
  const Renderer = pickLineage(Renderer_A, Renderer_B);
  // ── LayerManager：B 系實作（外廣 wave1 V0.5 原文）──
  const LayerManager_B = {
    render() {
      const t = AppState.template;
      if (!t || !DOM.layerList) return;
      const search = AppState.layerSearch.trim().toLowerCase();
      const keys = [...(t.renderOrder || [])].filter((key) => key !== 'subtitle_frame' && t.layers[key]).reverse().filter((key) => {
        const layer = t.layers[key];
        return !search || `${key} ${layer.psdName || ''}`.toLowerCase().includes(search);
      });
      DOM.layerList.innerHTML = keys.map((key) => {
        const layer = t.layers[key];
        const icon = layer.type === 'text' ? 'T' : layer.type === 'image' ? '◩' : '▭';
        const selected = AppState.selectedLayers.includes(key) ? 'active' : '';
        const disabled = layer.__nonInteractive ? 'disabled aria-disabled="true"' : '';
        return `<div class="layerItem ${selected}" data-key="${key}"><span class="layerIcon">${icon}</span><span class="layerMeta"><strong>${layer.psdName || key}</strong><small>${key}</small></span><button class="eyeBtn" data-action="visible" title="顯示 / 隱藏" ${disabled}>${layer.hidden ? SVG.eyeOff : SVG.eye}</button><button class="lockBtn ${layer.locked ? 'locked' : 'unlocked'}" data-action="lock" title="鎖定 / 解鎖" ${disabled}>${layer.locked ? SVG.lock : SVG.unlock}</button></div>`;
      }).join('');
    },
    select(key, additive = false) {
      if (!AppState.template?.layers?.[key] || AppState.template.layers[key].__nonInteractive) return;
      AppState.selectedLayers = additive
        ? (AppState.selectedLayers.includes(key) ? AppState.selectedLayers.filter((item) => item !== key) : [...AppState.selectedLayers, key])
        : [key];
      this.render(); Inspector.render(); Renderer.render();
    },
    async toggleVisible(key) {
      const layer = AppState.template?.layers?.[key];
      if (!layer || layer.__nonInteractive) return;
      HistoryManager.push();
      layer.hidden = !layer.hidden;
      if (!layer.hidden && layer.type === 'image') await TemplateLoader.loadImagesForActiveTemplate();
      this.render();
      Renderer.render();
    },
    toggleLock(key) { const layer = AppState.template?.layers?.[key]; if (!layer || layer.__nonInteractive) return; HistoryManager.push(); layer.locked = !layer.locked; this.render(); Renderer.render(); },
    hitTest(pos) {
      const t = AppState.template; if (!t) return null;
      const order = [...(t.renderOrder || [])].reverse().filter((key) => key !== 'subtitle_frame');
      const testKey = (key) => {
        const layer = t.layers[key]; if (!layer || layer.hidden || layer.__nonInteractive) return false;
        // （LineOA／鏡面）ui.hitLockedPassthrough：鎖定圖層不攔截點擊，穿透到下方圖層。
        if (flag('ui.hitLockedPassthrough', false) && layer.locked === true) return false;
        // （OM_w2 / LineOA）上傳槽採 Cover 時，滑鼠命中只限遮罩可見範圍。
        if (layer.__uploadSlot === true) {
          const maskName = layer.__maskLayerName || layer.maskLayerName;
          const maskEntry = maskName
            ? Object.entries(t.layers || {}).find(([candidateKey, candidateLayer]) =>
                normalizeLayerIdentifier(candidateLayer?.psdName || candidateLayer?.name || candidateKey) === normalizeLayerIdentifier(maskName))
            : null;
          if (maskEntry) {
            const maskBox = Geometry.getLayerBox(maskEntry[0], maskEntry[1]);
            if (pos.x < maskBox.x || pos.x > maskBox.x + maskBox.width || pos.y < maskBox.y || pos.y > maskBox.y + maskBox.height) return false;
          }
        }
        const box = Geometry.getLayerBox(key, layer);
        const rotationDeg = Number(layer.rotation || 0);
        // 有旋轉角度時，把滑鼠座標「反向旋轉」回素材未旋轉時的座標系，再用一般矩形判定。
        // 這樣使用者點擊的是「畫面上看到的旋轉後外觀」，而不是原本水平的外框範圍。
        const localPos = rotationDeg
          ? Geometry.rotatePointAround(pos, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, -rotationDeg)
          : pos;
        return localPos.x >= box.x && localPos.x <= box.x + box.width && localPos.y >= box.y && localPos.y <= box.y + box.height;
      };
      // P_範圍 這種參考線圖層，優先度用「面積」比較，不是單純「一般素材永遠贏」：
      // - 點在商品圖／文字／logo 上：這些通常比 P_範圍 小，會優先選到它們，不會被 P_範圍 搶走。
      // - 點在 P_範圍 內、但只被 kv_bg 這種蓋滿整個畫布的背景圖覆蓋的空白處：P_範圍 比背景圖小，
      //   P_範圍 會贏，這樣才點得到 P_範圍 本身（先前「一般素材永遠優先」的寫法，會讓背景圖
      //   永遠搶走點擊，導致 P_範圍 在畫布上完全點不到，只能從左側圖層清單選取）。
      const isGuide = (key) => window.SmartAssetManager?.isPlacementGuide?.(key, t.layers[key]);
      const areaOf = (key) => { const box = Geometry.getLayerBox(key, t.layers[key]); return Math.max(1, box.width) * Math.max(1, box.height); };
      const normalHit = order.find((key) => !isGuide(key) && testKey(key));
      const guideHit = order.find((key) => isGuide(key) && testKey(key));
      if (normalHit && guideHit) return areaOf(guideHit) < areaOf(normalHit) ? guideHit : normalHit;
      return normalHit || guideHit || null;
    },
    hitUploadSlot(pos) {
      const t = AppState.template; if (!t) return null;
      const order = [...(t.renderOrder || [])].reverse();
      return order.find((key) => {
        const layer = t.layers?.[key];
        if (!layer || layer.hidden || layer.__uploadSlot !== true) return false;
        const maskName = layer.__maskLayerName || layer.maskLayerName;
        const maskEntry = maskName
          ? Object.entries(t.layers || {}).find(([candidateKey, candidateLayer]) =>
              normalizeLayerIdentifier(candidateLayer?.psdName || candidateLayer?.name || candidateKey) === normalizeLayerIdentifier(maskName))
          : null;
        const box = maskEntry ? Geometry.getLayerBox(maskEntry[0], maskEntry[1]) : Geometry.getLayerBox(key, layer);
        return pos.x >= box.x && pos.x <= box.x + box.width && pos.y >= box.y && pos.y <= box.y + box.height;
      }) || null;
    },
    hitHandle(pos) {
      const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer) return null;
      const box = Geometry.getSelectionBox(key, layer);
      const rotationDeg = Number(layer.rotation || 0);
      return Geometry.handles(box, rotationDeg).find((h) => Math.abs(pos.x - h.x) <= h.size && Math.abs(pos.y - h.y) <= h.size) || null;
    },
  };
  // ── LayerManager：A 系實作（正式BN V0.8 為底）──
  const LayerManager_A = {
    render() {
      const t = AppState.template;
      if (!t || !DOM.layerList) return;
      const search = AppState.layerSearch.trim().toLowerCase();
      const keys = [...(t.renderOrder || [])].filter((key) => key !== 'subtitle_frame' && t.layers[key]).reverse().filter((key) => {
        const layer = t.layers[key];
        return !search || `${key} ${layer.psdName || ''}`.toLowerCase().includes(search);
      });
      DOM.layerList.innerHTML = keys.map((key) => {
        const layer = t.layers[key];
        const icon = layer.type === 'text' ? 'T' : layer.type === 'image' ? '◩' : '▭';
        const selected = AppState.selectedLayers.includes(key) ? 'active' : '';
        const disabled = layer.__nonInteractive ? 'disabled aria-disabled="true"' : '';
        return `<div class="layerItem ${selected}" data-key="${key}"><span class="layerIcon">${icon}</span><span class="layerMeta"><strong>${layer.psdName || key}</strong><small>${key}</small></span><button class="eyeBtn" data-action="visible" title="顯示 / 隱藏" ${disabled}>${layer.hidden ? SVG.eyeOff : SVG.eye}</button><button class="lockBtn ${layer.locked ? 'locked' : 'unlocked'}" data-action="lock" title="鎖定 / 解鎖" ${disabled}>${layer.locked ? SVG.lock : SVG.unlock}</button></div>`;
      }).join('');
    },
    select(key, additive = false) {
      if (!AppState.template?.layers?.[key] || AppState.template.layers[key].__nonInteractive) return;
      AppState.selectedLayers = additive
        ? (AppState.selectedLayers.includes(key) ? AppState.selectedLayers.filter((item) => item !== key) : [...AppState.selectedLayers, key])
        : [key];
      this.render(); Inspector.render(); Renderer.render();
    },
    async toggleVisible(key) {
      const layer = AppState.template?.layers?.[key];
      if (!layer || layer.__nonInteractive) return;
      HistoryManager.push();
      layer.hidden = !layer.hidden;
      if (!layer.hidden && layer.type === 'image') await TemplateLoader.loadImagesForActiveTemplate();
      this.render();
      Renderer.render();
    },
    toggleLock(key) { const layer = AppState.template?.layers?.[key]; if (!layer || layer.__nonInteractive) return; HistoryManager.push(); layer.locked = !layer.locked; this.render(); Renderer.render(); },
    hitTest(pos) {
      const t = AppState.template; if (!t) return null;
      const order = [...(t.renderOrder || [])].reverse().filter((key) => key !== 'subtitle_frame');
      const testKey = (key) => {
        const layer = t.layers[key]; if (!layer || layer.hidden || layer.locked || layer.__nonInteractive) return false;
        // 2026-08-13：價格圖層點選範圍改用「顯示框（貼合文字）」而非資料框，與選取框視覺一致。
        const box = Geometry.getSelectionBox(key, layer);
        const rotationDeg = Number(layer.rotation || 0);
        // 有旋轉角度時，把滑鼠座標「反向旋轉」回素材未旋轉時的座標系，再用一般矩形判定。
        // 這樣使用者點擊的是「畫面上看到的旋轉後外觀」，而不是原本水平的外框範圍。
        const localPos = rotationDeg
          ? Geometry.rotatePointAround(pos, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, -rotationDeg)
          : pos;
        return localPos.x >= box.x && localPos.x <= box.x + box.width && localPos.y >= box.y && localPos.y <= box.y + box.height;
      };
      // P_範圍 這種參考線圖層，優先度用「面積」比較，不是單純「一般素材永遠贏」：
      // - 點在商品圖／文字／logo 上：這些通常比 P_範圍 小，會優先選到它們，不會被 P_範圍 搶走。
      // - 點在 P_範圍 內、但只被 kv_bg 這種蓋滿整個畫布的背景圖覆蓋的空白處：P_範圍 比背景圖小，
      //   P_範圍 會贏，這樣才點得到 P_範圍 本身（先前「一般素材永遠優先」的寫法，會讓背景圖
      //   永遠搶走點擊，導致 P_範圍 在畫布上完全點不到，只能從左側圖層清單選取）。
      const isGuide = (key) => window.SmartAssetManager?.isPlacementGuide?.(key, t.layers[key]);
      const areaOf = (key) => { const box = Geometry.getLayerBox(key, t.layers[key]); return Math.max(1, box.width) * Math.max(1, box.height); };
      const normalHit = order.find((key) => !isGuide(key) && testKey(key));
      const guideHit = order.find((key) => isGuide(key) && testKey(key));
      if (normalHit && guideHit) return areaOf(guideHit) < areaOf(normalHit) ? guideHit : normalHit;
      return normalHit || guideHit || null;
    },
    hitHandle(pos) {
      const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.locked) return null;
      const box = Geometry.getSelectionBox(key, layer);
      const rotationDeg = Number(layer.rotation || 0);
      return Geometry.handles(box, rotationDeg).find((h) => Math.abs(pos.x - h.x) <= h.size && Math.abs(pos.y - h.y) <= h.size) || null;
    },
  };
  const LayerManager = pickLineage(LayerManager_A, LayerManager_B);
  const DynamicLayoutManager = {
    _captureManual(template) {
      const capture = [];
      Object.entries(template?.layers || {}).forEach(([key, layer]) => {
        const overrides = layer?.__manualOverrides || {};
        const values = {};
        Object.keys(overrides).filter((prop) => overrides[prop]).forEach((prop) => {
          const value = prop.startsWith('shape.') ? layer.shape?.[prop.slice(6)] : layer[prop];
          // 手動標記過但目前沒有值的屬性（例如尚未設定的 letterSpacing）：略過，clone(undefined) 會拋錯（原正式BN 既有問題）。
          if (value === undefined) return;
          values[prop] = clone(value);
        });
        if (Object.keys(values).length) capture.push({ key, values });
      });
      return capture;
    },
    _restoreManual(template, capture) {
      capture.forEach(({ key, values }) => {
        const layer = template?.layers?.[key]; if (!layer) return;
        Object.entries(values).forEach(([prop, value]) => {
          if (prop.startsWith('shape.')) { layer.shape = layer.shape || {}; layer.shape[prop.slice(6)] = clone(value); }
          else layer[prop] = clone(value);
        });
      });
    },
    refreshForText(template, key, layer) {
      if (!template || !layer) return;
      const protectedValues = this._captureManual(template);
      try {
        const family = template?.ruleFamily || template?.sheetTemplateRoute?.family || CapsuleRuleEngine.getTemplateFamily(template);
        const rules = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(family) || {};
        // 手動改字時也先套相同文字標準，讓 onTextChanged 的寬度量測與最終 Renderer 完全一致。
        window.SPTextStandard?.applyNonPriceTextLayer?.(layer, key);
        // 只有 Rule 明確宣告 onTextChanged 才允許動態幾何；未宣告就完全不改其他圖層（決策 51/52）。
        if (typeof rules.onTextChanged === 'function') rules.onTextChanged({ template, key, layer, record: template.batchRecord || {} });
        window.SPTextStandard?.applyTemplateNonPriceText?.(template);
      } finally { this._restoreManual(template, protectedValues); }
    },
  };
  // ── Inspector：B 系實作（外廣 wave1 V0.5 原文）──
  // ── Inspector：B 系實作（外廣 wave1 V0.5 原文）──
  const Inspector_B = {
    render() {
      const key = activeLayerKey(); const layer = activeLayer();
      if (DOM.selectedLayerName) DOM.selectedLayerName.textContent = layer ? (layer.psdName || key) : '未選取';
      if (DOM.emptyInspector) DOM.emptyInspector.classList.toggle('hidden', !!layer);
      if (DOM.commonControls) DOM.commonControls.classList.toggle('hidden', !layer);
      if (DOM.textControls) DOM.textControls.classList.toggle('hidden', !layer || layer.type !== 'text');
      // （整合版 5.3）圖片圖層的「上傳替換／清除圖片」控制列，由 modules/manual-asset-controls.js 提供。
      window.ManualAssetControls?.render?.(key, layer);
      window.CouponControls?.render?.();
      if (!layer) { this.syncStatus(); return; }
      const box = Geometry.getLayerBox(key, layer);
      this.setInput('xInput', round(box.x)); this.setInput('yInput', round(box.y)); this.setInput('wInput', round(box.width)); this.setInput('hInput', round(box.height));
      if (layer.type === 'text') {
        this.setInput('textInput', layer.text || ''); this.setInput('fontSizeInput', layer.fontSizePx || 24); this.setInput('colorInput', layer.color || '#000000');
        qsa('#alignGroup button').forEach((button) => button.classList.toggle('active', button.dataset.align === (layer.align || 'center')));
        // Word 工具列同步（合併自 word-editor.patch.js ③）
        $('fontFamilyInput')    && ($('fontFamilyInput').value      = layer.fontFamily || 'ShopeeNotoSans Content');
        $('boldBtn')            && $('boldBtn').classList.toggle('active',     Number(layer.fontWeight || 400) >= 700);
        $('italicBtn')          && $('italicBtn').classList.toggle('active',   layer.fontStyle === 'italic');
        $('underlineBtn')       && $('underlineBtn').classList.toggle('active', !!(layer.textDecoration?.includes('underline')));
        $('lineHeightInput')    && ($('lineHeightInput').value    = layer.lineHeightMultiplier ?? '');
        $('letterSpacingInput') && ($('letterSpacingInput').value = layer.letterSpacing ?? '');
      }
      this.syncStatus();
    },
    setInput(id, value) { const el = $(id); if (el) el.value = value; },
    syncStatus() {
      const key = activeLayerKey(); const layer = activeLayer();
      const box = key && layer ? Geometry.getLayerBox(key, layer) : { x: 0, y: 0, width: 0, height: 0 };
      if (DOM.statusX) DOM.statusX.textContent = round(box.x); if (DOM.statusY) DOM.statusY.textContent = round(box.y);
      if (DOM.statusW) DOM.statusW.textContent = round(box.width); if (DOM.statusH) DOM.statusH.textContent = round(box.height);
      if (DOM.activeTemplateName) DOM.activeTemplateName.textContent = AppState.template?.templateId || AppState.templates[AppState.activeIndex]?.name || '公版';
      if (DOM.canvasSize) DOM.canvasSize.textContent = `${AppState.template?.canvas?.width || 0} × ${AppState.template?.canvas?.height || 0}`;
    },
    applyBoxFromInputs() {
      const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.locked) return;
      HistoryManager.push();
      // Inspector 與主畫布拖曳必須走同一個 Smart Object transaction。
      // AssetSyncHub 對 SmartAssetManager owned layer 會主動 skip，因此兩者不會重複同步。
      window.SmartAssetManager?.beginMainCanvasTransform?.(key, AppState.template);
      AssetSyncHub.begin(AppState.template, key);
      const previousBox = Geometry.getLayerBox(key, layer);
      const nextBox = { x: Number($('xInput')?.value || 0), y: Number($('yInput')?.value || 0), width: Number($('wInput')?.value || 1), height: Number($('hInput')?.value || 1) };
      Geometry.applyBox(key, layer, nextBox);
      if (layer.source === 'auto_price_v2' && previousBox.width > 0 && Math.abs(nextBox.width - previousBox.width) > 0.001) {
        const factor = nextBox.width / previousBox.width;
        layer.fontSizePx = round(Math.max(4, Number(layer.fontSizePx || 24) * factor), 2);
        layer.fontSizePt = layer.fontSizePx;
        layer.lineHeight = round(layer.fontSizePx * (layer.lineHeightMultiplier || 1.08), 2);
        if (flag('price.specialCharRanges82', true)) window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
        PriceTransformEngine.captureManualPriceTransform(key, layer);
      } else if (flag('price.fitBoxToInk', false) && layer.source === 'auto_price_v2') {
        // （OM_w2）只改 X / Y / 高度時外框一樣要跟著字形收齊。
        PriceTransformEngine.captureManualPriceTransform(key, layer);
      }
      window.SmartAssetManager?.updateMainCanvasTransform?.(key, AppState.template);
      AssetSyncHub.update(AppState.template, key);
      window.SmartAssetManager?.finishMainCanvasTransform?.(key, AppState.template);
      AssetSyncHub.finish(AppState.template, key);
      Renderer.render(); LayerManager.render();
    },
    applyTextFromInputs() {
      const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.type !== 'text' || layer.locked) return;
      const v = (id) => $(id);
      const prevSize = layer.fontSizePx; const prevColor = layer.color; const prevFamily = layer.fontFamily;
      if (v('textInput'))     layer.text       = v('textInput').value;
      if (v('fontSizeInput')) { layer.fontSizePx = Number(v('fontSizeInput').value) || layer.fontSizePx || 24; layer.fontSizePt = layer.fontSizePx; }
      if (v('colorInput'))    layer.color      = v('colorInput').value || layer.color;
      if (v('fontFamilyInput')?.value) layer.fontFamily = v('fontFamilyInput').value;
      const lhEl = v('lineHeightInput');
      if (lhEl) {
        if (lhEl.value !== '') {
          const m = parseFloat(lhEl.value);
          if (!isNaN(m)) { layer.lineHeightMultiplier = m; layer.lineHeight = (layer.fontSizePx || 24) * m; }
        } else {
          delete layer.lineHeightMultiplier; delete layer.lineHeight;
        }
      } else {
        layer.lineHeight = round(layer.fontSizePx * (layer.lineHeightMultiplier || 1.08), 2);
      }
      const lsEl = v('letterSpacingInput');
      if (lsEl) {
        if (lsEl.value !== '') { const sp = parseFloat(lsEl.value); if (!isNaN(sp)) layer.letterSpacing = sp; }
        else delete layer.letterSpacing;
      }
      if (layer.fontSizePx !== prevSize || layer.color !== prevColor || layer.fontFamily !== prevFamily) HistoryManager.push();
      if (layer.source === 'auto_price_v2') {
        if (flag('price.specialCharRanges82', true)) window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
        PriceTransformEngine.captureManualPriceTransform(key, layer);
      }
      // （跨夜 text.afterEditHook）手動改過的文字不再被工單覆寫，並通知規則檔重算依賴文字量測的版型。
      if (flag('text.afterEditHook', 'none') === 'markManualTextEdited') markManualTextEdited(AppState.template, key, layer);
      window.OMWave1SubtitleLayout?.refresh?.(AppState.template);
      Renderer.render();
    },
  };
  // ── Inspector：A 系實作（正式BN V0.8 為底）──
  const Inspector_A = {
    render() {
      const key = activeLayerKey(); const layer = activeLayer();
      if (DOM.selectedLayerName) DOM.selectedLayerName.textContent = layer ? (layer.psdName || key) : '未選取';
      if (DOM.emptyInspector) DOM.emptyInspector.classList.toggle('hidden', !!layer);
      if (DOM.commonControls) DOM.commonControls.classList.toggle('hidden', !layer);
      if (DOM.textControls) DOM.textControls.classList.toggle('hidden', !layer || layer.type !== 'text');
      // （整合版 5.3）圖片圖層的「上傳替換／清除圖片」控制列，由 modules/manual-asset-controls.js 提供。
      window.ManualAssetControls?.render?.(key, layer);
      window.CouponControls?.render?.();
      if (!layer) { this.syncStatus(); return; }
      const box = Geometry.getLayerBox(key, layer);
      this.setInput('xInput', round(box.x)); this.setInput('yInput', round(box.y)); this.setInput('wInput', round(box.width)); this.setInput('hInput', round(box.height));
      if (layer.type === 'text') {
        this.setInput('textInput', layer.text || ''); this.setInput('fontSizeInput', layer.fontSizePx || 24); this.setInput('colorInput', layer.color || '#000000');
        qsa('#alignGroup button').forEach((button) => button.classList.toggle('active', button.dataset.align === (layer.align || 'center')));
        // Word 工具列同步（合併自 word-editor.patch.js ③）
        $('fontFamilyInput')    && ($('fontFamilyInput').value      = layer.fontFamily || 'ShopeeNotoSans Content');
        $('boldBtn')            && $('boldBtn').classList.toggle('active',     Number(layer.fontWeight || 400) >= 700);
        $('italicBtn')          && $('italicBtn').classList.toggle('active',   layer.fontStyle === 'italic');
        $('underlineBtn')       && $('underlineBtn').classList.toggle('active', !!(layer.textDecoration?.includes('underline')));
        $('lineHeightInput')    && ($('lineHeightInput').value    = layer.lineHeightMultiplier ?? '');
        $('letterSpacingInput') && ($('letterSpacingInput').value = layer.letterSpacing ?? '');
      }
      this.syncStatus();
    },
    setInput(id, value) { const el = $(id); if (el) el.value = value; },
    syncStatus() {
      const key = activeLayerKey(); const layer = activeLayer();
      const box = key && layer ? Geometry.getLayerBox(key, layer) : { x: 0, y: 0, width: 0, height: 0 };
      if (DOM.statusX) DOM.statusX.textContent = round(box.x); if (DOM.statusY) DOM.statusY.textContent = round(box.y);
      if (DOM.statusW) DOM.statusW.textContent = round(box.width); if (DOM.statusH) DOM.statusH.textContent = round(box.height);
      if (DOM.activeTemplateName) DOM.activeTemplateName.textContent = AppState.template?.templateId || AppState.templates[AppState.activeIndex]?.name || '公版';
      if (DOM.canvasSize) DOM.canvasSize.textContent = `${AppState.template?.canvas?.width || 0} × ${AppState.template?.canvas?.height || 0}`;
    },
    applyBoxFromInputs() {
      const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.locked) return;
      const previousBox = Geometry.getLayerBox(key, layer);
      const nextBox = { x: Number($('xInput')?.value || 0), y: Number($('yInput')?.value || 0), width: Number($('wInput')?.value || 1), height: Number($('hInput')?.value || 1) };
      if (['x','y','width','height'].every((prop) => Math.abs(Number(previousBox[prop]) - Number(nextBox[prop])) < 0.001)) return;
      HistoryManager.push('inspector-box');
      const typography = layer.type === 'text' ? PriceTransformEngine.captureTypographyState(layer) : null;
      Interaction.beginSync(key, layer);
      Geometry.applyBox(key, layer, nextBox);
      ManualOverrideManager.mark(layer, ['x', 'y', 'width', 'height']);
      if (layer.type === 'text' && previousBox.width > 0 && Math.abs(nextBox.width - previousBox.width) > 0.01) {
        PriceTransformEngine.applyTypographyScale(layer, typography, nextBox.width / previousBox.width);
        ManualOverrideManager.mark(layer, ['fontSizePx', 'lineHeight']);
        if (layer.source === 'auto_price_v2') PriceTransformEngine.captureManualPriceTransform(key, layer);
      }
      Interaction.updateSync(key, layer);
      Interaction.finishSync(key, layer);
      Renderer.render(); LayerManager.render();
    },
    applyTextFromInputs() {
      const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.type !== 'text' || layer.locked) return;
      const v = (id) => $(id);
      const next = {
        text: v('textInput')?.value ?? layer.text,
        fontSizePx: v('fontSizeInput') ? (Number(v('fontSizeInput').value) || layer.fontSizePx || 24) : layer.fontSizePx,
        color: v('colorInput')?.value || layer.color,
        fontFamily: v('fontFamilyInput')?.value || layer.fontFamily,
        lineHeightMultiplier: v('lineHeightInput')?.value === '' ? null : Number(v('lineHeightInput')?.value),
        letterSpacing: v('letterSpacingInput')?.value === '' ? null : Number(v('letterSpacingInput')?.value),
      };
      const changed = next.text !== layer.text || next.fontSizePx !== layer.fontSizePx || next.color !== layer.color || next.fontFamily !== layer.fontFamily
        || (Number.isFinite(next.lineHeightMultiplier) ? next.lineHeightMultiplier !== layer.lineHeightMultiplier : (next.lineHeightMultiplier === null && layer.lineHeightMultiplier !== undefined))
        || (Number.isFinite(next.letterSpacing) ? next.letterSpacing !== layer.letterSpacing : (next.letterSpacing === null && layer.letterSpacing !== undefined));
      if (!changed) return;
      HistoryManager.pushCoalesced('inspector-text');
      const textChanged = next.text !== layer.text;
      layer.text = next.text;
      PriceTransformEngine.setTypographyFontSize(layer, next.fontSizePx);
      layer.color = next.color;
      layer.fontFamily = next.fontFamily;
      if (Number.isFinite(next.lineHeightMultiplier)) { layer.lineHeightMultiplier = next.lineHeightMultiplier; layer.lineHeight = (layer.fontSizePx || 24) * next.lineHeightMultiplier; }
      else { delete layer.lineHeightMultiplier; delete layer.lineHeight; }
      if (Number.isFinite(next.letterSpacing)) layer.letterSpacing = next.letterSpacing; else delete layer.letterSpacing;
      ManualOverrideManager.mark(layer, ['fontSizePx', 'color', 'fontFamily', 'lineHeight', 'lineHeightMultiplier', 'letterSpacing']);
      if (layer.source === 'auto_price_v2') PriceTransformEngine.captureManualPriceTransform(key, layer);
      if (textChanged) DynamicLayoutManager.refreshForText(AppState.template, key, layer);
      Renderer.render();
    },
  };
  const Inspector = pickLineage(Inspector_A, Inspector_B);
  // ── TextEditor：B 系實作（外廣 wave1 V0.5 原文）──
  const TextEditor_B = {
    open(key) {
      const layer = AppState.template?.layers?.[key];
      if (!layer || layer.type !== 'text' || !DOM.inlineEditor) return;

      AppState.editingLayerKey = key;
      if (!AppState.selectedLayers.includes(key)) AppState.selectedLayers = [key];
      AppState.editingOriginalText = layer.text || '';
      AppState.editingText = layer.text || '';
      AppState.caretVisible = true;

      const editor = DOM.inlineEditor;
      editor.textContent = layer.text || '';

      // Canvas Native Text Editor：
      // 讓瀏覽器只負責接收鍵盤與中文輸入法，畫面完全由 Canvas 繪製。
      editor.style.display = 'block';
      editor.style.position = 'fixed';
      editor.style.left = '0px';
      editor.style.top = '0px';
      editor.style.width = '1px';
      editor.style.height = '1px';
      editor.style.opacity = '0';
      editor.style.pointerEvents = 'none';
      editor.style.overflow = 'hidden';
      editor.style.background = 'transparent';
      editor.style.border = '0';
      editor.style.outline = '0';
      editor.style.boxShadow = 'none';

      editor.focus();

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      this.startCaret();
      Renderer.render();
    },

    startCaret() {
      if (AppState.caretTimer) clearInterval(AppState.caretTimer);
      AppState.caretVisible = true;
      AppState.caretTimer = setInterval(() => {
        if (!AppState.editingLayerKey) return;
        AppState.caretVisible = !AppState.caretVisible;
        Renderer.render();
      }, 530);
    },

    stopCaret() {
      if (AppState.caretTimer) clearInterval(AppState.caretTimer);
      AppState.caretTimer = null;
      AppState.caretVisible = false;
    },

    syncFromEditor() {
      const key = AppState.editingLayerKey;
      const layer = key ? AppState.template?.layers?.[key] : null;
      if (!layer || layer.type !== 'text' || !DOM.inlineEditor) return;

      // 編輯中只更新暫存文字，不改動 template 內其他文字圖層與生成圖層。
      AppState.editingText = DOM.inlineEditor.innerText.replace(/\n$/g, '');
      layer.text = AppState.editingText;
      window.OMWave1SubtitleLayout?.refresh?.(AppState.template);
      Renderer.render();
    },

    commit() {
      // 沒有正在編輯中的圖層，直接跳過（不影響 export 流程）
      if (!AppState.editingLayerKey) return;

      const editor = DOM.inlineEditor;
      const key = AppState.editingLayerKey;
      const layer = key ? AppState.template?.layers?.[key] : null;

      if (layer && layer.type === 'text' && !layer.locked) {
        const newText = AppState.editingText ?? (editor ? editor.innerText.replace(/\n$/g, '') : '');
        if (newText !== AppState.editingOriginalText) {
          HistoryManager.push();
          layer.text = newText;
          const priceRecalcMode = flag('text.priceRecalcOnCommit', 'none');
          if (priceRecalcMode !== 'none' && layer.source === 'auto_price_v2') {
            // （OM_w2／LineOA spTextCapture）價格文字改了，82% ranges、外框、baseline 參考值一起重算；（鏡面 capture）只重算外框。
            if (priceRecalcMode === 'spTextCapture') window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
            PriceTransformEngine.captureManualPriceTransform(key, layer, AppState.template);
          }
          window.SmartAssetManager?.syncPriceTextFromMainCanvas?.(key, layer, AppState.template);
          window.SmartAssetManager?.markActiveThumbStale?.(AppState.template);
          // （跨夜 text.afterEditHook）標記手動改字並觸發規則檔 afterManualTextMetricsChanged。
          if (flag('text.afterEditHook', 'none') === 'markManualTextEdited') markManualTextEdited(AppState.template, key, layer);
        }
      }

      if (editor) editor.style.display = 'none';
      AppState.editingLayerKey = null;
      AppState.editingOriginalText = '';
      AppState.editingText = '';
      this.stopCaret();
      window.OMWave1SubtitleLayout?.refresh?.(AppState.template);
      Inspector.render();
      Renderer.render();
    },

    cancel() {
      const key = AppState.editingLayerKey;
      const layer = key ? AppState.template?.layers?.[key] : null;

      if (layer && layer.type === 'text') {
        layer.text = AppState.editingOriginalText;
      }

      if (DOM.inlineEditor) DOM.inlineEditor.style.display = 'none';
      AppState.editingLayerKey = null;
      AppState.editingOriginalText = '';
      AppState.editingText = '';
      this.stopCaret();
      window.OMWave1SubtitleLayout?.refresh?.(AppState.template);
      Inspector.render();
      Renderer.render();
    },
  };
  // ── TextEditor：A 系實作（正式BN V0.8 為底）──
  const TextEditor_A = {
    open(key) {
      const layer = AppState.template?.layers?.[key];
      if (!layer || layer.type !== 'text' || layer.locked || !DOM.inlineEditor) return;
      if (AppState.editingLayerKey && AppState.editingLayerKey !== key) this.commit();
      AppState.editingLayerKey = key;
      if (!AppState.selectedLayers.includes(key)) AppState.selectedLayers = [key];
      AppState.editingOriginalText = layer.text || '';
      AppState.editingOriginalSnapshot = clone(AppState.template);
      AppState.editingOriginalIndex = AppState.activeIndex;
      AppState.editingText = layer.text || '';
      AppState.caretVisible = true;
      const editor = DOM.inlineEditor;
      editor.textContent = layer.text || '';
      Object.assign(editor.style, {
        display: 'block', position: 'fixed', left: '0px', top: '0px', width: '1px', height: '1px',
        opacity: '0', pointerEvents: 'none', overflow: 'hidden', background: 'transparent', border: '0', outline: '0', boxShadow: 'none',
      });
      editor.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor); range.collapse(false); selection.removeAllRanges(); selection.addRange(range);
      this.startCaret(); Renderer.render();
    },
    startCaret() {
      if (AppState.caretTimer) clearInterval(AppState.caretTimer);
      AppState.caretVisible = true;
      AppState.caretTimer = setInterval(() => {
        if (!AppState.editingLayerKey) return;
        AppState.caretVisible = !AppState.caretVisible; Renderer.render();
      }, 530);
    },
    stopCaret() {
      if (AppState.caretTimer) clearInterval(AppState.caretTimer);
      AppState.caretTimer = null; AppState.caretVisible = false;
    },
    syncFromEditor() {
      const key = AppState.editingLayerKey;
      const layer = key ? AppState.template?.layers?.[key] : null;
      if (!layer || layer.type !== 'text' || !DOM.inlineEditor) return;
      AppState.editingText = DOM.inlineEditor.innerText.replace(/\n$/g, '');
      layer.text = AppState.editingText;
      DynamicLayoutManager.refreshForText(AppState.template, key, layer);
      Renderer.render();
    },
    _finishUi() {
      if (DOM.inlineEditor) DOM.inlineEditor.style.display = 'none';
      AppState.editingLayerKey = null;
      AppState.editingOriginalText = '';
      AppState.editingOriginalSnapshot = null;
      AppState.editingOriginalIndex = -1;
      AppState.editingText = '';
      this.stopCaret();
      Inspector.render(); Renderer.render();
    },
    commit() {
      if (!AppState.editingLayerKey) return false;
      const editor = DOM.inlineEditor;
      const key = AppState.editingLayerKey;
      const originalIndex = AppState.editingOriginalIndex;
      const layer = key ? AppState.template?.layers?.[key] : null;
      const newText = AppState.editingText ?? (editor ? editor.innerText.replace(/\n$/g, '') : '');
      const changed = !!(layer && layer.type === 'text' && !layer.locked && newText !== AppState.editingOriginalText);
      if (changed) {
        // 第41/46題：編輯期間允許即時預覽，但 History 必須保存「編輯前」完整 snapshot，不能在改完後才 push。
        HistoryManager.pushSnapshot(AppState.editingOriginalSnapshot, originalIndex, 'text-edit');
        layer.text = newText;
        DynamicLayoutManager.refreshForText(AppState.template, key, layer);
        window.SmartAssetManager?.markActiveThumbStale?.(AppState.template);
      } else if (!changed && AppState.editingOriginalSnapshot && originalIndex === AppState.activeIndex && AppState.templates?.[originalIndex]) {
        // 沒有文字變更時，還原可能因即時 Dynamic Layout 造成的暫存變動。
        AppState.templates[originalIndex].data = clone(AppState.editingOriginalSnapshot);
        AppState.template = AppState.templates[originalIndex].data;
      }
      this._finishUi();
      return changed;
    },
    cancel() {
      const index = AppState.editingOriginalIndex;
      if (AppState.editingOriginalSnapshot && Number.isInteger(index) && index >= 0 && AppState.templates?.[index]) {
        AppState.templates[index].data = clone(AppState.editingOriginalSnapshot);
        if (index === AppState.activeIndex) AppState.template = AppState.templates[index].data;
      }
      this._finishUi();
    },
  };
  const TextEditor = pickLineage(TextEditor_A, TextEditor_B);
  const PreviewZoom = {
    clamp(value) {
      return Math.max(AppState.previewZoomMin, Math.min(AppState.previewZoomMax, value));
    },
    apply() {
      const t = AppState.template;
      if (!t || !DOM.canvas) return;
      const zoom = this.clamp(AppState.previewZoom || 1);
      AppState.previewZoom = zoom;
      DOM.canvas.style.width = `${Math.round(t.canvas.width * zoom)}px`;
      DOM.canvas.style.height = `${Math.round(t.canvas.height * zoom)}px`;
      if (DOM.canvasStage) DOM.canvasStage.dataset.zoom = `${Math.round(zoom * 100)}%`;
    },
    zoomBy(delta, event) {
      if (!AppState.template) return;
      event?.preventDefault();
      TextEditor.commit();

      const before = DOM.canvas.getBoundingClientRect();
      const shell = DOM.canvasShell;
      const pointerX = event ? event.clientX - before.left : before.width / 2;
      const pointerY = event ? event.clientY - before.top : before.height / 2;
      const ratioX = before.width ? pointerX / before.width : 0.5;
      const ratioY = before.height ? pointerY / before.height : 0.5;

      const factor = delta < 0 ? 1.1 : 1 / 1.1;
      const oldZoom = AppState.previewZoom || 1;
      const newZoom = this.clamp(oldZoom * factor);
      if (Math.abs(newZoom - oldZoom) < 0.001) return;

      AppState.previewZoom = newZoom;
      this.apply();

      if (shell) {
        const after = DOM.canvas.getBoundingClientRect();
        shell.scrollLeft += (after.width - before.width) * ratioX;
        shell.scrollTop += (after.height - before.height) * ratioY;
      }
    },
    reset() {
      AppState.previewZoom = 1;
      this.apply();
    },
  };
  // （B 系）存檔還原雛形：快照辨識與 visual-authority 載入。
  const SnapshotManager = {
    TYPE: 'sp-sbd-visual-snapshot',
    SCHEMA_VERSION: 1,
    transientKeys: new Set([
      '_anchorDirty',
      '__assetMissing',
      '__needsProductGridLayout',
      '__omWave1LockSnapshot',
      '__renderModel',
      '__renderState',
      '__restoreSnapshot',
      'batchDiagnostics',
    ]),

    isSnapshot(template) {
      return !!(
        template
        && template.snapshotMeta?.type === this.TYPE
        && Number(template.snapshotMeta?.schemaVersion || 0) >= 1
      );
    },

    sourceTemplateId(template) {
      return String(
        template?.sheetTemplateRoute?.sourceTemplateId
        || template?.snapshotMeta?.sourceTemplateId
        || template?.canvas?.templateId
        || template?.batchSourceName
        || template?.templateId
        || ''
      ).trim();
    },

    cleanValue(value, key = '') {
      if (this.transientKeys.has(key)) return undefined;
      if (Array.isArray(value)) {
        return value
          .map((item) => this.cleanValue(item))
          .filter((item) => item !== undefined);
      }
      if (!value || typeof value !== 'object') return value;

      const output = {};
      Object.entries(value).forEach(([childKey, childValue]) => {
        const cleaned = this.cleanValue(childValue, childKey);
        if (cleaned !== undefined) output[childKey] = cleaned;
      });
      return output;
    },

    createSnapshot(template) {
      if (!template) return null;
      const snapshot = this.cleanValue(clone(template));
      const existingMeta = snapshot.snapshotMeta || {};
      snapshot.snapshotMeta = {
        ...existingMeta,
        type: this.TYPE,
        schemaVersion: this.SCHEMA_VERSION,
        restoreMode: 'visual-authority',
        sourceTemplateId: this.sourceTemplateId(template),
        layoutNo: String(template?.batchRecord?.__layoutNo || existingMeta.layoutNo || '').trim(),
        media: String(template?.batchRecord?.__media || existingMeta.media || '').trim(),
        outputName: String(template?.batchRecord?.__outputName || template?.templateId || existingMeta.outputName || '').trim(),
        exportedAt: new Date().toISOString(),
      };
      return snapshot;
    },

    prepareLoadedSnapshot(template) {
      if (!this.isSnapshot(template)) return false;
      this.transientKeys.forEach((key) => {
        if (key in template) delete template[key];
      });
      Object.values(template.layers || {}).forEach((layer) => {
        if (!layer || typeof layer !== 'object') return;
        delete layer._anchorDirty;
        delete layer.__assetMissing;
      });
      // Restore Snapshot 的畫面資料具有最高優先權。這個旗標只存在記憶體，重新輸出時會被清除。
      template.__restoreSnapshot = true;
      return true;
    },

    shouldProtectVisualState(template) {
      return this.isSnapshot(template) || template?.__restoreSnapshot === true;
    },
  };
  window.SnapshotManager = SnapshotManager;
  // （回饋 1）export.transparentToPng：「依規則」輸出時，成品只要有透明像素就改存 PNG（JPG 沒有透明，會變黑或白底）。
  // 用 1x 成品大小的探針畫布掃 alpha；不動原本的白底／壓縮邏輯。手動選「全部 JPG／PNG」時不介入。
  const renderProbeCanvas = (supersampled, width, height) => {
    const probe = document.createElement('canvas');
    probe.width = width;
    probe.height = height;
    const context = probe.getContext('2d', { alpha: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(supersampled, 0, 0, width, height);
    return probe;
  };
  const hasTransparentPixels = (canvas) => {
    const context = canvas.getContext('2d');
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 3; index < data.length; index += 4) if (data[index] < 255) return true;
    return false;
  };
  const shouldForcePngForTransparency = (format, supersampled, width, height) => {
    if (format !== 'auto' || !flag('export.transparentToPng', true)) return false;
    const probe = renderProbeCanvas(supersampled, width, height);
    const transparent = hasTransparentPixels(probe);
    probe.width = probe.height = 0;
    return transparent;
  };
  // ── 整合版共用（自 18節 移植）：下載圖片的 zip 附上存檔與診斷報告；A／B 兩系 buildZip 都在 createZip 前走這裡 ──
  const ExportBundleExtras = {
    hasDiagnosticsReport(files) {
      return files.some((file) => /(^|\/)診斷報告\.txt$/.test(String(file?.name || '')));
    },
    async appendSessionArchive(files) {
      if (!flag('export.bundleSessionArchive', true) || !window.SessionArchive?.buildArchive) return;
      try {
        const blob = await window.SessionArchive.buildArchive();
        files.push({ name: `存檔/${window.SessionArchive.archiveFilename()}`, blob });
      } catch (error) {
        console.warn('[Export] 存檔未能附進 zip：', error?.message || error);
      }
    },
    appendDiagnosticsReport(files) {
      // 該工具原本就有自己的診斷報告（network／鏡面／跨夜）就不重複附。
      if (!flag('export.bundleDiagnostics', true) || this.hasDiagnosticsReport(files)) return;
      const text = window.DiagnosticsReport?.text?.();
      if (!text) return;
      files.push({ name: '診斷報告.txt', blob: new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' }) });
    },
    /** 在 createZip 之前呼叫；圖片一張都沒有時不附（讓原本的「沒有可匯出的圖片」提示照常出現）。 */
    async append(files) {
      if (!files.some((file) => /\.(png|jpe?g)$/i.test(String(file?.name || '')))) return;
      await this.appendSessionArchive(files);
      this.appendDiagnosticsReport(files);
    },
  };

  // ── ExportManager：B 系實作（外廣 wave1 V0.5 原文）──
  const ExportManager_B = {
    async askImageFormat() {
      return new Promise((resolve) => {
        const old = document.querySelector('.v3-modal-backdrop');
        if (old) old.remove();

        const wrap = document.createElement('div');
        wrap.className = 'v3-modal-backdrop';
        wrap.innerHTML = `
          <div class="v3-modal">
            <h3>下載圖片</h3>
            <ul class="v3-modal-notes">
              <li>目前勾選的版位以 4x 高解析輸出，打包成一個 ZIP。</li>
              <li>「依工單規則」：格式依工單（素材規格表／媒體欄）與規則檔決定，沒寫的用 JPG；成品有透明像素會自動改 PNG。</li>
              <li>「全部 PNG」／「全部 JPG」：不看工單規則，所有版位統一用同一種格式。</li>
              <li>ZIP 內另附「存檔」（可載回繼續調整）與「診斷報告」。</li>
            </ul>
            <div class="v3-modal-actions">
              <button class="primary-btn" data-format="auto">依工單規則（推薦）</button>
              <button class="secondary-btn" data-format="png">全部 PNG</button>
              <button class="secondary-btn" data-format="jpg">全部 JPG</button>
            </div>
          </div>
        `;
        document.body.appendChild(wrap);

        wrap.addEventListener('click', (event) => {
          if (event.target === wrap) {
            wrap.remove();
            resolve(null);
            return;
          }

          const btn = event.target.closest('[data-format]');
          if (!btn) return;

          const nextFormat = btn.dataset.format;
          wrap.remove();
          resolve(nextFormat);
        });
      });
    },

    async export(format = 'auto') {
      const zipBlob = await this.buildZip(format, false);
      if (!zipBlob) return;
      this.downloadBlob(zipBlob, `${flag('export.zipPrefix', '25節生成工具')}_${AppState.template?.templateId || 'image'}_${Date.now()}.zip`);
    },

    async exportVisibleBatch(format = 'auto') {
      const zipBlob = await this.buildZip(format, true);
      if (!zipBlob) return;
      const zipPrefix = flag('export.zipPrefix', '25節生成工具');
      const batchZipMode = flag('export.batchZipName', 'batchOutputTs');
      // 整合版：specDrivenOrBatchTs（network／AMS）、prefixOutput（鏡面：固定檔名不帶時間戳）、batchOutputTs（其餘）。
      const batchZipName = batchZipMode === 'specDrivenOrBatchTs'
        ? (AppState.batchDiagnostics?.specDriven ? '25節Tool_network_輸出.zip' : `${zipPrefix}_batch_${Date.now()}.zip`)
        : batchZipMode === 'prefixOutput'
          ? `${zipPrefix}_輸出.zip`
          : `${zipPrefix}_批次輸出_${Date.now()}.zip`;
      this.downloadBlob(zipBlob, batchZipName);
    },

    // OM Wave1 下載格式不再依 Excel 規格表推測，統一由下方媒體規則決定。
    normalizeArchiveMediaName(value = '') {
      const raw = String(value || '').trim();
      const compact = raw.toLowerCase().replace(/[\s_\-/]+/g, '');
      if (compact === 'template') return 'Template';
      if (compact === 'appier') return 'Appier';
      if (compact === 'rtbhouse') return 'Rtbhouse';
      if (compact === 'uacpmaxlinelap') return 'UAC_Pmax_LineLAP';
      if (compact === 'dpa' || compact === 'dpaframe' || compact === 'dpaframemau') return 'DPA Frame_MAU';
      const normalized = raw
        .replace(/^UAC\s*[\/]\s*Pmax\s*[\/]\s*LineLAP/i, 'UAC_Pmax_LineLAP')
        .replace(/[\/:*?"<>|]+/g, '_')
        .trim();
      return normalized;
    },

    resolveArchiveMedia(baseFilename, template, item) {
      const fromRecord = this.normalizeArchiveMediaName(template?.batchRecord?.__media || item?.project || '');
      if (fromRecord) return fromRecord;
      const match = /^(Template|Appier|Rtbhouse|UAC_Pmax_LineLAP|DPA Frame_MAU)(?:[_-]|$)/i.exec(String(baseFilename || '').trim());
      return match ? this.normalizeArchiveMediaName(match[1]) : '';
    },

    resolveBannerSubfolder(baseFilename, template) {
      const layoutNo = String(template?.batchRecord?.__layoutNo || '').trim();
      const source = layoutNo || String(baseFilename || '').trim();
      const match = /(?:^|[_\s-])(banner\s*\d+)(?:[_\s-]|$)/i.exec(source)
        || /^(banner\s*\d+)$/i.exec(source);
      return match ? match[1].replace(/\s+/g, '').toLowerCase() : '';
    },

    resolveArchiveFolder(baseFilename, template, item) {
      const folderStrategy = flag('export.folderStrategy', 'omMedia');
      // （鏡面）export.folderStrategy＝project：只用「目前專案」當資料夾。
      if (folderStrategy === 'project') return String(item?.project || '').trim();
      // （network/AMS/跨夜）export.folderStrategy＝rootFolder：__outputRoot/__outputFolder，都沒有才用 project。
      if (folderStrategy === 'rootFolder') {
        const record = template?.batchRecord || {};
        const resolved = [record.__outputRoot, record.__outputFolder].map((segment) => this.sanitizeFolderSegment(segment)).filter(Boolean);
        return resolved.length ? resolved.join('/') : this.sanitizeFolderSegment(item?.project || '');
      }
      const mediaFolder = this.resolveArchiveMedia(baseFilename, template, item);
      const bannerFolder = this.resolveBannerSubfolder(baseFilename, template);
      return [mediaFolder, bannerFolder].filter(Boolean).join('/');
    },

    sanitizeFolderSegment(value = '') {
      return String(value || '').trim().replace(/[\\/:*?"<>|]+/g, '_').trim();
    },
    // （鏡面）匯出前檢查：可見的圖片圖層若指定了素材卻沒載入成功，這張就不輸出，改寫進診斷報告。
    findMissingVisibleAssets(template, images = {}) {
      return Object.entries(template?.layers || {})
        .filter(([, layer]) => layer?.type === 'image' && !layer.hidden && String(layer.assetFilename || '').trim())
        .filter(([key, layer]) => layer.__assetMissing === true || !images?.[key])
        .map(([key, layer]) => String(layer.psdName || key));
    },
    resolveRecommendedFormat(baseFilename, template, item) {
      const formatSource = flag('export.formatSource', 'omMedia');
      // （鏡面）export.formatSource＝specFormat：規則在 record.__specFormat 宣告 png/jpg，未宣告用 export.defaultFormat。
      if (formatSource === 'specFormat') {
        const specFormat = String(template?.batchRecord?.__specFormat || '').toLowerCase();
        if (specFormat === 'jpg' || specFormat === 'jpeg') return 'jpg';
        if (specFormat === 'png') return 'png';
        return flag('export.defaultFormat', 'jpg') === 'png' ? 'png' : 'jpg';
      }
      // （network/AMS/跨夜）export.formatSource＝outputFormat：完全由 batchRecord.__outputFormat 決定，未指定則 jpg。
      if (formatSource === 'outputFormat') {
        return String(template?.batchRecord?.__outputFormat || '').trim().toLowerCase() === 'png' ? 'png' : 'jpg';
      }
      // （LineOA 起）規則可在 record.__outputFormat 指定強制輸出格式（例如 POPUP 透明背景 → png）。
      const forced = String(template?.batchRecord?.__outputFormat || '').toLowerCase();
      if (forced === 'png' || forced === 'jpg' || forced === 'jpeg') return forced === 'jpeg' ? 'jpg' : forced;
      return this.resolveArchiveMedia(baseFilename, template, item) === 'DPA Frame_MAU' ? 'png' : 'jpg';
    },

    // （KV 等 export.formatSource＝specTable／folderStrategy＝specBanner 的 B 系工具）沿用正式BN 的規格表與 banner 子資料夾邏輯。
    getMaterialSpecTable() {
      if (AppState._materialSpecTable) return AppState._materialSpecTable;
      const bySizeAndMedia = new Map();
      const sizeFormats = new Map();
      const normMedia = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
      const normSize = (value) => String(value || '').toLowerCase().replace(/[×＊*\s]+/g, 'x');

      const wb = AppState.excelWorkbook;
      const sheetName = wb?.SheetNames?.find((name) => name.includes('素材規格表'));
      const sheet = sheetName ? wb.Sheets[sheetName] : null;
      if (sheet && window.XLSX) {
        const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        rows.slice(1).forEach((row) => {
          const media = String(row[0] || '').trim();
          const kLimitText = String(row[1] || '');
          const size = normSize(row[2] || '');
          if (!media || !size) return;
          const format = /png/i.test(kLimitText) ? 'png' : (/jpe?g/i.test(kLimitText) ? 'jpg' : null);
          if (!format) return;
          bySizeAndMedia.set(`${normMedia(media)}|${size}`, format);
          if (!sizeFormats.has(size)) sizeFormats.set(size, new Set());
          sizeFormats.get(size).add(format);
        });
      }
      const bySizeOnly = new Map();
      sizeFormats.forEach((formats, size) => { if (formats.size === 1) bySizeOnly.set(size, [...formats][0]); });

      AppState._materialSpecTable = { bySizeAndMedia, bySizeOnly, normMedia, normSize };
      return AppState._materialSpecTable;
    },
    resolveSpecFormat(media, size) {
      const { bySizeAndMedia, bySizeOnly, normMedia, normSize } = this.getMaterialSpecTable();
      const key = `${normMedia(media)}|${normSize(size)}`;
      return bySizeAndMedia.get(key) || bySizeOnly.get(normSize(size)) || 'jpg';
    },
    resolveBannerSubfolderSpec(baseFilename) {
      const match = /^(Template|UAC-Pmax-LineLAP)[_-]?(banner\d+)[_-]/i.exec(baseFilename);
      if (!match) return null;
      return `${match[1]}/${match[2].toLowerCase()}`;
    },

    /** 整合版刻意差異（export.dedupeOutputName，僅 OM_w2）：同一批 zip 內檔名重複時補 _2、_3…，避免互相覆蓋。 */
    dedupeZipEntryName(files, entryName) {
      if (!flag('export.dedupeOutputName', false)) return entryName;
      const taken = new Set(files.map((file) => file.name));
      if (!taken.has(entryName)) return entryName;
      const match = /^(.*?)(\.[a-z0-9]+)$/i.exec(entryName);
      const stem = match ? match[1] : entryName;
      const ext = match ? match[2] : '';
      let index = 2;
      while (taken.has(`${stem}_${index}${ext}`)) index += 1;
      return `${stem}_${index}${ext}`;
    },
    async buildZip(format = 'auto', onlyVisible = true) {
      TextEditor.commit();
      const currentIndex = AppState.activeIndex;
      const currentTemplate = AppState.template;

      const selected = onlyVisible
        ? AppState.templates.map((t, index) => ({ ...t, index })).filter((t) => t.visible && TemplateFilter.isMatch(t))
        : [{ ...AppState.templates[AppState.activeIndex], index: AppState.activeIndex }];

      if (onlyVisible && !selected.length) {
        alert('目前沒有勾選任何批次預覽圖片，請至少勾選一張再下載。');
        return null;
      }

      const files = [];
      // （跨夜）匯出備註（K 數壓縮結果）每次重新累積；未啟用時為 no-op。
      BatchDiagnostics.resetExportNotes();
      const fixedScale4x = flag('export.scaleMode', 'multiSize2x') === 'fixed4x';
      const whiteFillMode = flag('export.whiteFill', 'multiSize');
      const whiteFillMultiSize = whiteFillMode === 'multiSize';
      const compressMode = flag('export.compressMode', 'multiSize150k');
      // （鏡面）export.diagnostics＝mirror：逐張記錄成功／失敗，報告一律附在 zip；缺素材的圖略過不輸出。
      const mirrorDiagnostics = flag('export.diagnostics', 'assetSpec') === 'mirror';
      const skipMissingAssets = flag('export.skipMissingAssets', false);
      const exportResults = [];

      for (const item of selected) {
        AppState.activeIndex = item.index;
        AppState.template = AppState.templates[item.index].data;
        window.BatchManager?.refreshTemplateFromBatchRecord?.(AppState.template);
        const loadedImages = await TemplateLoader.loadImagesForActiveTemplate({ project: item.project });

        const t = AppState.template;
        // format='auto'：依 25節 OM Wave1 的媒體規則輸出（DPA Frame_MAU → PNG，其餘媒體 → JPG）；
        // format='jpg'/'png'：忽略媒體規則，全部版位統一強制用同一種格式（手動覆蓋）。
        const isSpecItem = !!t.batchRecord?.__multiSizeSync;
        const stemFromTemplateId = flag('export.stemSource', 'outputName') === 'templateId';
        const requestedBaseName = String((stemFromTemplateId ? '' : t.batchRecord?.__outputName) || t.templateId || item.name || '').replace(/\.(png|jpe?g)$/i, '');
        const formatSource = flag('export.formatSource', 'omMedia');
        const itemFormat = (isSpecItem && flag('export.multiSizeForceJpg', false)) ? 'jpg' : (format === 'auto'
          ? (formatSource === 'specTable'
            ? this.resolveSpecFormat(t.batchRecord?.__media || item.project || '', `${t.canvas.width}x${t.canvas.height}`)
            : this.resolveRecommendedFormat(requestedBaseName, t, item))
          : format);
        // mime／ext 在畫完 supersampled 之後才定案（要先掃透明像素，見下方 transparentPng）。
        const wantsJpg = itemFormat === 'jpg' || itemFormat === 'jpeg';
        const ext = wantsJpg ? 'jpg' : 'png';
        // （跨夜／鏡面 export.compressMode='kLimit'）K 數上限來自工單「K數」欄，規則檔寫進 batchRecord.__kLimitBytes。
        const kLimitBytes = Number(t.batchRecord?.__kLimitBytes || 0) || null;
        const sourceRow = t.batchRecord?.__sourceRow;

        if (skipMissingAssets) {
          const missingAssets = this.findMissingVisibleAssets(t, loadedImages);
          if (missingAssets.length) {
            exportResults.push({ name: `${requestedBaseName || 'image'}.${ext}`, status: 'failed', reason: `缺少素材：${missingAssets.join('、')}`, format: ext, kLimitBytes, sourceRow });
            continue;
          }
        }
        // Spec-driven 批次一次可能輸出上百張，限制為 2x 超採樣可大幅降低單張 Canvas backing store
        // （1080x1080：4x 約 75 MB、2x 約 19 MB），避免長批次因原生像素緩衝延遲回收而停住。
        // 最終輸出尺寸仍完全等於 JSON canvas，JPEG 品質搜尋規則也不變。
        // 整合版 export.scaleMode：'fixed4x'（跨夜）全部版位一律 4x。
        const scale = (t.batchRecord?.__multiSizeSync && !fixedScale4x)
          ? Math.min(AppState.exportScale || 4, 2)
          : (AppState.exportScale || 4);

        // 匯出流程：先用超採樣繪製，最後再縮回公版原始尺寸。
        // 這樣下載檔案的寬高會與模板一致，但邊緣與文字抗鋸齒品質會比直接 1x 輸出穩定。
        const supersampled = document.createElement('canvas');
        supersampled.width = Math.round(t.canvas.width * scale);
        supersampled.height = Math.round(t.canvas.height * scale);

        const superCtx = supersampled.getContext('2d', { alpha: true });
        superCtx.save();
        superCtx.scale(scale, scale);
        Renderer.renderSceneTo(superCtx);
        superCtx.restore();

        // （回饋 1）成品有透明像素就改 PNG（手動選全部 JPG／PNG 時不介入）。
        const transparentPng = wantsJpg && shouldForcePngForTransparency(format, supersampled, Math.round(t.canvas.width), Math.round(t.canvas.height));
        const mime = wantsJpg && !transparentPng ? 'image/jpeg' : 'image/png';
        const finalExt = mime === 'image/jpeg' ? 'jpg' : 'png';

        const off = document.createElement('canvas');
        off.width = Math.round(t.canvas.width);
        off.height = Math.round(t.canvas.height);
        // （鏡面 export.whiteFill='jpg'）JPG 用不透明畫布＋白底；PNG 保留透明。
        const jpgWhiteFill = whiteFillMode === 'jpg' && finalExt === 'jpg';
        const c = off.getContext('2d', { alpha: !jpgWhiteFill });
        if ((t.batchRecord?.__multiSizeSync && whiteFillMultiSize) || jpgWhiteFill) {
          c.fillStyle = '#ffffff';
          c.fillRect(0, 0, off.width, off.height);
        }
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = 'high';
        c.drawImage(supersampled, 0, 0, off.width, off.height);

        let blob = null;
        let compressionInfo = null;
        try {
          if (compressMode === 'kLimit') {
            const formatBytes = mirrorDiagnostics ? this.formatBytesMirror : BatchDiagnostics.formatBytes;
            const compression = await this.compressCanvasToLimit(off, mime, kLimitBytes, formatBytes);
            compressionInfo = compression;
            if (compression.ok) {
              blob = compression.blob;
              if (compression.warning && !mirrorDiagnostics) BatchDiagnostics.addExportNote(`${requestedBaseName}：${compression.warning}`);
            } else {
              blob = null;
              if (!mirrorDiagnostics) BatchDiagnostics.addExportNote(`${requestedBaseName}：${compression.reason}（最小可得 ${BatchDiagnostics.formatBytes(compression.smallestBytes)}），已略過不輸出`);
              console.warn('[Export] K 數壓縮失敗:', requestedBaseName, compression.reason);
            }
          } else {
            blob = await new Promise((resolve, reject) => {
              off.toBlob((result) => {
                if (result) resolve(result);
                else reject(new Error('Canvas toBlob returned null'));
              }, mime, 1);
            });
          }
        } catch (error) {
          console.error('[Export] Canvas export failed:', error);
          // （鏡面）失敗寫進診斷報告而不跳視窗。
          if (mirrorDiagnostics) compressionInfo = { ok: false, blob: null, reason: error?.message || 'Canvas 輸出失敗' };
          else alert('圖檔產生失敗：Canvas 可能被本機圖片污染。請重新上傳素材，或使用此版本內建的 assets。');
          blob = null;
        }
        if (!blob && mirrorDiagnostics) {
          exportResults.push({ name: `${requestedBaseName || 'image'}.${finalExt}`, status: 'failed', reason: compressionInfo?.reason || '圖檔產生失敗', format: finalExt, actualBytes: compressionInfo?.smallestBytes || null, kLimitBytes, sourceRow });
        }

        if (blob && isSpecItem && blob.size >= 150000 && compressMode === 'multiSize150k') {
          // Only oversized files are recompressed; keep the highest quality that satisfies <150 KB.
          let low = 0, high = 1, best = null;
          for (let attempt = 0; attempt < 12; attempt += 1) {
            const q = (low + high) / 2;
            const candidate = await this.canvasToBlob(off, 'image/jpeg', q);
            if (candidate.size < 150000) { best = candidate; low = q; } else high = q;
          }
          if (best) blob = best;
        }

        if (blob) {
          const baseStem = requestedBaseName || String(t.templateId || item.name).replace(/\.(png|jpe?g)$/i, '');
          const baseFilename = `${baseStem}.${finalExt}`;
          let zipEntryName;
          if (flag('export.folderStrategy', 'omMedia') === 'specBanner') {
            // 正式BN／KV 系：專案資料夾＋Template|UAC-Pmax-LineLAP 的 bannerN 子資料夾；規格表項目走 __outputRoot/__outputFolder。
            const bannerFolder = this.resolveBannerSubfolderSpec(t.templateId || item.name);
            const projectFolder = String(item.project || '').trim();
            const bannerFirstSegment = bannerFolder ? bannerFolder.split('/')[0] : '';
            const dedupedProject = projectFolder && bannerFirstSegment && projectFolder.toLowerCase() === bannerFirstSegment.toLowerCase() ? '' : projectFolder;
            const specFolder = isSpecItem ? String(t.batchRecord?.__outputFolder || '未分類') : '';
            zipEntryName = isSpecItem
              ? [t.batchRecord?.__outputRoot || '', specFolder, baseFilename].filter(Boolean).join('/')
              : [dedupedProject, bannerFolder, baseFilename].filter(Boolean).join('/');
          } else {
            const archiveFolder = this.resolveArchiveFolder(baseStem, t, item);
            zipEntryName = [archiveFolder, baseFilename].filter(Boolean).join('/');
          }
          const finalEntryName = this.dedupeZipEntryName(files, zipEntryName);
          files.push({ name: finalEntryName, blob });
          exportResults.push({ name: finalEntryName, status: 'ok', format: finalExt, actualBytes: blob.size, kLimitBytes, compression: compressionInfo?.strategy || 'none', warning: compressionInfo?.warning || '', sourceRow });
          // Canvas 的 4x backing store 可能非常大（1080x1080 會超過 70 MB）。批次匯出若不在
          // 每張完成後主動釋放，瀏覽器可能把數十張 Canvas 同時留到 GC，造成記憶體暴增、
          // JSZip 前長時間停頓甚至分頁崩潰。Blob 已建立後即可安全縮成 1x1 釋放像素緩衝區。
          supersampled.width = 0;
          supersampled.height = 0;
          off.width = 0;
          off.height = 0;
          // 每張完成後讓出一次事件迴圈，讓瀏覽器有機會釋放 Canvas／ImageBitmap backing store；
          // 否則大量 4x 畫布連續建立時，即使 JS 參照已消失，原生像素緩衝仍可能延後回收。
          await new Promise((resolve) => setTimeout(resolve, 0));
          // V1.0 開源版：C2C SKBN APP/PC 舊公版的匯出自動切圖已移除。
          // 若未來某公版匯出時需要額外切圖，建議在該公版的 rules/*.rules.js 內提供切圖設定，
          // 由通用的匯出流程讀取設定後執行，而不是在 app.core.js 內寫死檔名規則與像素寬度。
        }
      }

      AppState.activeIndex = currentIndex;
      AppState.template = currentTemplate;
      await TemplateLoader.loadImagesForActiveTemplate();
      App.sync();

      if (mirrorDiagnostics) {
        // （鏡面）診斷報告一律附上；一張都沒成功也照樣產 zip 供檢查。
        files.push({
          name: '診斷報告.txt',
          blob: new Blob([`\uFEFF${this.buildMirrorDiagnosticText(exportResults)}`], { type: 'text/plain;charset=utf-8' }),
        });
        if (!exportResults.some((result) => result.status === 'ok')) alert('沒有任何圖片符合輸出條件；已產生診斷報告供檢查。');
        await ExportBundleExtras.append(files);
        return this.createZip(files);
      }

      if (!files.length) {
        alert('沒有可匯出的圖片，請確認批次預覽已勾選且素材已載入。');
        return null;
      }

      if (flag('export.diagnostics', 'assetSpec') === 'batchDiagnostics') {
        // （跨夜）批次模式一律附上診斷報告（工單解析結果、略過的列、素材警告、K 數壓縮備註）。
        if (AppState.batchMode) {
          const outputRoot = AppState.templates?.[0]?.data?.batchRecord?.__outputRoot;
          const diagnosticText = BatchDiagnostics.text(AppState.batchDiagnostics?.elapsedMs || 0);
          files.push({
            name: `${outputRoot ? `${outputRoot}/` : ''}診斷報告.txt`,
            blob: new Blob([`\uFEFF${diagnosticText}`], { type: 'text/plain;charset=utf-8' }),
          });
        }
      } else if (AppState.batchDiagnostics?.specDriven && window.AssetSpecEngine) {
        const diagnosticText = window.AssetSpecEngine.diagnosticText(AppState.batchDiagnostics, AppState.batchDiagnostics.elapsedMs || 0);
        files.push({ name: `${AppState.templates?.[0]?.data?.batchRecord?.__outputRoot ? AppState.templates[0].data.batchRecord.__outputRoot + '/' : ''}診斷報告.txt`, blob: new Blob([`\uFEFF${diagnosticText}`], { type: 'text/plain;charset=utf-8' }) });
      }
      await ExportBundleExtras.append(files);
      return this.createZip(files);
    },

    // K 數壓縮（移植 18節Tool_跨夜直播宣傳圖 V0.9）
    //   PNG：一律無損全彩輸出，不做減色／索引色，超過上限只發警告，不改動像素。
    //   JPG：品質下限 0.92，在 0.92~1 之間二分搜尋最高可過上限的品質；
    //        壓不到上限時明確回報失敗，不會靜靜輸出品質崩壞的圖。
    async compressCanvasToLimit(canvas, mime, kLimitBytes = null, formatBytes = BatchDiagnostics.formatBytes) {
      const initialQuality = mime === 'image/jpeg' ? 1 : undefined;
      const initialBlob = await this.canvasToBlob(canvas, mime, initialQuality);

      if (mime === 'image/png') {
        const exceedsLimit = !!kLimitBytes && initialBlob.size > kLimitBytes;
        return {
          ok: true,
          blob: initialBlob,
          strategy: 'png-full-colour-lossless',
          warning: exceedsLimit
            ? `PNG 依完整畫質輸出，未套用 K 數壓縮；實際容量 ${formatBytes(initialBlob.size)}，超過上限 ${formatBytes(kLimitBytes)}`
            : '',
        };
      }

      if (!kLimitBytes || initialBlob.size <= kLimitBytes) {
        return { ok: true, blob: initialBlob, strategy: 'original', warning: '' };
      }

      if (mime === 'image/jpeg') {
        const minimumQuality = 0.92;
        let low = minimumQuality;
        let high = 1;
        let best = null;
        let bestQuality = null;
        let smallestBytes = initialBlob.size;
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const quality = (low + high) / 2;
          const candidate = await this.canvasToBlob(canvas, mime, quality);
          smallestBytes = Math.min(smallestBytes, candidate.size);
          if (candidate.size <= kLimitBytes) {
            best = candidate;
            bestQuality = quality;
            low = quality;
          } else {
            high = quality;
          }
        }
        if (best) {
          return { ok: true, blob: best, strategy: `jpeg-quality-${bestQuality.toFixed(3)}`, warning: '' };
        }
        return {
          ok: false,
          smallestBytes,
          reason: `為保護畫質，JPG 不會低於品質 ${minimumQuality.toFixed(2)}；仍超過 ${formatBytes(kLimitBytes)}`,
        };
      }

      return { ok: true, blob: initialBlob, strategy: 'original', warning: '' };
    },

    // （鏡面）自有診斷報告的容量格式（≥100 KB 不帶小數）。
    formatBytesMirror(bytes) {
      const value = Number(bytes || 0);
      if (!value) return '0 KB';
      return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)} KB`;
    },

    // （鏡面 export.diagnostics='mirror'）逐張輸出結果＋略過列＋解析警告＋素材診斷。
    buildMirrorDiagnosticText(exportResults = []) {
      const sheetName = AppState.batchDiagnostics?.sheetName || DOM.excelSheetSelect?.value || '未指定';
      const lines = [
        `${flag('export.diagnosticsTitle', '25節鏡面')}－診斷報告`,
        `Excel 分頁：${sheetName}`,
        `產生時間：${new Date().toLocaleString('zh-TW')}`,
        '',
        '【輸出結果】',
      ];

      if (!exportResults.length) lines.push('沒有勾選或產生任何圖片。');
      exportResults.forEach((result) => {
        const row = result.sourceRow ? `第 ${result.sourceRow} 列｜` : '';
        const limit = result.kLimitBytes ? `｜上限 ${this.formatBytesMirror(result.kLimitBytes)}` : '｜無 K 數限制';
        if (result.status === 'ok') {
          const warning = result.warning ? `｜警告：${result.warning}` : '';
          lines.push(`成功｜${row}${result.name}｜${String(result.format || '').toUpperCase()}｜${this.formatBytesMirror(result.actualBytes)}${limit}${warning}`);
        } else {
          const smallest = result.actualBytes ? `｜最小 ${this.formatBytesMirror(result.actualBytes)}` : '';
          lines.push(`失敗｜${row}${result.name}｜${result.reason || '未知錯誤'}${smallest}${limit}`);
        }
      });

      const unmatched = AppState.unmatchedBatchItems || [];
      lines.push('', '【略過／未匹配】');
      if (!unmatched.length && !(AppState.batchDiagnostics?.skippedRows || []).length) lines.push('無');
      unmatched.forEach((item) => lines.push(`${item.project ? `[${item.project}] ` : ''}${item.name || '未命名'}：${item.reason || '找不到對應公版'}`));
      (AppState.batchDiagnostics?.skippedRows || []).forEach((item) => lines.push(`第 ${item.row || '?'} 列${item.name ? ` ${item.name}` : ''}：${item.reason || '已略過'}`));

      const warnings = AppState.batchDiagnostics?.warnings || [];
      lines.push('', '【解析警告】');
      if (!warnings.length) lines.push('無');
      warnings.forEach((warning) => lines.push(String(warning)));

      const missingDiagnostics = (AppState.templates || []).flatMap((item) => {
        const sourceRow = item?.data?.batchRecord?.__sourceRow || '?';
        return (item?.data?.batchDiagnostics || [])
          .filter((diagnostic) => String(diagnostic.status || '').startsWith('missing'))
          .map((diagnostic) => `第 ${sourceRow} 列 ${item.name}：${diagnostic.field || '素材'} ${diagnostic.value || ''} ${diagnostic.status}`.trim());
      });
      lines.push('', '【素材診斷】');
      if (!missingDiagnostics.length) lines.push('無');
      missingDiagnostics.forEach((message) => lines.push(message));

      return lines.join('\r\n');
    },

    async canvasToBlob(canvas, mime = 'image/png', quality = 1) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Canvas toBlob returned null'));
        }, mime, quality);
      });
    },



    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename, rel: 'noopener' });
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); } catch (_) {} URL.revokeObjectURL(url); }, 1200);
    },

    exportJSON() {
      const t = AppState.template;
      if (!t) return;
      TextEditor.commit();
      const snapshot = SnapshotManager.createSnapshot(t);
      if (!snapshot) return;
      this.downloadBlob(
        new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' }),
        `${t.templateId || 'template'}_edited.json`
      );
    },

    async createZip(files) {
      // 優先使用 JSZip，與 KV_Resize_System_3.0.html 的穩定打包流程一致。
      if (window.JSZip) {
        const zip = new JSZip();
        for (const file of files) {
          zip.file(file.name, file.blob);
        }
        return zip.generateAsync({
          type: 'blob',
          compression: 'STORE',
          streamFiles: true,
          platform: 'UNIX'
        });
      }

      // 離線備援：原生 no-compression ZIP。
      const encoder = new TextEncoder();
      const chunks = [];
      const central = [];
      let offset = 0;

      const u16 = (n) => new Uint8Array([n & 255, (n >>> 8) & 255]);
      const u32 = (n) => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
      const sizeOf = (parts) => parts.reduce((sum, p) => sum + p.length, 0);
      const crcTable = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
          table[i] = c >>> 0;
        }
        return table;
      })();
      const crc32 = (data) => {
        let c = 0xffffffff;
        for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 255] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
      };

      for (const file of files) {
        const name = encoder.encode(file.name);
        const data = new Uint8Array(await file.blob.arrayBuffer());
        const crc = crc32(data);

        const local = [
          u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
          u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
          name, data
        ];
        chunks.push(...local);

        const centralHeader = [
          u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
          u32(crc), u32(data.length), u32(data.length), u16(name.length),
          u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name
        ];
        central.push(...centralHeader);
        offset += sizeOf(local);
      }

      const centralOffset = offset;
      const centralSize = sizeOf(central);
      const end = [
        u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
        u32(centralSize), u32(centralOffset), u16(0)
      ];

      return new Blob([...chunks, ...central, ...end], { type: 'application/zip' });
    },
  };
  // ── ExportManager：A 系實作（正式BN V0.8 為底）──
  const ExportManager_A = {
    async askImageFormat() {
      return new Promise((resolve) => {
        const old = document.querySelector('.v3-modal-backdrop');
        if (old) old.remove();

        const wrap = document.createElement('div');
        wrap.className = 'v3-modal-backdrop';
        wrap.innerHTML = `
          <div class="v3-modal">
            <h3>下載圖片</h3>
            <ul class="v3-modal-notes">
              <li>目前勾選的版位以 4x 高解析輸出，打包成一個 ZIP。</li>
              <li>「依工單規則」：格式依工單「素材規格表」與規則檔決定，沒寫的用 JPG；成品有透明像素會自動改 PNG。</li>
              <li>正式／暖身BN 依來源公版分資料夾（01_頭巾／02_HBN／03_SKBN/APP…）、暖正MS 依案型歸檔。</li>
              <li>「全部 PNG」／「全部 JPG」：不看工單規則，所有版位統一用同一種格式。</li>
              <li>ZIP 內另附「存檔」（可載回繼續調整）與「診斷報告」。</li>
            </ul>
            <div class="v3-modal-actions">
              <button class="primary-btn" data-format="auto">依工單規則（推薦）</button>
              <button class="secondary-btn" data-format="png">全部 PNG</button>
              <button class="secondary-btn" data-format="jpg">全部 JPG</button>
            </div>
          </div>
        `;
        document.body.appendChild(wrap);

        wrap.addEventListener('click', (event) => {
          if (event.target === wrap) {
            wrap.remove();
            resolve(null);
            return;
          }

          const btn = event.target.closest('[data-format]');
          if (!btn) return;

          const format = btn.dataset.format;
          wrap.remove();
          resolve(format);
        });
      });
    },

    async export(format = 'auto') {
      const zipBlob = await this.buildZip(format, false);
      if (!zipBlob) return;
      this.downloadBlob(zipBlob, `${flag('export.zipPrefix', '25SaleTool')}_${AppState.template?.templateId || 'image'}_${Date.now()}.zip`);
    },

    async exportVisibleBatch(format = 'auto') {
      const zipBlob = await this.buildZip(format, true);
      if (!zipBlob) return;
      this.downloadBlob(zipBlob, AppState.batchDiagnostics?.specDriven ? '25節Tool_network_輸出.zip' : `${flag('export.zipPrefix', '25SaleTool')}_batch_${Date.now()}.zip`);
    },

    // 解析 Excel「素材規格表」分頁，取得「媒體+尺寸」→ 格式（jpg/png）的對照表，只解析一次、
    // 快取在 AppState 上。媒體名稱在規格表跟工單/模板內部的命名習慣常常對不上（例如規格表寫
    // "Pmax&UAC"，模板內部叫 "UAC/Pmax/LineLAP"），所以同時建立「媒體+尺寸」精確對照，跟
    // 「尺寸」寬鬆對照（只有在同一個尺寸、規格表裡所有列都是同一種格式時才會用寬鬆對照，
    // 避免同尺寸但格式不同的狀況被誤判）。
    getMaterialSpecTable() {
      if (AppState._materialSpecTable) return AppState._materialSpecTable;
      const bySizeAndMedia = new Map();
      const sizeFormats = new Map();
      const normMedia = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
      const normSize = (value) => String(value || '').toLowerCase().replace(/[×＊*\s]+/g, 'x');

      const wb = AppState.excelWorkbook;
      const sheetName = wb?.SheetNames?.find((name) => name.includes('素材規格表'));
      const sheet = sheetName ? wb.Sheets[sheetName] : null;
      if (sheet && window.XLSX) {
        const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        rows.slice(1).forEach((row) => {
          const media = String(row[0] || '').trim();
          const kLimitText = String(row[1] || '');
          const size = normSize(row[2] || '');
          if (!media || !size) return;
          const format = /png/i.test(kLimitText) ? 'png' : (/jpe?g/i.test(kLimitText) ? 'jpg' : null);
          if (!format) return;
          bySizeAndMedia.set(`${normMedia(media)}|${size}`, format);
          if (!sizeFormats.has(size)) sizeFormats.set(size, new Set());
          sizeFormats.get(size).add(format);
        });
      }
      const bySizeOnly = new Map();
      sizeFormats.forEach((formats, size) => { if (formats.size === 1) bySizeOnly.set(size, [...formats][0]); });

      AppState._materialSpecTable = { bySizeAndMedia, bySizeOnly, normMedia, normSize };
      return AppState._materialSpecTable;
    },
    // 找不到規格時預設為 JPG（符合你的規則：規格表沒寫就用 JPG）。
    resolveSpecFormat(media, size) {
      const { bySizeAndMedia, bySizeOnly, normMedia, normSize } = this.getMaterialSpecTable();
      const key = `${normMedia(media)}|${normSize(size)}`;
      return bySizeAndMedia.get(key) || bySizeOnly.get(normSize(size)) || 'jpg';
    },
    // Template_bannerX_尺寸、UAC-Pmax-LineLAP_bannerX_尺寸 這兩種輸出檔名，依 bannerX 另外分子
    // 資料夾（例如 Template/banner1/Template_banner1_1200x1200.jpg）。其他媒體的資料夾邏輯不變。
    resolveBannerSubfolder(baseFilename) {
      const match = /^(Template|UAC-Pmax-LineLAP)[_-]?(banner\d+)[_-]/i.exec(baseFilename);
      if (!match) return null;
      return `${match[1]}/${match[2].toLowerCase()}`;
    },

    async buildZip(format = 'auto', onlyVisible = true) {
      TextEditor.commit();
      Interaction.finalizeActiveTransform?.();
      const allTemplateEntries = AppState.templates.map((t, index) => ({ ...t, index }));
      // （暖正MS V0.5）「依規格表」時依工單「上蓋→下蓋」順序預先規劃資料夾與編號；
      // 只有 export.folderStrategy 以 msArchive 開頭且已載入 WorkOrderExportArchivePlanner 的分類會有計畫。
      const workOrderArchivePlan = format === 'auto' && String(flag('export.folderStrategy', 'exportCfgSpecBanner')).startsWith('msArchive')
        ? (window.WorkOrderExportArchivePlanner?.build?.(allTemplateEntries) || [])
        : [];
      const selected = onlyVisible
        ? allTemplateEntries.filter((t) => t.visible && TemplateFilter.isMatch(t))
        : [{ ...AppState.templates[AppState.activeIndex], index: AppState.activeIndex }];
      if (onlyVisible && !selected.length) {
        alert('目前沒有勾選任何批次預覽圖片，請至少勾選一張再下載。');
        return null;
      }
      const sourceTemplateFolders = format === 'auto' && flag('export.folderStrategy', 'exportCfgSpecBanner') === 'sourceTemplate';

      const files = [];
      for (const item of selected) {
        // 第38題：匯出永遠使用正式 Template 的 readonly snapshot，不切換 AppState、不重跑 Rule/Layout/Preset。
        const t = clone(item.data);
        const images = await TemplateLoader.loadImagesForTemplate(t, { project: item.project });
        const scale = t.batchRecord?.__multiSizeSync ? Math.min(AppState.exportScale || 4, 2) : (AppState.exportScale || 4);
        const supersampled = document.createElement('canvas');
        supersampled.width = Math.round(t.canvas.width * scale);
        supersampled.height = Math.round(t.canvas.height * scale);
        const superCtx = supersampled.getContext('2d', { alpha: true });
        superCtx.save();
        superCtx.scale(scale, scale);
        Renderer.renderSceneTo(superCtx, t, images, { showMissing: false, showGuides: false });
        superCtx.restore();

        const off = document.createElement('canvas');
        off.width = Math.round(t.canvas.width);
        off.height = Math.round(t.canvas.height);
        const c = off.getContext('2d', { alpha: true });
        if (t.batchRecord?.__multiSizeSync) { c.fillStyle = '#ffffff'; c.fillRect(0, 0, off.width, off.height); }
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = 'high';
        c.drawImage(supersampled, 0, 0, off.width, off.height);

        const isSpecItem = !!t.batchRecord?.__multiSizeSync;
        // 2026-08-13：各公版 Rule 可宣告 exportConfig（format / folder / perItemSubfolder / slices）。
        // 「依規格表(推薦)」（format='auto'）時 family 設定優先；手動指定 png/jpg 仍強制全體。
        // ruleFamily 只在特殊分流路由存在時寫入，一般批次項需以公版身分反查（與 5951 preset 檢查同一套備援）。
        const exportFamilyId = t.ruleFamily || t.sheetTemplateRoute?.family || CapsuleRuleEngine.getTemplateFamily(t) || '';
        const exportCfg = exportFamilyId
          ? ((window.TemplateRuleManager || window.TemplateRuleRegistry)?.get?.(exportFamilyId)?.exportConfig || null)
          : null;
        const itemFormat = isSpecItem ? 'jpg' : (format === 'auto'
          ? (exportCfg?.format
            || this.resolveSpecFormat(t.batchRecord?.__media || item.project || '', `${t.canvas.width}x${t.canvas.height}`))
          : format);
        // （回饋 1）成品有透明像素就改 PNG（off 已是 1x 成品且尚未鋪白底，直接掃它）。
        const transparentPng = (itemFormat === 'jpg' || itemFormat === 'jpeg') && format === 'auto'
          && flag('export.transparentToPng', true) && !isSpecItem && hasTransparentPixels(off);
        const mime = (itemFormat === 'jpg' || itemFormat === 'jpeg') && !transparentPng ? 'image/jpeg' : 'image/png';
        const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
        let blob = null;
        try { blob = await this.canvasToBlob(off, mime, 1); }
        catch (error) {
          console.error('[Export] Canvas export failed:', error);
          alert('圖檔產生失敗：Canvas 可能被本機圖片污染。請重新上傳素材後再試一次。');
        }
        if (blob && isSpecItem && blob.size >= 150000) {
          let low = 0, high = 1, best = null;
          for (let attempt = 0; attempt < 12; attempt += 1) {
            const q = (low + high) / 2;
            const candidate = await this.canvasToBlob(off, 'image/jpeg', q);
            if (candidate.size < 150000) { best = candidate; low = q; } else high = q;
          }
          if (best) blob = best;
        }
        if (blob) {
          let filenameStem = String(t.templateId || item.name).replace(/\.(png|jpe?g)$/i, '');
          // 第14題：多尺寸輸出固定帶尺寸；若名稱本身已含尺寸則不重複追加。
          const sizeToken = `${t.canvas.width}x${t.canvas.height}`;
          if (t.sheetTemplateRoute?.multiOutput === true && !filenameStem.toLowerCase().includes(sizeToken.toLowerCase())) filenameStem += `_${sizeToken}`;
          const archiveMeta = workOrderArchivePlan[item.index] || null;
          const archiveFilenameStem = archiveMeta?.grouped ? archiveMeta.fileStem : filenameStem;
          const baseFilename = `${archiveFilenameStem}.${ext}`;

          // （暖正MS V0.5）工單中由上蓋開始、直到第一個下蓋（含）為同一資料夾。
          // 資料夾與群組內檔名都以完整工單順序預先規劃，因此取消勾選部分縮圖也不會改變原始編號。
          // 若項目不在任何上蓋→下蓋區段內，保留既有 exportConfig / project / banner 歸檔方式。
          if (archiveMeta?.grouped) {
            const folderParts = [archiveMeta.folderName];
            files.push({ name: [...folderParts, baseFilename].join('/'), blob });
            if (Array.isArray(exportCfg?.slices) && exportCfg.slices.length) {
              for (const slice of exportCfg.slices) {
                const sliceWidth = Math.max(1, Math.round(Number(slice.width) || 0));
                const sliceX = Math.max(0, Math.round(Number(slice.x) || 0));
                const sub = document.createElement('canvas');
                sub.width = sliceWidth;
                sub.height = off.height;
                const subCtx = sub.getContext('2d', { alpha: true });
                if (mime === 'image/jpeg') { subCtx.fillStyle = '#ffffff'; subCtx.fillRect(0, 0, sub.width, sub.height); }
                subCtx.drawImage(off, sliceX, 0, sliceWidth, off.height, 0, 0, sliceWidth, off.height);
                try {
                  const sliceBlob = await this.canvasToBlob(sub, mime, 1);
                  files.push({ name: [...folderParts, `${archiveFilenameStem}_${slice.suffix}.${ext}`].join('/'), blob: sliceBlob });
                } catch (error) {
                  console.error('[Export] 切圖失敗:', archiveFilenameStem, slice.suffix, error);
                }
                sub.width = sub.height = 0;
              }
            }
          } else if (sourceTemplateFolders) {
            // （回饋 2）export.folderStrategy='sourceTemplate'：依「來源公版編號＋主名」分資料夾（01_頭巾／02_HBN／03_DD Card…），
            // SKBN 系收束成 NN_SKBN/APP、NN_SKBN/PC；規則的 slices 切圖照樣放同一夾。
            const folderParts = this.resolveSourceTemplateFolder(t, item);
            files.push({ name: [...folderParts, baseFilename].join('/'), blob });
            await this.appendSlices(files, folderParts, filenameStem, ext, mime, off, exportCfg);
          } else if (exportCfg?.folder) {
            // 2026-08-13：依版位分資料夾（Rule 的 exportConfig.folder），
            // perItemSubfolder=true 時每組再建子資料夾（例：03_SKBN_APP/SKBN_APP_01/）。
            const folderParts = [exportCfg.folder];
            if (exportCfg.perItemSubfolder === true) folderParts.push(filenameStem);
            files.push({ name: [...folderParts, baseFilename].join('/'), blob });
            await this.appendSlices(files, folderParts, filenameStem, ext, mime, off, exportCfg);
          } else {
            const bannerFolder = this.resolveBannerSubfolder(t.templateId || item.name);
            const projectFolder = String(item.project || '').trim();
            const bannerFirstSegment = bannerFolder ? bannerFolder.split('/')[0] : '';
            const dedupedProject = projectFolder && bannerFirstSegment && projectFolder.toLowerCase() === bannerFirstSegment.toLowerCase() ? '' : projectFolder;
            const specFolder = isSpecItem ? String(t.batchRecord?.__outputFolder || '未分類') : '';
            const zipEntryName = isSpecItem
              ? [t.batchRecord?.__outputRoot || '', specFolder, baseFilename].filter(Boolean).join('/')
              : [dedupedProject, bannerFolder, baseFilename].filter(Boolean).join('/');
            files.push({ name: zipEntryName, blob });
          }
        }
        supersampled.width = supersampled.height = off.width = off.height = 0;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (!files.length) {
        alert('沒有可匯出的圖片，請確認批次預覽已勾選且素材已載入。');
        return null;
      }
      if (AppState.batchDiagnostics?.specDriven && window.AssetSpecEngine) {
        const diagnosticText = window.AssetSpecEngine.diagnosticText(AppState.batchDiagnostics, AppState.batchDiagnostics.elapsedMs || 0);
        files.push({ name: `${AppState.templates?.[0]?.data?.batchRecord?.__outputRoot ? AppState.templates[0].data.batchRecord.__outputRoot + '/' : ''}診斷報告.txt`, blob: new Blob([`\uFEFF${diagnosticText}`], { type: 'text/plain;charset=utf-8' }) });
      }
      await ExportBundleExtras.append(files);
      return this.createZip(files);
    },

    /** 規則的 exportConfig.slices = [{ suffix, x, width }...]：從 1x 成品切出子圖，放在同一資料夾。 */
    async appendSlices(files, folderParts, filenameStem, ext, mime, off, exportCfg) {
      if (!Array.isArray(exportCfg?.slices) || !exportCfg.slices.length) return;
      for (const slice of exportCfg.slices) {
        const sliceWidth = Math.max(1, Math.round(Number(slice.width) || 0));
        const sliceX = Math.max(0, Math.round(Number(slice.x) || 0));
        const sub = document.createElement('canvas');
        sub.width = sliceWidth;
        sub.height = off.height;
        const subCtx = sub.getContext('2d', { alpha: true });
        if (mime === 'image/jpeg') { subCtx.fillStyle = '#ffffff'; subCtx.fillRect(0, 0, sub.width, sub.height); }
        subCtx.drawImage(off, sliceX, 0, sliceWidth, off.height, 0, 0, sliceWidth, off.height);
        try {
          const sliceBlob = await this.canvasToBlob(sub, mime, 1);
          files.push({ name: [...folderParts, `${filenameStem}_${slice.suffix}.${ext}`].join('/'), blob: sliceBlob });
        } catch (error) {
          console.error('[Export] 切圖失敗:', filenameStem, slice.suffix, error);
        }
        sub.width = sub.height = 0;
      }
    },
    /**
     * （回饋 2）來源公版 → 資料夾：取公版 id 的「編號_第一段主名」。
     *   01_頭巾_暖身 → 01_頭巾；03_DD Card → 03_DD Card；07_AR Large BN_保護文字款 → 07_AR Large BN；
     *   10_Seller BN_高單券通用版_商城(1k-4k) → 10_Seller BN；11_外部team宣傳素材_1125x360 → 11_外部team宣傳素材。
     *   主名含 SKBN 的再依 APP／PC 分子資料夾：03_SKBN_APP → 03_SKBN/APP；06_SKBN NUZ_PC → 06_SKBN NUZ/PC。
     * 沒有編號前綴的公版就用主名；完全取不到就退回「未分類」。
     */
    resolveSourceTemplateFolder(template, item) {
      const sourceId = String(SnapshotManager.sourceTemplateId(template) || template?.templateId || item?.name || '').trim();
      const stripped = sourceId.replace(/\.json$/i, '');
      const match = /^(\d+)[_\s-]+(.+)$/.exec(stripped);
      const number = match ? match[1] : '';
      const rest = match ? match[2] : stripped;
      const mainName = String(rest.split('_')[0] || '').trim();
      if (!mainName) return ['未分類'];
      const folder = number ? `${number}_${mainName}` : mainName;
      if (/skbn/i.test(mainName)) {
        const device = /(^|[_\s])PC([_\s]|$)/i.test(rest) ? 'PC' : /(^|[_\s])APP([_\s]|$)/i.test(rest) ? 'APP' : '';
        return device ? [folder, device] : [folder];
      }
      return [folder];
    },
    async canvasToBlob(canvas, mime = 'image/png', quality = 1) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Canvas toBlob returned null'));
        }, mime, quality);
      });
    },



    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename, rel: 'noopener' });
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); } catch (_) {} URL.revokeObjectURL(url); }, 1200);
    },

    exportJSON() {
      const t = AppState.template;
      if (!t) return;
      this.downloadBlob(
        new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' }),
        `${t.templateId || 'template'}_edited.json`
      );
    },

    async createZip(files) {
      // 優先使用 JSZip，與 KV_Resize_System_3.0.html 的穩定打包流程一致。
      if (window.JSZip) {
        const zip = new JSZip();
        for (const file of files) {
          zip.file(file.name, file.blob);
        }
        return zip.generateAsync({
          type: 'blob',
          compression: 'STORE',
          streamFiles: true,
          platform: 'UNIX'
        });
      }

      // 離線備援：原生 no-compression ZIP。
      const encoder = new TextEncoder();
      const chunks = [];
      const central = [];
      let offset = 0;

      const u16 = (n) => new Uint8Array([n & 255, (n >>> 8) & 255]);
      const u32 = (n) => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
      const sizeOf = (parts) => parts.reduce((sum, p) => sum + p.length, 0);
      const crcTable = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
          table[i] = c >>> 0;
        }
        return table;
      })();
      const crc32 = (data) => {
        let c = 0xffffffff;
        for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 255] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
      };

      for (const file of files) {
        const name = encoder.encode(file.name);
        const data = new Uint8Array(await file.blob.arrayBuffer());
        const crc = crc32(data);

        const local = [
          u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
          u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
          name, data
        ];
        chunks.push(...local);

        const centralHeader = [
          u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
          u32(crc), u32(data.length), u32(data.length), u16(name.length),
          u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name
        ];
        central.push(...centralHeader);
        offset += sizeOf(local);
      }

      const centralOffset = offset;
      const centralSize = sizeOf(central);
      const end = [
        u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
        u32(centralSize), u32(centralOffset), u16(0)
      ];

      return new Blob([...chunks, ...central, ...end], { type: 'application/zip' });
    },
  };
  const ExportManager = pickLineage(ExportManager_A, ExportManager_B);
  const TemplateFilter = {
    allValue: 'All',

    normalize(value) {
      // 使用與 normStr 一致的基礎正規化，額外去除版本數字尾綴
      return normStr(String(value || '')
        .replace(/\.template\.json$/i, '')
        .replace(/\.generated$/i, '')
        .replace(/[_\-]+\d+$/i, ''));
    },

    escape: escapeHtml,

    getFamilyName(item = {}) {
      const data = item.data || item;
      const raw = [
        data?.batchSourceName,
        data?.source?.psdName,
        data?.templateId,
        item.name,
        item.file,
      ].filter(Boolean).join(' ');
      const normalized = this.normalize(raw);
      if (!normalized) return '未分類';
      return String(data?.batchSourceName || data?.templateId || item.name || item.file || '未分類')
        .replace(/\.template\.json$/i, '')
        .replace(/\.json$/i, '')
        .replace(/[_\-]+\d+$/i, '')
        .replace(/^\d+[_\-\s]+/, '')
        .trim() || '未分類';
    },

    getGroupKey(name) {
      return this.normalize(name) || 'uncategorized';
    },

    ensureGroupState(groupKey, defaultOpen = false) {
      if (!AppState.templateGroupsOpen) AppState.templateGroupsOpen = {};
      if (!(groupKey in AppState.templateGroupsOpen)) AppState.templateGroupsOpen[groupKey] = defaultOpen;
      return AppState.templateGroupsOpen[groupKey];
    },

    getOptions() {
      const names = [];
      (AppState.templates || []).forEach((item) => {
        const name = this.getFamilyName(item);
        if (name && !names.includes(name)) names.push(name);
      });
      return [this.allValue, ...names];
    },

    isMatch(item) {
      const filter = AppState.templateFilter || this.allValue;
      return filter === this.allValue || this.getFamilyName(item) === filter;
    },

    getVisibleEntries(items = AppState.templates) {
      return (items || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => this.isMatch(item));
    },

    groupEntries(entries = this.getVisibleEntries()) {
      const groups = [];
      const map = new Map();
      entries.forEach((entry) => {
        const title = this.getFamilyName(entry.item);
        const key = this.getGroupKey(title);
        if (!map.has(key)) {
          const group = { key, title, entries: [] };
          map.set(key, group);
          groups.push(group);
          this.ensureGroupState(key, false);
        }
        map.get(key).entries.push(entry);
      });
      return groups;
    },

    render() {
      if (!DOM.templateFilter) return;
      const options = this.getOptions();
      if (!options.includes(AppState.templateFilter)) AppState.templateFilter = this.allValue;
      DOM.templateFilter.innerHTML = options
        .map((name) => `<option value="${this.escape(name)}" ${name === AppState.templateFilter ? 'selected' : ''}>${this.escape(name)}</option>`)
        .join('');
      DOM.templateFilter.value = AppState.templateFilter;
    },

    renderTree() {
      const groups = this.groupEntries();
      if (!groups.length) return '<div class="template-empty">目前沒有符合條件的公版</div>';
      return groups.map((group) => {
        const isOpen = this.ensureGroupState(group.key, false);
        const activeCount = group.entries.filter(({ index }) => index === AppState.activeIndex).length;
        const rows = group.entries.map(({ item: template, index }) => `
          <div class="templateItem template-tree-item ${index === AppState.activeIndex ? 'active' : ''}" data-index="${index}">
            <span class="template-tree-bullet"></span>
            <span class="template-name-only">${this.escape(template.name)}</span>
          </div>
        `).join('');
        return `
          <div class="template-group ${isOpen ? 'open' : 'collapsed'} ${activeCount ? 'has-active' : ''}" data-group-key="${this.escape(group.key)}">
            <button type="button" class="template-group-header" data-group-key="${this.escape(group.key)}" aria-expanded="${isOpen ? 'true' : 'false'}">
              <span class="template-group-icon">${isOpen ? '⌄' : '›'}</span>
              <span class="template-group-title">${this.escape(group.title)}</span>
              <small>${group.entries.length}</small>
            </button>
            <div class="template-group-body">${isOpen ? rows : ''}</div>
          </div>
        `;
      }).join('');
    },

    async apply(value) {
      AppState.templateFilter = value || this.allValue;
      AppState.templateGroupsOpen = {};
      this.render();
      const entries = this.getVisibleEntries();

      if (entries.length && !this.isMatch(AppState.templates[AppState.activeIndex])) {
        await TemplateList.select(entries[0].index);
      } else {
        TemplateList.render();
      }

      if (window.BatchManager) {
        BatchManager.renderBatchUI();
        if (AppState.batchMode) await BatchManager.renderPreviewGrid({ revealWhenDone: true });
        BatchManager.markActiveThumb();
      }
    },

    toggleGroup(groupKey) {
      if (!groupKey) return;
      if (!AppState.templateGroupsOpen) AppState.templateGroupsOpen = {};
      AppState.templateGroupsOpen[groupKey] = !AppState.templateGroupsOpen[groupKey];
      TemplateList.render();
    },
  };
  // ── TemplateList：B 系實作（外廣 wave1 V0.5 原文）──
  // ── TemplateList：B 系實作（外廣 wave1 V0.5 原文）──
  const TemplateList_B = {
    render() {
      if (!DOM.templateList) return;
      TemplateFilter.render();
      DOM.templateList.innerHTML = TemplateFilter.renderTree();
    },
    async select(index) {
      if (!AppState.templates[index]) return;
      AppState.activeIndex = index;
      AppState.template = AppState.templates[index].data;
      AppState.selectedLayers = [];
      try { await TemplateLoader.loadImagesForActiveTemplate(); }
      catch (error) { console.warn('[TemplateList] 圖片載入逾時或失敗，仍繼續渲染:', error); }
      App.sync();
      if (AppState.batchMode && window.BatchManager) {
        BatchManager.renderBatchUI();
        BatchManager.markActiveThumb();
      }
    },
    toggleVisible(index, checked) { AppState.templates[index].visible = checked; this.render(); },
  };
  // ── TemplateList：A 系實作（正式BN V0.8 為底）──
  const TemplateList_A = {
    render() {
      if (!DOM.templateList) return;
      TemplateFilter.render();
      DOM.templateList.innerHTML = TemplateFilter.renderTree();
    },
    async select(index) {
      if (!AppState.templates[index]) return;
      // Template 清單與批次縮圖共用同一套切換安全規則：先收尾原圖，再讓最新 selection revision 勝出。
      TextEditor.commit();
      Interaction.finalizeActiveTransform?.();
      const revision = ++AppState.selectionRevision;
      AppState.activeIndex = index;
      AppState.template = AppState.templates[index].data;
      AppState.selectedLayers = [];
      AppState.hoverLayer = null;
      try {
        const images = await TemplateLoader.loadImagesForTemplate(AppState.template, { project: AppState.templates[index].project });
        if (revision !== AppState.selectionRevision || AppState.activeIndex !== index) return;
        AppState.images = images;
      }
      catch (error) {
        if (revision !== AppState.selectionRevision) return;
        console.warn('[TemplateList] 圖片載入逾時或失敗，仍繼續渲染:', error);
      }
      if (revision !== AppState.selectionRevision || AppState.activeIndex !== index) return;
      App.sync();
      if (AppState.batchMode && window.BatchManager) {
        BatchManager.renderBatchUI();
        BatchManager.markActiveThumb();
      }
    },
    toggleVisible(index, checked) { AppState.templates[index].visible = checked; this.render(); },
  };
  const TemplateList = pickLineage(TemplateList_A, TemplateList_B);
  const LoadingOverlay = {
    ensure() {
      let el = document.getElementById('assetLoadingOverlay');
      if (el) return el;
      el = document.createElement('div');
      el.id = 'assetLoadingOverlay';
      el.className = 'asset-loading-overlay hidden';
      el.innerHTML = `
        <div class="asset-loading-card">
          <div class="asset-loading-title">素材載入中</div>
          <div class="asset-loading-text" id="assetLoadingText">準備載入素材...</div>
          <div class="asset-loading-bar"><span id="assetLoadingBar"></span></div>
          <div class="asset-loading-percent" id="assetLoadingPercent">0%</div>
        </div>`;
      document.body.appendChild(el);
      return el;
    },
    // percent 可以省略（undefined/null）：代表沒有實際進度可算（例如匯出下載、讀取資料夾），
    // 這時顯示不確定進度動畫（進度條來回滑動），而不是卡在 0% 看起來像當掉。
    show(message = '準備載入素材...', percent) {
      const el = this.ensure();
      el.classList.remove('hidden');
      // 下一幀再加 is-open，確保 CSS transition 會確實觸發（避免同一 tick 內加 class 被瀏覽器合併掉）。
      requestAnimationFrame(() => el.classList.add('is-open'));
      this.update(percent, message);
    },
    update(percent, message = '') {
      const el = this.ensure();
      const pct = percent === undefined || percent === null ? null : Math.max(0, Math.min(100, Math.round(percent)));
      const text = document.getElementById('assetLoadingText');
      const bar = document.getElementById('assetLoadingBar');
      const label = document.getElementById('assetLoadingPercent');
      const card = el.querySelector('.asset-loading-card');
      if (text && message) text.textContent = message;
      card?.classList.toggle('is-indeterminate', pct === null);
      if (pct === null) {
        if (label) label.textContent = '';
      } else {
        if (bar) bar.style.width = `${pct}%`;
        if (label) label.textContent = `${pct}%`;
      }
    },
    hide() {
      const el = this.ensure();
      this.update(100, '素材載入完成');
      el.classList.remove('is-open');
      setTimeout(() => el.classList.add('hidden'), 260);
    },

    // ── 開機時的「公版/規則/素材」三階段 Loading 浮動視窗 ──
    ensureStartup() {
      let el = document.getElementById('startupLoadingOverlay');
      if (el) return el;
      el = document.createElement('div');
      el.id = 'startupLoadingOverlay';
      el.className = 'startup-loading-overlay';
      el.innerHTML = `
        <div class="startup-loading-card">
          <div class="startup-loading-title">載入中...</div>
          <div class="startup-loading-row">
            <span class="startup-loading-label">公版</span>
            <span class="startup-loading-count" id="startupTemplatesCount">0 / 0</span>
          </div>
          <div class="startup-loading-row">
            <span class="startup-loading-label">規則</span>
            <span class="startup-loading-count" id="startupRulesCount">0 / 0</span>
          </div>
          <div class="startup-loading-row">
            <span class="startup-loading-label">素材</span>
            <span class="startup-loading-count" id="startupAssetsCount">0 / 0</span>
          </div>
          <div class="startup-loading-bar"><span id="startupLoadingBar"></span></div>
          <div class="startup-loading-percent" id="startupLoadingPercent">0%</div>
          <button type="button" class="startup-loading-ok-btn hidden" id="startupLoadingOkBtn">OK</button>
        </div>`;
      document.body.appendChild(el);
      document.getElementById('startupLoadingOkBtn')?.addEventListener('click', () => this.hideStartup());
      return el;
    },
    showStartup() {},
    updateStartup({ templatesLoaded = 0, templatesTotal = 0, rulesLoaded = 0, rulesTotal = 0, assetsLoaded = 0, assetsTotal = 0 } = {}) {
      return;
      this.ensureStartup();
      const setCount = (id, loaded, total) => { const el = document.getElementById(id); if (el) el.textContent = `${loaded} / ${total}`; };
      setCount('startupTemplatesCount', templatesLoaded, templatesTotal);
      setCount('startupRulesCount', rulesLoaded, rulesTotal);
      setCount('startupAssetsCount', assetsLoaded, assetsTotal);

      const totalUnits = templatesTotal + rulesTotal + assetsTotal;
      const doneUnits = templatesLoaded + rulesLoaded + assetsLoaded;
      const pct = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 100;
      const bar = document.getElementById('startupLoadingBar');
      const label = document.getElementById('startupLoadingPercent');
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      if (label) label.textContent = `${Math.max(0, Math.min(100, pct))}%`;
    },
    finishStartup() {},
    hideStartup() {
      const el = document.getElementById('startupLoadingOverlay');
      el?.classList.add('startup-loading-fade-out');
      setTimeout(() => el?.remove(), 220);
    },
  };



  // V4.17: BUILT_IN_PRICE_RULES_BY_FAMILY removed.
  // All price rules are loaded via TemplateRuleRegistry; rules/*.js no longer set window globals.

  window.Geometry = Geometry;
  // ── PriceRuleEngine：B 系實作（外廣 wave1 V0.5 原文）──
  // ── PriceRuleEngine：B 系實作（外廣 wave1 V0.5 原文）──
  const PriceRuleEngine_B = {
    defaultColor: '#D0011B',
    textBoxWidth: 260,
    lineHeightRatio: 1.08,

    // V1.0 開源版：移除舊DDcard PSD的硬編碼像素座標保底。
    // 正式價格座標一律由該公版的 rules/*.rules.js 透過 priceRules.templateLayouts / productLayouts 提供；
    // 若沒有任何規則命中，classify() 會回傳空 layouts 並在console提示，不會再套用舊座標。
    defaultLayouts: Object.freeze({}),

    hasEffectiveExternalRules(rules) {
      return !!(rules && rules.enabled !== false && (
        Object.keys(rules.templateLayouts || {}).length ||
        Object.keys(rules.productLayouts || {}).length ||
        Array.isArray(rules.classifiers)
      ));
    },

    getRules(template = AppState.template) {
      const family = this.getTemplateFamily(template);
      const rules = getRuleSection(family, 'priceRules');
      if (this.hasEffectiveExternalRules(rules)) return rules;
      return {};
    },

    getTemplateFamily: (template) => CapsuleRuleEngine.getTemplateFamily(template),

    classify(productName, template = AppState.template, rawPrice = '') {
      const raw = String(productName || '');
      const normalized = this.norm(raw);
      const externalRule = this.resolveExternalRule({ productName: raw, template, rawPrice });

      if (externalRule?.layouts?.length) {
        const isDoubleCoupon = externalRule.layouts.some((layout) => layout.slot === 'top' || layout.slot === 'bottom');
        return {
          layoutKey: externalRule.layoutKey || (isDoubleCoupon ? 'doubleCoupon' : 'singleCoupon'),
          isDoubleCoupon,
          isVip: /vip/i.test(raw),
          layouts: externalRule.layouts.map((layout) => this.normalizeLayout(layout)),
          externalRule,
        };
      }

      // Registered public-template families use edited JSON absolute coordinates.
      // If a family has no matching absolute rule, do not fall back to DD Card defaults.
      const family = this.getTemplateFamily(template);

      const familyRules = this.getRules(template);
      const requiresAbsoluteRule = familyRules?.coordinateMode === 'absolute' || familyRules?.lockToEditedJson === true;
      if (requiresAbsoluteRule) {
        console.warn('[PriceRuleEngine] 價格缺少 absolute 規則，已略過價格生成：', {
          family,
          templateId: template?.templateId,
          batchSourceName: template?.batchSourceName,
          productName: raw,
          rawPrice,
        });
        return {
          layoutKey: `missing${String(family || 'template').toUpperCase()}AbsoluteRule`,
          isDoubleCoupon: false,
          isVip: /vip/i.test(raw),
          layouts: [],
        };
      }

      const isDoubleCoupon = normalized.includes(this.norm('雙券'));
      const isVip = /vip/i.test(raw);
      const isCreditCardCoupon = /信用卡加.*券/.test(normalized);
      const isFreeShippingCoupon = /免運車加.*券/.test(normalized);
      const isCouponCoin = /券加蝦幣/.test(normalized);
      const layoutKey = isDoubleCoupon
        ? 'doubleCoupon'
        : isCreditCardCoupon
          ? 'creditCardCoupon'
          : isFreeShippingCoupon
            ? 'freeShippingCoupon'
            : isCouponCoin
              ? 'couponCoin'
              : isVip
                ? 'vip'
                : 'singleCoupon';

      return {
        layoutKey,
        isDoubleCoupon,
        isVip,
        layouts: (this.defaultLayouts[layoutKey] || this.defaultLayouts.singleCoupon || []).length
          ? (this.defaultLayouts[layoutKey] || this.defaultLayouts.singleCoupon)
          : (() => {
              console.warn('[PriceRuleEngine] 沒有任何規則命中，且沒有內建預設座標，價格圖層將不會產生：', { family, layoutKey, productName: raw });
              return [];
            })(),
      };
    },

    resolveExternalRule({ productName = '', template = AppState.template, rawPrice = '' } = {}) {
      const rules = this.getRules(template);
      if (!rules || rules.enabled === false) return null;

      const useProductFirst = rules.productFirst === true || String(rules.resolvePriority || '').toLowerCase() === 'productfirst';
      const productRule = this.resolveProductRule(rules, productName, rawPrice);
      const templateRule = this.resolveTemplateRule(rules, template);

      if (useProductFirst && productRule?.layouts?.length) return productRule;
      if (templateRule?.layouts?.length) return templateRule;
      if (productRule?.layouts?.length) return productRule;

      return null;
    },

    resolveTemplateRule(rules, template = AppState.template) {
      const templateIds = [
        template?.templateId,
        template?.batchSourceName,
        template?.source?.psdName,
        AppState.templates?.[AppState.activeIndex]?.name,
        AppState.templates?.[AppState.activeIndex]?.file,
      ].filter(Boolean);

      for (const id of templateIds) {
        const direct = rules.templateLayouts?.[id];
        if (direct?.layouts?.length) return direct;

        const normalized = this.norm(id);
        const key = Object.keys(rules.templateLayouts || {}).find((candidate) => this.norm(candidate) === normalized);
        if (key && rules.templateLayouts[key]?.layouts?.length) return rules.templateLayouts[key];
      }

      return null;
    },

    resolveProductRule(rules, productName = '', rawPrice = '') {
      const productKey = this.norm(productName);
      const productRules = rules.productLayouts || {};
      const key = Object.keys(productRules).find((candidate) => this.norm(candidate) === productKey);
      const entry = key ? productRules[key] : null;
      if (!entry) return null;

      const matchedVariant = (entry.variants || []).find((variant) => this.priceMatches(rawPrice, variant));
      const useTemplate = matchedVariant?.useTemplate || entry.useTemplate;
      if (useTemplate && rules.templateLayouts?.[useTemplate]) return rules.templateLayouts[useTemplate];

      if (entry.layouts?.length) return entry;
      return null;
    },

    priceMatches(rawPrice = '', variant = {}) {
      const price = this.norm(rawPrice);
      const includes = Array.isArray(variant.priceIncludes) ? variant.priceIncludes : [variant.priceIncludes];
      return includes.filter(Boolean).some((keyword) => price.includes(this.norm(keyword)));
    },

    normalizeLayout(layout = {}, defaultLayout = {}) {
      const next = {
        ...defaultLayout,
        ...layout,
        fontSizePx: Number(layout.fontSizePx ?? layout.fontSize ?? defaultLayout.fontSizePx ?? 24),
      };

      if (Number.isFinite(Number(layout.x))) next.leftX = Number(layout.x);
      if (Number.isFinite(Number(layout.y))) next.topY = Number(layout.y);
      return next;
    },

    isEditedJsonAbsoluteLayout(layout = {}) {
      return layout?.lockToEditedJson === true
        || layout?.disableAnchorSync === true
        || layout?.positioningMode === 'absolute';
    },

    resolveLayoutForAnchor(layout = {}, anchorBox = null) {
      if (this.isEditedJsonAbsoluteLayout(layout)) {
        const fontSizePx = Number(layout.fontSizePx || layout.fontSize || 24);
        const lineHeightMultiplier = Number(layout.lineHeightMultiplier || this.lineHeightRatio);
        return {
          ...layout,
          positioningMode: 'absolute',
          centerX: round(Number(layout.centerX ?? (Number(layout.x ?? layout.leftX ?? 0) + Number(layout.width || this.textBoxWidth) / 2)), 2),
          centerY: round(Number(layout.centerY ?? (Number(layout.y ?? layout.topY ?? 0) + Number(layout.height || fontSizePx * lineHeightMultiplier) / 2)), 2),
          width: round(Number(layout.width || this.textBoxWidth), 2),
          height: round(Number(layout.height || layout.lineHeight || fontSizePx * lineHeightMultiplier), 2),
          fontSizePx: round(fontSizePx, 2),
          fontSizePt: round(Number(layout.fontSizePt || fontSizePx), 2),
          lineHeight: round(Number(layout.lineHeight || fontSizePx * lineHeightMultiplier), 2),
          lineHeightMultiplier,
          preserveExactSize: true,
          skipAutoScale: true,
          disableAnchorSync: layout.disableAnchorSync === true,
          lockToEditedJson: true,
          followProduct: true,
        };
      }

      if (layout.positioningMode !== 'product-image-ratio' || !anchorBox) return layout;

      const width = Number.isFinite(Number(layout.widthRatio))
        ? Number(anchorBox.width || 0) * Number(layout.widthRatio)
        : Number(layout.width || this.textBoxWidth);
      const height = Number.isFinite(Number(layout.heightRatio))
        ? Number(anchorBox.height || 0) * Number(layout.heightRatio)
        : Number(layout.height || layout.fontSizePx * this.lineHeightRatio);
      const fontSizePx = Number.isFinite(Number(layout.fontSizeRatio))
        ? Number(anchorBox.width || 0) * Number(layout.fontSizeRatio)
        : Number(layout.fontSizePx || 24);
      const centerX = Number(anchorBox.x || 0) + Number(anchorBox.width || 0) * Number(layout.anchorRatioX ?? 0.5);
      const centerY = Number(anchorBox.y || 0) + Number(anchorBox.height || 0) * Number(layout.anchorRatioY ?? 0.5);

      return {
        ...layout,
        centerX: round(centerX, 2),
        centerY: round(centerY, 2),
        width: round(width, 2),
        height: round(height, 2),
        fontSizePx: round(fontSizePx, 2),
        fontSizePt: round(fontSizePx, 2),
        lineHeightMultiplier: Number(layout.lineHeightMultiplier || this.lineHeightRatio),
        preserveExactSize: true,
        skipAutoScale: true,
      };
    },

    norm: normStr,
  };
  // ── PriceRuleEngine：A 系實作（正式BN V0.8 為底）──
  const PriceRuleEngine_A = {
    defaultColor: '#D0011B',
    textBoxWidth: 260,
    lineHeightRatio: 1.08,

    // V1.0 開源版：移除舊DDcard PSD的硬編碼像素座標保底。
    // 正式價格座標一律由該公版的 rules/*.rules.js 透過 priceRules.templateLayouts / productLayouts 提供；
    // 若沒有任何規則命中，classify() 會回傳空 layouts 並在console提示，不會再套用舊座標。
    defaultLayouts: Object.freeze({}),

    hasEffectiveExternalRules(rules) {
      return !!(rules && rules.enabled !== false && (
        Object.keys(rules.templateLayouts || {}).length ||
        Object.keys(rules.productLayouts || {}).length ||
        Array.isArray(rules.classifiers)
      ));
    },

    getRules(template = AppState.template) {
      const family = this.getTemplateFamily(template);
      const rules = getRuleSection(family, 'priceRules');
      if (this.hasEffectiveExternalRules(rules)) return rules;
      return {};
    },

    getTemplateFamily: (template) => CapsuleRuleEngine.getTemplateFamily(template),

    priceParts(rawPrice = '') {
      return String(rawPrice || '')
        .split(/[+＋]/)
        .map((value) => value.trim())
        .filter(Boolean);
    },

    shouldUseDoubleCoupon(productName = '', rawPrice = '', rules = {}) {
      if (rules?.doublePrice?.force === true) return true;
      const hasTwoPrices = this.priceParts(rawPrice).length >= 2;
      const productIsDouble = this.norm(productName).includes(this.norm('雙券'));
      return hasTwoPrices || productIsDouble;
    },

    expandDoubleLayouts(layouts = [], doublePrice = {}) {
      const source = layouts.find((layout) => layout?.slot === 'single') || layouts[0] || {};
      const base = this.normalizeLayout(source);
      const verticalOffsetRatio = Number(doublePrice.verticalOffsetRatio ?? 0.25);
      const slotConfig = doublePrice.slots || {};
      const build = (slot, defaults) => {
        const override = slotConfig[slot] || {};
        const next = {
          ...base,
          ...defaults,
          ...override,
          slot,
          positioningMode: override.positioningMode || 'product-image-ratio',
          anchorRatioX: Number(override.anchorRatioX ?? 0.5),
          anchorRatioY: Number(override.anchorRatioY ?? defaults.anchorRatioY),
          rotationOffset: Number(override.rotationOffset ?? defaults.rotationOffset),
          followProduct: override.followProduct !== false,
          lockToEditedJson: false,
          disableAnchorSync: false,
          layoutKey: 'doubleCoupon',
        };
        ['x', 'y', 'leftX', 'topY', 'centerX', 'centerY'].forEach((key) => { delete next[key]; });
        return next;
      };
      return [
        build('bottom', {
          psdName: '價格_下',
          anchorRatioY: 0.5 + verticalOffsetRatio,
          rotationOffset: 2,
        }),
        build('top', {
          psdName: '價格_上',
          anchorRatioY: 0.5 - verticalOffsetRatio,
          rotationOffset: -6,
        }),
      ];
    },

    classify(productName, template = AppState.template, rawPrice = '') {
      const raw = String(productName || '');
      const normalized = this.norm(raw);
      const familyRules = this.getRules(template);
      const externalRule = this.resolveExternalRule({ productName: raw, template, rawPrice });
      const requestedDouble = this.shouldUseDoubleCoupon(raw, rawPrice, familyRules);

      if (externalRule?.layouts?.length) {
        let layouts = externalRule.layouts.map((layout) => this.normalizeLayout(layout));
        let hasDoubleLayouts = layouts.some((layout) => layout.slot === 'top' || layout.slot === 'bottom');
        if (requestedDouble && !hasDoubleLayouts && familyRules?.doublePrice?.enabled === true) {
          layouts = this.expandDoubleLayouts(layouts, familyRules.doublePrice);
          hasDoubleLayouts = true;
        }
        return {
          layoutKey: hasDoubleLayouts ? 'doubleCoupon' : (externalRule.layoutKey || 'singleCoupon'),
          isDoubleCoupon: hasDoubleLayouts,
          isVip: /vip/i.test(raw),
          layouts,
          externalRule,
        };
      }

      const family = this.getTemplateFamily(template);
      const requiresAbsoluteRule = familyRules?.coordinateMode === 'absolute' || familyRules?.lockToEditedJson === true;
      if (requiresAbsoluteRule) {
        console.warn('[PriceRuleEngine] 價格缺少 absolute 規則，已略過價格生成：', {
          family,
          templateId: template?.templateId,
          batchSourceName: template?.batchSourceName,
          productName: raw,
          rawPrice,
        });
        return {
          layoutKey: `missing${String(family || 'template').toUpperCase()}AbsoluteRule`,
          isDoubleCoupon: false,
          isVip: /vip/i.test(raw),
          layouts: [],
        };
      }

      const isDoubleCoupon = requestedDouble;
      const isVip = /vip/i.test(raw);
      const isCreditCardCoupon = /信用卡加.*券/.test(normalized);
      const isFreeShippingCoupon = /免運車加.*券/.test(normalized);
      const isCouponCoin = /券加蝦幣/.test(normalized);
      const layoutKey = isDoubleCoupon
        ? 'doubleCoupon'
        : isCreditCardCoupon
          ? 'creditCardCoupon'
          : isFreeShippingCoupon
            ? 'freeShippingCoupon'
            : isCouponCoin
              ? 'couponCoin'
              : isVip
                ? 'vip'
                : 'singleCoupon';

      const fallbackLayouts = this.defaultLayouts[layoutKey] || this.defaultLayouts.singleCoupon || [];
      return {
        layoutKey,
        isDoubleCoupon,
        isVip,
        layouts: fallbackLayouts.length
          ? fallbackLayouts
          : (() => {
              console.warn('[PriceRuleEngine] 沒有任何規則命中，且沒有內建預設座標，價格圖層將不會產生：', { family, layoutKey, productName: raw });
              return [];
            })(),
      };
    },

    resolveExternalRule({ productName = '', template = AppState.template, rawPrice = '' } = {}) {
      const rules = this.getRules(template);
      if (!rules || rules.enabled === false) return null;

      const useProductFirst = rules.productFirst === true || String(rules.resolvePriority || '').toLowerCase() === 'productfirst';
      const productRule = this.resolveProductRule(rules, productName, rawPrice);
      const templateRule = this.resolveTemplateRule(rules, template);

      if (useProductFirst && productRule?.layouts?.length) return productRule;
      if (templateRule?.layouts?.length) return templateRule;
      if (productRule?.layouts?.length) return productRule;

      return null;
    },

    resolveTemplateRule(rules, template = AppState.template) {
      const templateIds = [
        template?.templateId,
        template?.canvas?.templateId,
        template?.sheetTemplateRoute?.sourceTemplateId,
        template?.sourceTemplateId,
        template?.batchSourceName,
        template?.source?.psdName,
        AppState.templates?.[AppState.activeIndex]?.name,
        AppState.templates?.[AppState.activeIndex]?.file,
      ].filter(Boolean);

      for (const id of templateIds) {
        const direct = rules.templateLayouts?.[id];
        if (direct?.layouts?.length) return direct;

        const normalized = this.norm(id);
        const key = Object.keys(rules.templateLayouts || {}).find((candidate) => this.norm(candidate) === normalized);
        if (key && rules.templateLayouts[key]?.layouts?.length) return rules.templateLayouts[key];
      }

      return null;
    },

    resolveProductRule(rules, productName = '', rawPrice = '') {
      const productKey = this.norm(productName);
      const productRules = rules.productLayouts || {};
      const key = Object.keys(productRules).find((candidate) => this.norm(candidate) === productKey);
      const entry = key ? productRules[key] : null;
      if (!entry) return null;

      const matchedVariant = (entry.variants || []).find((variant) => this.priceMatches(rawPrice, variant));
      const useTemplate = matchedVariant?.useTemplate || entry.useTemplate;
      if (useTemplate && rules.templateLayouts?.[useTemplate]) return rules.templateLayouts[useTemplate];

      if (entry.layouts?.length) return entry;
      return null;
    },

    priceMatches(rawPrice = '', variant = {}) {
      const price = this.norm(rawPrice);
      const includes = Array.isArray(variant.priceIncludes) ? variant.priceIncludes : [variant.priceIncludes];
      return includes.filter(Boolean).some((keyword) => price.includes(this.norm(keyword)));
    },

    normalizeLayout(layout = {}, defaultLayout = {}) {
      const next = {
        ...defaultLayout,
        ...layout,
        fontSizePx: Number(layout.fontSizePx ?? layout.fontSize ?? defaultLayout.fontSizePx ?? 24),
      };

      if (Number.isFinite(Number(layout.x))) next.leftX = Number(layout.x);
      if (Number.isFinite(Number(layout.y))) next.topY = Number(layout.y);
      return next;
    },

    isEditedJsonAbsoluteLayout(layout = {}) {
      return layout?.lockToEditedJson === true
        || layout?.disableAnchorSync === true
        || layout?.positioningMode === 'absolute';
    },

    resolveLayoutForAnchor(layout = {}, anchorBox = null, anchorRotation = 0) {
      if (this.isEditedJsonAbsoluteLayout(layout)) {
        const fontSizePx = Number(layout.fontSizePx || layout.fontSize || 24);
        const lineHeightMultiplier = Number(layout.lineHeightMultiplier || this.lineHeightRatio);
        return {
          ...layout,
          positioningMode: 'absolute',
          centerX: round(Number(layout.centerX ?? (Number(layout.x ?? layout.leftX ?? 0) + Number(layout.width || this.textBoxWidth) / 2)), 2),
          centerY: round(Number(layout.centerY ?? (Number(layout.y ?? layout.topY ?? 0) + Number(layout.height || fontSizePx * lineHeightMultiplier) / 2)), 2),
          width: round(Number(layout.width || this.textBoxWidth), 2),
          height: round(Number(layout.height || layout.lineHeight || fontSizePx * lineHeightMultiplier), 2),
          fontSizePx: round(fontSizePx, 2),
          fontSizePt: round(Number(layout.fontSizePt || fontSizePx), 2),
          lineHeight: round(Number(layout.lineHeight || fontSizePx * lineHeightMultiplier), 2),
          lineHeightMultiplier,
          preserveExactSize: true,
          skipAutoScale: true,
          disableAnchorSync: layout.disableAnchorSync === true,
          lockToEditedJson: true,
          followProduct: true,
        };
      }

      if (layout.positioningMode !== 'product-image-ratio' || !anchorBox) return layout;

      const width = Number.isFinite(Number(layout.widthRatio))
        ? Number(anchorBox.width || 0) * Number(layout.widthRatio)
        : Number(layout.width || this.textBoxWidth);
      const height = Number.isFinite(Number(layout.heightRatio))
        ? Number(anchorBox.height || 0) * Number(layout.heightRatio)
        : Number(layout.height || layout.fontSizePx * this.lineHeightRatio);
      const fontSizePx = Number.isFinite(Number(layout.fontSizeRatio))
        ? Number(anchorBox.width || 0) * Number(layout.fontSizeRatio)
        : Number(layout.fontSizePx || 24);
      const centerX = Number(anchorBox.x || 0) + Number(anchorBox.width || 0) * Number(layout.anchorRatioX ?? 0.5);
      const centerY = Number(anchorBox.y || 0) + Number(anchorBox.height || 0) * Number(layout.anchorRatioY ?? 0.5);

      return {
        ...layout,
        centerX: round(centerX, 2),
        centerY: round(centerY, 2),
        width: round(width, 2),
        height: round(height, 2),
        fontSizePx: round(fontSizePx, 2),
        fontSizePt: round(fontSizePx, 2),
        lineHeightMultiplier: Number(layout.lineHeightMultiplier || this.lineHeightRatio),
        rotation: Number.isFinite(Number(layout.rotationOffset))
          ? round(Number(anchorRotation || 0) + Number(layout.rotationOffset), 2)
          : round(Number(layout.rotation ?? anchorRotation ?? 0), 2),
        preserveExactSize: true,
        skipAutoScale: true,
      };
    },

    norm: normStr,
  };
  const PriceRuleEngine = pickLineage(PriceRuleEngine_A, PriceRuleEngine_B);
  // ── PriceColorResolver：B 系實作（外廣 wave1 V0.5 原文）──
  const PriceColorResolver_B = {
    rules: Object.freeze([
      { name: 'VIP', test: (raw, norm) => /vip/i.test(raw), color: '#FF770F' },
      { name: 'SCS', test: (raw, norm) => norm.includes('scs'), color: '#D0011B' },
      { name: '商城券', test: (raw, norm) => norm.includes(PriceRuleEngine.norm('商城券')), color: '#D0011B' },
      { name: '全站券', test: (raw, norm) => norm.includes(PriceRuleEngine.norm('全站券')), color: '#EE4D2D' },
      { name: '全站', test: (raw, norm) => norm.includes(PriceRuleEngine.norm('全站')), color: '#EE4D2D' },
    ]),

    buildRuleTester(rule = {}) {
      if (!rule) return null;
      if (rule.regex) {
        try {
          const re = new RegExp(rule.regex, rule.flags || '');
          return (raw) => re.test(raw);
        } catch (error) {
          console.warn('[PriceColorResolver] colorRules regex 無效，已略過:', rule, error);
        }
      }
      if (rule.keyword) {
        const wanted = PriceRuleEngine.norm(rule.keyword);
        return (_, normalized) => !!wanted && normalized.includes(wanted);
      }
      if (Array.isArray(rule.allKeywords) && rule.allKeywords.length) {
        const wanted = rule.allKeywords.map((word) => PriceRuleEngine.norm(word)).filter(Boolean);
        return (_, normalized) => wanted.every((word) => normalized.includes(word));
      }
      return null;
    },

    getExternalRules(template = AppState.template) {
      const rules = PriceRuleEngine.getRules(template);
      return Array.isArray(rules?.colorRules) ? rules.colorRules : [];
    },

    resolve(productName, template = AppState.template, fallbackColor = '') {
      const raw = String(productName || '');
      const normalized = PriceRuleEngine.norm(raw);
      const externalMatched = this.getExternalRules(template).find((rule) => {
        const test = this.buildRuleTester(rule);
        return test?.(raw, normalized);
      });
      if (externalMatched?.color) return externalMatched.color;

      const matched = this.rules.find((rule) => rule.test(raw, normalized));
      return matched?.color || fallbackColor || PriceRuleEngine.defaultColor;
    },
  };
  // ── PriceColorResolver：A 系實作（正式BN V0.8 為底）──
  const PriceColorResolver_A = {
    rules: Object.freeze([
      { name: 'VIP', test: (raw, norm) => /vip/i.test(raw), color: '#FF770F' },
      { name: 'SCS', test: (raw, norm) => norm.includes('scs'), color: '#D0011B' },
      { name: '商城券', test: (raw, norm) => norm.includes(PriceRuleEngine.norm('商城券')), color: '#D0011B' },
      { name: '全站券', test: (raw, norm) => norm.includes(PriceRuleEngine.norm('全站券')), color: '#EE4D2D' },
      { name: '全站', test: (raw, norm) => norm.includes(PriceRuleEngine.norm('全站')), color: '#EE4D2D' },
    ]),

    buildRuleTester(rule = {}) {
      if (!rule) return null;
      if (rule.regex) {
        try {
          const re = new RegExp(rule.regex, rule.flags || '');
          return (raw) => re.test(raw);
        } catch (error) {
          console.warn('[PriceColorResolver] colorRules regex 無效，已略過:', rule, error);
        }
      }
      if (rule.keyword) {
        const wanted = PriceRuleEngine.norm(rule.keyword);
        return (_, normalized) => !!wanted && normalized.includes(wanted);
      }
      if (Array.isArray(rule.allKeywords) && rule.allKeywords.length) {
        const wanted = rule.allKeywords.map((word) => PriceRuleEngine.norm(word)).filter(Boolean);
        return (_, normalized) => wanted.every((word) => normalized.includes(word));
      }
      return null;
    },

    getExternalRules(template = AppState.template) {
      const rules = PriceRuleEngine.getRules(template);
      return Array.isArray(rules?.colorRules) ? rules.colorRules : [];
    },

    getSlotColorRules(template = AppState.template) {
      const rules = PriceRuleEngine.getRules(template);
      return Array.isArray(rules?.slotColorRules) ? rules.slotColorRules : [];
    },

    resolve(productName, template = AppState.template, fallbackColor = '', slot = 'single') {
      const raw = String(productName || '');
      const normalized = PriceRuleEngine.norm(raw);
      const slotMatched = this.getSlotColorRules(template).find((rule) => {
        const test = this.buildRuleTester(rule);
        return test?.(raw, normalized);
      });
      const slotColor = slotMatched?.colors?.[slot];
      if (slotColor) return slotColor;

      const externalMatched = this.getExternalRules(template).find((rule) => {
        const test = this.buildRuleTester(rule);
        return test?.(raw, normalized);
      });
      if (externalMatched?.color) return externalMatched.color;

      const matched = this.rules.find((rule) => rule.test(raw, normalized));
      return matched?.color || fallbackColor || PriceRuleEngine.defaultColor;
    },
  };
  const PriceColorResolver = pickLineage(PriceColorResolver_A, PriceColorResolver_B);
  const PriceLayoutResolver = {
    textBoxWidth: 260,
    lineHeightRatio: 1.08,

    fromLayout(layout) {
      const width = Number(layout?.width || this.textBoxWidth);
      const fontSizePx = Number(layout?.fontSizePx || 24);
      const lineHeightMultiplier = Number(layout?.lineHeightMultiplier || this.lineHeightRatio);
      const lineHeight = round(Number(layout?.lineHeight || fontSizePx * lineHeightMultiplier), 2);
      const height = Number(layout?.height || lineHeight);
      const hasLeftTop = Number.isFinite(layout?.leftX) && Number.isFinite(layout?.topY);
      const centerX = hasLeftTop ? Number(layout.leftX) + width / 2 : Number(layout?.centerX || 0);
      const centerY = hasLeftTop ? Number(layout.topY) + height / 2 : Number(layout?.centerY || 0);

      return {
        ...layout,
        width,
        height,
        centerX: round(centerX, 2),
        centerY: round(centerY, 2),
        lineHeight,
        lineHeightMultiplier,
      };
    },
  };
  const PriceTypographyResolver = {
    matches(text, rule = {}) {
      const raw = String(text || '');
      if (rule.regex) {
        try { return new RegExp(rule.regex, rule.flags || '').test(raw); }
        catch (error) { console.warn('[PriceTypographyResolver] regex 無效，已略過:', rule, error); }
      }
      if (rule.includes != null) {
        const values = Array.isArray(rule.includes) ? rule.includes : [rule.includes];
        return values.filter(Boolean).some((value) => raw.includes(String(value)));
      }
      return rule.default === true;
    },

    getConfig(template = AppState.template) {
      return PriceRuleEngine.getRules(template)?.typography || {};
    },

    resolveBigFontSize(text, layout = {}, template = AppState.template) {
      const config = this.getConfig(template);
      const match = (config.fontSizeRules || []).find((rule) => this.matches(text, rule));
      const layoutFontSize = Number(layout.fontSizePx);
      // SKBN 等尚未有 edited JSON 價格校正的版位，可明確宣告以各自 P 尺寸比例
      // 產生暫定字級；沒有 opt-in 的既有 HBN / DD Card / POPUP 完全維持原規則。
      if (layout.useLayoutFontSize === true && Number.isFinite(layoutFontSize) && layoutFontSize > 0) return layoutFontSize;
      return Number(match?.fontSizePx ?? config.defaultBigFontSize ?? layout.fontSizePx ?? 24);
    },

    apply(text, layout = {}, color = '', template = AppState.template) {
      const config = this.getConfig(template);
      const bigFontSize = this.resolveBigFontSize(text, layout, template);
      const smallRatio = Number(config.smallRatio ?? window.SPTextStandard?.PRICE_SMALL_RATIO ?? 0.795);
      const lineHeightMultiplier = Number(layout.lineHeightMultiplier || config.lineHeightMultiplier || 1.08);
      const heightMultiplier = Number(layout.heightMultiplier || config.heightMultiplier || 1.35);
      const lineHeight = round(bigFontSize * lineHeightMultiplier, 2);
      const next = {
        ...layout,
        fontSizePx: round(bigFontSize, 2),
        fontSizePt: round(bigFontSize, 2),
        lineHeight,
        lineHeightMultiplier,
      };
      if (layout.autoHeightFromFont === true) next.height = Math.ceil(bigFontSize * heightMultiplier);

      const standard = window.SPTextStandard;
      if (standard?.priceRanges) {
        const ranges = standard.priceRanges(text, bigFontSize, {
          color,
          smallRatio,
          bigTokens: config.bigTokens || [],
          smallTokens: config.smallTokens || [],
          defaultSize: config.defaultSize || 'big',
          smallBaselineOffset: 0,
        });
        if (standard.isDualSize?.(ranges)) {
          next.textStyleRanges = ranges;
          next.styledTextVerticalAlign = TextBaselineModel.SOURCE_MODE;
        } else {
          next.textStyleRanges = null;
          next.styledTextVerticalAlign = 'default';
        }
      }
      return next;
    },
  };
  const PriceParser = {
    parse(rawPrice, isDoubleCoupon) {
      const values = String(rawPrice || '')
        .split(/[+＋]/)
        .map((value) => value.trim())
        .filter(Boolean);
      if (!values.length) return [];
      if (!isDoubleCoupon) return [{ slot: 'single', text: values[0] }];
      if (values.length === 1) {
        return [
          { slot: 'bottom', text: values[0] },
          { slot: 'top', text: values[0] },
        ];
      }
      if (values.length > 2) console.warn(`[PriceParser] 價格「${rawPrice}」超過兩組，目前只取前兩組。`);
      return [
        { slot: 'bottom', text: values[0] },
        { slot: 'top', text: values[1] },
      ];
    },
  };
  // ── PriceLayerFactory：B 系實作（外廣 wave1 V0.5 原文）──
  // ── PriceLayerFactory：B 系實作（外廣 wave1 V0.5 原文）──
  const PriceLayerFactory_B = {
    create({ key, text, layout, color, anchorLayerKey, anchorBox, anchorRotation, productName, layoutKey }) {
      const lineHeight = layout.lineHeight || layout.fontSizePx * 1.08;
      const width = Number(layout.width || 260);
      const height = Number(layout.height || lineHeight);
      const layer = {
        type: 'text',
        source: 'auto_price_v2',
        psdName: layout.psdName || '價格',
        text,
        x: round(layout.centerX - width / 2, 2),
        y: round(layout.centerY - height / 2, 2),
        width: round(width, 2),
        height: round(height, 2),
        centerX: layout.centerX,
        centerY: layout.centerY,
        rotation: layout.rotation || 0,
        fontSizePx: layout.fontSizePx,
        fontSizePt: layout.fontSizePx,
        lineHeight,
        letterSpacing: layout.letterSpacing || 0,
        fontFamily: 'ShopeeNotoSans Content',
        fontWeight: '700',
        align: layout.align || 'center',
        color,
        hidden: false,
        locked: false,
        priceSlot: layout.slot || 'single',
        priceProductName: productName || '',
        priceLayoutKey: layoutKey || layout.layoutKey || '',
        lineHeightMultiplier: Number(layout.lineHeightMultiplier || 1.08),
        positioningMode: layout.positioningMode || '',
        disableAnchorSync: layout.followProduct === true ? false : !!layout.disableAnchorSync,
        lockToEditedJson: !!layout.lockToEditedJson,
        // 價格大小控制旗標需從 rules/*.js 帶進實際圖層，
        // 後續商品圖縮放連動時才不會覆蓋該公版 rules 檔設定的 width / height / fontSizePx。
        preserveExactSize: !!layout.preserveExactSize,
        skipAutoScale: !!layout.skipAutoScale,
        disableContentScale: !!layout.disableContentScale,
        followProduct: layout.followProduct !== false,
        anchor: (layout.followProduct === true || !layout.disableAnchorSync)
          ? this.createAnchor(layout, anchorLayerKey, anchorBox, anchorRotation)
          : null,
        layerKey: key,
      };

      // 價格與一般文字共用 82% 特殊字元規則，並記住目前價格框的 source baseline。
      // 例如「蝦幣25%」只會把「%」縮成 82%，其餘字維持 layout.fontSizePx。
      if (flag('price.specialCharRanges82', true)) window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
      if (flag('price.layerBaselineMode', 'capture') !== 'none') TextBaselineModel.captureLayer(layer, { source: 'auto-price', force: true });
      return layer;
    },

    createAnchor(layout, anchorLayerKey, anchorBox, anchorRotation = 0) {
      const baseCenter = {
        x: (anchorBox?.x || 0) + (anchorBox?.width || 0) / 2,
        y: (anchorBox?.y || 0) + (anchorBox?.height || 0) / 2,
      };
      // 如果 layout 已有 offsetX/offsetY（來自 rules），直接使用，不從座標反推
      const offsetX = Number.isFinite(layout.offsetX) ? layout.offsetX : layout.centerX - baseCenter.x;
      const offsetY = Number.isFinite(layout.offsetY) ? layout.offsetY : layout.centerY - baseCenter.y;
      const rotationOffset = Number.isFinite(layout.rotationOffset)
        ? layout.rotationOffset
        : (layout.rotation || 0) - Number(anchorRotation || 0);
      const baseFontSizePx = Number.isFinite(layout.baseFontSizePx) ? layout.baseFontSizePx : layout.fontSizePx;
      const baseWidth = Number.isFinite(layout.baseWidth) ? layout.baseWidth : (layout.width || 260);
      const baseHeight = Number.isFinite(layout.baseHeight) ? layout.baseHeight : (layout.height || layout.fontSizePx * 1.08);
      return {
        layerKey: anchorLayerKey,
        baseBox: clone(anchorBox || { x: 0, y: 0, width: 1, height: 1 }),
        baseRotation: Number(anchorRotation || 0),
        offsetX,
        offsetY,
        rotationOffset,
        baseFontSizePx,
        baseWidth,
        baseHeight,
      };
    },
  };
  // ── PriceLayerFactory：A 系實作（正式BN V0.8 為底）──
  const PriceLayerFactory_A = {
    create({ key, text, layout, color, anchorLayerKey, anchorBox, anchorRotation, productName, layoutKey }) {
      const lineHeight = layout.lineHeight || layout.fontSizePx * 1.08;
      const width = Number(layout.width || 260);
      const height = Number(layout.height || lineHeight);
      const layer = {
        type: 'text',
        source: 'auto_price_v2',
        psdName: layout.psdName || (layout.slot === 'bottom' ? '價格_下' : layout.slot === 'top' ? '價格_上' : '價格'),
        role: layout.psdName || (layout.slot === 'bottom' ? '價格_下' : layout.slot === 'top' ? '價格_上' : '價格'),
        text,
        x: round(layout.centerX - width / 2, 2),
        y: round(layout.centerY - height / 2, 2),
        width: round(width, 2),
        height: round(height, 2),
        centerX: layout.centerX,
        centerY: layout.centerY,
        rotation: layout.rotation || 0,
        fontSizePx: layout.fontSizePx,
        fontSizePt: layout.fontSizePx,
        lineHeight,
        letterSpacing: layout.letterSpacing || 0,
        fontFamily: 'ShopeeNotoSans Content',
        fontWeight: '700',
        align: 'center',
        color,
        textStyleRanges: Array.isArray(layout.textStyleRanges) ? clone(layout.textStyleRanges) : undefined,
        styledTextVerticalAlign: layout.styledTextVerticalAlign || 'default',
        hidden: false,
        locked: false,
        priceSlot: layout.slot || 'single',
        priceProductName: productName || '',
        priceLayoutKey: layoutKey || layout.layoutKey || '',
        priceRuleFontSizePx: Number(layout.fontSizePx || 24),
        lineHeightMultiplier: Number(layout.lineHeightMultiplier || 1.08),
        positioningMode: layout.positioningMode || '',
        disableAnchorSync: layout.followProduct === true ? false : !!layout.disableAnchorSync,
        lockToEditedJson: !!layout.lockToEditedJson,
        // 價格大小控制旗標需從 rules/*.js 帶進實際圖層，
        // 後續商品圖縮放連動時才不會覆蓋該公版 rules 檔設定的 width / height / fontSizePx。
        preserveExactSize: !!layout.preserveExactSize,
        skipAutoScale: !!layout.skipAutoScale,
        disableContentScale: !!layout.disableContentScale,
        followProduct: layout.followProduct !== false,
        anchor: (layout.followProduct === true || !layout.disableAnchorSync)
          ? this.createAnchor(layout, anchorLayerKey, anchorBox, anchorRotation)
          : null,
        layerKey: key,
        textVerticalAlign: TextBaselineModel.SOURCE_MODE,
      };
      TextBaselineModel.captureLayer(layer, { source: 'generated-price', force: true });
      return layer;
    },

    createAnchor(layout, anchorLayerKey, anchorBox, anchorRotation = 0) {
      const baseCenter = {
        x: (anchorBox?.x || 0) + (anchorBox?.width || 0) / 2,
        y: (anchorBox?.y || 0) + (anchorBox?.height || 0) / 2,
      };
      // 如果 layout 已有 offsetX/offsetY（來自 rules），直接使用，不從座標反推
      const offsetX = Number.isFinite(layout.offsetX) ? layout.offsetX : layout.centerX - baseCenter.x;
      const offsetY = Number.isFinite(layout.offsetY) ? layout.offsetY : layout.centerY - baseCenter.y;
      const rotationOffset = Number.isFinite(layout.rotationOffset)
        ? layout.rotationOffset
        : (layout.rotation || 0) - Number(anchorRotation || 0);
      const baseFontSizePx = Number.isFinite(layout.baseFontSizePx) ? layout.baseFontSizePx : layout.fontSizePx;
      const baseLineHeight = Number.isFinite(layout.baseLineHeight)
        ? layout.baseLineHeight
        : (Number(layout.lineHeight) || Number(baseFontSizePx || 24) * (layout.lineHeightMultiplier || 1.08));
      const baseWidth = Number.isFinite(layout.baseWidth) ? layout.baseWidth : (layout.width || 260);
      const baseHeight = Number.isFinite(layout.baseHeight) ? layout.baseHeight : (layout.height || baseLineHeight);
      return {
        layerKey: anchorLayerKey,
        baseBox: clone(anchorBox || { x: 0, y: 0, width: 1, height: 1 }),
        baseRotation: Number(anchorRotation || 0),
        offsetX,
        offsetY,
        rotationOffset,
        baseFontSizePx,
        baseLineHeight,
        baseWidth,
        baseHeight,
        baseStyleFontSizes: Array.isArray(layout.textStyleRanges)
          ? layout.textStyleRanges.map((range) => Number(range?.fontSizePx || baseFontSizePx))
          : undefined,
        baseStyleLineHeights: Array.isArray(layout.textStyleRanges)
          ? layout.textStyleRanges.map((range) => Number(range?.lineHeight || 0) || null)
          : undefined,
      };
    },
  };
  const PriceLayerFactory = pickLineage(PriceLayerFactory_A, PriceLayerFactory_B);
  // ── PriceTransformEngine：B 系實作（外廣 wave1 V0.5 原文）──
  const PriceTransformEngine_B = {
    canFollowProduct(layer) {
      return !!(
        layer?.source === 'auto_price_v2' &&
        layer.followProduct !== false &&
        layer.anchor?.layerKey
      );
    },

    syncTemplate(template) {
      if (!template?.layers) return;
      Object.entries(template.layers)
        .filter(([, layer]) => this.canFollowProduct(layer) && layer._anchorDirty)
        .forEach(([key, layer]) => {
          this.syncPriceLayer(template, key, layer);
          layer._anchorDirty = false;
        });
    },

    norm: normStr,

    syncPriceLayerSeparateScale(template, key, layer, options = {}) {
      if (AppState.editingLayerKey === key || !this.canFollowProduct(layer)) return;
      const anchorLayer = template.layers?.[layer.anchor.layerKey];
      if (!anchorLayer) return;
      const currentBox = Geometry.getLayerBox(layer.anchor.layerKey, anchorLayer);
      const baseBox = layer.anchor.baseBox || currentBox;
      const currentCenter = { x: currentBox.x + currentBox.width / 2, y: currentBox.y + currentBox.height / 2 };

      // 位置比例與內容比例必須分開。即使某價格要求維持固定字級/框尺寸（preserveExactSize 等旗標），
      // 它相對商品圖中心的偏移仍應隨商品圖等比例移動，不能被固定在原地。（對齊 25節_正式BN_Tool_V0.8）
      const positionScaleX = baseBox.width ? currentBox.width / baseBox.width : 1;
      const positionScaleY = baseBox.height ? currentBox.height / baseBox.height : 1;
      const scaleContent = options.scaleContent !== false
        && layer.disableContentScale !== true
        && layer.skipAutoScale !== true
        && layer.lockToEditedJson !== true
        && layer.preserveExactSize !== true;
      const contentScaleX = scaleContent ? positionScaleX : 1;
      const contentScaleY = scaleContent ? positionScaleY : 1;
      const contentScale = (Math.abs(contentScaleX) + Math.abs(contentScaleY)) / 2 || 1;
      const rotationDelta = Number(anchorLayer.rotation || 0) - Number(layer.anchor.baseRotation || 0);
      const rotatedOffset = this.rotatePoint({
        x: (layer.anchor.offsetX || 0) * positionScaleX,
        y: (layer.anchor.offsetY || 0) * positionScaleY,
      }, rotationDelta);

      if (scaleContent) {
        const baseLineHeight = Number(layer.anchor.baseLineHeight || 0)
          || (layer.anchor.baseFontSizePx || layer.fontSizePx || 24) * (layer.lineHeightMultiplier || 1.08);
        const fontSize = Math.max(6, (layer.anchor.baseFontSizePx || layer.fontSizePx || 24) * contentScale);
        const width = Math.max(1, (layer.anchor.baseWidth || layer.width || 1) * contentScaleX);
        const height = Math.max(1, (layer.anchor.baseHeight || layer.height || baseLineHeight) * contentScaleY);
        layer.fontSizePx = round(fontSize, 2);
        layer.fontSizePt = layer.fontSizePx;
        layer.lineHeight = round(Math.max(1, baseLineHeight * contentScale), 2);
        layer.width = round(width, 2);
        layer.height = round(Math.max(height, layer.lineHeight), 2);

        // 有記錄每個 range 的基準字級時，直接依比例換算（保留人工調整過的大小關係）；
        // 沒有的話才退回 SPTextStandard 依 layer.fontSizePx 重建 82% ranges。
        if (Array.isArray(layer.textStyleRanges) && layer.textStyleRanges.length
          && Array.isArray(layer.anchor.baseStyleFontSizes)
          && layer.anchor.baseStyleFontSizes.length === layer.textStyleRanges.length) {
          layer.textStyleRanges.forEach((range, i) => {
            if (!range || typeof range !== 'object') return;
            const base = Number(layer.anchor.baseStyleFontSizes[i]);
            if (Number.isFinite(base)) range.fontSizePx = round(Math.max(4, base * contentScale), 2);
            const baseRangeLineHeight = Number(layer.anchor.baseStyleLineHeights?.[i]);
            if (Number.isFinite(baseRangeLineHeight) && baseRangeLineHeight > 0) {
              range.lineHeight = round(Math.max(1, baseRangeLineHeight * contentScale), 2);
            } else if (Number.isFinite(Number(range.lineHeight))) {
              range.lineHeight = round(range.fontSizePx * (layer.lineHeightMultiplier || 1.08), 2);
            }
          });
        } else {
          window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
        }
      }

      layer.centerX = round(currentCenter.x + rotatedOffset.x, 2);
      layer.centerY = round(currentCenter.y + rotatedOffset.y, 2);
      layer.x = round(layer.centerX - layer.width / 2, 2);
      layer.y = round(layer.centerY - layer.height / 2, 2);
      layer.rotation = round(Number(anchorLayer.rotation || 0) + Number(layer.anchor.rotationOffset || 0), 2);
      // scaleContent 分支會改字級與框但不會重算 baseline 參考值；統一在這裡收框 + 重新 capture，
      // 商品圖縮放連動時價格才會以中心等比縮放，而不是黏在框的上緣。
      // fitTextLayerToInk 會沿用上面剛算好的 centerX / centerY，所以不會影響跟隨商品圖的位置。
      window.Renderer?.fitTextLayerToInk?.(key, layer);
    },

    syncPriceLayer(template, key, layer, options = {}) {
      // （OM_w2）price.syncSeparatePositionScale：位置比例與內容比例分開、lineHeight 依 baseLineHeight、ranges 依基準字級換算、收框。
      if (flag('price.syncSeparatePositionScale', false)) return this.syncPriceLayerSeparateScale(template, key, layer, options);
      if (AppState.editingLayerKey === key || !this.canFollowProduct(layer)) return;
      const anchorLayer = template.layers?.[layer.anchor.layerKey];
      if (!anchorLayer) return;
      const currentBox = Geometry.getLayerBox(layer.anchor.layerKey, anchorLayer);
      const baseBox = layer.anchor.baseBox || currentBox;
      const currentCenter = { x: currentBox.x + currentBox.width / 2, y: currentBox.y + currentBox.height / 2 };
      const scaleContent = options.scaleContent !== false
        && layer.disableContentScale !== true
        && layer.skipAutoScale !== true
        && layer.lockToEditedJson !== true
        && layer.preserveExactSize !== true;
      const scaleX = scaleContent && baseBox.width ? currentBox.width / baseBox.width : 1;
      const scaleY = scaleContent && baseBox.height ? currentBox.height / baseBox.height : 1;
      const scale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2 || 1;
      const rotationDelta = Number(anchorLayer.rotation || 0) - Number(layer.anchor.baseRotation || 0);
      const rotatedOffset = this.rotatePoint({
        x: (layer.anchor.offsetX || 0) * scaleX,
        y: (layer.anchor.offsetY || 0) * scaleY,
      }, rotationDelta);

      if (scaleContent) {
        const fontSize = Math.max(6, (layer.anchor.baseFontSizePx || layer.fontSizePx || 24) * scale);
        const width = Math.max(1, (layer.anchor.baseWidth || layer.width || 1) * scaleX);
        const height = Math.max(1, (layer.anchor.baseHeight || layer.height || fontSize * 1.08) * scaleY);
        layer.fontSizePx = round(fontSize, 2);
        layer.fontSizePt = layer.fontSizePx;
        layer.lineHeight = round(fontSize * (layer.lineHeightMultiplier || 1.08), 2);
        layer.width = round(width, 2);
        layer.height = round(Math.max(height, layer.lineHeight), 2);
        if (flag('price.specialCharRanges82', true)) window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
      }

      layer.centerX = round(currentCenter.x + rotatedOffset.x, 2);
      layer.centerY = round(currentCenter.y + rotatedOffset.y, 2);
      layer.x = round(layer.centerX - layer.width / 2, 2);
      layer.y = round(layer.centerY - layer.height / 2, 2);
      layer.rotation = round(Number(anchorLayer.rotation || 0) + Number(layer.anchor.rotationOffset || 0), 2);
    },

    boxesSameSize(a = {}, b = {}) {
      return Math.abs(Number(a.width || 0) - Number(b.width || 0)) < 0.01
        && Math.abs(Number(a.height || 0) - Number(b.height || 0)) < 0.01;
    },

    handleLayerBoxApplied(key, layer, previousBox = null) {
      const template = AppState.template;
      if (!template?.layers || !key || !layer) return;
      if (layer.source === 'auto_price_v2') {
        this.captureManualPriceTransform(key, layer, template);
        return;
      }

      const currentBox = Geometry.getLayerBox(key, layer);
      const movedOnly = previousBox && this.boxesSameSize(previousBox, currentBox);
      const dx = movedOnly ? Number(currentBox.x || 0) - Number(previousBox.x || 0) : 0;
      const dy = movedOnly ? Number(currentBox.y || 0) - Number(previousBox.y || 0) : 0;

      Object.entries(template.layers)
        .filter(([, child]) => this.canFollowProduct(child) && child.anchor?.layerKey === key)
        .forEach(([childKey, child]) => {
          if (movedOnly) {
            child.x = round(Number(child.x || 0) + dx, 2);
            child.y = round(Number(child.y || 0) + dy, 2);
            if (flag('price.syncSeparatePositionScale', false)) {
              child.centerX = round(child.x + Number(child.width || 0) / 2, 2);
              child.centerY = round(child.y + Number(child.height || 0) / 2, 2);
            } else {
              child.centerX = round(Number(child.centerX ?? (child.x + child.width / 2)), 2);
              child.centerY = round(Number(child.centerY ?? (child.y + child.height / 2)), 2);
            }
            child.anchor.baseBox = clone(currentBox);
            return;
          }
          child._anchorDirty = true;
          this.syncPriceLayer(template, childKey, child, { scaleContent: true });
          child._anchorDirty = false;
        });
    },

    captureManualPriceTransformInkFit(key, layer, template = AppState.template, options = {}) {
      // 手動改字級 / 拉框之後，textBaselineReference 仍停留在「上一次」的 boxHeight 與 fontSizePx。
      // Renderer 的 source-baseline 位置是 layer.y + baselineOffsetY × (現在字級 / 參考字級)，
      // 也就是從「框的上緣」往下量；框沒有跟著縮，字級一縮小，字就會在原框裡往上飄。
      // 這裡先把外框重新貼齊實際字形（以同一個中心點重算 y，並 force 重新 capture reference），
      // 字級縮放就變成「以中心縮放」，外框也永遠等於實際字形範圍。
      // 放在 canFollowProduct 之前，沒有 anchor 的價格圖層也要收框。
      if (layer?.source === 'auto_price_v2') window.Renderer?.fitTextLayerToInk?.(key, layer);
      if (!this.canFollowProduct(layer) || !template?.layers) return;
      const anchorLayer = template.layers[layer.anchor.layerKey];
      if (!anchorLayer) return;
      const currentBox = Geometry.getLayerBox(layer.anchor.layerKey, anchorLayer);
      // SmartAssetManager 群組變形結束後會用 rebase 重新把「現在的商品框」當成新基準。
      if (options.rebase === true) {
        layer.anchor.baseBox = clone(currentBox);
        layer.anchor.baseRotation = Number(anchorLayer.rotation || 0);
      }
      const baseBox = layer.anchor.baseBox || currentBox;
      const currentCenter = { x: currentBox.x + currentBox.width / 2, y: currentBox.y + currentBox.height / 2 };
      const layerCenter = { x: (layer.x || 0) + (layer.width || 0) / 2, y: (layer.y || 0) + (layer.height || 0) / 2 };
      const scaleX = baseBox.width ? currentBox.width / baseBox.width : 1;
      const scaleY = baseBox.height ? currentBox.height / baseBox.height : 1;
      const scale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2 || 1;
      const rotationDelta = Number(anchorLayer.rotation || 0) - Number(layer.anchor.baseRotation || 0);
      const unrotated = this.rotatePoint({ x: layerCenter.x - currentCenter.x, y: layerCenter.y - currentCenter.y }, -rotationDelta);
      layer.centerX = round(layerCenter.x, 2);
      layer.centerY = round(layerCenter.y, 2);
      layer.anchor.offsetX = round(unrotated.x / (scaleX || 1), 2);
      layer.anchor.offsetY = round(unrotated.y / (scaleY || 1), 2);
      layer.anchor.rotationOffset = round(Number(layer.rotation || 0) - Number(anchorLayer.rotation || 0), 2);
      layer.anchor.baseFontSizePx = round((layer.fontSizePx || 24) / scale, 2);
      layer.anchor.baseLineHeight = round((layer.lineHeight || ((layer.fontSizePx || 24) * (layer.lineHeightMultiplier || 1.08))) / scale, 2);
      layer.anchor.baseWidth = round((layer.width || 1) / (scaleX || 1), 2);
      layer.anchor.baseHeight = round((layer.height || 1) / (scaleY || 1), 2);
      if (Array.isArray(layer.textStyleRanges) && layer.textStyleRanges.length) {
        layer.anchor.baseStyleFontSizes = layer.textStyleRanges.map((range) => round(
          (Number(range && range.fontSizePx) || (layer.fontSizePx || 24)) / scale, 2));
        layer.anchor.baseStyleLineHeights = layer.textStyleRanges.map((range) => {
          const value = Number(range && range.lineHeight);
          return Number.isFinite(value) && value > 0 ? round(value / scale, 2) : null;
        });
      }
      // 手動調整就是最終位置，不要再讓下一輪 syncTemplate 依 anchor 重算一次。
      layer._anchorDirty = false;
      // 拿掉 PricePresetStore（localStorage 價格記憶）機制：手動調整只保留在
      // 當下這個 template 物件（記憶體）裡，確保價格最終結果只由 rules 決定。
    },

    captureManualPriceTransform(key, layer, template = AppState.template, options = {}) {
      // （OM_w2）price.fitBoxToInk：手動調整後先收框再記 anchor 基準（含 rebase / baseLineHeight / ranges 基準字級）。
      if (flag('price.fitBoxToInk', false)) return this.captureManualPriceTransformInkFit(key, layer, template, options);
      if (!this.canFollowProduct(layer) || !template?.layers) return;
      const anchorLayer = template.layers[layer.anchor.layerKey];
      if (!anchorLayer) return;
      const currentBox = Geometry.getLayerBox(layer.anchor.layerKey, anchorLayer);
      const baseBox = layer.anchor.baseBox || currentBox;
      const currentCenter = { x: currentBox.x + currentBox.width / 2, y: currentBox.y + currentBox.height / 2 };
      const layerCenter = { x: (layer.x || 0) + (layer.width || 0) / 2, y: (layer.y || 0) + (layer.height || 0) / 2 };
      const scaleX = baseBox.width ? currentBox.width / baseBox.width : 1;
      const scaleY = baseBox.height ? currentBox.height / baseBox.height : 1;
      const scale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2 || 1;
      const rotationDelta = Number(anchorLayer.rotation || 0) - Number(layer.anchor.baseRotation || 0);
      const unrotated = this.rotatePoint({ x: layerCenter.x - currentCenter.x, y: layerCenter.y - currentCenter.y }, -rotationDelta);
      layer.centerX = round(layerCenter.x, 2);
      layer.centerY = round(layerCenter.y, 2);
      layer.anchor.offsetX = round(unrotated.x / (scaleX || 1), 2);
      layer.anchor.offsetY = round(unrotated.y / (scaleY || 1), 2);
      layer.anchor.rotationOffset = round(Number(layer.rotation || 0) - Number(anchorLayer.rotation || 0), 2);
      layer.anchor.baseFontSizePx = round((layer.fontSizePx || 24) / scale, 2);
      layer.anchor.baseWidth = round((layer.width || 1) / (scaleX || 1), 2);
      layer.anchor.baseHeight = round((layer.height || 1) / (scaleY || 1), 2);
      // 拿掉 PricePresetStore（localStorage 價格記憶）機制：手動調整只保留在
      // 當下這個 template 物件（記憶體）裡，確保價格最終結果只由 rules 決定。
    },

    rotatePoint(point, degrees) {
      const rad = Number(degrees || 0) * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
    },
  };
  // ── PriceTransformEngine：A 系實作（正式BN V0.8 為底）──
  const PriceTransformEngine_A = {
    canFollowProduct(layer) {
      return !!(
        layer?.source === 'auto_price_v2' &&
        layer.followProduct !== false &&
        layer.anchor?.layerKey
      );
    },

    syncTemplate(template) {
      if (!template?.layers) return;
      Object.entries(template.layers)
        .filter(([, layer]) => this.canFollowProduct(layer) && layer._anchorDirty)
        .forEach(([key, layer]) => {
          this.syncPriceLayer(template, key, layer);
          layer._anchorDirty = false;
        });
    },

    norm: normStr,

    captureTypographyState(layer) {
      return {
        fontSizePx: Number(layer?.fontSizePx || 24),
        lineHeight: Number(layer?.lineHeight || 0),
        textStyleFontSizes: Array.isArray(layer?.textStyleRanges)
          ? layer.textStyleRanges.map((range) => Number(range?.fontSizePx || layer?.fontSizePx || 24))
          : null,
        textStyleLineHeights: Array.isArray(layer?.textStyleRanges)
          ? layer.textStyleRanges.map((range) => Number(range?.lineHeight || 0))
          : null,
      };
    },

    applyTypographyScale(layer, state, factor) {
      if (!layer || layer.type !== 'text' || !state || !Number.isFinite(Number(factor))) return;
      const safeFactor = Math.max(0.01, Number(factor));
      layer.fontSizePx = round(Math.max(6, Number(state.fontSizePx || 24) * safeFactor), 2);
      layer.fontSizePt = layer.fontSizePx;
      layer.lineHeight = Number(state.lineHeight) > 0
        ? round(Math.max(1, Number(state.lineHeight) * safeFactor), 2)
        : round(layer.fontSizePx * (layer.lineHeightMultiplier || 1.08), 2);

      if (Array.isArray(layer.textStyleRanges) && Array.isArray(state.textStyleFontSizes)) {
        layer.textStyleRanges.forEach((range, index) => {
          if (!range || typeof range !== 'object') return;
          const baseSize = Number(state.textStyleFontSizes[index]);
          if (Number.isFinite(baseSize)) range.fontSizePx = round(Math.max(4, baseSize * safeFactor), 2);
          const baseLineHeight = Number(state.textStyleLineHeights?.[index]);
          if (Number.isFinite(baseLineHeight) && baseLineHeight > 0) {
            range.lineHeight = round(Math.max(1, baseLineHeight * safeFactor), 2);
          }
        });
      }
    },

    setTypographyFontSize(layer, nextFontSize) {
      if (!layer || layer.type !== 'text') return;
      const current = Math.max(0.01, Number(layer.fontSizePx || 24));
      const target = Math.max(6, Number(nextFontSize) || current);
      this.applyTypographyScale(layer, this.captureTypographyState(layer), target / current);
    },

    syncPriceLayer(template, key, layer, options = {}) {
      if (AppState.editingLayerKey === key || !this.canFollowProduct(layer)) return;
      const anchorLayer = template.layers?.[layer.anchor.layerKey];
      if (!anchorLayer) return;
      const currentBox = Geometry.getLayerBox(layer.anchor.layerKey, anchorLayer);
      const baseBox = layer.anchor.baseBox || currentBox;
      const currentCenter = { x: currentBox.x + currentBox.width / 2, y: currentBox.y + currentBox.height / 2 };

      // 位置比例與內容比例必須分開。即使某價格要求維持固定字級/框尺寸，
      // 它相對 P 的中心偏移仍應隨 P 等比例移動，不能因 preserveExactSize 等旗標被固定在原地。
      const positionScaleX = baseBox.width ? currentBox.width / baseBox.width : 1;
      const positionScaleY = baseBox.height ? currentBox.height / baseBox.height : 1;
      const scaleContent = options.scaleContent !== false
        && layer.disableContentScale !== true
        && layer.skipAutoScale !== true
        && layer.lockToEditedJson !== true
        && layer.preserveExactSize !== true;
      const contentScaleX = scaleContent ? positionScaleX : 1;
      const contentScaleY = scaleContent ? positionScaleY : 1;
      const contentScale = (Math.abs(contentScaleX) + Math.abs(contentScaleY)) / 2 || 1;
      const rotationDelta = Number(anchorLayer.rotation || 0) - Number(layer.anchor.baseRotation || 0);
      const rotatedOffset = this.rotatePoint({
        x: (layer.anchor.offsetX || 0) * positionScaleX,
        y: (layer.anchor.offsetY || 0) * positionScaleY,
      }, rotationDelta);

      if (scaleContent) {
        const fontSize = Math.max(6, (layer.anchor.baseFontSizePx || layer.fontSizePx || 24) * contentScale);
        const baseLineHeight = Number(layer.anchor.baseLineHeight || 0)
          || (layer.anchor.baseFontSizePx || layer.fontSizePx || 24) * (layer.lineHeightMultiplier || 1.08);
        const width = Math.max(1, (layer.anchor.baseWidth || layer.width || 1) * contentScaleX);
        const height = Math.max(1, (layer.anchor.baseHeight || layer.height || baseLineHeight) * contentScaleY);
        layer.fontSizePx = round(fontSize, 2);
        layer.fontSizePt = layer.fontSizePx;
        layer.lineHeight = round(Math.max(1, baseLineHeight * contentScale), 2);
        layer.width = round(width, 2);
        layer.height = round(Math.max(height, layer.lineHeight), 2);

        if (Array.isArray(layer.textStyleRanges) && layer.textStyleRanges.length
          && Array.isArray(layer.anchor.baseStyleFontSizes)
          && layer.anchor.baseStyleFontSizes.length === layer.textStyleRanges.length) {
          layer.textStyleRanges.forEach((range, i) => {
            if (!range || typeof range !== 'object') return;
            const base = Number(layer.anchor.baseStyleFontSizes[i]);
            if (Number.isFinite(base)) range.fontSizePx = round(Math.max(4, base * contentScale), 2);
            const baseRangeLineHeight = Number(layer.anchor.baseStyleLineHeights?.[i]);
            if (Number.isFinite(baseRangeLineHeight) && baseRangeLineHeight > 0) {
              range.lineHeight = round(Math.max(1, baseRangeLineHeight * contentScale), 2);
            } else if (Number.isFinite(Number(range.lineHeight))) {
              range.lineHeight = round(range.fontSizePx * (layer.lineHeightMultiplier || 1.08), 2);
            }
          });
        }
      }

      layer.centerX = round(currentCenter.x + rotatedOffset.x, 2);
      layer.centerY = round(currentCenter.y + rotatedOffset.y, 2);
      layer.x = round(layer.centerX - layer.width / 2, 2);
      layer.y = round(layer.centerY - layer.height / 2, 2);
      layer.rotation = round(Number(anchorLayer.rotation || 0) + Number(layer.anchor.rotationOffset || 0), 2);
    },

    boxesSameSize(a = {}, b = {}) {
      return Math.abs(Number(a.width || 0) - Number(b.width || 0)) < 0.01
        && Math.abs(Number(a.height || 0) - Number(b.height || 0)) < 0.01;
    },

    handleLayerBoxApplied(key, layer, previousBox = null, template = AppState.template) {
      if (!template?.layers || !key || !layer) return;
      // SmartAssetManager 在商品/P範圍群組變形期間是唯一的幾何寫入者。
      // 這段期間若再由 PriceTransformEngine 同步一次，價格會在同一幀被計算兩次而跳動。
      if (window.SmartAssetManager?.isProductTransformActive?.(template)) return;
      if (layer.source === 'auto_price_v2') {
        this.captureManualPriceTransform(key, layer, template);
        return;
      }

      const currentBox = Geometry.getLayerBox(key, layer);
      const movedOnly = previousBox && this.boxesSameSize(previousBox, currentBox);
      const dx = movedOnly ? Number(currentBox.x || 0) - Number(previousBox.x || 0) : 0;
      const dy = movedOnly ? Number(currentBox.y || 0) - Number(previousBox.y || 0) : 0;

      Object.entries(template.layers)
        .filter(([, child]) => this.canFollowProduct(child) && child.anchor?.layerKey === key)
        .forEach(([childKey, child]) => {
          if (movedOnly) {
            child.x = round(Number(child.x || 0) + dx, 2);
            child.y = round(Number(child.y || 0) + dy, 2);
            child.centerX = round(child.x + Number(child.width || 0) / 2, 2);
            child.centerY = round(child.y + Number(child.height || 0) / 2, 2);
            child.anchor.baseBox = clone(currentBox);
            return;
          }
          child._anchorDirty = true;
          this.syncPriceLayer(template, childKey, child, { scaleContent: true });
          child._anchorDirty = false;
        });
    },

    handleLayerRotationApplied(key, layer, template = AppState.template) {
      if (!template?.layers || !key || !layer) return;
      if (layer.source === 'auto_price_v2') {
        this.captureManualPriceTransform(key, layer, template);
        return;
      }
      if (window.SmartAssetManager?.isProductTransformActive?.(template)) return;
      Object.entries(template.layers)
        .filter(([, child]) => this.canFollowProduct(child) && child.anchor?.layerKey === key)
        .forEach(([childKey, child]) => {
          child._anchorDirty = true;
          this.syncPriceLayer(template, childKey, child, { scaleContent: true });
          child._anchorDirty = false;
        });
    },

    captureManualPriceTransform(key, layer, template = AppState.template, options = {}) {
      if (!this.canFollowProduct(layer) || !template?.layers) return;
      const anchorLayer = template.layers[layer.anchor.layerKey];
      if (!anchorLayer) return;
      const currentBox = Geometry.getLayerBox(layer.anchor.layerKey, anchorLayer);
      if (options.rebase === true) {
        layer.anchor.baseBox = clone(currentBox);
        layer.anchor.baseRotation = Number(anchorLayer.rotation || 0);
      }
      const baseBox = layer.anchor.baseBox || currentBox;
      const currentCenter = { x: currentBox.x + currentBox.width / 2, y: currentBox.y + currentBox.height / 2 };
      const layerCenter = { x: (layer.x || 0) + (layer.width || 0) / 2, y: (layer.y || 0) + (layer.height || 0) / 2 };
      const scaleX = baseBox.width ? currentBox.width / baseBox.width : 1;
      const scaleY = baseBox.height ? currentBox.height / baseBox.height : 1;
      const scale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2 || 1;
      const rotationDelta = Number(anchorLayer.rotation || 0) - Number(layer.anchor.baseRotation || 0);
      const unrotated = this.rotatePoint({ x: layerCenter.x - currentCenter.x, y: layerCenter.y - currentCenter.y }, -rotationDelta);
      layer.centerX = round(layerCenter.x, 2);
      layer.centerY = round(layerCenter.y, 2);
      layer.anchor.offsetX = round(unrotated.x / (scaleX || 1), 2);
      layer.anchor.offsetY = round(unrotated.y / (scaleY || 1), 2);
      layer.anchor.rotationOffset = round(Number(layer.rotation || 0) - Number(anchorLayer.rotation || 0), 2);
      layer.anchor.baseFontSizePx = round((layer.fontSizePx || 24) / scale, 2);
      layer.anchor.baseLineHeight = round((layer.lineHeight || ((layer.fontSizePx || 24) * (layer.lineHeightMultiplier || 1.08))) / scale, 2);
      layer.anchor.baseWidth = round((layer.width || 1) / (scaleX || 1), 2);
      layer.anchor.baseHeight = round((layer.height || 1) / (scaleY || 1), 2);
      if (Array.isArray(layer.textStyleRanges) && layer.textStyleRanges.length) {
        layer.anchor.baseStyleFontSizes = layer.textStyleRanges.map((range) => round(
          (Number(range && range.fontSizePx) || (layer.fontSizePx || 24)) / scale, 2));
        layer.anchor.baseStyleLineHeights = layer.textStyleRanges.map((range) => {
          const value = Number(range && range.lineHeight);
          return Number.isFinite(value) && value > 0 ? round(value / scale, 2) : null;
        });
      }
      layer._anchorDirty = false;
    },

    rotatePoint(point, degrees) {
      const rad = Number(degrees || 0) * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
    },
  };
  const PriceTransformEngine = pickLineage(PriceTransformEngine_A, PriceTransformEngine_B);
  window.PriceTransformEngine = PriceTransformEngine;
  // ── PriceCouponManager：B 系實作（外廣 wave1 V0.5 原文）──
  const PriceCouponManager_B = {
    layerPrefix: '__auto_price_v2_',

    apply(template, record) {
      // 重建前先快照同 slot 舊價格圖層的「使用者調整結果」（位置/大小/字級/anchor 基準）。
      // 價格圖層每次套用工單資料都是砍掉重建的，使用者手動調過的字級/位置只存在圖層物件上，
      // 不快照回填的話，點縮圖/批次刷新都會讓價格跳回 rule 重算的初始值（例如 82.11px 這種
      // 「基準字級 × 商品縮放比例」算出來的數字）。只在「價格文字相同」（同一筆資料的刷新，
      // 不是換了新工單內容）時回填，換新資料時仍然完全交給 rule 重新排版。
      const previousBySlot = new Map();
      Object.entries(template?.layers || {}).forEach(([key, layer]) => {
        if (!key.startsWith(this.layerPrefix) || layer?.source !== 'auto_price_v2') return;
        const slot = key.slice(this.layerPrefix.length);
        previousBySlot.set(slot, {
          text: layer.text,
          x: layer.x, y: layer.y, width: layer.width, height: layer.height,
          centerX: layer.centerX, centerY: layer.centerY, rotation: layer.rotation,
          fontSizePx: layer.fontSizePx, fontSizePt: layer.fontSizePt, lineHeight: layer.lineHeight,
          lineHeightMultiplier: layer.lineHeightMultiplier, letterSpacing: layer.letterSpacing,
          align: layer.align,
          positioningMode: layer.positioningMode,
          disableAnchorSync: layer.disableAnchorSync,
          lockToEditedJson: layer.lockToEditedJson,
          preserveExactSize: layer.preserveExactSize,
          skipAutoScale: layer.skipAutoScale,
          disableContentScale: layer.disableContentScale,
          followProduct: layer.followProduct,
          anchorDirty: layer._anchorDirty,
          anchor: layer.anchor ? clone(layer.anchor) : null,
          // 82% 特殊字元與 source-baseline 都屬於「人工價格狀態」的一部分。
          // 價格 rebuild 時若只還原 fontSizePx，而漏掉 ranges / baseline，Renderer 會繼續吃
          // 新建價格層的舊字級 ranges，造成「縮放後再點一下就跳回原大小」。
          // 整合版：price.rebuildMemoryMode＝text（KV）時不記 ranges/baseline，只回填原值。
          ...(flag('price.rebuildMemoryMode', 'textRanges') === 'text' ? {} : {
            textStyleRanges: Array.isArray(layer.textStyleRanges) ? clone(layer.textStyleRanges) : null,
            textBaselineReference: layer.textBaselineReference ? clone(layer.textBaselineReference) : null,
            styledTextVerticalAlign: layer.styledTextVerticalAlign,
            textVerticalAlign: layer.textVerticalAlign,
            spPriceTextStandard: layer.__spPriceTextStandard === true,
          }),
        });
      });

      this.remove(template);
      const rawPrice = String(record?.['價格'] || record?.['價格_左'] || '').trim();
      if (!template?.layers || !rawPrice) return [];

      const productName = String(record?.['商品圖1'] || '').trim();
      const createdKeys = this.applyForAnchor(template, {
        productName,
        rawPrice,
        anchorLayerKey: this.findAnchorLayerKey(template),
        keyPrefix: this.layerPrefix,
      });

      createdKeys.forEach((key) => {
        const slot = key.slice(this.layerPrefix.length);
        const previous = previousBySlot.get(slot);
        const layer = template.layers[key];
        if (!previous || !layer || String(previous.text) !== String(layer.text)) return;
        Object.assign(layer, {
          x: previous.x, y: previous.y, width: previous.width, height: previous.height,
          centerX: previous.centerX, centerY: previous.centerY, rotation: previous.rotation,
          fontSizePx: previous.fontSizePx, fontSizePt: previous.fontSizePt, lineHeight: previous.lineHeight,
          lineHeightMultiplier: previous.lineHeightMultiplier, letterSpacing: previous.letterSpacing,
          align: previous.align,
          positioningMode: previous.positioningMode,
          disableAnchorSync: previous.disableAnchorSync,
          lockToEditedJson: previous.lockToEditedJson,
          preserveExactSize: previous.preserveExactSize,
          skipAutoScale: previous.skipAutoScale,
          disableContentScale: previous.disableContentScale,
          followProduct: previous.followProduct,
          _anchorDirty: previous.anchorDirty,
        });
        if (previous.anchor) layer.anchor = clone(previous.anchor);
        if (flag('price.rebuildMemoryMode', 'textRanges') !== 'text') {
          if (previous.textStyleRanges) layer.textStyleRanges = clone(previous.textStyleRanges);
          else delete layer.textStyleRanges;
          if (previous.textBaselineReference) layer.textBaselineReference = clone(previous.textBaselineReference);
          else delete layer.textBaselineReference;
          if (previous.styledTextVerticalAlign !== undefined) layer.styledTextVerticalAlign = previous.styledTextVerticalAlign;
          else delete layer.styledTextVerticalAlign;
          if (previous.textVerticalAlign !== undefined) layer.textVerticalAlign = previous.textVerticalAlign;
          else delete layer.textVerticalAlign;
          if (previous.spPriceTextStandard) layer.__spPriceTextStandard = true;
          else delete layer.__spPriceTextStandard;
        }
      });
      return createdKeys;
    },

    applyForAnchor(template, { productName = '', rawPrice = '', anchorLayerKey = '', keyPrefix = this.layerPrefix } = {}) {
      if (!template?.layers || !rawPrice || !anchorLayerKey) return [];
      const rule = PriceRuleEngine.classify(productName, template, rawPrice);
      template.pricePresetMeta = {
        productName,
        rawPrice,
        layoutKey: rule.layoutKey,
        templateId: template.templateId || '',
        batchSourceName: template.batchSourceName || ''
      };

      const prices = PriceParser.parse(rawPrice, rule.isDoubleCoupon);
      if (!prices.length) return [];

      const anchorLayer = template.layers[anchorLayerKey] || null;
      const anchorBox = anchorLayer ? Geometry.getLayerBox(anchorLayerKey, anchorLayer) : null;
      if (!anchorBox) return [];

      const createdKeys = [];
      const layoutsBySlot = new Map((rule.layouts || []).map((layout) => [layout.slot, layout]));

      prices.forEach((price, index) => {
        const baseLayout = layoutsBySlot.get(price.slot) || rule.layouts[index] || rule.layouts[0];
        if (!baseLayout || !price.text) return;

        const isEditedJsonLocked = PriceRuleEngine.isEditedJsonAbsoluteLayout(baseLayout);
        if (!isEditedJsonLocked && !anchorBox) return;

        const layoutBase = PriceRuleEngine.resolveLayoutForAnchor({ ...baseLayout, layoutKey: rule.layoutKey }, anchorBox);
        // 拿掉 PriceFontResolver（依價格文字內容關鍵字縮放/覆寫座標，已確認全家族皆為死程式碼）。
        const layout = PriceLayoutResolver.fromLayout(layoutBase);
        const key = `${keyPrefix}${price.slot || index + 1}`;
        const color = PriceColorResolver.resolve(productName, template, layout.color);

        template.layers[key] = PriceLayerFactory.create({
          key,
          text: price.text,
          layout,
          color,
          anchorLayerKey,
          anchorBox,
          anchorRotation: Number(anchorLayer?.rotation || 0),
          productName,
          layoutKey: rule.layoutKey,
        });

        // 拿掉 PricePresetStore（localStorage 價格記憶）機制。
        // 價格 layer 的位置/大小 100% 由上面 PriceRuleEngine.resolveLayoutForAnchor()
        // 依 rules 檔案計算出的 layout 決定，不再套用瀏覽器裡舊的手動調整記錄。

        if (!isEditedJsonLocked) {
          PriceTransformEngine.syncPriceLayer(template, key, template.layers[key]);
        }

        this.insertAfterLayer(template, anchorLayerKey, key);
        createdKeys.push(key);
      });
      return createdKeys;
    },

    // V1.0 開源版：MALL SKBN 三欄位（左/中/右）價格排版已移除。
    // 若未來某公版需要類似的多商品圖各自對應價格的排版，
    // 建議直接在該公版的 rules/*.rules.js 內，透過 priceRules.productLayouts 為每個商品圖錨點各自設定座標，
    // 不需要在 app.core.js 內新增專屬函式。

    rebuildFromPricePreset(template) {
      if (!template?.layers) return [];

      if (!template.pricePresetMeta) return [];
      const meta = template.pricePresetMeta || {};
      const rawPrice = String(meta.rawPrice || '').trim();
      if (!rawPrice) return [];

      const productName = String(meta.productName || '').trim();
      const createdKeys = this.apply(template, {
        '商品圖1': productName,
        '價格': rawPrice,
        '價格_左': rawPrice,
      });

      // 修正：重建價格只會呼叫通用引擎，不會經過 applyRecordToTemplate 的完整流程，
      // 導致像 game_bn / live_lobby_bn 這種「用自己的 afterApplyRecordToTemplate
      // 把價格座標校正成 EDITED_LAYOUT 固定值」的家族，每次畫面重繪（縮圖重新產生、
      // 圖片重新載入等）價格都會被打回通用引擎的預設座標，且再也不會被校正回來。
      // 這裡在重建完價格後，補呼叫一次該家族自己的 afterApplyRecordToTemplate，
      // 用 template.batchRecord（原始完整記錄）讓家族自訂的排版邏輯重新套用一次。
      if (window.BatchManager?.applyTemplateRuleHook) {
        window.BatchManager.applyTemplateRuleHook('afterApplyRecordToTemplate', template, template.batchRecord || {}, [], { skipExactLayout: true });
      }

      return createdKeys;
    },

    remove(template) {
      if (!template?.layers) return;
      Object.keys(template.layers)
        .filter((key) => key.startsWith(this.layerPrefix) || template.layers[key]?.source === 'auto_price_v2' || template.layers[key]?.source === 'auto_price')
        .forEach((key) => delete template.layers[key]);
      template.renderOrder = (template.renderOrder || []).filter((key) => !key.startsWith(this.layerPrefix) && template.layers?.[key]?.source !== 'auto_price_v2' && template.layers?.[key]?.source !== 'auto_price');
    },

    insertAfterLayer(template, anchorKey, layerKey) {
      template.renderOrder = (template.renderOrder || []).filter((key) => key !== layerKey);
      const anchorIndex = anchorKey ? template.renderOrder.indexOf(anchorKey) : -1;
      template.renderOrder.splice(anchorIndex >= 0 ? anchorIndex + 1 : template.renderOrder.length, 0, layerKey);
    },

    findAnchorLayerKey(template) {
      const entries = Object.entries(template?.layers || {});
      const usableImages = entries.filter(([key, layer]) => {
        if (layer.type !== 'image' || layer.hidden) return false;
        const label = PriceRuleEngine.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
        const isBackground = label.includes('bg') || label.includes(PriceRuleEngine.norm('背景')) || label.includes('kvbg');
        const isCta = label.includes('cta') || label.includes(PriceRuleEngine.norm('按鈕')) || label.includes('button');
        const isLogo = label.includes('logo');
        return !isBackground && !isCta && !isLogo;
      });
      const rules = PriceRuleEngine.getRules(template);
      const preferredNames = Array.isArray(rules?.anchorLayerNames) ? rules.anchorLayerNames : ['商品圖1', 'P1', 'P', '曝品', 'product_1', 'product'];
      for (const name of preferredNames) {
        const n = PriceRuleEngine.norm(name);
        const matched = usableImages.find(([key, layer]) => {
          const label = PriceRuleEngine.norm(`${key} ${layer.psdName || ''} ${layer.role || ''} ${layer.assetFilename || ''}`);
          return label === n || label.includes(n) || PriceRuleEngine.norm(key) === n;
        });
        if (matched) return matched[0];
      }
      const product = usableImages.find(([key, layer]) => {
        const label = PriceRuleEngine.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
        return label.includes(PriceRuleEngine.norm('商品圖1')) || label.includes(PriceRuleEngine.norm('曝品')) || label.includes('product') || key === 'product' || label === 'p';
      });
      return product?.[0] || usableImages[0]?.[0] || '';
    },
  };
  // ── PriceCouponManager：A 系實作（正式BN V0.8 為底）──
  const PriceCouponManager_A = {
    layerPrefix: '__auto_price_v2_',

    apply(template, record) {
      // 重建前先快照同 slot 舊價格圖層的「使用者調整結果」（位置/大小/字級/anchor 基準）。
      // 價格圖層每次套用工單資料都是砍掉重建的，使用者手動調過的字級/位置只存在圖層物件上，
      // 不快照回填的話，點縮圖/批次刷新都會讓價格跳回 rule 重算的初始值（例如 82.11px 這種
      // 「基準字級 × 商品縮放比例」算出來的數字）。只在「價格文字相同」（同一筆資料的刷新，
      // 不是換了新工單內容）時回填，換新資料時仍然完全交給 rule 重新排版。
      const previousBySlot = new Map();
      Object.entries(template?.layers || {}).forEach(([key, layer]) => {
        if (!key.startsWith(this.layerPrefix) || layer?.source !== 'auto_price_v2') return;
        const slot = key.slice(this.layerPrefix.length);
        previousBySlot.set(slot, {
          text: layer.text,
          priceProductName: layer.priceProductName || '',
          priceLayoutKey: layer.priceLayoutKey || '',
          priceRuleFontSizePx: Number(layer.priceRuleFontSizePx || layer.fontSizePx || 24),
          x: layer.x, y: layer.y, width: layer.width, height: layer.height,
          centerX: layer.centerX, centerY: layer.centerY, rotation: layer.rotation,
          fontSizePx: layer.fontSizePx, fontSizePt: layer.fontSizePt, lineHeight: layer.lineHeight,
          lineHeightMultiplier: layer.lineHeightMultiplier, letterSpacing: layer.letterSpacing,
          textStyleRanges: Array.isArray(layer.textStyleRanges) ? clone(layer.textStyleRanges) : null,
          styledTextVerticalAlign: layer.styledTextVerticalAlign,
          textVerticalAlign: layer.textVerticalAlign,
          textBaselineReference: layer.textBaselineReference ? clone(layer.textBaselineReference) : null,
          align: layer.align,
          positioningMode: layer.positioningMode,
          disableAnchorSync: layer.disableAnchorSync,
          lockToEditedJson: layer.lockToEditedJson,
          preserveExactSize: layer.preserveExactSize,
          skipAutoScale: layer.skipAutoScale,
          disableContentScale: layer.disableContentScale,
          followProduct: layer.followProduct,
          anchorDirty: layer._anchorDirty,
          anchor: layer.anchor ? clone(layer.anchor) : null,
        });
      });

      this.remove(template);
      if (!template?.layers) return [];

      // 2026-08-13：多格價格版位（例：04_Mall Skinny BN 左/中/右各自價格）。
      // 由該公版 rule 宣告 priceSlots = [{ slotId, priceField, productField, anchorLayerKey }]，
      // 每格各自錨定自己的 P 圖層、獨立建立價格圖層（keyPrefix 帶 slotId 避免衝突）。
      // 未宣告 priceSlots 的版位維持原本「單一價格」路徑，行為完全不變。
      const priceFamilyId = template?.ruleFamily || template?.sheetTemplateRoute?.family || CapsuleRuleEngine.getTemplateFamily(template);
      const priceFamilyConfig = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.get?.(priceFamilyId);
      const priceSlots = priceFamilyConfig?.rules?.priceSlots || priceFamilyConfig?.priceSlots || null;

      // 2026-08-14 防呆（全版位）：Google Sheets 會把「20%」存成 0.2 這類純小數，
      // 價格欄讀到 0～1 之間的純小數時自動轉回百分比文字（0.2→20%）。
      const normalizePriceValue = (value) => {
        const text = String(value == null ? '' : value).trim();
        if (flag('price.normalizeDecimalPercent', true) && /^0?\.\d+$/.test(text)) {
          const numeric = Number(text);
          if (isFinite(numeric) && numeric > 0 && numeric < 1) return `${Math.round(numeric * 1000) / 10}%`;
        }
        return text;
      };

      let createdKeys = [];
      let productName = String(record?.['商品圖1'] || '').trim();
      if (Array.isArray(priceSlots) && priceSlots.length) {
        priceSlots.forEach((slotCfg) => {
          const price = normalizePriceValue(record?.[slotCfg.priceField]);
          const anchorKey = slotCfg.anchorLayerKey;
          if (!price || !anchorKey || !template.layers[anchorKey] || template.layers[anchorKey].hidden) return;
          const slotProduct = String(record?.[slotCfg.productField] || record?.['商品圖1'] || '').trim();
          const keys = this.applyForAnchor(template, {
            productName: slotProduct,
            rawPrice: price,
            anchorLayerKey: anchorKey,
            keyPrefix: `${this.layerPrefix}${slotCfg.slotId}_`,
          });
          createdKeys.push(...keys);
        });
      } else {
        const rawPrice = normalizePriceValue(record?.['價格'] || record?.['價格_左']);
        if (!rawPrice) return [];
        createdKeys = this.applyForAnchor(template, {
          productName,
          rawPrice,
          anchorLayerKey: this.findAnchorLayerKey(template),
          keyPrefix: this.layerPrefix,
        });
      }

      createdKeys.forEach((key) => {
        const slot = key.slice(this.layerPrefix.length);
        const previous = previousBySlot.get(slot);
        const layer = template.layers[key];
        if (!previous || !layer) return;
        // 幾何記憶綁定「相同 P 素材＋相同價格 slot／版型」，不綁定價格文字。
        // 因此 $4,000 換成 $200 時仍沿用同一張票券素材的價格位置；換素材則回到新素材自己的 Rule/智慧紀錄。
        const sameProduct = PriceRuleEngine.norm(previous.priceProductName || '')
          === PriceRuleEngine.norm(layer.priceProductName || productName || '');
        const sameLayout = !previous.priceLayoutKey || !layer.priceLayoutKey
          || previous.priceLayoutKey === layer.priceLayoutKey;
        if (!sameProduct || !sameLayout) return;
        const newRuleFontSize = Math.max(0.01, Number(layer.priceRuleFontSizePx || layer.fontSizePx || 24));
        const previousRuleFontSize = Math.max(0.01, Number(previous.priceRuleFontSizePx || previous.fontSizePx || 24));
        const typographyScale = Math.max(0.01, Number(previous.fontSizePx || previousRuleFontSize) / previousRuleFontSize);
        const rebuiltRanges = Array.isArray(layer.textStyleRanges)
          ? layer.textStyleRanges.map((range) => ({
              ...range,
              fontSizePx: round(Number(range?.fontSizePx || newRuleFontSize) * typographyScale, 2),
            }))
          : undefined;
        const rebuiltFontSize = round(newRuleFontSize * typographyScale, 2);
        const rebuiltLineHeight = round(Number(layer.lineHeight || rebuiltFontSize * (layer.lineHeightMultiplier || 1.08)) * typographyScale, 2);

        Object.assign(layer, {
          x: previous.x, y: previous.y, width: previous.width, height: previous.height,
          centerX: previous.centerX, centerY: previous.centerY, rotation: previous.rotation,
          fontSizePx: rebuiltFontSize, fontSizePt: rebuiltFontSize, lineHeight: rebuiltLineHeight,
          lineHeightMultiplier: layer.lineHeightMultiplier, letterSpacing: previous.letterSpacing,
          textStyleRanges: rebuiltRanges,
          styledTextVerticalAlign: rebuiltRanges ? TextBaselineModel.SOURCE_MODE : 'default',
          textVerticalAlign: previous.textVerticalAlign || TextBaselineModel.SOURCE_MODE,
          textBaselineReference: previous.textBaselineReference
            ? clone(previous.textBaselineReference)
            : layer.textBaselineReference,
          align: previous.align,
          positioningMode: previous.positioningMode,
          disableAnchorSync: previous.disableAnchorSync,
          lockToEditedJson: previous.lockToEditedJson,
          preserveExactSize: previous.preserveExactSize,
          skipAutoScale: previous.skipAutoScale,
          disableContentScale: previous.disableContentScale,
          followProduct: previous.followProduct,
          _anchorDirty: previous.anchorDirty,
          // 讓公版 afterApplyRecordToTemplate 知道：這一層已回填使用者調整結果。
          // 在 skipExactLayout 刷新流程中不得再把它重設回 Rule 初始座標／字級。
          __preservedManualTransform: true,
        });
        if (previous.anchor) layer.anchor = clone(previous.anchor);
        if (layer.anchor) PriceTransformEngine.captureManualPriceTransform(key, layer, template);
      });
      return createdKeys;
    },

    applyForAnchor(template, { productName = '', rawPrice = '', anchorLayerKey = '', keyPrefix = this.layerPrefix } = {}) {
      if (!template?.layers || !rawPrice || !anchorLayerKey) return [];
      const rule = PriceRuleEngine.classify(productName, template, rawPrice);
      template.pricePresetMeta = {
        productName,
        rawPrice,
        layoutKey: rule.layoutKey,
        templateId: template.templateId || '',
        batchSourceName: template.batchSourceName || ''
      };

      const prices = PriceParser.parse(rawPrice, rule.isDoubleCoupon);
      if (!prices.length) return [];

      const anchorLayer = template.layers[anchorLayerKey] || null;
      const anchorBox = anchorLayer ? Geometry.getLayerBox(anchorLayerKey, anchorLayer) : null;
      if (!anchorBox) return [];

      const createdKeys = [];
      const layoutsBySlot = new Map((rule.layouts || []).map((layout) => [layout.slot, layout]));

      prices.forEach((price, index) => {
        const baseLayout = layoutsBySlot.get(price.slot) || rule.layouts[index] || rule.layouts[0];
        if (!baseLayout || !price.text) return;

        const isEditedJsonLocked = PriceRuleEngine.isEditedJsonAbsoluteLayout(baseLayout);
        if (!isEditedJsonLocked && !anchorBox) return;

        const anchorRotation = Number(anchorLayer?.rotation || 0);
        const layoutBase = PriceRuleEngine.resolveLayoutForAnchor(
          { ...baseLayout, layoutKey: rule.layoutKey },
          anchorBox,
          anchorRotation
        );
        const resolvedLayout = PriceLayoutResolver.fromLayout(layoutBase);
        const key = `${keyPrefix}${price.slot || index + 1}`;
        const color = PriceColorResolver.resolve(productName, template, resolvedLayout.color, price.slot || 'single');
        const layout = PriceTypographyResolver.apply(price.text, resolvedLayout, color, template);

        template.layers[key] = PriceLayerFactory.create({
          key,
          text: price.text,
          layout,
          color,
          anchorLayerKey,
          anchorBox,
          anchorRotation,
          productName,
          layoutKey: rule.layoutKey,
        });

        // 拿掉 PricePresetStore（localStorage 價格記憶）機制。
        // 價格 layer 的位置/大小 100% 由上面 PriceRuleEngine.resolveLayoutForAnchor()
        // 依 rules 檔案計算出的 layout 決定，不再套用瀏覽器裡舊的手動調整記錄。

        if (!isEditedJsonLocked) {
          PriceTransformEngine.syncPriceLayer(template, key, template.layers[key]);
        }

        this.insertAfterLayer(template, anchorLayerKey, key);
        createdKeys.push(key);
      });
      return createdKeys;
    },

    // V1.0 開源版：MALL SKBN 三欄位（左/中/右）價格排版已移除。
    // 若未來某公版需要類似的多商品圖各自對應價格的排版，
    // 建議直接在該公版的 rules/*.rules.js 內，透過 priceRules.productLayouts 為每個商品圖錨點各自設定座標，
    // 不需要在 app.core.js 內新增專屬函式。

    rebuildFromPricePreset(template) {
      if (!template?.layers) return [];

      if (!template.pricePresetMeta) return [];
      const meta = template.pricePresetMeta || {};
      const rawPrice = String(meta.rawPrice || '').trim();
      if (!rawPrice) return [];

      const productName = String(meta.productName || '').trim();
      const createdKeys = this.apply(template, {
        '商品圖1': productName,
        '價格': rawPrice,
        '價格_左': rawPrice,
      });

      // 修正：重建價格只會呼叫通用引擎，不會經過 applyRecordToTemplate 的完整流程，
      // 導致像 game_bn / live_lobby_bn 這種「用自己的 afterApplyRecordToTemplate
      // 把價格座標校正成 EDITED_LAYOUT 固定值」的家族，每次畫面重繪（縮圖重新產生、
      // 圖片重新載入等）價格都會被打回通用引擎的預設座標，且再也不會被校正回來。
      // 這裡在重建完價格後，補呼叫一次該家族自己的 afterApplyRecordToTemplate，
      // 用 template.batchRecord（原始完整記錄）讓家族自訂的排版邏輯重新套用一次。
      if (window.BatchManager?.applyTemplateRuleHook) {
        window.BatchManager.applyTemplateRuleHook('afterApplyRecordToTemplate', template, template.batchRecord || {}, [], { skipExactLayout: true });
      }

      return createdKeys;
    },

    remove(template) {
      if (!template?.layers) return;
      Object.keys(template.layers)
        .filter((key) => key.startsWith(this.layerPrefix) || template.layers[key]?.source === 'auto_price_v2' || template.layers[key]?.source === 'auto_price')
        .forEach((key) => delete template.layers[key]);
      template.renderOrder = (template.renderOrder || []).filter((key) => !key.startsWith(this.layerPrefix) && template.layers?.[key]?.source !== 'auto_price_v2' && template.layers?.[key]?.source !== 'auto_price');
    },

    insertAfterLayer(template, anchorKey, layerKey) {
      template.renderOrder = (template.renderOrder || []).filter((key) => key !== layerKey);
      const anchorIndex = anchorKey ? template.renderOrder.indexOf(anchorKey) : -1;
      template.renderOrder.splice(anchorIndex >= 0 ? anchorIndex + 1 : template.renderOrder.length, 0, layerKey);
    },

    findAnchorLayerKey(template) {
      const entries = Object.entries(template?.layers || {});
      const usableImages = entries.filter(([key, layer]) => {
        if (layer.type !== 'image' || layer.hidden) return false;
        const label = PriceRuleEngine.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
        const isBackground = label.includes('bg') || label.includes(PriceRuleEngine.norm('背景')) || label.includes('kvbg');
        const isCta = label.includes('cta') || label.includes(PriceRuleEngine.norm('按鈕')) || label.includes('button');
        const isLogo = label.includes('logo');
        return !isBackground && !isCta && !isLogo;
      });
      const rules = PriceRuleEngine.getRules(template);
      const preferredNames = Array.isArray(rules?.anchorLayerNames) ? rules.anchorLayerNames : ['商品圖1', 'P1', 'P', '曝品', 'product_1', 'product'];
      for (const name of preferredNames) {
        const n = PriceRuleEngine.norm(name);
        const matched = usableImages.find(([key, layer]) => {
          const label = PriceRuleEngine.norm(`${key} ${layer.psdName || ''} ${layer.role || ''} ${layer.assetFilename || ''}`);
          return label === n || label.includes(n) || PriceRuleEngine.norm(key) === n;
        });
        if (matched) return matched[0];
      }
      const product = usableImages.find(([key, layer]) => {
        const label = PriceRuleEngine.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
        return label.includes(PriceRuleEngine.norm('商品圖1')) || label.includes(PriceRuleEngine.norm('曝品')) || label.includes('product') || key === 'product' || label === 'p';
      });
      return product?.[0] || usableImages[0]?.[0] || '';
    },
  };
  const PriceCouponManager = pickLineage(PriceCouponManager_A, PriceCouponManager_B);
  window.PriceCouponManager = PriceCouponManager;
  // ── BatchManager：B 系實作（外廣 wave1 V0.5 原文）──
  const BatchManager_B = {
    // （AMS）batch.extraFields＝lineShoppingAms：多算 檔名／店名／LINE_POINTS_PERCENT（core 建構時 profile 已確定）。
    fields: ['主標', '副標', '文案', 'LOGO', '警語', '商品圖1', '商品圖2', '商品圖_左', '商品圖_中', '商品圖_右', 'CTA', '價格', '價格_左', '價格_中', '價格_右', '文案_左', '文案_中', '文案_右', '票券', '票券案型', '版位',
      ...(flag('batch.extraFields', 'none') === 'lineShoppingAms' ? ['檔名', '店名', 'LINE_POINTS_PERCENT'] : [])],
    imageExts: ['png', 'jpg', 'jpeg', 'webp', 'svg'],

    // 把 worksheet 轉成二維陣列，並把「垂直合併儲存格」往下補值。
    // XLSX.utils.sheet_to_json 對合併儲存格只會在左上角那一格填值，其餘格會是空字串，
    // 矩陣式工單（例如「17th + 18 day KV」）常用合併儲存格讓多個版位共用同一份文案，
    // 所以這裡要用 sheet['!merges'] 把同一個合併範圍內、同一欄的值往下複製，parseMatrixSheet 才讀得到。
    sheetToRowsWithMergedFill(sheet) {
      const workbook = AppState.excelWorkbook;
      const sheetName = workbook?.SheetNames?.find((name) => workbook.Sheets?.[name] === sheet) || '';
      const range = sheet?.['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
      const resolving = new Set();

      const readCell = (targetSheet, targetSheetName, rowIndex, columnIndex) => {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const token = `${targetSheetName}!${address}`;
        if (resolving.has(token)) return '';
        const cell = targetSheet?.[address];
        if (!cell) return '';

        // Formula cells must use Excel's cached/displayed result first.
        if (cell.f) {
          if (cell.w !== undefined && cell.w !== null && String(cell.w) !== '') return cell.w;
          if (cell.v !== undefined && cell.v !== null && cell.v !== '') return cell.v;

          // Safe fallback: only a single-cell reference is resolved. Complex formulas are never guessed.
          const formula = String(cell.f || '').trim();
          const reference = formula.match(/^(?:(?:'((?:[^']|'')+)'|([^!]+))!)?\$?([A-Z]{1,3})\$?(\d+)$/i);
          if (!reference) return '';
          const referencedSheetName = (reference[1] ? reference[1].replace(/''/g, "'") : reference[2]?.trim()) || targetSheetName;
          const referencedSheet = workbook?.Sheets?.[referencedSheetName];
          if (!referencedSheet) return '';
          resolving.add(token);
          try {
            return readCell(
              referencedSheet,
              referencedSheetName,
              Number(reference[4]) - 1,
              XLSX.utils.decode_col(reference[3].toUpperCase()),
            );
          } finally {
            resolving.delete(token);
          }
        }

        // Preserve real numeric types for combination validation; text uses the displayed value when available.
        if (cell.t === 'n' && typeof cell.v === 'number') return cell.v;
        if (cell.w !== undefined && cell.w !== null && String(cell.w) !== '') return cell.w;
        return cell.v ?? '';
      };

      const rows = [];
      // （OM_w2）batch.rowsFromZero：從第 0 列／欄開始填，避免 !ref 不從 A1 起算時出現稀疏陣列讓 sheetParser 失敗。
      const rowsFromZero = flag('batch.rowsFromZero', false);
      for (let rowIndex = rowsFromZero ? 0 : range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        const row = [];
        for (let columnIndex = rowsFromZero ? 0 : range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
          row[columnIndex] = readCell(sheet, sheetName, rowIndex, columnIndex);
        }
        rows[rowIndex] = row;
      }

      // （鏡面）記下「這一格是合併儲存格往下填出來的」，規則檔的 sheetParser 才不會把合併範圍內每一列都當成新的一筆。
      const mergedFills = new Set();
      const merges = sheet?.['!merges'] || [];
      merges.forEach((mergeRange) => {
        const { s: startCell, e: endCell } = mergeRange || {};
        if (!startCell || !endCell || startCell.c !== endCell.c || endCell.r <= startCell.r) return;
        const topValue = rows[startCell.r]?.[startCell.c];
        if (topValue === undefined || topValue === '') return;
        for (let rowIndex = startCell.r + 1; rowIndex <= endCell.r; rowIndex += 1) {
          if (!rows[rowIndex]) rows[rowIndex] = [];
          if (rows[rowIndex][startCell.c] === undefined || rows[rowIndex][startCell.c] === '') {
            rows[rowIndex][startCell.c] = topValue;
            mergedFills.add(`${rowIndex}:${startCell.c}`);
          }
        }
      });
      Object.defineProperty(rows, '__mergedFills', { value: mergedFills, enumerable: false });
      return rows;
    },

    async handleExcelFile(file) {
      if (!file) return;
      if (DOM.batchStatus) DOM.batchStatus.textContent = `正在讀取工單：${file.name}...`;
      if (!window.XLSX) {
        if (DOM.batchStatus) DOM.batchStatus.textContent = '工單解析套件 XLSX 未載入，請確認可連線載入 CDN。';
        alert('目前找不到工單解析套件 XLSX，請確認網路可載入 CDN，或將 xlsx.full.min.js 放入本工具資料夾。');
        return;
      }
      try {
        const buffer = await file.arrayBuffer();
        AppState.excelWorkbook = XLSX.read(buffer, { type: 'array' });
        AppState.excelFileName = file.name;
        this.renderSheetOptions();
        const initialSheet = DOM.excelSheetSelect?.value || AppState.excelWorkbook.SheetNames[0];
        this.detectAndOfferProjectsFromSheet(initialSheet);
        if (DOM.batchStatus) DOM.batchStatus.textContent = `已讀取：${file.name}`;
      } catch (error) {
        console.error('[工單] 讀取失敗:', error);
        alert('工單讀取失敗，請確認檔案格式為 .xlsx / .xls / .xlsm。');
      }
    },

    renderSheetOptions() {
      if (!DOM.excelSheetSelect || !AppState.excelWorkbook) return;
      DOM.excelSheetSelect.disabled = false;
      DOM.generateFromExcelBtn && (DOM.generateFromExcelBtn.disabled = false);
      DOM.excelSheetSelect.innerHTML = AppState.excelWorkbook.SheetNames
        .map((name) => `<option value="${this.escape(name)}">${this.escape(name)}</option>`)
        .join('');
    },

    async generateFromSelectedSheet() {
      if (!AppState.excelWorkbook) return alert('請先上傳工單。');
      // 每次重新由 Excel 產生製作物都建立新的 Smart Object Session；禁止沿用上一批人工 Transform。
      window.SmartAssetManager?.resetSession?.();
      if (DOM.batchStatus) DOM.batchStatus.textContent = '正在解析工單並產生批次圖檔...';
      const sheetName = DOM.excelSheetSelect?.value || AppState.excelWorkbook.SheetNames[0];
      const sheet = AppState.excelWorkbook.Sheets[sheetName];
      if (!sheet) return alert('找不到指定分頁。');

      if (!AppState.sourceTemplates) AppState.sourceTemplates = this.ensureTemplatePool(AppState.templates);

      // Spec 專用解析器：由 AssetSpecEngine 提供，必要欄位完整時優先使用；否則完整退回既有解析流程。
      const networkRows = this.sheetToRowsWithMergedFill(sheet);
      if (window.AssetSpecEngine?.findHeader?.(networkRows)) {
        const startedAt = performance.now();
        const result = window.AssetSpecEngine.build({ rows: networkRows, sourceTemplates: AppState.sourceTemplates, clone, sheetName });
        AppState.unmatchedBatchItems = result.unmatched || [];
        AppState.batchItems = result.generated || [];
        AppState.batchDiagnostics = result.diagnostics || {};
        AppState.batchDiagnostics.elapsedMs = performance.now() - startedAt;
        if (!result.generated?.length) { this.renderBatchUI(); alert('工單沒有產生圖片，請查看診斷清單。'); return; }
        AppState.templates = result.generated; AppState.activeIndex = 0; AppState.template = AppState.templates[0].data;
        AppState.selectedLayers = []; AppState.batchMode = true;
        this.renderBatchUI(); this.renderPreviewPlaceholders(); LoadingOverlay.show('正在載入第 1 張素材...', 0);
        try { await this.renderPreviewGrid({ showProgress: true, revealWhenDone: true }); } finally { LoadingOverlay.hide(); }
        App.sync(); this.renderBatchUI(); return;
      }

      // All模式：對每個偵測到的專案各跑一次完整的解析+套版流程（讀取素材時 AppState.currentProject
      // 暫時被設成各自的專案名稱，讓 AssetStore / rules 的專案配色、LOGO判斷都讀到正確專案）。
      // 單一專案模式維持完全原本的行為（只跑一次、檔名不加專案前綴）。
      const isAllMode = AppState.currentProject === ALL_PROJECTS_VALUE;
      const projectsToRun = isAllMode
        ? [...new Set(AppState.detectedExcelProjects || [])]
        : [AppState.currentProject || ''];

      if (isAllMode && !projectsToRun.length) {
        alert('沒有偵測到任何專案，無法使用「All」模式。');
        return;
      }

      const originalProject = AppState.currentProject;
      let allGenerated = [];
      let allUnmatched = [];
      let allEmptyBlocks = [];
      let lastDiagnostics = null;
      let lastSkippedRows = [];

      try {
        for (const project of projectsToRun) {
          AppState.currentProject = project;
          const result = await this.generateForCurrentProject(sheetName, sheet);
          lastDiagnostics = result.diagnostics;
          lastSkippedRows = result.diagnostics?.skippedRows || [];

          const projectGenerated = isAllMode
            ? result.generated.map((item) => {
                const prefixedName = `${project}_${item.name}`;
                const data = clone(item.data);
                data.templateId = prefixedName;
                data.batchProject = project;
                return { ...item, name: prefixedName, data, project };
              })
            : result.generated;

          allGenerated = allGenerated.concat(projectGenerated);
          allUnmatched = allUnmatched.concat(result.unmatched.map((u) => (isAllMode ? { ...u, project } : u)));
          allEmptyBlocks = allEmptyBlocks.concat(result.emptyBlocks.map((e) => (isAllMode ? { ...e, project } : e)));
        }
      } finally {
        AppState.currentProject = originalProject;
      }

      AppState.unmatchedBatchItems = [...allUnmatched, ...allEmptyBlocks];
      AppState.batchItems = allGenerated;
      AppState.batchGroupsOpen = {};
      AppState.batchDiagnostics = {
        ...lastDiagnostics,
        generatedCount: allGenerated.length,
        unmatchedCount: allUnmatched.length,
        emptyBlockCount: allEmptyBlocks.length,
        skippedRows: lastSkippedRows,
      };

      if (!allGenerated.length) {
        this.renderBatchUI();
        if (!allUnmatched.length && !allEmptyBlocks.length && !lastDiagnostics?.parsedBlockCount) {
          alert(lastDiagnostics?.anchorCount
            ? '沒有產生任何圖片：有找到「製作內容」，但沒有找到同列欄位或有效資料列。'
            : '沒有產生任何圖片：找不到「製作內容」、欄位列，或欄位下方沒有有效資料。');
          return;
        }
        const reasons = [
          allUnmatched.length ? `找不到公版 ${allUnmatched.length} 筆` : '',
          allEmptyBlocks.length ? `欄位空白 ${allEmptyBlocks.length} 筆` : '',
          !allUnmatched.length && !allEmptyBlocks.length ? '沒有有效資料列' : '',
        ].filter(Boolean).join('；');
        alert(`沒有產生任何圖片：${reasons}。請查看左側「未匹配 / 診斷」清單。`);
        return;
      }

      AppState.templates = allGenerated;
      AppState.activeIndex = 0;
      AppState.template = AppState.templates[0].data;
      AppState.selectedLayers = [];
      AppState.batchMode = true;

      // 批次產圖後先顯示浮動進度，不再先顯示缺圖的預覽。
      this.renderBatchUI();
      this.renderPreviewPlaceholders();
      LoadingOverlay.show('正在載入第 1 張素材...', 0);

      try {
        await this.renderPreviewGrid({ showProgress: true, revealWhenDone: true });
      } catch (error) {
        console.warn('[Batch Preview] 產生縮圖失敗:', error);
      } finally {
        LoadingOverlay.hide();
      }

      App.sync();
      this.renderBatchUI();
    },

    // 針對「目前 AppState.currentProject」這一個專案，執行完整的 Excel 解析 + 套版邏輯。
    // 這個函式本身不管 All模式；All模式的迴圈跟檔名前綴/資料夾分類都由呼叫端 generateFromSelectedSheet 處理，
    // 這裡維持跟原本單一專案模式完全一樣的邏輯，只是抽出來讓 All模式可以重複呼叫。
    async generateForCurrentProject(sheetName, sheet) {
      const rows = this.sheetToRowsWithMergedFill(sheet);
      const parseResult = this.parseRows(rows);
      const parsedBlocks = parseResult.blocks || [];
      const diagnostics = {
        sheetName,
        anchorCount: parseResult.anchorCount || 0,
        parsedBlockCount: parsedBlocks.length,
        recordCount: parsedBlocks.reduce((sum, block) => sum + (block.records?.length || 0), 0),
        sourceTemplateNames: (AppState.sourceTemplates || AppState.templates || []).map((t) => t.name || t.data?.templateId || t.file || '未命名公版'),
        warnings: parseResult.warnings || [],
        skippedRows: parseResult.skippedRows || [],
      };

      if (!parsedBlocks.length) {
        return { generated: [], unmatched: [], emptyBlocks: [], diagnostics };
      }

      const generated = [];
      const unmatched = [];
      const emptyBlocks = [];
      let sourceTemplates = AppState.sourceTemplates?.length ? AppState.sourceTemplates : AppState.templates;
      const counters = new Map();

      for (const block of parsedBlocks) {
        let generatedInBlock = 0;
        for (const record of block.records) {
          // 整合版 batch.recordContentMode：fields＝標準欄位有值；anyField（鏡面）＝帶 __workflow 或任一非 __ 欄位有值。
          const hasAnyContent = record?.__hasContent === true
            || (flag('batch.recordContentMode', 'fields') === 'anyField'
              ? (Boolean(record?.__workflow) || Object.keys(record || {}).some((field) => !field.startsWith('__') && String(record[field] || '').trim()))
              : this.fields.some((field) => String(record[field] || '').trim()));
          if (!hasAnyContent) continue;

          const recordRoute = this.resolveRecordTemplateRoute(block, record);
          if (recordRoute) {
            const routeTemplate = await this.ensureTemplateForRoute(recordRoute, sourceTemplates);
            if (routeTemplate && !sourceTemplates.some((item) => this.norm(item?.data?.templateId || item?.name || item?.file) === this.norm(routeTemplate?.data?.templateId || routeTemplate?.name || routeTemplate?.file))) {
              sourceTemplates = [routeTemplate, ...sourceTemplates];
            }
          }

          const matchInfo = recordRoute
            ? this.findTemplateForRoute(recordRoute, sourceTemplates)
            : this.findTemplateForName(block.name, sourceTemplates);
          if (!matchInfo?.template) {
            unmatched.push({ name: block.name, reason: matchInfo?.reason || '找不到對應公版關鍵字' });
            continue;
          }

          const templateName = matchInfo.template.name || matchInfo.template.data?.templateId || '公版';
          const baseName = recordRoute?.outputPrefix || this.makeOutputPrefix(block.name, templateName);
          const variantRecords = this.expandRecordVariantsForTemplate(matchInfo.template.data, record);
          // （OM_w2）規則可提供 resolveOutputNameForTemplate 決定輸出檔名（未提供＝原行為）。
          const routeRules = recordRoute?.family
            ? (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(recordRoute.family)
            : null;

          for (const variantRecord of variantRecords) {
            let ruleOutputName = '';
            if (typeof routeRules?.resolveOutputNameForTemplate === 'function') {
              try {
                ruleOutputName = String(routeRules.resolveOutputNameForTemplate({
                  record: variantRecord,
                  template: matchInfo.template.data,
                  block,
                  route: recordRoute,
                }) || '').trim();
              } catch (error) {
                console.warn('[Batch] resolveOutputNameForTemplate failed:', error);
              }
            }
            const requestedOutputName = String(ruleOutputName || recordRoute?.outputName || variantRecord.__outputName || '').trim();
            const seq = (counters.get(baseName) || 0) + 1;
            counters.set(baseName, seq);
            const suffix = this.normalizeOutputSuffix(variantRecord.__outputSuffix || variantRecord._outputSuffix || '');
            const outputName = requestedOutputName
              ? requestedOutputName.replace(/[\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()
              : `${baseName}_${String(seq).padStart(2, '0')}${suffix ? `_${suffix}` : ''}`;
            const data = clone(matchInfo.template.data);
            data.templateId = outputName;
            data.batchSourceName = block.name;
            data.batchProject = AppState.currentProject && AppState.currentProject !== ALL_PROJECTS_VALUE ? AppState.currentProject : '';
            if (data.batchProject && !variantRecord.__project) variantRecord.__project = data.batchProject;
            if (recordRoute) {
              data.ruleFamily = recordRoute.family || recordRoute.key;
              data.sheetTemplateRoute = { key: recordRoute.key, family: recordRoute.family || recordRoute.key, label: recordRoute.label, sourceTemplateId: recordRoute.templateId, ruleFile: recordRoute.ruleFile };
            }
            this.applyRecordToTemplate(data, variantRecord);
            generated.push({ name: outputName, file: `${outputName}.generated`, visible: true, data, batchRecord: variantRecord, project: data.batchProject || '' });
            generatedInBlock += 1;
          }
        }
        if (!generatedInBlock) emptyBlocks.push({ name: block.name, reason: '指定欄位都是空白' });
      }

      return { generated, unmatched, emptyBlocks, diagnostics };
    },

    expandRecordVariantsForTemplate(template, record) {
      const family = template?.ruleFamily || template?.sheetTemplateRoute?.family || CapsuleRuleEngine.getTemplateFamily(template);
      const rules = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(family) || {};
      const variantFactory = rules?.createVariantRecords
        || rules?.expandRecordVariants
        || rules?.variantRules?.createVariantRecords;

      if (typeof variantFactory !== 'function') return [record];

      try {
        const variants = variantFactory({ ...record }, { template, family });
        return Array.isArray(variants) && variants.length ? variants : [record];
      } catch (error) {
        console.warn('[Batch] expandRecordVariants failed:', { family, error });
        return [record];
      }
    },

    normalizeOutputSuffix(value) {
      return String(value || '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '')
        .replace(/^_+|_+$/g, '');
    },

    // 矩陣式工單格式：一列代表一個版位（公版），每個專案各佔一組欄位（內容欄＋勾選欄），
    // 例如「17th + 18 day KV」這種表格：
    //   - 某一列有一格文字是「資料夾名稱」，右邊幾格是各專案名稱（例如「4.17 直播日」「4.18 暖身」「4.18 正式」）
    //   - 再往下幾列，有一列的某一格文字是「版位」，這一列同時也是各專案「勾選欄」的位置
    //   - 版位列往下，每一列的「版位」欄是公版名稱，各專案內容欄用多行文字寫「LOGO：xxx\n主標題：xxx\n副標題：xxx」
    // 偵測到這種格式時，直接解析成 blocks 回傳；偵測不到（一般逐列格式）就回傳 null，交給 parseRows 原本的邏輯處理。
    // 找出矩陣式工單的「資料夾名稱」列與各專案名稱對應的欄位索引。
    // 回傳 null 代表這不是矩陣式格式；回傳 {folderRow, folderCol, projectContentCol, projectNames}。
    detectMatrixProjectNames(rows) {
      const clean = (value) => String(value ?? '').trim();
      const normEq = (a, b) => this.norm(a) === this.norm(b) && this.norm(a) !== '';

      let folderRow = -1;
      let folderCol = -1;
      for (let r = 0; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const c = row.findIndex((cell) => normEq(cell, '資料夾名稱'));
        if (c !== -1) { folderRow = r; folderCol = c; break; }
      }
      if (folderRow === -1) return null;

      const projectContentCol = {};
      const projectNames = [];
      (rows[folderRow] || []).forEach((cell, c) => {
        if (c <= folderCol) return;
        const value = clean(cell);
        if (!value) return;
        projectContentCol[value] = c;
        projectNames.push(value);
      });
      if (!projectNames.length) return null;

      return { folderRow, folderCol, projectContentCol, projectNames };
    },

    // 工單讀取檔案／切換分頁時呼叫：如果這個分頁是矩陣式工單格式，
    // 把偵測到的專案名稱（例如「4.17 直播日」）自動補進「目前專案」下拉選單，
    // 這是「目前專案」選單唯一的資料來源（V5.0已無build產物可用）。
    detectAndOfferProjectsFromSheet(sheetName) {
      try {
        if (!window.XLSX || !AppState.excelWorkbook) return;
        const sheet = AppState.excelWorkbook.Sheets[sheetName];
        if (!sheet) return;
        const rows = this.sheetToRowsWithMergedFill(sheet);
        const detected = this.detectMatrixProjectNames(rows);
        // 切換分頁時，先清掉上一個分頁殘留的偵測結果，避免「這個分頁明明不是矩陣式工單，
        // 卻因為沿用上一個分頁的專案清單」而誤跳出目前專案的浮動視窗。
        AppState.detectedExcelProjects = detected?.projectNames?.length ? detected.projectNames : [];
        TemplateLoader.populateProjectOptions();
      } catch (error) {
        console.warn('[Batch] 偵測矩陣式工單專案名稱失敗:', error);
      }
    },

    parseMatrixSheet(rows) {
      const clean = (value) => String(value ?? '').trim();
      const normEq = (a, b) => this.norm(a) === this.norm(b) && this.norm(a) !== '';

      // 1) 找「資料夾名稱」那一列，取得每個專案名稱對應的「內容欄」欄位索引。
      const detected = this.detectMatrixProjectNames(rows);
      if (!detected) return null;
      const { folderRow, projectContentCol, projectNames } = detected;

      // 2) 從資料夾名稱列往下找「版位」欄位所在列（表頭列），同一列上文字等於某專案名稱（且不是內容欄本身）的欄位，視為該專案的勾選欄。
      let headerRow = -1;
      let positionCol = -1;
      for (let r = folderRow + 1; r < Math.min(rows.length, folderRow + 8); r += 1) {
        const row = rows[r] || [];
        const c = row.findIndex((cell) => normEq(cell, '版位'));
        if (c !== -1) { headerRow = r; positionCol = c; break; }
      }
      if (headerRow === -1) return null;

      const projectCheckboxCol = {};
      (rows[headerRow] || []).forEach((cell, c) => {
        const value = clean(cell);
        if (!value) return;
        const matchedProject = projectNames.find((name) => normEq(value, name) && c !== projectContentCol[name]);
        if (matchedProject && projectCheckboxCol[matchedProject] === undefined) projectCheckboxCol[matchedProject] = c;
      });

      // 3) 「目前專案」下拉選單決定要讀哪個專案欄位（跟素材資料夾比對共用同一個選擇，兩者邏輯一致）。
      const selectedProject = AppState.currentProject || '';
      const matchedProjectName = projectNames.find((name) => normEq(name, selectedProject))
        || (selectedProject ? projectNames.find((name) => this.norm(name).includes(this.norm(selectedProject)) || this.norm(selectedProject).includes(this.norm(name))) : null);

      if (!matchedProjectName) {
        return {
          blocks: [],
          warnings: [`偵測到矩陣式工單（專案欄位：${projectNames.join('、')}），但「目前專案」下拉選單目前是「${selectedProject || '（未選擇）'}」，跟這幾個專案名稱對不起來，請確認「目前專案」有沒有選對。`],
          anchorCount: projectNames.length,
          skippedRows: [],
        };
      }

      const contentCol = projectContentCol[matchedProjectName];
      const checkboxCol = projectCheckboxCol[matchedProjectName];

      // 4) 從表頭列下一列開始，逐列讀「版位」名稱 + 該專案欄位的內容文字。
      const blocks = [];
      const warnings = [];
      const skippedRows = [];
      let dataRowCount = 0;

      for (let r = headerRow + 1; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const posName = clean(row[positionCol]);
        if (!posName) continue;
        dataRowCount += 1;

        if (checkboxCol !== undefined) {
          const checkboxValue = row[checkboxCol];
          const isExplicitFalse = checkboxValue === false || this.norm(checkboxValue) === this.norm('false') || clean(checkboxValue) === 'FALSE';
          if (isExplicitFalse) {
            skippedRows.push({ row: r + 1, reason: `${posName}：${matchedProjectName} 勾選欄是 FALSE，略過` });
            continue;
          }
        }

        const contentText = clean(row[contentCol]);
        if (!contentText) {
          skippedRows.push({ row: r + 1, reason: `${posName}：${matchedProjectName} 欄位沒有文案內容，略過` });
          continue;
        }

        // 解析多行文字：「LOGO：xxx」「主標題：xxx」「副標題：xxx」（冒號可全形或半形）。
        // LOGO 這一行是素材說明文字（要用哪個LOGO），會存進 record['LOGO']，
        // 實際套用哪個LOGO檔案由 applyRecordToTemplate 依內容判斷（見該函式的 LOGO 套用區塊）。
        const fields = { 主標: '', 副標: '', LOGO: '' };
        contentText.split(/\r?\n/).forEach((line) => {
          const m = line.match(/^\s*(LOGO|主標題|主標|副標題|副標)\s*[:：]\s*(.*)$/);
          if (!m) return;
          const label = m[1];
          const value = m[2].trim();
          if (label === '主標題' || label === '主標') fields['主標'] = value;
          else if (label === '副標題' || label === '副標') fields['副標'] = value;
          else if (label === 'LOGO') fields['LOGO'] = value;
        });

        if (!fields['主標'] && !fields['副標'] && !fields['LOGO']) {
          skippedRows.push({ row: r + 1, reason: `${posName}：${matchedProjectName} 欄位讀不到「主標題／副標題／LOGO」格式的文字，略過` });
          continue;
        }

        blocks.push({
          name: posName,
          headerRow,
          startRow: r,
          quantity: 1,
          records: [{ ...fields, __sourceRow: r + 1 }],
          colMap: {},
          templateType: 'matrix',
        });
      }

      if (!dataRowCount) return null;

      return { blocks, warnings, anchorCount: projectNames.length, skippedRows };
    },

    parseRows(rows) {
      const sheetParsers = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getSheetParsers?.() || [];
      for (const parser of sheetParsers) {
        try {
          const parsed = parser.parse({
            rows,
            helpers: {
              norm: this.norm.bind(this),
              normalizeRecordText: this.normalizeRecordText.bind(this),
              // （鏡面）這一格的值是否來自垂直合併儲存格往下填（true 代表這是延伸列，不是新的一筆）。
              isMergedFill: (rowIndex, columnIndex) => rows?.__mergedFills?.has(`${rowIndex}:${columnIndex}`) === true,
            },
          });
          if (parsed?.blocks?.length) return parsed;
        } catch (error) {
          console.warn('[Batch] sheet parser failed:', parser.family, error);
        }
      }

      const matrixResult = this.parseMatrixSheet(rows);
      if (matrixResult) return matrixResult;

      const blocks = [];
      const warnings = [];
      const skippedRows = [];
      let anchorCount = 0;

      const clean = (value) => String(value ?? '').trim();
      const isAnchor = (cell) => {
        const normalized = this.norm(cell);
        return normalized === this.norm('製作內容')
          || normalized.startsWith(this.norm('製作內容'))
          || normalized === this.norm('版位');
      };
      const hasText = (value) => clean(value) !== '';
      const toNumber = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const m = clean(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : 0;
      };
      const rowHasAnchor = (row) => (row || []).some(isAnchor);
      const rowIsMostlyEmpty = (row) => !(row || []).some((cell) => hasText(cell));

      // 依照這份 Excel 的欄位命名做精準對應：
      // 「主標」必須以主標開頭，避免把「主題日/活動」誤抓成主標。
      // 「副標」優先支援 USP/副標、副標；警語/商品圖/CTA 維持容錯。
      const detectColMap = (row) => {
        const colMap = {};
        const setOnce = (field, c) => {
          if (colMap[field] === undefined) colMap[field] = c;
        };
        (row || []).forEach((cell, c) => {
          const raw = clean(cell);
          const normalized = this.norm(raw);
          if (!normalized) return;

          // 明確排除非文案欄位：日期、主題日/頁面、頁面、版配、尺寸等，不參與任何欄位判斷，降低誤抓率。
          const blockedHeaderWords = [
            '日期', '主題日', '主題日頁面', '主題頁面', '頁面', '活動頁', '活動頁面',
            '製作內容', '數量', 'k數', '尺寸', '版配', '規格', '備註', '說明'
          ].map((word) => this.norm(word));
          if (blockedHeaderWords.some((word) => normalized === word || normalized.includes(word))) return;

          // （AMS）batch.extraHeaderAliases＝ams：LINE購物 AMS 工單欄位（檔名／文案／店名／LINE POINTS %／GD摳圖LINK→商品圖1）。
          const amsAliases = flag('batch.extraHeaderAliases', 'none') === 'ams';
          if (amsAliases && (normalized === this.norm('檔名') || normalized === 'filename')) {
            setOnce('檔名', c);
          }
          else if (amsAliases && (normalized === this.norm('文案') || normalized === 'copy')) {
            setOnce('文案', c);
          }
          else if (amsAliases && (normalized === this.norm('店名') || normalized.includes(this.norm('商店名稱')))) {
            setOnce('店名', c);
          }
          else if (amsAliases && (normalized === this.norm('LINE POINTS %') || normalized === this.norm('LINE POINTS%') || normalized.includes(this.norm('LINEPOINTS%')))) {
            setOnce('LINE_POINTS_PERCENT', c);
          }
          else if (amsAliases && (normalized.includes(this.norm('GD摳圖LINK')) || normalized.includes(this.norm('GD摳圖連結')))) {
            setOnce('商品圖1', c);
          }
          // 主標：只接受「主標...」或英文 title，不接受「主題日/活動」。
          else if (normalized.startsWith(this.norm('主標')) || normalized === 'title' || normalized.startsWith('title')) {
            setOnce('主標', c);
          }
          // 副標：接受「副標...」、「USP/副標...」、「USP...」與英文 subtitle。
          else if (normalized.startsWith(this.norm('副標')) || normalized.includes(this.norm('usp副標')) || normalized.startsWith('usp') || normalized === 'subtitle' || normalized.startsWith('subtitle')) {
            setOnce('副標', c);
          }
          else if (normalized.includes(this.norm('警語')) || normalized.includes(this.norm('法務')) || normalized.includes('legal')) {
            setOnce('警語', c);
          }
          else if (normalized === this.norm('商品圖_左') || normalized === this.norm('商品圖左') || normalized === this.norm('左商品圖')) {
            setOnce('商品圖_左', c);
            setOnce('商品圖1', c);
          }
          else if (normalized === this.norm('商品圖_中') || normalized === this.norm('商品圖中') || normalized === this.norm('中商品圖')) {
            setOnce('商品圖_中', c);
          }
          else if (normalized === this.norm('商品圖_右') || normalized === this.norm('商品圖右') || normalized === this.norm('右商品圖')) {
            setOnce('商品圖_右', c);
            setOnce('商品圖2', c);
          }
          else if (normalized.includes(this.norm('商品圖1')) || normalized.includes(this.norm('商品圖一')) || normalized.includes('productimage1')) {
            setOnce('商品圖1', c);
          }
          else if (normalized.includes(this.norm('商品圖2')) || normalized.includes(this.norm('商品圖二')) || normalized.includes('productimage2')) {
            setOnce('商品圖2', c);
          }
          else if (normalized === this.norm('票券') || normalized.includes(this.norm('票券類型')) || normalized.includes(this.norm('票券LOGO'))) {
            setOnce('票券', c);
          }
          else if (normalized.includes(this.norm('票券案型')) || normalized.includes(this.norm('案型'))) {
            setOnce('票券案型', c);
          }
          else if (normalized === this.norm('版位') || normalized.includes(this.norm('版位'))) {
            setOnce('版位', c);
          }
          else if (normalized.includes('cta') || normalized.includes(this.norm('按鈕'))) {
            setOnce('CTA', c);
          }
          else if (normalized === this.norm('文案_左') || normalized === this.norm('文案左')) {
            setOnce('文案_左', c);
          }
          else if (normalized === this.norm('文案_中') || normalized === this.norm('文案中')) {
            setOnce('文案_中', c);
          }
          else if (normalized === this.norm('文案_右') || normalized === this.norm('文案右')) {
            setOnce('文案_右', c);
          }
          else if (normalized === this.norm('價格_左') || normalized === this.norm('價格左')) {
            setOnce('價格_左', c);
          }
          else if (normalized === this.norm('價格_中') || normalized === this.norm('價格中')) {
            setOnce('價格_中', c);
          }
          else if (normalized === this.norm('價格_右') || normalized === this.norm('價格右')) {
            setOnce('價格_右', c);
          }
          else if (normalized.includes(this.norm('價格')) || normalized.includes('price')) {
            setOnce('價格', c);
          }
        });
        return colMap;
      };

      const findHeaderCandidates = () => {
        const candidates = [];
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r] || [];
          const anchorCol = row.findIndex(isAnchor);
          if (anchorCol < 0) continue;
          anchorCount += 1;
          const colMap = detectColMap(row);
          const hasCoreFields = this.fields.some((field) => colMap[field] !== undefined);
          if (hasCoreFields) candidates.push({ headerRow: r, anchorCol, colMap });
          else warnings.push(`第 ${r + 1} 列找到「製作內容」，但同列沒有主標/副標/警語/商品圖/CTA/票券欄位`);
        }
        return candidates;
      };

      const headerCandidates = findHeaderCandidates();
      for (let hIndex = 0; hIndex < headerCandidates.length; hIndex++) {
        const header = headerCandidates[hIndex];
        const nextHeaderRow = hIndex + 1 < headerCandidates.length ? headerCandidates[hIndex + 1].headerRow : rows.length;
        const qtyCol = (rows[header.headerRow] || []).findIndex((cell) => this.norm(cell) === this.norm('數量'));
        const firstFieldCol = Math.min(...Object.values(header.colMap));

        for (let r = header.headerRow + 1; r < nextHeaderRow; r++) {
          const row = rows[r] || [];
          if (rowHasAnchor(row)) break;
          if (rowIsMostlyEmpty(row)) continue;

          const productName = clean(row[header.anchorCol]);
          if (!productName) {
            const maybeRecord = this.readRecordFromRow(row, header.colMap);
            const hasMaybeContent = this.fields.some((field) => hasText(maybeRecord[field]));
            if (hasMaybeContent) skippedRows.push({ row: r + 1, reason: '製作內容欄空白，但同列有主標/副標/素材資料，無法判斷要套哪個公版' });
            continue;
          }

          // V3.7 Parser 重構：所有公版名稱（HBN / HAN / DD Card / DDC ...）都共用同一套起點判斷。
          // 遇到公版名稱時，不再從公版名稱所在列開始讀；會先往上回溯最近的「主標」列，
          // 再由主標列往下建立該筆製作物，避免 DD Card / HBN 的主標被跳過。
          const quantity = qtyCol >= 0 ? Math.max(0, Math.floor(toNumber(row[qtyCol]))) : 0;
          const currentRecord = this.readRecordFromRow(row, header.colMap);
          const hasCurrentContent = this.fields.some((field) => hasText(currentRecord[field]));
          const isKnownTemplateName = !!this.findTemplateRuleForName(productName);
          // 擴充點：若某公版需要「一個製作物名稱底下有多筆記錄」的特殊解析模式
          // （例如舊版頭巾票券分流），可在該公版的 rules/*.rules.js 內註冊：
          //   window.TemplateRuleRegistry.register(family, {
          //     blockParser: ({ rows, header, rowIndex, nextHeaderRow, productName, quantity }) => {
          //       return { records: [...], templateType: 'custom' } 或 null（不處理則回傳null，繼續走一般解析）
          //     }
          //   });
          // 目前沒有任何公版註冊 blockParser，此為保留擴充點，不影響一般解析流程。
          const blockParserFamily = this.findTemplateRuleForName(productName)?.family;
          const registeredBlockParser = blockParserFamily
            ? (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(blockParserFamily)?.blockParser
            : null;
          if (typeof registeredBlockParser === 'function') {
            const blockResult = registeredBlockParser({ rows, header, rowIndex: r, nextHeaderRow, productName, quantity });
            if (blockResult?.records?.length) {
              blocks.push({
                name: productName,
                headerRow: header.headerRow,
                startRow: r,
                quantity: Number(blockResult.quantity ?? blockResult.records.length),
                records: blockResult.records,
                colMap: header.colMap,
                templateType: blockResult.templateType || 'custom',
              });
              // （AMS 起）自訂區塊解析器可回報已消耗到哪一列，避免延伸資料列再次被解析成獨立預覽。
              if (Number.isInteger(blockResult.consumedUntilRow) && blockResult.consumedUntilRow > r) {
                r = Math.min(blockResult.consumedUntilRow, nextHeaderRow - 1);
              }
              continue;
            }
          }

          // （AMS）batch.extraHeaderAliases＝ams 時啟用 LINE購物 逐列模式：一列＝一個版位＝一筆製作物。
          const isLineShoppingRowMode = flag('batch.extraHeaderAliases', 'none') === 'ams'
            && header.colMap['版位'] !== undefined
            && header.colMap['檔名'] !== undefined
            && header.colMap['商品圖1'] !== undefined
            && header.colMap['店名'] !== undefined
            && header.colMap['LINE_POINTS_PERCENT'] !== undefined;

          if (isLineShoppingRowMode) {
            const rowRecord = this.readRecordFromRow(row, header.colMap);
            rowRecord['版位'] = clean(rowRecord['版位'] || productName);
            rowRecord.__sourceRow = r + 1;

            if (!this.fields.some((field) => hasText(rowRecord[field]))) {
              skippedRows.push({ row: r + 1, name: productName, reason: '逐列工單中沒有可套用資料，已略過' });
              continue;
            }

            blocks.push({
              name: productName,
              headerRow: header.headerRow,
              startRow: r,
              quantity: 1,
              records: [rowRecord],
              colMap: header.colMap,
              templateType: 'row',
            });
            continue;
          }

          const findNearestMainTitleRow = () => {
            for (let up = r; up > header.headerRow; up--) {
              const upRow = rows[up] || [];
              if (rowHasAnchor(upRow)) break;
              const upProductName = clean(upRow[header.anchorCol]);
              const upQty = qtyCol >= 0 ? toNumber(upRow[qtyCol]) : 0;

              // 如果往上遇到另一個有數量的製作物，就停止，避免跨到上一筆。
              if (up !== r && upProductName && upQty) break;

              const upRecord = this.readRecordFromRow(upRow, header.colMap);
              if (hasText(upRecord['主標'])) return up;
            }
            return r;
          };
          const recordStartRow = findNearestMainTitleRow();
          const hasBacktrackedMainTitle = recordStartRow !== r;

          // 避免把說明列或補充列誤當製作物：
          // 一般列需要有數量或同列內容；但已知公版名稱可接受「同列無內容」，只要上方可回溯到主標。
          if (!quantity && !hasCurrentContent && !(isKnownTemplateName && hasBacktrackedMainTitle)) {
            skippedRows.push({ row: r + 1, name: productName, reason: '沒有數量，也沒有主標/副標/警語/商品圖/CTA，且無法回溯到主標' });
            warnings.push(`第 ${r + 1} 列「${productName}」沒有數量，也沒有可套用欄位，已略過`);
            continue;
          }

          const takeCount = quantity || 9999;
          const records = [];
          let scannedRows = 0;

          for (let dr = recordStartRow; dr < nextHeaderRow && records.length < takeCount; dr++) {
            const dataRow = rows[dr] || [];
            if (rowHasAnchor(dataRow)) break;

            // 同一欄位區塊可能會連續列出多個製作物，並共用後續文案列。
            // 例如：第 89 列 HBN-C2C (DD card)、第 90 列 HBN-Mall，後面 91~110 是共用文案。
            // 讀 HBN-C2C 時不可把 HBN-Mall 那列也算進去；讀 HBN-Mall 時則保留自己的第一列。
            const rowProductName = clean(dataRow[header.anchorCol]);
            const rowQty = qtyCol >= 0 ? toNumber(dataRow[qtyCol]) : 0;
            const isOtherProductStart = dr !== r && rowProductName && rowQty;
            if (isOtherProductStart) {
              if (quantity) continue;
              break;
            }

            if (rowIsMostlyEmpty(dataRow)) {
              // 已開始讀取後遇到連續空白，就結束此製作物區塊，避免掃到下一個區塊的說明文字。
              if (records.length) break;
              continue;
            }

            const record = this.readRecordFromRow(dataRow, header.colMap);
            const hasAny = this.fields.some((field) => hasText(record[field]));
            if (hasAny) records.push(record);
            scannedRows += 1;

            // 沒有明確數量時，遇到下一個有名稱+數量的製作物就停止。
            if (!quantity && dr > r) {
              const nextName = clean(dataRow[header.anchorCol]);
              const nextQty = qtyCol >= 0 ? toNumber(dataRow[qtyCol]) : 0;
              if (nextName && nextQty) break;
            }

            // 保護：無數量時最多掃 80 列。
            if (!quantity && scannedRows >= 80) break;
          }

          if (records.length && quantity && records.length < quantity) {
            warnings.push(`第 ${r + 1} 列製作物「${productName}」數量為 ${quantity}，但只讀到 ${records.length} 筆有效資料`);
          }

          if (records.length) {
            blocks.push({
              name: productName,
              headerRow: header.headerRow,
              startRow: r,
              quantity,
              records,
              colMap: header.colMap,
            });
          } else {
            warnings.push(`第 ${r + 1} 列製作物「${productName}」沒有讀到主標/副標/警語/商品圖/CTA 資料`);
          }
        }
      }

      if (!headerCandidates.length && anchorCount) warnings.push('有找到「製作內容」，但沒有任何同列欄位可解析。');
      return { blocks, anchorCount, warnings, skippedRows };
    },


    // V1.0 開源版：頭巾票券專屬解析已移除。
    // 若未來某公版需要類似「工單固定欄位分流」的解析模式，
    // 請透過 window.TemplateRuleRegistry.register(family, { resolveRecordTemplateRoute: fn }) 由該公版的 rules/*.rules.js 自行註冊。
    resolveRecordTemplateRoute(block = {}, record = {}) {
      const templateRule = this.findTemplateRuleForName(block.name);
      const registeredRules = templateRule?.family
        ? window.TemplateRuleRegistry?.getRules?.(templateRule.family)
        : null;
      if (typeof registeredRules?.resolveRecordTemplateRoute === 'function') {
        const route = registeredRules.resolveRecordTemplateRoute({
          block,
          record,
          helpers: {
            normalizeRouteValue: this.normalizeRouteValue.bind(this),
            norm: this.norm.bind(this),
          },
        });
        if (route) return route;
      }

      // 有明確 templateId、但找不到專屬規則時，才沿用 OM Wave 1 的相容路由。
      // 專屬規則必須優先，否則 Appier 等新公版即使已由自己的 sheetParser 解析，
      // 仍會在這裡被誤標為 om_wave1_subtitle，後續 hook 也會套用錯誤家族。
      const explicitTemplateId = String(record?.__templateId || '').trim();
      // 整合版：batch.explicitTemplateIdRoute＝generic（network/AMS/跨夜）時回不帶 family 的通用路由；none 不路由。
      const explicitRouteMode = flag('batch.explicitTemplateIdRoute', 'omWave1');
      if (explicitTemplateId && explicitRouteMode !== 'none') {
        // blockFamily（鏡面）：family 取區塊 templateType／規則 family，key 沒有 family 時用 templateId，outputPrefix 固定 templateId。
        if (explicitRouteMode === 'blockFamily') {
          const family = String(block.templateType || templateRule?.family || '').trim();
          return {
            key: family || explicitTemplateId,
            family,
            label: explicitTemplateId,
            templateId: explicitTemplateId,
            templateFile: `${explicitTemplateId}.json`,
            outputName: String(record.__outputName || '').trim(),
            outputPrefix: explicitTemplateId,
          };
        }
        return {
          key: explicitRouteMode === 'generic' ? explicitTemplateId : 'om_wave1_subtitle',
          family: explicitRouteMode === 'generic' ? '' : 'om_wave1_subtitle',
          label: explicitTemplateId,
          templateId: explicitTemplateId,
          templateFile: `${explicitTemplateId}.json`,
          outputName: String(record.__outputName || '').trim(),
          outputPrefix: String(record.__media || explicitTemplateId).trim(),
        };
      }

      return null;
    },

    readRecordFromRow(row, colMap) {
      const record = {};
      for (const field of this.fields) {
        const c = colMap[field];
        record[field] = c === undefined ? '' : String(row?.[c] ?? '').trim();
      }

      // V3.6.5：支援 Excel 單格寫法，例如「主標：4/18 領早鳥$40」或「主標: 4/18 刷卡享88折」。
      // 舊版只吃「欄位標題在表頭、內容在同欄下一列」的結構；若 Excel 把欄名與內容放在同一格，
      // 就會造成 DDC/HBN 的主標沒有被套入。這裡會掃描整列並把冒號後的文字抽出來。
      const inlineAliasMap = [
        { field: '主標', aliases: ['主標', '主標題', 'title'] },
        { field: '副標', aliases: ['副標', '副標題', 'usp/副標', 'usp副標', 'usp', 'subtitle'] },
        { field: '警語', aliases: ['警語', '法務', '法務小字', 'legal'] },
        { field: '商品圖1', aliases: ['商品圖1', '商品圖一', 'productimage1'] },
        { field: '商品圖2', aliases: ['商品圖2', '商品圖二', 'productimage2'] },
        { field: '商品圖_左', aliases: ['商品圖_左', '商品圖左', '左商品圖'] },
        { field: '商品圖_中', aliases: ['商品圖_中', '商品圖中', '中商品圖'] },
        { field: '商品圖_右', aliases: ['商品圖_右', '商品圖右', '右商品圖'] },
        { field: 'CTA', aliases: ['cta', '按鈕', 'button'] },
        { field: '價格', aliases: ['價格', 'price'] },
        { field: '價格_左', aliases: ['價格_左', '價格左', 'leftprice'] },
        { field: '價格_中', aliases: ['價格_中', '價格中', 'middleprice', 'centerprice'] },
        { field: '價格_右', aliases: ['價格_右', '價格右', 'rightprice'] },
        { field: '文案_左', aliases: ['文案_左', '文案左', '左文案'] },
        { field: '文案_中', aliases: ['文案_中', '文案中', '中文案'] },
        { field: '文案_右', aliases: ['文案_右', '文案右', '右文案'] },
        ...(flag('batch.extraHeaderAliases', 'none') === 'ams' ? [
          { field: '文案', aliases: ['文案', 'copy'] },
          { field: '檔名', aliases: ['檔名', 'filename'] },
          { field: '店名', aliases: ['店名', '商店名稱'] },
          { field: 'LINE_POINTS_PERCENT', aliases: ['LINE POINTS %', 'LINE POINTS%', 'linepointspercent'] },
          { field: '商品圖1', aliases: ['GD摳圖LINK', 'GD摳圖連結'] },
        ] : []),
        { field: '版位', aliases: ['版位', 'placement', 'position'] },
      ];
      const cells = Array.isArray(row) ? row : [];
      cells.forEach((cell) => {
        const raw = String(cell ?? '').trim();
        if (!raw) return;
        const match = raw.match(/^([^:：]{1,32})\s*[:：]\s*([\s\S]+)$/);
        if (!match) return;
        const label = this.norm(match[1]);
        const value = String(match[2] || '').trim();
        if (!value) return;
        for (const item of inlineAliasMap) {
          if (item.aliases.some((alias) => label === this.norm(alias))) {
            record[item.field] = value;
            break;
          }
        }
      });

      return record;
    },

    ensureTemplatePool(templates = []) {
      return (templates || []).map((t) => ({ ...t, data: clone(t.data) }));
    },

    normalizeRouteValue(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/logo/gi, 'logo')
        .replace(/[\s\u00a0\u3000\t\r\n_\-()（）\[\]【】.]+/g, '')
        .replace(/[＿－—–]/g, '');
    },

    async fetchRouteTemplate(route) {
      if (!route?.templateFile) return null;
      const urls = [`./templates/${route.templateFile}`, `./${route.templateFile}`];
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) continue;
          const data = await res.json();
          if (flag('templates.textBaselinePrepare', true)) await TextBaselineModel.prepareTemplate(data, { source: 'json' });
          if (flag('templates.layerDefaults', false)) LayerDefaults.apply(data);
          data.ruleFamily = route.family || route.key || data.ruleFamily;
          return { name: data.templateId || route.templateId, file: route.templateFile, visible: true, data };
        } catch (_) {}
      }
      return null;
    },

    async ensureTemplateForRoute(route, templates = []) {
      if (!route || !route.templateId) return null;
      const found = this.findTemplateForRoute(route, templates).template;
      if (found) return found;
      return this.fetchRouteTemplate(route);
    },

    findTemplateForRoute(route, templates = []) {
      if (!route?.templateId) return { template: null, reason: route?.missingReason || '路由缺少 templateId' };

      const normalizeTemplateId = (value) => this.norm(String(value || '')
        .replace(/\.json$/i, '')
        .replace(/^0+\d*[_\-\s]*/, '')
      );

      // 修正：不同變體範本檔案，若 PSD 匯出時內部 templateId 欄位剛好寫成一樣的值，
      // 用 templateId 欄位比對會讓多個檔案「同時命中」，最後變成看範本陣列的
      // 排列順序決定選到哪一個——本機資料夾跟雲端硬碟資料夾的檔案列舉順序不保證一樣。
      // 修法：只要 route 有明確指定 templateFile（實際檔名），一律先用「檔名」做精確比對，
      // 檔名在同一個資料夾裡一定是唯一的，比對結果不會因為陣列順序而改變。
      if (route.templateFile) {
        const wantedFile = this.norm(String(route.templateFile).replace(/\.json$/i, ''));
        const byFilename = (templates || []).find((template) => {
          const fileNorm = this.norm(String(template.file || '').replace(/\.json$/i, ''));
          return fileNorm && fileNorm === wantedFile;
        });
        if (byFilename) return { template: byFilename, reason: '' };
      }

      const routeIds = [route.templateId, route.templateFile]
        .map(normalizeTemplateId)
        .filter(Boolean);
      const routeIdsWithPrefix = [route.templateId, route.templateFile]
        .map((value) => this.norm(String(value || '').replace(/\.json$/i, '')))
        .filter(Boolean);

      const getTemplateIds = (template = {}) => [
        template.name,
        template.data?.templateId,
        template.data?.canvas?.templateId,
        template.data?.source?.psdName,
        template.file,
      ].flatMap((value) => [normalizeTemplateId(value), this.norm(String(value || '').replace(/\.json$/i, ''))]).filter(Boolean);

      // 先做精準命中，避免 06_SKBN_PC 誤命中 06_SKBN_PC_VIP。
      const exact = (templates || []).find((template) => {
        const ids = getTemplateIds(template);
        return ids.some((id) => routeIds.includes(id) || routeIdsWithPrefix.includes(id));
      });
      if (exact) return { template: exact, reason: '' };

      const wanted = routeIdsWithPrefix[0] || this.norm(route.templateId);
      const found = (templates || []).find((template) => {
        const label = this.norm(`${template.name || ''} ${template.data?.templateId || ''} ${template.file || ''}`);
        return label.includes(wanted) || wanted.includes(label);
      });
      if (found) return { template: found, reason: '' };
      const loaded = (templates || []).map((t) => t.name || t.data?.templateId || t.file || '未命名公版').join('、') || '無';
      return { template: null, reason: `讀到 ${route.label}，但目前沒有載入 ${route.templateId} 公版。請確認公版資料夾有 ${route.templateFile}。已載入：${loaded}` };
    },

    getTemplateMatchRules() {
      // 完全依賴 rules/*.rules.js 透過 window.TemplateRuleRegistry.register(family, { tokens, targets, label })
      // 註冊進來的關鍵字規則；沒有任何公版註冊時，這裡會是空陣列，代表目前無法從Excel製作物名稱比對到任何公版。
      return (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getMatchRules?.() || [];
    },

    findTemplateRuleForName(name) {
      const n = this.norm(name);
      if (!n) return null;
      return this.getTemplateMatchRules().find((item) => item.tokens.some((token) => n.includes(this.norm(token)))) || null;
    },

    findTemplateForName(name, templates) {
      // 1) 先看有沒有已載入公版的名稱/templateId跟這個名稱直接對得上（去空白、大小寫、全半形符號後比對）。
      //    這樣即使還沒寫 rules.js 註冊關鍵字，只要Excel裡的名稱跟公版檔名夠接近，也能自動比對到。
      const directMatch = this.findTemplateByDirectName(name, templates);
      if (directMatch) return { template: directMatch, reason: '' };

      // 2) 再看有沒有已註冊的公版關鍵字規則（tokens/targets）比對得到。
      const rule = this.findTemplateRuleForName(name);
      if (!rule) {
        const labels = this.getTemplateMatchRules().map((item) => item.label).filter(Boolean).join(' / ');
        const loaded = (templates || []).map((t) => t.name || t.data?.templateId || t.file || '未命名公版').join('、') || '無';
        return { template: null, reason: `製作物名稱「${name}」對不到任何已載入的公版（已載入：${loaded}）${labels ? `，也沒有讀到已設定的公版關鍵字（${labels}）` : ''}` };
      }

      const found = (templates || []).find((template) => {
        const label = this.norm(`${template.name || ''} ${template.data?.templateId || ''} ${template.file || ''}`);
        return rule.targets.some((target) => label.includes(this.norm(target)));
      });
      if (!found) {
        const loaded = (templates || []).map((t) => t.name || t.data?.templateId || t.file || '未命名公版').join('、') || '無';
        return { template: null, reason: `讀到 ${rule.label} 關鍵字，但目前沒有載入 ${rule.label} 公版。已載入：${loaded}` };
      }
      return { template: found, reason: '' };
    },

    // 把名稱正規化到「只留文字與數字」的程度，比 this.norm 更寬鬆一點：
    // 去除全形/半形括號、空白、底線、連字號，這樣「Skinny_PC (左右)」跟「Skinny_PC(左右)」才會被視為同一個。
    normalizeTemplateIdentity(value) {
      return this.norm(value).replace(/[()（）\[\]【】\s_\-]+/g, '');
    },
    // （LineOA／鏡面）公版身分別名群組（rules 宣告 window.TemplateIdentityAliases，例 POPUP ↔ POPUP_Template）。
    getIdentityAliasGroups() {
      const raw = window.TemplateIdentityAliases || {};
      return Object.entries(raw).map(([canonical, aliases]) =>
        [canonical, ...(Array.isArray(aliases) ? aliases : [aliases])]
          .map((value) => this.normalizeTemplateIdentity(value))
          .filter(Boolean));
    },
    findTemplateByDirectName(name, templates) {
      const target = this.normalizeTemplateIdentity(name);
      if (!target) return null;
      // 去掉Excel常見的編號前綴（例如「01_」「02_」）再比一次，避免「01_Skinny_PC (左右)」比不到「Skinny_PC(左右)」。
      const targetWithoutSeq = target.replace(/^\d+_?/, '');
      const acceptable = new Set([target, targetWithoutSeq]);
      this.getIdentityAliasGroups().forEach((group) => {
        if (group.includes(target) || group.includes(targetWithoutSeq)) group.forEach((identity) => acceptable.add(identity));
      });
      return (templates || []).find((template) => {
        const candidates = [template.name, template.data?.templateId, template.file]
          .filter(Boolean)
          .map((value) => this.normalizeTemplateIdentity(value));
        return candidates.some((candidate) => acceptable.has(candidate));
      }) || null;
    },

    makeOutputPrefix(blockName, templateName) {
      // V1.0 開源版：輸出檔名前綴不再硬編碼任何舊公版名稱判斷，
      // 直接取公版名稱（或找不到公版名稱時取Excel製作物名稱）清理成安全檔名字元。
      return String(templateName || blockName || 'IMG').replace(/\.template\.json$/i, '').replace(/[^a-z0-9一-龥]+/ig, '_').replace(/^_+|_+$/g, '') || 'IMG';
    },

    resolveTemplateProductImageRule(template) {
      const rules = window.PriceRuleEngine?.getRules?.(template);
      const layouts = rules?.templateLayouts || {};
      const templateIds = [
        template?.templateId,
        template?.batchSourceName,
        template?.source?.psdName,
        AppState.templates?.[AppState.activeIndex]?.name,
        AppState.templates?.[AppState.activeIndex]?.file,
      ].filter(Boolean);

      for (const id of templateIds) {
        const direct = layouts[id];
        if (direct?.productImageBox) return direct;

        const normalized = window.PriceRuleEngine?.norm
          ? window.PriceRuleEngine.norm(id)
          : this.norm(id);
        const key = Object.keys(layouts).find((candidate) => {
          const candidateKey = window.PriceRuleEngine?.norm
            ? window.PriceRuleEngine.norm(candidate)
            : this.norm(candidate);
          return candidateKey === normalized;
        });
        if (key && layouts[key]?.productImageBox) return layouts[key];
      }

      return null;
    },

    isProductPlacementGuide(key, layer) {
      const name = String(layer?.psdName || layer?.name || key || '').trim();
      return name === 'P_範圍' || name === '_P_範圍';
    },

    getProductPlacementGuideBox(template) {
      const entry = Object.entries(template?.layers || {}).find(([key, layer]) => this.isProductPlacementGuide(key, layer));
      if (!entry) return null;
      const [key, layer] = entry;
      const box = window.Geometry?.getLayerBox?.(key, layer) || this.getProductImageBoxFromLayer(layer);
      if (!box) return null;
      return {
        ...box,
        targetWidth: Number(box.width || 0),
        targetHeight: Number(box.height || 0),
        maxTargetHeight: Number(box.height || 0),
        source: 'template-p-range',
      };
    },

    getProductImageBoxFromLayer(layer) {
      if (!layer) return null;
      const width = Number(layer.targetWidth || layer.width || 0);
      const height = Number(layer.maxTargetHeight || layer.targetHeight || layer.height || 0);
      if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return null;

      const x = Number.isFinite(Number(layer.x)) ? Number(layer.x) : Number(layer.centerX || 0) - width / 2;
      const y = Number.isFinite(Number(layer.y)) ? Number(layer.y) : Number(layer.centerY || 0) - height / 2;

      return {
        x,
        y,
        width,
        height,
        centerX: Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : x + width / 2,
        centerY: Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) : y + height / 2,
        targetWidth: width,
        targetHeight: height,
        maxTargetHeight: height,
      };
    },

    applyProductImageBox(layer, box, options = {}) {
      if (!layer || !box) return;
      const width = Number(box.targetWidth ?? box.width);
      const heightLimit = Number(box.maxTargetHeight ?? box.targetHeight ?? box.height);
      const x = Number.isFinite(Number(box.x)) ? Number(box.x) : Number(box.centerX || 0) - width / 2;
      const y = Number.isFinite(Number(box.y)) ? Number(box.y) : Number(box.centerY || 0) - heightLimit / 2;
      const centerX = Number.isFinite(Number(box.centerX)) ? Number(box.centerX) : x + width / 2;
      const centerY = Number.isFinite(Number(box.centerY)) ? Number(box.centerY) : y + heightLimit / 2;
      // 商品圖的縮放模式（是否「高度優先、不限寬」）現在直接讀取
      // rules/*.rules.js 的 productImageBox.sizingMode / widthLimitPolicy，
      // 不再用寫死的商品檔名清單判斷——rules 檔案才是唯一真相來源。
      const heightPriorityNoWidthLimit = options.heightPriorityNoWidthLimit !== undefined
        ? Boolean(options.heightPriorityNoWidthLimit)
        : (box.sizingMode === 'heightBased' || box.widthLimitPolicy === 'none');

      layer.x = x;
      layer.y = y;
      layer.width = width;
      layer.height = heightLimit;
      layer.centerX = centerX;
      layer.centerY = centerY;
      layer.keepAspectRatio = true;
      layer.sizingMode = heightPriorityNoWidthLimit ? 'heightBased' : 'containByPBox';
      layer.targetWidth = width;
      layer.targetHeight = heightLimit;
      layer.maxTargetHeight = heightLimit;

      if (heightPriorityNoWidthLimit) {
        delete layer.maxTargetWidth;
        layer.widthLimitPolicy = 'none';
        layer.productImageSizingRule = box.productImageSizingRule || 'heightPriorityNoWidthLimit';
      }
    },

    getTemplateRuleFamily(template) {
      return CapsuleRuleEngine.getTemplateFamily(template);
    },

    getTemplateRules(template) {
      const family = this.getTemplateRuleFamily(template);
      return (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(family) || {};
    },

    applyTemplateRuleHook(hookName, template, record, diagnostics = [], context = {}) {
      const rules = this.getTemplateRules(template);
      const hook = rules?.[hookName];
      if (typeof hook !== 'function') return null;

      // 批次 / All 模式下，每張圖都有自己的 project。
      // 舊版 rules/shared/template-rule-utils.js 可能仍讀 AppState.currentProject 判斷主副標顏色，
      // 因此呼叫任何公版 hook 時，暫時把 currentProject 切到該張圖所屬 project；
      // hook 完成後再還原，避免 4.18 暖身 / 4.18 正式 被目前 UI 選到的 4.17 直播日覆蓋顏色。
      const projectForTemplate = String(template?.batchProject || record?.__project || template?.batchRecord?.__project || '').trim();
      const shouldUseTemplateProject = projectForTemplate && projectForTemplate !== ALL_PROJECTS_VALUE;
      const previousProject = AppState.currentProject;
      if (shouldUseTemplateProject) AppState.currentProject = projectForTemplate;

      try {
        const result = hook({
          template,
          record,
          diagnostics,
          ...context,
          helpers: {
            round,
            findLayer: this.findLayer.bind(this),
            normalizeRecordText: this.normalizeRecordText.bind(this),
            norm: this.norm.bind(this),
            measureTextWidth: (layer) => CapsuleRuleEngine.measureTextWidth(layer, ctx),
            // （AMS 起）把引擎的素材查找能力交給規則檔（例如 OAPush 六宮格自行套商品圖）。
            findAssetFilename: (name, options = {}) => {
              const scope = options.template || template;
              return this.findAssetFilename(name, {
                prefix: this.getTemplateAssetPrefix(scope),
                project: scope?.batchProject
                  || scope?.batchRecord?.__project
                  || (AppState.currentProject && AppState.currentProject !== ALL_PROJECTS_VALUE ? AppState.currentProject : ''),
                ...options,
              });
            },
          },
        });
        // （回饋：文字保留）afterApplyRecordToTemplate 在套版之外也會被單獨呼叫（切換縮圖、預覽刷新、縮圖 clone），
        // 規則可能重新把工單文字寫回圖層，所以手動文字覆寫要在這裡（hook 之後）再套一次。
        if (hookName === 'afterApplyRecordToTemplate') ManualTextOverrides.applyAll(template);
        return result;
      } finally {
        if (shouldUseTemplateProject) AppState.currentProject = previousProject;
      }
    },

    normalizeRecordText(value) {
      return String(value ?? '')
        .replace(/_x000d_/gi, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/[\r\u0003\u2028\u2029]/g, '\n')
        .trim();
    },


    prepareDynamicProductLayers(template, record, diagnostics = []) {
      const folder = String(record?.__productFolder || '').trim();
      if (!folder) return [];

      const bucket = AssetStore.getBucket(folder);
      const imageNames = [...bucket.keys()]
        .filter((name) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name))
        .filter((name) => !/_KV_BG\./i.test(name))
        .sort((a, b) => a.localeCompare(b, 'zh-Hant', { numeric: true, sensitivity: 'base' }));

      const baseEntry = Object.entries(template?.layers || {}).find(([key, layer]) => {
        if (layer?.type !== 'image' || layer?.locked) return false;
        const label = this.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
        return label === 'p' || label.includes(this.norm('商品圖1')) || label.includes(this.norm('曝品')) || label.includes('product');
      });
      if (!baseEntry) {
        diagnostics.push({ field: '商品圖1', status: 'missing-layer', value: folder, target: '找不到 P 圖層' });
        return [];
      }

      const [baseKey, baseLayer] = baseEntry;
      const keepKeys = new Set([baseKey]);
      const layers = [baseLayer];
      let needsProductGridLayout = false;
      let assetSetChanged = false;

      const clearExactPlacementState = (layer) => {
        if (!layer) return;
        [
          'preserveExactSize', 'skipAutoScale', 'lockToEditedJson', 'positioningMode',
          'followProduct', 'disableAnchorSync', '_anchorDirty',
        ].forEach((field) => delete layer[field]);
      };

      imageNames.forEach((filename, index) => {
        let key = baseKey;
        let layer = baseLayer;
        let layerAssetChanged = false;
        if (index > 0) {
          const suffix = String(index + 1).padStart(2, '0');
          key = `P_${suffix}`;
          const existingLayer = template.layers?.[key];
          const sameExistingAsset = existingLayer
            && this.norm(existingLayer.assetFilename) === this.norm(filename);

          // 預覽刷新時沿用已存在的動態圖層，不能每次從 product 重 clone，否則 P_02/P_03
          // 的公版 preset 或使用者手動位置都會被洗掉。只有素材真的換了才建立新圖層。
          if (sameExistingAsset) {
            layer = existingLayer;
          } else {
            layer = clone(baseLayer);
            clearExactPlacementState(layer);
            layer.psdName = key;
            layer.name = key;
            template.layers[key] = layer;
            needsProductGridLayout = true;
            assetSetChanged = true;
            layerAssetChanged = true;
          }
          layers.push(layer);
        } else if (this.norm(layer.assetFilename) !== this.norm(filename)) {
          clearExactPlacementState(layer);
          assetSetChanged = true;
          layerAssetChanged = true;
        }
        keepKeys.add(key);
        layer.assetFilename = filename;
        layer.assetProject = folder;
        layer.hidden = false;
        // P_02/P_03... 是從 baseLayer clone 出來的，會連 smartAssetId 一起複製過去——但那是
        // baseLayer（另一張圖）的身分，不是這張圖自己的。素材檔名換了，身分就必須跟著重算，
        // 不然智慧素材同步會拿錯 key，變成這張圖的調整存到/讀到別張圖的設定裡。
        if (layerAssetChanged) delete layer.smartAssetId;
        diagnostics.push({ field: `商品圖${index + 1}`, status: 'ok', value: folder, filename, target: key });
      });

      // 動態建立圖層後必須同步 renderOrder；只寫入 template.layers 會造成
      // P_02 存在於 JSON，但 Renderer 與圖層清單完全看不到它。
      if (Array.isArray(template.renderOrder)) {
        template.renderOrder = template.renderOrder.filter((key) => !/^P_\d{2}$/.test(key));
        const baseIndex = template.renderOrder.indexOf(baseKey);
        const insertAt = baseIndex >= 0 ? baseIndex + 1 : template.renderOrder.length;
        const dynamicKeys = imageNames.slice(1).map((_, index) => `P_${String(index + 2).padStart(2, '0')}`);
        template.renderOrder.splice(insertAt, 0, ...dynamicKeys);
      }

      Object.keys(template.layers || {}).forEach((key) => {
        if (/^P_\d{2}$/.test(key) && !keepKeys.has(key)) {
          delete template.layers[key];
          assetSetChanged = true;
        }
      });

      if (!imageNames.length) {
        if (String(baseLayer.assetFilename || '').trim()) assetSetChanged = true;
        baseLayer.assetFilename = '';
        diagnostics.push({ field: '商品圖1', status: 'missing', value: folder, attempts: [`assets/${folder}/`] });
      }
      // 只有「新建立」的第二張以上商品圖才需要跑一次網格；既有 P_02/P_03 在預覽刷新時直接沿用。
      // 若公版 preset 已為該圖層提供精確座標，SmartAssetManager 會保留鎖定圖層、不讓網格覆寫。
      if (imageNames.length > 1 && needsProductGridLayout) template.__needsProductGridLayout = true;
      else delete template.__needsProductGridLayout;

      // 資料夾素材集合真的改變時，允許 after hook 依新的素材組合重新比對一次公版 preset。
      if (assetSetChanged) delete template.__appliedPlacementPresetKey;
      return layers;
    },


    applyRecordToTemplate(template, record, options = {}) {
      const diagnostics = [];
      // 沒有 skipExactLayout 代表新的工單首次套版；清除上一筆執行期標記，讓新資料重新比對 preset。
      // 預覽刷新會帶 skipExactLayout=true，保留此標記與使用者後續手動調整。
      if (!options.skipExactLayout) delete template.__appliedPlacementPresetKey;
      // （跨夜）新工單首次套版 → 版型整個重算，跨版位同步的「初始狀態基準」跟著重建；預覽刷新保留。
      if (!options.skipExactLayout) delete template.__renderModel;
      const normalizedRecord = { ...(record || {}) };
      const projectForTemplate = String(template?.batchProject || normalizedRecord.__project || '').trim();
      if (projectForTemplate && !normalizedRecord.__project) normalizedRecord.__project = projectForTemplate;
      template.batchRecord = normalizedRecord;
      record = normalizedRecord;
      const templatePrefix = this.getTemplateAssetPrefix(template);
      const lookupProject = template?.batchProject || template?.batchRecord?.__project || (AppState.currentProject && AppState.currentProject !== ALL_PROJECTS_VALUE ? AppState.currentProject : '');
      this.applyTemplateRuleHook('beforeApplyRecordToTemplate', template, record, diagnostics, options);

      const textMap = [
        { field: '票券案型', words: ['票券_案型', '票券案型', '案型', 'tickettype'] },
        { field: '主標', words: ['主標', '主標題', 'title'] },
        { field: '文案', words: ['文案', 'dpa文案'] },
        { field: '警語', words: ['警語', '法務', '法務小字', 'legal'] },
        // CTA 只有在模板真的有 CTA/按鈕文字圖層時才套用；不可 fallback 到第一個文字圖層，避免蓋掉主標。
        { field: 'CTA', words: ['cta', '按鈕', 'button', '立即領'] },
      ];
      for (const item of textMap) {
        const value = this.normalizeRecordText(record[item.field]);
        if (!value) continue;
        const layer = this.findLayer(template, 'text', item.words, false);
        if (layer) {
          if (item.field === '主標' && /\(\s*logo\s*\)|（\s*logo\s*）/i.test(value)) {
            layer.hidden = true;
            diagnostics.push({ field: item.field, status: 'ok', value, target: `${layer.psdName || ''} 隱藏` });
          } else {
            layer.text = value;
            layer.hidden = false;
            diagnostics.push({ field: item.field, status: 'ok', value, target: layer.psdName || '' });
          }
        }
      }

      // 主標題／副標題的對齊方式（置左/置中/置右）完全由該公版JSON裡每個文字圖層自己的 align 欄位決定，
      // app.core.js 不會針對任何特定公版名稱寫死對齊規則——JSON是主要資料來源，
      // 如果之後要用程式強制覆寫對齊，應該寫在該公版自己的 rules/*.rules.js 裡（例如透過
      // afterApplyRecordToTemplate hook），不要回頭改這個引擎檔案。

      const dynamicProductLayers = this.prepareDynamicProductLayers(template, record, diagnostics);
      const img1 = String(record['商品圖1'] || '').trim();
      const img2 = String(record['商品圖2'] || '').trim();
      const ctaAsset = String(record['CTA'] || '').trim();

      // 圖片欄位採精準圖層匹配：CTA 圖層只吃 CTA 欄位；商品圖不再誤塞到 CTA / 背景圖。
      const ctaLayer = this.findLayer(template, 'image', ['cta', '按鈕', 'button'], false);
      if (ctaLayer) {
        // 若 Excel 沒有 CTA 欄位，仍會嘗試把模板既有 CTA 檔名智慧匹配成實際素材。
        const sourceCtaName = ctaAsset || String(ctaLayer.assetFilename || '').trim();
        if (sourceCtaName) {
          const match = this.findAssetFilename(sourceCtaName, { prefix: templatePrefix, project: lookupProject, layer: ctaLayer, layerKey: 'CTA' });
          if (match.found) {
            ctaLayer.assetFilename = match.filename;
            diagnostics.push({ field: 'CTA', status: 'ok', value: sourceCtaName, filename: match.filename });
          } else {
            ctaLayer.assetFilename = '';
            diagnostics.push({ field: 'CTA', status: 'missing', value: sourceCtaName, attempts: match.attempts });
          }
        }
      } else if (ctaAsset) {
        diagnostics.push({ field: 'CTA', status: 'missing-layer', value: ctaAsset });
      }

      // LOGO 圖層套用：不在引擎裡寫死，改由每個公版自己的 rules/*.rules.js 透過
      // afterApplyRecordToTemplate hook 呼叫 TemplateRuleUtils 裡的共用/自訂函式處理
      // （範例寫法見 rules/shared/template-rule-utils.js 的說明註解）。

      const productLayers = dynamicProductLayers.length
        ? dynamicProductLayers
        : Object.entries(template.layers || {})
          .filter(([key, layer]) => {
            if (layer.type !== 'image' || layer.locked) return false;
            const label = this.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
            const isBackground = label.includes('bg') || label.includes(this.norm('背景')) || label.includes('kvbg');
            const isCta = label.includes('cta') || label.includes(this.norm('按鈕')) || label.includes('button');
            const isLogo = label.includes('logo');
            return !isBackground && !isCta && !isLogo;
          })
          .sort(([keyA, layerA], [keyB, layerB]) => {
            const score = ([key, layer]) => {
              const label = this.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
              if (label.includes('product') || label.includes(this.norm('商品圖1')) || label.includes(this.norm('曝品')) || label === 'p') return 0;
              if (label.includes(this.norm('商品圖2'))) return 1;
              return 2;
            };
            return score([keyA, layerA]) - score([keyB, layerB]);
          })
          .map(([, layer]) => layer);

      const applyImage = (layer, rawValue, field) => {
        if (!layer || !rawValue) return;
        const previousAssetFilename = String(layer.assetFilename || '').trim();
        const match = this.findAssetFilename(rawValue, { prefix: templatePrefix, project: lookupProject, layer, layerKey: field });
        if (match.found) {
          if (previousAssetFilename !== String(match.filename || '').trim()) {
            delete layer.__resolvedAssetFolder;
            delete layer.__resolvedAssetFilename;
            delete layer.__resolvedAssetPath;
            delete layer.smartAssetId;
          }
          layer.assetFilename = match.filename;
          // 全域商品圖邏輯：
          // 1) rules/*.js 有 productImageBox 時，使用該筆規則定義的絕對 P 框
          //    （框的 sizingMode / widthLimitPolicy 也是 rules 檔案裡的資料，
          //    applyProductImageBox 會直接讀取，不再靠寫死的商品檔名清單判斷）。
          // 2) 沒有 productImageBox 時，使用模板原本 P 圖層的 x/y/width/height 作為全域 P 框。
          // 3) 實際渲染時一律先符合 P 寬度；若高度超過 P 高度，改以高度符合，並置中 P 框。
          const placementGuideBox = this.getProductPlacementGuideBox(template);
          const templateRule = this.resolveTemplateProductImageRule(template);
          const box = placementGuideBox || templateRule?.productImageBox || this.getProductImageBoxFromLayer(layer);
          const sameAsset = previousAssetFilename
            && this.norm(previousAssetFilename) === this.norm(match.filename);
          const hasLockedPresetGeometry = layer.lockToEditedJson === true
            || layer.positioningMode === 'absolute-edited-json';
          const preserveCurrentGeometry = options.preserveProductGeometry === true
            && (sameAsset || hasLockedPresetGeometry);
          if (box && !preserveCurrentGeometry) this.applyProductImageBox(layer, box);
          layer.role = 'product';
          layer.smartAssetId = (flag('batch.smartAssetIdMode', 'contextual') === 'plain'
            ? window.SmartAssetManager?.makeAssetId?.(match.filename)
            : window.SmartAssetManager?.makeAssetId?.(match.filename, { layer, template, folder: lookupProject })) || layer.smartAssetId || '';
          diagnostics.push({ field, status: 'ok', value: rawValue, filename: match.filename, sizingRule: box?.source || box?.sizingMode });
        } else {
          layer.assetFilename = '';
          diagnostics.push({ field, status: 'missing', value: rawValue, attempts: match.attempts });
        }
      };
      // 商品圖套用 productImageBox 後，更新所有 price layer 的 anchor.baseBox
      // 確保連動計算以新商品圖位置為基準
      const syncPriceAnchorsToCurrentProduct = () => {
        const anchorKey = window.PriceCouponManager?.findAnchorLayerKey?.(template);
        if (!anchorKey) return;
        const anchorLayer = template.layers?.[anchorKey];
        if (!anchorLayer) return;
        const currentBox = window.Geometry?.getLayerBox?.(anchorKey, anchorLayer);
        if (!currentBox) return;
        Object.values(template.layers || {}).forEach((priceLayer) => {
          if (priceLayer?.source === 'auto_price_v2' && priceLayer.anchor?.layerKey === anchorKey) {
            priceLayer.anchor.baseBox = JSON.parse(JSON.stringify(currentBox));
          }
        });
      };

      // 單商品圖版位時，優先使用「商品圖2」欄位（若有填寫），否則才用「商品圖1」。
      // 若你的公版需要「一律只用商品圖1」這種例外規則，
      // 建議在該公版的 rules/*.rules.js 透過 beforeApplyRecordToTemplate hook 自行覆寫，不需要在 app.core.js 內寫死家族判斷。
      if (dynamicProductLayers.length) {
        // banner 資料夾模式已在 prepareDynamicProductLayers() 完成素材套用。
      } else if (productLayers.length === 1) {
        const asset = img2 || img1;
        if (asset) applyImage(productLayers[0], asset, !img2 ? '商品圖1' : '商品圖2');
        else if (String(productLayers[0].assetFilename || '').trim() === 'P') productLayers[0].assetFilename = '';
      } else {
        applyImage(productLayers[0], img1, '商品圖1');
        applyImage(productLayers[1], img2, '商品圖2');
        productLayers.forEach((layer) => {
          if (String(layer?.assetFilename || '').trim() === 'P') layer.assetFilename = '';
        });
      }

      syncPriceAnchorsToCurrentProduct();
      const priceKeys = PriceCouponManager.apply(template, record);
      // 最終排版資料一律由該公版的 rules/*.rules.js 在 afterApplyRecordToTemplate hook 收尾。
      // 若某公版需要「多欄位商品圖各自對應價格」（例如左/中/右三組），
      // 可在該公版的 priceRules 內自行提供對應的 productLayouts/classifiers，
      // 不需要在 app.core.js 內新增任何公版專屬分支。
      this.applyTemplateRuleHook('afterApplyRecordToTemplate', template, record, diagnostics, options);
      // Smart Object Initial 必須在所有 Rule / programmatic layout 都完成後才建立；
      // 否則後續 LayoutRuleEngine 的合法初始化位移會被誤判成使用者 Transform Delta。
      // 整合版：batch.smartAssetApplyPhase＝beforeLayout（KV 舊行為）時順序相反。
      if (flag('batch.smartAssetApplyPhase', 'afterLayout') === 'beforeLayout') window.SmartAssetManager?.applyTemplate?.(template);
      LayoutRuleEngine.apply(template);
      if (flag('batch.smartAssetApplyPhase', 'afterLayout') !== 'beforeLayout') window.SmartAssetManager?.applyTemplate?.(template);
      {
        const appliedPriceText = String(record['價格'] || record['價格_左'] || '').trim();
        const appliedPriceField = String(record['價格'] || '').trim() ? '價格' : '價格_左';
        if (priceKeys.length) diagnostics.push({ field: appliedPriceField, status: 'ok', value: appliedPriceText, target: priceKeys.join('、') });
        else if (appliedPriceText) diagnostics.push({ field: appliedPriceField, status: 'missing-layer', value: appliedPriceText, target: '找不到商品圖1錨點或價格規則' });
      }

      // （整合版 5.3）使用者手動清除／替換過的圖層，最後套回，蓋過工單與規則重算的結果。沒有手動紀錄時不做事。
      ManualAssetUpload.applyOverrides(template);
      // （整合版 5.4）手動指定／換圖後重判的票券顏色也在最後套回。沒有紀錄時不做事。
      window.CouponControls?.applyOverrides?.(template);
      // （回饋：文字保留）套回使用者的手動文字調整；基線等下一次主畫布重繪、Layout 跑完再記（見 Renderer.render）。
      ManualTextOverrides.applyAll(template);
      ManualTextOverrides.markBaselinePending(template);
      template.batchDiagnostics = diagnostics;
    },

    findLayer(template, type, words, allowFallback = false) {
      const normWords = words.map((word) => this.norm(word));
      const entries = Object.entries(template.layers || {});
      let found = entries.find(([key, layer]) => layer.type === type && normWords.some((word) => this.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`).includes(word)));
      if (found) return found[1];
      if (!allowFallback) return null;
      found = entries.find(([, layer]) => layer.type === type);
      return found ? found[1] : null;
    },

    getTemplateAssetPrefix(template) {
      const label = this.norm(`${template?.canvas?.templateId || ''} ${template?.templateId || ''} ${template?.source?.psdName || ''}`);
      // V1.0 開源版：不再硬編碼任何舊公版前綴。找不到已知前綴時回傳空字串，
      // 由呼叫端 fallback 使用 templateId 本身作為輸出檔名前綴。
      return '';
    },

    normalizeAssetKey(value) {
      return String(value || '')
        .replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[\s\u00a0\u3000\t\r\n]+/g, '')
        .replace(/[\-_()（）\[\]【】.]/g, '');
    },

    findAssetFilename(name, options = {}) {
      const raw = String(name || '').trim();
      const assetPolicy = getAssetPolicy({ layer: options.layer, layerKey: options.layerKey || options.field || '', filename: raw });
      // 批次套版時 AppState.template 還停留在使用者上一次操作的舊內容，呼叫端（rules）需以 options.template 傳入目前 template。
      const lookupScope = getAssetLookupScope(options.template || AppState.template);
      const files = AssetStore.getFlatForLookup(options.project, {
        allowCrossProjectFallback: assetPolicy.allowCrossProjectFallback !== false && !lookupScope.strictScope,
        templateFolder: lookupScope.templateFolder,
        strictScope: lookupScope.strictScope,
      });
      const keys = [...files.keys()];
      const prefix = String(options.prefix || '').trim();
      const basename = (value) => String(value || '').split(/[\\/]/).pop();
      const rawBase = basename(raw);
      const cleanRaw = raw.replace(/[\s\u00a0\u3000\t\r\n]+/g, '');
      const cleanRawBase = rawBase.replace(/[\s\u00a0\u3000\t\r\n]+/g, '');
      const attempts = [];
      if (!raw) return { found: false, filename: '', attempts };

      const push = (value) => {
        const v = String(value || '').trim();
        if (v && !attempts.includes(v)) attempts.push(v);
      };
      const tryExact = (candidate) => {
        push(candidate);
        if (files.has(candidate)) return candidate;
        const lower = candidate.toLowerCase();
        return keys.find((file) => file.toLowerCase() === lower) || '';
      };

      // 1) 原始值完全匹配；若 assetFilename 帶資料夾，也會先用 basename 精準匹配。
      let hit = tryExact(raw);
      if (hit) return { found: true, filename: hit, attempts };
      hit = tryExact(rawBase);
      if (hit) return { found: true, filename: hit, attempts };

      // 蝦皮 VIP 與一般 VIP 是不同素材；不可將「蝦皮VIP_LOGO.svg」模糊匹配成「VIP_LOGO.svg」。
      const shopeeVipKey = this.normalizeAssetKey('蝦皮VIP_LOGO.svg');
      const wantsShopeeVip = this.normalizeAssetKey(raw).includes(shopeeVipKey) || this.normalizeAssetKey(rawBase) === shopeeVipKey;
      if (wantsShopeeVip) {
        hit = keys.find((file) => this.normalizeAssetKey(basename(file)) === shopeeVipKey);
        return hit ? { found: true, filename: hit, attempts } : { found: false, filename: '', attempts };
      }

      // 2) 沒有副檔名時補常見圖片副檔名。
      const rawHasExt = /\.[a-z0-9]+$/i.test(raw);
      const baseNames = [raw, rawBase, cleanRaw, cleanRawBase];
      if (prefix) {
        baseNames.unshift(`${prefix}_${cleanRaw}`, `${prefix}_${raw}`, `${prefix}_${cleanRawBase}`, `${prefix}_${rawBase}`);
      }
      for (const base of [...new Set(baseNames.filter(Boolean))]) {
        if (/\.[a-z0-9]+$/i.test(base)) {
          hit = tryExact(base);
          if (hit) return { found: true, filename: hit, attempts };
        } else {
          for (const ext of this.imageExts) {
            hit = tryExact(`${base}.${ext}`);
            if (hit) return { found: true, filename: hit, attempts };
          }
        }
      }

      // 3) 標準化完全匹配：忽略空白、大小寫、符號與副檔名。
      const wantedKeys = new Set(baseNames.map((v) => this.normalizeAssetKey(v)).filter(Boolean));
      hit = keys.find((file) => wantedKeys.has(this.normalizeAssetKey(file)));
      if (hit) return { found: true, filename: hit, attempts };

      // 4) 模糊包含：例如 Excel「放心買 安心退」可找到「HBN_放心買安心退.png」。
      const rawKey = this.normalizeAssetKey(raw);
      const cleanKey = this.normalizeAssetKey(cleanRaw);
      hit = keys.find((file) => {
        const fileKey = this.normalizeAssetKey(file);
        return (cleanKey && fileKey.includes(cleanKey)) || (rawKey && fileKey.includes(rawKey));
      });
      if (hit) return { found: true, filename: hit, attempts };

      return { found: false, filename: '', attempts };
    },

    resolveAssetFilename(name, options = {}) {
      const match = this.findAssetFilename(name, options);
      return match.found ? match.filename : String(name || '').trim();
    },

    getBatchGroupTitle(item) {
      const raw = String(item?.data?.batchSourceName || item?.batchRecord?.__sourceName || item?.name || '').trim();
      const normalized = raw.replace(/[_\-]+\d+$/i, '').replace(/\s+/g, ' ').trim();
      return normalized || '未分類';
    },

    groupBatchItemsByTemplate(entries = []) {
      const groups = [];
      const map = new Map();
      entries.forEach((entry, fallbackIndex) => {
        const item = entry?.item || entry;
        const index = Number.isInteger(entry?.index) ? entry.index : fallbackIndex;
        const title = this.getBatchGroupTitle(item);
        const key = title.toLowerCase().replace(/[^a-z0-9一-龥]+/ig, '_') || 'group';
        if (!map.has(key)) {
          const group = { key, title, items: [] };
          map.set(key, group);
          groups.push(group);
          if (!AppState.batchGroupsOpen) AppState.batchGroupsOpen = {};
          if (!(key in AppState.batchGroupsOpen)) AppState.batchGroupsOpen[key] = false;
        }
        map.get(key).items.push({ item, index });
      });
      return groups;
    },

    toggleBatchGroup(key) {
      if (!key) return;
      if (!AppState.batchGroupsOpen) AppState.batchGroupsOpen = {};
      AppState.batchGroupsOpen[key] = !AppState.batchGroupsOpen[key];
      this.renderBatchUI();
    },

    renderBatchUI() {
      if (DOM.batchStatus) {
        const ok = AppState.batchItems?.length || 0;
        const fail = AppState.unmatchedBatchItems?.length || 0;
        const diag = AppState.batchDiagnostics;
        DOM.batchStatus.textContent = diag
          ? `已產生 ${ok} 張；未匹配/略過 ${fail} 筆。解析到 ${diag.parsedBlockCount || 0} 個製作物、${diag.recordCount || 0} 筆資料。`
          : `已產生 ${ok} 張；未匹配公版 ${fail} 筆。下載時只會輸出右側批次預覽已勾選縮圖。`;
      }
      if (DOM.batchItemList) {
        const listSource = (AppState.batchItems && AppState.batchItems.length) ? TemplateFilter.getVisibleEntries(AppState.templates) : [];
        const groups = this.groupBatchItemsByTemplate(listSource);
        DOM.batchItemList.innerHTML = groups.map((group) => {
          const isOpen = !!AppState.batchGroupsOpen?.[group.key];
          const selectedCount = group.items.filter(({ item }) => item.visible).length;
          const warningCount = group.items.filter(({ item }) => (item.data?.batchDiagnostics || []).some((d) => String(d.status || '').startsWith('missing'))).length;
          const rows = group.items.map(({ item, index }) => {
            const missing = (item.data?.batchDiagnostics || []).filter((d) => String(d.status || '').startsWith('missing'));
            const ok = (item.data?.batchDiagnostics || []).filter((d) => d.status === 'ok');
            const badge = missing.length ? `⚠ ${missing.map((d) => this.escape(d.field)).join('、')}` : (ok.length ? '✓ 素材已檢查' : '');
            return `
              <label class="batch-item ${index === AppState.activeIndex ? 'active' : ''} ${missing.length ? 'has-warning' : ''}" data-index="${index}">
                <input type="checkbox" ${item.visible ? 'checked' : ''} />
                <span>${this.escape(item.name)}${badge ? `<small>${badge}</small>` : ''}</span>
              </label>
            `;
          }).join('');
          return `
            <div class="batch-group ${isOpen ? 'open' : 'collapsed'}" data-group-key="${this.escape(group.key)}">
              <button type="button" class="batch-group-header" data-group-key="${this.escape(group.key)}" aria-expanded="${isOpen ? 'true' : 'false'}">
                <span class="batch-group-icon">${isOpen ? '⌄' : '⌃'}</span>
                <span class="batch-group-title">${this.escape(group.title)}</span>
                <small>${selectedCount}/${group.items.length} 已選${warningCount ? ` · ${warningCount} 警告` : ''}</small>
              </button>
              <div class="batch-group-body">${isOpen ? rows : ''}</div>
            </div>
          `;
        }).join('');
      }
      if (DOM.unmatchedBox) {
        const unmatched = AppState.unmatchedBatchItems || [];
        const diag = AppState.batchDiagnostics;
        const assetIssues = (AppState.templates || [])
          .map((item) => ({ name: item.name, missing: (item.data?.batchDiagnostics || []).filter((d) => String(d.status || '').startsWith('missing')) }))
          .filter((item) => item.missing.length);
        const assetHtml = assetIssues.length ? `
          <div class="batch-diagnostics">
            <strong>素材檢查</strong>
            ${assetIssues.slice(0, 20).map((item) => `<div>⚠ ${this.escape(item.name)}：${item.missing.map((d) => `${this.escape(d.field)}「${this.escape(d.value || '')}」`).join('、')}</div>`).join('')}
            ${assetIssues.length > 20 ? `<div>另有 ${assetIssues.length - 20} 筆素材警告...</div>` : ''}
          </div>` : '';
        const diagHtml = diag ? `
          <div class="batch-diagnostics">
            <strong>解析診斷</strong>
            <div>分頁：${this.escape(diag.sheetName || '')}</div>
            <div>製作內容標記：${diag.anchorCount || 0} 個</div>
            <div>製作物區塊：${diag.parsedBlockCount || 0} 個</div>
            <div>資料筆數：${diag.recordCount || 0} 筆</div>
            <div>目前載入公版：${this.escape((diag.sourceTemplateNames || []).join('、') || '無')}</div>
            ${(diag.warnings || []).map((msg) => `<div>⚠ ${this.escape(msg)}</div>`).join('')}
          </div>` : '';
        DOM.unmatchedBox.classList.toggle('hidden', !unmatched.length && !diagHtml && !assetHtml);
        DOM.unmatchedBox.innerHTML = `${unmatched.length ? `<strong>⚠ 未匹配 / 略過</strong>${unmatched.map((item) => `<div>${this.escape(item.name)}：${this.escape(item.reason)}</div>`).join('')}` : ''}${assetHtml}${diagHtml}`;
      }
      const filteredCount = TemplateFilter.getVisibleEntries().length;
      DOM.batchPreviewPanel?.classList.toggle('hidden', !(AppState.batchItems || []).length || !filteredCount);
      document.querySelector('.canvas-shell')?.classList.toggle('batch-mode', !!(AppState.batchItems || []).length && !!filteredCount);
    },

    async selectGenerated(index) {
      if (!AppState.templates[index]) return;
      AppState.activeIndex = index;
      AppState.template = AppState.templates[index].data;
      AppState.selectedLayers = [];
      try { await TemplateLoader.loadImagesForActiveTemplate({ project: AppState.templates[index].project }); }
      catch (error) { console.warn('[Batch] 選取製作物圖片載入逾時或失敗，仍繼續渲染:', error); }
      // 點縮圖切換到這個版位時，套用跟「縮圖產生」（renderThumbnailForTemplate）完全一樣的
      // 規則流程——否則縮圖那份有經過價格重建＋公版 afterApplyRecordToTemplate 校正，主畫布這份
      // 只有 loadImages＋sync，兩邊價格座標／字級會對不上（就是「點一下縮圖價格跑掉」的原因）。
      // skipExactLayout:true 維持不重套寫死精確座標，才不會蓋掉使用者手動調整過的位置。
      const template = AppState.template;
      if (!SnapshotManager.shouldProtectVisualState(template)) {
        window.PriceCouponManager?.rebuildFromPricePreset?.(template);
        this.applyTemplateRuleHook('afterApplyRecordToTemplate', template, template.batchRecord || {}, template.batchDiagnostics || [], { skipExactLayout: true });
        window.SmartAssetManager?.applyTemplate?.(template);
        window.PriceTransformEngine?.syncTemplate?.(template);
      }
      App.sync();
      this.renderBatchUI();
      this.markActiveThumb();
    },

    toggleGenerated(index, checked) {
      if (!AppState.templates[index]) return;
      AppState.templates[index].visible = checked;
      TemplateList.render();
      this.renderBatchUI();
      this.markActiveThumb();
    },

    selectAllGenerated(checked = true) {
      TemplateFilter.getVisibleEntries().forEach(({ item }) => { item.visible = checked; });
      TemplateList.render();
      this.renderBatchUI();
      this.markActiveThumb();
    },

    async clearBatch() {
      if (!AppState.sourceTemplates?.length) return;
      AppState.templates = AppState.sourceTemplates.map((t) => ({ ...t, data: clone(t.data), visible: true }));
      AppState.sourceTemplates = null;
      AppState.batchItems = [];
      AppState.batchGroupsOpen = {};
      AppState.unmatchedBatchItems = [];
      AppState.batchMode = false;
      AppState.activeIndex = 0;
      AppState.template = AppState.templates[0]?.data || null;
      AppState.selectedLayers = [];
      if (DOM.batchPreviewGrid) DOM.batchPreviewGrid.innerHTML = '';
      await TemplateLoader.loadImagesForActiveTemplate();
      App.sync();
      this.renderBatchUI();
      if (DOM.batchStatus) DOM.batchStatus.textContent = '已清除批次結果，回到原本公版清單。';
    },

    renderPreviewPlaceholders() {
      if (!DOM.batchPreviewGrid) return;
      const entries = TemplateFilter.getVisibleEntries();
      const items = entries.map(({ item }) => item);
      DOM.batchPreviewPanel?.classList.toggle('hidden', !items.length);
      document.querySelector('.canvas-shell')?.classList.toggle('batch-mode', !!items.length);
      DOM.batchPreviewGrid.innerHTML = entries.map(({ item, index }) => {
        const itemName = item.name || `Item ${index + 1}`;
        return `
          <button class="batch-thumb ${index === AppState.activeIndex ? 'active' : ''} ${item.visible ? '' : 'is-unchecked'} thumb-pending" data-index="${index}">
            <input class="batch-thumb-check" type="checkbox" title="勾選下載此圖" ${item.visible ? 'checked' : ''}>
            <div class="batch-thumb-placeholder">${this.escape(itemName)}</div>
            <small>${this.escape(itemName)}</small>
          </button>
        `;
      }).join('');
    },

    waitForPreviewFrame() {
      return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    },

    refreshTemplateFromBatchRecord(template) {
      if (!template?.layers || !template.batchRecord) return false;
      if (SnapshotManager.shouldProtectVisualState(template)) {
        // Restore Snapshot 以 JSON 最終畫面為權威；素材/預覽刷新不可重新套 Excel、Rule 或校正初始值。
        return true;
      }
      if (template.batchRecord.__multiSizeSync) {
        // Spec-driven JSON + Rule initialization happens exactly once. Preview/export may resolve assets,
        // but must never reapply records or overwrite the user's current RenderState geometry.
        return true;
      }
      const record = { ...(template.batchRecord || {}) };
      const project = String(template.batchProject || record.__project || '').trim();
      if (project && !record.__project) record.__project = project;
      // 預覽/素材刷新只重新比對文字與素材檔名，不得再用 P_範圍覆寫已套用的 preset 或手動位置。
      this.applyRecordToTemplate(template, record, {
        skipExactLayout: true,
        preserveProductGeometry: true,
      });
      return true;
    },

    refreshGeneratedTemplatesFromBatchRecords() {
      (AppState.templates || []).forEach((item) => {
        const template = item?.data;
        if (!template?.batchRecord) return;
        this.refreshTemplateFromBatchRecord(template);
      });
    },

    async stabilizeTemplateBeforePreview(template) {
      if (!template?.layers) return;

      // 先讓已 decode 的圖片進入瀏覽器繪製週期，避免第一次縮圖使用到尚未穩定的 naturalWidth / naturalHeight。
      await this.waitForPreviewFrame();
      if (SnapshotManager.shouldProtectVisualState(template)) {
        // Restore Snapshot 只等待素材 ready，不做價格 rebuild / Rule / Smart / Layout 二次計算。
        return;
      }

      // 價格必須在商品圖實際渲染尺寸穩定後重建；否則第一次預覽容易先吃到 P 框尺寸，第二次才校正。
      window.PriceCouponManager?.rebuildFromPricePreset?.(template);
      // 價格重建後，重新執行該公版註冊的 afterApplyRecordToTemplate hook（若該公版沒有註冊，這裡本來就是no-op）。
      // 這讓 rules/*.rules.js 的 after hook 成為最後算圖資料來源。
      this.applyTemplateRuleHook('afterApplyRecordToTemplate', template, template?.batchRecord || {}, template?.batchDiagnostics || [], { skipExactLayout: true });
      window.SmartAssetManager?.applyTemplate?.(template);
      window.PriceTransformEngine?.syncTemplate?.(template);
      LayoutRuleEngine.apply(template);

      await this.waitForPreviewFrame();

      // LayoutRuleEngine 可能會改動文字膠囊或票券尺寸；最後再同步一次，確保縮圖與主畫布一致。
      window.PriceTransformEngine?.syncTemplate?.(template);
      LayoutRuleEngine.apply(template);
    },

    // V2.7：拿掉 refreshThumbsForIndexes()。這個函式雖然加了世代計數器互斥、每一步檢查是否
    // 要中止，但本質上還是「暫時把 AppState.template 換成別的版位，await 圖片載入完才換回來」
    // 這個風險模式——只要使用者的滑鼠點擊/放開剛好落在 await 的空窗期，就會作用在被暫時換走
    // 的那個版位上，看起來像「跳版位」。這種背景搶佔全域渲染狀態的做法，用再多時間點檢查
    // 都沒辦法真正堵死這個競態視窗。同步後的縮圖刷新，改成純粹在 DOM 上標記「待更新」
    // （smart-asset-manager.js 的 markThumbsStale()，只切換 CSS class，完全不碰 AppState），
    // 縮圖實際重繪交給使用者自己觸發的「重新整理批次預覽」（那條路徑本來就有 Loading Overlay
    // 擋住互動，是安全的）。

    // 只針對「被跨版位同步影響到的幾個版位」重新產生縮圖，不是整批重新跑一次。
    // 這個版本改用 renderThumbnailForTemplate()（純函式），全程不讀寫 AppState.template /
    // activeIndex / images，所以不需要世代計數器互斥、也不需要檢查使用者是否正在拖曳中——
    // 因為它從頭到尾都不會去搶「目前使用中的版位」這個全域狀態，跟使用者當下的操作
    // 完全是兩件獨立的事，不可能互相干擾。
    // （network 起）縮圖標記待更新（去抖動 400ms）與 template 索引查找；供同步引擎／手動上傳共用。
    markThumbsStale(indexes) {
      const list = [...new Set((Array.isArray(indexes) ? indexes : [indexes]).filter((index) => Number.isInteger(index) && index >= 0))];
      if (!list.length) return;
      if (DOM.batchPreviewGrid) {
        list.forEach((index) => {
          DOM.batchPreviewGrid.querySelector(`.batch-thumb[data-index="${index}"]`)?.classList.add('is-stale');
        });
      }
      if (!AppState.batchMode) return;
      this.__pendingStaleThumbs = this.__pendingStaleThumbs || new Set();
      list.forEach((index) => this.__pendingStaleThumbs.add(index));
      clearTimeout(this.__pendingStaleTimer);
      this.__pendingStaleTimer = setTimeout(() => {
        const pending = [...(this.__pendingStaleThumbs || [])];
        this.__pendingStaleThumbs = null;
        if (pending.length) this.refreshThumbsForIndexes(pending);
      }, 400);
    },

    // 找出某個 template 物件在 AppState.templates 裡的索引；找不到回傳 -1。
    indexOfTemplate(template) {
      if (!template) return -1;
      return (AppState.templates || []).findIndex((item) => (item?.data || item) === template);
    },
    /** （回饋：縮圖即時更新）某張圖被手動改了 → 標記過期並（去抖動 400ms 後）重畫那一張縮圖。 */
    scheduleThumbRefresh(template) {
      const index = this.indexOfTemplate(template);
      if (index >= 0) this.markThumbsStale([index]);
    },

    async refreshThumbsForIndexes(indexes) {
      if (!DOM.batchPreviewGrid || !indexes?.length) return;
      for (const index of indexes) {
        const item = AppState.templates?.[index];
        if (!item) continue;
        try {
          const url = await this.renderThumbnailForTemplate(item.data, { project: item.project });
          const img = DOM.batchPreviewGrid.querySelector(`.batch-thumb[data-index="${index}"] img`);
          if (img) img.src = url;
          DOM.batchPreviewGrid.querySelector(`.batch-thumb[data-index="${index}"]`)?.classList.remove('is-stale');
        } catch (error) {
          console.warn('[Batch Preview] 局部縮圖刷新失敗:', item.name || `Item ${index + 1}`, error);
        }
      }
    },

    async renderPreviewGrid(options = {}) {
      if (!DOM.batchPreviewGrid) return;
      const generation = (this._previewGeneration || 0) + 1;
      this._previewGeneration = generation;
      const entries = TemplateFilter.getVisibleEntries().map(({ item, index }) => ({ item, index }));
      const items = entries.map(({ item }) => item);
      DOM.batchPreviewPanel?.classList.toggle('hidden', !items.length);
      document.querySelector('.canvas-shell')?.classList.toggle('batch-mode', !!items.length);
      if (!items.length) { DOM.batchPreviewGrid.innerHTML = ''; return; }
      if (!options.revealWhenDone) this.renderPreviewPlaceholders();

      const currentIndex = AppState.activeIndex;
      const currentTemplate = AppState.template;
      const thumbs = [];

      AppState.batchPreviewRendering = true;
      for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
        if (generation !== this._previewGeneration) return;
        const index = entries[entryIndex].index;
        const itemName = AppState.templates[index]?.name || `Item ${index + 1}`;
        if (options.showProgress) LoadingOverlay.update((entryIndex / Math.max(1, entries.length)) * 100, `正在載入素材 ${entryIndex + 1} / ${entries.length}：${itemName}`);
        try {
          AppState.activeIndex = index;
          AppState.template = AppState.templates[index].data;
          this.refreshTemplateFromBatchRecord(AppState.template);
          const renderTemplate = AppState.template;
          const renderImages = await TemplateLoader.loadImagesForTemplate(renderTemplate, { project: AppState.templates[index]?.project });
          if (generation !== this._previewGeneration) return;
          AppState.images = renderImages;
          await this.stabilizeTemplateBeforePreview(renderTemplate);
          if (generation !== this._previewGeneration || AppState.template !== renderTemplate) return;

          const url = await this.makeThumbURL();
          if (generation !== this._previewGeneration) return;
          thumbs.push({ index, name: itemName, url, ok: true });
        } catch (error) {
          console.warn('[Batch Preview] 縮圖產生失敗:', itemName, error);
          thumbs.push({ index, name: itemName, url: this.makeFallbackThumb(itemName), ok: false });
        }

        if (!options.revealWhenDone && generation === this._previewGeneration) this.paintPreviewThumbs(thumbs, items, currentIndex, entries);
      }
      if (generation !== this._previewGeneration) return;
      AppState.batchPreviewRendering = false;
      this.paintPreviewThumbs(thumbs, items, currentIndex, entries);
      if (options.showProgress) LoadingOverlay.update(100, '素材載入完成');

      if (generation !== this._previewGeneration) return;
      AppState.activeIndex = currentIndex;
      AppState.template = AppState.templates?.[currentIndex]?.data || currentTemplate;
      try { await TemplateLoader.loadImagesForActiveTemplate(); }
      catch (error) { console.warn('[Batch Preview] 還原目前圖檔載入失敗，仍繼續:', error); }
      this.markActiveThumb();
    },

    paintPreviewThumbs(thumbs, items, currentIndex, entriesSnapshot = null) {
      if (!DOM.batchPreviewGrid) return;
      const entries = entriesSnapshot || TemplateFilter.getVisibleEntries();
      DOM.batchPreviewGrid.innerHTML = thumbs.map((thumb) => {
        const item = AppState.templates[thumb.index] || {};
        return `
          <button class="batch-thumb ${thumb.index === currentIndex ? 'active' : ''} ${item.visible ? '' : 'is-unchecked'} ${thumb.ok ? '' : 'thumb-warning'}" data-index="${thumb.index}">
            <input class="batch-thumb-check" type="checkbox" title="勾選下載此圖" ${item.visible ? 'checked' : ''}>
            <img src="${thumb.url}" alt="${this.escape(thumb.name)}">
            <small>${this.escape(thumb.name)}</small>
          </button>
        `;
      }).join('') + entries.slice(thumbs.length).map(({ item, index }) => {
        const itemName = item.name || `Item ${index + 1}`;
        return `<button class="batch-thumb ${index === currentIndex ? 'active' : ''} ${item.visible ? '' : 'is-unchecked'} thumb-pending" data-index="${index}"><input class="batch-thumb-check" type="checkbox" title="勾選下載此圖" ${item.visible ? 'checked' : ''}><div class="batch-thumb-placeholder">${this.escape(itemName)}</div><small>${this.escape(itemName)}</small></button>`;
      }).join('');
    },

    makeFallbackThumb(name = 'Preview') {
      const safe = this.escape(name).slice(0, 40);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120" viewBox="0 0 180 120"><rect width="180" height="120" rx="10" fill="#111827"/><text x="90" y="55" text-anchor="middle" fill="#fbbf24" font-family="Arial" font-size="12">縮圖產生失敗</text><text x="90" y="78" text-anchor="middle" fill="#cbd5e1" font-family="Arial" font-size="10">${safe}</text></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },

    async makeThumbURL() {
      return this.makeThumbURLFor(AppState.template, AppState.images);
    },
    // 純函式版本：只吃參數，完全不讀寫 AppState.template / AppState.images / AppState.activeIndex。
    // 可以安全地在背景幫「目前並非使用中」的版位產生縮圖，不會跟使用者當下在主畫布上的操作
    // 互相干擾——這是這次「即時縮圖」重新設計的核心：不再用「暫時把 AppState.template 換成
    // 別的版位」這種會有競態風險的做法。
    async makeThumbURLFor(template, images) {
      const t = template;
      const maxW = 180;
      const scale = Math.max(0.1, maxW / t.canvas.width);
      const off = document.createElement('canvas');
      off.width = Math.round(t.canvas.width * scale);
      off.height = Math.round(t.canvas.height * scale);
      const c = off.getContext('2d', { alpha: true });
      if (t.batchRecord?.__multiSizeSync && flag('ui.thumbWhiteOnMultiSize', true)) {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, off.width, off.height);
      }
      c.save();
      c.scale(scale, scale);
      Renderer.renderSceneTo(c, t, images, { showMissing: true, showGuides: true, showUploadPrompt: flag('ui.thumbShowUploadPrompt', false) });
      c.restore();
      return off.toDataURL('image/jpeg', 0.86);
    },
    // 純函式版本：針對「目前並非使用中」的某個版位，重新載入素材＋套用規則＋產生縮圖，
    // 全程不碰 AppState.template / activeIndex / images，回傳這個版位自己的 images 供呼叫端
    // 視需要使用（例如要順便更新 AppState.images 時，呼叫端自行決定，這個函式本身不做任何
    // 全域寫入）。
    async renderThumbnailForTemplate(template, options = {}) {
      if (!template) return null;

      // 背景縮圖必須是真正的純渲染：所有價格 rebuild / Rule / Smart / Layout 運算都只允許
      // 發生在 clone 上。原本直接傳入 item.data，會讓 400ms 的縮圖刷新偷偷改寫正式 template；
      // 下一次滑鼠 click 只是剛好觸發主畫布重繪，才讓使用者看見價格跳回原尺寸。
      // 整合版：batch.previewMode＝mutating（KV 舊行為）時直接在正式 template 上算縮圖，不 clone。
      const mutatingPreview = flag('batch.previewMode', 'mutatingGuarded') === 'mutating';
      const renderTemplate = mutatingPreview ? template : clone(template);
      const images = await TemplateLoader.loadImagesForTemplate(renderTemplate, options);
      if (!SnapshotManager.shouldProtectVisualState(renderTemplate)) {
        window.PriceCouponManager?.rebuildFromPricePreset?.(renderTemplate);
        this.applyTemplateRuleHook('afterApplyRecordToTemplate', renderTemplate, renderTemplate.batchRecord || {}, renderTemplate.batchDiagnostics || [], { skipExactLayout: true });
        if (mutatingPreview) window.SmartAssetManager?.applyTemplate?.(renderTemplate);
        else window.SmartAssetManager?.applyTemplate?.(renderTemplate, { readOnly: true });
        window.PriceTransformEngine?.syncTemplate?.(renderTemplate);
        LayoutRuleEngine.apply(renderTemplate);
      }
      return this.makeThumbURLFor(renderTemplate, images);
    },

    markActiveThumb() {
      qsa('.batch-thumb').forEach((btn) => {
        const index = Number(btn.dataset.index);
        const item = AppState.templates?.[index];
        btn.classList.toggle('active', index === AppState.activeIndex);
        btn.classList.toggle('is-unchecked', !item?.visible);
        const checkbox = btn.querySelector('.batch-thumb-check');
        if (checkbox) checkbox.checked = !!item?.visible;
      });
    },

    norm(value) { return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[\-_()（）\[\]【】]/g, ''); },
    escape: escapeHtml,
  };
  // ── BatchManager：A 系實作（正式BN V0.8 為底）──
  const BatchManager_A = {
    fields: ['主標', '副標', '文案', 'LOGO', '警語', '商品圖1', '商品圖2', '商品圖_左', '商品圖_中', '商品圖_右', 'CTA', '價格', '價格_左', '價格_中', '價格_右', '文案_左', '文案_中', '文案_右', '票券', '票券案型', '版位'],
    imageExts: ['png', 'jpg', 'jpeg', 'webp', 'svg'],

    // 把 worksheet 轉成二維陣列，並依 Excel 真實 merge metadata 展開合併儲存格。
    // 只有位於 !merges 範圍內的空白格才繼承左上角值；一般空白格絕不做 fill-down。
    // 橫向、縱向與矩形合併都採同一規則，讓主標/副標/案型等任何欄位都忠實反映 Excel 顯示內容。
    sheetToRowsWithMergedFill(sheet) {
      const workbook = AppState.excelWorkbook;
      const sheetName = workbook?.SheetNames?.find((name) => workbook.Sheets?.[name] === sheet) || '';
      const range = sheet?.['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
      const resolving = new Set();

      const readCell = (targetSheet, targetSheetName, rowIndex, columnIndex) => {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const token = `${targetSheetName}!${address}`;
        if (resolving.has(token)) return '';
        const cell = targetSheet?.[address];
        if (!cell) return '';

        // Formula cells must use Excel's cached/displayed result first.
        if (cell.f) {
          if (cell.w !== undefined && cell.w !== null && String(cell.w) !== '') return cell.w;
          if (cell.v !== undefined && cell.v !== null && cell.v !== '') return cell.v;

          // Safe fallback: only a single-cell reference is resolved. Complex formulas are never guessed.
          const formula = String(cell.f || '').trim();
          const reference = formula.match(/^(?:(?:'((?:[^']|'')+)'|([^!]+))!)?\$?([A-Z]{1,3})\$?(\d+)$/i);
          if (!reference) return '';
          const referencedSheetName = (reference[1] ? reference[1].replace(/''/g, "'") : reference[2]?.trim()) || targetSheetName;
          const referencedSheet = workbook?.Sheets?.[referencedSheetName];
          if (!referencedSheet) return '';
          resolving.add(token);
          try {
            return readCell(
              referencedSheet,
              referencedSheetName,
              Number(reference[4]) - 1,
              XLSX.utils.decode_col(reference[3].toUpperCase()),
            );
          } finally {
            resolving.delete(token);
          }
        }

        // 數值預設保留原型；若 Excel 有不同於 raw value 的顯示值（例如 1 格式化顯示為 01），
        // 優先保留顯示字串，避免備註No等識別碼遺失前導 0。
        if (cell.t === 'n' && typeof cell.v === 'number') {
          if (cell.w !== undefined && cell.w !== null && String(cell.w) !== '' && String(cell.w) !== String(cell.v)) return cell.w;
          return cell.v;
        }
        if (cell.w !== undefined && cell.w !== null && String(cell.w) !== '') return cell.w;
        return cell.v ?? '';
      };

      const rows = [];
      for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        const row = [];
        for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
          row[columnIndex] = readCell(sheet, sheetName, rowIndex, columnIndex);
        }
        rows[rowIndex] = row;
      }

      const merges = sheet?.['!merges'] || [];
      merges.forEach((mergeRange) => {
        const { s: startCell, e: endCell } = mergeRange || {};
        if (!startCell || !endCell) return;
        const topValue = rows[startCell.r]?.[startCell.c];
        if (topValue === undefined || topValue === '') return;
        for (let rowIndex = startCell.r; rowIndex <= endCell.r; rowIndex += 1) {
          if (!rows[rowIndex]) rows[rowIndex] = [];
          for (let columnIndex = startCell.c; columnIndex <= endCell.c; columnIndex += 1) {
            if (rowIndex === startCell.r && columnIndex === startCell.c) continue;
            if (rows[rowIndex][columnIndex] === undefined || rows[rowIndex][columnIndex] === '') {
              rows[rowIndex][columnIndex] = topValue;
            }
          }
        }
      });
      return rows;
    },

    async handleExcelFile(file) {
      if (!file) return;
      if (DOM.batchStatus) DOM.batchStatus.textContent = `正在讀取工單：${file.name}...`;
      if (!window.XLSX) {
        if (DOM.batchStatus) DOM.batchStatus.textContent = '工單解析套件 XLSX 未載入，請確認可連線載入 CDN。';
        alert('目前找不到工單解析套件 XLSX，請確認網路可載入 CDN，或將 xlsx.full.min.js 放入本工具資料夾。');
        return;
      }
      try {
        const buffer = await file.arrayBuffer();
        // 第33/63題：重新讀 Excel = 新工作階段；清除舊人工歷史 / Smart Asset Session / 規格表 cache。
        TextEditor.commit();
        Interaction.finalizeActiveTransform?.();
        HistoryManager.clear();
        window.SmartAssetManager?.resetSession?.();
        delete AppState._materialSpecTable;
        AppState.excelWorkbook = XLSX.read(buffer, { type: 'array' });
        AppState.excelFileName = file.name;
        this.renderSheetOptions();
        const initialSheet = DOM.excelSheetSelect?.value || AppState.excelWorkbook.SheetNames[0];
        this.detectAndOfferProjectsFromSheet(initialSheet);
        if (DOM.batchStatus) DOM.batchStatus.textContent = `已讀取：${file.name}`;
      } catch (error) {
        console.error('[工單] 讀取失敗:', error);
        alert('工單讀取失敗，請確認檔案格式為 .xlsx / .xls / .xlsm。');
      }
    },

    renderSheetOptions() {
      if (!DOM.excelSheetSelect || !AppState.excelWorkbook) return;
      DOM.excelSheetSelect.disabled = false;
      DOM.generateFromExcelBtn && (DOM.generateFromExcelBtn.disabled = false);
      DOM.excelSheetSelect.innerHTML = AppState.excelWorkbook.SheetNames
        .map((name) => `<option value="${this.escape(name)}">${this.escape(name)}</option>`)
        .join('');
    },

    async generateFromSelectedSheet() {
      if (!AppState.excelWorkbook) return alert('請先上傳工單。');
      if (DOM.batchStatus) DOM.batchStatus.textContent = '正在解析工單並產生批次圖檔...';
      const sheetName = DOM.excelSheetSelect?.value || AppState.excelWorkbook.SheetNames[0];
      const sheet = AppState.excelWorkbook.Sheets[sheetName];
      if (!sheet) return alert('找不到指定分頁。');

      if (!AppState.sourceTemplates) AppState.sourceTemplates = this.ensureTemplatePool(AppState.templates);

      // Spec 專用解析器：由 AssetSpecEngine 提供，必要欄位完整時優先使用；否則完整退回既有解析流程。
      const networkRows = this.sheetToRowsWithMergedFill(sheet);
      if (window.AssetSpecEngine?.findHeader?.(networkRows)) {
        const startedAt = performance.now();
        const result = window.AssetSpecEngine.build({ rows: networkRows, sourceTemplates: AppState.sourceTemplates, clone });
        AppState.unmatchedBatchItems = result.unmatched || [];
        AppState.batchItems = result.generated || [];
        AppState.batchDiagnostics = result.diagnostics || {};
        AppState.batchDiagnostics.elapsedMs = performance.now() - startedAt;
        if (!result.generated?.length) { this.renderBatchUI(); alert('工單沒有產生圖片，請查看診斷清單。'); return; }
        AppState.templates = result.generated; AppState.activeIndex = 0; AppState.template = AppState.templates[0].data;
        AppState.selectedLayers = []; AppState.batchMode = true;
        this.renderBatchUI(); this.renderPreviewPlaceholders(); LoadingOverlay.show('正在載入第 1 張素材...', 0);
        try { await this.renderPreviewGrid({ showProgress: true, revealWhenDone: true }); } finally { LoadingOverlay.hide(); }
        App.sync(); this.renderBatchUI(); return;
      }

      // All模式：對每個偵測到的專案各跑一次完整的解析+套版流程（讀取素材時 AppState.currentProject
      // 暫時被設成各自的專案名稱，讓 AssetStore / rules 的專案配色、LOGO判斷都讀到正確專案）。
      // 單一專案模式維持完全原本的行為（只跑一次、檔名不加專案前綴）。
      const isAllMode = AppState.currentProject === ALL_PROJECTS_VALUE;
      const projectsToRun = isAllMode
        ? [...new Set(AppState.detectedExcelProjects || [])]
        : [AppState.currentProject || ''];

      if (isAllMode && !projectsToRun.length) {
        alert('沒有偵測到任何專案，無法使用「All」模式。');
        return;
      }

      const originalProject = AppState.currentProject;
      let allGenerated = [];
      let allUnmatched = [];
      let allEmptyBlocks = [];
      let lastDiagnostics = null;
      let lastSkippedRows = [];

      try {
        for (const project of projectsToRun) {
          AppState.currentProject = project;
          const result = await this.generateForCurrentProject(sheetName, sheet);
          lastDiagnostics = result.diagnostics;
          lastSkippedRows = result.diagnostics?.skippedRows || [];

          const projectGenerated = isAllMode
            ? result.generated.map((item) => {
                const prefixedName = `${project}_${item.name}`;
                const data = clone(item.data);
                data.templateId = prefixedName;
                data.batchProject = project;
                return { ...item, name: prefixedName, data, project };
              })
            : result.generated;

          allGenerated = allGenerated.concat(projectGenerated);
          allUnmatched = allUnmatched.concat(result.unmatched.map((u) => (isAllMode ? { ...u, project } : u)));
          allEmptyBlocks = allEmptyBlocks.concat(result.emptyBlocks.map((e) => (isAllMode ? { ...e, project } : e)));
        }
      } finally {
        AppState.currentProject = originalProject;
      }

      AppState.unmatchedBatchItems = [...allUnmatched, ...allEmptyBlocks];
      AppState.batchItems = allGenerated;
      AppState.batchGroupsOpen = {};
      AppState.batchDiagnostics = {
        ...lastDiagnostics,
        generatedCount: allGenerated.length,
        unmatchedCount: allUnmatched.length,
        emptyBlockCount: allEmptyBlocks.length,
        skippedRows: lastSkippedRows,
      };

      if (!allGenerated.length) {
        this.renderBatchUI();
        if (!allUnmatched.length && !allEmptyBlocks.length && !lastDiagnostics?.parsedBlockCount) {
          alert(lastDiagnostics?.anchorCount
            ? '沒有產生任何圖片：有找到「製作內容」，但沒有找到同列欄位或有效資料列。'
            : '沒有產生任何圖片：找不到「製作內容」、欄位列，或欄位下方沒有有效資料。');
          return;
        }
        const reasons = [
          allUnmatched.length ? `找不到公版 ${allUnmatched.length} 筆` : '',
          allEmptyBlocks.length ? `欄位空白 ${allEmptyBlocks.length} 筆` : '',
          !allUnmatched.length && !allEmptyBlocks.length ? '沒有有效資料列' : '',
        ].filter(Boolean).join('；');
        alert(`沒有產生任何圖片：${reasons}。請查看左側「未匹配 / 診斷」清單。`);
        return;
      }

      AppState.templates = allGenerated;
      AppState.activeIndex = 0;
      AppState.template = AppState.templates[0].data;
      AppState.selectedLayers = [];
      AppState.batchMode = true;

      // 批次產圖後先顯示浮動進度，不再先顯示缺圖的預覽。
      this.renderBatchUI();
      this.renderPreviewPlaceholders();
      LoadingOverlay.show('正在載入第 1 張素材...', 0);

      try {
        await this.renderPreviewGrid({ showProgress: true, revealWhenDone: true });
      } catch (error) {
        console.warn('[Batch Preview] 產生縮圖失敗:', error);
      } finally {
        LoadingOverlay.hide();
      }

      App.sync();
      this.renderBatchUI();
    },

    // 針對「目前 AppState.currentProject」這一個專案，執行完整的 Excel 解析 + 套版邏輯。
    // 這個函式本身不管 All模式；All模式的迴圈跟檔名前綴/資料夾分類都由呼叫端 generateFromSelectedSheet 處理，
    // 這裡維持跟原本單一專案模式完全一樣的邏輯，只是抽出來讓 All模式可以重複呼叫。
    async generateForCurrentProject(sheetName, sheet) {
      const rows = this.sheetToRowsWithMergedFill(sheet);
      const parseResult = this.parseRows(rows);
      const parsedBlocks = parseResult.blocks || [];
      const diagnostics = {
        sheetName,
        anchorCount: parseResult.anchorCount || 0,
        parsedBlockCount: parsedBlocks.length,
        recordCount: parsedBlocks.reduce((sum, block) => sum + (block.records?.length || 0), 0),
        sourceTemplateNames: (AppState.sourceTemplates || AppState.templates || []).map((t) => t.name || t.data?.templateId || t.file || '未命名公版'),
        warnings: parseResult.warnings || [],
        skippedRows: parseResult.skippedRows || [],
      };
      if (!parsedBlocks.length) return { generated: [], unmatched: [], emptyBlocks: [], diagnostics };

      const generated = [];
      const unmatched = [];
      const emptyBlocks = [];
      let sourceTemplates = AppState.sourceTemplates?.length ? AppState.sourceTemplates : AppState.templates;
      const counters = new Map();

      for (const block of parsedBlocks) {
        let generatedInBlock = 0;
        const unmatchedCountBeforeBlock = unmatched.length;
        for (const record of block.records) {
          const hasGenericRecordData = this.fields.some((field) => String(record[field] || '').trim());
          const hasSpecialRecordData = window.SpecialBlockParserPolicy?.hasUsableRecordData?.(block.name, record) === true;
          if (!hasGenericRecordData && !hasSpecialRecordData) continue;
          let routes = [];
          try { routes = this.resolveRecordTemplateRoutes(block, record); }
          catch (error) { unmatched.push({ name: block.name, reason: error?.message || String(error) }); continue; }
          const routeList = routes.length ? routes : [null];

          for (const recordRoute of routeList) {
            if (recordRoute) {
              const routeTemplate = await this.ensureTemplateForRoute(recordRoute, sourceTemplates);
              if (routeTemplate && !sourceTemplates.includes(routeTemplate)) sourceTemplates = [routeTemplate, ...sourceTemplates];
            }
            const matchInfo = recordRoute ? this.findTemplateForRoute(recordRoute, sourceTemplates) : this.findTemplateForName(block.name, sourceTemplates);
            if (!matchInfo?.template) {
              unmatched.push({ name: block.name, reason: matchInfo?.reason || '找不到對應公版' });
              continue;
            }

            const templateName = matchInfo.template.name || matchInfo.template.data?.templateId || '公版';
            const baseName = recordRoute?.outputPrefix || this.makeOutputPrefix(block.name, templateName);
            const variantRecords = this.expandRecordVariantsForTemplate(matchInfo.template.data, record);
            for (const variantRecord of variantRecords) {
              const seq = (counters.get(baseName) || 0) + 1;
              counters.set(baseName, seq);
              const suffix = this.normalizeOutputSuffix(variantRecord.__outputSuffix || variantRecord._outputSuffix || '');
              const requested = String(recordRoute?.outputName || variantRecord.__outputName || '').trim();
              const outputName = requested
                ? requested.replace(/[\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()
                : `${baseName}_${String(seq).padStart(2, '0')}${suffix ? `_${suffix}` : ''}`;
              const data = clone(matchInfo.template.data);
              data.templateId = outputName;
              data.batchSourceName = block.name;
              data.batchProject = AppState.currentProject && AppState.currentProject !== ALL_PROJECTS_VALUE ? AppState.currentProject : '';
              if (data.batchProject && !variantRecord.__project) variantRecord.__project = data.batchProject;
              if (recordRoute) {
                data.ruleFamily = recordRoute.family || recordRoute.key;
                data.sheetTemplateRoute = {
                  key: recordRoute.key,
                  family: recordRoute.family || recordRoute.key,
                  label: recordRoute.label,
                  sourceTemplateId: recordRoute.templateId,
                  sourceTemplateFile: recordRoute.templateFile,
                  ruleFile: recordRoute.ruleFile,
                  multiOutput: recordRoute.multiOutput === true,
                };
              }
              try {
                this.applyRecordToTemplate(data, variantRecord);
              } catch (error) {
                unmatched.push({ name: block.name, reason: error?.message || String(error) });
                continue;
              }
              generated.push({ name: outputName, file: `${outputName}.generated`, visible: true, data, batchRecord: variantRecord, project: data.batchProject || '' });
              generatedInBlock += 1;
            }
          }
        }
        if (!generatedInBlock && unmatched.length === unmatchedCountBeforeBlock) {
          emptyBlocks.push({ name: block.name, reason: '指定欄位都是空白或無可用公版' });
        }
      }
      const unmatchedMap = new Map();
      unmatched.forEach((item) => {
        const key = `${String(item?.name || '').trim()}|${String(item?.reason || '').trim()}`;
        if (!unmatchedMap.has(key)) unmatchedMap.set(key, item);
      });
      return { generated, unmatched: Array.from(unmatchedMap.values()), emptyBlocks, diagnostics };
    },

    expandRecordVariantsForTemplate(template, record) {
      const family = template?.ruleFamily || template?.sheetTemplateRoute?.family || CapsuleRuleEngine.getTemplateFamily(template);
      const rules = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(family) || {};
      const variantFactory = rules?.createVariantRecords
        || rules?.expandRecordVariants
        || rules?.variantRules?.createVariantRecords;

      if (typeof variantFactory !== 'function') return [record];

      try {
        const variants = variantFactory({ ...record }, { template, family });
        return Array.isArray(variants) && variants.length ? variants : [record];
      } catch (error) {
        console.warn('[Batch] expandRecordVariants failed:', { family, error });
        return [record];
      }
    },

    normalizeOutputSuffix(value) {
      return String(value || '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '')
        .replace(/^_+|_+$/g, '');
    },

    // 矩陣式工單格式：一列代表一個版位（公版），每個專案各佔一組欄位（內容欄＋勾選欄），
    // 例如「17th + 18 day KV」這種表格：
    //   - 某一列有一格文字是「資料夾名稱」，右邊幾格是各專案名稱（例如「4.17 直播日」「4.18 暖身」「4.18 正式」）
    //   - 再往下幾列，有一列的某一格文字是「版位」，這一列同時也是各專案「勾選欄」的位置
    //   - 版位列往下，每一列的「版位」欄是公版名稱，各專案內容欄用多行文字寫「LOGO：xxx\n主標題：xxx\n副標題：xxx」
    // 偵測到這種格式時，直接解析成 blocks 回傳；偵測不到（一般逐列格式）就回傳 null，交給 parseRows 原本的邏輯處理。
    // 找出矩陣式工單的「資料夾名稱」列與各專案名稱對應的欄位索引。
    // 回傳 null 代表這不是矩陣式格式；回傳 {folderRow, folderCol, projectContentCol, projectNames}。
    detectMatrixProjectNames(rows) {
      const clean = (value) => String(value ?? '').trim();
      const normEq = (a, b) => this.norm(a) === this.norm(b) && this.norm(a) !== '';

      let folderRow = -1;
      let folderCol = -1;
      for (let r = 0; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const c = row.findIndex((cell) => normEq(cell, '資料夾名稱'));
        if (c !== -1) { folderRow = r; folderCol = c; break; }
      }
      if (folderRow === -1) return null;

      const projectContentCol = {};
      const projectNames = [];
      (rows[folderRow] || []).forEach((cell, c) => {
        if (c <= folderCol) return;
        const value = clean(cell);
        if (!value) return;
        projectContentCol[value] = c;
        projectNames.push(value);
      });
      if (!projectNames.length) return null;

      return { folderRow, folderCol, projectContentCol, projectNames };
    },

    // 工單讀取檔案／切換分頁時呼叫：如果這個分頁是矩陣式工單格式，
    // 把偵測到的專案名稱（例如「4.17 直播日」）自動補進「目前專案」下拉選單，
    // 這是「目前專案」選單唯一的資料來源（V5.0已無build產物可用）。
    detectAndOfferProjectsFromSheet(sheetName) {
      try {
        if (!window.XLSX || !AppState.excelWorkbook) return;
        const sheet = AppState.excelWorkbook.Sheets[sheetName];
        if (!sheet) return;
        const rows = this.sheetToRowsWithMergedFill(sheet);
        const detected = this.detectMatrixProjectNames(rows);
        // 切換分頁時，先清掉上一個分頁殘留的偵測結果，避免「這個分頁明明不是矩陣式工單，
        // 卻因為沿用上一個分頁的專案清單」而誤跳出目前專案的浮動視窗。
        AppState.detectedExcelProjects = detected?.projectNames?.length ? detected.projectNames : [];
        TemplateLoader.populateProjectOptions();
      } catch (error) {
        console.warn('[Batch] 偵測矩陣式工單專案名稱失敗:', error);
      }
    },

    parseMatrixSheet(rows) {
      const clean = (value) => String(value ?? '').trim();
      const normEq = (a, b) => this.norm(a) === this.norm(b) && this.norm(a) !== '';

      // 1) 找「資料夾名稱」那一列，取得每個專案名稱對應的「內容欄」欄位索引。
      const detected = this.detectMatrixProjectNames(rows);
      if (!detected) return null;
      const { folderRow, projectContentCol, projectNames } = detected;

      // 2) 從資料夾名稱列往下找「版位」欄位所在列（表頭列），同一列上文字等於某專案名稱（且不是內容欄本身）的欄位，視為該專案的勾選欄。
      let headerRow = -1;
      let positionCol = -1;
      for (let r = folderRow + 1; r < Math.min(rows.length, folderRow + 8); r += 1) {
        const row = rows[r] || [];
        const c = row.findIndex((cell) => normEq(cell, '版位'));
        if (c !== -1) { headerRow = r; positionCol = c; break; }
      }
      if (headerRow === -1) return null;

      const projectCheckboxCol = {};
      (rows[headerRow] || []).forEach((cell, c) => {
        const value = clean(cell);
        if (!value) return;
        const matchedProject = projectNames.find((name) => normEq(value, name) && c !== projectContentCol[name]);
        if (matchedProject && projectCheckboxCol[matchedProject] === undefined) projectCheckboxCol[matchedProject] = c;
      });

      // 3) 「目前專案」下拉選單決定要讀哪個專案欄位（跟素材資料夾比對共用同一個選擇，兩者邏輯一致）。
      const selectedProject = AppState.currentProject || '';
      const matchedProjectName = projectNames.find((name) => normEq(name, selectedProject))
        || (selectedProject ? projectNames.find((name) => this.norm(name).includes(this.norm(selectedProject)) || this.norm(selectedProject).includes(this.norm(name))) : null);

      if (!matchedProjectName) {
        return {
          blocks: [],
          warnings: [`偵測到矩陣式工單（專案欄位：${projectNames.join('、')}），但「目前專案」下拉選單目前是「${selectedProject || '（未選擇）'}」，跟這幾個專案名稱對不起來，請確認「目前專案」有沒有選對。`],
          anchorCount: projectNames.length,
          skippedRows: [],
        };
      }

      const contentCol = projectContentCol[matchedProjectName];
      const checkboxCol = projectCheckboxCol[matchedProjectName];

      // 4) 從表頭列下一列開始，逐列讀「版位」名稱 + 該專案欄位的內容文字。
      const blocks = [];
      const warnings = [];
      const skippedRows = [];
      let dataRowCount = 0;

      for (let r = headerRow + 1; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const posName = clean(row[positionCol]);
        if (!posName) continue;
        dataRowCount += 1;

        if (checkboxCol !== undefined) {
          const checkboxValue = row[checkboxCol];
          const isExplicitFalse = checkboxValue === false || this.norm(checkboxValue) === this.norm('false') || clean(checkboxValue) === 'FALSE';
          if (isExplicitFalse) {
            skippedRows.push({ row: r + 1, reason: `${posName}：${matchedProjectName} 勾選欄是 FALSE，略過` });
            continue;
          }
        }

        const contentText = clean(row[contentCol]);
        if (!contentText) {
          skippedRows.push({ row: r + 1, reason: `${posName}：${matchedProjectName} 欄位沒有文案內容，略過` });
          continue;
        }

        // 解析多行文字：「LOGO：xxx」「主標題：xxx」「副標題：xxx」（冒號可全形或半形）。
        // LOGO 這一行是素材說明文字（要用哪個LOGO），會存進 record['LOGO']，
        // 實際套用哪個LOGO檔案由 applyRecordToTemplate 依內容判斷（見該函式的 LOGO 套用區塊）。
        const fields = { 主標: '', 副標: '', LOGO: '' };
        contentText.split(/\r?\n/).forEach((line) => {
          const m = line.match(/^\s*(LOGO|主標題|主標|副標題|副標)\s*[:：]\s*(.*)$/);
          if (!m) return;
          const label = m[1];
          const value = m[2].trim();
          if (label === '主標題' || label === '主標') fields['主標'] = value;
          else if (label === '副標題' || label === '副標') fields['副標'] = value;
          else if (label === 'LOGO') fields['LOGO'] = value;
        });

        if (!fields['主標'] && !fields['副標'] && !fields['LOGO']) {
          skippedRows.push({ row: r + 1, reason: `${posName}：${matchedProjectName} 欄位讀不到「主標題／副標題／LOGO」格式的文字，略過` });
          continue;
        }

        blocks.push({
          name: posName,
          headerRow,
          startRow: r,
          quantity: 1,
          records: [{ ...fields, __sourceRow: r + 1 }],
          colMap: {},
          templateType: 'matrix',
        });
      }

      if (!dataRowCount) return null;

      return { blocks, warnings, anchorCount: projectNames.length, skippedRows };
    },

    parseRows(rows) {
      const sheetParsers = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getSheetParsers?.() || [];
      for (const parser of sheetParsers) {
        try {
          const parseSheetBlocks = parser.parseSheetBlocks || parser.parse;
          if (typeof parseSheetBlocks !== 'function') continue;
          const parsed = parseSheetBlocks({ rows, helpers: { norm: this.norm.bind(this), normalizeRecordText: this.normalizeRecordText.bind(this) } });
          if (parsed?.blocks?.length) return parsed;
        } catch (error) {
          console.warn('[Batch] sheet parser failed:', parser.family, error);
        }
      }

      const matrixResult = this.parseMatrixSheet(rows);
      if (matrixResult) return matrixResult;

      const blocks = [];
      const warnings = [];
      const skippedRows = [];
      let anchorCount = 0;

      const clean = (value) => String(value ?? '').trim();
      const isAnchor = (cell) => {
        const normalized = this.norm(cell);
        return normalized === this.norm('製作內容')
          || normalized.startsWith(this.norm('製作內容'))
          || normalized === this.norm('版位');
      };
      const hasText = (value) => clean(value) !== '';
      const toNumber = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const m = clean(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : 0;
      };
      const rowHasAnchor = (row) => (row || []).some(isAnchor);
      const rowIsMostlyEmpty = (row) => !(row || []).some((cell) => hasText(cell));

      // 依照這份 Excel 的欄位命名做精準對應：
      // 「主標」必須以主標開頭，避免把「主題日/活動」誤抓成主標。
      // 「副標」優先支援 USP/副標、副標；警語/商品圖/CTA 維持容錯。
      const detectColMap = (row) => {
        const colMap = {};
        const setOnce = (field, c) => {
          if (colMap[field] === undefined) colMap[field] = c;
        };
        (row || []).forEach((cell, c) => {
          const raw = clean(cell);
          const normalized = this.norm(raw);
          if (!normalized) return;

          // 明確排除非文案欄位：日期、主題日/頁面、頁面、版配、尺寸等，不參與任何欄位判斷，降低誤抓率。
          const blockedHeaderWords = [
            '日期', '主題日', '主題日頁面', '主題頁面', '頁面', '活動頁', '活動頁面',
            '製作內容', '數量', 'k數', '尺寸', '版配', '規格', '備註', '說明'
          ].map((word) => this.norm(word));
          if (blockedHeaderWords.some((word) => normalized === word || normalized.includes(word))) return;

          // 主標：只接受「主標...」或英文 title，不接受「主題日/活動」。
          if (normalized.startsWith(this.norm('主標')) || normalized === 'title' || normalized.startsWith('title')) {
            setOnce('主標', c);
          }
          // 副標：接受「副標...」、「USP/副標...」、「USP...」與英文 subtitle。
          else if (normalized.startsWith(this.norm('副標')) || normalized.includes(this.norm('usp副標')) || normalized.startsWith('usp') || normalized === 'subtitle' || normalized.startsWith('subtitle')) {
            setOnce('副標', c);
          }
          else if (normalized.includes(this.norm('警語')) || normalized.includes(this.norm('法務')) || normalized.includes('legal')) {
            setOnce('警語', c);
          }
          else if (normalized === this.norm('商品圖_左') || normalized === this.norm('商品圖左') || normalized === this.norm('左商品圖')) {
            setOnce('商品圖_左', c);
            setOnce('商品圖1', c);
          }
          else if (normalized === this.norm('商品圖_中') || normalized === this.norm('商品圖中') || normalized === this.norm('中商品圖')) {
            setOnce('商品圖_中', c);
          }
          else if (normalized === this.norm('商品圖_右') || normalized === this.norm('商品圖右') || normalized === this.norm('右商品圖')) {
            setOnce('商品圖_右', c);
            setOnce('商品圖2', c);
          }
          else if (normalized.includes(this.norm('商品圖1')) || normalized.includes(this.norm('商品圖一')) || normalized.includes('productimage1')) {
            setOnce('商品圖1', c);
          }
          else if (normalized.includes(this.norm('商品圖2')) || normalized.includes(this.norm('商品圖二')) || normalized.includes('productimage2')) {
            setOnce('商品圖2', c);
          }
          else if (normalized === this.norm('票券') || normalized.includes(this.norm('票券類型')) || normalized.includes(this.norm('票券LOGO'))) {
            setOnce('票券', c);
          }
          else if (normalized.includes(this.norm('票券案型')) || normalized.includes(this.norm('案型'))) {
            setOnce('票券案型', c);
          }
          else if (normalized === this.norm('版位') || normalized.includes(this.norm('版位'))) {
            setOnce('版位', c);
          }
          else if (normalized.includes('cta') || normalized.includes(this.norm('按鈕'))) {
            setOnce('CTA', c);
          }
          else if (normalized === this.norm('文案_左') || normalized === this.norm('文案左')) {
            setOnce('文案_左', c);
          }
          else if (normalized === this.norm('文案_中') || normalized === this.norm('文案中')) {
            setOnce('文案_中', c);
          }
          else if (normalized === this.norm('文案_右') || normalized === this.norm('文案右')) {
            setOnce('文案_右', c);
          }
          else if (normalized === this.norm('價格_左') || normalized === this.norm('價格左')) {
            setOnce('價格_左', c);
          }
          else if (normalized === this.norm('價格_中') || normalized === this.norm('價格中')) {
            setOnce('價格_中', c);
          }
          else if (normalized === this.norm('價格_右') || normalized === this.norm('價格右')) {
            setOnce('價格_右', c);
          }
          else if (normalized.includes(this.norm('價格')) || normalized.includes('price')) {
            setOnce('價格', c);
          }
        });
        return colMap;
      };

      const findHeaderCandidates = () => {
        const candidates = [];
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r] || [];
          const anchorCol = row.findIndex(isAnchor);
          if (anchorCol < 0) continue;
          anchorCount += 1;
          const colMap = detectColMap(row);
          const hasCoreFields = this.fields.some((field) => colMap[field] !== undefined);
          const hasSpecialParserFields = window.SpecialBlockParserPolicy?.isSpecialHeaderRow?.(row) === true;
          if (hasCoreFields || hasSpecialParserFields) candidates.push({ headerRow: r, anchorCol, colMap });
          else warnings.push(`第 ${r + 1} 列找到「製作內容」，但同列沒有主標/副標/警語/商品圖/CTA/票券或特規 Parser 欄位`);
        }
        return candidates;
      };

      const headerCandidates = findHeaderCandidates();
      for (let hIndex = 0; hIndex < headerCandidates.length; hIndex++) {
        const header = headerCandidates[hIndex];
        const nextHeaderRow = hIndex + 1 < headerCandidates.length ? headerCandidates[hIndex + 1].headerRow : rows.length;
        const qtyCol = (rows[header.headerRow] || []).findIndex((cell) => this.norm(cell) === this.norm('數量'));
        const firstFieldCol = Math.min(...Object.values(header.colMap));

        for (let r = header.headerRow + 1; r < nextHeaderRow; r++) {
          const row = rows[r] || [];
          if (rowHasAnchor(row)) break;
          if (rowIsMostlyEmpty(row)) continue;

          const productName = clean(row[header.anchorCol]);
          if (!productName) {
            const maybeRecord = this.readRecordFromRow(row, header.colMap);
            const hasMaybeContent = this.fields.some((field) => hasText(maybeRecord[field]));
            if (hasMaybeContent) skippedRows.push({ row: r + 1, reason: '製作內容欄空白，但同列有主標/副標/素材資料，無法判斷要套哪個公版' });
            continue;
          }

          // V3.7 Parser 重構：所有公版名稱（HBN / HAN / DD Card / DDC ...）都共用同一套起點判斷。
          // 遇到公版名稱時，不再從公版名稱所在列開始讀；會先往上回溯最近的「主標」列，
          // 再由主標列往下建立該筆製作物，避免 DD Card / HBN 的主標被跳過。
          const quantity = qtyCol >= 0 ? Math.max(0, Math.floor(toNumber(row[qtyCol]))) : 0;
          const currentRecord = this.readRecordFromRow(row, header.colMap);
          const hasCurrentContent = this.fields.some((field) => hasText(currentRecord[field]));
          const isKnownTemplateName = !!this.findTemplateRuleForName(productName);
          // 擴充點：若某公版需要「一個製作物名稱底下有多筆記錄」的特殊解析模式
          // （例如舊版頭巾票券分流），可在該公版的 rules/*.rules.js 內註冊：
          //   window.TemplateRuleRegistry.register(family, {
          //     blockParser: ({ rows, header, rowIndex, nextHeaderRow, productName, quantity }) => {
          //       return { records: [...], templateType: 'custom' } 或 null（不處理則回傳null，繼續走一般解析）
          //     }
          //   });
          // AR / Seller BN / Mepage 屬特規 Parser；特規版位禁止回退共用 Parser。
          const blockParserFamily = this.findTemplateRuleForName(productName)?.family;
          const registeredBlockParser = blockParserFamily
            ? (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(blockParserFamily)?.blockParser
            : null;
          const specialParserOnly = window.SpecialBlockParserPolicy?.isSpecialOnlyPlacement?.(productName) === true;
          if (typeof registeredBlockParser === 'function') {
            const blockResult = registeredBlockParser({ rows, header, rowIndex: r, nextHeaderRow, productName, quantity });
            if (blockResult?.records?.length) {
              blocks.push({
                name: productName,
                headerRow: header.headerRow,
                startRow: r,
                quantity,
                records: blockResult.records,
                colMap: header.colMap,
                templateType: blockResult.templateType || 'custom',
              });
              continue;
            }
          }
          if (specialParserOnly) {
            const reason = typeof registeredBlockParser === 'function'
              ? '特規 Parser 沒有產生有效 Record，禁止回退共用 Parser'
              : '此版位只允許特規 Parser，但目前尚未註冊 Parser';
            skippedRows.push({ row: r + 1, name: productName, reason });
            warnings.push(`第 ${r + 1} 列「${productName}」${reason}`);
            continue;
          }

          const findNearestMainTitleRow = () => {
            for (let up = r; up > header.headerRow; up--) {
              const upRow = rows[up] || [];
              if (rowHasAnchor(upRow)) break;
              const upProductName = clean(upRow[header.anchorCol]);
              const upQty = qtyCol >= 0 ? toNumber(upRow[qtyCol]) : 0;

              // 如果往上遇到另一個有數量的製作物，就停止，避免跨到上一筆。
              if (up !== r && upProductName && upQty) break;

              const upRecord = this.readRecordFromRow(upRow, header.colMap);
              if (hasText(upRecord['主標'])) return up;
            }
            return r;
          };
          const recordStartRow = findNearestMainTitleRow();
          const hasBacktrackedMainTitle = recordStartRow !== r;

          // 避免把說明列或補充列誤當製作物：
          // 一般列需要有數量或同列內容；但已知公版名稱可接受「同列無內容」，只要上方可回溯到主標。
          if (!quantity && !hasCurrentContent && !(isKnownTemplateName && hasBacktrackedMainTitle)) {
            skippedRows.push({ row: r + 1, name: productName, reason: '沒有數量，也沒有主標/副標/警語/商品圖/CTA，且無法回溯到主標' });
            warnings.push(`第 ${r + 1} 列「${productName}」沒有數量，也沒有可套用欄位，已略過`);
            continue;
          }

          const takeCount = quantity || 9999;
          const records = [];
          let scannedRows = 0;

          for (let dr = recordStartRow; dr < nextHeaderRow && records.length < takeCount; dr++) {
            const dataRow = rows[dr] || [];
            if (rowHasAnchor(dataRow)) break;

            // 同一欄位區塊可能會連續列出多個製作物，並共用後續文案列。
            // 例如：第 89 列 HBN-C2C (DD card)、第 90 列 HBN-Mall，後面 91~110 是共用文案。
            // 讀 HBN-C2C 時不可把 HBN-Mall 那列也算進去；讀 HBN-Mall 時則保留自己的第一列。
            const rowProductName = clean(dataRow[header.anchorCol]);
            const rowQty = qtyCol >= 0 ? toNumber(dataRow[qtyCol]) : 0;
            const isOtherProductStart = dr !== r && rowProductName && rowQty;
            if (isOtherProductStart) {
              if (quantity) continue;
              break;
            }

            if (rowIsMostlyEmpty(dataRow)) {
              // 已開始讀取後遇到連續空白，就結束此製作物區塊，避免掃到下一個區塊的說明文字。
              if (records.length) break;
              continue;
            }

            const record = this.readRecordFromRow(dataRow, header.colMap);
            const hasAny = this.fields.some((field) => hasText(record[field]));
            if (hasAny) records.push(record);
            scannedRows += 1;

            // 沒有明確數量時，遇到下一個有名稱+數量的製作物就停止。
            if (!quantity && dr > r) {
              const nextName = clean(dataRow[header.anchorCol]);
              const nextQty = qtyCol >= 0 ? toNumber(dataRow[qtyCol]) : 0;
              if (nextName && nextQty) break;
            }

            // 保護：無數量時最多掃 80 列。
            if (!quantity && scannedRows >= 80) break;
          }

          if (records.length && quantity && records.length < quantity) {
            warnings.push(`第 ${r + 1} 列製作物「${productName}」數量為 ${quantity}，但只讀到 ${records.length} 筆有效資料`);
          }

          if (records.length) {
            blocks.push({
              name: productName,
              headerRow: header.headerRow,
              startRow: r,
              quantity,
              records,
              colMap: header.colMap,
            });
          } else {
            warnings.push(`第 ${r + 1} 列製作物「${productName}」沒有讀到主標/副標/警語/商品圖/CTA 資料`);
          }
        }
      }

      if (!headerCandidates.length && anchorCount) warnings.push('有找到「製作內容」，但沒有任何同列欄位可解析。');
      return { blocks, anchorCount, warnings, skippedRows };
    },


    // V1.0 開源版：頭巾票券專屬解析已移除。
    // 若未來某公版需要類似「工單固定欄位分流」的解析模式，
    resolveRecordTemplateRoutes(block = {}, record = {}) {
      const templateRule = this.findTemplateRuleForName(block.name);
      const registeredRules = templateRule?.family
        ? window.TemplateRuleRegistry?.getRules?.(templateRule.family)
        : null;
      if (typeof registeredRules?.resolveRecordTemplateRoutes === 'function') {
        const routes = registeredRules.resolveRecordTemplateRoutes({
          block,
          record,
          helpers: { normalizeRouteValue: this.normalizeRouteValue.bind(this), norm: this.norm.bind(this) },
        });
        if (Array.isArray(routes) && routes.length) return routes.filter(Boolean);
      }
      const single = this.resolveRecordTemplateRoute(block, record);
      return single ? [single] : [];
    },

    // 請透過 window.TemplateRuleRegistry.register(family, { resolveRecordTemplateRoute: fn }) 由該公版的 rules/*.rules.js 自行註冊。
    resolveRecordTemplateRoute(block = {}, record = {}) {
      const templateRule = this.findTemplateRuleForName(block.name);
      const registeredRules = templateRule?.family
        ? window.TemplateRuleRegistry?.getRules?.(templateRule.family)
        : null;
      if (typeof registeredRules?.resolveRecordTemplateRoute === 'function') {
        const route = registeredRules.resolveRecordTemplateRoute({
          block,
          record,
          helpers: {
            normalizeRouteValue: this.normalizeRouteValue.bind(this),
            norm: this.norm.bind(this),
          },
        });
        if (route) return route;
      }

      // 有明確 templateId、但找不到專屬規則時，才沿用 OM Wave 1 的相容路由。
      // 專屬規則必須優先，否則 Appier 等新公版即使已由自己的 sheetParser 解析，
      // 仍會在這裡被誤標為 om_wave1_subtitle，後續 hook 也會套用錯誤家族。
      const explicitTemplateId = String(record?.__templateId || '').trim();
      // 整合版：batch.explicitTemplateIdRoute＝none（MS）時不做 OM Wave1 相容路由。
      if (explicitTemplateId && flag('batch.explicitTemplateIdRoute', 'omWave1') === 'omWave1') {
        return {
          key: 'om_wave1_subtitle',
          family: 'om_wave1_subtitle',
          label: explicitTemplateId,
          templateId: explicitTemplateId,
          templateFile: `${explicitTemplateId}.json`,
          outputName: String(record.__outputName || '').trim(),
          outputPrefix: String(record.__media || explicitTemplateId).trim(),
        };
      }

      return null;
    },

    readRecordFromRow(row, colMap) {
      const record = {};
      for (const field of this.fields) {
        const c = colMap[field];
        record[field] = c === undefined ? '' : String(row?.[c] ?? '').trim();
      }

      // V3.6.5：支援 Excel 單格寫法，例如「主標：4/18 領早鳥$40」或「主標: 4/18 刷卡享88折」。
      // 舊版只吃「欄位標題在表頭、內容在同欄下一列」的結構；若 Excel 把欄名與內容放在同一格，
      // 就會造成 DDC/HBN 的主標沒有被套入。這裡會掃描整列並把冒號後的文字抽出來。
      const inlineAliasMap = [
        { field: '主標', aliases: ['主標', '主標題', 'title'] },
        { field: '副標', aliases: ['副標', '副標題', 'usp/副標', 'usp副標', 'usp', 'subtitle'] },
        { field: '警語', aliases: ['警語', '法務', '法務小字', 'legal'] },
        { field: '商品圖1', aliases: ['商品圖1', '商品圖一', 'productimage1'] },
        { field: '商品圖2', aliases: ['商品圖2', '商品圖二', 'productimage2'] },
        { field: '商品圖_左', aliases: ['商品圖_左', '商品圖左', '左商品圖'] },
        { field: '商品圖_中', aliases: ['商品圖_中', '商品圖中', '中商品圖'] },
        { field: '商品圖_右', aliases: ['商品圖_右', '商品圖右', '右商品圖'] },
        { field: 'CTA', aliases: ['cta', '按鈕', 'button'] },
        { field: '價格', aliases: ['價格', 'price'] },
        { field: '價格_左', aliases: ['價格_左', '價格左', 'leftprice'] },
        { field: '價格_中', aliases: ['價格_中', '價格中', 'middleprice', 'centerprice'] },
        { field: '價格_右', aliases: ['價格_右', '價格右', 'rightprice'] },
        { field: '文案_左', aliases: ['文案_左', '文案左', '左文案'] },
        { field: '文案_中', aliases: ['文案_中', '文案中', '中文案'] },
        { field: '文案_右', aliases: ['文案_右', '文案右', '右文案'] },
        { field: '版位', aliases: ['版位', 'placement', 'position'] },
      ];
      const cells = Array.isArray(row) ? row : [];
      cells.forEach((cell) => {
        const raw = String(cell ?? '').trim();
        if (!raw) return;
        const match = raw.match(/^([^:：]{1,32})\s*[:：]\s*([\s\S]+)$/);
        if (!match) return;
        const label = this.norm(match[1]);
        const value = String(match[2] || '').trim();
        if (!value) return;
        for (const item of inlineAliasMap) {
          if (item.aliases.some((alias) => label === this.norm(alias))) {
            record[item.field] = value;
            break;
          }
        }
      });

      return record;
    },

    ensureTemplatePool(templates = []) {
      return (templates || []).map((t) => ({ ...t, data: clone(t.data) }));
    },

    normalizeRouteValue(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/logo/gi, 'logo')
        .replace(/[\s\u00a0\u3000\t\r\n_\-()（）\[\]【】.]+/g, '')
        .replace(/[＿－—–]/g, '');
    },

    async ensureTemplateForRoute(route, templates = []) {
      if (!route || !route.templateId) return null;
      // Rule 已指定的正式 Template 只能從本次實際載入的公版池精準命中；
      // 禁止偷偷回頭 fetch 打包內的舊 JSON，否則使用者漏載新版公版時會被舊檔掩蓋。
      return this.findTemplateForRoute(route, templates).template;
    },

    findTemplateForRoute(route, templates = []) {
      if (!route?.templateId) return { template: null, reason: route?.missingReason || '路由缺少 templateId' };
      const normalize = (value) => window.RuntimePolicy?.normalizeTemplateIdentity?.(value) || this.normalizeTemplateIdentity(value);
      const wantedFile = route.templateFile ? normalize(route.templateFile) : '';
      const wantedId = normalize(route.templateId);
      const exact = (templates || []).filter((template) => {
        const fileIdentity = normalize(template.file || '');
        const ids = [template.name, template.data?.templateId, template.data?.canvas?.templateId, template.data?.source?.psdName]
          .map(normalize).filter(Boolean);
        return (wantedFile && fileIdentity === wantedFile) || ids.includes(wantedId);
      });
      if (exact.length === 1) return { template: exact[0], reason: '' };
      if (exact.length > 1) return { template: null, reason: `公版路由衝突：${route.templateId} 同時精準命中 ${exact.map((t) => t.file || t.name).join('、')}` };
      const loaded = (templates || []).map((t) => t.file || t.name || t.data?.templateId || '未命名公版').join('、') || '無';
      return { template: null, reason: `讀到 ${route.label || route.templateId}，但沒有精準載入 ${route.templateFile || route.templateId}。禁止使用相似公版 fallback。已載入：${loaded}` };
    },

    getTemplateMatchRules() {
      // 完全依賴 rules/*.rules.js 透過 window.TemplateRuleRegistry.register(family, { tokens, targets, label })
      // 註冊進來的關鍵字規則；沒有任何公版註冊時，這裡會是空陣列，代表目前無法從Excel製作物名稱比對到任何公版。
      return (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getMatchRules?.() || [];
    },

    findTemplateRuleForName(name) {
      if (!String(name || '').trim()) return null;
      try {
        const family = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.detectFamily?.([name], null);
        if (!family) return null;
        return this.getTemplateMatchRules().find((item) => item.family === family) || null;
      } catch (error) {
        console.error('[Rule Match]', error);
        throw error;
      }
    },

    findTemplateForName(name, templates) {
      let rule = null;
      try { rule = this.findTemplateRuleForName(name); }
      catch (error) { return { template: null, reason: error?.message || String(error) }; }
      if (!rule) {
        const loaded = (templates || []).map((t) => t.file || t.name || t.data?.templateId || '未命名公版').join('、') || '無';
        return { template: null, reason: `製作物名稱「${name}」沒有註冊 Rule Family。正式公版必須同時具備 Template + Rule + manifest。已載入：${loaded}` };
      }
      const normalize = (value) => window.RuntimePolicy?.normalizeTemplateIdentity?.(value) || this.normalizeTemplateIdentity(value);
      const targetIds = (rule.targets || []).map(normalize).filter(Boolean);
      const matches = (templates || []).filter((template) => {
        const ids = [template.file, template.name, template.data?.templateId, template.data?.canvas?.templateId].map(normalize).filter(Boolean);
        return targetIds.some((target) => ids.some((id) => id === target));
      });
      if (matches.length === 1) return { template: matches[0], reason: '' };
      if (!matches.length) {
        const loaded = (templates || []).map((t) => t.file || t.name || t.data?.templateId || '未命名公版').join('、') || '無';
        return { template: null, reason: `讀到 ${rule.label}，但沒有載入其 Rule targets 對應公版。已載入：${loaded}` };
      }
      return { template: null, reason: `${rule.label} 同時對應多個公版（${matches.map((t) => t.file || t.name).join('、')}），Rule 必須提供明確 Variant / Route。` };
    },

    normalizeTemplateIdentity(value) {
      return window.RuntimePolicy?.normalizeTemplateIdentity?.(value) || this.norm(value).replace(/^\d+[_\-\s]+/, '').replace(/[()（）\[\]【】\s_\-]+/g, '');
    },
    findTemplateByDirectName(name, templates) {
      // V0.9 正式公版不再使用 direct-name bypass；必須經 Rule Family 驗證。
      return null;
    },

    makeOutputPrefix(blockName, templateName) {
      // V1.0 開源版：輸出檔名前綴不再硬編碼任何舊公版名稱判斷，
      // 直接取公版名稱（或找不到公版名稱時取Excel製作物名稱）清理成安全檔名字元。
      return String(templateName || blockName || 'IMG').replace(/\.template\.json$/i, '').replace(/[^a-z0-9一-龥]+/ig, '_').replace(/^_+|_+$/g, '') || 'IMG';
    },

    resolveTemplateProductImageRule(template) {
      const rules = window.PriceRuleEngine?.getRules?.(template);
      const layouts = rules?.templateLayouts || {};
      const templateIds = [
        template?.templateId,
        template?.batchSourceName,
        template?.source?.psdName,
        AppState.templates?.[AppState.activeIndex]?.name,
        AppState.templates?.[AppState.activeIndex]?.file,
      ].filter(Boolean);

      for (const id of templateIds) {
        const direct = layouts[id];
        if (direct?.productImageBox) return direct;

        const normalized = window.PriceRuleEngine?.norm
          ? window.PriceRuleEngine.norm(id)
          : this.norm(id);
        const key = Object.keys(layouts).find((candidate) => {
          const candidateKey = window.PriceRuleEngine?.norm
            ? window.PriceRuleEngine.norm(candidate)
            : this.norm(candidate);
          return candidateKey === normalized;
        });
        if (key && layouts[key]?.productImageBox) return layouts[key];
      }

      return null;
    },

    isProductPlacementGuide(key, layer) {
      const name = String(layer?.psdName || layer?.name || key || '').trim();
      return name === 'P_範圍' || name === '_P_範圍';
    },

    getProductPlacementGuideBox(template) {
      const entry = Object.entries(template?.layers || {}).find(([key, layer]) => this.isProductPlacementGuide(key, layer));
      if (!entry) return null;
      const [key, layer] = entry;
      const box = window.Geometry?.getLayerBox?.(key, layer) || this.getProductImageBoxFromLayer(layer);
      if (!box) return null;
      return {
        ...box,
        targetWidth: Number(box.width || 0),
        targetHeight: Number(box.height || 0),
        maxTargetHeight: Number(box.height || 0),
        source: 'template-p-range',
      };
    },

    getProductImageBoxFromLayer(layer) {
      if (!layer) return null;
      const width = Number(layer.targetWidth || layer.width || 0);
      const height = Number(layer.maxTargetHeight || layer.targetHeight || layer.height || 0);
      if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return null;

      const x = Number.isFinite(Number(layer.x)) ? Number(layer.x) : Number(layer.centerX || 0) - width / 2;
      const y = Number.isFinite(Number(layer.y)) ? Number(layer.y) : Number(layer.centerY || 0) - height / 2;

      return {
        x,
        y,
        width,
        height,
        centerX: Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : x + width / 2,
        centerY: Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) : y + height / 2,
        targetWidth: width,
        targetHeight: height,
        maxTargetHeight: height,
      };
    },

    applyProductImageBox(layer, box, options = {}) {
      if (!layer || !box) return;
      const width = Number(box.targetWidth ?? box.width);
      const heightLimit = Number(box.maxTargetHeight ?? box.targetHeight ?? box.height);
      const x = Number.isFinite(Number(box.x)) ? Number(box.x) : Number(box.centerX || 0) - width / 2;
      const y = Number.isFinite(Number(box.y)) ? Number(box.y) : Number(box.centerY || 0) - heightLimit / 2;
      const centerX = Number.isFinite(Number(box.centerX)) ? Number(box.centerX) : x + width / 2;
      const centerY = Number.isFinite(Number(box.centerY)) ? Number(box.centerY) : y + heightLimit / 2;
      // 商品圖的縮放模式（是否「高度優先、不限寬」）現在直接讀取
      // rules/*.rules.js 的 productImageBox.sizingMode / widthLimitPolicy，
      // 不再用寫死的商品檔名清單判斷——rules 檔案才是唯一真相來源。
      const heightPriorityNoWidthLimit = options.heightPriorityNoWidthLimit !== undefined
        ? Boolean(options.heightPriorityNoWidthLimit)
        : (box.sizingMode === 'heightBased' || box.widthLimitPolicy === 'none');

      layer.x = x;
      layer.y = y;
      layer.width = width;
      layer.height = heightLimit;
      layer.centerX = centerX;
      layer.centerY = centerY;
      layer.keepAspectRatio = true;
      layer.sizingMode = heightPriorityNoWidthLimit ? 'heightBased' : 'containByPBox';
      layer.targetWidth = width;
      layer.targetHeight = heightLimit;
      layer.maxTargetHeight = heightLimit;

      if (heightPriorityNoWidthLimit) {
        delete layer.maxTargetWidth;
        layer.widthLimitPolicy = 'none';
        layer.productImageSizingRule = box.productImageSizingRule || 'heightPriorityNoWidthLimit';
      }
    },

    getTemplateRuleFamily(template) {
      return CapsuleRuleEngine.getTemplateFamily(template);
    },

    getTemplateRules(template) {
      const family = this.getTemplateRuleFamily(template);
      return (window.TemplateRuleManager || window.TemplateRuleRegistry)?.getRules?.(family) || {};
    },

    applyTemplateRuleHook(hookName, template, record, diagnostics = [], context = {}) {
      const rules = this.getTemplateRules(template);
      const hook = rules?.[hookName];
      if (typeof hook !== 'function') return null;

      // 批次 / All 模式下，每張圖都有自己的 project。
      // 舊版 rules/shared/template-rule-utils.js 可能仍讀 AppState.currentProject 判斷主副標顏色，
      // 因此呼叫任何公版 hook 時，暫時把 currentProject 切到該張圖所屬 project；
      // hook 完成後再還原，避免 4.18 暖身 / 4.18 正式 被目前 UI 選到的 4.17 直播日覆蓋顏色。
      const projectForTemplate = String(template?.batchProject || record?.__project || template?.batchRecord?.__project || '').trim();
      const shouldUseTemplateProject = projectForTemplate && projectForTemplate !== ALL_PROJECTS_VALUE;
      const previousProject = AppState.currentProject;
      if (shouldUseTemplateProject) AppState.currentProject = projectForTemplate;

      try {
        const result = hook({
          template,
          record,
          diagnostics,
          ...context,
          helpers: {
            round,
            findLayer: this.findLayer.bind(this),
            normalizeRecordText: this.normalizeRecordText.bind(this),
            norm: this.norm.bind(this),
            measureTextWidth: (layer) => CapsuleRuleEngine.measureTextWidth(layer, ctx),
            measureRenderedTextWidth: (layer) => Renderer.measureRenderedTextWidth(layer, ctx),
            measureRenderedTextInkBounds: (layer) => Renderer.measureRenderedTextInkBounds(layer, ctx),
          },
        });
        // （回饋：文字保留）afterApplyRecordToTemplate 在套版之外也會被單獨呼叫（切換縮圖、預覽刷新、縮圖 clone），
        // 規則可能重新把工單文字寫回圖層，所以手動文字覆寫要在這裡（hook 之後）再套一次。
        if (hookName === 'afterApplyRecordToTemplate') ManualTextOverrides.applyAll(template);
        return result;
      } finally {
        if (shouldUseTemplateProject) AppState.currentProject = previousProject;
      }
    },

    captureTemplateGeometry(template) {
      const props = [
        'x','y','width','height','centerX','centerY','rotation',
        'targetWidth','targetHeight','maxTargetHeight','sizingMode','fitMode','keepAspectRatio','productImageSizingRule','positioningMode',
        'fontSizePx','fontSizePt','lineHeight','lineHeightMultiplier','letterSpacing','align','styledTextVerticalAlign','textVerticalAlign','textBaselineReference',
        'fontFamily','fontWeight','fontStyle','textDecoration','textStyleRanges',
      ];
      const shapeProps = ['vectorPath','bezierPoints','geometry','pathBounds','cornerRadius'];
      const snapshot = {};
      Object.entries(template?.layers || {}).forEach(([key, layer]) => {
        const item = {};
        props.forEach((prop) => { if (layer?.[prop] !== undefined) item[prop] = clone(layer[prop]); });
        if (layer?.shape) {
          const shape = {};
          shapeProps.forEach((prop) => { if (layer.shape[prop] !== undefined) shape[prop] = clone(layer.shape[prop]); });
          if (Object.keys(shape).length) item.__shapeGeometry = shape;
        }
        snapshot[key] = item;
      });
      return snapshot;
    },

    restoreTemplateGeometry(template, snapshot) {
      if (!template?.layers || !snapshot) return;
      Object.entries(snapshot).forEach(([key, saved]) => {
        const layer = template.layers[key];
        if (!layer) return;
        Object.entries(saved || {}).forEach(([prop, value]) => {
          if (prop === '__shapeGeometry') {
            layer.shape = layer.shape || {};
            Object.entries(value || {}).forEach(([shapeProp, shapeValue]) => { layer.shape[shapeProp] = clone(shapeValue); });
          } else {
            layer[prop] = clone(value);
          }
        });
      });
    },

    normalizeRecordText(value) {
      return String(value ?? '')
        .replace(/_x000d_/gi, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/[\r\u0003\u2028\u2029]/g, '\n')
        .trim();
    },


    prepareDynamicProductLayers(template, record, diagnostics = []) {
      const folder = String(record?.__productFolder || '').trim();
      if (!folder) return [];

      const bucket = AssetStore.getBucket(folder);
      const imageNames = [...bucket.keys()]
        .filter((name) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name))
        .filter((name) => !/_KV_BG\./i.test(name))
        .sort((a, b) => a.localeCompare(b, 'zh-Hant', { numeric: true, sensitivity: 'base' }));

      const baseEntry = Object.entries(template?.layers || {}).find(([key, layer]) => {
        if (layer?.type !== 'image' || layer?.locked) return false;
        const label = this.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
        return label === 'p' || label.includes(this.norm('商品圖1')) || label.includes(this.norm('曝品')) || label.includes('product');
      });
      if (!baseEntry) {
        diagnostics.push({ field: '商品圖1', status: 'missing-layer', value: folder, target: '找不到 P 圖層' });
        return [];
      }

      const [baseKey, baseLayer] = baseEntry;
      const keepKeys = new Set([baseKey]);
      const layers = [baseLayer];
      let needsProductGridLayout = false;
      let assetSetChanged = false;

      const clearExactPlacementState = (layer) => {
        if (!layer) return;
        [
          'preserveExactSize', 'skipAutoScale', 'lockToEditedJson', 'positioningMode',
          'followProduct', 'disableAnchorSync', '_anchorDirty',
        ].forEach((field) => delete layer[field]);
      };

      imageNames.forEach((filename, index) => {
        let key = baseKey;
        let layer = baseLayer;
        let layerAssetChanged = false;
        if (index > 0) {
          const suffix = String(index + 1).padStart(2, '0');
          key = `P_${suffix}`;
          const existingLayer = template.layers?.[key];
          const sameExistingAsset = existingLayer
            && this.norm(existingLayer.assetFilename) === this.norm(filename);

          // 預覽刷新時沿用已存在的動態圖層，不能每次從 product 重 clone，否則 P_02/P_03
          // 的公版 preset 或使用者手動位置都會被洗掉。只有素材真的換了才建立新圖層。
          if (sameExistingAsset) {
            layer = existingLayer;
          } else {
            layer = clone(baseLayer);
            clearExactPlacementState(layer);
            layer.psdName = key;
            layer.name = key;
            template.layers[key] = layer;
            needsProductGridLayout = true;
            assetSetChanged = true;
            layerAssetChanged = true;
          }
          layers.push(layer);
        } else if (this.norm(layer.assetFilename) !== this.norm(filename)) {
          clearExactPlacementState(layer);
          assetSetChanged = true;
          layerAssetChanged = true;
        }
        keepKeys.add(key);
        layer.assetFilename = filename;
        layer.assetProject = folder;
        layer.hidden = false;
        // P_02/P_03... 是從 baseLayer clone 出來的，會連 smartAssetId 一起複製過去——但那是
        // baseLayer（另一張圖）的身分，不是這張圖自己的。素材檔名換了，身分就必須跟著重算，
        // 不然智慧素材同步會拿錯 key，變成這張圖的調整存到/讀到別張圖的設定裡。
        if (layerAssetChanged) delete layer.smartAssetId;
        diagnostics.push({ field: `商品圖${index + 1}`, status: 'ok', value: folder, filename, target: key });
      });

      // 動態建立圖層後必須同步 renderOrder；只寫入 template.layers 會造成
      // P_02 存在於 JSON，但 Renderer 與圖層清單完全看不到它。
      if (Array.isArray(template.renderOrder)) {
        template.renderOrder = template.renderOrder.filter((key) => !/^P_\d{2}$/.test(key));
        const baseIndex = template.renderOrder.indexOf(baseKey);
        const insertAt = baseIndex >= 0 ? baseIndex + 1 : template.renderOrder.length;
        const dynamicKeys = imageNames.slice(1).map((_, index) => `P_${String(index + 2).padStart(2, '0')}`);
        template.renderOrder.splice(insertAt, 0, ...dynamicKeys);
      }

      Object.keys(template.layers || {}).forEach((key) => {
        if (/^P_\d{2}$/.test(key) && !keepKeys.has(key)) {
          delete template.layers[key];
          assetSetChanged = true;
        }
      });

      if (!imageNames.length) {
        if (String(baseLayer.assetFilename || '').trim()) assetSetChanged = true;
        baseLayer.assetFilename = '';
        diagnostics.push({ field: '商品圖1', status: 'missing', value: folder, attempts: [`assets/${folder}/`] });
      }
      // 只有「新建立」的第二張以上商品圖才需要跑一次網格；既有 P_02/P_03 在預覽刷新時直接沿用。
      // 若公版 preset 已為該圖層提供精確座標，SmartAssetManager 會保留鎖定圖層、不讓網格覆寫。
      if (imageNames.length > 1 && needsProductGridLayout) template.__needsProductGridLayout = true;
      else delete template.__needsProductGridLayout;

      // 資料夾素材集合真的改變時，允許 after hook 依新的素材組合重新比對一次公版 preset。
      if (assetSetChanged) delete template.__appliedPlacementPresetKey;
      return layers;
    },


    applyRecordToTemplate(template, record, options = {}) {
      const diagnostics = [];
      // 沒有 skipExactLayout 代表新的工單首次套版；清除上一筆執行期標記，讓新資料重新比對 preset。
      // 預覽刷新會帶 skipExactLayout=true，保留此標記與使用者後續手動調整。
      if (!options.skipExactLayout) {
        delete template.__appliedPlacementPresetKey;
        // （暖正MS V0.5）新工單首次套版時清除上一筆 Smart Asset 初始幾何；預覽刷新則保留使用者編輯基準。
        delete template.__smartAssetInitialGeometry;
        Object.values(template.layers || {}).forEach((layer) => { if (layer) delete layer.__smartAssetBaseline; });
      }
      const normalizedRecord = { ...(record || {}) };
      const projectForTemplate = String(template?.batchProject || normalizedRecord.__project || '').trim();
      if (projectForTemplate && !normalizedRecord.__project) normalizedRecord.__project = projectForTemplate;
      template.batchRecord = normalizedRecord;
      record = normalizedRecord;
      const templatePrefix = this.getTemplateAssetPrefix(template);
      const lookupProject = template?.batchProject || template?.batchRecord?.__project || (AppState.currentProject && AppState.currentProject !== ALL_PROJECTS_VALUE ? AppState.currentProject : '');
      this.applyTemplateRuleHook('beforeApplyRecordToTemplate', template, record, diagnostics, options);

      const textMap = [
        { field: '票券案型', words: ['票券_案型', '票券案型', '案型', 'tickettype'] },
        { field: '主標', words: ['主標', '主標題', 'title'] },
        ...(flag('batch.coreSubtitleTextMap', false) ? [{ field: '副標', words: ['副標', '副標題', 'subtitle'] }] : []),
        { field: '文案', words: ['文案', 'dpa文案'] },
        { field: '警語', words: ['警語', '法務', '法務小字', 'legal'] },
        // CTA 只有在模板真的有 CTA/按鈕文字圖層時才套用；不可 fallback 到第一個文字圖層，避免蓋掉主標。
        { field: 'CTA', words: ['cta', '按鈕', 'button', '立即領'] },
      ];
      for (const item of textMap) {
        const value = this.normalizeRecordText(record[item.field]);
        if (!value) continue;
        const layer = this.findLayer(template, 'text', item.words, false);
        if (layer) {
          if (item.field === '主標' && /\(\s*logo\s*\)|（\s*logo\s*）/i.test(value)) {
            layer.hidden = true;
            diagnostics.push({ field: item.field, status: 'ok', value, target: `${layer.psdName || ''} 隱藏` });
          } else {
            layer.text = value;
            layer.hidden = false;
            diagnostics.push({ field: item.field, status: 'ok', value, target: layer.psdName || '' });
          }
        }
      }

      // 主標題／副標題的對齊方式（置左/置中/置右）完全由該公版JSON裡每個文字圖層自己的 align 欄位決定，
      // app.core.js 不會針對任何特定公版名稱寫死對齊規則——JSON是主要資料來源，
      // 如果之後要用程式強制覆寫對齊，應該寫在該公版自己的 rules/*.rules.js 裡（例如透過
      // afterApplyRecordToTemplate hook），不要回頭改這個引擎檔案。

      const dynamicProductLayers = this.prepareDynamicProductLayers(template, record, diagnostics);
      const img1 = String(record['商品圖1'] || '').trim();
      const img2 = String(record['商品圖2'] || '').trim();
      const ctaAsset = String(record['CTA'] || '').trim();

      // CTA 的「文字 / 圖片」語意由各 Rule 自己宣告。
      // explicit：只有 Rule 白名單中的值才嘗試圖片；其餘直接保留文字 CTA。
      // rule-managed：該 Rule 完整接管 CTA（例如頭巾多狀態），Core 不再碰既有 CTA 圖層。
      // 未宣告 policy 的舊 Rule 維持原本 legacy 行為，避免影響尚未重構的版位。
      const templateRules = this.getTemplateRules(template);
      const ctaPolicy = templateRules?.ctaPolicy || null;
      const ctaPolicyMode = String(ctaPolicy?.mode || '').trim().toLowerCase();
      const normalizeCtaValue = (value) => this.norm(String(value || '').normalize('NFKC'));
      const explicitImageValues = Array.isArray(ctaPolicy?.imageValues) ? ctaPolicy.imageValues.map(normalizeCtaValue) : [];
      const shouldTryExplicitImage = ctaPolicyMode === 'explicit' && !!ctaAsset && explicitImageValues.includes(normalizeCtaValue(ctaAsset));
      const shouldUseLegacyCta = !ctaPolicyMode;
      const ctaLayer = this.findLayer(template, 'image', ['cta', '按鈕', 'button'], false);

      if (ctaPolicyMode !== 'rule-managed' && (shouldTryExplicitImage || shouldUseLegacyCta)) {
        const sourceCtaName = shouldTryExplicitImage
          ? ctaAsset
          : (ctaAsset || String(ctaLayer?.assetFilename || '').trim());
        if (sourceCtaName && ctaLayer) {
          const ctaLookupProject = String(ctaPolicy?.templateAssetFolder || lookupProject || '').trim();
          const match = this.findAssetFilename(sourceCtaName, { prefix: templatePrefix, project: ctaLookupProject, template, layer: ctaLayer, layerKey: 'CTA' });
          if (match.found) {
            ctaLayer.assetFilename = match.lookupName || match.filename;
            ctaLayer.assetProject = match.folder || ctaLookupProject || '';
            ctaLayer.hidden = false;
            diagnostics.push({ field: 'CTA', status: 'ok', value: sourceCtaName, filename: match.filename });
          } else if (ctaPolicyMode === 'explicit' && ctaPolicy?.fallbackToText !== false) {
            ctaLayer.hidden = true;
            diagnostics.push({ field: 'CTA', status: 'warning', value: sourceCtaName, target: '圖片 CTA 素材不存在，已退回文字 CTA', attempts: match.attempts });
          } else {
            ctaLayer.assetFilename = '';
            diagnostics.push({ field: 'CTA', status: 'missing', value: sourceCtaName, attempts: match.attempts });
          }
        } else if (sourceCtaName && !ctaLayer) {
          if (ctaPolicyMode === 'explicit' && ctaPolicy?.fallbackToText !== false) {
            diagnostics.push({ field: 'CTA', status: 'warning', value: sourceCtaName, target: '找不到圖片 CTA 圖層，已退回文字 CTA' });
          } else {
            diagnostics.push({ field: 'CTA', status: 'missing-layer', value: sourceCtaName });
          }
        }
      }

      // LOGO 圖層套用：不在引擎裡寫死，改由每個公版自己的 rules/*.rules.js 透過
      // afterApplyRecordToTemplate hook 呼叫 TemplateRuleUtils 裡的共用/自訂函式處理
      // （範例寫法見 rules/shared/template-rule-utils.js 的說明註解）。

      const productLayers = dynamicProductLayers.length
        ? dynamicProductLayers
        : Object.entries(template.layers || {})
          .filter(([key, layer]) => {
            if (layer.type !== 'image' || layer.locked) return false;
            const label = this.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
            const isBackground = label.includes('bg') || label.includes(this.norm('背景')) || label.includes('kvbg');
            const isCta = label.includes('cta') || label.includes(this.norm('按鈕')) || label.includes('button');
            const isLogo = label.includes('logo');
            return !isBackground && !isCta && !isLogo;
          })
          .sort(([keyA, layerA], [keyB, layerB]) => {
            const score = ([key, layer]) => {
              const label = this.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
              if (label.includes('product') || label.includes(this.norm('商品圖1')) || label.includes(this.norm('曝品')) || label === 'p') return 0;
              if (label.includes(this.norm('商品圖2'))) return 1;
              return 2;
            };
            return score([keyA, layerA]) - score([keyB, layerB]);
          })
          .map(([, layer]) => layer);

      const applyImage = (layer, rawValue, field) => {
        if (!layer || !rawValue) return;
        const previousAssetFilename = String(layer.assetFilename || '').trim();
        const manualUploadMode = flag('batch.missingProductAssetMode', 'clear') === 'manualUpload';
        let match;
        let lookupError = null;
        try {
          match = this.findAssetFilename(rawValue, { prefix: templatePrefix, project: lookupProject, layer, layerKey: field });
        } catch (error) {
          // （暖正MS V0.5）manualUpload 模式下查找歧義不中斷整張製作物，改留商品框供手動補檔。
          if (!manualUploadMode) throw error;
          lookupError = error;
          match = { found: false, filename: '', lookupName: '', folder: '', attempts: [] };
        }
        if (match.found) {
          layer.assetFilename = match.lookupName || match.filename;
          if (manualUploadMode) {
            delete layer.__manualUploadRequired;
            delete layer.__manualUploadField;
            delete layer.__manualUploadLabel;
            delete layer.__missingRequestedAsset;
            delete layer.__assetLookupError;
            layer.__assetMissing = false;
          }
          layer.assetProject = match.folder || lookupProject || '';
          layer.logicalAssetKey = window.RuntimePolicy?.normalizeLogicalAssetKey?.(rawValue) || this.normalizeAssetKey(rawValue);
          const familyId = template?.ruleFamily || template?.sheetTemplateRoute?.family || CapsuleRuleEngine.getTemplateFamily(template);
          const familyConfig = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.get?.(familyId);
          const groupResolver = familyConfig?.rules?.resolveSmartAssetGroup || familyConfig?.resolveSmartAssetGroup;
          const explicitGroup = typeof groupResolver === 'function'
            ? groupResolver({ template, record, layer, logicalAssetKey: layer.logicalAssetKey, field })
            : (familyConfig?.smartAssetGroup || '');
          layer.smartAssetGroup = explicitGroup ? (window.RuntimePolicy?.normalizeSmartAssetGroup?.(explicitGroup) || String(explicitGroup)) : '';
          // 全域商品圖邏輯：
          // 1) rules/*.js 有 productImageBox 時，使用該筆規則定義的絕對 P 框
          //    （框的 sizingMode / widthLimitPolicy 也是 rules 檔案裡的資料，
          //    applyProductImageBox 會直接讀取，不再靠寫死的商品檔名清單判斷）。
          // 2) 沒有 productImageBox 時，使用模板原本 P 圖層的 x/y/width/height 作為全域 P 框。
          // 3) 實際渲染時一律先符合 P 寬度；若高度超過 P 高度，改以高度符合，並置中 P 框。
          const placementGuideBox = this.getProductPlacementGuideBox(template);
          const templateRule = this.resolveTemplateProductImageRule(template);
          const box = placementGuideBox || templateRule?.productImageBox || this.getProductImageBoxFromLayer(layer);
          const sameAsset = previousAssetFilename
            && this.norm(previousAssetFilename) === this.norm(match.filename);
          const hasLockedPresetGeometry = layer.lockToEditedJson === true
            || layer.positioningMode === 'absolute-edited-json';
          const preserveCurrentGeometry = options.preserveProductGeometry === true
            && (sameAsset || hasLockedPresetGeometry);
          if (box && !preserveCurrentGeometry) this.applyProductImageBox(layer, box);
          layer.role = 'product';
          layer.smartAssetId = window.SmartAssetManager?.makeAssetId?.(layer.assetFilename, { folder: layer.assetProject, logicalAssetKey: layer.logicalAssetKey, smartAssetGroup: layer.smartAssetGroup, template, layer }) || layer.smartAssetId || '';
          diagnostics.push({ field, status: 'ok', value: rawValue, filename: match.filename, sizingRule: box?.source || box?.sizingMode });
        } else if (manualUploadMode) {
          // （暖正MS V0.5）動態商品 / 曝品素材缺失時不可讓整張製作物失敗。
          // 保留 JSON / Rule 已算好的商品框，讓使用者直接在該框點擊或拖拉圖片補檔。
          layer.assetFilename = '';
          layer.assetProject = '';
          layer.role = 'product';
          layer.hidden = false;
          layer.__assetMissing = false;
          layer.__manualUploadRequired = true;
          layer.__manualUploadField = field;
          layer.__manualUploadLabel = '+上傳素材';
          layer.__missingRequestedAsset = String(rawValue || '').trim();
          layer.__assetLookupError = lookupError?.message || '';
          layer.logicalAssetKey = window.RuntimePolicy?.normalizeLogicalAssetKey?.(rawValue) || this.normalizeAssetKey(rawValue);
          delete layer.smartAssetId;
          diagnostics.push({
            field,
            status: 'warning',
            value: rawValue,
            target: '素材未找到，保留商品框供手動上傳',
            reason: lookupError?.message || '素材不存在',
            attempts: match.attempts || [],
          });
        } else {
          layer.assetFilename = '';
          diagnostics.push({ field, status: 'missing', value: rawValue, attempts: match.attempts });
        }
      };
      // 商品圖套用 productImageBox 後，更新所有 price layer 的 anchor.baseBox
      // 確保連動計算以新商品圖位置為基準
      const syncPriceAnchorsToCurrentProduct = () => {
        const anchorKey = window.PriceCouponManager?.findAnchorLayerKey?.(template);
        if (!anchorKey) return;
        const anchorLayer = template.layers?.[anchorKey];
        if (!anchorLayer) return;
        const currentBox = window.Geometry?.getLayerBox?.(anchorKey, anchorLayer);
        if (!currentBox) return;
        Object.values(template.layers || {}).forEach((priceLayer) => {
          if (priceLayer?.source === 'auto_price_v2' && priceLayer.anchor?.layerKey === anchorKey) {
            priceLayer.anchor.baseBox = JSON.parse(JSON.stringify(currentBox));
          }
        });
      };

      // 單商品圖版位時，優先使用「商品圖2」欄位（若有填寫），否則才用「商品圖1」。
      // 若你的公版需要「一律只用商品圖1」這種例外規則，
      // 建議在該公版的 rules/*.rules.js 透過 beforeApplyRecordToTemplate hook 自行覆寫，不需要在 app.core.js 內寫死家族判斷。
      if (dynamicProductLayers.length) {
        // banner 資料夾模式已在 prepareDynamicProductLayers() 完成素材套用。
      } else if (productLayers.length === 1) {
        const asset = img2 || img1;
        if (asset) applyImage(productLayers[0], asset, !img2 ? '商品圖1' : '商品圖2');
        else if (String(productLayers[0].assetFilename || '').trim() === 'P') productLayers[0].assetFilename = '';
      } else {
        applyImage(productLayers[0], img1, '商品圖1');
        applyImage(productLayers[1], img2, '商品圖2');
        productLayers.forEach((layer) => {
          if (String(layer?.assetFilename || '').trim() === 'P') layer.assetFilename = '';
        });
      }

      syncPriceAnchorsToCurrentProduct();
      const priceKeys = PriceCouponManager.apply(template, record);

      // 第6/29/50/51題：edited JSON 的 Preset 是所有正式圖層的初始幾何基準；
      // 只在首次套版/明確 reset 時套用，之後才允許該 Rule 的 Dynamic Layout hook 做二次計算。
      const presetEngine = flag('batch.placementPreset', true) ? window.WarmupPlacementPresetEngine : null;
      const presetFound = presetEngine?.hasPreset?.(template, record) === true;
      const family = template?.ruleFamily || template?.sheetTemplateRoute?.family || CapsuleRuleEngine.getTemplateFamily(template);
      const familyConfig = (window.TemplateRuleManager || window.TemplateRuleRegistry)?.get?.(family);
      if (!options.skipExactLayout && presetEngine) {
        if (presetFound) presetEngine.apply({ template, record, force: false });
        else if (familyConfig && familyConfig.legacyPresetOptional !== true) {
          throw new Error(`公版初始化資料不完整：${template?.sheetTemplateRoute?.sourceTemplateId || template?.templateId || family} 找不到 Preset（備註No=${record?.__備註No || '未提供'}）`);
        }
      }
      // Preset 是固定幾何的唯一基準。只有 Rule 明確宣告 dynamicLayout:true 時，
      // after-hook / LayoutRuleEngine 才能在 Preset 後二次改幾何；一般 Rule 仍可改內容、顯示、素材與顏色。
      const allowDynamicGeometry = !presetFound || familyConfig?.dynamicLayout === true;
      const fixedGeometrySnapshot = presetFound && !allowDynamicGeometry ? this.captureTemplateGeometry(template) : null;
      this.applyTemplateRuleHook('afterApplyRecordToTemplate', template, record, diagnostics, options);
      if (fixedGeometrySnapshot) this.restoreTemplateGeometry(template, fixedGeometrySnapshot);
      // 全公版非價格文字標準：沿用 HBN / POPUP 的 82% 符號規則。
      // 必須在 LayoutRuleEngine 前套用，動態寬度量測才會使用真正可見的字寬；價格層由 SPTextStandard 自動排除。
      window.SPTextStandard?.applyTemplateNonPriceText?.(template);
      // 整合版：batch.smartAssetApplyPhase 決定 SmartAssetManager.applyTemplate 在 Layout 之前（正式BN）或之後（MS）。
      const smartAssetPhase = flag('batch.smartAssetApplyPhase', 'beforeLayout');
      if (smartAssetPhase === 'beforeLayout') window.SmartAssetManager?.applyTemplate?.(template);
      if (allowDynamicGeometry) LayoutRuleEngine.apply(template);
      if (smartAssetPhase === 'afterLayout') window.SmartAssetManager?.applyTemplate?.(template);
      {
        const appliedPriceText = String(record['價格'] || record['價格_左'] || '').trim();
        const appliedPriceField = String(record['價格'] || '').trim() ? '價格' : '價格_左';
        if (priceKeys.length) diagnostics.push({ field: appliedPriceField, status: 'ok', value: appliedPriceText, target: priceKeys.join('、') });
        else if (appliedPriceText) diagnostics.push({ field: appliedPriceField, status: 'missing-layer', value: appliedPriceText, target: '找不到商品圖1錨點或價格規則' });
      }

      // （整合版 5.3）使用者手動清除／替換過的圖層，最後套回，蓋過工單與規則重算的結果。沒有手動紀錄時不做事。
      ManualAssetUpload.applyOverrides(template);
      // （整合版 5.4）手動指定／換圖後重判的票券顏色也在最後套回。沒有紀錄時不做事。
      window.CouponControls?.applyOverrides?.(template);
      // （回饋：文字保留）套回使用者的手動文字調整；基線等下一次主畫布重繪、Layout 跑完再記（見 Renderer.render）。
      ManualTextOverrides.applyAll(template);
      ManualTextOverrides.markBaselinePending(template);
      template.batchDiagnostics = diagnostics;
    },

    findLayer(template, type, words, allowFallback = false) {
      const normWords = words.map((word) => this.norm(word));
      const entries = Object.entries(template.layers || {});
      let found = entries.find(([key, layer]) => layer.type === type && normWords.some((word) => this.norm(`${key} ${layer.psdName || ''} ${layer.role || ''}`).includes(word)));
      if (found) return found[1];
      if (!allowFallback) return null;
      found = entries.find(([, layer]) => layer.type === type);
      return found ? found[1] : null;
    },

    getTemplateAssetPrefix(template) {
      const label = this.norm(`${template?.canvas?.templateId || ''} ${template?.templateId || ''} ${template?.source?.psdName || ''}`);
      // V1.0 開源版：不再硬編碼任何舊公版前綴。找不到已知前綴時回傳空字串，
      // 由呼叫端 fallback 使用 templateId 本身作為輸出檔名前綴。
      return '';
    },

    normalizeAssetKey(value) {
      return String(value || '')
        .replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[\s\u00a0\u3000\t\r\n]+/g, '')
        .replace(/[\-_()（）\[\]【】.]/g, '');
    },

    findAssetFilename(name, options = {}) {
      const raw = String(name || '').trim();
      if (!raw) return { found: false, filename: '', lookupName: '', folder: '', attempts: [] };
      const role = classifyAssetRole({ layer: options.layer, layerKey: options.layerKey || options.field || '', filename: raw });
      const folder = TemplateLoader.resolveAssetLookupProject(options.template || AppState.template, { project: options.project });
      const result = AssetLookup.match(raw, { folder, role, prefix: options.prefix || '', allowFuzzy: options.allowFuzzy !== false });
      return {
        found: result.found,
        filename: result.filename || '',
        lookupName: result.lookupName || result.filename || '',
        folder: result.folder || '',
        attempts: result.attempts || [],
      };
    },

    resolveAssetFilename(name, options = {}) {
      const match = this.findAssetFilename(name, options);
      return match.found ? match.filename : String(name || '').trim();
    },

    getBatchGroupTitle(item) {
      const raw = String(item?.data?.batchSourceName || item?.batchRecord?.__sourceName || item?.name || '').trim();
      const normalized = raw.replace(/[_\-]+\d+$/i, '').replace(/\s+/g, ' ').trim();
      return normalized || '未分類';
    },

    groupBatchItemsByTemplate(entries = []) {
      const groups = [];
      const map = new Map();
      entries.forEach((entry, fallbackIndex) => {
        const item = entry?.item || entry;
        const index = Number.isInteger(entry?.index) ? entry.index : fallbackIndex;
        const title = this.getBatchGroupTitle(item);
        const key = title.toLowerCase().replace(/[^a-z0-9一-龥]+/ig, '_') || 'group';
        if (!map.has(key)) {
          const group = { key, title, items: [] };
          map.set(key, group);
          groups.push(group);
          if (!AppState.batchGroupsOpen) AppState.batchGroupsOpen = {};
          if (!(key in AppState.batchGroupsOpen)) AppState.batchGroupsOpen[key] = false;
        }
        map.get(key).items.push({ item, index });
      });
      return groups;
    },

    toggleBatchGroup(key) {
      if (!key) return;
      if (!AppState.batchGroupsOpen) AppState.batchGroupsOpen = {};
      AppState.batchGroupsOpen[key] = !AppState.batchGroupsOpen[key];
      this.renderBatchUI();
    },

    renderBatchUI() {
      if (DOM.batchStatus) {
        const ok = AppState.batchItems?.length || 0;
        const fail = AppState.unmatchedBatchItems?.length || 0;
        const diag = AppState.batchDiagnostics;
        DOM.batchStatus.textContent = diag
          ? `已產生 ${ok} 張；未匹配/略過 ${fail} 筆。解析到 ${diag.parsedBlockCount || 0} 個製作物、${diag.recordCount || 0} 筆資料。`
          : `已產生 ${ok} 張；未匹配公版 ${fail} 筆。下載時只會輸出右側批次預覽已勾選縮圖。`;
      }
      if (DOM.batchItemList) {
        const listSource = (AppState.batchItems && AppState.batchItems.length) ? TemplateFilter.getVisibleEntries(AppState.templates) : [];
        const groups = this.groupBatchItemsByTemplate(listSource);
        DOM.batchItemList.innerHTML = groups.map((group) => {
          const isOpen = !!AppState.batchGroupsOpen?.[group.key];
          const selectedCount = group.items.filter(({ item }) => item.visible).length;
          const warningCount = group.items.filter(({ item }) => (item.data?.batchDiagnostics || []).some((d) => String(d.status || '').startsWith('missing') || d.status === 'warning')).length;
          const rows = group.items.map(({ item, index }) => {
            const missing = (item.data?.batchDiagnostics || []).filter((d) => String(d.status || '').startsWith('missing') || d.status === 'warning');
            const ok = (item.data?.batchDiagnostics || []).filter((d) => d.status === 'ok');
            const badge = missing.length ? `⚠ ${missing.map((d) => this.escape(d.field)).join('、')}` : (ok.length ? '✓ 素材已檢查' : '');
            return `
              <label class="batch-item ${index === AppState.activeIndex ? 'active' : ''} ${missing.length ? 'has-warning' : ''}" data-index="${index}">
                <input type="checkbox" ${item.visible ? 'checked' : ''} />
                <span>${this.escape(item.name)}${badge ? `<small>${badge}</small>` : ''}</span>
              </label>
            `;
          }).join('');
          return `
            <div class="batch-group ${isOpen ? 'open' : 'collapsed'}" data-group-key="${this.escape(group.key)}">
              <button type="button" class="batch-group-header" data-group-key="${this.escape(group.key)}" aria-expanded="${isOpen ? 'true' : 'false'}">
                <span class="batch-group-icon">${isOpen ? '⌄' : '⌃'}</span>
                <span class="batch-group-title">${this.escape(group.title)}</span>
                <small>${selectedCount}/${group.items.length} 已選${warningCount ? ` · ${warningCount} 警告` : ''}</small>
              </button>
              <div class="batch-group-body">${isOpen ? rows : ''}</div>
            </div>
          `;
        }).join('');
      }
      if (DOM.unmatchedBox) {
        const unmatched = AppState.unmatchedBatchItems || [];
        const diag = AppState.batchDiagnostics;
        const assetIssues = (AppState.templates || [])
          .map((item) => ({ name: item.name, missing: (item.data?.batchDiagnostics || []).filter((d) => String(d.status || '').startsWith('missing') || d.status === 'warning') }))
          .filter((item) => item.missing.length);
        const assetHtml = assetIssues.length ? `
          <div class="batch-diagnostics">
            <strong>素材檢查</strong>
            ${assetIssues.slice(0, 20).map((item) => `<div>⚠ ${this.escape(item.name)}：${item.missing.map((d) => `${this.escape(d.field)}「${this.escape(d.value || '')}」${d.target ? `（${this.escape(d.target)}）` : ''}`).join('、')}</div>`).join('')}
            ${assetIssues.length > 20 ? `<div>另有 ${assetIssues.length - 20} 筆素材警告...</div>` : ''}
          </div>` : '';
        const diagHtml = diag ? `
          <div class="batch-diagnostics">
            <strong>解析診斷</strong>
            <div>分頁：${this.escape(diag.sheetName || '')}</div>
            <div>製作內容標記：${diag.anchorCount || 0} 個</div>
            <div>製作物區塊：${diag.parsedBlockCount || 0} 個</div>
            <div>資料筆數：${diag.recordCount || 0} 筆</div>
            <div>目前載入公版：${this.escape((diag.sourceTemplateNames || []).join('、') || '無')}</div>
            ${(diag.warnings || []).map((msg) => `<div>⚠ ${this.escape(msg)}</div>`).join('')}
          </div>` : '';
        DOM.unmatchedBox.classList.toggle('hidden', !unmatched.length && !diagHtml && !assetHtml);
        DOM.unmatchedBox.innerHTML = `${unmatched.length ? `<strong>⚠ 未匹配 / 略過</strong>${unmatched.map((item) => `<div>${this.escape(item.name)}：${this.escape(item.reason)}</div>`).join('')}` : ''}${assetHtml}${diagHtml}`;
      }
      const filteredCount = TemplateFilter.getVisibleEntries().length;
      DOM.batchPreviewPanel?.classList.toggle('hidden', !(AppState.batchItems || []).length || !filteredCount);
      document.querySelector('.canvas-shell')?.classList.toggle('batch-mode', !!(AppState.batchItems || []).length && !!filteredCount);
    },

    async selectGenerated(index) {
      if (!AppState.templates[index]) return;
      // 第41/43題：先把原圖未完成的編輯正式收尾，再切換。
      TextEditor.commit();
      Interaction.finalizeActiveTransform?.();
      const revision = ++AppState.selectionRevision;
      AppState.activeIndex = index;
      AppState.template = AppState.templates[index].data;
      AppState.selectedLayers = [];
      AppState.hoverLayer = null;
      try {
        const images = await TemplateLoader.loadImagesForTemplate(AppState.template, { project: AppState.templates[index].project });
        if (revision !== AppState.selectionRevision || AppState.activeIndex !== index) return;
        AppState.images = images;
      } catch (error) {
        if (revision !== AppState.selectionRevision) return;
        console.warn('[Batch] 選取製作物圖片載入逾時或失敗，仍繼續渲染:', error);
      }
      if (revision !== AppState.selectionRevision || AppState.activeIndex !== index) return;
      // 第42題：切換本身只載入目前正式狀態，不再重跑 Rule/Price/SmartAsset 幾何。
      App.sync();
      this.renderBatchUI();
      this.markActiveThumb();
    },

    toggleGenerated(index, checked) {
      if (!AppState.templates[index]) return;
      AppState.templates[index].visible = checked;
      TemplateList.render();
      this.renderBatchUI();
      this.markActiveThumb();
    },

    selectAllGenerated(checked = true) {
      TemplateFilter.getVisibleEntries().forEach(({ item }) => { item.visible = checked; });
      TemplateList.render();
      this.renderBatchUI();
      this.markActiveThumb();
    },

    async clearBatch() {
      TextEditor.commit();
      Interaction.finalizeActiveTransform?.();
      ++AppState.selectionRevision;
      HistoryManager.clear();
      window.SmartAssetManager?.resetSession?.();
      if (!AppState.sourceTemplates?.length) return;
      AppState.templates = AppState.sourceTemplates.map((t) => ({ ...t, data: clone(t.data), visible: true }));
      AppState.sourceTemplates = null;
      AppState.batchItems = [];
      AppState.batchGroupsOpen = {};
      AppState.unmatchedBatchItems = [];
      AppState.batchMode = false;
      AppState.activeIndex = 0;
      AppState.template = AppState.templates[0]?.data || null;
      AppState.selectedLayers = [];
      AppState.hoverLayer = null;
      if (DOM.batchPreviewGrid) DOM.batchPreviewGrid.innerHTML = '';
      await TemplateLoader.loadImagesForActiveTemplate();
      App.sync();
      this.renderBatchUI();
      if (DOM.batchStatus) DOM.batchStatus.textContent = '已清除批次結果，回到原本公版清單。';
    },

    renderPreviewPlaceholders() {
      if (!DOM.batchPreviewGrid) return;
      const entries = TemplateFilter.getVisibleEntries();
      const items = entries.map(({ item }) => item);
      DOM.batchPreviewPanel?.classList.toggle('hidden', !items.length);
      document.querySelector('.canvas-shell')?.classList.toggle('batch-mode', !!items.length);
      DOM.batchPreviewGrid.innerHTML = entries.map(({ item, index }) => {
        const itemName = item.name || `Item ${index + 1}`;
        return `
          <button class="batch-thumb ${index === AppState.activeIndex ? 'active' : ''} ${item.visible ? '' : 'is-unchecked'} thumb-pending" data-index="${index}">
            <input class="batch-thumb-check" type="checkbox" title="勾選下載此圖" ${item.visible ? 'checked' : ''}>
            <div class="batch-thumb-placeholder">${this.escape(itemName)}</div>
            <small>${this.escape(itemName)}</small>
          </button>
        `;
      }).join('');
    },

    waitForPreviewFrame() {
      return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    },

    // V0.9：預覽/匯出/素材重載都只能讀取正式 Template 的 snapshot；
    // 不再保留任何「為了預覽而重新套 Excel / Rule / Price / Layout」的 mutating helper。

    // V2.7：拿掉 refreshThumbsForIndexes()。這個函式雖然加了世代計數器互斥、每一步檢查是否
    // 要中止，但本質上還是「暫時把 AppState.template 換成別的版位，await 圖片載入完才換回來」
    // 這個風險模式——只要使用者的滑鼠點擊/放開剛好落在 await 的空窗期，就會作用在被暫時換走
    // 的那個版位上，看起來像「跳版位」。這種背景搶佔全域渲染狀態的做法，用再多時間點檢查
    // 都沒辦法真正堵死這個競態視窗。同步後的縮圖刷新，改成純粹在 DOM 上標記「待更新」
    // （smart-asset-manager.js 的 markThumbsStale()，只切換 CSS class，完全不碰 AppState），
    // 縮圖實際重繪交給使用者自己觸發的「重新整理批次預覽」（那條路徑本來就有 Loading Overlay
    // 擋住互動，是安全的）。

    // 只針對「被跨版位同步影響到的幾個版位」重新產生縮圖，不是整批重新跑一次。
    // 這個版本改用 renderThumbnailForTemplate()（純函式），全程不讀寫 AppState.template /
    // activeIndex / images，所以不需要世代計數器互斥、也不需要檢查使用者是否正在拖曳中——
    // 因為它從頭到尾都不會去搶「目前使用中的版位」這個全域狀態，跟使用者當下的操作
    // 完全是兩件獨立的事，不可能互相干擾。
    async refreshPreviewIndexes(indexes, options = {}) {
      if (!DOM.batchPreviewGrid || !indexes?.length) return;
      for (const index of indexes) {
        const item = AppState.templates?.[index];
        if (!item) continue;
        try {
          const url = await this.renderThumbnailForTemplate(item.data, { project: item.project });
          const img = DOM.batchPreviewGrid.querySelector(`.batch-thumb[data-index="${index}"] img`);
          if (img) img.src = url;
          DOM.batchPreviewGrid.querySelector(`.batch-thumb[data-index="${index}"]`)?.classList.remove('is-stale');
        } catch (error) {
          console.warn('[Batch Preview] 局部縮圖刷新失敗:', item.name || `Item ${index + 1}`, error);
        }
      }
    },

    // （整合版）與 B 系相同的局部縮圖刷新：標記過期 → 去抖動 → 只重畫那幾張（A 系原本只有整批重畫）。
    markThumbsStale(indexes) {
      const list = [...new Set((Array.isArray(indexes) ? indexes : [indexes]).filter((index) => Number.isInteger(index) && index >= 0))];
      if (!list.length) return;
      if (DOM.batchPreviewGrid) {
        list.forEach((index) => {
          DOM.batchPreviewGrid.querySelector(`.batch-thumb[data-index="${index}"]`)?.classList.add('is-stale');
        });
      }
      if (!AppState.batchMode) return;
      this.__pendingStaleThumbs = this.__pendingStaleThumbs || new Set();
      list.forEach((index) => this.__pendingStaleThumbs.add(index));
      clearTimeout(this.__pendingStaleTimer);
      this.__pendingStaleTimer = setTimeout(() => {
        const pending = [...(this.__pendingStaleThumbs || [])];
        this.__pendingStaleThumbs = null;
        if (pending.length) this.refreshThumbsForIndexes(pending);
      }, 400);
    },

    // 找出某個 template 物件在 AppState.templates 裡的索引；找不到回傳 -1。
    indexOfTemplate(template) {
      if (!template) return -1;
      return (AppState.templates || []).findIndex((item) => (item?.data || item) === template);
    },
    /** （回饋：縮圖即時更新）某張圖被手動改了 → 標記過期並（去抖動 400ms 後）重畫那一張縮圖。 */
    scheduleThumbRefresh(template) {
      const index = this.indexOfTemplate(template);
      if (index >= 0) this.markThumbsStale([index]);
    },
    async refreshThumbsForIndexes(indexes) {
      if (!DOM.batchPreviewGrid || !indexes?.length) return;
      for (const index of indexes) {
        const item = AppState.templates?.[index];
        if (!item) continue;
        try {
          const url = await this.renderThumbnailForTemplate(item.data, { project: item.project });
          const img = DOM.batchPreviewGrid.querySelector(`.batch-thumb[data-index="${index}"] img`);
          if (img) img.src = url;
          DOM.batchPreviewGrid.querySelector(`.batch-thumb[data-index="${index}"]`)?.classList.remove('is-stale');
        } catch (error) {
          console.warn('[Batch Preview] 局部縮圖刷新失敗:', item.name || `Item ${index + 1}`, error);
        }
      }
    },
    async renderPreviewGrid(options = {}) {
      if (!DOM.batchPreviewGrid) return;
      const generation = (this._previewGeneration || 0) + 1;
      this._previewGeneration = generation;
      const entries = TemplateFilter.getVisibleEntries().map(({ item, index }) => ({ item, index }));
      const items = entries.map(({ item }) => item);
      DOM.batchPreviewPanel?.classList.toggle('hidden', !items.length);
      document.querySelector('.canvas-shell')?.classList.toggle('batch-mode', !!items.length);
      if (!items.length) { DOM.batchPreviewGrid.innerHTML = ''; return; }
      if (!options.revealWhenDone) this.renderPreviewPlaceholders();
      const currentIndex = AppState.activeIndex;
      const thumbs = [];
      AppState.batchPreviewRendering = true;
      try {
        for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
          if (generation !== this._previewGeneration) return;
          const { index } = entries[entryIndex];
          const item = AppState.templates[index];
          const itemName = item?.name || `Item ${index + 1}`;
          if (options.showProgress) LoadingOverlay.update((entryIndex / Math.max(1, entries.length)) * 100, `正在載入素材 ${entryIndex + 1} / ${entries.length}：${itemName}`);
          try {
            const url = await this.renderThumbnailForTemplate(item.data, { project: item.project });
            if (generation !== this._previewGeneration) return;
            thumbs.push({ index, name: itemName, url, ok: true });
          } catch (error) {
            console.warn('[Batch Preview] 縮圖產生失敗:', itemName, error);
            thumbs.push({ index, name: itemName, url: this.makeFallbackThumb(itemName), ok: false });
          }
          if (!options.revealWhenDone && generation === this._previewGeneration) this.paintPreviewThumbs(thumbs, items, currentIndex, entries);
        }
      } finally {
        if (generation === this._previewGeneration) AppState.batchPreviewRendering = false;
      }
      if (generation !== this._previewGeneration) return;
      this.paintPreviewThumbs(thumbs, items, currentIndex, entries);
      if (options.showProgress) LoadingOverlay.update(100, '素材載入完成');
      this.markActiveThumb();
    },

    paintPreviewThumbs(thumbs, items, currentIndex, entriesSnapshot = null) {
      if (!DOM.batchPreviewGrid) return;
      const entries = entriesSnapshot || TemplateFilter.getVisibleEntries();
      DOM.batchPreviewGrid.innerHTML = thumbs.map((thumb) => {
        const item = AppState.templates[thumb.index] || {};
        return `
          <button class="batch-thumb ${thumb.index === currentIndex ? 'active' : ''} ${item.visible ? '' : 'is-unchecked'} ${thumb.ok ? '' : 'thumb-warning'}" data-index="${thumb.index}">
            <input class="batch-thumb-check" type="checkbox" title="勾選下載此圖" ${item.visible ? 'checked' : ''}>
            <img src="${thumb.url}" alt="${this.escape(thumb.name)}">
            <small>${this.escape(thumb.name)}</small>
          </button>
        `;
      }).join('') + entries.slice(thumbs.length).map(({ item, index }) => {
        const itemName = item.name || `Item ${index + 1}`;
        return `<button class="batch-thumb ${index === currentIndex ? 'active' : ''} ${item.visible ? '' : 'is-unchecked'} thumb-pending" data-index="${index}"><input class="batch-thumb-check" type="checkbox" title="勾選下載此圖" ${item.visible ? 'checked' : ''}><div class="batch-thumb-placeholder">${this.escape(itemName)}</div><small>${this.escape(itemName)}</small></button>`;
      }).join('');
    },

    makeFallbackThumb(name = 'Preview') {
      const safe = this.escape(name).slice(0, 40);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120" viewBox="0 0 180 120"><rect width="180" height="120" rx="10" fill="#111827"/><text x="90" y="55" text-anchor="middle" fill="#fbbf24" font-family="Arial" font-size="12">縮圖產生失敗</text><text x="90" y="78" text-anchor="middle" fill="#cbd5e1" font-family="Arial" font-size="10">${safe}</text></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },

    async makeThumbURL() {
      return this.makeThumbURLFor(AppState.template, AppState.images);
    },
    // 純函式版本：只吃參數，完全不讀寫 AppState.template / AppState.images / AppState.activeIndex。
    // 可以安全地在背景幫「目前並非使用中」的版位產生縮圖，不會跟使用者當下在主畫布上的操作
    // 互相干擾——這是這次「即時縮圖」重新設計的核心：不再用「暫時把 AppState.template 換成
    // 別的版位」這種會有競態風險的做法。
    async makeThumbURLFor(template, images) {
      const t = template;
      const maxW = 180;
      const scale = Math.max(0.1, maxW / t.canvas.width);
      const off = document.createElement('canvas');
      off.width = Math.round(t.canvas.width * scale);
      off.height = Math.round(t.canvas.height * scale);
      const c = off.getContext('2d', { alpha: true });
      if (t.batchRecord?.__multiSizeSync) {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, off.width, off.height);
      }
      c.save();
      c.scale(scale, scale);
      Renderer.renderSceneTo(c, t, images, { showMissing: true, showGuides: true });
      c.restore();
      return off.toDataURL('image/jpeg', 0.86);
    },
    // 純函式版本：針對任一正式 Template 建立 clone，僅在 clone 上解析最新素材並產生縮圖。
    // 不重跑 Rule / Preset / Layout / Smart Asset，也不碰 AppState.template / activeIndex / images。
    async renderThumbnailForTemplate(template, options = {}) {
      if (!template) return null;
      // 第37題：縮圖永遠是 readonly snapshot；所有解析/繪製都在 clone 上完成。
      const snapshot = clone(template);
      const images = await TemplateLoader.loadImagesForTemplate(snapshot, options);
      return this.makeThumbURLFor(snapshot, images);
    },

    markActiveThumb() {
      qsa('.batch-thumb').forEach((btn) => {
        const index = Number(btn.dataset.index);
        const item = AppState.templates?.[index];
        btn.classList.toggle('active', index === AppState.activeIndex);
        btn.classList.toggle('is-unchecked', !item?.visible);
        const checkbox = btn.querySelector('.batch-thumb-check');
        if (checkbox) checkbox.checked = !!item?.visible;
      });
    },

    norm(value) { return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[\-_()（）\[\]【】]/g, ''); },
    escape: escapeHtml,
  };
  const BatchManager = pickLineage(BatchManager_A, BatchManager_B);
  // ── Interaction：B 系實作（外廣 wave1 V0.5 原文）──
  const Interaction_B = {
    bindCanvas() {
      // Pointer Events unify mouse/pen and keep transforms alive outside the canvas.
      DOM.canvas.style.touchAction = 'none';
      DOM.canvas.addEventListener('pointerdown', (event) => this.onMouseDown(event));
      window.addEventListener('pointermove', (event) => this.onMouseMove(event), { passive: false });
      window.addEventListener('pointerup', (event) => this.onMouseUp(event));
      window.addEventListener('pointercancel', (event) => this.onMouseUp(event));
      // Fallback for environments where canvas redraw interrupts pointermove.
      window.addEventListener('mousemove', (event) => this.onMouseMove(event), { passive: false });
      window.addEventListener('mouseup', (event) => this.onMouseUp(event));
      DOM.canvas.addEventListener('dblclick', (event) => this.onDoubleClick(event));
      // （OM_w2 / LineOA）interaction.dropUpload＝uploadSlot：拖檔到上傳槽。
      DOM.canvas.addEventListener('dragover', (event) => { if (flag('interaction.dropUpload', 'none') === 'uploadSlot') this.onCanvasDragOver(event); });
      DOM.canvas.addEventListener('drop', (event) => { if (flag('interaction.dropUpload', 'none') === 'uploadSlot') this.onCanvasDrop(event); });
      DOM.canvasShell?.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
      // （network）interaction.dropUpload＝manualAssetUpload：拖拉圖片到上傳槽。
      if (flag('interaction.dropUpload', 'none') === 'manualAssetUpload') ManualAssetUpload.bindDropZone(DOM.canvas);
    },
    onMouseMove(event) {
      if (!DOM.canvas) return;
      // Ignore synthetic mousemove immediately following pointermove at same coordinates.
      const stamp = `${event.clientX}:${event.clientY}:${event.buttons}`;
      if (event.type === 'mousemove' && this.lastPointerMoveStamp === stamp && performance.now() - (this.lastPointerMoveAt || 0) < 24) return;
      if (event.type === 'pointermove') { this.lastPointerMoveStamp = stamp; this.lastPointerMoveAt = performance.now(); }
      const transforming = AppState.isDragging || AppState.isResizing || AppState.isRotating;
      if (!transforming && event.target !== DOM.canvas) return;
      const pos = Geometry.mousePos(event);
      if (transforming) { this.moveSelected(pos, event); event.preventDefault?.(); return; }
      const handle = LayerManager.hitHandle(pos);
      if (handle) {
        if (handle.isRotateHandle) {
          DOM.canvas.style.cursor = 'grab';
          if (DOM.rotateHint) { DOM.rotateHint.style.display = 'block'; }
          if (DOM.resizeHint) DOM.resizeHint.style.display = 'none';
        } else {
          DOM.canvas.style.cursor = handle.cursor;
          if (DOM.rotateHint) DOM.rotateHint.style.display = 'none';
        }
        return;
      }
      if (DOM.rotateHint) DOM.rotateHint.style.display = 'none';
      const hit = LayerManager.hitTest(pos); AppState.hoverLayer = hit; DOM.canvas.style.cursor = hit ? 'move' : 'default';
      if (DOM.resizeHint && hit && AppState.template.layers[hit]?.type === 'image') { DOM.resizeHint.style.left = 'calc(100% - 80px)'; DOM.resizeHint.style.top = '-34px'; DOM.resizeHint.style.display = 'block'; }
      else if (DOM.resizeHint) DOM.resizeHint.style.display = 'none';
    },
    onMouseDown(event) {
      if (!AppState.template || (event.button != null && event.button !== 0)) return;
      TextEditor.commit();
      const pos = Geometry.mousePos(event); const handle = LayerManager.hitHandle(pos); const hit = handle ? activeLayerKey() : LayerManager.hitTest(pos);
      if (!hit) { AppState.selectedLayers = []; LayerManager.render(); Inspector.render(); Renderer.render(); return; }
      LayerManager.select(hit, event.shiftKey); const layer = AppState.template.layers[hit]; if (layer.locked) return;
      // （network）還沒有素材的上傳槽：單擊就開檔案選擇器。
      if (flag('interaction.dropUpload', 'none') === 'manualAssetUpload' && !handle && layer.__assetMissing && ManualAssetUpload.isUploadSlot(hit, layer, AppState.template)) {
        LayerManager.render(); Inspector.render(); Renderer.render();
        ManualAssetUpload.pickFile(hit, layer);
        return;
      }
      if (flag('interaction.dropUpload', 'none') === 'uploadSlot' && layer.__uploadSlot === true && !String(layer.assetFilename || '').trim()) {
        event.preventDefault?.();
        this.openUploadSlotPicker(hit, layer);
        return;
      }
      AppState.activePointerId = event.pointerId;
      try { DOM.canvas.setPointerCapture(event.pointerId); } catch (_) {}
      HistoryManager.push(); const box = Geometry.getLayerBox(hit, layer);
      window.SmartAssetManager?.beginMainCanvasTransform?.(hit, AppState.template);
      AssetSyncHub.begin(AppState.template, hit);
      if (handle?.isRotateHandle) {
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const startAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
        AppState.isRotating = true;
        AppState.rotateStart = { center, startAngle, startRotation: Number(layer.rotation || 0) };
      } else if (handle) {
        AppState.isResizing = true; AppState.resizeStart = { handle: handle.name, pos, box: clone(box) };
      } else {
        AppState.isDragging = true; AppState.dragOffset = { x: pos.x - box.x, y: pos.y - box.y };
      }
    },
    onMouseUp(event) {
      if (AppState.activePointerId != null && event?.pointerId != null && event.pointerId !== AppState.activePointerId) return;
      const key = activeLayerKey();
      if (key && (AppState.isDragging || AppState.isResizing || AppState.isRotating)) {
        window.SmartAssetManager?.finishMainCanvasTransform?.(key, AppState.template);
        AssetSyncHub.finish(AppState.template, key);
      }
      try { if (AppState.activePointerId != null) DOM.canvas.releasePointerCapture(AppState.activePointerId); } catch (_) {}
      AppState.activePointerId = null;
      AppState.isDragging = false;
      AppState.isResizing = false;
      AppState.resizeStart = null;
      AppState.isRotating = false;
      AppState.rotateStart = null;
      Renderer.render(); Inspector.render();
    },
    onWheel(event) {
      if (!AppState.template || !DOM.canvas) return;
      const rect = DOM.canvas.getBoundingClientRect();
      const insideCanvas = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      const key = activeLayerKey();
      const layer = activeLayer();

      // 滑鼠在 Canvas 上且已有選取素材時：滾輪調整該素材大小。
      // 沒有選取素材或滑鼠在 Canvas 外側時：保留上一版的右側預覽縮放功能。
      if (insideCanvas && key && layer && !layer.locked && AppState.editingLayerKey !== key) {
        event.preventDefault();
        TextEditor.commit();
        this.resizeSelectedByWheel(event.deltaY, event.shiftKey);
        return;
      }

      PreviewZoom.zoomBy(event.deltaY, event);
    },
    resizeSelectedByWheel(delta, fineTune = false) {
      const key = activeLayerKey();
      const layer = activeLayer();
      if (!key || !layer || layer.locked) return;

      const box = Geometry.getLayerBox(key, layer);
      if (!box.width || !box.height) return;

      const factorBase = fineTune ? 1.025 : 1.06;
      const factor = delta < 0 ? factorBase : 1 / factorBase;
      const nextWidth = Math.max(4, box.width * factor);
      const nextHeight = Math.max(4, box.height * factor);
      const nextBox = {
        x: box.x + (box.width - nextWidth) / 2,
        y: box.y + (box.height - nextHeight) / 2,
        width: nextWidth,
        height: nextHeight,
      };

      HistoryManager.push();
      window.SmartAssetManager?.beginMainCanvasTransform?.(key, AppState.template);
      AssetSyncHub.begin(AppState.template, key);
      Geometry.applyBox(key, layer, nextBox);
      window.SmartAssetManager?.updateMainCanvasTransform?.(key, AppState.template);
      AssetSyncHub.update(AppState.template, key);
      if (layer.type === 'text') {
        layer.fontSizePx = round((layer.fontSizePx || 24) * factor, 2);
        layer.fontSizePt = layer.fontSizePx;
        layer.lineHeight = round(layer.fontSizePx * (layer.lineHeightMultiplier || 1.08), 2);
        if (layer.source === 'auto_price_v2') {
          if (flag('price.specialCharRanges82', true)) window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
          PriceTransformEngine.captureManualPriceTransform(key, layer);
        }
      }
      window.SmartAssetManager?.finishMainCanvasTransform?.(key, AppState.template);
      AssetSyncHub.finish(AppState.template, key);
      Renderer.render();
      Inspector.render();
    },
    // （OM_w2 / LineOA）上傳槽：點擊／拖檔補圖，依遮罩對齊並以 coverByPBox 填滿。
    onCanvasDragOver(event) {
      if (!AppState.template || !DOM.canvas) return;
      const files = [...(event.dataTransfer?.files || [])];
      if (!files.some((file) => /^image\//i.test(file.type || ''))) return;
      const pos = Geometry.mousePos(event);
      const hit = LayerManager.hitUploadSlot(pos);
      const layer = hit ? AppState.template.layers?.[hit] : null;
      if (layer?.__uploadSlot !== true) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    },
    onCanvasDrop(event) {
      if (!AppState.template || !DOM.canvas) return;
      const file = [...(event.dataTransfer?.files || [])].find((item) => /^image\//i.test(item.type || ''));
      if (!file) return;
      const pos = Geometry.mousePos(event);
      const hit = LayerManager.hitUploadSlot(pos);
      const layer = hit ? AppState.template.layers?.[hit] : null;
      if (layer?.__uploadSlot !== true) return;
      event.preventDefault();
      this.applyUploadSlotFile(hit, layer, file);
    },
    openUploadSlotPicker(key, layer) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        input.remove();
        if (file) this.applyUploadSlotFile(key, layer, file);
      }, { once: true });
      input.addEventListener('cancel', () => input.remove(), { once: true });
      input.click();
    },
    async applyUploadSlotFile(key, layer, file) {
      if (!key || !layer || layer.__uploadSlot !== true || !file) return;
      HistoryManager.push();
      const bucketName = '手動替換';
      const safeFileName = decodeHashUnicode(file.name || 'lineoa-bn').replace(/[\/:*?"<>|]/g, '_');
      const lookupName = `manual/lineoa_bn_${Date.now()}_${safeFileName}`;
      AssetStore.registerManualFile(bucketName, lookupName, file);
      AssetStore.registerManualFile(bucketName, safeFileName, file);

      const maskName = layer.__maskLayerName || layer.maskLayerName || '載入BN範圍';
      const maskEntry = Object.entries(AppState.template?.layers || {}).find(([candidateKey, candidateLayer]) =>
        normalizeLayerIdentifier(candidateLayer?.psdName || candidateLayer?.name || candidateKey) === normalizeLayerIdentifier(maskName));
      const mask = maskEntry?.[1];
      if (mask) {
        const width = Math.max(1, Number(mask.width || 1));
        const height = Math.max(1, Number(mask.height || 1));
        const centerX = Number.isFinite(Number(mask.centerX)) ? Number(mask.centerX) : Number(mask.x || 0) + width / 2;
        const centerY = Number.isFinite(Number(mask.centerY)) ? Number(mask.centerY) : Number(mask.y || 0) + height / 2;
        layer.x = round(centerX - width / 2, 2);
        layer.y = round(centerY - height / 2, 2);
        layer.width = round(width, 2);
        layer.height = round(height, 2);
        layer.centerX = round(centerX, 2);
        layer.centerY = round(centerY, 2);
        layer.targetWidth = round(width, 2);
        layer.targetHeight = round(height, 2);
      }

      delete layer.__resolvedAssetFolder;
      delete layer.__resolvedAssetFilename;
      delete layer.__resolvedAssetPath;
      delete layer.smartAssetId;
      layer.assetFilename = lookupName;
      layer.assetCandidates = [];
      layer.assetProject = bucketName;
      layer.__manualAsset = true;
      layer.__assetMissing = false;
      layer.keepAspectRatio = true;
      // 上傳格可自訂貼合模式（例如 POPUP / 商品圖用 containByPBox 等比不裁切）；預設維持 cover。
      layer.sizingMode = layer.__uploadSizingMode || 'coverByPBox';
      layer.hidden = false;
      layer.locked = false;

      await TemplateLoader.loadImagesForActiveTemplate({ project: bucketName });
      // 通用機制：上傳格圖片載入完成後，通知該公版的專屬規則做後續處理（例如 LineOA 依 KV 明暗切換 CTA 白/黑）。
      try {
        BatchManager.applyTemplateRuleHook('onUploadSlotAssetApplied', AppState.template, AppState.template?.batchRecord || {}, [], {
          slotKey: key,
          slotLayer: layer,
          image: AppState.images?.[key] || null,
        });
      } catch (error) {
        console.warn('[UploadSlot] onUploadSlotAssetApplied hook failed:', error);
      }
      LayerManager.select(key);
      Renderer.render();
      LayerManager.render();
      Inspector.render();
      window.SmartAssetManager?.markActiveThumbStale?.(AppState.template);
      if (AppState.batchMode && BatchManager?.renderPreviewGrid) {
        await BatchManager.renderPreviewGrid({ revealWhenDone: true });
      }
    },
    onDoubleClick(event) {
      const pos = Geometry.mousePos(event);
      const hit = LayerManager.hitTest(pos);
      if (!hit) return;
      const layer = AppState.template.layers[hit];
      if (layer.type === 'text') {
        LayerManager.select(hit);
        TextEditor.open(hit);
        return;
      }
      // 整合版 interaction.dblclickReplace：'assetSpec'（network：只有規格素材圖層）／'uploadSlot'（跨夜：規則檔認定的上傳槽）。
      const dblclickTarget = flag('interaction.dblclickReplace', 'assetSpec') === 'uploadSlot'
        ? ManualAssetUpload.isUploadSlot(hit, layer, AppState.template)
        : !!layer.__assetSpec;
      if (layer.type === 'image' && dblclickTarget && !layer.__nonInteractive) {
        this.replaceSpecDrivenImage(hit, layer);
      }
    },
    replaceSpecDrivenImage(key, layer) {
      // （network）interaction.replaceAssetImpl＝manualAssetUpload：交給 ManualAssetUpload（同步群組、toast、不跳確認）。
      if (flag('interaction.replaceAssetImpl', 'legacy') === 'manualAssetUpload') { ManualAssetUpload.pickFile(key, layer); return; }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) return;

        const bucketName = '手動替換';
        const safeFileName = decodeHashUnicode(file.name || 'manual-image').replace(/[\/:*?"<>|]/g, '_');
        const lookupName = `manual/${Date.now()}_${safeFileName}`;
        AssetStore.registerManualFile(bucketName, lookupName, file);
        AssetStore.registerManualFile(bucketName, safeFileName, file);

        const specStem = normalizeAssetStemExact(layer.__assetSpec?.stem);
        const usages = [];
        (AppState.templates || []).forEach((item) => {
          Object.entries(item?.data?.layers || {}).forEach(([candidateKey, candidateLayer]) => {
            if (!candidateLayer?.__assetSpec) return;
            if (normalizeAssetStemExact(candidateLayer.__assetSpec.stem) !== specStem) return;
            usages.push({ item, key: candidateKey, layer: candidateLayer });
          });
        });
        const synchronize = usages.length > 1
          ? confirm(`這個素材目前共用於 ${usages.length} 個圖層。是否同步替換所有使用相同素材的版位？`)
          : false;
        const targets = synchronize ? usages : [{ item: AppState.templates?.[AppState.activeIndex], key, layer }];
        targets.forEach(({ layer: targetLayer }) => {
          targetLayer.assetFilename = lookupName;
          targetLayer.assetCandidates = [];
          targetLayer.assetProject = bucketName;
          targetLayer.__manualAsset = true;
          targetLayer.__assetMissing = false;
          targetLayer.keepAspectRatio = true;
          targetLayer.fitMode = 'contain';
        });

        await TemplateLoader.loadImagesForActiveTemplate({ project: AppState.templates?.[AppState.activeIndex]?.project });
        Renderer.render();
        LayerManager.render();
        Inspector.render();
        if (AppState.batchMode && BatchManager?.renderPreviewGrid) {
          await BatchManager.renderPreviewGrid({ revealWhenDone: true });
        }
      }, { once: true });
      input.addEventListener('cancel', () => input.remove(), { once: true });
      input.click();
    },
    moveSelected(pos, event) {
      const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.locked) return;
      if (AppState.isRotating) {
        const start = AppState.rotateStart;
        const currentAngle = Math.atan2(pos.y - start.center.y, pos.x - start.center.x) * 180 / Math.PI;
        let delta = currentAngle - start.startAngle;
        // 按住 Shift 時以 15 度為單位吸附，方便對齊常用角度。
        let nextRotation = start.startRotation + delta;
        if (event.shiftKey) nextRotation = Math.round(nextRotation / 15) * 15;
        layer.rotation = round(nextRotation, 2);
      } else if (AppState.isResizing) {
        const start = AppState.resizeStart; const dx = pos.x - start.pos.x; const dy = pos.y - start.pos.y; const box = clone(start.box);
        if (start.handle.includes('e')) box.width = Math.max(12, start.box.width + dx); if (start.handle.includes('s')) box.height = Math.max(12, start.box.height + dy);
        if (start.handle.includes('w')) { box.x = start.box.x + dx; box.width = Math.max(12, start.box.width - dx); } if (start.handle.includes('n')) { box.y = start.box.y + dy; box.height = Math.max(12, start.box.height - dy); }
        if (layer.keepAspectRatio || event.shiftKey) { const ratio = start.box.width / start.box.height; box.height = box.width / ratio; }
        Geometry.applyBox(key, layer, box);
        // 文字圖層（含價格）用滑鼠拖角把手縮放時，字級跟著框的縮放比例即時調整——
        // 跟滾輪/按鈕縮放的行為一致，「把價格拉大」字就真的變大。
        if (layer.type === 'text' && start.box.width > 0) {
          if (start.startFontSizePx === undefined) start.startFontSizePx = Number(layer.fontSizePx || 24);
          const factor = box.width / start.box.width;
          layer.fontSizePx = round(Math.max(6, start.startFontSizePx * factor), 2);
          layer.fontSizePt = layer.fontSizePx;
          layer.lineHeight = round(layer.fontSizePx * (layer.lineHeightMultiplier || 1.08), 2);
          if (layer.source === 'auto_price_v2') {
            if (flag('price.specialCharRanges82', true)) window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
            PriceTransformEngine.captureManualPriceTransform(key, layer);
          }
        }
      } else {
        const box = Geometry.getLayerBox(key, layer); Geometry.applyBox(key, layer, { ...box, x: pos.x - AppState.dragOffset.x, y: pos.y - AppState.dragOffset.y });
      }
      window.SmartAssetManager?.updateMainCanvasTransform?.(key, AppState.template);
      AssetSyncHub.update(AppState.template, key);
      Renderer.render(); Inspector.render();
    },
    bindKeyboard() {
      window.addEventListener('keydown', (event) => {
        const tag = document.activeElement?.tagName; const editing = document.activeElement?.isContentEditable;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || editing) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? HistoryManager.redo() : HistoryManager.undo(); return; }
        // （network 起）interaction.deleteClearsUploadSlot：Delete/Backspace 清掉上傳槽素材，變回「＋ 上傳圖片」空槽。
        if (flag('interaction.deleteClearsUploadSlot', false) && (event.key === 'Delete' || event.key === 'Backspace')) {
          const targetKey = activeLayerKey();
          const targetLayer = activeLayer();
          if (!targetKey || !targetLayer) return;
          if (!ManualAssetUpload.canClear(targetKey, targetLayer, AppState.template)) return;
          event.preventDefault();
          HistoryManager.push();
          ManualAssetUpload.clearAsset(targetKey, targetLayer);
          return;
        }
        // （跨夜 interaction.linkSync）D：切換「目前這一張公版」的跨版位連動。不用 Alt+D（瀏覽器網址列快捷鍵／Mac 會輸入 ∂）。
        if (flag('interaction.linkSync', false) && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey
          && String(event.key || '').toLowerCase() === 'd') {
          event.preventDefault();
          LinkSyncUI.toggle();
          return;
        }
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.locked) return;
        event.preventDefault(); HistoryManager.push(); window.SmartAssetManager?.beginMainCanvasTransform?.(key, AppState.template); AssetSyncHub.begin(AppState.template, key); const step = event.shiftKey ? 10 : event.altKey ? 0.5 : 1; const box = Geometry.getLayerBox(key, layer);
        if (event.key === 'ArrowUp') box.y -= step; if (event.key === 'ArrowDown') box.y += step; if (event.key === 'ArrowLeft') box.x -= step; if (event.key === 'ArrowRight') box.x += step;
        Geometry.applyBox(key, layer, box); window.SmartAssetManager?.updateMainCanvasTransform?.(key, AppState.template); AssetSyncHub.update(AppState.template, key); window.SmartAssetManager?.finishMainCanvasTransform?.(key, AppState.template); AssetSyncHub.finish(AppState.template, key); Renderer.render(); Inspector.render();
      });
    },
  };
  // ── Interaction：A 系實作（正式BN V0.8 為底）──
  const Interaction_A = {
    isSmartAssetLayer(key, layer, template = AppState.template) {
      if (!key || !layer) return false;
      if (window.SmartAssetManager?.ownsLayer?.(key, layer, template)) return true;
      const label = normStr(`${key} ${layer.psdName || ''} ${layer.role || ''}`);
      return layer.source === 'auto_price_v2'
        || layer.role === 'product'
        || label === 'p'
        || label.includes(normStr('商品圖'))
        || label.includes(normStr('商品圖_陰影'))
        || window.SmartAssetManager?.isPlacementGuide?.(key, layer);
    },
    // （暖正MS V0.5）商品素材缺失時的「+上傳素材」佔位框：點擊或拖檔補圖。只有 batch.missingProductAssetMode＝manualUpload 會產生佔位框。
    isManualUploadPlaceholder(layer) {
      return !!(layer && layer.type === 'image' && layer.__manualUploadRequired === true && !layer.assetFilename);
    },
    isImageFile(file) {
      return !!file && (/^image\//i.test(String(file.type || '')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(String(file.name || '')));
    },
    async applyManualProductUpload(key, file) {
      const template = AppState.template;
      const layer = template?.layers?.[key];
      if (!template || !layer || !this.isManualUploadPlaceholder(layer) || !this.isImageFile(file)) return false;

      HistoryManager.push('manual-product-upload');
      const folder = layer.__manualUploadFolder || `__manual_upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      layer.__manualUploadFolder = folder;
      if (!(AppState.assetFiles instanceof Map)) AppState.assetFiles = new Map();
      let bucket = AppState.assetFiles.get(folder);
      if (!(bucket instanceof Map)) {
        bucket = new Map();
        AppState.assetFiles.set(folder, bucket);
      }
      bucket.clear();
      const decodedName = window.RuntimePolicy?.decodeHashUnicode?.(file.name) || decodeHashUnicode(file.name);
      bucket.set(decodedName, file);

      imageLoadCache.clear();
      layer.assetFilename = decodedName;
      layer.assetProject = folder;
      layer.role = 'product';
      layer.hidden = false;
      layer.__assetMissing = false;
      delete layer.__manualUploadRequired;
      delete layer.__manualUploadField;
      delete layer.__manualUploadLabel;
      delete layer.__assetLookupError;
      layer.logicalAssetKey = window.RuntimePolicy?.normalizeLogicalAssetKey?.(layer.__missingRequestedAsset || decodedName)
        || BatchManager.normalizeAssetKey(layer.__missingRequestedAsset || decodedName);
      delete layer.__missingRequestedAsset;
      delete layer.smartAssetId;
      layer.smartAssetId = window.SmartAssetManager?.makeAssetId?.(layer.assetFilename, {
        folder: layer.assetProject,
        logicalAssetKey: layer.logicalAssetKey,
        smartAssetGroup: layer.smartAssetGroup,
        template,
        layer,
      }) || '';

      AppState.images = await TemplateLoader.loadImagesForTemplate(template, { project: template.batchProject || AppState.currentProject });
      LayerManager.select(key);
      window.SmartAssetManager?.markActiveThumbStale?.(template);
      Renderer.render();
      Inspector.render();
      LayerManager.render();
      return true;
    },
    openManualUploadPicker(key) {
      const layer = AppState.template?.layers?.[key];
      if (!this.isManualUploadPlaceholder(layer)) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.svg';
      input.style.display = 'none';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        try { if (file) await this.applyManualProductUpload(key, file); }
        catch (error) { console.error('[Manual Product Upload]', error); alert(`上傳素材失敗：${error?.message || error}`); }
        finally { input.remove(); }
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    },
    async onCanvasFileDrop(event) {
      const file = [...(event.dataTransfer?.files || [])].find((candidate) => this.isImageFile(candidate));
      if (!file) return;
      event.preventDefault();
      const pos = Geometry.mousePos(event);
      const hit = LayerManager.hitTest(pos);
      const layer = hit ? AppState.template?.layers?.[hit] : null;
      if (!hit || !this.isManualUploadPlaceholder(layer)) return;
      try { await this.applyManualProductUpload(hit, file); }
      catch (error) { console.error('[Manual Product Drop]', error); alert(`上傳素材失敗：${error?.message || error}`); }
    },
    beginSync(key, layer = AppState.template?.layers?.[key]) {
      if (this.isSmartAssetLayer(key, layer)) window.SmartAssetManager?.beginMainCanvasTransform?.(key, AppState.template);
      else if (flag('interaction.syncMode', 'dispatch') === 'dispatch') AssetSyncHub.begin(AppState.template, key);
    },
    updateSync(key, layer = AppState.template?.layers?.[key]) {
      if (this.isSmartAssetLayer(key, layer)) window.SmartAssetManager?.updateMainCanvasTransform?.(key, AppState.template);
      else if (flag('interaction.syncMode', 'dispatch') === 'dispatch') AssetSyncHub.update(AppState.template, key);
    },
    finishSync(key, layer = AppState.template?.layers?.[key]) {
      if (this.isSmartAssetLayer(key, layer)) window.SmartAssetManager?.finishMainCanvasTransform?.(key, AppState.template);
      else if (flag('interaction.syncMode', 'dispatch') === 'dispatch') AssetSyncHub.finish(AppState.template, key);
      // 2026-08-13 問題2：任何圖層（DECO、文字、CTA…）在畫布上的拖曳/縮放/旋轉/數值修改結束後，
      // 一律標記當前批次項縮圖待更新（內含 400ms 去抖動；智慧素材路徑重複標記同一 index 無副作用）。
      if (flag('interaction.markThumbStale', true)) window.SmartAssetManager?.markActiveThumbStale?.(AppState.template);
    },
    finalizeActiveTransform() {
      const key = activeLayerKey();
      const layer = activeLayer();
      const wasTransforming = AppState.isDragging || AppState.isResizing || AppState.isRotating;
      if (key && layer && wasTransforming) this.finishSync(key, layer);
      try { if (AppState.activePointerId != null) DOM.canvas.releasePointerCapture(AppState.activePointerId); } catch (_) {}
      AppState.activePointerId = null;
      AppState.isDragging = false;
      AppState.isResizing = false;
      AppState.isRotating = false;
      AppState.resizeStart = null;
      AppState.rotateStart = null;
      return wasTransforming;
    },
    bindCanvas() {
      // Pointer Events unify mouse/pen and keep transforms alive outside the canvas.
      DOM.canvas.style.touchAction = 'none';
      DOM.canvas.addEventListener('pointerdown', (event) => this.onMouseDown(event));
      window.addEventListener('pointermove', (event) => this.onMouseMove(event), { passive: false });
      window.addEventListener('pointerup', (event) => this.onMouseUp(event));
      window.addEventListener('pointercancel', (event) => this.onMouseUp(event));
      // Fallback for environments where canvas redraw interrupts pointermove.
      window.addEventListener('mousemove', (event) => this.onMouseMove(event), { passive: false });
      window.addEventListener('mouseup', (event) => this.onMouseUp(event));
      DOM.canvas.addEventListener('dblclick', (event) => this.onDoubleClick(event));
      // 拖檔上傳：分類啟用前就綁好監聽，事件發生時再看 interaction.dropUpload 決定行為。
      DOM.canvas.addEventListener('dragover', (event) => {
        if (flag('interaction.dropUpload', 'none') !== 'manualProduct') return;
        if ([...(event.dataTransfer?.files || [])].some((file) => this.isImageFile(file))) event.preventDefault();
        else if (event.dataTransfer?.types?.includes?.('Files')) event.preventDefault();
      });
      DOM.canvas.addEventListener('drop', (event) => {
        if (flag('interaction.dropUpload', 'none') === 'manualProduct') this.onCanvasFileDrop(event);
      });
      DOM.canvasShell?.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    },
    onMouseMove(event) {
      if (!DOM.canvas) return;
      // Ignore synthetic mousemove immediately following pointermove at same coordinates.
      const stamp = `${event.clientX}:${event.clientY}:${event.buttons}`;
      if (event.type === 'mousemove' && this.lastPointerMoveStamp === stamp && performance.now() - (this.lastPointerMoveAt || 0) < 24) return;
      if (event.type === 'pointermove') { this.lastPointerMoveStamp = stamp; this.lastPointerMoveAt = performance.now(); }
      const transforming = AppState.isDragging || AppState.isResizing || AppState.isRotating;
      if (!transforming && event.target !== DOM.canvas) return;
      const pos = Geometry.mousePos(event);
      if (transforming) { this.moveSelected(pos, event); event.preventDefault?.(); return; }
      const handle = LayerManager.hitHandle(pos);
      if (handle) {
        if (handle.isRotateHandle) {
          DOM.canvas.style.cursor = 'grab';
          if (DOM.rotateHint) { DOM.rotateHint.style.display = 'block'; }
          if (DOM.resizeHint) DOM.resizeHint.style.display = 'none';
        } else {
          DOM.canvas.style.cursor = handle.cursor;
          if (DOM.rotateHint) DOM.rotateHint.style.display = 'none';
        }
        return;
      }
      if (DOM.rotateHint) DOM.rotateHint.style.display = 'none';
      const hit = LayerManager.hitTest(pos);
      AppState.hoverLayer = hit;
      const hoverLayer = hit ? AppState.template?.layers?.[hit] : null;
      DOM.canvas.style.cursor = this.isManualUploadPlaceholder(hoverLayer) ? 'pointer' : (hit ? 'move' : 'default');
      if (DOM.resizeHint && hit && AppState.template.layers[hit]?.type === 'image') { DOM.resizeHint.style.left = 'calc(100% - 80px)'; DOM.resizeHint.style.top = '-34px'; DOM.resizeHint.style.display = 'block'; }
      else if (DOM.resizeHint) DOM.resizeHint.style.display = 'none';
    },
    onMouseDown(event) {
      if (!AppState.template || (event.button != null && event.button !== 0)) return;
      TextEditor.commit();
      const pos = Geometry.mousePos(event); const handle = LayerManager.hitHandle(pos); const hit = handle ? activeLayerKey() : LayerManager.hitTest(pos);
      if (!hit) { AppState.selectedLayers = []; LayerManager.render(); Inspector.render(); Renderer.render(); return; }
      LayerManager.select(hit, event.shiftKey); const layer = AppState.template.layers[hit]; if (layer.locked) return;
      if (!handle && this.isManualUploadPlaceholder(layer)) {
        event.preventDefault?.();
        this.openManualUploadPicker(hit);
        return;
      }
      AppState.activePointerId = event.pointerId;
      try { DOM.canvas.setPointerCapture(event.pointerId); } catch (_) {}
      HistoryManager.push(); const box = Geometry.getLayerBox(hit, layer);
      this.beginSync(hit, layer);
      if (handle?.isRotateHandle) {
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const startAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
        AppState.isRotating = true;
        AppState.rotateStart = { center, startAngle, startRotation: Number(layer.rotation || 0) };
      } else if (handle) {
        AppState.isResizing = true; AppState.resizeStart = {
          handle: handle.name,
          pos,
          box: clone(box),
          typography: layer.type === 'text' ? PriceTransformEngine.captureTypographyState(layer) : null,
        };
      } else {
        AppState.isDragging = true; AppState.dragOffset = { x: pos.x - box.x, y: pos.y - box.y };
      }
    },
    onMouseUp(event) {
      if (AppState.activePointerId != null && event?.pointerId != null && event.pointerId !== AppState.activePointerId) return;
      const key = activeLayerKey();
      this.finalizeActiveTransform();
      Renderer.render(); Inspector.render();
    },
    onWheel(event) {
      if (!AppState.template || !DOM.canvas) return;
      const rect = DOM.canvas.getBoundingClientRect();
      const insideCanvas = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      const key = activeLayerKey();
      const layer = activeLayer();

      // 滑鼠在 Canvas 上且已有選取素材時：滾輪調整該素材大小。
      // 沒有選取素材或滑鼠在 Canvas 外側時：保留上一版的右側預覽縮放功能。
      if (insideCanvas && key && layer && !layer.locked && AppState.editingLayerKey !== key) {
        event.preventDefault();
        TextEditor.commit();
        this.resizeSelectedByWheel(event.deltaY, event.shiftKey);
        return;
      }

      PreviewZoom.zoomBy(event.deltaY, event);
    },
    resizeSelectedByWheel(delta, fineTune = false) {
      const key = activeLayerKey();
      const layer = activeLayer();
      if (!key || !layer || layer.locked) return;

      const box = Geometry.getLayerBox(key, layer);
      if (!box.width || !box.height) return;

      const factorBase = fineTune ? 1.025 : 1.06;
      const factor = delta < 0 ? factorBase : 1 / factorBase;
      const nextWidth = Math.max(4, box.width * factor);
      const nextHeight = Math.max(4, box.height * factor);
      const nextBox = {
        x: box.x + (box.width - nextWidth) / 2,
        y: box.y + (box.height - nextHeight) / 2,
        width: nextWidth,
        height: nextHeight,
      };

      HistoryManager.push();
      const typography = layer.type === 'text' ? PriceTransformEngine.captureTypographyState(layer) : null;
      this.beginSync(key, layer);
      Geometry.applyBox(key, layer, nextBox);
      ManualOverrideManager.mark(layer, ['x', 'y', 'width', 'height']);
      this.updateSync(key, layer);
      if (layer.type === 'text') {
        PriceTransformEngine.applyTypographyScale(layer, typography, factor);
        if (layer.source === 'auto_price_v2') PriceTransformEngine.captureManualPriceTransform(key, layer);
      }
      this.finishSync(key, layer);
      Renderer.render();
      Inspector.render();
    },
    onDoubleClick(event) {
      const pos = Geometry.mousePos(event);
      const hit = LayerManager.hitTest(pos);
      if (!hit) return;
      const layer = AppState.template.layers[hit];
      if (layer.type === 'text') {
        LayerManager.select(hit);
        TextEditor.open(hit);
        return;
      }
      if (layer.type === 'image' && layer.__assetSpec && !layer.__nonInteractive) {
        this.replaceSpecDrivenImage(hit, layer);
      }
    },
    replaceSpecDrivenImage(key, layer) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) return;

        const bucketName = '手動替換';
        const safeFileName = decodeHashUnicode(file.name || 'manual-image').replace(/[\/:*?"<>|]/g, '_');
        const lookupName = `manual/${Date.now()}_${safeFileName}`;
        AssetStore.registerManualFile(bucketName, lookupName, file);
        AssetStore.registerManualFile(bucketName, safeFileName, file);

        const specStem = normalizeAssetStemExact(layer.__assetSpec?.stem);
        const usages = [];
        (AppState.templates || []).forEach((item) => {
          Object.entries(item?.data?.layers || {}).forEach(([candidateKey, candidateLayer]) => {
            if (!candidateLayer?.__assetSpec) return;
            if (normalizeAssetStemExact(candidateLayer.__assetSpec.stem) !== specStem) return;
            usages.push({ item, key: candidateKey, layer: candidateLayer });
          });
        });
        const synchronize = usages.length > 1
          ? confirm(`這個素材目前共用於 ${usages.length} 個圖層。是否同步替換所有使用相同素材的版位？`)
          : false;
        const targets = synchronize ? usages : [{ item: AppState.templates?.[AppState.activeIndex], key, layer }];
        const affected = [...new Set(targets.map(({ item }) => AppState.templates?.indexOf(item)).filter((index) => Number.isInteger(index) && index >= 0))];
        const beforeSnapshots = affected.map((index) => ({ index, data: clone(AppState.templates[index].data) }));
        const activeBefore = beforeSnapshots.find(({ index }) => index === AppState.activeIndex);
        if (activeBefore) {
          HistoryManager.pushSnapshot(activeBefore.data, AppState.activeIndex, 'replace-spec-asset');
          HistoryManager.attachExtra(beforeSnapshots.filter(({ index }) => index !== AppState.activeIndex));
        }

        targets.forEach(({ layer: targetLayer }) => {
          targetLayer.assetFilename = lookupName;
          targetLayer.assetCandidates = [];
          targetLayer.assetProject = bucketName;
          targetLayer.__manualAsset = true;
          targetLayer.__assetMissing = false;
          targetLayer.keepAspectRatio = true;
          // 手動換圖只換內容；既有 Template / layer fitMode 繼續沿用（決策 87/88）。
          if (!targetLayer.fitMode) targetLayer.fitMode = 'contain';
        });

        await TemplateLoader.loadImagesForActiveTemplate({ project: AppState.templates?.[AppState.activeIndex]?.project });
        Renderer.render();
        LayerManager.render();
        Inspector.render();
        if (AppState.batchMode && affected.length) {
          await BatchManager.refreshPreviewIndexes(affected, { showProgress: false });
        }
      }, { once: true });
      input.addEventListener('cancel', () => input.remove(), { once: true });
      input.click();
    },
    moveSelected(pos, event) {
      const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.locked) return;
      if (AppState.isRotating) {
        const start = AppState.rotateStart;
        const currentAngle = Math.atan2(pos.y - start.center.y, pos.x - start.center.x) * 180 / Math.PI;
        let delta = currentAngle - start.startAngle;
        // 按住 Shift 時以 15 度為單位吸附，方便對齊常用角度。
        let nextRotation = start.startRotation + delta;
        if (event.shiftKey) nextRotation = Math.round(nextRotation / 15) * 15;
        layer.rotation = round(nextRotation, 2);
        PriceTransformEngine.handleLayerRotationApplied(key, layer, AppState.template);
      } else if (AppState.isResizing) {
        const start = AppState.resizeStart; const dx = pos.x - start.pos.x; const dy = pos.y - start.pos.y; const box = clone(start.box);
        if (start.handle.includes('e')) box.width = Math.max(12, start.box.width + dx); if (start.handle.includes('s')) box.height = Math.max(12, start.box.height + dy);
        if (start.handle.includes('w')) { box.x = start.box.x + dx; box.width = Math.max(12, start.box.width - dx); } if (start.handle.includes('n')) { box.y = start.box.y + dy; box.height = Math.max(12, start.box.height - dy); }
        if (layer.keepAspectRatio || event.shiftKey) { const ratio = start.box.width / start.box.height; box.height = box.width / ratio; }
        Geometry.applyBox(key, layer, box);
        // 文字圖層（含價格）用滑鼠拖角把手縮放時，字級跟著框的縮放比例即時調整——
        // 跟滾輪/按鈕縮放的行為一致，「把價格拉大」字就真的變大。
        if (layer.type === 'text' && start.box.width > 0) {
          const factor = box.width / start.box.width;
          PriceTransformEngine.applyTypographyScale(
            layer,
            start.typography || PriceTransformEngine.captureTypographyState(layer),
            factor,
          );
          if (layer.source === 'auto_price_v2') PriceTransformEngine.captureManualPriceTransform(key, layer);
        }
      } else {
        const box = Geometry.getLayerBox(key, layer); Geometry.applyBox(key, layer, { ...box, x: pos.x - AppState.dragOffset.x, y: pos.y - AppState.dragOffset.y });
      }
      this.updateSync(key, layer);
      Renderer.render(); Inspector.render();
    },
    bindKeyboard() {
      window.addEventListener('keydown', (event) => {
        const tag = document.activeElement?.tagName; const editing = document.activeElement?.isContentEditable;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || editing) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? HistoryManager.redo() : HistoryManager.undo(); return; }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); HistoryManager.redo(); return; }
        if (event.key === 'Delete' || event.key === 'Backspace') return; // 第47題：目前版本不開放圖層刪除。
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.locked) return;
        event.preventDefault(); HistoryManager.push('keyboard-move'); this.beginSync(key, layer); const step = event.shiftKey ? 10 : event.altKey ? 0.5 : 1; const box = Geometry.getLayerBox(key, layer);
        if (event.key === 'ArrowUp') box.y -= step; if (event.key === 'ArrowDown') box.y += step; if (event.key === 'ArrowLeft') box.x -= step; if (event.key === 'ArrowRight') box.x += step;
        Geometry.applyBox(key, layer, box); ManualOverrideManager.mark(layer, ['x', 'y']); this.updateSync(key, layer); this.finishSync(key, layer); Renderer.render(); Inspector.render();
      });
    },
  };
  const Interaction = pickLineage(Interaction_A, Interaction_B);
  // （跨夜）連動開關 UI；interaction.linkSync=false 時 #linkSyncToggle 隱藏。
  const LinkSyncUI = {
    render() {
      const toggle = $('linkSyncToggle');
      if (!toggle) return;
      // 整合版：只有 interaction.linkSync=true 的分類（跨夜）才顯示連動開關。
      const wrapper = toggle.closest('label') || toggle;
      // 工具列的 label 有自己的 display 樣式，[hidden] 會被蓋掉，所以直接改 display。
      wrapper.style.display = flag('interaction.linkSync', false) ? '' : 'none';
      const template = AppState.template;
      toggle.disabled = !template;
      toggle.checked = template ? LinkSync.isEnabled(template) : true;
    },
    apply(enabled) {
      const template = AppState.template;
      if (!template) return;
      LinkSync.setEnabled(template, enabled);
      this.render();
      showToast(enabled ? '已恢復此公版的跨版位連動' : '已斷開此公版的跨版位連動');
    },
    toggle() {
      const template = AppState.template;
      if (!template) return;
      const next = LinkSync.toggle(template);
      if (next === null) return;
      this.render();
      showToast(next ? '已恢復此公版的跨版位連動' : '已斷開此公版的跨版位連動');
    },
  };
  window.LinkSyncUI = LinkSyncUI;
  // ── App：B 系實作（外廣 wave1 V0.5 原文）──
  const App_B = {
    async init() {
      this.bindUI();
      Interaction.bindCanvas();
      Interaction.bindKeyboard();
      await TemplateLoader.boot();
      SpecOverlayManager.init();
    },
    sync() { TemplateList.render(); LayerManager.render(); Inspector.render(); LinkSyncUI.render(); Renderer.render(); },
    bindUI() {
      qsa('.panel-header').forEach((header) => header.addEventListener('click', () => { const body = $(header.dataset.target); const icon = qs('.accordion-icon', header); if (!body || !icon) return; const collapsed = body.classList.toggle('collapsed'); icon.textContent = collapsed ? '+' : '-'; }));
      DOM.templateFilter?.addEventListener('change', async (event) => TemplateFilter.apply(event.target.value));
      DOM.openProjectModalBtn?.addEventListener('click', () => TemplateLoader.openProjectModal());
      DOM.projectModalCancelBtn?.addEventListener('click', () => TemplateLoader.closeProjectModal());
      DOM.projectModalOverlay?.addEventListener('click', (event) => {
        if (event.target === DOM.projectModalOverlay) TemplateLoader.closeProjectModal();
      });
      DOM.projectModalOkBtn?.addEventListener('click', async () => {
        const checked = document.querySelector('input[name="projectModalRadio"]:checked');
        if (AppState.availableProjectOptions?.length && !checked) {
          alert('請先選擇一個專案，或選擇 All。');
          return;
        }
        if (checked) AppState.currentProject = checked.value;
        TemplateLoader.updateCurrentProjectDisplay();
        TemplateLoader.closeProjectModal();
        await TemplateLoader.loadImagesForActiveTemplate();
        Renderer.render();
        // 從Excel流程跳出的浮動視窗，按OK後直接同步執行一次「預覽檔案」。
        if (AppState.excelWorkbook) {
          try { await BatchManager.generateFromSelectedSheet(); }
          catch (error) {
            console.error('[Batch] 產生批次圖檔失敗:', error);
            if (DOM.batchStatus) DOM.batchStatus.textContent = `產生失敗：${error?.message || error}`;
            alert(`產生批次圖檔失敗：${error?.message || error}`);
          }
        }
      });
      DOM.templateList?.addEventListener('click', async (event) => { const groupHeader = event.target.closest('.template-group-header'); if (groupHeader) return TemplateFilter.toggleGroup(groupHeader.dataset.groupKey); const item = event.target.closest('.templateItem'); if (!item) return; const index = Number(item.dataset.index); await TemplateList.select(index); });
      DOM.layerList?.addEventListener('click', (event) => { const item = event.target.closest('.layerItem'); if (!item) return; const key = item.dataset.key; const actionButton = event.target.closest('button'); const action = actionButton?.dataset.action; if (action === 'visible') return LayerManager.toggleVisible(key); if (action === 'lock') return LayerManager.toggleLock(key); LayerManager.select(key, event.shiftKey); });
      DOM.layerSearch?.addEventListener('input', (event) => { AppState.layerSearch = event.target.value; LayerManager.render(); });
      $('loadDefaultBtn')?.addEventListener('click', () => {
        const confirmed = confirm('確定要重置嗎？\n\n已上傳的公版、素材、工單與預覽都會被清除。');
        if (confirmed) TemplateLoader.resetAll();
      });
      $('assetInput')?.addEventListener('change', (event) => TemplateLoader.loadAssetFolder(event.target.files));
      $('templateFolderInput')?.addEventListener('change', async (event) => {
        LoadingOverlay.show('讀取公版資料夾中…');
        try { await TemplateLoader.loadTemplateFolder(event.target.files); }
        finally { LoadingOverlay.hide(); }
      });
      ['xInput', 'yInput', 'wInput', 'hInput'].forEach((id) => $(id)?.addEventListener('change', () => Inspector.applyBoxFromInputs()));
      ['textInput', 'fontSizeInput', 'colorInput'].forEach((id) => $(id)?.addEventListener('input', () => Inspector.applyTextFromInputs()));
      ['fontFamilyInput', 'fontSizeInput'].forEach((id) => $(id)?.addEventListener('change', () => Inspector.applyTextFromInputs()));
      qsa('#alignGroup button').forEach((button) => button.addEventListener('click', () => {
        const key = activeLayerKey(); const layer = activeLayer(); if (!layer || layer.type !== 'text' || layer.locked) return;
        HistoryManager.push(); layer.align = button.dataset.align;
        if (flag('text.afterEditHook', 'none') === 'markManualTextEdited') markManualTextEdited(AppState.template, key, layer);
        Inspector.render(); Renderer.render();
      }));
      $('linkSyncToggle')?.addEventListener('change', (event) => LinkSyncUI.apply(event.target.checked));
      $('gridToggle')?.addEventListener('change', () => Renderer.render());
      const specToggle = $('specToggle') || $('guideToggle');
      specToggle?.addEventListener('change', (event) => SpecOverlayManager.setVisible(event.target.checked));
      $('undoBtn')?.addEventListener('click', () => HistoryManager.undo()); $('redoBtn')?.addEventListener('click', () => HistoryManager.redo());

      DOM.excelInput?.addEventListener('change', async (event) => {
        await BatchManager.handleExcelFile(event.target.files?.[0]);
        event.target.value = '';
      });
      DOM.excelSheetSelect?.addEventListener('change', (event) => {
        BatchManager.detectAndOfferProjectsFromSheet(event.target.value);
        // 功能C+4：選分頁後，如果這個分頁有偵測到矩陣式工單的專案欄位，才跳出浮動視窗讓使用者選專案；
        // 偵測不到就不跳窗，維持原本流程，等使用者自己按「預覽檔案」。
        if ((AppState.detectedExcelProjects || []).length > 0) {
          TemplateLoader.openProjectModal();
        }
      });
      DOM.generateFromExcelBtn?.addEventListener('click', async () => {
        const hasProjectOptions = AppState.detectedExcelProjects?.length > 0;
        if (hasProjectOptions && !AppState.currentProject) {
          TemplateLoader.openProjectModal();
          return;
        }
        try { await BatchManager.generateFromSelectedSheet(); }
        catch (error) {
          console.error('[Batch] 產生批次圖檔失敗:', error);
          if (DOM.batchStatus) DOM.batchStatus.textContent = `產生失敗：${error?.message || error}`;
          alert(`產生批次圖檔失敗：${error?.message || error}`);
        }
      });
      $('selectAllBatchBtn')?.addEventListener('click', () => BatchManager.selectAllGenerated(true));
      $('deselectAllBatchBtn')?.addEventListener('click', () => BatchManager.selectAllGenerated(false));
      $('clearBatchBtn')?.addEventListener('click', () => BatchManager.clearBatch());
      DOM.batchItemList?.addEventListener('click', async (event) => {
        const groupHeader = event.target.closest('.batch-group-header');
        if (groupHeader) return BatchManager.toggleBatchGroup(groupHeader.dataset.groupKey);
        const item = event.target.closest('.batch-item');
        if (!item) return;
        const index = Number(item.dataset.index);
        if (event.target.type === 'checkbox') return BatchManager.toggleGenerated(index, event.target.checked);
        await BatchManager.selectGenerated(index);
      });
      DOM.batchPreviewGrid?.addEventListener('click', async (event) => {
        const thumb = event.target.closest('.batch-thumb');
        if (!thumb) return;
        const index = Number(thumb.dataset.index);
        if (event.target.classList?.contains('batch-thumb-check')) {
          event.stopPropagation();
          BatchManager.toggleGenerated(index, event.target.checked);
          return;
        }
        await BatchManager.selectGenerated(index);
      });
      $('downloadImageBtn')?.addEventListener('click', async () => {
        const format = await ExportManager.askImageFormat();
        if (!format) return;
        LoadingOverlay.show('產生並打包圖片中…');
        try { await ExportManager.exportVisibleBatch(format); }
        finally { LoadingOverlay.hide(); }
      });
      $('exportJsonBtn')?.addEventListener('click', () => ExportManager.exportJSON());

      DOM.inlineEditor?.addEventListener('input', () => TextEditor.syncFromEditor());
      DOM.inlineEditor?.addEventListener('compositionend', () => TextEditor.syncFromEditor());
      DOM.inlineEditor?.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); TextEditor.cancel(); } if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); TextEditor.commit(); } });
      DOM.inlineEditor?.addEventListener('blur', () => {
        // 延遲 commit，避免在 canvas mousedown 已呼叫 commit 後重複執行
        setTimeout(() => TextEditor.commit(), 80);
      });

      // ── Word 工具列事件（合併自 word-editor.patch.js ⑦）──
      const sizeEl = $('fontSizeInput');
      const adjustFontSize = (delta) => {
        const layer = activeLayer(); if (!layer || layer.type !== 'text') return;
        HistoryManager.push();
        layer.fontSizePx = delta > 0 ? Math.min(300, (layer.fontSizePx || 24) + delta) : Math.max(6, (layer.fontSizePx || 24) + delta);
        layer.fontSizePt = layer.fontSizePx;
        if (layer.lineHeightMultiplier) layer.lineHeight = layer.fontSizePx * layer.lineHeightMultiplier;
        if (sizeEl) sizeEl.value = layer.fontSizePx;
        if (layer.source === 'auto_price_v2') {
          const key = AppState.selectedLayers?.[0];
          if (flag('price.specialCharRanges82', true)) window.SPTextStandard?.applyPriceTextLayer?.(layer, key);
          PriceTransformEngine.captureManualPriceTransform(key, layer);
        }
        window.OMWave1SubtitleLayout?.refresh?.(AppState.template);
        Renderer.render();
      };
      $('fontSizeDecBtn')?.addEventListener('click', () => adjustFontSize(-1));
      $('fontSizeIncBtn')?.addEventListener('click', () => adjustFontSize(+1));

      $('fontFamilyInput')?.addEventListener('change', () => Inspector.applyTextFromInputs());
      ['lineHeightInput', 'letterSpacingInput'].forEach((id) => {
        $(id)?.addEventListener('input',  () => Inspector.applyTextFromInputs());
        $(id)?.addEventListener('change', () => Inspector.applyTextFromInputs());
      });

      $('boldBtn')?.addEventListener('click', () => {
        const layer = activeLayer(); if (!layer || layer.type !== 'text') return;
        layer.fontWeight = Number(layer.fontWeight || 400) >= 700 ? 400 : 700;
        HistoryManager.push(); window.OMWave1SubtitleLayout?.refresh?.(AppState.template); Inspector.render(); Renderer.render();
      });
      $('italicBtn')?.addEventListener('click', () => {
        const layer = activeLayer(); if (!layer || layer.type !== 'text') return;
        layer.fontStyle = layer.fontStyle === 'italic' ? 'normal' : 'italic';
        HistoryManager.push(); window.OMWave1SubtitleLayout?.refresh?.(AppState.template); Inspector.render(); Renderer.render();
      });
      $('underlineBtn')?.addEventListener('click', () => {
        const layer = activeLayer(); if (!layer || layer.type !== 'text') return;
        layer.textDecoration = layer.textDecoration?.includes('underline') ? 'none' : 'underline';
        HistoryManager.push(); window.OMWave1SubtitleLayout?.refresh?.(AppState.template); Inspector.render(); Renderer.render();
      });

      // Ctrl+B / Ctrl+I / Ctrl+U（編輯模式中）
      document.addEventListener('keydown', (e) => {
        if (!AppState.editingLayerKey) return;
        const layer = activeLayer(); if (!layer || layer.type !== 'text') return;
        const hot = e.ctrlKey || e.metaKey;
        if (hot && e.key.toLowerCase() === 'b') { e.preventDefault(); layer.fontWeight = Number(layer.fontWeight||400)>=700?400:700; Inspector.render(); Renderer.render(); }
        if (hot && e.key.toLowerCase() === 'i') { e.preventDefault(); layer.fontStyle = layer.fontStyle==='italic'?'normal':'italic'; Inspector.render(); Renderer.render(); }
        if (hot && e.key.toLowerCase() === 'u') { e.preventDefault(); layer.textDecoration = layer.textDecoration?.includes('underline')?'none':'underline'; Inspector.render(); Renderer.render(); }
      }, true);
    },
  };

  window.togglePanel = (id) => { const body = $(id); if (body) body.classList.toggle('collapsed'); };


  // V4.17: word-editor.patch.js 已合併至此檔案，不再需要獨立載入。
  // 必須等 rules/template-rules.loader.js 完成所有規則註冊，再啟動 App。
  // ── App：A 系實作（正式BN V0.8 為底）──
  const App_A = {
    async init() {
      this.bindUI();
      Interaction.bindCanvas();
      Interaction.bindKeyboard();
      await TemplateLoader.boot();
      SpecOverlayManager.init();
    },
    /** 整合版：ProfileLoader 在規則與 core 都載入後呼叫（分類在 core 之前就已決定）。 */
    onProfileActivated(profile) {
      const label = $('profileVersionLabel'); if (label) label.textContent = profile.label || profile.id;
    },
    sync() { TemplateList.render(); LayerManager.render(); Inspector.render(); Renderer.render(); },
    bindUI() {
      qsa('.panel-header').forEach((header) => header.addEventListener('click', () => { const body = $(header.dataset.target); const icon = qs('.accordion-icon', header); if (!body || !icon) return; const collapsed = body.classList.toggle('collapsed'); icon.textContent = collapsed ? '+' : '-'; }));
      DOM.templateFilter?.addEventListener('change', async (event) => TemplateFilter.apply(event.target.value));
      DOM.openProjectModalBtn?.addEventListener('click', () => TemplateLoader.openProjectModal());
      DOM.projectModalCancelBtn?.addEventListener('click', () => TemplateLoader.closeProjectModal());
      DOM.projectModalOverlay?.addEventListener('click', (event) => {
        if (event.target === DOM.projectModalOverlay) TemplateLoader.closeProjectModal();
      });
      DOM.projectModalOkBtn?.addEventListener('click', async () => {
        const checked = document.querySelector('input[name="projectModalRadio"]:checked');
        if (AppState.availableProjectOptions?.length && !checked) {
          alert('請先選擇一個專案，或選擇 All。');
          return;
        }
        if (checked) AppState.currentProject = checked.value;
        TemplateLoader.updateCurrentProjectDisplay();
        TemplateLoader.closeProjectModal();
        await TemplateLoader.loadImagesForActiveTemplate();
        Renderer.render();
        // 從Excel流程跳出的浮動視窗，按OK後直接同步執行一次「預覽檔案」。
        if (AppState.excelWorkbook) {
          try { await BatchManager.generateFromSelectedSheet(); }
          catch (error) {
            console.error('[Batch] 產生批次圖檔失敗:', error);
            if (DOM.batchStatus) DOM.batchStatus.textContent = `產生失敗：${error?.message || error}`;
            alert(`產生批次圖檔失敗：${error?.message || error}`);
          }
        }
      });
      DOM.templateList?.addEventListener('click', async (event) => { const groupHeader = event.target.closest('.template-group-header'); if (groupHeader) return TemplateFilter.toggleGroup(groupHeader.dataset.groupKey); const item = event.target.closest('.templateItem'); if (!item) return; const index = Number(item.dataset.index); await TemplateList.select(index); });
      DOM.layerList?.addEventListener('click', (event) => { const item = event.target.closest('.layerItem'); if (!item) return; const key = item.dataset.key; const actionButton = event.target.closest('button'); const action = actionButton?.dataset.action; if (action === 'visible') return LayerManager.toggleVisible(key); if (action === 'lock') return LayerManager.toggleLock(key); LayerManager.select(key, event.shiftKey); });
      DOM.layerSearch?.addEventListener('input', (event) => { AppState.layerSearch = event.target.value; LayerManager.render(); });
      $('loadDefaultBtn')?.addEventListener('click', () => {
        const confirmed = confirm('確定要重置嗎？\n\n已上傳的公版、素材、工單與預覽都會被清除。');
        if (confirmed) TemplateLoader.resetAll();
      });
      $('assetInput')?.addEventListener('change', (event) => TemplateLoader.loadAssetFolder(event.target.files));
      $('templateFolderInput')?.addEventListener('change', async (event) => {
        LoadingOverlay.show('讀取公版資料夾中…');
        try { await TemplateLoader.loadTemplateFolder(event.target.files); }
        finally { LoadingOverlay.hide(); }
      });
      ['xInput', 'yInput', 'wInput', 'hInput'].forEach((id) => $(id)?.addEventListener('change', () => Inspector.applyBoxFromInputs()));
      ['textInput', 'fontSizeInput', 'colorInput'].forEach((id) => $(id)?.addEventListener('input', () => Inspector.applyTextFromInputs()));
      ['fontFamilyInput', 'fontSizeInput'].forEach((id) => $(id)?.addEventListener('change', () => Inspector.applyTextFromInputs()));
      qsa('#alignGroup button').forEach((button) => button.addEventListener('click', () => { const key = activeLayerKey(); const layer = activeLayer(); if (!key || !layer || layer.type !== 'text' || layer.locked || layer.align === button.dataset.align) return; HistoryManager.push('text-align'); layer.align = button.dataset.align; ManualOverrideManager.mark(layer, 'align'); DynamicLayoutManager.refreshForText(AppState.template, key, layer); Inspector.render(); Renderer.render(); }));
      $('gridToggle')?.addEventListener('change', () => Renderer.render());
      const specToggle = $('specToggle') || $('guideToggle');
      specToggle?.addEventListener('change', (event) => SpecOverlayManager.setVisible(event.target.checked));
      $('undoBtn')?.addEventListener('click', () => HistoryManager.undo()); $('redoBtn')?.addEventListener('click', () => HistoryManager.redo());

      DOM.excelInput?.addEventListener('change', async (event) => {
        await BatchManager.handleExcelFile(event.target.files?.[0]);
        event.target.value = '';
      });
      DOM.excelSheetSelect?.addEventListener('change', (event) => {
        BatchManager.detectAndOfferProjectsFromSheet(event.target.value);
        // 功能C+4：選分頁後，如果這個分頁有偵測到矩陣式工單的專案欄位，才跳出浮動視窗讓使用者選專案；
        // 偵測不到就不跳窗，維持原本流程，等使用者自己按「預覽檔案」。
        if ((AppState.detectedExcelProjects || []).length > 0) {
          TemplateLoader.openProjectModal();
        }
      });
      DOM.generateFromExcelBtn?.addEventListener('click', async () => {
        const hasProjectOptions = AppState.detectedExcelProjects?.length > 0;
        if (hasProjectOptions && !AppState.currentProject) {
          TemplateLoader.openProjectModal();
          return;
        }
        try { await BatchManager.generateFromSelectedSheet(); }
        catch (error) {
          console.error('[Batch] 產生批次圖檔失敗:', error);
          if (DOM.batchStatus) DOM.batchStatus.textContent = `產生失敗：${error?.message || error}`;
          alert(`產生批次圖檔失敗：${error?.message || error}`);
        }
      });
      $('selectAllBatchBtn')?.addEventListener('click', () => BatchManager.selectAllGenerated(true));
      $('deselectAllBatchBtn')?.addEventListener('click', () => BatchManager.selectAllGenerated(false));
      $('clearBatchBtn')?.addEventListener('click', () => BatchManager.clearBatch());
      DOM.batchItemList?.addEventListener('click', async (event) => {
        const groupHeader = event.target.closest('.batch-group-header');
        if (groupHeader) return BatchManager.toggleBatchGroup(groupHeader.dataset.groupKey);
        const item = event.target.closest('.batch-item');
        if (!item) return;
        const index = Number(item.dataset.index);
        if (event.target.type === 'checkbox') return BatchManager.toggleGenerated(index, event.target.checked);
        await BatchManager.selectGenerated(index);
      });
      DOM.batchPreviewGrid?.addEventListener('click', async (event) => {
        const thumb = event.target.closest('.batch-thumb');
        if (!thumb) return;
        const index = Number(thumb.dataset.index);
        if (event.target.classList?.contains('batch-thumb-check')) {
          event.stopPropagation();
          BatchManager.toggleGenerated(index, event.target.checked);
          return;
        }
        await BatchManager.selectGenerated(index);
      });
      $('downloadImageBtn')?.addEventListener('click', async () => {
        const format = await ExportManager.askImageFormat();
        if (!format) return;
        LoadingOverlay.show('產生並打包圖片中…');
        try { await ExportManager.exportVisibleBatch(format); }
        finally { LoadingOverlay.hide(); }
      });
      $('exportJsonBtn')?.addEventListener('click', () => ExportManager.exportJSON());

      DOM.inlineEditor?.addEventListener('input', () => TextEditor.syncFromEditor());
      DOM.inlineEditor?.addEventListener('compositionend', () => TextEditor.syncFromEditor());
      DOM.inlineEditor?.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); TextEditor.cancel(); } if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); TextEditor.commit(); } });
      DOM.inlineEditor?.addEventListener('blur', () => {
        // 延遲 commit，避免在 canvas mousedown 已呼叫 commit 後重複執行
        setTimeout(() => TextEditor.commit(), 80);
      });

      // ── Word 工具列事件（合併自 word-editor.patch.js ⑦）──
      const sizeEl = $('fontSizeInput');
      const adjustFontSize = (delta) => {
        const layer = activeLayer(); if (!layer || layer.type !== 'text') return;
        HistoryManager.push('font-size-step');
        const nextSize = delta > 0
          ? Math.min(300, (layer.fontSizePx || 24) + delta)
          : Math.max(6, (layer.fontSizePx || 24) + delta);
        PriceTransformEngine.setTypographyFontSize(layer, nextSize);
        if (sizeEl) sizeEl.value = layer.fontSizePx;
        ManualOverrideManager.mark(layer, ['fontSizePx', 'lineHeight']);
        if (layer.source === 'auto_price_v2') PriceTransformEngine.captureManualPriceTransform(AppState.selectedLayers?.[0], layer);
        DynamicLayoutManager.refreshForText(AppState.template, activeLayerKey(), layer);
        Renderer.render();
      };
      $('fontSizeDecBtn')?.addEventListener('click', () => adjustFontSize(-1));
      $('fontSizeIncBtn')?.addEventListener('click', () => adjustFontSize(+1));

      $('fontFamilyInput')?.addEventListener('change', () => Inspector.applyTextFromInputs());
      ['lineHeightInput', 'letterSpacingInput'].forEach((id) => {
        $(id)?.addEventListener('input',  () => Inspector.applyTextFromInputs());
        $(id)?.addEventListener('change', () => Inspector.applyTextFromInputs());
      });

      const applyTextFormat = (label, property, mutator) => {
        const editingKey = AppState.editingLayerKey;
        if (editingKey) TextEditor.commit();
        const key = activeLayerKey(); const layer = activeLayer();
        if (!key || !layer || layer.type !== 'text' || layer.locked) return;
        HistoryManager.push(label);
        mutator(layer);
        ManualOverrideManager.mark(layer, property);
        DynamicLayoutManager.refreshForText(AppState.template, key, layer);
        Inspector.render(); Renderer.render();
        if (editingKey === key) TextEditor.open(key);
      };
      $('boldBtn')?.addEventListener('click', () => applyTextFormat('text-bold', 'fontWeight', (layer) => { layer.fontWeight = Number(layer.fontWeight || 400) >= 700 ? 400 : 700; }));
      $('italicBtn')?.addEventListener('click', () => applyTextFormat('text-italic', 'fontStyle', (layer) => { layer.fontStyle = layer.fontStyle === 'italic' ? 'normal' : 'italic'; }));
      $('underlineBtn')?.addEventListener('click', () => applyTextFormat('text-underline', 'textDecoration', (layer) => { layer.textDecoration = layer.textDecoration?.includes('underline') ? 'none' : 'underline'; }));

      document.addEventListener('keydown', (e) => {
        if (!AppState.editingLayerKey || !(e.ctrlKey || e.metaKey)) return;
        const key = e.key.toLowerCase();
        if (!['b', 'i', 'u'].includes(key)) return;
        e.preventDefault();
        if (key === 'b') applyTextFormat('text-bold', 'fontWeight', (layer) => { layer.fontWeight = Number(layer.fontWeight || 400) >= 700 ? 400 : 700; });
        if (key === 'i') applyTextFormat('text-italic', 'fontStyle', (layer) => { layer.fontStyle = layer.fontStyle === 'italic' ? 'normal' : 'italic'; });
        if (key === 'u') applyTextFormat('text-underline', 'textDecoration', (layer) => { layer.textDecoration = layer.textDecoration?.includes('underline') ? 'none' : 'underline'; });
      }, true);
    },
  };

  window.togglePanel = (id) => { const body = $(id); if (body) body.classList.toggle('collapsed'); };


  // V4.17: word-editor.patch.js 已合併至此檔案，不再需要獨立載入。
  // 必須等 rules/template-rules.loader.js 完成所有規則註冊，再啟動 App。
  const App = pickLineage(App_A, App_B);
  window.App = App;
  window.AppState = AppState;
  window.AssetStore = AssetStore;
  window.BatchManager = BatchManager;
  window.CapsuleRuleEngine = CapsuleRuleEngine;
  window.ExportManager = ExportManager;
  window.HistoryManager = HistoryManager;
  window.Inspector = Inspector;
  window.Interaction = Interaction;
  window.LayerManager = LayerManager;
  window.LayoutRuleEngine = LayoutRuleEngine;
  window.LoadingOverlay = LoadingOverlay;
  // 整合版靜態模組（文字工具 modules/text-editing-ux.js 等）需要：多匯出兩個原本只在閉包內的模組。
  window.PreviewZoom = PreviewZoom;
  window.TextEditor = TextEditor;
  window.ManualOverrideManager = ManualOverrideManager;
  window.PriceColorResolver = PriceColorResolver;
  window.PriceLayerFactory = PriceLayerFactory;
  window.PriceLayoutResolver = PriceLayoutResolver;
  window.PriceParser = PriceParser;
  window.PriceRuleEngine = PriceRuleEngine;
  window.PriceTypographyResolver = PriceTypographyResolver;
  window.Renderer = Renderer;
  window.SpecOverlayManager = SpecOverlayManager;
  window.TemplateFilter = TemplateFilter;
  window.TemplateList = TemplateList;
  window.TemplateLoader = TemplateLoader;
  const rulesReady = window.TemplateRulesLoader?.ready || Promise.resolve({ loadedRuleFiles: [], failedRuleFiles: [] });
  Promise.resolve(rulesReady)
    .then((result) => {
      window.__rulesLoadResult = result || {};
      // 整合版：bootstrap 等 __appReady 完成後才把工單交給 core。
      window.__appReady = App.init();
    })
    .catch((error) => {
      // Rule 程式是正式公版的一部分；若載入失敗就停止啟動，避免工具在「少一支 Rule」的半套狀態繼續產圖。
      window.__rulesLoadResult = {
        loadedRuleFiles: window.TemplateRulesLoader?.loadedRuleFiles?.slice?.() || [],
        failedRuleFiles: window.TemplateRulesLoader?.failedRuleFiles?.slice?.() || [],
        error: String(error?.message || error || 'Rule loader failed'),
      };
      console.error('[App] Template rules loader failed; startup aborted.', error);
      window.alert?.(`規則檔載入失敗，工具已停止啟動。\n${error?.message || error}`);
    });
})();
