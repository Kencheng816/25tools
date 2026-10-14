/* 整合版 – 工具分類（Profile）載入器
 *
 * 一份 core、多個工具分類。每個分類一份 config/profiles/<分類>.profile.js（內容為 JSON，包一行登錄到 window.__profileRegistry），
 * 內含 rulesNamespace（規則檔資料夾）、sheetHints（工單分頁名關鍵字）與 flags（行為選項）。
 * flags 分三層：config/profiles/_defaults.js 的 defaults → families[<family>] → profile.flags（只放差異），
 * 由 mergeFlagLayers 合成完整一份後才交給 core。
 *
 * 啟用流程：
 *   1. 決定分類：網址 ?profile=<分類> ＞ 使用者下拉選擇 ＞ 上傳工單後依分頁名自動偵測。
 *   2. 載入 rules/<ns>/rules.manifest.js，把 manifest 內 'rules/...' 改指到 rules/<ns>/...、'@shared/...' 改指到 rules/shared/...。
 *   3. 載入 core/template-rules.loader.js（單一版本，行為差異走 rules.* 旗標），等它逐支載完規則。
 *   4. 通知 core（window.App.onProfileActivated）。
 *
 * 分類一經啟用就不可在同一頁切換（規則註冊表無法卸載）；切換一律 reload 到 ?profile=<分類>。
 */
(function initProfileLoader() {
  'use strict';

  const PROFILE_DIR = 'config/profiles/';
  const PROFILE_INDEX = `${PROFILE_DIR}index.js`;
  const PROFILE_DEFAULTS = `${PROFILE_DIR}_defaults.js`;
  /** 未在 profile.coreScripts 指定時的預設載入順序（＝正式BN 原 index.html 的順序）。 */
  const DEFAULT_CORE_SCRIPTS = Object.freeze([
    'core/product-engine.js',
    'renderers/shape-renderer.js',
    'core/app.core.js',
    'smart-assets/product-shadow.engine.js',
    'smart-assets/smart-asset-manager.js',
    'modules/asset-review-modal.js',
    'modules/single-size-asset-sync.js',
    'modules/multi-size-asset-sync.js',
  ]);

  const state = {
    index: [],          // [{ id, label, sheetHints }]
    active: null,       // 啟用中的 profile 物件
    activating: null,   // Promise
  };

  const listeners = new Set();

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
   * 設定檔用 <script> 載入而不是 fetch()：雙擊 index.html（file://）時瀏覽器不允許 fetch 本機檔案，
   * 但 <script src> 可以。每個設定檔載入後把內容登錄到 window.__profileRegistry[key]。
   */
  async function loadRegistryEntry(src, key) {
    const registry = () => window.__profileRegistry || {};
    if (!(key in registry())) await loadScript(src);
    if (!(key in registry())) throw new Error(`讀取失敗：${src}（沒有登錄 ${key}）`);
    return registry()[key];
  }

  async function loadIndex() {
    if (state.index.length) return state.index;
    state.index = await loadRegistryEntry(PROFILE_INDEX, 'index');
    return state.index;
  }

  /** 依工單分頁名找分類：hint 完全等於分頁名（trim 後）優先，其次分頁名包含 hint。回傳候選陣列（可能多個）。 */
  function detectBySheetNames(sheetNames = []) {
    const names = sheetNames.map((name) => String(name || '').trim());
    const exact = [];
    const partial = [];
    for (const profile of state.index) {
      const hints = (profile.sheetHints || []).map((hint) => String(hint).trim());
      if (hints.some((hint) => names.includes(hint))) exact.push(profile.id);
      else if (hints.some((hint) => names.some((name) => name.includes(hint)))) partial.push(profile.id);
    }
    return exact.length ? exact : partial;
  }

  /**
   * 旗標三層合併：_defaults.js 的 defaults → families[<family>] → profile.flags（只放差異）。
   * 回傳的 profile.flags 是完整的一份（core 只認完整旗標，不知道分層）。
   */
  function mergeFlagLayers(profile, defaults) {
    const familyFlags = { ...(defaults?.families?.[profile.family] || {}) };
    delete familyFlags._comment;
    return { ...profile, flags: { ...(defaults?.defaults || {}), ...familyFlags, ...(profile.flags || {}) } };
  }

  const SHARED_RULES_DIR = 'rules/shared/';
  const RULES_LOADER = 'core/template-rules.loader.js';

  /** manifest 路徑轉實際路徑：'@shared/x.js' → 所有分類共用的 rules/shared/x.js；'rules/x.js' → 該分類的 rules/<ns>/x.js。 */
  function namespacedRuleFiles(manifest, namespace) {
    const files = Array.isArray(manifest?.ruleFiles) ? manifest.ruleFiles : [];
    // 先換 'rules/' 再換 '@shared/'，否則 '@shared/x' 會先變成 'rules/shared/x' 再被改到分類資料夾底下。
    return files.map((file) => String(file).replace(/^rules\//, namespace).replace(/^@shared\//, SHARED_RULES_DIR));
  }

  async function activate(profileId) {
    if (state.active) {
      if (state.active.id === profileId) return state.active;
      throw new Error(`分類已啟用為「${state.active.id}」，切換分類請重新載入頁面。`);
    }
    if (state.activating) return state.activating;

    state.activating = (async () => {
      const [rawProfile, defaults] = await Promise.all([
        loadRegistryEntry(`${PROFILE_DIR}${encodeURIComponent(profileId)}.profile.js`, `profile:${profileId}`),
        loadRegistryEntry(PROFILE_DEFAULTS, '_defaults'),
      ]);
      const profile = mergeFlagLayers(rawProfile, defaults);
      const namespace = String(profile.rulesNamespace || `rules/${profileId}/`);
      // 旗標要在規則載入器之前就能讀（載入器的 register／normalize 行為依旗標決定），所以這裡就先啟用。
      window.__profile = profile;
      state.active = profile;

      await loadScript(`${namespace}rules.manifest.js`);
      const ruleFiles = namespacedRuleFiles(window.TemplateRulesManifest, namespace);
      // rulesAfterCore（network／AMS／跨夜 原 index.html 把規則檔排在 core 與模組之後）：
      // loader 先以空清單載入（讓 core 的 rulesReady 立即成立），規則檔等 core 載完再逐支載入。
      const rulesAfterCore = profile.rulesAfterCore === true;
      window.TemplateRulesManifest = Object.freeze({ ruleFiles: rulesAfterCore ? [] : ruleFiles });
      await loadScript(RULES_LOADER);
      const result = await window.TemplateRulesLoader.ready;
      // 分類專屬的額外程式（例：MS 的 work-order-export-planner.js），在規則之後、core 之前載入。
      for (const src of Array.isArray(profile.scripts) ? profile.scripts : []) await loadScript(src);

      // 規則就緒後才載入 core 與其引擎模組（core 建構時會依 profile 選用 A／B 實作）。
      window.__rulesLoadResult = result || {};
      for (const src of Array.isArray(profile.coreScripts) && profile.coreScripts.length ? profile.coreScripts : DEFAULT_CORE_SCRIPTS) await loadScript(src);
      if (rulesAfterCore) {
        for (const src of ruleFiles) await loadScript(src);
        window.__rulesLoadResult = { ...(result || {}), loadedRuleFiles: ruleFiles.slice() };
      }
      // 所有 coreScripts 都載完才設；靜態模組要接線（包 Renderer／TextEditor 等）必須等這個，
      // 不能只等 __appReady——core 一載入就建立 __appReady，但之後的 coreScripts（規則／變體檔）還在執行，太早接線會被蓋掉（HTTP 快取快時會踩到）。
      window.__coreScriptsReady = true;
      window.dispatchEvent(new CustomEvent('core:scripts-ready', { detail: { profile: profile.id } }));
      listeners.forEach((listener) => { try { listener(profile); } catch (error) { console.error('[ProfileLoader]', error); } });
      window.App?.onProfileActivated?.(profile);
      return profile;
    })();

    try { return await state.activating; }
    finally { state.activating = null; }
  }

  function getFlag(key, fallback) {
    const flags = state.active?.flags || {};
    return Object.prototype.hasOwnProperty.call(flags, key) ? flags[key] : fallback;
  }

  function urlProfile() {
    return new URLSearchParams(window.location.search).get('profile') || '';
  }

  function reloadWithProfile(profileId) {
    const url = new URL(window.location.href);
    url.searchParams.set('profile', profileId);
    window.location.assign(url.toString());
  }

  window.ProfileLoader = Object.freeze({
    loadIndex,
    detectBySheetNames,
    activate,
    getFlag,
    urlProfile,
    reloadWithProfile,
    onActivated: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    get active() { return state.active; },
    get index() { return state.index; },
  });
})();
