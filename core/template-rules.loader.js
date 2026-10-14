/* 整合版 – Template Rules Loader + Registry（單一版本）
 *
 * 取代原 11 工具各自的 rules/<ns>/template-rules.loader.js（4 種版本），行為差異全部改由旗標控制：
 *   rules.registryMode      strict（正式BN／暖身BN）＝重複 register 同 family 拋錯、detectFamily 計分（完全相等＞較長＞priority）同分拋錯；
 *                           strictExact（MS）＝同 strict 但只接受完全相等；
 *                           merge（B 系／KV／OM）＝重複 register 合併、依 priority 取第一個相等或互含者。
 *   rules.normalizeLegacy   true（KV）＝規則名稱正規化用舊法：不做 NFKC、不去編號前綴、少幾個符號。
 *   rules.loadFailurePolicy reject（預設）＝任一規則檔載入失敗就讓 ready 拒絕；continue（KV）＝記錄後繼續載下一支。
 *
 * 載入：依 window.TemplateRulesManifest.ruleFiles 順序逐支動態注入 <script>，全部載完 ready 才 resolve。
 * 旗標由 core/profile-loader.js 在載入本檔之前就設好（window.ProfileLoader.getFlag）。
 */
(function initTemplateRulesLoader() {
  'use strict';

  const flag = (key, fallback) => {
    const value = window.ProfileLoader?.getFlag?.(key, undefined);
    return value === undefined || value === null ? fallback : value;
  };
  const registryMode = () => String(flag('rules.registryMode', 'merge'));
  const isStrict = () => registryMode() !== 'merge';

  // ── 規則名稱正規化 ──
  function normalizeModern(value) {
    const raw = String(value ?? '');
    const normalized = typeof raw.normalize === 'function' ? raw.normalize('NFKC') : raw;
    return normalized
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/^\s*\d+\s*[_\-\s]+/, '')
      .replace(/[\s 　\t\r\n_\-+()（）\[\]【】.＿－—–]+/g, '');
  }
  function normalizeLegacy(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[\s 　\t\r\n_\-()（）\[\]【】.]+/g, '');
  }
  // 正式BN／暖身BN／MS 的 shared/runtime-policy.js 可覆寫正規化；其他工具沒有 RuntimePolicy，自然走預設。
  const normalize = (value) => {
    if (flag('rules.normalizeLegacy', false)) return normalizeLegacy(value);
    return window.RuntimePolicy?.normalizeRuleLabel?.(value) || normalizeModern(value);
  };

  const currentSource = (key, family) => document.currentScript?.dataset?.templateRuleSrc || document.currentScript?.src || String(key || family);

  function createRegistry() {
    const registry = new Map();
    const registrationSources = new Map();

    function register(key, config = {}) {
      const family = String(config.family || key || '').trim();
      if (!family) throw new Error('Rule family 不可為空白');
      if (isStrict() && registry.has(family)) {
        throw new Error(`Rule Family 衝突：${family}\n已註冊：${registrationSources.get(family) || 'unknown'}\n重複：${currentSource(key, family)}`);
      }
      // merge 模式：同 family 重複註冊時合併 tokens／targets／rules；strict 模式上面已擋掉重複，previous 恆為空。
      const previous = registry.get(family) || {};
      const entry = {
        ...previous,
        ...config,
        key: String(key || family).trim(),
        family,
        priority: Number(config.priority ?? previous.priority ?? 0),
        tokens: [...new Set([...(previous.tokens || []), ...(config.tokens || [])].filter(Boolean))],
        targets: [...new Set([...(previous.targets || []), ...(config.targets || [])].filter(Boolean))],
        rules: { ...(previous.rules || {}), ...(config.rules || {}) },
      };
      registry.set(family, entry);
      registrationSources.set(family, currentSource(key, family));
      return entry;
    }

    function get(family) { return registry.get(String(family || '').trim()) || null; }

    function getRules(family, section) {
      const entry = get(family);
      if (!entry) return null;
      return section ? (entry.rules?.[section] || null) : (entry.rules || null);
    }

    const toMatchEntry = ({ family, label, tokens, targets, priority, multiOutput }) => ({
      family, label: label || family, tokens: tokens || [], targets: targets || [], priority: priority || 0, multiOutput: multiOutput === true,
    });

    // strict：依註冊順序；merge：依 priority 由高到低（detectFamily 取第一個命中，順序即結果）。
    function getMatchRules() {
      const entries = [...registry.values()];
      if (!isStrict()) entries.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
      return entries.map(toMatchEntry);
    }

    // ── detectFamily：strict 計分版 ──
    function scoreCandidate(label, candidate, entry) {
      if (!candidate) return null;
      const exactOnly = registryMode() === 'strictExact';
      if (label === candidate) return { exact: 1, length: candidate.length, priority: Number(entry.priority || 0) };
      if (!exactOnly && (label.includes(candidate) || candidate.includes(label))) return { exact: 0, length: candidate.length, priority: Number(entry.priority || 0) };
      return null;
    }
    function compareScore(a, b) {
      if (a.score.exact !== b.score.exact) return b.score.exact - a.score.exact;
      if (a.score.length !== b.score.length) return b.score.length - a.score.length;
      if (a.score.priority !== b.score.priority) return b.score.priority - a.score.priority;
      return 0;
    }
    function detectFamilyScored(label, labelParts, fallback) {
      const matches = [];
      registry.forEach((entry) => {
        const candidates = [...(entry.targets || []), ...(entry.tokens || [])].map(normalize).filter(Boolean);
        let best = null;
        candidates.forEach((candidate) => {
          const score = scoreCandidate(label, candidate, entry);
          if (!score) return;
          if (!best || compareScore({ score }, { score: best }) < 0) best = score;
        });
        if (best) matches.push({ entry, score: best });
      });
      if (!matches.length) return fallback;
      matches.sort(compareScore);
      if (matches.length > 1 && compareScore(matches[0], matches[1]) === 0 && matches[0].entry.family !== matches[1].entry.family) {
        throw new Error(`Rule Family 判斷衝突：「${Array.isArray(labelParts) ? labelParts.join(' ') : labelParts}」同時命中 ${matches[0].entry.family} / ${matches[1].entry.family}`);
      }
      return matches[0].entry.family;
    }
    // ── detectFamily：merge 取第一個命中版 ──
    function detectFamilyFirstMatch(label, fallback) {
      const matched = getMatchRules().find((entry) => {
        const candidates = [...(entry.targets || []), ...(entry.tokens || [])].map(normalize).filter(Boolean);
        return candidates.some((candidate) => label === candidate || label.includes(candidate) || candidate.includes(label));
      });
      return matched?.family || fallback;
    }
    function detectFamily(labelParts = [], fallback = null) {
      const label = normalize(Array.isArray(labelParts) ? labelParts.join(' ') : labelParts);
      if (!label) return fallback;
      return isStrict() ? detectFamilyScored(label, labelParts, fallback) : detectFamilyFirstMatch(label, fallback);
    }

    // 同時支援頂層 `sheetParser`（B 系／KV／OM）與 `rules.parseSheetBlocks`（A 系）兩種 API；
    // 回傳物件同時帶 parse 與 parseSheetBlocks，core 兩種取法都能用。
    function getSheetParsers() {
      return [...registry.values()]
        .map((entry) => {
          const parse = typeof entry.sheetParser === 'function'
            ? entry.sheetParser
            : (typeof entry.rules?.parseSheetBlocks === 'function' ? entry.rules.parseSheetBlocks : null);
          return parse
            ? { family: entry.family, label: entry.label || entry.family, priority: Number(entry.priority || 0), parse, parseSheetBlocks: parse }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.priority - a.priority);
    }

    function list() { return [...registry.values()].map(toMatchEntry); }

    return Object.freeze({ register, get, getRules, getMatchRules, detectFamily, getSheetParsers, list });
  }

  if (!window.TemplateRuleRegistry) window.TemplateRuleRegistry = createRegistry();
  if (!window.TemplateRuleManager) {
    window.TemplateRuleManager = Object.freeze({
      normalize,
      register: (...args) => window.TemplateRuleRegistry.register(...args),
      get: (...args) => window.TemplateRuleRegistry.get(...args),
      getRules: (...args) => window.TemplateRuleRegistry.getRules(...args),
      getMatchRules: (...args) => window.TemplateRuleRegistry.getMatchRules(...args),
      detectFamily: (...args) => window.TemplateRuleRegistry.detectFamily(...args),
      getSheetParsers: (...args) => window.TemplateRuleRegistry.getSheetParsers(...args),
      list: (...args) => window.TemplateRuleRegistry.list(...args),
    });
  }

  // ── 依 manifest 逐支載入 ──
  const manifest = window.TemplateRulesManifest || {};
  const requested = [...new Set((Array.isArray(manifest.ruleFiles) ? manifest.ruleFiles : []).map((value) => String(value || '').trim()).filter(Boolean))];
  const loaded = [];
  const failed = [];

  function loadRuleScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.async = false;
      el.src = src;
      el.dataset.templateRuleSrc = src;
      el.addEventListener('load', () => { loaded.push(src); resolve(src); }, { once: true });
      el.addEventListener('error', () => {
        const error = new Error(`Rule 載入失敗：${src}`);
        failed.push({ src, message: error.message });
        reject(error);
      }, { once: true });
      document.head.appendChild(el);
    });
  }

  const ready = (async () => {
    const continueOnError = flag('rules.loadFailurePolicy', 'reject') === 'continue';
    for (const src of requested) {
      try { await loadRuleScript(src); }
      catch (error) {
        console.error('[TemplateRulesLoader]', error);
        if (!continueOnError) throw error;
      }
    }
    return { registry: window.TemplateRuleRegistry, loadedRuleFiles: loaded.slice(), failedRuleFiles: failed.slice() };
  })();

  window.TemplateRulesLoader = Object.freeze({ requestedRuleFiles: requested, loadedRuleFiles: loaded, failedRuleFiles: failed, registry: window.TemplateRuleRegistry, ready });
})();
