/* 25節 LineOA 專用規則 — 支援公版：
 *   01_LineOA_Template_push（一般貼文：活動KV + 商品×3 套圖/品名/原價/活動價/CTA）
 *   03_LineOA_Template_RM  （選單 Rich Menu：活動×2 套KV + CTA_白/黑 + 資訊_01）
 *   04_LineOA_Template_push（選單：活動×3 套KV）
 *   POPUP                  （公版編號：POPUP_XX → 等比放大貼齊一邊＋透明補到 1040×1289，輸出 PNG）
 *
 * 工單格式（「Line OA」分頁）：
 *   A欄 = 素材命名 / 露出日期（即輸出檔名，例如「0519-0523選單」→ 0519-0523選單.jpg）
 *   B欄 = 「公版編號：03」或「公版編號：POPUP_06」；沒有對應公版 JSON 的編號列入診斷略過
 *   內容格 = 「圖層名：值」寫法（資訊_01_文案01：…、商品_01_品名：…）
 *   商品列：同列的 原價/活動價/CTA 欄自動歸給該商品；商品_0X_品名與素材檔名相同時自動載入商品圖
 *   CTA欄 = 無商品標籤的列依序對應 活動_01/02/03（寫 X / 請拿掉 = 整組 CTA 隱藏）
 *
 * 套KV／套商品 占位文字由本規則轉為點擊/拖曳上傳格；套品範圍與活動 BG 僅作顯示範圍（遮罩）。
 */
(function registerLineOARichMenuRules() {
  'use strict';

  const FAMILY = 'lineoa_rm';
  const TEMPLATE_ID = '03_LineOA_Template_RM'; // 預設/選單公版（維持既有變數名，避免大改）
  // V0.2：POPUP 公版檔名由 POPUP_Template.json 改為 POPUP.json，
  // 讓公版 templateId 與素材子資料夾「POPUP」完全同名（素材查找第一優先靠同名比對）。
  const POPUP_TEMPLATE_ID = 'POPUP';
  // V0.4：POPUP 公版身分別名。PSD 匯出管線常把公版命名為 POPUP_Template，
  // 工單路由與素材資料夾則用 POPUP——兩者視為同一公版身分。
  // 引擎在「工單→公版比對」與「嚴格素材範圍的公版同名資料夾」兩處通用消費本表（規則宣告、引擎不寫死）。
  window.TemplateIdentityAliases = Object.assign(window.TemplateIdentityAliases || {}, {
    POPUP: ['POPUP_Template'],
  });
  // 工單「公版編號」→ 公版 JSON 對照表（templates/ 內實際存在的檔案）。
  const TEMPLATE_BY_NO = Object.freeze({
    '01': '01_LineOA_Template_push',
    '03': '03_LineOA_Template_RM',
    '04': '04_LineOA_Template_push',
  });
  // V0.3：同一個公版編號可能同時存在 push 與 RM 兩種版型（例如 04）。
  // 判別規則：A 欄素材命名含「推文」→ push、含「選單」→ RM；該編號只有單一版型時直接用它。
  const TEMPLATE_VARIANTS = Object.freeze({
    '01': { push: '01_LineOA_Template_push' },
    '02': { rm: '02_LineOA_Template_RM' },
    '03': { rm: '03_LineOA_Template_RM' },
    '04': { push: '04_LineOA_Template_push', rm: '04_LineOA_Template_RM' },
  });
  function resolveTemplateByNoAndName(paddedNo, blockName) {
    const variants = TEMPLATE_VARIANTS[paddedNo];
    if (!variants) return TEMPLATE_BY_NO[paddedNo] || '';
    const keys = Object.keys(variants);
    if (keys.length === 1) return variants[keys[0]];
    const name = String(blockName || '');
    if (/推文/.test(name) && variants.push) return variants.push;
    if (/選單/.test(name) && variants.rm) return variants.rm;
    // 名稱判不出版型時退回舊對照表，維持既有行為。
    return TEMPLATE_BY_NO[paddedNo] || variants[keys[0]] || '';
  }
  const ALL_TEMPLATE_IDS = Object.freeze([...new Set([
    ...Object.values(TEMPLATE_BY_NO),
    ...Object.values(TEMPLATE_VARIANTS).flatMap((v) => Object.values(v)),
    POPUP_TEMPLATE_ID,
  ])]);
  const CTA_DISABLED = /^(?:x(?:\s*請拿掉)?|請拿掉|不需要|無|none)$/i;
  // V0.4：CTA 文案限 3 字（先去除所有空白再計數）。3 字以內 → 代入 CTA_文案（以去空白後的字串代入）；
  // 超過 → 不套用（圖層維持公版預設文字與顯隱），診斷顯示超過限制。X／請拿掉 的整組隱藏行為不變。
  const CTA_MAX_CHARS = 3;
  function compactCtaText(value) { return String(value ?? '').replace(/[\s 　]+/g, ''); }
  const IMAGE_EXTENSIONS = ['png', 'svg', 'webp', 'jpg', 'jpeg'];
  // 工單「圖層名：值」可辨識的欄位標籤（資訊_01_文案01、活動_01_主案型、商品_01_品名 …）。
  const FIELD_LABEL = /^(?:資訊|活動|商品)_\d{2}_[^\s:：()（）]{1,20}$/;

  const KV_SLOTS = Object.freeze([
    { key: '__lineoa_kv_upload_1', placeholder: '套KV', bg: '活動_01_BG', wireframe: '活動_01_線框', psdName: '載入KV圖片_01' },
    { key: '__lineoa_kv_upload_2', placeholder: '套KV_2', bg: '活動_02_BG', wireframe: '活動_02_線框', psdName: '載入KV圖片_02' },
    { key: '__lineoa_kv_upload_3', placeholder: '套KV_3', bg: '活動_03_BG', wireframe: '活動_03_線框', psdName: '載入KV圖片_03' },
  ]);

  // 01_LineOA_Template_push 的商品套圖格：套品範圍只當顯示範圍/遮罩用，不輸出線條或色塊。
  const PRODUCT_SLOTS = Object.freeze([
    { key: '__lineoa_product_1', placeholder: '套商品', mask: '商品_01_套品範圍', psdName: '載入商品圖_01', product: '01' },
    { key: '__lineoa_product_2', placeholder: '套商品_2', mask: '商品_02_套品範圍', psdName: '載入商品圖_02', product: '02' },
    { key: '__lineoa_product_3', placeholder: '套商品_3', mask: '商品_03_套品範圍', psdName: '載入商品圖_03', product: '03' },
  ]);
  const PRODUCT_INDEXES = Object.freeze(['01', '02', '03']);
  const PRICE_GROUP_GAP = 5; // 原價與活動價的固定間隔（px）

  // ── 小工具 ─────────────────────────────────────────────
  function clean(value) {
    return String(value ?? '').replace(/_x000d_/gi, '\n').replace(/\r\n?/g, '\n').trim();
  }
  function normalizeName(value) {
    return String(value || '').normalize?.('NFKC').toLowerCase().replace(/[\s 　_\-＿－]+/g, '') || '';
  }
  function findLayerEntry(template, name) {
    const wanted = normalizeName(name);
    if (!wanted) return null;
    return Object.entries(template?.layers || {}).find(([key, layer]) =>
      normalizeName(layer?.psdName || layer?.name || key) === wanted || normalizeName(key) === wanted) || null;
  }
  function findLayer(template, name) {
    return findLayerEntry(template, name)?.[1] || null;
  }
  function sanitizeOutputName(value) {
    return String(value || '').trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
  }
  // 工單價格欄常是數字（如 6490 / 6490.0）→ 統一格式化成 $6,490；非數字內容原樣保留。
  function formatPrice(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const num = Number(raw.replace(/[$,\s]/g, ''));
    if (!Number.isFinite(num)) return raw;
    return `$${Math.round(num).toLocaleString('en-US')}`;
  }
  function assignImageAsset(layer, filename, assetProject = '') {
    if (!layer || !filename) return false;
    const stem = String(filename).replace(/\.[^.]+$/, '');
    const suppliedExt = String(filename).match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
    const nextFilename = suppliedExt ? filename : `${stem}.png`;
    if (String(layer.assetFilename || '') !== nextFilename || String(layer.assetProject || '') !== String(assetProject || '')) {
      delete layer.__resolvedAssetFolder;
      delete layer.__resolvedAssetFilename;
      delete layer.__resolvedAssetPath;
      delete layer.smartAssetId;
    }
    layer.assetFilename = nextFilename;
    const usedExt = suppliedExt || 'png';
    layer.assetCandidates = IMAGE_EXTENSIONS.filter((ext) => ext !== usedExt).map((ext) => `${stem}.${ext}`);
    layer.assetProject = assetProject;
    layer.keepAspectRatio = true;
    layer.hidden = false;
    layer.__assetMissing = false;
    return true;
  }

  // ── 工單解析（sheetParser）───────────────────────────────
  // 只要分頁裡至少有一個「公版編號」區塊就視為 LineOA 工單；否則回傳 null 讓其他解析流程接手。
  function parse({ rows }) {
    if (!Array.isArray(rows) || !rows.length) return null;

    // 1) 找欄位位置：A欄（素材命名）、CTA 欄、原價/活動價欄（表頭在前幾列）。
    let nameCol = 0;
    let ctaCol = 12; // 預設 M 欄
    let origPriceCol = 10; // 預設 K 欄
    let salePriceCol = 11; // 預設 L 欄
    for (let r = 0; r < Math.min(rows.length, 8); r += 1) {
      const row = rows[r] || [];
      row.forEach((cell, c) => {
        const value = clean(cell);
        if (!value) return;
        if (value.includes('素材命名')) nameCol = c;
        if (/^cta/i.test(value.replace(/\s+/g, ''))) ctaCol = c;
        if (value === '原價') origPriceCol = c;
        if (value === '活動價') salePriceCol = c;
      });
    }

    // 2) 依 A欄切區塊：A欄非空白、非「▼」、非表頭 = 區塊起點。
    //    注意：工單的 A欄常用「合併儲存格」，經 sheetToRowsWithMergedFill 展開後
    //    連續多列會出現相同名稱——這些列屬於同一個區塊（統整成一張圖），不可各自成塊。
    const nameAt = (r) => clean((rows[r] || [])[nameCol]);
    const isRealName = (value) => !!value && value !== '▼' && !value.includes('素材命名');
    const blockRanges = [];
    for (let r = 0; r < rows.length; r += 1) {
      const value = nameAt(r);
      if (!isRealName(value)) continue;
      if (r > 0 && nameAt(r - 1) === value) continue; // 合併儲存格展開的延續列
      let end = rows.length;
      for (let rr = r + 1; rr < rows.length; rr += 1) {
        const next = nameAt(rr);
        if (next && next !== value) { end = rr; break; }
      }
      blockRanges.push({ startRow: r, endRow: end, name: value.split('\n')[0].trim() });
    }

    if (!blockRanges.length) return null;

    const blocks = [];
    const warnings = [];
    const skippedRows = [];
    let templateNoBlockCount = 0;

    for (const range of blockRanges) {
      // 3) 讀公版編號：支援「公版編號：03」與「公版編號：POPUP_06」兩種寫法。
      let templateNo = '';
      for (let r = range.startRow; r < range.endRow && !templateNo; r += 1) {
        for (const cell of rows[r] || []) {
          // V0.4：支援三種寫法——「公版編號：03」「公版編號：POPUP_06」「公版編號：02_LineOA_Template_RM」（全名）。
          const match = clean(cell).match(/公版編號\s*[:：]?\s*(POPUP[\s_\-]*\d+|\d{2}_[A-Za-z0-9_]+|\d{1,3})/i);
          if (match) { templateNo = match[1].trim(); break; }
        }
      }

      if (!templateNo) {
        skippedRows.push({ row: range.startRow + 1, name: range.name, reason: '沒有公版編號（專案申請 / TBC），略過' });
        continue;
      }
      templateNoBlockCount += 1;

      // 路由：POPUP_XX → POPUP（等比放大＋透明補邊 1040×1289、輸出 PNG）；
      //       全名（含底線的完整公版 ID）→ 直接比對已知公版清單，最精確；
      //       純數字 → 依「編號＋A欄名稱版型（推文→push／選單→RM）」對照。沒有對應 JSON 一律列入診斷略過。
      const isPopup = /^popup/i.test(templateNo);
      // paddedNo：純數字或全名的前置數字（例：02_LineOA_Template_RM → 02），供 __layoutNo 等後續使用。
      const paddedNo = isPopup ? '' : String((templateNo.match(/^(\d{1,3})/) || [, ''])[1] || '').padStart(2, '0');
      let routedTemplateId = '';
      if (isPopup) {
        routedTemplateId = POPUP_TEMPLATE_ID;
      } else if (/^\d+$/.test(templateNo)) {
        routedTemplateId = resolveTemplateByNoAndName(paddedNo, range.name);
      } else {
        const wanted = templateNo.toLowerCase();
        routedTemplateId = ALL_TEMPLATE_IDS.find((id) => id.toLowerCase() === wanted) || '';
        if (!routedTemplateId) {
          // 全名對不到已知清單（例如未來新公版）→ 保底取前置數字＋A欄判別。
          if (paddedNo && paddedNo !== '00') routedTemplateId = resolveTemplateByNoAndName(paddedNo, range.name);
        }
      }
      if (!routedTemplateId) {
        skippedRows.push({ row: range.startRow + 1, name: range.name, reason: `公版編號：${templateNo}，尚未提供對應公版 JSON（目前支援 ${Object.keys(TEMPLATE_VARIANTS).join('/')}/POPUP_XX），略過` });
        continue;
      }

      // 4) 收集「圖層名：值」欄位；有「商品_0X_」標籤的列，同列的 原價/活動價/CTA 欄一併歸給該商品；
      //    沒有商品標籤的列，CTA 依序歸給 活動_01/02/03。
      const record = {};
      let activityCount = 0;
      for (let r = range.startRow; r < range.endRow; r += 1) {
        const row = rows[r] || [];
        let rowProductNo = '';
        row.forEach((cell) => {
          const value = clean(cell);
          if (!value) return;
          const match = value.match(/^([^:：\n]{1,32})\s*[:：]\s*([\s\S]+)$/);
          if (!match) return;
          const label = match[1].trim();
          const text = match[2].trim();
          if (!text || !FIELD_LABEL.test(label)) return;
          if (record[label] === undefined) record[label] = text;
          const productMatch = label.match(/^商品_(\d{2})_/);
          if (productMatch) rowProductNo = productMatch[1];
        });

        const ctaValue = clean(row[ctaCol]);
        if (rowProductNo) {
          const origPrice = formatPrice(row[origPriceCol]);
          const salePrice = formatPrice(row[salePriceCol]);
          if (origPrice && record[`商品_${rowProductNo}_原價`] === undefined) record[`商品_${rowProductNo}_原價`] = origPrice;
          if (salePrice && record[`商品_${rowProductNo}_活動價`] === undefined) record[`商品_${rowProductNo}_活動價`] = salePrice;
          if (ctaValue && record[`商品_${rowProductNo}_CTA`] === undefined) record[`商品_${rowProductNo}_CTA`] = ctaValue;
        } else if (ctaValue) {
          activityCount += 1;
          if (activityCount <= 3) record[`活動_0${activityCount}_CTA`] = ctaValue;
        }
      }

      record.__templateId = routedTemplateId;
      record.__ruleFamily = FAMILY;
      record.__layoutNo = isPopup ? templateNo : paddedNo;
      record.__outputName = sanitizeOutputName(range.name);
      record.__sourceRow = range.startRow + 1;
      record.__hasContent = true;
      if (isPopup) {
        // POPUP_06 → 依名稱到素材裡找 POPUP_06.png；輸出用 PNG 保留透明補邊。
        record.__popupAsset = templateNo.toUpperCase().replace(/[\s\-]+/g, '_').replace(/POPUP_?/, 'POPUP_');
        record.__outputFormat = 'png';
      }

      blocks.push({
        name: routedTemplateId,
        headerRow: range.startRow,
        startRow: range.startRow,
        quantity: 1,
        records: [record],
        colMap: {},
        templateType: 'lineoa-rm',
      });
    }

    // 整個分頁完全沒有「公版編號」→ 不是 LineOA 工單，交還其他解析流程。
    if (!templateNoBlockCount) return null;
    if (!blocks.length) {
      warnings.push(`此分頁沒有任何可處理的公版編號區塊；目前支援：${Object.keys(TEMPLATE_VARIANTS).join(' / ')} / POPUP_XX。`);
    }
    return { blocks, anchorCount: blockRanges.length, warnings, skippedRows };
  }

  // ── 套KV 上傳格 ─────────────────────────────────────────
  function ensureKvUploadSlots(template, options = {}) {
    KV_SLOTS.forEach((slot) => {
      const bgEntry = findLayerEntry(template, slot.bg);
      const bg = bgEntry?.[1];
      if (!bg) return;

      // 「套KV」占位文字改為隱藏、不可點擊；提示改由上傳格自己繪製。
      const placeholderEntry = findLayerEntry(template, slot.placeholder);
      if (placeholderEntry) {
        placeholderEntry[1].hidden = true;
        placeholderEntry[1].__nonInteractive = true;
      }

      // 02_RM 類公版：BG 本身是 image 且已帶素材檔名（公版自帶 KV）→ 上傳KV功能整個不出現，
      // 避免空上傳格的「+點擊上傳KV圖片」提示蓋在已載入的 KV 素材上。
      // 該素材實際載入失敗（__assetMissing）時不抑制 → 下次套版自動恢復上傳格供手動補圖。
      const bgHasOwnAsset = bg.type === 'image'
        && String(bg.assetFilename || '').trim() !== ''
        && bg.__assetMissing !== true;
      if (bgHasOwnAsset) {
        const existing = template.layers?.[slot.key];
        // 使用者已經上傳過圖片的格子不移除（保留手動結果）；空格才拆掉。
        if (existing && String(existing.assetFilename || '').trim() === '') {
          delete template.layers[slot.key];
          if (Array.isArray(template.renderOrder)) template.renderOrder = template.renderOrder.filter((key) => key !== slot.key);
        }
        return;
      }

      // 記住 BG 原始底色（Delete 重置 KV 時要還原「吸色」前的顏色）。
      if (bg.__lineoaOriginalFill === undefined) bg.__lineoaOriginalFill = bg.fill || bg.shape?.fill || null;

      let layer = template.layers?.[slot.key];
      if (!layer) {
        layer = {
          type: 'image',
          psdName: slot.psdName,
          assetFilename: '',
          assetCandidates: [],
          assetProject: '',
          keepAspectRatio: true,
          sizingMode: 'coverByPBox',
          maskLayerName: slot.bg,
          role: 'lineoa_kv_upload',
          hidden: false,
          locked: false,
          __uploadSlot: true,
          __uploadPrompt: '+點擊上傳KV圖片',
          __uploadPromptColor: '#FFFFFF',
          __uploadPromptFontSize: 40, // V0.3：由 72 改為 40，與商品格/POPUP 格提示一致
        };
        template.layers = template.layers || {};
        template.layers[slot.key] = layer;
      }

      if (options.resetGeometry || !Number.isFinite(Number(layer.centerX))) {
        const width = Math.max(1, Number(bg.width || 1));
        const height = Math.max(1, Number(bg.height || 1));
        const centerX = Number.isFinite(Number(bg.centerX)) ? Number(bg.centerX) : Number(bg.x || 0) + width / 2;
        const centerY = Number.isFinite(Number(bg.centerY)) ? Number(bg.centerY) : Number(bg.y || 0) + height / 2;
        layer.x = centerX - width / 2;
        layer.y = centerY - height / 2;
        layer.width = width;
        layer.height = height;
        layer.centerX = centerX;
        layer.centerY = centerY;
        layer.targetWidth = width;
        layer.targetHeight = height;
        layer.rotation = 0;
        layer.sizingMode = 'coverByPBox';
      }

      // renderOrder：放在占位文字（沒有就放在 BG）上方，維持在 線框 / CTA 之下。
      template.renderOrder = Array.isArray(template.renderOrder) ? template.renderOrder : [];
      template.renderOrder = template.renderOrder.filter((key) => key !== slot.key);
      const anchorKey = placeholderEntry?.[0] || bgEntry?.[0];
      const anchorIndex = anchorKey ? template.renderOrder.indexOf(anchorKey) : -1;
      template.renderOrder.splice(anchorIndex >= 0 ? anchorIndex + 1 : template.renderOrder.length, 0, slot.key);
    });
  }

  // ── 商品套圖上傳格（01_LineOA_Template_push）──────────────
  // 套品範圍不輸出成實際線條/色塊，只作為商品顯示範圍（遮罩）使用；
  // 超過範圍的部分由 maskLayerName 自動裁切。
  function applySlotGeometryFromBox(layer, box) {
    if (!layer || !box) return;
    layer.x = box.x;
    layer.y = box.y;
    layer.width = box.width;
    layer.height = box.height;
    layer.centerX = box.x + box.width / 2;
    layer.centerY = box.y + box.height / 2;
    layer.targetWidth = box.width;
    layer.targetHeight = box.height;
    layer.maxTargetHeight = box.height;
    layer.rotation = 0;
  }

  function ensureProductUploadSlots(template, options = {}) {
    PRODUCT_SLOTS.forEach((slot) => {
      const maskEntry = findLayerEntry(template, slot.mask);
      const mask = maskEntry?.[1];
      if (!mask) return;

      // 套品範圍：隱藏（不輸出線條/色塊），僅供遮罩與範圍判定。
      mask.hidden = true;
      mask.__nonInteractive = true;

      const placeholderEntry = findLayerEntry(template, slot.placeholder);
      if (placeholderEntry) {
        placeholderEntry[1].hidden = true;
        placeholderEntry[1].__nonInteractive = true;
      }

      let layer = template.layers?.[slot.key];
      if (!layer) {
        layer = {
          type: 'image',
          psdName: slot.psdName,
          assetFilename: '',
          assetCandidates: [],
          assetProject: '',
          keepAspectRatio: true,
          sizingMode: 'containByPBox',
          __uploadSizingMode: 'containByPBox', // 商品圖等比放入範圍，不裁切；放大超過範圍才由遮罩裁切
          maskLayerName: slot.mask,
          role: 'lineoa_product_upload',
          hidden: false,
          locked: false,
          __uploadSlot: true,
          __uploadPrompt: '+上傳商品圖',
          __uploadPromptColor: '#8C8C8C',
          __uploadPromptFontSize: 40,
        };
        template.layers = template.layers || {};
        template.layers[slot.key] = layer;
      }
      if (options.resetGeometry || !Number.isFinite(Number(layer.centerX))) {
        applySlotGeometryFromBox(layer, layerBox(mask));
        layer.sizingMode = 'containByPBox';
      }

      // renderOrder：放在占位文字（套商品）上方 → 蓋在 商品_BG 之上、品名/價格/CTA 之下。
      template.renderOrder = Array.isArray(template.renderOrder) ? template.renderOrder : [];
      template.renderOrder = template.renderOrder.filter((key) => key !== slot.key);
      const anchorKey = placeholderEntry?.[0] || maskEntry?.[0];
      const anchorIndex = anchorKey ? template.renderOrder.indexOf(anchorKey) : -1;
      template.renderOrder.splice(anchorIndex >= 0 ? anchorIndex + 1 : template.renderOrder.length, 0, slot.key);
    });
  }

  // 品名 = 素材檔名時自動載入商品圖（例如 商品_01_品名「聲寶14吋立扇」→ 聲寶14吋立扇.jpg）。
  // 找不到同名素材 → 顯示「+上傳商品圖」（可點選或拖曳上傳）。只在新工單首次套版時執行，
  // 預覽刷新不重跑，避免蓋掉使用者手動上傳/刪除的結果。
  function autoMatchProductImages(template, record, diagnostics) {
    PRODUCT_SLOTS.forEach((slot) => {
      const layer = template.layers?.[slot.key];
      if (!layer) return;
      const rawName = String(record?.[`商品_${slot.product}_品名`] || '').trim();
      if (!rawName) return;
      const compact = rawName.replace(/[\s 　]+/g, '');
      const match = window.BatchManager?.findAssetFilename?.(compact, { layerKey: slot.key, layer, template });
      if (match?.found) {
        delete layer.__resolvedAssetFolder;
        delete layer.__resolvedAssetFilename;
        delete layer.__resolvedAssetPath;
        delete layer.smartAssetId;
        layer.assetFilename = match.filename;
        layer.assetCandidates = [];
        layer.assetProject = '';
        layer.hidden = false;
        layer.__assetMissing = false;
        diagnostics?.push({ field: `商品_${slot.product}_商品圖`, status: 'ok', value: compact, target: `${slot.psdName} → ${match.filename}` });
      } else {
        layer.assetFilename = '';
        layer.assetCandidates = [];
        diagnostics?.push({ field: `商品_${slot.product}_商品圖`, status: 'missing', value: compact, target: '素材內無同名圖片，改顯示「+上傳商品圖」' });
      }
    });
  }

  // POPUP：依「公版編號：POPUP_XX」自動載入同名素材（POPUP_XX.png）；找不到 → 顯示上傳格。
  function applyPopupAsset(template, record, diagnostics, skipExactLayout) {
    const layer = findLayer(template, '載入POPUP圖片') || template.layers?.popup;
    if (!layer) return;
    if (skipExactLayout) return; // 預覽刷新保留使用者手動上傳/刪除結果
    const stem = String(record?.__popupAsset || '').trim();
    if (!stem) return;
    const match = window.BatchManager?.findAssetFilename?.(stem, { layerKey: 'popup', layer, template });
    if (match?.found) {
      delete layer.__resolvedAssetFolder;
      delete layer.__resolvedAssetFilename;
      delete layer.__resolvedAssetPath;
      layer.assetFilename = match.filename;
      layer.assetCandidates = [];
      layer.assetProject = '';
      layer.hidden = false;
      layer.__assetMissing = false;
      diagnostics?.push({ field: 'POPUP', status: 'ok', value: stem, target: `等比放大＋透明補邊 1040×1289 → ${match.filename}` });
    } else {
      layer.assetFilename = '';
      layer.assetCandidates = [];
      diagnostics?.push({ field: 'POPUP', status: 'missing', value: stem, target: '素材內無同名 POPUP 圖，改顯示「+上傳POPUP圖片」' });
    }
  }

  // ── 預設鎖定圖層 ─────────────────────────────────────────
  // XXX_BG、CTA_XX_XX、活動_XX_線框 預設鎖定（鎖定圖層不攔截畫布點擊，點擊會穿透到 KV 上傳格）。
  // 只在「第一次套版」時鎖定一次；之後使用者在左側圖層清單解鎖的狀態會被保留，不會被預覽刷新蓋回去。
  const DEFAULT_LOCKED_LAYERS = Object.freeze([
    // 03_RM
    '左側_BG', '資訊_01_BG',
    'CTA_白_文案', 'CTA_白_BG', 'CTA_白_三角形',
    'CTA_黑_文案', 'CTA_黑_BG', 'CTA_黑_三角形',
    'CTA_白_文案_2', 'CTA_白_BG_2', 'CTA_白_三角形_2',
    'CTA_黑_文案_2', 'CTA_黑_BG_2', 'CTA_黑_三角形_2',
    // 01/03/04 共用
    'kv_bg',
    '活動_01_BG', '活動_01_線框', '活動_02_BG', '活動_02_線框', '活動_03_BG', '活動_03_線框',
    '活動_01_CTA',
    // 01_push 商品區
    '商品_01_BG', '商品_02_BG', '商品_03_BG',
    '商品_01_CTA_文案', '商品_01_CTA_BG', '商品_01_CTA_三角形',
    '商品_02_CTA_文案', '商品_02_CTA_BG', '商品_02_CTA_三角形',
    '商品_03_CTA_文案', '商品_03_CTA_BG', '商品_03_CTA_三角形',
  ]);

  function lockDefaultLayers(template) {
    DEFAULT_LOCKED_LAYERS.forEach((name) => {
      const layer = findLayer(template, name);
      if (!layer || layer.__lineoaLockInit) return;
      layer.__lineoaLockInit = true;
      layer.locked = true;
    });
  }

  // ── 商品 原價/活動價 專屬文字樣式 ──────────────────────────
  // 大小字規則（本公版規格）：`$` 與千分位逗號為小字，所有數字為大字；
  // 小字比例採 SPTextStandard 的價格專用比例 79.5%（PRICE_SMALL_RATIO），非標題的 82%。
  // 原價另套刪除線（貫穿整段，含 $ 與逗號；由 core Renderer 的通用 line-through 能力繪製）。
  const PRICE_LAYER_PATTERN = /_(原價|活動價)$/;
  const PRICE_SMALL_CHARS = new Set(['$', '＄', ',', '，']);

  function applyLineoaPriceRanges(layer) {
    if (!layer || layer.type !== 'text') return false;
    // 價格圖層由本規則以 79.5% 接手，全域 82% 標準（applyTemplateNonPriceText）不得再處理。
    layer.__disableGlobalTextStandard = true;
    layer.__lineoaPriceStyled = true; // 標記：refresh／重複套版時由 applyPriceDecorations 重建 ranges
    const text = String(layer.text || '');
    if (!text.trim()) return false;
    const ratio = Number(window.SPTextStandard?.PRICE_SMALL_RATIO) > 0 ? Number(window.SPTextStandard.PRICE_SMALL_RATIO) : 0.795;
    // 以 layer.fontSizePx 為唯一 base，每次都從 base 重建，重複套用不會 79.5% 疊乘。
    const bigFs = Number(layer.fontSizePx) > 0 ? Math.round(Number(layer.fontSizePx) * 100) / 100 : 24;
    const smallFs = Math.round(bigFs * ratio * 100) / 100;
    const ranges = [];
    for (let i = 0; i < text.length; i += 1) {
      const fontSizePx = PRICE_SMALL_CHARS.has(text[i]) ? smallFs : bigFs;
      const previous = ranges[ranges.length - 1];
      if (previous && previous.to === i && previous.fontSizePx === fontSizePx) previous.to = i + 1;
      else ranges.push({ from: i, to: i + 1, fontSizePx, __lineoaPriceRange: true });
    }
    layer.textStyleRanges = ranges;
    layer.styledTextVerticalAlign = 'source-baseline';
    return true;
  }

  // 原價/活動價樣式統一入口：79.5% 大小字 + 原價刪除線。
  // 批次套版與文字編輯後的 refresh 都會經過這裡，使用者手動改字也能維持樣式。
  function applyPriceDecorations(template) {
    PRODUCT_INDEXES.forEach((productNo) => {
      const original = findLayer(template, `商品_${productNo}_原價`);
      if (original && original.type === 'text') {
        applyLineoaPriceRanges(original);
        original.textDecoration = 'line-through';
      }
      const sale = findLayer(template, `商品_${productNo}_活動價`);
      if (sale && sale.type === 'text') applyLineoaPriceRanges(sale);
    });
    // 其餘掛了價格樣式旗標的圖層（例如 活動_XX_價格01）：手動改字/重複套版後同樣重建 79.5% ranges。
    Object.entries(template?.layers || {}).forEach(([key, layer]) => {
      if (!layer || layer.type !== 'text' || layer.__lineoaPriceStyled !== true) return;
      if (PRICE_LAYER_PATTERN.test(String(layer.psdName || key))) return; // 原價/活動價上面已處理
      applyLineoaPriceRanges(layer);
    });
  }

  // ── 套版 ───────────────────────────────────────────────
  function applyTextLayer(template, layerName, value, diagnostics, field = layerName) {
    const layer = findLayer(template, layerName);
    if (!layer || layer.type !== 'text') {
      diagnostics?.push({ field, status: 'missing-layer', value: String(value), target: layerName });
      return false;
    }
    layer.text = String(value).trim();
    layer.hidden = false;
    // 多行文案（需求：工單斷行 → 自動兩行）：PSD 匯出的 lineHeight 來自單行文字，
    // 常小於字級（例：主案型 fs=80、lineHeight=58）→ 兩行會互相重疊。
    // 有斷行且行高小於字級時，改用 1.1 倍字級行距；單行文字不動。
    if (layer.text.includes('\n')) {
      const lineFontSize = Number(layer.fontSizePx) > 0 ? Number(layer.fontSizePx) : 24;
      if (!(Number(layer.lineHeight) >= lineFontSize)) layer.lineHeight = Math.round(lineFontSize * 1.1 * 100) / 100;
    }
    // 原價/活動價走 79.5% 價格大小字（applyLineoaPriceRanges）；其餘文字走全域 82% 標準。
    if (PRICE_LAYER_PATTERN.test(String(layerName))) applyLineoaPriceRanges(layer);
    else window.SPTextStandard?.applyNonPriceTextLayer?.(layer, layerName);
    diagnostics?.push({ field, status: 'ok', value: layer.text, target: layerName });
    return true;
  }

  function applyImageLayer(template, layerName, value, diagnostics, field = layerName) {
    const layer = findLayer(template, layerName);
    if (!layer || layer.type !== 'image') {
      diagnostics?.push({ field, status: 'missing-layer', value: String(value), target: layerName });
      return false;
    }
    // 工單只寫素材名稱關鍵字（例如「免運車」）；副檔名由候選清單嘗試，
    // 素材檔請放在 assets 的專案資料夾或「共用素材」內。
    const stem = String(value).split('\n')[0].trim();
    assignImageAsset(layer, stem, '');
    diagnostics?.push({ field, status: 'ok', value: stem, target: `${layerName} → ${stem}` });
    return true;
  }

  // ── 活動 素材/價格：值拆分與圖層退回 ──────────────────────
  // 工單「活動_XX_素材YY」的值結尾為 `_$金額`（例：商城券_單券_$200）時拆成兩段：
  // 前段＝圖片名（同名素材套進素材圖層）、`$金額` 套進該活動的價格圖層（79.5% 價格大小字）。
  // 沒有 `_$` 結尾（例：VIP_蝦幣_100）整串當圖片名；該活動沒有價格圖層時只套圖。
  // 圖層對應：同名優先；對不到時退回該活動的 素材01／價格01（工單尾碼跟著活動流水號、公版圖層固定 01）。
  const ACTIVITY_ASSET_FIELD = /^(活動_\d{2})_素材(\d{2})$/;
  const ACTIVITY_PRICE_FIELD = /^(活動_\d{2})_價格(\d{2})$/;
  const ASSET_PRICE_SUFFIX = /^(.+?)_(\$[\d,，.]+)$/;

  function resolveActivityLayer(template, field, kind) {
    const direct = findLayer(template, field);
    if (direct) return { layer: direct, target: field };
    const pattern = kind === '素材' ? ACTIVITY_ASSET_FIELD : ACTIVITY_PRICE_FIELD;
    const match = field.match(pattern);
    if (!match) return { layer: null, target: field };
    const fallbackName = `${match[1]}_${kind}01`;
    return { layer: findLayer(template, fallbackName), target: fallbackName };
  }

  function applyPriceStyledText(layer, value) {
    layer.text = String(value).replace(/，/g, ',').trim();
    layer.hidden = false;
    applyLineoaPriceRanges(layer);
  }

  function applyActivityAssetField(template, field, value, diagnostics) {
    const assetMatch = field.match(ACTIVITY_ASSET_FIELD);
    if (!assetMatch) return false;
    const { layer: imageLayer, target: imageTarget } = resolveActivityLayer(template, field, '素材');
    if (!imageLayer || imageLayer.type !== 'image') {
      diagnostics?.push({ field, status: 'missing-layer', value, target: '此公版無對應素材圖層' });
      return true;
    }
    const priceSplit = String(value).split('\n')[0].trim().match(ASSET_PRICE_SUFFIX);
    const stem = priceSplit ? priceSplit[1].trim() : String(value).split('\n')[0].trim();
    assignImageAsset(imageLayer, stem, '');
    diagnostics?.push({ field, status: 'ok', value: stem, target: `${imageTarget} → ${stem}` });
    if (priceSplit) {
      const priceField = `${assetMatch[1]}_價格${assetMatch[2]}`;
      const { layer: priceLayer, target: priceTarget } = resolveActivityLayer(template, priceField, '價格');
      if (priceLayer && priceLayer.type === 'text') {
        applyPriceStyledText(priceLayer, priceSplit[2]);
        diagnostics?.push({ field: priceField, status: 'ok', value: priceLayer.text, target: priceTarget });
      } else {
        diagnostics?.push({ field: priceField, status: 'missing-layer', value: priceSplit[2], target: '此活動無價格圖層，金額未套用' });
      }
    }
    return true;
  }

  // ── 主案型「VIP 首行 → 蝦皮VIP LOGO」 ────────────────────
  // 僅適用 活動_XX_主案型：第一行完全等於 VIP（忽略大小寫/空白）時移除該行、
  // 顯示「水平重疊且緊鄰其正上方」的 蝦皮VIP_LOGO 圖層；沒有 VIP 行則隱藏該 LOGO。
  // 右上角副標題區的同名 LOGO 距離任何主案型都超過門檻，不受影響。
  const MAIN_CASE_LAYER = /^活動_\d{2}_主案型$/;
  const VIP_LOGO_NAME = /蝦皮VIP_?LOGO/i;
  const VIP_LOGO_GAP_PX = 200;

  function findAdjacentVipLogo(template, mainLayer) {
    const mx0 = Number(mainLayer.x || 0);
    const mx1 = mx0 + Number(mainLayer.width || 0);
    const mainTop = Number(mainLayer.y || 0);
    let best = null;
    let bestGap = Infinity;
    Object.entries(template?.layers || {}).forEach(([key, layer]) => {
      if (!layer || layer.type !== 'image') return;
      if (!VIP_LOGO_NAME.test(String(layer.psdName || key))) return;
      const centerX = Number(layer.x || 0) + Number(layer.width || 0) / 2;
      if (centerX < mx0 || centerX > mx1) return; // 需水平落在主案型範圍內
      const gap = mainTop - (Number(layer.y || 0) + Number(layer.height || 0));
      if (gap < -10 || gap > VIP_LOGO_GAP_PX) return; // 需緊鄰在主案型正上方
      if (gap < bestGap) { bestGap = gap; best = layer; }
    });
    return best;
  }

  // 主案型垂直定位統一：全域大小字標準只在文案含大小字符號（$、逗號等）時才把圖層
  // 切到 source-baseline（PSD 原位），純文字文案會落回預設置中 → 同一排主案型會因
  // 文案內容不同而首行高低不一（活動_01 vs 活動_02 偏移的成因之一）。
  // 統一策略：主案型一律採 source-baseline；基準已於公版載入時從 PSD 原始文字建立，
  // 搭配換行符正規化（\u0003）修正後，各活動的首行基準完全一致。
  function unifyMainCaseVerticalMode(template) {
    Object.entries(template?.layers || {}).forEach(([key, layer]) => {
      if (!layer || layer.type !== 'text') return;
      if (!MAIN_CASE_LAYER.test(String(layer.psdName || key))) return;
      layer.styledTextVerticalAlign = 'source-baseline';
    });
  }

  function applyVipMainCaseRule(template) {
    Object.entries(template?.layers || {}).forEach(([key, layer]) => {
      if (!layer || layer.type !== 'text') return;
      const name = String(layer.psdName || key);
      if (!MAIN_CASE_LAYER.test(name)) return;
      const lines = String(layer.text || '').split('\n');
      const hasVipLine = lines.length > 0 && lines[0].trim().toUpperCase() === 'VIP';
      if (hasVipLine) {
        layer.text = lines.slice(1).join('\n').trim();
        layer.__lineoaVipActive = true; // 冪等：重複執行時首行已移除，用旗標維持 LOGO 顯示
        window.SPTextStandard?.applyNonPriceTextLayer?.(layer, name);
      }
      const logo = findAdjacentVipLogo(template, layer);
      if (!logo) return;
      logo.hidden = !(hasVipLine || layer.__lineoaVipActive === true);
    });
  }

  function applyLabeledFields(template, record, diagnostics) {
    Object.entries(record || {}).forEach(([field, rawValue]) => {
      if (!FIELD_LABEL.test(field) || /_CTA$/.test(field)) return;
      const value = String(rawValue ?? '').trim();
      if (!value) return;
      if (applyActivityAssetField(template, field, value, diagnostics)) return;
      if (ACTIVITY_PRICE_FIELD.test(field)) {
        // 工單直接給價格欄位（活動_XX_價格YY）：同樣走退回對應與 79.5% 價格大小字。
        const { layer: priceLayer, target } = resolveActivityLayer(template, field, '價格');
        if (priceLayer && priceLayer.type === 'text') {
          applyPriceStyledText(priceLayer, value);
          diagnostics?.push({ field, status: 'ok', value: priceLayer.text, target });
        } else {
          diagnostics?.push({ field, status: 'missing-layer', value, target: '此公版無對應價格圖層' });
        }
        return;
      }
      const layer = findLayer(template, field);
      if (layer?.type === 'text') applyTextLayer(template, field, value, diagnostics, field);
      else if (layer?.type === 'image') applyImageLayer(template, field, value, diagnostics, field);
      else diagnostics?.push({ field, status: 'missing-layer', value, target: '此公版無同名圖層' });
    });
  }

  // ── CTA 白/黑 版本切換 ───────────────────────────────────
  // CTA_白 = 白底黑字（配深色 KV）；CTA_黑 = 黑底白字（配淺色 KV）。
  // 每個活動同時存在兩組圖層，同一時間只顯示其中一組；
  // 上傳 KV 後由 onUploadSlotAssetApplied 依 CTA 區域的平均亮度自動切換。
  const DEFAULT_CTA_VARIANT = '白';
  const CTA_LUMINANCE_THRESHOLD = 0.55; // KV 亮度 >= 0.55 → 淺色背景 → 用 CTA_黑

  function ctaDisabledState(template) {
    template.__lineoaCtaDisabled = template.__lineoaCtaDisabled || {};
    return template.__lineoaCtaDisabled;
  }
  function ctaVariantState(template) {
    template.__lineoaCtaVariant = template.__lineoaCtaVariant || {};
    return template.__lineoaCtaVariant;
  }

  function setCtaVariant(template, index, variant) {
    const suffix = index === 1 ? '' : '_2';
    if (ctaDisabledState(template)[index]) {
      ['CTA_白', 'CTA_黑'].forEach((group) => {
        ['文案', 'BG', '三角形'].forEach((part) => {
          const layer = findLayer(template, `${group}_${part}${suffix}`);
          if (layer) layer.hidden = true;
        });
      });
      return;
    }
    const chosen = variant === '黑' ? 'CTA_黑' : 'CTA_白';
    ctaVariantState(template)[index] = variant === '黑' ? '黑' : '白';
    ['CTA_白', 'CTA_黑'].forEach((group) => {
      const hidden = group !== chosen;
      ['文案', 'BG', '三角形'].forEach((part) => {
        const layer = findLayer(template, `${group}_${part}${suffix}`);
        if (layer) layer.hidden = hidden;
      });
    });
  }

  function applyCta(template, index, rawValue, diagnostics) {
    const value = String(rawValue ?? '').trim();
    const suffix = index === 1 ? '' : '_2';
    const disabled = !!value && CTA_DISABLED.test(value);
    ctaDisabledState(template)[index] = disabled;
    const compactCta = compactCtaText(value);
    const overLimit = !!value && !disabled && [...compactCta].length > CTA_MAX_CHARS;
    if (overLimit) {
      diagnostics?.push({
        field: `活動_0${index}_CTA`,
        status: 'missing',
        value,
        target: `CTA 文案超過 ${CTA_MAX_CHARS} 字限制，未套用（圖層維持公版預設）`,
      });
    }
    if (value && !disabled && !overLimit) {
      ['CTA_白', 'CTA_黑'].forEach((group) => {
        const textLayer = findLayer(template, `${group}_文案${suffix}`);
        if (textLayer && textLayer.type === 'text') {
          textLayer.text = compactCta;
          window.SPTextStandard?.applyNonPriceTextLayer?.(textLayer, `${group}_文案${suffix}`);
        }
      });
    }
    // 依上次（或預設）的白/黑選擇整理可見性；X/請拿掉 → 兩組全部隱藏。
    setCtaVariant(template, index, ctaVariantState(template)[index] || DEFAULT_CTA_VARIANT);
    if (value && !overLimit) {
      diagnostics?.push({
        field: `活動_0${index}_CTA`,
        status: 'ok',
        value,
        target: disabled ? `活動_0${index} CTA 整組隱藏` : `CTA_${ctaVariantState(template)[index]}_文案${suffix}`,
      });
    }
  }

  // ── KV 明暗偵測（上傳 KV 後自動選 CTA_白 / CTA_黑）─────────
  function layerBox(layer) {
    if (!layer) return null;
    const width = Math.max(1, Number(layer.width || 1));
    const height = Math.max(1, Number(layer.height || 1));
    const x = Number.isFinite(Number(layer.x)) ? Number(layer.x)
      : (Number.isFinite(Number(layer.centerX)) ? Number(layer.centerX) - width / 2 : 0);
    const y = Number.isFinite(Number(layer.y)) ? Number(layer.y)
      : (Number.isFinite(Number(layer.centerY)) ? Number(layer.centerY) - height / 2 : 0);
    return { x, y, width, height };
  }

  function unionBox(a, b) {
    if (!a) return b;
    if (!b) return a;
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.width, b.x + b.width);
    const y2 = Math.max(a.y + a.height, b.y + b.height);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  // 量測上傳 KV 在「CTA 落點區域」的平均亮度（0~1）。
  // KV 以 coverByPBox 貼滿 活動_0X_BG，因此先做 cover 換算，把畫布上的 CTA 區域映射回原圖像素再取樣。
  function measureKvRegionLuminance(image, maskBox, regionBox) {
    try {
      const imgW = Number(image?.naturalWidth || image?.width || 0);
      const imgH = Number(image?.naturalHeight || image?.height || 0);
      if (!imgW || !imgH || !maskBox || !regionBox) return null;

      const scale = Math.max(maskBox.width / imgW, maskBox.height / imgH);
      const offX = (imgW * scale - maskBox.width) / 2;
      const offY = (imgH * scale - maskBox.height) / 2;
      const pad = 24; // CTA 周圍多取一點背景，判斷更穩定
      const rx = regionBox.x - maskBox.x - pad;
      const ry = regionBox.y - maskBox.y - pad;
      const rw = regionBox.width + pad * 2;
      const rh = regionBox.height + pad * 2;

      let sx = (rx + offX) / scale;
      let sy = (ry + offY) / scale;
      let sw = rw / scale;
      let sh = rh / scale;
      sx = Math.max(0, Math.min(imgW - 1, sx));
      sy = Math.max(0, Math.min(imgH - 1, sy));
      sw = Math.max(1, Math.min(imgW - sx, sw));
      sh = Math.max(1, Math.min(imgH - sy, sh));

      const sampleW = 48;
      const sampleH = Math.max(8, Math.round((sh / sw) * sampleW));
      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, sx, sy, sw, sh, 0, 0, sampleW, sampleH);
      const { data } = context.getImageData(0, 0, sampleW, sampleH);

      let total = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 16) continue; // 忽略透明像素
        total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        count += 1;
      }
      return count ? total / count : null;
    } catch (error) {
      console.warn('[LineOA] KV 亮度偵測失敗，維持目前 CTA 顏色：', error);
      return null;
    }
  }

  // 吸取 KV 圖片「左上角」的顏色（取左上 6×6 原始像素的平均，避免單一像素雜訊；回傳 #RRGGBB）。
  // 上傳 KV 後把 活動_0X_BG 底色補成同色，縮小/移動 KV 時露出的底色與 KV 一致。
  function measureImageTopLeftColor(image) {
    try {
      const imgW = Number(image?.naturalWidth || image?.width || 0);
      const imgH = Number(image?.naturalHeight || image?.height || 0);
      if (!imgW || !imgH) return null;

      const patch = Math.max(1, Math.min(6, imgW, imgH)); // 左上角 6×6 原始像素
      const canvas = document.createElement('canvas');
      canvas.width = patch;
      canvas.height = patch;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, patch, patch, 0, 0, patch, patch);
      const { data } = context.getImageData(0, 0, patch, patch);

      let r = 0; let g = 0; let b = 0; let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 16) continue; // 忽略透明像素
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count += 1;
      }
      if (!count) return null;
      const hex = (value) => Math.round(value / count).toString(16).padStart(2, '0');
      return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
    } catch (error) {
      console.warn('[LineOA] KV 左上角吸色失敗，維持 BG 原色：', error);
      return null;
    }
  }

  function applyKvEdgeColorToBg(template, slot, image) {
    const bg = findLayer(template, slot.bg);
    if (!bg) return null;
    const color = measureImageTopLeftColor(image);
    if (!color) return null;
    if (bg.__lineoaOriginalFill === undefined) bg.__lineoaOriginalFill = bg.fill || bg.shape?.fill || null;
    bg.fill = color;
    if (bg.shape) bg.shape.fill = color;
    return color;
  }

  function onUploadSlotAssetApplied({ template, slotKey, image }) {
    const slot = KV_SLOTS.find((item) => item.key === slotKey);
    if (!slot || !image || !template) return null;
    const index = Number(slot.key.match(/_(\d)$/)?.[1] || 1);

    // 1) BG 底色 = KV 邊緣平均色（不受 CTA 是否隱藏影響）。
    const edgeColor = applyKvEdgeColorToBg(template, slot, image);

    // 2) 依 CTA 區域亮度自動選 CTA_白 / CTA_黑。
    let variant = null;
    if (!ctaDisabledState(template)[index]) {
      const suffix = index === 1 ? '' : '_2';
      const maskBox = layerBox(findLayer(template, slot.bg));
      const ctaBox = unionBox(layerBox(findLayer(template, `CTA_白_BG${suffix}`)), layerBox(findLayer(template, `CTA_黑_BG${suffix}`)));
      if (maskBox && ctaBox) {
        const luminance = measureKvRegionLuminance(image, maskBox, ctaBox);
        if (luminance != null) {
          variant = luminance >= CTA_LUMINANCE_THRESHOLD ? '黑' : '白';
          setCtaVariant(template, index, variant);
          window.showToast?.(`活動_0${index}：CTA 自動用「${variant}」版（KV 亮度 ${(luminance * 100).toFixed(0)}%）${edgeColor ? `，BG 底色 ${edgeColor}` : ''}`);
        }
      }
    }
    if (!variant && edgeColor) window.showToast?.(`活動_0${index}：BG 底色已依 KV 左上角色補為 ${edgeColor}`);
    return variant;
  }

  // ── Delete 鍵：移除已上傳的圖片，回到「+上傳」狀態（KV / 商品圖 / POPUP 通用）──
  const DELETABLE_SLOT_ROLES = Object.freeze(['lineoa_kv_upload', 'lineoa_product_upload', 'lineoa_popup_upload']);

  function resetUploadSlot(template, slotKey) {
    const layer = template?.layers?.[slotKey];
    if (!layer || layer.__uploadSlot !== true) return false;

    layer.assetFilename = '';
    layer.assetCandidates = [];
    layer.assetProject = '';
    delete layer.__manualAsset;
    delete layer.__resolvedAssetFolder;
    delete layer.__resolvedAssetFilename;
    delete layer.__resolvedAssetPath;
    delete layer.smartAssetId;
    layer.__assetMissing = false;
    layer.rotation = 0;
    layer.sizingMode = layer.__uploadSizingMode || 'coverByPBox';

    // 幾何重設：KV → 活動_0X_BG；商品圖 → 商品_0X_套品範圍；POPUP → 整張畫布。
    const kvSlot = KV_SLOTS.find((item) => item.key === slotKey);
    const geometrySourceName = kvSlot?.bg || layer.maskLayerName || '';
    const source = geometrySourceName ? findLayer(template, geometrySourceName) : null;
    const box = source ? layerBox(source) : {
      x: 0,
      y: 0,
      width: Math.max(1, Number(template?.canvas?.width || 1)),
      height: Math.max(1, Number(template?.canvas?.height || 1)),
    };
    applySlotGeometryFromBox(layer, box);

    // KV：BG 底色還原成吸色前的原色。
    if (kvSlot) {
      const bg = findLayer(template, kvSlot.bg);
      if (bg && bg.__lineoaOriginalFill !== undefined && bg.__lineoaOriginalFill !== null) {
        bg.fill = bg.__lineoaOriginalFill;
        if (bg.shape) bg.shape.fill = bg.__lineoaOriginalFill;
      }
    }
    return true;
  }

  function bindKvDeleteKey() {
    if (window.__lineoaKvDeleteBound) return;
    window.__lineoaKvDeleteBound = true;
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const state = window.AppState;
      const template = state?.template;
      const slotKey = state?.selectedLayers?.[0];
      const layer = template?.layers?.[slotKey];
      if (!layer || layer.__uploadSlot !== true || !DELETABLE_SLOT_ROLES.includes(String(layer.role || ''))) return;
      if (!String(layer.assetFilename || '').trim()) return;
      event.preventDefault();
      window.HistoryManager?.push?.();
      if (!resetUploadSlot(template, slotKey)) return;
      if (state.images) delete state.images[slotKey]; // 清掉已載入的圖，讓上傳提示重新顯示
      window.Renderer?.render?.();
      window.LayerManager?.render?.();
      window.Inspector?.render?.();
      window.SmartAssetManager?.markActiveThumbStale?.(template);
      if (state.batchMode) window.BatchManager?.renderPreviewGrid?.({ revealWhenDone: true });
      window.showToast?.('已移除圖片，可重新點擊或拖曳上傳');
    });
  }

  // ── 資訊_01 動態對齊 ─────────────────────────────────────
  // 版面規則：
  //   1. 資訊_01_文案01 與 資訊_01_文案02 水平置中對齊，視為「資訊_01_文案群組」。
  //   2. 資訊_01_素材 與 文案群組 的固定間隔 = 25px。
  //   3. 「素材 + 間隔 + 文案群組」整組以 資訊_01_BG 的中心水平置中。
  //   4. 調整任一文案（改字、改字級）都會重跑上述規則（core 於文字編輯後呼叫
  //      OMWave1SubtitleLayout.refresh，本規則借用該掛勾）。
  const INFO_GROUP_GAP = 25;
  let cachedMeasureTextWidth = null; // 引擎的文字量測（由 afterApply hook 的 helpers 提供）

  function fallbackMeasureTextWidth(layer) {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const font = window.Renderer?.font?.(layer)
        || `${layer.fontWeight || '400'} ${Number(layer.fontSizePx || 24)}px "${layer.fontFamily || 'ShopeeNotoSans Content'}", sans-serif`;
      context.font = font;
      const letterSpacing = Number(layer.letterSpacing || 0);
      const lines = String(layer.text || '').split('\n');
      return lines.reduce((max, line) => {
        const chars = [...String(line || '')];
        const width = context.measureText(line).width + letterSpacing * Math.max(0, chars.length - 1);
        return Math.max(max, width);
      }, 0);
    } catch (_) {
      return Number(layer?.width || 0);
    }
  }

  function measureText(layer) {
    if (!layer || layer.type !== 'text') return 0;
    const measured = typeof cachedMeasureTextWidth === 'function' ? Number(cachedMeasureTextWidth(layer)) : NaN;
    return Number.isFinite(measured) && measured > 0 ? measured : fallbackMeasureTextWidth(layer);
  }

  function layoutInfoSection(template) {
    const bg = findLayer(template, '資訊_01_BG');
    if (!bg) return false;
    const t1 = findLayer(template, '資訊_01_文案01');
    const t2 = findLayer(template, '資訊_01_文案02');
    const asset = findLayer(template, '資訊_01_素材');

    const texts = [t1, t2].filter((layer) => layer && layer.type === 'text' && !layer.hidden && String(layer.text || '').trim());
    const widths = texts.map((layer) => Math.max(1, measureText(layer)));
    const groupWidth = widths.length ? Math.max(...widths) : 0;
    const hasAsset = !!asset && asset.type === 'image' && !asset.hidden;
    const assetWidth = hasAsset ? Math.max(1, Number(asset.width || 1)) : 0;
    if (!groupWidth && !assetWidth) return false;

    const gap = assetWidth && groupWidth ? INFO_GROUP_GAP : 0;
    const totalWidth = assetWidth + gap + groupWidth;
    const bgCenterX = Number.isFinite(Number(bg.centerX)) ? Number(bg.centerX) : Number(bg.x || 0) + Number(bg.width || 0) / 2;
    const startX = bgCenterX - totalWidth / 2;

    if (hasAsset) {
      asset.x = startX;
      asset.centerX = startX + assetWidth / 2;
    }
    const groupCenterX = startX + assetWidth + gap + groupWidth / 2;
    texts.forEach((layer, index) => {
      const width = widths[index];
      layer.width = width;
      layer.centerX = groupCenterX;
      layer.x = groupCenterX - width / 2;
    });
    return true;
  }

  // ── 商品 原價/活動價 群組對齊（01_LineOA_Template_push）────
  // 原價與活動價中間固定間隔 5px，整組以 商品_0X_BG 水平置中；改字/改字級即時重排。
  function layoutProductPrices(template, productNo) {
    const bg = findLayer(template, `商品_${productNo}_BG`);
    if (!bg) return false;
    const orig = findLayer(template, `商品_${productNo}_原價`);
    const sale = findLayer(template, `商品_${productNo}_活動價`);
    const items = [orig, sale].filter((layer) => layer && layer.type === 'text' && !layer.hidden && String(layer.text || '').trim());
    if (!items.length) return false;

    const widths = items.map((layer) => Math.max(1, measureText(layer)));
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + PRICE_GROUP_GAP * (items.length - 1);
    const bgCenterX = Number.isFinite(Number(bg.centerX)) ? Number(bg.centerX) : Number(bg.x || 0) + Number(bg.width || 0) / 2;
    let cursorX = bgCenterX - totalWidth / 2;
    items.forEach((layer, index) => {
      const width = widths[index];
      layer.width = width;
      layer.x = cursorX;
      layer.centerX = cursorX + width / 2;
      cursorX += width + PRICE_GROUP_GAP;
    });
    return true;
  }

  function layoutAllProductPrices(template) {
    // V0.5：原價＋活動價「水平併排 5px、整組對 商品_0X_BG 置中」的排版只屬於 01_LineOA_Template_push。
    // 其他公版（例如 02_RM 的直式靠右價格）完全依 JSON 原樣，不動位置與對齊。
    // 價格的 79.5% 大小字與原價刪除線屬於文字樣式（applyPriceDecorations），所有公版照常套用。
    const templateId = String(template?.canvas?.templateId || template?.templateId || '');
    if (templateId !== TEMPLATE_VARIANTS['01'].push) return;
    PRODUCT_INDEXES.forEach((productNo) => layoutProductPrices(template, productNo));
  }

  // 商品_0X_CTA：文案套用工單 CTA 欄；寫 X / 請拿掉 → 該商品 CTA 整組（文案/BG/三角形）隱藏。
  function applyProductCta(template, productNo, rawValue, diagnostics) {
    const value = String(rawValue ?? '').trim();
    if (!value) return;
    const disabled = CTA_DISABLED.test(value);
    const compactCta = compactCtaText(value);
    if (!disabled && [...compactCta].length > CTA_MAX_CHARS) {
      // 超過 3 字：不套用、不改顯隱（圖層維持公版預設），只記診斷。
      diagnostics?.push({
        field: `商品_${productNo}_CTA`,
        status: 'missing',
        value,
        target: `CTA 文案超過 ${CTA_MAX_CHARS} 字限制，未套用（圖層維持公版預設）`,
      });
      return;
    }
    ['文案', 'BG', '三角形'].forEach((part) => {
      const layer = findLayer(template, `商品_${productNo}_CTA_${part}`);
      if (layer) layer.hidden = disabled;
    });
    if (!disabled) {
      const textLayer = findLayer(template, `商品_${productNo}_CTA_文案`);
      if (textLayer && textLayer.type === 'text') {
        textLayer.text = compactCta;
        window.SPTextStandard?.applyNonPriceTextLayer?.(textLayer, `商品_${productNo}_CTA_文案`);
      }
    }
    diagnostics?.push({
      field: `商品_${productNo}_CTA`,
      status: 'ok',
      value,
      target: disabled ? `商品_${productNo} CTA 整組隱藏` : `商品_${productNo}_CTA_文案`,
    });
  }

  // core 在文字編輯 / 字級調整後會呼叫 window.OMWave1SubtitleLayout.refresh —— 借用這個掛勾做動態對齊。
  if (!window.OMWave1SubtitleLayout) {
    window.OMWave1SubtitleLayout = {
      refresh(template) {
        try {
          const target = template || window.AppState?.template;
          unifyMainCaseVerticalMode(target); // 手動改字後主案型垂直模式維持統一
          applyPriceDecorations(target); // 手動改字/改字級後重建 79.5% ranges 與刪除線，再量寬排版
          layoutInfoSection(target);
          layoutAllProductPrices(target);
        } catch (_) {}
      },
    };
  }

  // CTA 三角形（▶）：PSD 匯出的 polygon 預設第一個頂點朝上；
  // 統一設定 startAngleDeg = 0 讓尖角指向右邊。涵蓋所有名稱含「CTA」+「三角形」的圖層
  // （RM 的 CTA_白/黑_三角形、push 的 商品_0X_CTA_三角形）。
  function styleCtaTriangles(template) {
    Object.entries(template?.layers || {}).forEach(([key, layer]) => {
      const name = String(layer?.psdName || key || '');
      if (!name.includes('三角形') || !/cta/i.test(name)) return;
      if (!layer || layer.type !== 'shape') return;
      layer.shape = layer.shape || {};
      layer.shape.kind = 'polygon';
      layer.shape.polygonSides = 3;
      layer.shape.startAngleDeg = 0; // 0 度 = 尖角朝右
      if (layer.shape.geometry) delete layer.shape.geometry.startAngleDeg;
    });
  }

  function beforeApplyRecordToTemplate({ template, record, diagnostics, skipExactLayout }) {
    if (!skipExactLayout) window.SmartAssetManager?.clearTemplateBaselines?.(template);
    ensureKvUploadSlots(template, { resetGeometry: !skipExactLayout });
    ensureProductUploadSlots(template, { resetGeometry: !skipExactLayout });
    styleCtaTriangles(template);
    lockDefaultLayers(template);
    bindKvDeleteKey();
    diagnostics?.push({ field: 'LineOA', status: 'ok', value: record?.__outputName || '', target: record?.__templateId || '' });
  }

  function afterApplyRecordToTemplate({ template, record, diagnostics, helpers, skipExactLayout }) {
    if (typeof helpers?.measureTextWidth === 'function') cachedMeasureTextWidth = helpers.measureTextWidth;
    applyLabeledFields(template, record, diagnostics);
    // RM（03）：CTA_白/黑 兩組切換
    applyCta(template, 1, record?.['活動_01_CTA'], diagnostics);
    applyCta(template, 2, record?.['活動_02_CTA'], diagnostics);
    // push（01）：商品 CTA + 品名自動配圖
    PRODUCT_INDEXES.forEach((productNo) => applyProductCta(template, productNo, record?.[`商品_${productNo}_CTA`], diagnostics));
    if (!skipExactLayout) autoMatchProductImages(template, record, diagnostics);
    // POPUP：依編號自動載入同名素材
    applyPopupAsset(template, record, diagnostics, skipExactLayout);
    applyVipMainCaseRule(template); // VIP 首行 → 蝦皮VIP LOGO（僅主案型；需在全域大小字之前改字）
    window.SPTextStandard?.applyTemplateNonPriceText?.(template);
    unifyMainCaseVerticalMode(template); // 主案型垂直模式統一（需在全域標準之後，避免被內容差異分岔）
    applyPriceDecorations(template); // 79.5% 價格大小字 + 原價刪除線（需在寬度量測/置中排版之前）
    layoutInfoSection(template);
    layoutAllProductPrices(template);
  }

  // ── 路由與輸出檔名 ──────────────────────────────────────
  function resolveRecordTemplateRoute({ record }) {
    const templateId = String(record?.__templateId || '').trim();
    if (!templateId) return null;
    return {
      key: FAMILY,
      family: FAMILY,
      label: 'LineOA',
      templateId,
      templateFile: `${templateId}.json`,
      outputName: sanitizeOutputName(record.__outputName || ''),
      outputPrefix: 'LineOA',
    };
  }

  // 輸出檔名 = 工單 A欄「素材命名/露出日期」（例如 0519-0523選單 → 0519-0523選單.jpg）。
  function resolveOutputNameForTemplate({ record, template }) {
    return sanitizeOutputName(record?.__outputName || template?.batchRecord?.__outputName || '');
  }

  window.TemplateRuleRegistry.register(FAMILY, {
    label: 'LineOA',
    priority: 900,
    targets: [...ALL_TEMPLATE_IDS],
    tokens: ['LineOA_Template', 'LineOA', 'POPUP'],
    sheetParser: parse,
    rules: {
      // 素材查找嚴格範圍（引擎 AssetStore/TemplateLoader 讀取）：
      // 公版同名資料夾 → assets 根目錄散檔 → 共用素材 → 都沒有 → 不載入並記錄畫面診斷；
      // 範圍外資料夾（例如尚未啟用的 02_LineOA_Template_RM）一律不搜尋。
      assetLookup: { scope: 'strict' },
      beforeApplyRecordToTemplate,
      afterApplyRecordToTemplate,
      resolveRecordTemplateRoute,
      resolveOutputNameForTemplate,
      onUploadSlotAssetApplied,
    },
  });
})();
