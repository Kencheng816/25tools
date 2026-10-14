/* LINE購物 AMS 共用規則工具
 *
 * 九個版位的規則檔（rules/*_rules.js）共用的判斷邏輯集中在這裡，
 * 每個版位的規則檔只負責「自己有哪些圖層、自己要不要遮罩」這種公版專屬設定。
 *
 * 這裡不寫死任何座標、字級或圓角半徑：需要用到這些數值時，
 * 一律從公版 JSON 該圖層自己的資料讀出來，公版 JSON 永遠是幾何的唯一真相來源。
 */
(function () {
  'use strict';

  // 六宮格 OAPush 的槽位前綴。25節公版的圖層前綴不帶數字（18節是「左上1_」）。
  const SLOT_NAMES = ['左上', '中上', '右上', '左下', '中下', '右下'];

  // 工單「商品資訊提供」欄仍然寫「左上1 / 中上2 ...」，所以偵測槽位時要吃得下數字。
  const SLOT_ALIASES = {
    '左上': ['左上1', '左上'],
    '中上': ['中上2', '中上'],
    '右上': ['右上3', '右上'],
    '左下': ['左下4', '左下'],
    '中下': ['中下5', '中下'],
    '右下': ['右下6', '右下'],
  };

  // 店名特規：工單的店名可能是「主店名-子品牌/子品牌/...」這種超長字串，
  // 版位的店名圖層放不下。這裡只列出已確認的特例，不做「遇到 - 就切前段」的通則，
  // 避免誤傷本來就含連字號的正常店名。
  const SHOP_NAME_OVERRIDES = [
    { match: '花王旗艦館', use: '花王旗艦館' },
  ];

  const ELLIPSIS = '…';

  // 兩行短文案的行距：行高 = 字級 + LINE_GAP_PX，讓兩行之間的視覺空隙固定約 8px。
  // 寫成相對值而不是寫死 35，字級改變時空隙仍然一致。
  const LINE_GAP_PX = 8;

  const toText = (value) => String(value ?? '')
    .replace(/_x000d_/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .trim();

  const normalizeKey = (value) => toText(value)
    .toLowerCase()
    .replace(/[\s\u00a0\u3000_\-()（）\[\]【】.]+/g, '');

  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

  // ── 圖層查找 ──────────────────────────────────────────────

  function layerEntry(template, name) {
    const wanted = normalizeKey(name);
    return Object.entries(template?.layers || {}).find(([key, layer]) =>
      normalizeKey(layer?.psdName || layer?.name || key) === wanted
    ) || null;
  }

  function findLayer(template, name) {
    return layerEntry(template, name)?.[1] || null;
  }

  function setText(template, name, value) {
    const layer = findLayer(template, name);
    if (!layer) return null;
    const text = toText(value);
    if (!text) return layer;
    layer.text = text;
    layer.hidden = false;
    return layer;
  }

  // ── 工單「文案」欄拆解 ────────────────────────────────────
  // 工單一格裡塞了四行：品牌列 / 最高X%回饋 / X%回饋僅限指定商店… / (%數TBC)。
  // 只有中間兩行要套進圖層；品牌列與 (%數TBC) 都不套。
  function parseCopy(rawCopy) {
    const lines = toText(rawCopy)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/[（(]\s*%數TBC\s*[）)]/i.test(line));

    return {
      reward: lines.find((line) => /^最高.*回饋$/.test(line)) || '',
      legal: lines.find((line) => line.includes('回饋僅限指定商店')) || '',
    };
  }

  // 工單的 LINE POINTS % 欄可能是 0.03、3 或「3%」，統一顯示成 3%。
  function normalizePercent(rawPercent) {
    const raw = String(rawPercent ?? '').trim();
    if (!raw) return '';
    if (raw.includes('%')) return raw;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return raw;
    const percent = numeric > 0 && numeric < 1 ? numeric * 100 : numeric;
    return `${Math.round(percent * 100) / 100}%`;
  }

  // ── 店名 ──────────────────────────────────────────────────

  function resolveShopName(rawName) {
    const name = toText(rawName);
    if (!name) return '';
    const override = SHOP_NAME_OVERRIDES.find((item) => name.includes(item.match));
    return override ? override.use : name;
  }

  // 店名的可用寬度：不能用店名圖層自己的 width，因為 PSD 匯出的文字圖層框
  // 就是「範例店名」本身的量測寬度，拿它當上限會讓任何比範例長的店名都被截斷。
  // 真正的限制是店名所在的卡片（上/下方Bar）：扣掉左右兩個圓角，文字不進圓角弧線內。
  function resolveShopNameMaxWidth(template, layer, options = {}) {
    const bar = findLayer(template, options.bottomBarName || '右_下方Bar')
      || findLayer(template, options.topBarName || '右_上方Bar');
    if (!bar) return num(layer?.width, 0);

    const barWidth = num(bar.width, 0);
    if (!(barWidth > 0)) return num(layer?.width, 0);
    const usable = barWidth - shapeCornerRadius(bar) * 2;
    return Math.max(usable, barWidth * 0.8);
  }

  // 套用店名並在放不下時截斷加「…」。
  // 圖層仍然是可編輯的一般文字圖層，GD 可以自行刪字；
  // 若店名本來就塞得進卡片，就完全不加「…」。
  function applyShopName(template, record, helpers, layerName = '店名', options = {}) {
    const layer = findLayer(template, layerName);
    if (!layer) return null;

    const fullName = resolveShopName(record?.['店名']);
    if (!fullName) return layer;

    const maxWidth = resolveShopNameMaxWidth(template, layer, options);
    const measure = typeof helpers?.measureTextWidth === 'function'
      ? (text) => helpers.measureTextWidth({ ...layer, text })
      : null;

    layer.text = fullName;
    layer.hidden = false;
    if (!measure || !(maxWidth > 0) || measure(fullName) <= maxWidth) return layer;

    // 逐字縮短，找出「內容 + …」還放得下的最長字串。
    const chars = [...fullName];
    let fitted = '';
    for (let length = chars.length - 1; length > 0; length -= 1) {
      const candidate = `${chars.slice(0, length).join('')}${ELLIPSIS}`;
      if (measure(candidate) <= maxWidth) { fitted = candidate; break; }
    }
    layer.text = fitted || ELLIPSIS;
    return layer;
  }

  // ── 商品圖 ────────────────────────────────────────────────
  // 25節的引擎把 P_範圍 當成「參考框（placement guide）」，匯出時不畫它。
  // 所以商品圖不能像 18節那樣把 P_範圍 自己改成 image，
  // 而是照 25節的做法另外生成一個商品圖層，位置＝參考框、遮罩＝指定圖層。
  function createProductLayer(template, options = {}) {
    const guideName = options.guideName || 'P_範圍';
    const layerName = options.layerName || '商品圖1';
    const maskName = options.maskName || '';

    const guide = findLayer(template, guideName);
    if (!guide) return null;

    markGuide(guide);

    const x = num(guide.x);
    const y = num(guide.y);
    const width = num(guide.width);
    const height = num(guide.height);
    if (!(width > 0) || !(height > 0)) return null;

    const existing = template.layers[layerName];
    const layer = {
      ...(existing || {}),
      type: 'image',
      psdName: layerName,
      name: layerName,
      role: 'product',
      x,
      y,
      width,
      height,
      centerX: num(guide.centerX, x + width / 2),
      centerY: num(guide.centerY, y + height / 2),
      // P_範圍 轉了幾度，商品圖就跟著轉幾度。
      // 引擎的 drawImage 是繞中心旋轉，所以 x/y/width/height 沿用參考框的未旋轉框即可。
      rotation: num(guide.rotation, 0),
      hidden: false,
      visible: true,
      keepAspectRatio: true,
      fitMode: 'contain',
      sizingMode: 'containByPBox',
      widthLimitPolicy: 'pBox',
      targetWidth: width,
      targetHeight: height,
      maxTargetHeight: height,
      assetFilename: String(existing?.assetFilename || ''),
      __canonicalName: layerName,
    };

    // 沒有 Bar 的版位不需要遮罩，維持乾淨的圖層資料，不留空字串的遮罩欄位。
    if (maskName) {
      layer.__maskLayerName = maskName;
      layer.maskLayerName = maskName;
    } else {
      delete layer.__maskLayerName;
      delete layer.maskLayerName;
    }

    template.layers[layerName] = layer;
    insertAboveGuide(template, layerName, guideName);
    return layer;
  }

  function markGuide(guide) {
    guide.locked = true;
    guide.__nonInteractive = true;
    guide.__placementGuide = true;
    // P_範圍 是給人看的參考框，不是版面上的圖形，一律不畫。
    // PSD 裡它就是「關掉填色、只留 1px 青色筆畫」的工作輔助線
    // （fillEnabled: false、stroke #00FFFF），設計師出圖前本來就會關掉它。
    // 渲染端現在會忠實照 PSD 畫填色與筆畫，若不隱藏就會在成品上留下一圈青色外框。
    guide.hidden = true;
  }

  // renderOrder 是由下往上的繪製順序：商品圖插在參考框正上方，
  // 讓上方Bar / DECO / 活動LOGO / 文字都疊在商品圖之上。
  function insertAboveGuide(template, layerName, guideName) {
    if (!Array.isArray(template.renderOrder)) return;
    template.renderOrder = template.renderOrder.filter((key) => key !== layerName);
    const guideKey = layerEntry(template, guideName)?.[0];
    const guideIndex = guideKey ? template.renderOrder.indexOf(guideKey) : -1;
    if (guideIndex >= 0) template.renderOrder.splice(guideIndex + 1, 0, layerName);
    else template.renderOrder.push(layerName);
  }

  // ── 上下方 Bar 的圓角 ─────────────────────────────────────
  // 上方Bar 與 下方Bar 疊起來組成一張卡片：上方只圓上緣、下方只圓下緣，
  // 否則兩者交界處會出現缺角。半徑取自該圖層 PSD 自己的 cornerRadius。
  // 上方Bar / 下方Bar 的「只導外側兩角」以前是在這裡手動指定四角半徑，
  // 但公版 JSON 的 PSD 原始資料本來就記著每個角各自的半徑，
  // 現在由 shape-renderer 直接讀回來，規則檔不需要也不應該再指定一次。
  function shapeCornerRadius(layer) {
    return Math.max(0, num(layer?.shape?.cornerRadius ?? layer?.cornerRadius ?? layer?.radius, 0));
  }

  // 綠色色塊在多數版位是「白色色塊的下半截」：本身是直角矩形，
  // 靠白色色塊的圓角膠囊外框裁切出下緣圓角。
  // 若公版裡的綠色色塊本身已經是圓角形狀（自成一顆膠囊），就不需要裁切。
  function clipGreenBlockIfNeeded(template) {
    const green = findLayer(template, '綠色色塊');
    const white = findLayer(template, '白色色塊');
    if (!green || !white) return;

    const kind = String(green?.shape?.kind || '').toLowerCase();
    if (kind === 'roundedrectangle' || shapeCornerRadius(green) > 0) {
      delete green.__maskLayerName;
      delete green.maskLayerName;
      return;
    }
    green.__maskLayerName = '白色色塊';
    green.maskLayerName = '白色色塊';
  }

  // ── 兩行短文案的行距 ──────────────────────────────────────
  function applyLineGap(layer) {
    if (!layer) return;
    const fontSize = num(layer.fontSizePx, num(layer.fontSizePt, 0));
    if (!(fontSize > 0)) return;
    layer.lineHeight = fontSize + LINE_GAP_PX;
  }

  // ── 共用 DECO 素材 ────────────────────────────────────────
  // DECO_蝦幣 / DECO_票券 是所有版位共用的一份檔案，放在 assets/共用素材/。
  // 但公版 JSON 的 assetFilename 帶了版位前綴（例如
  // 「我的帳戶Down banner_1029x264_DECO_票券.png」），實體檔案沒有這個前綴。
  // 這兩個圖層被引擎歸類為「票券類」，票券類禁止模糊比對（避免單券/雙券誤套），
  // 所以帶前綴的檔名永遠對不到，必須由規則檔明確指定要用哪一份共用素材。
  const SHARED_DECO_ASSETS = {
    'DECO_蝦幣': 'DECO_蝦幣.png',
    'DECO_票券': 'DECO_票券.png',
  };

  function applySharedDecoAssets(template, helpers) {
    // helpers.findAssetFilename 由 core 的 applyTemplateRuleHook 提供。
    if (typeof helpers?.findAssetFilename !== 'function') return;
    Object.entries(SHARED_DECO_ASSETS).forEach(([layerName, filename]) => {
      const entry = layerEntry(template, layerName);
      if (!entry) return;
      const [key, layer] = entry;
      if (layer.type !== 'image') return;
      const match = helpers.findAssetFilename(filename, { template, layer, layerKey: key });
      if (match.found) layer.assetFilename = match.filename;
    });
  }

  // ── 陰影 ──────────────────────────────────────────────────
  // 25節的活動 LOGO 不套陰影。引擎的圖片陰影一律讀 layer.dropShadow，
  // 這裡把公版 JSON 或前一輪套版可能殘留的陰影資料全部清掉。
  function clearShadows(template) {
    Object.values(template?.layers || {}).forEach((layer) => {
      delete layer.dropShadow;
      delete layer.shadow;
      if (layer.effects?.shadow) {
        const { shadow, ...rest } = layer.effects;
        layer.effects = rest;
      }
    });
  }

  // ── 工單「文案」欄的保護 ──────────────────────────────────
  // 引擎的通用文字映射會把工單「文案」欄塞進第一個名稱含「文案」的文字圖層。
  // LINE購物 的公版裡「回饋文案」「CTA_文案」「{槽}_短文案」都含「文案」兩個字，
  // 一旦被通用邏輯命中就會把整段四行原文（含品牌列與 (%數TBC)）塞進去，
  // 甚至覆蓋掉膠囊版位的 CTA 原字。
  // 所以在 beforeApply 就把原文搬到 __amsRawCopy 並清空「文案」欄，
  // 由各版位規則檔自己決定要套進哪些圖層。
  function stashRawCopy(record) {
    if (!record) return '';
    if (record.__amsRawCopy === undefined) record.__amsRawCopy = toText(record['文案']);
    record['文案'] = '';
    return record.__amsRawCopy;
  }

  function rawCopy(record) {
    return record?.__amsRawCopy !== undefined ? record.__amsRawCopy : toText(record?.['文案']);
  }

  // ── 輸出檔名 ──────────────────────────────────────────────
  // 直接用工單「檔名」欄，但 Excel 寫的是 1029*264，星號在 Windows 不是合法檔名字元。
  function applyOutputName(record) {
    const filename = String(record?.['檔名'] || '').trim().replace(/\*/g, 'x');
    if (filename) record.__outputName = filename;
    return filename;
  }

  // ── 版位分流 ──────────────────────────────────────────────
  // 比對以工單「版位」欄為主。norm() 會去掉空白與括號，
  // 所以工單的「APP首頁膠囊APP (下半天2)」對得上公版的「APP首頁膠囊APP(下半天2)」。
  function makeRoute({ family, templateId, placement, label }) {
    return function resolveRecordTemplateRoute({ block, record, helpers }) {
      const value = String(record?.['版位'] || block?.name || '').trim();
      if (helpers.norm(value) !== helpers.norm(placement)) return null;
      return {
        key: family,
        family,
        label: label || templateId,
        templateId,
        templateFile: `${templateId}.json`,
      };
    };
  }

  // 單一版位（非六宮格）的共用套版流程。
  function applySinglePlacement(template, record, helpers, options = {}) {
    const copy = parseCopy(rawCopy(record));
    setText(template, '回饋文案', copy.reward);
    setText(template, '回饋警語', copy.legal);

    if (options.hasShopName !== false) applyShopName(template, record, helpers, '店名', options);
    if (options.hasLinePoints !== false) {
      setText(template, 'LINE POINTS %', normalizePercent(record?.['LINE_POINTS_PERCENT']));
    }

    applySharedDecoAssets(template, helpers);
    clipGreenBlockIfNeeded(template);
    clearShadows(template);
  }

  // ── 圖層行為政策 ──────────────────────────────────────────
  // 機制在 core（LayerDefaults / ManualAssetUpload），要套在哪些圖層由這裡決定。

  function layerName(key, layer) {
    return toText(layer?.__canonicalName || layer?.psdName || layer?.name || key);
  }

  // 名稱以 _BG 結尾的背景圖層（本專案是 KV_BG）預設鎖定，
  // 避免調整商品圖或文字時把整張背景一起拖走。要換背景就先在圖層列表點開鎖頭。
  function isBackgroundLayer(key, layer) {
    return /_BG$/i.test(layerName(key, layer));
  }

  // 可以按 Delete 清除、清除後出現「＋ 上傳圖片」空槽的圖層：
  // 商品圖（規則檔生成，role = product）、各版位的 KV_BG、OAPush 的指定廠商LOGO_壓條。
  // P_範圍 這類參考框已被 markGuide 標成 __nonInteractive，core 端就會排除，這裡不必再列。
  // 鎖定中的圖層由 core 自動排除，所以 KV_BG 要先解鎖才會變成上傳槽。
  function isUploadSlotLayer(key, layer) {
    if (layer?.role === 'product') return true;
    const name = layerName(key, layer);
    return /_BG$/i.test(name) || name.includes('壓條');
  }

  window.LayerDefaults?.configure({ lockOnLoad: isBackgroundLayer });
  window.ManualAssetUpload?.configure({ isUploadSlot: isUploadSlotLayer });

  window.LineShoppingAMS = Object.freeze({
    SLOT_NAMES,
    SLOT_ALIASES,
    LINE_GAP_PX,
    toText,
    normalizeKey,
    layerEntry,
    findLayer,
    setText,
    parseCopy,
    normalizePercent,
    resolveShopName,
    resolveShopNameMaxWidth,
    applyShopName,
    stashRawCopy,
    rawCopy,
    createProductLayer,
    clipGreenBlockIfNeeded,
    applySharedDecoAssets,
    applyLineGap,
    clearShadows,
    applyOutputName,
    makeRoute,
    applySinglePlacement,
  });
})();
