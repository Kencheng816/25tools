/* 跨夜直播宣傳圖：工單解析、公版分流與套版規則。
 *
 * 移植自 18節Tool_跨夜直播宣傳圖 V0.9 的 rules/crossnight-live-promo.rules.js，
 * 依 25節 基底（app.core.js V0.1）調整之處：
 *   1. 主持人名單改由工單的「🔽主持人圖素🔽」區塊提供預設（第一位→主持人_A、第二位→主持人_B）；
 *      個別版位的文案若另外寫了「主持人：X」，該列以文案為準（維持 18節 的 per-版位 行為）。
 *   2. P_範圍 改為「只裁下緣」的遮罩（__maskEdges = 'bottom'），左／右／上可自由超出；
 *      下緣在 P_範圍 自己的 x 範圍內沿用其左下／右下圓角。套用到所有含 P_範圍 的公版。
 *   3. 主持人陰影顏色 #be031b（18節 為 #ab2222），其餘參數不變。
 *   4. 主持人_A/B 註冊為手動上傳槽（點擊選檔／拖曳放入／Delete 清除後可重新上傳），
 *      並註冊為跨版位連動的圖層（依 P_範圍 為參考框、以中心點比例同步）。
 *   5. 共用素材補正：25節 的公版 JSON 把共用素材寫成各公版前綴的檔名
 *      （例：HBN_跨夜直播派對_LOGO.png），實際檔案在 assets 根目錄或 assets/共用素材/，
 *      因此在套版時統一改寫成真正的檔名。
 *   6. 直播大廳_LPBN 的 CTA 圖層名為「CTA-立即看_白」（連字號），非 18節 的「CTA_立即看_白」。
 *
 * 文案解析維持 18節 原樣：只認「標籤：值」格式，標籤後沒有冒號的行視為未填、不套用。
 */
(function registerCrossnightLivePromoRules() {
  'use strict';

  const FAMILY = 'crossnight_live_promo';

  // 這些公版輸出 PNG（需要透明或色階乾淨），其餘輸出 JPG。沿用 18節 設定。
  const PNG_TEMPLATE_IDS = new Set([
    'Floating icon',
    '首頁A1 Floating icon',
    'Game BN',
    'OA_MSBN BAU',
    'OA_MSBN DD',
    'POPUP',
    '直播間POPUP',
  ]);

  // 主持資訊（主持／白色直線／主持人名稱）需要依實際量測寬度置中的公版。
  // 注意：IG／開播字卡 的「來賓_BG」是滿版寬度橫條（x=0、寬=畫布寬），不納入群組。
  const CENTERED_HOST_META_TEMPLATE_IDS = new Set([
    'IG',
    '開播字卡_1080x1920',
  ]);

  // 主標題底色需要依標題實際寬度伸縮的公版（含左右三角形）。
  const OA_TITLE_BACKGROUND_TEMPLATE_IDS = new Set([
    'OA_MSBN DD',
    'OA_MSBN BAU',
  ]);

  const OA_TITLE_BACKGROUND_PADDING_PX = 35;
  const OA_TITLE_BACKGROUND_CORNER_RADII = Object.freeze({
    topLeft: 0,
    topRight: 0,
    bottomRight: 50,
    bottomLeft: 50,
  });

  const HOST_LAYER_KEYS = Object.freeze(['主持人_A', '主持人_B']);
  // 主持人「陰影」一律不得溢出 P_範圍：只要公版有 P_範圍，陰影就套一層完整
  // P_範圍 遮罩（左/右/上/下都裁，含圓角）。陰影往右下偏移 15px 再模糊 40px，
  // 很容易跑到 P_範圍 外；PNG 輸出的公版背景是透明的，溢出會非常明顯。
  // 主持人圖片本身不受影響，仍維持「只裁下緣、左/右/上可自由超出」（Q13）。
  const HOST_GUIDE_LAYER_NAME = 'P_範圍';
  const HOST_META_LAYER_KEYS = Object.freeze(['主持', '主持人名稱', '主持人名稱_BG']);
  // 主持資訊的分隔線。各公版名稱不一致（OA_MSBN×2 與 IG／開播字卡是「白色直線」，
  // 直播大廳_LPBN 是「白色直線_2」，而 LPBN 的「白色直線」在畫面上方 y=68 跟主持資訊無關），
  // 所以不寫死名稱，改用「與『主持』圖層垂直重疊的 白色直線* 圖層」動態判定。
  // 沒有『主持』圖層的 13 張公版完全不會被判定到。
  const HOST_META_DIVIDER_PREFIX = '白色直線';
  const HOST_NAME_BACKGROUND_KEY = '主持人名稱_BG';
  // 決定漸層 100% 起點的「主持資訊」圖層。分隔線永遠在兩者之間，不影響最左緣，故不納入。
  const HOST_NAME_GRADIENT_ANCHOR_KEYS = Object.freeze(['主持', '主持人名稱']);
  // 100% 不透明的起點：主持資訊視覺最左緣再往左推這麼多 px。
  const HOST_NAME_GRADIENT_LEAD_PX = 20;
  const HOST_ASSET_PROJECT = '主持人圖素';
  // 沒有工單時的主持人預設素材（順序與工單文案「主持人：Sunny、亞莎」一致）。
  const HOST_DEFAULT_ASSETS = Object.freeze({ '主持人_A': 'SUNNY.png', '主持人_B': '亞莎.png' });
  const HOST_SYNC_FLAG = '__hostSync';

  const HOST_DROP_SHADOW = Object.freeze({
    enabled: true,
    color: '#be031b',
    blendMode: 'multiply',
    opacity: 1,
    angleDeg: 57,
    distancePx: 15,
    spreadPx: 0,
    blurPx: 40,
  });

  // 25節 公版 JSON 內被寫成各公版前綴的共用素材 → 真正的檔名。
  // 值為 null 表示「刪掉 assetProject，交給 AssetStore 的跨資料夾比對去找」。
  const COMMON_ASSETS = Object.freeze([
    { key: '跨夜直播派對_LOGO', filename: '跨夜直播派對_LOGO.png', project: '' },
    { key: '蝦皮直播_LOGO_白', filename: '蝦皮直播_LOGO_白.svg', project: '' },
    { key: '直式_蝦皮購物_LOGO_白', filename: '直式_蝦皮購物_LOGO_白.svg', project: '' },
    { key: 'DECO_蝦幣', filename: 'DECO_蝦幣.png', project: '共用素材' },
    { key: 'DECO_票券', filename: 'DECO_票券.png', project: '共用素材' },
    { key: 'CTA-立即看_白', filename: '直播大廳_LPBN_CTA_立即看_白.png', project: '直播大廳_LPBN' },
    { key: 'CTA_X', filename: 'CTA_X.png', project: '首頁A1 Floating icon' },
  ]);

  // ── 文字工具（與 18節 一致）────────────────────────────────
  const text = (value) => String(value ?? '')
    .replace(/_x000d_/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .trim();

  const normalize = (value) => text(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

  const normalizeHeader = (value) => text(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_\-()（）【】\[\]：:]+/g, '');

  const splitNonEmptyLines = (value) => text(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const compactLine = (value) => text(value).replace(/[\s\u00a0\u3000]+/g, '');

  // 把顏色轉成指定 alpha 的 rgba()。支援 #RGB / #RRGGBB / rgb() / rgba()。
  function withAlpha(color, alpha) {
    const value = text(color);
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const digits = hex[1].length === 3
        ? hex[1].split('').map((d) => d + d).join('')
        : hex[1];
      const r = parseInt(digits.slice(0, 2), 16);
      const g = parseInt(digits.slice(2, 4), 16);
      const b = parseInt(digits.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
    return `rgba(0,0,0,${alpha})`;
  }
  const characterCount = (value) => Array.from(compactLine(value)).length;

  function parseDimensions(value) {
    const match = text(value).normalize('NFKC').match(/(\d{2,4})\s*(?:px)?\s*[x×＊*]\s*(\d{2,4})\s*(?:px)?/i);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return { width, height, label: `${width}x${height}` };
  }

  function parseKLimit(value) {
    const raw = text(value).normalize('NFKC');
    if (!raw || /^x$/i.test(raw)) return null;
    if (parseDimensions(raw)) return null;
    const match = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const kiloBytes = Number(match[1]);
    return Number.isFinite(kiloBytes) && kiloBytes > 0 ? Math.floor(kiloBytes * 1000) : null;
  }

  function parseHosts(value) {
    return text(value)
      .split(/[、,，;；]+/)
      .map((name) => name.trim())
      .filter(Boolean);
  }

  function stripLogoHint(line) {
    const value = text(line);
    return /^[\[【].*logo.*[\]】]$/i.test(value) ? '' : value;
  }

  function stripCtaArrow(value) {
    const cleaned = text(value).replace(/[\s▸▶►>]+$/g, '').trim();
    return /^x$/i.test(cleaned) ? '' : cleaned;
  }

  function parseStandardCopy(rawCopy) {
    const result = { 主標: '', 副標: '', 時間: '', hosts: [] };
    splitNonEmptyLines(rawCopy).forEach((line) => {
      if (!stripLogoHint(line)) return;
      const match = line.match(/^\s*(主標題?|副標題?|時間|主持人)\s*[:：]\s*(.*)$/i);
      if (!match) return;
      const label = normalizeHeader(match[1]);
      const value = text(match[2]);
      if (label === normalizeHeader('主標') || label === normalizeHeader('主標題')) result.主標 = value;
      else if (label === normalizeHeader('副標') || label === normalizeHeader('副標題')) result.副標 = value;
      else if (label === normalizeHeader('時間')) result.時間 = value;
      else if (label === normalizeHeader('主持人')) result.hosts = parseHosts(value);
    });
    return result;
  }

  // 只去掉「已知欄位標籤」的前綴，不是「冒號前面全砍」——
  // 文案本身含冒號時（例如「限時：買一送一」）必須完整保留。
  const FIELD_LABEL_PREFIX = /^\s*(主標題|主標|副標題|副標|時間)\s*[:：]\s*/;
  const stripFieldLabel = (line) => text(line).replace(FIELD_LABEL_PREFIX, '');

  // OA_MSBN BAU / DD 共用的文案解析：**由上到下依序**帶入 主標題 / 副標題 / 時間。
  //   - 先移除 [...Logo] 這種提示行與空行
  //   - 「主持人：X、Y」那行單獨抽出來當主持人，不佔內容行的位置
  //   - 剩下的行依序對應 主標 / 副標 / 時間；每行若帶已知標籤前綴就把標籤去掉只取值
  // 這樣同一份程式能吃兩種寫法：
  //   DD  版（無標籤）：4/17 超殺優惠等著你 / 整晚蝦幣領不完 / 一起跨夜清空購物車
  //   BAU 版（有標籤）：主標：… / 副標：… / 時間：…
  function parseOaSequentialCopy(rawCopy) {
    const lines = splitNonEmptyLines(rawCopy).filter((line) => stripLogoHint(line));
    const hostLineIndex = lines.findIndex((line) => /^\s*主持人\s*[:：]/.test(line));
    const hosts = hostLineIndex >= 0
      ? parseHosts(lines[hostLineIndex].replace(/^\s*主持人\s*[:：]\s*/, ''))
      : [];
    const contentLines = lines
      .filter((_, index) => index !== hostLineIndex)
      .map(stripFieldLabel)
      .filter(Boolean);
    return {
      主標: text(contentLines[0]),
      副標: text(contentLines[1]),
      時間: text(contentLines[2]),
      hosts,
    };
  }

  // ── 公版分流（沿用 18節）──────────────────────────────────
  function routeFor(position, dimensions) {
    const key = normalize(position);
    const size = dimensions?.label || '';
    const route = (templateId, outputPrefix, extra = {}) => ({
      key: FAMILY,
      family: FAMILY,
      label: position,
      templateId,
      templateFile: `${templateId}.json`,
      outputPrefix,
      ...extra,
    });

    if (key.includes(normalize('OA MSBN')) && key.includes(normalize('BAU版'))) {
      return route('OA_MSBN BAU', '01.OA_MSBN_BAU');
    }
    if (key.includes(normalize('OA MSBN')) && key.includes(normalize('DD版'))) {
      return route('OA_MSBN DD', '01.OA_MSBN_DD');
    }
    if (key.includes(normalize('01.MSBN')) || key === normalize('MSBN')) {
      return route('MSBN', '01.MSBN_輪播');
    }
    if (key.includes(normalize('02.HBN')) || key === normalize('HBN')) {
      if (size === '531x792') return route('DD Banner Card', '02.HBN');
      if (size === '1200x360') return route('HBN', '02.HBN');
      return null;
    }
    if (key.includes(normalize('直播大廳 LP BN'))) {
      const showImmediateCta = key.includes(normalize('立即看'));
      return route('直播大廳_LPBN', showImmediateCta ? '03.直播大廳_LP_BN_立即看' : '03.直播大廳_LP_BN', { showImmediateCta });
    }
    if (key.includes(normalize('04.直播時縮圖'))) return route('直播時縮圖', '04.直播時縮圖');
    if (key.includes(normalize('5.PN/AR')) || key.includes(normalize('PN/AR'))) return route('AR', '5.PN_AR');
    if (key.includes(normalize('06.GAME BN')) || key.includes(normalize('GAME BN'))) return route('Game BN', '06.GAME_BN');
    if (key.includes(normalize('08.coins page')) && key.includes(normalize('BAU'))) return route('Coin page BN_BAU', '08.coins_page_BAU');
    if (key.includes(normalize('08.coins page')) || key.includes(normalize('coins page'))) return route('Coin page BN', '08.coins_page');
    // 工單的位置欄可能直接寫「09.直播間POPUP」，正規化後是「09直播間popup」，
    // 比對不到下面的「09popup」。這條要排在一般 POPUP 之前。
    if (key.includes(normalize('直播間POPUP')) || key.includes(normalize('直播間 POPUP'))) {
      return route('直播間POPUP', '09.POPUP');
    }
    if (key.includes(normalize('09.POPUP')) || key === normalize('POPUP')) {
      if (size === '580x720') return route('POPUP', '09.POPUP');
      if (size === '870x1160') return route('直播間POPUP', '09.POPUP');
      return null;
    }
    if (key.includes(normalize('10.Floating Icon')) || key.includes(normalize('Floating Icon'))) {
      if (size === '336x120') return route('Floating icon', '10.Floating_Icon');
      if (size === '360x360') return route('首頁A1 Floating icon', '10.Floating_Icon');
      return null;
    }
    if (key.includes(normalize('11.IG')) || key === normalize('IG')) return route('IG', '11.IG');
    if (key.includes(normalize('12.開播字卡')) || key.includes(normalize('開播字卡'))) return route('開播字卡_1080x1920', '12.開播字卡');
    if (key.includes(normalize('13.FB POST')) || key.includes(normalize('FB POST'))) return route('FB POST', '13.FB_POST');
    return null;
  }

  // IG 的尺寸欄在 Excel 會被存成時間值（9:16 → 09:16:00），開播字卡有時也留空，
  // 這兩個版位的尺寸是固定的，讀不到就用固定值補上。
  function fallbackDimensions(position) {
    const key = normalize(position);
    if (key.includes(normalize('11.IG')) || key === normalize('IG')) return { width: 900, height: 1600, label: '900x1600' };
    if (key.includes(normalize('12.開播字卡'))) return { width: 1080, height: 1920, label: '1080x1920' };
    return null;
  }

  function findHeader(rows) {
    const aliases = {
      position: new Set(['位置', '使用位置'].map(normalizeHeader)),
      kLimit: new Set(['k數', 'k数', '容量', '檔案大小'].map(normalizeHeader)),
      size: new Set(['尺寸', 'size'].map(normalizeHeader)),
      copy: new Set(['文案', '文字'].map(normalizeHeader)),
      cta: new Set(['cta', '按鈕'].map(normalizeHeader)),
      note: new Set(['備註', '說明'].map(normalizeHeader)),
    };

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const columnMap = {};
      row.forEach((cell, columnIndex) => {
        const normalized = normalizeHeader(cell);
        if (!normalized) return;
        Object.entries(aliases).forEach(([field, values]) => {
          if (columnMap[field] === undefined && values.has(normalized)) columnMap[field] = columnIndex;
        });
      });
      const hasRequired = columnMap.position !== undefined && columnMap.copy !== undefined;
      const hasSupporting = columnMap.kLimit !== undefined || columnMap.size !== undefined || columnMap.cta !== undefined;
      if (hasRequired && hasSupporting) return { rowIndex, columnMap };
    }
    return null;
  }

  function buildRecord({ row, rowIndex, position, dimensions, kLimitRaw, rawCopy, rawCta, route }) {
    const record = {
      主標: '',
      副標: '',
      文案: '',
      CTA: stripCtaArrow(rawCta),
      版位: position,
      __workflow: 'crossnight-live-promo',
      __rawCopy: text(rawCopy),
      __sourceRow: rowIndex + 1,
      __position: position,
      __width: dimensions.width,
      __height: dimensions.height,
      __size: dimensions.label,
      __kLimitBytes: parseKLimit(kLimitRaw),
      __route: route,
      __templateId: route.templateId,
      __showImmediateCta: route.showImmediateCta === true,
      __specFormat: PNG_TEMPLATE_IDS.has(route.templateId) ? 'png' : 'jpg',
      __outputFormat: PNG_TEMPLATE_IDS.has(route.templateId) ? 'png' : 'jpg',
      __ctaMode: 'text',
      __sourceCells: row,
      // 主持人_A/B 的跨版位連動由這個旗標啟用（不使用舊 Network 的 __multiSizeSync，
      // 那個旗標在 25節 基底還綁著白底填充與 2x 超採樣等 Network 專屬行為）。
      [HOST_SYNC_FLAG]: true,
    };

    const positionKey = normalize(position);
    if (route.templateId === 'AR') {
      const lines = splitNonEmptyLines(rawCopy).map(compactLine);
      record.__copyLines = lines;
      record.__arLayout = `${characterCount(lines[0])}/${characterCount(lines[1])}`;
      return record;
    }

    if (route.templateId === 'Floating icon' || route.templateId === '首頁A1 Floating icon') {
      record.__copyLines = splitNonEmptyLines(rawCopy).map(compactLine);
      record.__compactCopy = record.__copyLines.join('');
      return record;
    }

    // OA_MSBN 的 BAU 版與 DD 版都改用「由上到下依序」解析（兩種寫法都吃）。
    const parsed = positionKey.includes(normalize('OA MSBN'))
      ? parseOaSequentialCopy(rawCopy)
      : parseStandardCopy(rawCopy);
    record.主標 = parsed.主標;
    record.副標 = parsed.副標;
    record.時間 = parsed.時間;
    // 主持人一律來自該列文案的「主持人：X、Y」，依序填入 主持人_A、主持人_B。
    // 沒有寫這一行的版位就不放主持人（applyHosts 會隱藏 主持人_A/B 與主持資訊）。
    const copyHosts = parsed.hosts || [];
    record.__hosts = copyHosts.slice(0, HOST_LAYER_KEYS.length);
    // 保留原始位數，讓 parseSheet 能判斷「文案寫超過兩位」並在診斷報告記一筆。
    record.__copyHostCount = copyHosts.length;

    if (route.templateId === 'Game BN') record.CTA = '';
    return record;
  }

  function parseSheet({ rows }) {
    const header = findHeader(rows || []);
    if (!header) return null;

    const { rowIndex: headerRow, columnMap } = header;
    const blocks = [];
    const warnings = [];
    const skippedRows = [];
    const counters = new Map();
    const lastSizeByPosition = new Map();
    let currentPosition = '';

    for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const explicitPosition = text(row[columnMap.position]);
      if (explicitPosition) currentPosition = explicitPosition;
      if (!currentPosition) continue;

      const rawCopy = text(row[columnMap.copy]);
      const rawCta = columnMap.cta === undefined ? '' : text(row[columnMap.cta]);
      const rawSize = columnMap.size === undefined ? '' : text(row[columnMap.size]);
      const rawKLimit = columnMap.kLimit === undefined ? '' : text(row[columnMap.kLimit]);
      if (!rawCopy && !rawCta && !rawSize && !rawKLimit) continue;

      const kLimitIsDimension = !!parseDimensions(rawKLimit);
      const kLimitIsUnlimited = !rawKLimit || /^x$/i.test(rawKLimit.normalize('NFKC'));
      if (!kLimitIsDimension && !kLimitIsUnlimited && parseKLimit(rawKLimit) === null) {
        skippedRows.push({ row: rowIndex + 1, name: currentPosition, reason: `K數格式無法解析：「${rawKLimit}」，已略過` });
        continue;
      }

      const positionKey = normalize(currentPosition);
      let dimensions = parseDimensions(rawSize) || parseDimensions(rawKLimit);
      if (!dimensions) dimensions = lastSizeByPosition.get(positionKey) || fallbackDimensions(currentPosition);
      if (!dimensions) {
        skippedRows.push({ row: rowIndex + 1, name: currentPosition, reason: '讀不到有效尺寸，已略過' });
        continue;
      }
      lastSizeByPosition.set(positionKey, dimensions);

      const route = routeFor(currentPosition, dimensions);
      if (!route) {
        skippedRows.push({ row: rowIndex + 1, name: currentPosition, reason: `找不到 ${dimensions.label} 對應公版，已略過` });
        continue;
      }

      const record = buildRecord({
        row,
        rowIndex,
        position: currentPosition,
        dimensions,
        kLimitRaw: kLimitIsDimension ? '' : rawKLimit,
        rawCopy,
        rawCta,
        route,
      });

      // 文案寫了超過兩位主持人：公版只有兩個槽位，取前兩位並在診斷報告記一筆，
      // 不整列略過（略過會讓整張圖產不出來，代價比少放一位大得多）。
      if (Number(record.__copyHostCount || 0) > HOST_LAYER_KEYS.length) {
        warnings.push(`第 ${rowIndex + 1} 列「${currentPosition}」文案寫了 ${record.__copyHostCount} 位主持人，`
          + `但公版只有兩個槽位；已採用前兩位「${(record.__hosts || []).join('、')}」。`);
      }

      if (route.templateId === 'AR') {
        const supportedLayouts = new Set(['3/2', '2/3', '2/2']);
        if (record.__copyLines.length < 2 || !supportedLayouts.has(record.__arLayout)) {
          skippedRows.push({ row: rowIndex + 1, name: currentPosition, reason: `AR 尚未設定「${record.__arLayout || '無法判斷'}」字數組合，已略過` });
          continue;
        }
      }

      if (route.templateId === '首頁A1 Floating icon' && record.__copyLines.length < 2) {
        skippedRows.push({ row: rowIndex + 1, name: currentPosition, reason: '首頁 A1 Floating Icon 需要上下兩行文案，已略過' });
        continue;
      }

      const sequence = (counters.get(route.outputPrefix) || 0) + 1;
      counters.set(route.outputPrefix, sequence);
      record.__outputName = `${route.outputPrefix}_${String(sequence).padStart(2, '0')}_${dimensions.label}`;

      blocks.push({
        name: currentPosition,
        headerRow,
        startRow: rowIndex,
        quantity: 1,
        records: [record],
        colMap: columnMap,
        templateType: FAMILY,
      });
    }

    if (!blocks.length && !skippedRows.length) warnings.push('已找到工單標題列，但下方沒有可產圖資料。');
    return { handled: true, workflow: 'crossnight-live-promo', blocks, warnings, skippedRows, anchorCount: 1 };
  }

  // ── 套版 ───────────────────────────────────────────────────
  function getLayer(template, key) {
    return template?.layers?.[key] || null;
  }

  function sourceTemplateIdOf(template, record = null) {
    return String(
      template?.sheetTemplateRoute?.sourceTemplateId
      || record?.__route?.templateId
      || template?.batchRecord?.__route?.templateId
      || template?.canvas?.templateId
      || template?.templateId
      || template?.source?.psdName
      || ''
    ).replace(/\.psd$/i, '');
  }

  function setTextLayer(template, key, value, { hideWhenEmpty = false, preserveManualText = false } = {}) {
    const layer = getLayer(template, key);
    if (!layer || layer.type !== 'text') return false;
    if (preserveManualText && layer.__manualTextEdited === true) return true;
    const content = text(value);
    if (!content && hideWhenEmpty) {
      layer.hidden = true;
      return true;
    }
    if (content) {
      layer.text = content;
      layer.hidden = false;
    }
    return true;
  }

  function setImageLayer(template, key, assetFilename, assetProject = '') {
    const layer = getLayer(template, key);
    if (!layer || layer.type !== 'image') return false;
    layer.assetFilename = assetFilename;
    if (assetProject) layer.assetProject = assetProject;
    else delete layer.assetProject;
    layer.hidden = false;
    layer.keepAspectRatio = true;
    return true;
  }

  // 共用素材補正。手動上傳過（__manualAsset）或使用者按 Delete 清掉（__assetCleared）的
  // 圖層不覆寫，否則每次預覽刷新都會把使用者的操作蓋回去。
  function setCommonAssets(template) {
    COMMON_ASSETS.forEach(({ key, filename, project }) => {
      const layer = getLayer(template, key);
      if (!layer || layer.type !== 'image') return;
      if (layer.__manualAsset === true || layer.__assetCleared === true) return;
      setImageLayer(template, key, filename, project);
    });
  }

  // 25節 基底的素材查找優先序是「目前專案資料夾 → 共用素材 → assets 根目錄 →（政策允許時）其他資料夾」，
  // 而 kv_bg 這類背景素材被歸類為 background，政策明確禁止跨資料夾 fallback。
  // 跨夜的公版專屬素材放在 assets/<公版名>/（資料夾名稱與 templateId 完全相同），
  // 因此這裡把「檔名以公版名開頭」的圖層 assetProject 指到該資料夾，
  // 背景／遮罩／規範等素材才找得到。共用素材與主持人圖素由各自的設定處理，不在此列。
  function assignTemplateAssetProject(template) {
    const templateId = String(template?.canvas?.templateId || template?.templateId || '').trim();
    if (!templateId) return;
    const commonKeys = new Set(COMMON_ASSETS.map((entry) => entry.key));
    Object.entries(template.layers || {}).forEach(([key, layer]) => {
      if (layer?.type !== 'image') return;
      if (commonKeys.has(key) || HOST_LAYER_KEYS.includes(key)) return;
      if (layer.__manualAsset === true || layer.__assetCleared === true) return;
      const filename = String(layer.assetFilename || '').trim();
      if (!filename.startsWith(`${templateId}_`)) return;
      layer.assetProject = templateId;
    });
  }

  // 抓PSD公版小工具匯出的主持人圖層，assetFilename 會是「<公版名>_主持人_A.png」這種
  // 以公版名為前綴的 placeholder，而實際素材放在 assets/主持人圖素/（SUNNY.png、亞莎.png），
  // 兩邊對不上。每次重抽 PSD 都會把 JSON 改回 placeholder，所以改成在這裡自動換掉，
  // 而不是去修 JSON（修了下次重抽又會壞）。
  //
  // 只換「以公版名為前綴的 placeholder」；其他檔名一律尊重 JSON，
  // 手動上傳過（__manualAsset）或按過 Delete（__assetCleared）的圖層也不動。
  function resolveHostPlaceholders(template) {
    const templateId = String(template?.canvas?.templateId || template?.templateId || '').trim();
    HOST_LAYER_KEYS.forEach((key) => {
      const layer = getLayer(template, key);
      if (!layer || layer.type !== 'image') return;
      if (layer.__manualAsset === true || layer.__assetCleared === true) return;

      const filename = String(layer.assetFilename || '').trim();
      const isPlaceholder = !filename
        || (templateId && filename === `${templateId}_${key}.png`);
      if (!isPlaceholder) return;

      const fallback = HOST_DEFAULT_ASSETS[key];
      if (!fallback) return;
      layer.assetFilename = fallback;
      layer.assetProject = HOST_ASSET_PROJECT;
      layer.__hostPlaceholderResolved = true;
    });
  }

  function findHostMetaDividerKeys(template) {
    const anchor = getLayer(template, '主持');
    if (!anchor) return [];
    const anchorTop = Number(anchor.y || 0);
    const anchorBottom = anchorTop + Number(anchor.height || 0);
    return Object.entries(template.layers || {})
      .filter(([key, layer]) => {
        if (!key.startsWith(HOST_META_DIVIDER_PREFIX) || !layer) return false;
        const top = Number(layer.y || 0);
        const bottom = top + Number(layer.height || 0);
        return top < anchorBottom && bottom > anchorTop;
      })
      .map(([key]) => key);
  }

  // 主持資訊的完整圖層集合（標題、名稱、底色、分隔線）。
  // 沒有主持人時整組隱藏；有主持人時整組顯示——兩邊必須對稱，
  // 否則會出現「其他都隱藏了、只剩一條 1px 白線孤立在畫面上」。
  function hostMetaLayerKeys(template) {
    return [...HOST_META_LAYER_KEYS, ...findHostMetaDividerKeys(template)];
  }

  function setHostMetaVisible(template, visible) {
    hostMetaLayerKeys(template).forEach((key) => {
      const layer = getLayer(template, key);
      if (layer) layer.hidden = !visible;
    });
  }

  function captureHostLayout(template) {
    if (template.__crossnightHostLayout) return template.__crossnightHostLayout;
    const capture = (layer) => layer ? {
      x: Number(layer.x || 0),
      y: Number(layer.y || 0),
      width: Number(layer.width || 0),
      height: Number(layer.height || 0),
      centerX: Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : Number(layer.x || 0) + Number(layer.width || 0) / 2,
      centerY: Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) : Number(layer.y || 0) + Number(layer.height || 0) / 2,
    } : null;
    template.__crossnightHostLayout = {
      A: capture(getLayer(template, '主持人_A')),
      B: capture(getLayer(template, '主持人_B')),
    };
    return template.__crossnightHostLayout;
  }

  function restoreBox(layer, box) {
    if (!layer || !box) return;
    Object.assign(layer, box);
    // contain 的基準值（targetWidth / maxTargetHeight）也要一起回到 JSON 的原始框，
    // 否則使用者拖曳過之後，幾何被還原成原框、contain 基準卻還留著調整後的值，
    // 兩者不一致會讓素材畫出來的大小跟外框對不上。
    layer.targetWidth = box.width;
    layer.targetHeight = box.height;
    layer.maxTargetHeight = box.height;
  }

  function hostAssetFilename(name) {
    const key = normalize(name);
    if (key === normalize('Sunny')) return 'SUNNY.png';
    if (key === normalize('亞莎')) return '亞莎.png';
    return `${text(name)}.png`;
  }

  // 主持人圖素的尺寸模式：以 JSON 原本的框做等比 contain，中心點不變。
  // 上傳新素材（長寬比不同）時，只會在這個框內縮放，中心點固定，
  // 跨版位連動也才有一致的比例基準。
  function configureHostSizing(template) {
    const layout = captureHostLayout(template);
    HOST_LAYER_KEYS.forEach((key) => {
      const layer = getLayer(template, key);
      if (layer?.type !== 'image') return;
      const box = layout[key === '主持人_A' ? 'A' : 'B'];
      const width = Number(box?.width || layer.width || 0);
      const height = Number(box?.height || layer.height || 0);
      if (!(width > 0) || !(height > 0)) return;
      layer.keepAspectRatio = true;
      layer.sizingMode = 'containByPBox';
      if (!Number.isFinite(Number(layer.targetWidth))) layer.targetWidth = Number(layer.width || width);
      if (!Number.isFinite(Number(layer.maxTargetHeight))) layer.maxTargetHeight = Number(layer.height || height);
    });
  }

  // P_範圍 → 只裁下緣的遮罩。左／右／上完全不裁、不限制拖曳；
  // 下緣在 P_範圍 自己的 x 範圍內沿用其左下／右下圓角（矩形 r=0 時退化為直線）。
  // 參考框在 renderOrder 中一律排到主持人_A/B 之前（＝畫在主持人下方）。
  // PSD 抽出來的順序是 P_範圍 壓在主持人上面，命中測試由上往下找，
  // 結果在主持人身上點選永遠先選到 P_範圍，沒辦法直接選主持人來調整。
  // P_範圍 不會匯出，改到下方只影響編輯畫布的疊放，不影響產出。
  function lowerPlacementGuidesBelowHosts(template) {
    const order = template?.renderOrder;
    if (!Array.isArray(order)) return;
    const hostIndexes = HOST_LAYER_KEYS
      .map((key) => order.indexOf(key))
      .filter((index) => index >= 0);
    if (!hostIndexes.length) return;
    const firstHost = Math.min(...hostIndexes);

    const guideIndex = order.indexOf(HOST_GUIDE_LAYER_NAME);
    if (guideIndex < 0 || guideIndex < firstHost) return;

    order.splice(guideIndex, 1);
    // 移除之後索引會位移，要重新算「最前面那個主持人」的位置再插進去。
    // 注意 renderOrder 裡 主持人_B 通常排在 主持人_A 前面，所以必須取兩者的最小索引，
    // 不能直接用 HOST_LAYER_KEYS 的順序去找。
    const target = Math.min(...HOST_LAYER_KEYS
      .map((key) => order.indexOf(key))
      .filter((index) => index >= 0));
    order.splice(target, 0, HOST_GUIDE_LAYER_NAME);
  }

  // 所有參考框（不匯出、只在編輯畫布顯示虛線）。
  // 在 prepareTemplate 就標記，否則「已上傳公版、還沒上傳工單」時
  // 文案範圍 會被當成一般 shape 畫出來（AR 的 文案範圍 是 74x74，會蓋住四個文案圖層）。
  function markPlacementGuides(template) {
    [HOST_GUIDE_LAYER_NAME, '文案範圍'].forEach((key) => {
      const guide = getLayer(template, key);
      if (guide) guide.__placementGuide = true;
    });
  }

  function configureHostMask(template) {
    const guide = getLayer(template, HOST_GUIDE_LAYER_NAME);
    if (!guide) return;
    guide.__placementGuide = true;
    HOST_LAYER_KEYS.forEach((key) => {
      const layer = getLayer(template, key);
      if (layer?.type !== 'image') return;
      layer.__maskLayerName = HOST_GUIDE_LAYER_NAME;
      layer.__maskEdges = 'bottom';
    });
  }

  function configureHostVisualEffects(template) {
    const maskShadow = Boolean(getLayer(template, HOST_GUIDE_LAYER_NAME));
    HOST_LAYER_KEYS.forEach((key) => {
      const layer = getLayer(template, key);
      if (layer?.type !== 'image') return;
      layer.dropShadow = { ...HOST_DROP_SHADOW };
      if (maskShadow) layer.__shadowMaskLayerName = HOST_GUIDE_LAYER_NAME;
      else delete layer.__shadowMaskLayerName;
    });
  }

  function getTextVisualCenterX(layer, measuredWidth) {
    const x = Number(layer?.x || 0);
    const boxWidth = Math.max(0, Number(layer?.width || 0));
    const visualWidth = Math.max(0, Number(measuredWidth || boxWidth));
    const align = String(layer?.align || 'left').toLowerCase();

    if (align === 'right') return x + boxWidth - visualWidth / 2;
    if (align === 'center') {
      return Number.isFinite(Number(layer?.centerX))
        ? Number(layer.centerX)
        : x + boxWidth / 2;
    }
    return x + visualWidth / 2;
  }

  function configureOaTitleBackground(template, sourceTemplateId, helpers = {}) {
    if (!OA_TITLE_BACKGROUND_TEMPLATE_IDS.has(sourceTemplateId)) return;

    const title = getLayer(template, 'title');
    const background = getLayer(template, '主標題_BG');
    const leftTriangle = getLayer(template, '主標題_BG_三角形_左');
    const rightTriangle = getLayer(template, '主標題_BG_三角形_右');
    if (!title || !background || !leftTriangle || !rightTriangle) return;

    const hasTitle = title.hidden !== true && text(title.text).length > 0;
    [background, leftTriangle, rightTriangle].forEach((layer) => { layer.hidden = !hasTitle; });
    if (!hasTitle) return;

    const measuredWidth = Math.max(1, Number(helpers.measureTextWidth?.(title) || title.width || 1));
    const visualCenterX = getTextVisualCenterX(title, measuredWidth);
    const backgroundWidth = measuredWidth + OA_TITLE_BACKGROUND_PADDING_PX * 2;

    background.width = backgroundWidth;
    background.x = visualCenterX - backgroundWidth / 2;
    background.centerX = visualCenterX;
    background.centerY = Number(background.y || 0) + Number(background.height || 0) / 2;
    background.useDynamicBounds = true;
    background.cornerRadii = { ...OA_TITLE_BACKGROUND_CORNER_RADII };
    background.shape = {
      ...(background.shape || {}),
      kind: 'roundedRectangle',
      cornerRadius: 50,
      cornerRadii: { ...OA_TITLE_BACKGROUND_CORNER_RADII },
    };

    const positionTriangle = (layer, side) => {
      const width = Math.max(1, Number(layer.width || 19));
      const height = Math.max(1, Number(layer.height || 24));
      layer.width = width;
      layer.height = height;
      layer.y = Number(background.y || layer.y || 0);
      layer.x = side === 'left'
        ? background.x - width
        : background.x + background.width;
      layer.centerX = layer.x + width / 2;
      layer.centerY = layer.y + height / 2;
      layer.useDynamicBounds = true;
      layer.shape = {
        ...(layer.shape || {}),
        kind: 'polygon',
        pointsNormalized: true,
        points: side === 'left'
          ? [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
          : [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      };
    };

    positionTriangle(leftTriangle, 'left');
    positionTriangle(rightTriangle, 'right');
  }

  // 主持資訊文字的「視覺左緣」。右對齊的文字（例如 OA_MSBN 的『主持』）
  // 文字框寬度不等於實際字寬，必須用量測後的寬度回推，否則左緣會算得太左邊。
  function getLayerVisualLeft(layer, helpers = {}) {
    const x = Number(layer.x || 0);
    const boxWidth = Math.max(0, Number(layer.width || 0));
    if (layer.type !== 'text') return x;

    const measuredWidth = Math.max(0, Number(helpers.measureTextWidth?.(layer) || 0));
    const visualWidth = measuredWidth > 0 ? measuredWidth : boxWidth;
    const align = String(layer.align || 'left').toLowerCase();
    if (align === 'right') return x + boxWidth - visualWidth;
    if (align === 'center') {
      const centerX = Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) : x + boxWidth / 2;
      return centerX - visualWidth / 2;
    }
    return x;
  }

  // 主持人名稱_BG 的透明度漸層：
  //   左端 0% → 主持資訊視覺最左緣往左 20px 的位置為 100% → 之後往右到 BG 右端維持 100%。
  //
  // 「主持資訊」只取『主持』與『主持人名稱』兩個文字圖層：
  //   - 分隔線（『白色直線』／『白色直線_2』）永遠夾在這兩者之間，不可能是最左緣，取了也沒用；
  //     而且各公版的分隔線名稱不一致（直播大廳_LPBN 用的是『白色直線_2』，它的『白色直線』
  //     在畫面上方 y=68 跟主持資訊無關），寫死名稱容易誤判。
  //   - 不能改成「與 BG 垂直重疊的所有圖層」：P_範圍 是縱向很長的參考框（OA_MSBN DD 是 y51~341），
  //     一定會跟 BG 重疊，它的 x=703 會把最左緣從 904 拉到 703，漸層區間被壓成 2.6%，看起來就是一條硬邊。
  //
  // OA_MSBN 的 主持人名稱_BG 帶 rotation:180。渲染時 context 會跟著旋轉，漸層方向會被反轉，
  // 所以這裡先把它正規化成 rotation:0 + boundsAABB 的框（矩形轉 180° 視覺完全相同）。
  function configureHostNameBackgroundGradient(template, helpers = {}) {
    const background = getLayer(template, HOST_NAME_BACKGROUND_KEY);
    if (!background || background.type !== 'shape') return;

    // 正規化旋轉，讓漸層的本地 x 軸與畫面左右一致。
    // 注意 ShapeRenderer.getRotation() 的優先序是「rule.rotation → layer.rotation」，
    // 而 rule.rotation 來自 shape.geometry.transform.rotationDeg，所以只清 layer.rotation 沒有用
    // ——context 還是會被轉 180 度，漸層方向就整條反過來（左邊不透明、右邊透明）。
    // 這裡三個地方一起清，並改用 useDynamicBounds 讓渲染器採用正規化後的即時圖層框。
    const geometryTransform = background.shape?.geometry?.transform;
    const rotation = Number(background.rotation || 0) || Number(geometryTransform?.rotationDeg || 0) || 0;
    if (Math.abs(rotation) > 0.001) {
      const aabb = background.boundsAABB;
      if (aabb) {
        background.x = Number(aabb.x);
        background.y = Number(aabb.y);
        background.width = Number(aabb.width);
        background.height = Number(aabb.height);
        background.centerX = Number(aabb.x) + Number(aabb.width) / 2;
        background.centerY = Number(aabb.y) + Number(aabb.height) / 2;
      }
      background.rotation = 0;
      if (geometryTransform) geometryTransform.rotationDeg = 0;
      background.useDynamicBounds = true;
    }

    const left = Number(background.x || 0);
    const width = Number(background.width || 0);
    if (!(width > 0)) return;

    const members = HOST_NAME_GRADIENT_ANCHOR_KEYS
      .map((key) => getLayer(template, key))
      .filter((layer) => layer && layer.type === 'text' && layer.hidden !== true && text(layer.text));

    if (!members.length) {
      delete background.fillGradient;
      return;
    }

    const groupLeft = Math.min(...members.map((layer) => getLayerVisualLeft(layer, helpers)));
    const solidFromX = groupLeft - HOST_NAME_GRADIENT_LEAD_PX;
    const endRatio = Math.max(0, Math.min(1, (solidFromX - left) / width));
    const baseColor = background.fill || background.shape?.fill || '#133261';

    background.fillGradient = {
      from: withAlpha(baseColor, 0),
      to: baseColor,
      startRatio: 0,
      endRatio,
    };
  }

  function centerHostMetaGroup(template, sourceTemplateId, helpers = {}) {
    if (!CENTERED_HOST_META_TEMPLATE_IDS.has(sourceTemplateId)) return;

    // IG / 開播字卡的主持資訊是固定置中群組。文字內容、字級、字體或對齊方式改變時，
    // 必須使用「實際量測後的文字寬度」計算視覺邊界，不能沿用 JSON 內的舊文字框寬度。
    // 「來賓_BG」是滿版寬度橫條，本身就已置中，不納入群組。
    const groupLayers = ['主持', '白色直線', '主持人名稱']
      .map((key) => getLayer(template, key))
      .filter((layer) => layer && layer.hidden !== true);
    if (!groupLayers.length) return;

    const canvasWidth = Number(template?.canvas?.width || 0);
    if (!Number.isFinite(canvasWidth) || canvasWidth <= 0) return;

    const getVisualBounds = (layer) => {
      const x = Number(layer.x || 0);
      const boxWidth = Math.max(0, Number(layer.width || 0));
      if (layer.type !== 'text') return { left: x, right: x + boxWidth };

      const measuredWidth = Math.max(0, Number(helpers.measureTextWidth?.(layer) || 0));
      const visualWidth = measuredWidth > 0 ? measuredWidth : boxWidth;
      const align = String(layer.align || 'left').toLowerCase();
      if (align === 'right') {
        const right = x + boxWidth;
        return { left: right - visualWidth, right };
      }
      if (align === 'center') {
        const centerX = Number.isFinite(Number(layer.centerX))
          ? Number(layer.centerX)
          : x + boxWidth / 2;
        return { left: centerX - visualWidth / 2, right: centerX + visualWidth / 2 };
      }
      return { left: x, right: x + visualWidth };
    };

    const visualBounds = groupLayers.map(getVisualBounds);
    const left = Math.min(...visualBounds.map((bounds) => bounds.left));
    const right = Math.max(...visualBounds.map((bounds) => bounds.right));
    const groupCenterX = (left + right) / 2;
    const deltaX = canvasWidth / 2 - groupCenterX;
    if (!Number.isFinite(deltaX) || Math.abs(deltaX) < 0.001) return;

    groupLayers.forEach((layer) => {
      const currentX = Number(layer.x || 0);
      const currentCenterX = Number.isFinite(Number(layer.centerX))
        ? Number(layer.centerX)
        : currentX + Number(layer.width || 0) / 2;
      layer.x = currentX + deltaX;
      layer.centerX = currentCenterX + deltaX;
      if (layer.type === 'shape') layer.useDynamicBounds = true;
    });
  }

  // 只有一位主持人時：隱藏 主持人_B，並把 主持人_A 移到 A+B 群組的中心。
  // 兩位主持人時把 主持人_A 還原回 JSON 原始座標（使用者之後補上傳 B 就會回位）。
  function applyHostCentering(template, hostCount, { preserveGeometry = false } = {}) {
    const layout = captureHostLayout(template);
    const hostA = getLayer(template, '主持人_A');
    if (!hostA || !layout.A || !layout.B) return;
    if (preserveGeometry) return;

    if (hostCount === 1) {
      const groupLeft = Math.min(layout.A.x, layout.B.x);
      const groupRight = Math.max(layout.A.x + layout.A.width, layout.B.x + layout.B.width);
      const groupCenterX = (groupLeft + groupRight) / 2;
      hostA.x = groupCenterX - layout.A.width / 2;
      hostA.centerX = groupCenterX;
      hostA.__crossnightCentered = true;
      return;
    }

    if (hostA.__crossnightCentered === true) {
      hostA.x = layout.A.x;
      hostA.centerX = layout.A.centerX;
      delete hostA.__crossnightCentered;
    }
  }

  function applyHosts(template, hosts, { preserveGeometry = false, preserveManualText = false } = {}) {
    const names = Array.isArray(hosts) ? hosts.filter(Boolean).slice(0, 2) : [];
    const hostA = getLayer(template, '主持人_A');
    const hostB = getLayer(template, '主持人_B');
    const layout = captureHostLayout(template);

    if (!names.length) {
      if (hostA) hostA.hidden = true;
      if (hostB) hostB.hidden = true;
      setHostMetaVisible(template, false);
      return;
    }

    // 第一次套版時使用 JSON 的基準位置；預覽刷新、縮圖重繪與切換版位時
    // 必須保留使用者已經手動調整的幾何資料，不能再次回填初始位置。
    if (!preserveGeometry) {
      if (hostA && layout.A) restoreBox(hostA, layout.A);
      if (hostB && layout.B) restoreBox(hostB, layout.B);
    }

    // 手動上傳／手動清除過的主持人素材不被工單覆寫。
    const setHostAsset = (key, name) => {
      const layer = getLayer(template, key);
      if (!layer) return;
      if (layer.__manualAsset === true || layer.__assetCleared === true) {
        layer.hidden = false;
        return;
      }
      setImageLayer(template, key, hostAssetFilename(name), HOST_ASSET_PROJECT);
    };

    setHostAsset('主持人_A', names[0]);
    if (names.length === 1) {
      if (hostB) hostB.hidden = true;
    } else {
      setHostAsset('主持人_B', names[1]);
    }

    applyHostCentering(template, names.length, { preserveGeometry });
    configureHostSizing(template);

    const hostLabel = names.join('、');
    setTextLayer(template, '主持人名稱', hostLabel, { preserveManualText });
    setHostMetaVisible(template, true);
  }

  function applyArCopy(template, record, { preserveManualText = false } = {}) {
    ['AR_01_文案_上', 'AR_01_文案_下', 'AR_02_文案_上', 'AR_02_文案_下'].forEach((key) => {
      const layer = getLayer(template, key);
      if (layer) layer.hidden = true;
    });
    const [upper = '', lower = ''] = record.__copyLines || [];
    const mapping = {
      '3/2': ['AR_01_文案_上', 'AR_01_文案_下'],
      '2/3': ['AR_02_文案_上', 'AR_02_文案_下'],
      '2/2': ['AR_02_文案_上', 'AR_01_文案_下'],
    }[record.__arLayout];
    if (!mapping) return;
    setTextLayer(template, mapping[0], upper, { preserveManualText });
    setTextLayer(template, mapping[1], lower, { preserveManualText });
    const guide = getLayer(template, '文案範圍');
    if (guide) guide.__placementGuide = true;
  }

  function applyFloatingCopy(template, record, sourceTemplateId, { preserveManualText = false } = {}) {
    const lines = record.__copyLines || [];
    if (sourceTemplateId === '首頁A1 Floating icon') {
      setTextLayer(template, 'A1_Floating_文案_上', lines[0] || '', { preserveManualText });
      setTextLayer(template, 'A1_Floating_文案_下', lines[1] || '', { preserveManualText });
      return;
    }

    setTextLayer(template, 'Floating_icon_文案', record.__compactCopy || lines.join(''), { preserveManualText });
    const useCoinIcons = (record.__compactCopy || '').includes('蝦幣');
    ['蝦幣_icon_01', '蝦幣_icon_02'].forEach((key) => { const layer = getLayer(template, key); if (layer) layer.hidden = !useCoinIcons; });
    ['優惠券_icon_01', '優惠券_icon_02'].forEach((key) => { const layer = getLayer(template, key); if (layer) layer.hidden = useCoinIcons; });
  }

  // 上傳公版時就先跑一次：不需要工單也能有正確的遮罩、陰影、尺寸模式與上傳槽，
  // 並打開跨版位連動旗標（批次模式下 buildRecord 也會再帶一次）。
  function prepareTemplate({ template, helpers = {} }) {
    if (!template?.layers) return;
    template.batchRecord = { ...(template.batchRecord || {}), [HOST_SYNC_FLAG]: true };
    resolveHostPlaceholders(template);
    captureHostLayout(template);
    setCommonAssets(template);
    assignTemplateAssetProject(template);
    markPlacementGuides(template);
    lowerPlacementGuidesBelowHosts(template);
    configureHostMask(template);
    configureHostVisualEffects(template);
    configureHostSizing(template);
    // 三角形的自訂頂點也要在這裡算：configureOaTitleBackground 原本只在套版時跑，
    // 「已上傳公版、還沒上傳工單」的狀態下 shape.points 會是空的，
    // drawPolygon 就會退化成正三角形（畫成朝上的 ▲ 而不是直角三角形）。
    configureOaTitleBackground(template, sourceTemplateIdOf(template), helpers);
    configureHostNameBackgroundGradient(template, helpers);
  }

  function applyRecord({ template, record, diagnostics, skipExactLayout = false, helpers = {} }) {
    const sourceTemplateId = sourceTemplateIdOf(template, record);
    const preserveManualText = skipExactLayout === true;

    template.batchRecord = { ...(template.batchRecord || {}), [HOST_SYNC_FLAG]: true };
    resolveHostPlaceholders(template);
    setCommonAssets(template);
    assignTemplateAssetProject(template);
    lowerPlacementGuidesBelowHosts(template);
    configureHostMask(template);
    configureHostVisualEffects(template);
    configureHostSizing(template);

    if (sourceTemplateId === 'AR') {
      applyArCopy(template, record, { preserveManualText });
      diagnostics.push({ field: '文案', status: 'ok', value: record.__rawCopy, target: record.__arLayout });
      return;
    }

    if (sourceTemplateId === 'Floating icon' || sourceTemplateId === '首頁A1 Floating icon') {
      applyFloatingCopy(template, record, sourceTemplateId, { preserveManualText });
      diagnostics.push({ field: '文案', status: 'ok', value: record.__rawCopy, target: sourceTemplateId });
      return;
    }

    setTextLayer(template, 'title', record.主標, { preserveManualText });
    setTextLayer(template, 'subtitle', record.副標, { hideWhenEmpty: true, preserveManualText });
    setTextLayer(template, '時間', record.時間, { preserveManualText });
    configureOaTitleBackground(template, sourceTemplateId, helpers);
    applyHosts(template, record.__hosts || [], { preserveGeometry: skipExactLayout === true, preserveManualText });
    centerHostMetaGroup(template, sourceTemplateId, helpers);
    // 一定要排在 applyHosts / centerHostMetaGroup 之後：
    // 主持人名稱的文字內容與置中結果都會改變「主持資訊視覺最左緣」，也就改變 100% 的位置。
    configureHostNameBackgroundGradient(template, helpers);

    if (sourceTemplateId === '直播時縮圖') {
      const titleLayer = getLayer(template, 'title');
      if (titleLayer) titleLayer.hidden = true;
    }

    if (sourceTemplateId === '直播大廳_LPBN') {
      // 25節 公版的 CTA 圖層名稱是「CTA-立即看_白」（連字號），非 18節 的下底線。
      const immediateCta = getLayer(template, 'CTA-立即看_白') || getLayer(template, 'CTA_立即看_白');
      if (immediateCta) immediateCta.hidden = record.__showImmediateCta !== true;
    }

    diagnostics.push({ field: '套版', status: 'ok', value: record.__position, target: sourceTemplateId });
  }

  // 依賴「文字實際量測寬度」的三個版型，集中在這裡重算：
  //   1. OA_MSBN 的主標題底色寬度與左右三角形位置
  //   2. IG / 開播字卡 的主持資訊群組置中
  //   3. 主持人名稱_BG 的漸層 100% 起點
  // 由 core 在「字型與素材都就緒」之後呼叫（afterTemplateAssetsReady），
  // 以及使用者手動改字之後呼叫（afterManualTextMetricsChanged）。
  function recomputeTextMetricLayouts(template, helpers = {}) {
    const sourceTemplateId = sourceTemplateIdOf(template);
    configureOaTitleBackground(template, sourceTemplateId, helpers);
    centerHostMetaGroup(template, sourceTemplateId, helpers);
    configureHostNameBackgroundGradient(template, helpers);
  }

  function afterTemplateAssetsReady({ template, helpers = {} }) {
    if (!template?.layers) return;
    recomputeTextMetricLayouts(template, helpers);
  }

  function afterManualTextMetricsChanged({ template, layerKey, helpers = {} }) {
    const sourceTemplateId = sourceTemplateIdOf(template);
    if (layerKey === '主持人名稱' || layerKey === '主持') {
      centerHostMetaGroup(template, sourceTemplateId, helpers);
      configureHostNameBackgroundGradient(template, helpers);
    }
    if (layerKey === 'title') configureOaTitleBackground(template, sourceTemplateId, helpers);
  }

  window.TemplateRuleRegistry.register(FAMILY, {
    label: '跨夜直播宣傳圖',
    priority: 1000,
    targets: [
      'MSBN', 'OA_MSBN DD', 'OA_MSBN BAU', 'DD Banner Card', 'HBN',
      '直播大廳_LPBN', '直播時縮圖', 'AR', 'Game BN', 'Coin page BN',
      'Coin page BN_BAU', 'POPUP', '直播間POPUP', 'Floating icon',
      '首頁A1 Floating icon', 'IG', '開播字卡_1080x1920', 'FB POST',
    ],
    tokens: [
      'MSBN', 'OA MSBN', 'HBN', '直播大廳 LP BN', '直播時縮圖',
      'PN/AR', 'GAME BN', 'coins page', 'POPUP', 'Floating Icon',
      'IG', '開播字卡', 'FB POST',
    ],
    sheetParser: parseSheet,
    rules: {
      resolveRecordTemplateRoute({ record }) {
        if (!record?.__route) return null;
        return {
          ...record.__route,
          outputName: record.__outputName,
        };
      },
      prepareTemplate,
      afterApplyRecordToTemplate: applyRecord,
      afterTemplateAssetsReady,
      afterManualTextMetricsChanged,
    },
  });

  // ── 跨版位連動設定 ─────────────────────────────────────────
  // 參考框一律是 P_範圍（A、B 共用同一個框，兩人都可在整個 P_範圍 內自由擺放）。
  // groupKeyResolver 依 A/B 槽位分群：工單若不小心把兩個槽填成同一位主持人，
  // 兩人會有相同的 assetFilename，若不分群就會誤判成同一組而互相連動。
  window.MultiSizeAssetSync?.configure?.({
    activationFlag: HOST_SYNC_FLAG,
    eligibleLayerPatterns: HOST_LAYER_KEYS.map((key) => {
      const wanted = window.normalizeLayerIdentifier ? window.normalizeLayerIdentifier(key) : key;
      return (name) => name === wanted;
    }),
    guideLayerResolver: () => HOST_GUIDE_LAYER_NAME,
    // 群組識別＝主持人槽位（A / B），與目前用哪張素材無關。
    // 這樣「Delete 清空 → 重新上傳」中間群組不會斷掉（清空後 assetFilename 是空字串，
    // 若照素材檔名推導群組就只會剩當前這一張）；工單若不小心把 A、B 填成同一位主持人，
    // 兩個槽位也不會因為檔名相同而被誤判成同一組。
    materialKeyResolver: (layer) => {
      const name = String(layer?.__canonicalName || layer?.psdName || '').trim();
      if (name === '主持人_A') return 'host:A';
      if (name === '主持人_B') return 'host:B';
      return '';
    },
    // 槽位已由 eligibleLayerPatterns 限定為 主持人_A / 主持人_B，
    // 這裡不再要求「必須已經有素材」，被清空的空槽也要留在群組裡。
    materialPredicate: (key, layer) => HOST_LAYER_KEYS.includes(String(layer?.psdName || key || '').trim()),
  });

  // 只有主持人_A / 主持人_B 缺素材時，畫布上才顯示「＋ 上傳圖片」空槽。
  window.ManualAssetUpload?.configure?.({
    isUploadSlot: (key, layer) => HOST_LAYER_KEYS.includes(String(layer?.psdName || key || '').trim()),
    label: '＋ 上傳主持人圖素',
  });

  window.CrossnightLivePromoRules = Object.freeze({
    normalize,
    parseDimensions,
    parseKLimit,
    parseStandardCopy,
    parseOaSequentialCopy,
    stripFieldLabel,
    routeFor,
    parseSheet,
    prepareTemplate,
    applyRecord,
    resolveHostPlaceholders,
    configureHostNameBackgroundGradient,
    recomputeTextMetricLayouts,
    findHostMetaDividerKeys,
    hostMetaLayerKeys,
    lowerPlacementGuidesBelowHosts,
    PNG_TEMPLATE_IDS,
    HOST_DROP_SHADOW,
    HOST_SYNC_FLAG,
  });
})();
