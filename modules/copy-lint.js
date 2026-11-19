/* 整合版（25節）— 文案規則：自動校正＋文案檢查（2026-11-13 二校二修 V2 #4，自 18節 整合版搬入）
 *
 * 規則資料在 config/copy-rules.js（GD 的「警語智慧偵測」規則搬過來）。18節 第一期（2026-11-12）決定：
 *   自動改字：只有「用字替換」（撒→灑）——匯入工單時改工單文字（record），面板／畫布打字時即時改；價格層不動。
 *   只提示（進診斷，不改字）：禁用語（紅）、主標 8／副標 7／警語 14 字（中文 1、其他 0.5）、主副標標點與中文旁空格、
 *   數字缺 $／千分位的建議寫法、警語日期區間符號不是「M/D - M/D」、主副標有蝦幣但警語沒補條件。
 *   不做：日期自動補「一日限定」、小字砍字、蝦幣勾選面板。第二期（同日）把 $／千分位／空格／日期區間改成自動校正，全部工具都開。
 * 25節 差異：字數上限依工具（CopyRules.charLimitsByProfile）、放行 5.25 式日期／「25號」／MS 的「|」、
 *   修正 18節 的「滿$999折$100」被改成「滿999折$100」（折 後面接數字或 $ 時不是單位，前面的 $ 要留著）。
 *
 * 圖層怎麼認：主標＝key／psdName 含「主標」或 title（不含副）；副標＝含「副標」或 subtitle；警語＝含「警語／法務／legal」。
 * 價格層（source=auto_price_v2）、品名、主持人名稱不檢查。
 * 純函式（replaceWords／weightedLength／lint…）掛在 window.CopyLint，Node 也能 require 跑單元測試（tests/run-copy-lint.js）。
 */
(function initCopyLint(root) {
  'use strict';

  const rules = () => root.CopyRules || {};
  const clean = (value) => String(value ?? '').replace(/_x000d_/gi, '\n').replace(/\r\n?/g, '\n');
  const CJK_RE = /[一-鿿]/;

  // ── 用字替換（會改字） ──
  function replaceWords(text) {
    let out = String(text ?? '');
    (rules().replacements || []).forEach(([from, to]) => { if (from) out = out.split(from).join(to); });
    return out;
  }

  // ── 字數：中文字 1，其他（英數、半形／全形標點）0.5 ──
  function weightedLength(text) {
    let total = 0;
    for (const ch of String(text ?? '').replace(/\n/g, '')) total += CJK_RE.test(ch) ? 1 : 0.5;
    return total;
  }

  // ── 圖層分類 ──
  function classifyLayer(key, layer) {
    if (!layer || layer.type !== 'text' || layer.source === 'auto_price_v2') return null;
    const label = `${key || ''} ${layer.psdName || ''} ${layer.name || ''}`.toLowerCase();
    if (/副標|subtitle/.test(label)) return 'subtitle';
    if (/警語|法務|legal/.test(label)) return 'legal';
    if (/主標|title/.test(label)) return 'title';
    return null;
  }

  // ── 主／副標：標點、中文旁空格 ──
  function headlineIssues(text) {
    const issues = [];
    const allowed = rules().headlineAllowedChars || '\\u4e00-\\u9fffA-Za-z0-9 $%';
    const tokens = rules().headlineAllowedTokens || [];
    // 日期／時間這類放行片段先換成「0」（連同它後面那一個空格），再檢查標點與空格
    let scrubbed = String(text).replace(/\n/g, '');
    tokens.forEach((token) => { scrubbed = scrubbed.replace(new RegExp(`(${token}) ?`, 'g'), '0'); });
    scrubbed = scrubbed
      .replace(/(\d),(?=\d{3})/g, '$1')
      .replace(/(\d)\.(?=\d+(折|%))/g, '$1');
    const bad = scrubbed.match(new RegExp(`[^${allowed}]`, 'g'));
    if (bad) issues.push(`有標點／符號：${[...new Set(bad)].join(' ')}`);
    if (/[一-鿿] | [一-鿿]/.test(scrubbed)) issues.push('中文旁有空格');
    return issues;
  }

  // ── 數字格式建議（第二期會自動套）：有價格字或 $ 才補 $＋千分位；接 蝦幣／%／折 只補千分位 ──
  function suggestNumberFormat(text) {
    const r = rules();
    const prefix = r.pricePrefixes || '滿|折|省|最高';
    // 「折」後面接數字或 $（滿1500折150、滿$999折$100）是下一段的開頭，不是這個數字的單位
    const units = (r.noDollarUnits || '蝦幣|%|折').replace(/折(?!\()/g, '折(?![\\d$])');
    const skipAfter = new RegExp(`^(${r.skipAfterUnits || '月|日|號|個|件|組|人|次|款|色|天|週|年'})`);
    const re = new RegExp(`(${prefix})?(\\$)?(\\d[\\d,]*)(${units})?`, 'g');
    // 「數字元」＝金額：先換成「$數字」，再走下面的千分位（100元 → $100、滿1000元 → 滿$1,000）
    const yuan = r.yuanUnit;
    const source = yuan ? String(text).replace(new RegExp(`(^|[^A-Za-z.\\/:$\\d])(\\d[\\d,]*)${yuan}(?![\\u4e00-\\u9fff]*?折)`, 'g'), '$1$$$2') : String(text);
    return source.replace(re, (match, pre, dollar, digits, unit, offset, full) => {
      pre = pre || '';
      const digitsClean = digits.replace(/,/g, '');
      if (!digitsClean) return match;
      const digitStart = offset + pre.length + (dollar ? 1 : 0);
      const before = full[digitStart - 1] || '';
      const after = full[offset + match.length] || '';
      if (/[A-Za-z.\/:]/.test(before) || (!unit && /[A-Za-z.\/:]/.test(after))) return match;
      if (!unit && skipAfter.test(full.slice(offset + match.length))) return match;
      const formatted = Number(digitsClean).toLocaleString('en-US');
      if (unit) return `${pre}${dollar || ''}${formatted}${unit}`;
      if (dollar || pre) return `${pre}$${formatted}`;
      return match;
    });
  }

  // ── 主／副標：標點直接刪（使用者 2026-11-19 決定；警語仍只提示）──
  // 放行的跟 headlineIssues 同一套：允許字元表、日期／時間等放行片段、1,000 的逗號、8.5折 的小數點；其餘標點／符號刪掉。
  function removeHeadlinePunctuation(text) {
    const source = String(text ?? '');
    const allowed = new RegExp(`[${rules().headlineAllowedChars || '\\u4e00-\\u9fffA-Za-z0-9 $%'}\\n]`);
    const keep = new Uint8Array(source.length);
    const protect = (re) => { let m; const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`); while ((m = g.exec(source))) { for (let i = m.index; i < m.index + m[0].length; i += 1) keep[i] = 1; if (!m[0]) g.lastIndex += 1; } };
    (rules().headlineAllowedTokens || []).forEach((token) => protect(new RegExp(token)));
    protect(/\d,(?=\d{3})/);
    protect(/\d\.(?=\d+(折|%))/);
    let out = '';
    for (let i = 0; i < source.length; i += 1) { const ch = source[i]; if (keep[i] || allowed.test(ch)) out += ch; }
    return out;
  }

  // ── 警語日期區間：只接受「M/D - M/D」（dash 前後各一個空格） ──
  function legalDateIssue(text) {
    const m = String(text).match(/\d{1,2}\/\d{1,2}(\s*[-~～－—–至到]\s*)\d{1,2}\/\d{1,2}/);
    if (!m || m[1] === ' - ') return '';
    return `日期區間符號請用「 - 」（前後各一個空格）：${m[0]}`;
  }

  // ── 第二期（2026-11-12 OKGO）：自動校正，全部工具都開 ──
  //   主／副標：補 $＋千分位（suggestNumberFormat）、刪中文旁空格（日期／時間後那一個空格保留）
  //   警語：補 $＋千分位、日期區間統一成「M/D - M/D」
  //   其他文案：只做用字替換
  function removeHeadlineSpaces(text) {
    const tokens = rules().headlineAllowedTokens || [];
    const keep = [];
    let out = String(text);
    // 先把「日期／時間＋後面一個空格」藏起來，刪完空格再放回
    tokens.forEach((token) => {
      out = out.replace(new RegExp(`(${token}) `, 'g'), (match) => { keep.push(match); return `\u0000${keep.length - 1}\u0000`; });
    });
    out = out.replace(/\s+(?=[一-鿿])/g, '').replace(/(?<=[一-鿿])[ \t]+/g, '');
    return out.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)]);
  }
  function normalizeDateRange(text) {
    return String(text).replace(/(\d{1,2}\/\d{1,2})\s*[-~～－—–至到]\s*(\d{1,2}\/\d{1,2})/g, '$1 - $2');
  }
  /** 工具專屬選項（CopyRules.profileOptions[profileId]），沒有就是空物件。 */
  function optionsFor(profileId) { return (profileId && rules().profileOptions?.[profileId]) || {}; }
  /** 依文案種類套用全部自動校正（kind：title／subtitle／legal／其他；profileId 可關掉工具專屬規則）。 */
  function autoCorrect(text, kind, profileId) {
    let out = replaceWords(text);
    if (kind === 'title' || kind === 'subtitle') {
      out = removeHeadlinePunctuation(suggestNumberFormat(out));
      if (!optionsFor(profileId).keepHeadlineSpaces) out = removeHeadlineSpaces(out);
    }
    else if (kind === 'legal') out = normalizeDateRange(suggestNumberFormat(out));
    return out;
  }
  /** 工單欄位名 → 文案種類（主標／副標／警語；品名、CTA 等不算）。 */
  function classifyField(key) {
    const label = String(key || '').toLowerCase();
    if (/品名|cta|按鈕|主持|直播主/.test(label)) return null;
    if (/副標|subtitle/.test(label)) return 'subtitle';
    if (/警語|法務|legal|小字/.test(label)) return 'legal';
    if (/主標|title/.test(label)) return 'title';
    return null;
  }

  // ── 一張製作物的檢查結果 ──
  /** 字數上限：依工具（profile）覆蓋，沒列的用共用值。 */
  function charLimitsFor(profileId) {
    const r = rules();
    return { ...(r.charLimits || {}), ...((profileId && r.charLimitsByProfile?.[profileId]) || {}) };
  }

  function lintTemplate(template, profileId) {
    const r = rules();
    const out = [];
    const layers = Object.entries(template?.layers || {});
    const byKind = { title: [], subtitle: [], legal: [] };
    layers.forEach(([key, layer]) => {
      const kind = classifyLayer(key, layer);
      if (!kind || layer.hidden) return;
      const text = clean(layer.text).trim();
      if (!text) return;
      byKind[kind].push({ key, layer, text, label: layer.psdName || key });
    });
    const limits = charLimitsFor(profileId);
    const keepSpaces = !!optionsFor(profileId).keepHeadlineSpaces;
    const kindLabel = { title: '主標', subtitle: '副標', legal: '警語' };

    Object.entries(byKind).forEach(([kind, items]) => items.forEach(({ text, label }) => {
      const banned = (r.bannedPhrases || []).find((phrase) => text.includes(phrase));
      if (banned) out.push({ tier: 'critical', kind: '禁用語', detail: `${label}：「${banned}」不能用（${text}）` });
      const limit = Number(limits[kind]);
      const length = weightedLength(text);
      if (limit > 0 && length > limit) out.push({ tier: 'important', kind: '字數超過上限', detail: `${label}：${Number.isInteger(length) ? length : length.toFixed(1)} 字，${kindLabel[kind]}上限 ${limit}（中文 1、英數符號 0.5）` });
      if (kind !== 'legal') headlineIssues(text).filter((issue) => !(keepSpaces && issue === '中文旁有空格')).forEach((issue) => out.push({ tier: 'important', kind: '主副標文案格式', detail: `${label}：${issue}` }));
      const suggested = suggestNumberFormat(text);
      if (suggested !== text) out.push({ tier: 'important', kind: '數字格式建議', detail: `${label}：${text} → ${suggested}` });
      if (kind === 'legal') { const issue = legalDateIssue(text); if (issue) out.push({ tier: 'important', kind: '警語日期格式', detail: `${label}：${issue}` }); }
    }));

    // 蝦幣：主副標提到蝦幣 → 警語要補條件（需領券／滿$…／最高…蝦幣）
    const shrimp = r.shrimpKeyword || '蝦幣';
    const headline = [...byKind.title, ...byKind.subtitle].map((it) => it.text).join(' ');
    if (headline.includes(shrimp)) {
      const legalText = byKind.legal.map((it) => it.text).join(' ');
      const ok = new RegExp(r.shrimpLegalPattern || '需領券|滿\\$[\\d,]+|最高[\\d,]+蝦幣').test(legalText);
      if (!ok) out.push({ tier: 'important', kind: '蝦幣警語未補條件', detail: `主／副標提到「${shrimp}」，警語應補上領券／門檻／上限（例：需領券滿$1,000最高享300蝦幣）；目前警語：${legalText || '（空白）'}` });
    }
    return out;
  }

  const api = { replaceWords, weightedLength, classifyLayer, classifyField, headlineIssues, suggestNumberFormat, legalDateIssue, removeHeadlinePunctuation, removeHeadlineSpaces, normalizeDateRange, autoCorrect, charLimitsFor, optionsFor, lintTemplate };
  root.CopyLint = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  // ── 接線（瀏覽器） ──

  // 工單欄位：素材／檔名／網址這類不是文案的欄位不動（改到素材名就找不到圖）
  // 規則檔自己拆出來的欄位（__rawCopy／__copyLines／__compactCopy…）也要改，不然跨夜 AR 這類從 __copyLines 抄字的版位改不到。
  // 25節 另外跳過 __sourceCells（整列原始值，含素材檔名）、__hostName（鏡面主持人）、__outputName（輸出檔名）。
  const SKIP_RECORD_KEY = /商品圖|素材|圖檔|圖片|檔名|網址|連結|編號|路徑|logo|icon|直播主|主持人|hosts|資料夾|folder|route|project|media|size|layout|popup|asset|template|sheet|sourceCells|hostName|outputName/i;
  const activeProfile = () => root.ProfileLoader?.active?.id || '';
  function correctValue(value, kind) {
    if (typeof value === 'string') return autoCorrect(value, kind, activeProfile());
    if (Array.isArray(value)) return value.map((item) => correctValue(item, kind));
    return value;
  }
  function correctRecord(record) {
    if (!record || typeof record !== 'object') return;
    Object.keys(record).forEach((key) => {
      const value = record[key];
      if (SKIP_RECORD_KEY.test(key)) return;
      if (typeof value !== 'string' && !Array.isArray(value)) return;
      // 主標／副標／警語欄位套全部校正；其他欄位（含規則檔拆出的 __copyLines）只做用字替換
      const next = correctValue(value, classifyField(key));
      if (JSON.stringify(next) !== JSON.stringify(value)) record[key] = next;
    });
  }

  function wireBatch() {
    const BatchManager = root.BatchManager;
    if (!BatchManager?.applyRecordToTemplate || BatchManager.applyRecordToTemplate.__copyLintWired) return;
    const original = BatchManager.applyRecordToTemplate;
    const wrapped = function applyRecordWithCopyRules(template, record, ...rest) {
      try { correctRecord(record); } catch (_) { /* 規則壞了也不能擋產圖 */ }
      return original.call(this, template, record, ...rest);
    };
    wrapped.__copyLintWired = true;
    BatchManager.applyRecordToTemplate = wrapped;
  }

  // 面板／畫布打字：在 input 事件的擷取階段先把值改掉，後面的處理（adjust-panel、Inspector.applyTextFromInputs）讀到的就是改過的
  function wireTyping() {
    const fieldOf = (target) => {
      const { AppState } = root;
      const key = target.closest('#itemTextFields .item-text-field')?.dataset.layerKey || (target.id === 'textInput' ? AppState?.selectedLayers?.[0] : '');
      const layer = key ? AppState?.template?.layers?.[key] : null;
      return layer ? classifyLayer(key, layer) : null;
    };
    // 只接文字欄位：面板裡的色票是 <input type=color>，值是「#12ab34」，拿去刪標點會把 # 刪掉變成無效色（2026-11-19 主副標刪標點後踩到）
    const isTextField = (target) => target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && /^(text|search|)$/i.test(target.type || ''));
    const isCopyField = (target) => isTextField(target) && !!(target.closest('#itemTextFields') || target.id === 'textInput');
    // 離開欄位（change）：依圖層種類套全部校正（$／千分位／空格／日期區間），改了就再送一次 input 讓面板與 Inspector 吃到
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (!isCopyField(target)) return;
      const next = autoCorrect(target.value, fieldOf(target), activeProfile());
      if (next === target.value) return;
      target.value = next;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }, true);
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (!isCopyField(target)) return;
      const next = replaceWords(target.value);
      if (next === target.value) return;
      const { selectionStart, selectionEnd } = target;
      target.value = next;
      try { target.setSelectionRange(selectionStart, selectionEnd); } catch (_) { /* 非文字欄位 */ }
    }, true);
  }

  // 畫布上雙擊直接改字（core TextEditor，不是 input 欄位）：按 Enter／點外面確認時，先把要寫回的文字校正，再交給 core
  function wireCanvasEditor() {
    const TextEditor = root.TextEditor;
    if (!TextEditor?.commit || TextEditor.commit.__copyLintWired) return;
    const original = TextEditor.commit;
    const wrapped = function commitWithCopyRules(...args) {
      try {
        const { AppState } = root;
        const key = AppState?.editingLayerKey;
        const layer = key ? AppState.template?.layers?.[key] : null;
        const editor = document.getElementById('inlineTextEditor');
        if (layer && layer.type === 'text') {
          const current = AppState.editingText ?? (editor ? (editor.value ?? editor.innerText) : layer.text);
          const next = autoCorrect(String(current ?? '').replace(/\n$/, ''), classifyLayer(key, layer), activeProfile());
          if (next !== String(current ?? '').replace(/\n$/, '')) {
            AppState.editingText = next;
            if (editor) { if ('value' in editor && typeof editor.value === 'string') editor.value = next; else editor.innerText = next; }
          }
        }
      } catch (_) { /* 校正失敗就照原文送出 */ }
      return original.apply(this, args);
    };
    wrapped.__copyLintWired = true;
    TextEditor.commit = wrapped;
  }

  function main() {
    const whenReady = () => { if (root.__coreScriptsReady && root.__appReady) Promise.resolve(root.__appReady).then(() => { wireBatch(); wireTyping(); wireCanvasEditor(); }); else setTimeout(whenReady, 100); };
    whenReady();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})(typeof window !== 'undefined' ? window : globalThis);
