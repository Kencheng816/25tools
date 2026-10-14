# 步驟 2 報告：core Price 模組 ＋ shared 規則檔差異

比對來源：`work/diff/modules/<模組>/<工具>.js`（bash diff）、`methods-small.txt`、各工具 `rules/`、`config/`。
分支代號：**A**＝正式BN／暖身BN／MS；**B**＝LineOA／network／AMS／鏡面／跨夜；**祖**＝KV／OM_w1／OM_w2。
（實際 Price 模組的血緣與分支不完全一致：OM_w2＝LineOA 是「祖先＋回移 A 的縮放邏輯＋收框」；鏡面＝OM_w2 去掉 82% 規則；network＝AMS＝跨夜＝OM_w1 去掉 82% 規則。）

---

## 1. core Price 模組

### 1.1 完全相同（直接取用）
| 模組 | 結果 |
|---|---|
| PriceParser | 11 份逐字相同 |
| PriceLayoutResolver | 11 份逐字相同 |
| PriceRuleEngine.defaultLayouts / hasEffectiveExternalRules / getRules / getTemplateFamily / normalizeLayout / isEditedJsonAbsoluteLayout / resolveProductRule / priceMatches | 11 份相同（僅註解字句不同；MS/鏡面「B9/C9」指紋差異純為註解） |

### 1.2 方法級差異表
「影響像素」欄：**是**＝靜態批次輸出就會不同；**互動**＝僅手動拖拉／縮放／重選縮圖後才會不同；**否**＝不影響繪製。

| 方法 | 版本分布 | 差異內容（行為差異） | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| **PriceRuleEngine.priceParts / shouldUseDoubleCoupon / expandDoubleLayouts** | A 有；B/祖 無 | A 由「價格含 `+`／＋」或商品名含「雙券」判定雙券，且在 rule 宣告 `doublePrice.enabled` 時把單券 layout 展開成 價格_上/價格_下（anchorRatioY ±0.25、rotationOffset −6/+2） | 是（B/祖 若價格含 `+` 會多出一層） | (b) `priceDoubleCouponAuto`：A=true，其餘=false |
| **PriceRuleEngine.classify** | A72 / B68(祖+B) / C68(鏡面，僅註解) | ① A 的 `isDoubleCoupon` 用 `requestedDouble`（含 `+` 判定），B 只看「雙券」字樣 ② A：`layoutKey = hasDouble ? 'doubleCoupon' : externalRule.layoutKey`，B：`externalRule.layoutKey` 優先 ③ A 會在 externalRule 命中時嘗試 expandDoubleLayouts | ①是（同上旗標）②否（B/祖 rules 皆未宣告 layoutKey，已 grep 確認）③同① | ①③併入 `priceDoubleCouponAuto`；② (a) 取 A |
| **PriceRuleEngine.resolveTemplateRule** | A24 / B21 | A 多三個候選 id：`canvas.templateId`、`sheetTemplateRoute.sourceTemplateId`、`sourceTemplateId`，插在 `templateId` 之後、`batchSourceName` 之前 | 理論上否（只在 `templateId` 未命中時才多試）；若某工具 canvas.templateId ≠ templateId 且兩者都在 templateLayouts 才會變 | (a) 取超集；黃金樣本驗證 |
| **PriceRuleEngine.resolveLayoutForAnchor** | A57 / B54 | A 多第三參數 `anchorRotation`，product-image-ratio 模式回傳 `rotation = anchorRotation + rotationOffset`（或 `layout.rotation ?? anchorRotation`）；B 不回傳 rotation（沿用 layout.rotation，通常 undefined→0） | 是（B/祖 若商品圖有 rotation 且 layout 未寫 rotation：A 會讓價格跟著轉；OM 校正檔會給 P_01/P_02 rotation） | (b) `priceInheritAnchorRotation`：A=true，B/祖=false |
| **PriceColorResolver.resolve / getSlotColorRules** | A60 / B48 | A 多 `slot` 參數與 `slotColorRules`（雙券上下券各自顏色：商城券加全站券 / 全站券加商城券 / VIP+商城） | 否（B/祖 rules 無 slotColorRules → 短路；已 grep） | (a) 取超集 |
| **PriceTypographyResolver（整個模組）** | 僅 A（正式BN=暖身BN；MS 僅註解不同） | 依 rule `typography` 重算大字級、`lineHeight = big×1.08`、以 `SPTextStandard.priceRanges(smallRatio 0.795, bigTokens/smallTokens)` 產生雙字級 ranges，dual 時 `styledTextVerticalAlign = SOURCE_MODE`；`useLayoutFontSize` opt-in | **是**：即使 rule 無 typography，仍會改 lineHeight 並替 `%`、`$`、蝦幣/折/起 產生 0.795 小字 ranges → B/祖 價格字形會變 | (b) `priceTypographyResolver`：A=true，其餘=false（false 時走 B 的 `PriceLayoutResolver.fromLayout` 直出） |
| **PriceLayerFactory.create** | A53(BN/WB/MS) / B46(KV) / C52(OM_w1) / D61(OM_w2=LineOA) / E51(network=AMS=跨夜) / F60(鏡面) | A：`role`、`textStyleRanges` 由 layout 帶入、`priceRuleFontSizePx`、`textVerticalAlign = SOURCE_MODE`、`captureLayer(source:'generated-price')`，align 固定 center。C/D/E/F：`align = layout.align || 'center'`、`captureLayer('auto-price')`；C/D 另呼叫 `SPTextStandard.applyPriceTextLayer`（82% 特殊字元）；D/F 另呼叫 `Renderer.fitTextLayerToInk` 收框並回寫 anchor.baseWidth/Height。KV：無 TextBaselineModel、無 role、無 ranges | **是**：① `textVerticalAlign=SOURCE_MODE` 改變文字垂直落點 ② 82% ranges 改字形 ③ 收框改 anchor 基準→後續同步縮放結果 | (b) 三支旗標：`priceLayerBaselineMode`＝'source'(A) / 'capture'(OM/LineOA/network/AMS/鏡面/跨夜) / 'none'(KV)；`priceSpecialCharRanges82`＝OM_w1/OM_w2/LineOA=true，其餘 false；`priceFitBoxToInk`＝OM_w2/LineOA/鏡面=true，其餘 false。`align` 取超集 (a)（A 的 rules 未宣告 align） |
| **PriceLayerFactory.createAnchor** | A38 / B28 | A 多記 `baseLineHeight`、`baseStyleFontSizes`、`baseStyleLineHeights`；`baseHeight` 預設改用 baseLineHeight | 互動→可能「是」：OM_w2/LineOA/鏡面 的 syncPriceLayer 會優先讀 `anchor.baseLineHeight`，若 layout.lineHeight ≠ fontSize×1.08，載圖後同步結果會變 | (b) `priceAnchorBaseLineHeight`：A=true，其餘=false（baseStyle* 只在 textStyleRanges 存在時寫入，可視為超集） |
| **PriceTransformEngine.syncPriceLayer** | A62(BN/WB/MS) / B39(KV=network=AMS=跨夜) / C40(OM_w1=B+82%) / D70(OM_w2=LineOA) / E69(鏡面=D−82%) | A/D/E：位置比例與內容比例分離——`preserveExactSize` 時 offset 仍隨商品圖等比移動；lineHeight 以 `baseLineHeight×scale`；ranges 依 `baseStyleFontSizes` 換算。B/C：offset 只在 scaleContent 時縮放；lineHeight = fontSize×mult。C/D 另 `applyPriceTextLayer`；D/E 結尾 `fitTextLayerToInk` | **是**（批次流程「先 loadImages 再 rebuild」時商品框已 contain 縮放，scale≠1；KV/OM_w1/network/AMS/跨夜 的 preserveExactSize 價格會停在原點，A/D 會跟著移） | (b) `priceSyncSeparatePositionScale`：A/OM_w2/LineOA/鏡面=true；KV/OM_w1/network/AMS/跨夜=false。82%／收框沿用上面兩旗標 |
| **PriceTransformEngine.syncTemplate** | 除 MS 外皆有 | MS 無此方法（MS core 亦無呼叫者） | 否 | (a) 取超集 |
| **PriceTransformEngine.captureTypographyState / applyTypographyScale / setTypographyFontSize** | 僅 A | 手動改字級時等比縮 ranges | 否（僅 A 的 Inspector/TextEditor 呼叫） | (a) 取超集 |
| **PriceTransformEngine.canFollowProduct** | A8 / MS B11 | MS 僅多空白行 | 否 | (a) |
| **PriceTransformEngine.handleLayerBoxApplied** | A32 / B30 / C30(OM_w2=LineOA=鏡面) | A/C：`centerX = x + width/2` 重算；B：`centerX ?? …` 沿用舊值。A 多 `SmartAssetManager.isProductTransformActive` 守衛與 `template` 參數 | 互動（拖拉商品圖時） | (a) 取 A（OM_w2 已同步採用；守衛只在 SmartAssetManager 存在時生效） |
| **PriceTransformEngine.handleLayerRotationApplied** | 僅 A | 旋轉商品圖時同步價格 | 否（B/祖 core 無呼叫） | (a) |
| **PriceTransformEngine.captureManualPriceTransform** | A37 / B25 / C48(OM_w2=LineOA=鏡面) | A/C：`options.rebase`、記 `baseLineHeight`、`baseStyle*`、清 `_anchorDirty`；C 另開頭 `fitTextLayerToInk`；B 無 | 互動；C 的收框見 `priceFitBoxToInk` | (a) 取 A 為底 ＋ `priceFitBoxToInk` |
| **PriceCouponManager.apply** | A139(正式BN) / B102(暖身BN) / C66(KV) / D84(祖+B其他) / E137(MS≈A) | ① 正式BN/MS：`priceSlots` 多格價格（rule 宣告才啟用）、`normalizePriceValue`（0～1 純小數→百分比文字，如 0.2→20%）② 重建回填策略：A 系以「同商品名＋同 layoutKey」比對並用 `priceRuleFontSizePx` 換算字級比例、回填 baseline；KV 以「文字相同」比對、原值回填；D 在 KV 之上另回填 ranges/baseline/`__spPriceTextStandard` | ①`normalizePriceValue`：**是**（B/祖 若工單價格為 0.2 這類小數，正式BN 會印 20%）；priceSlots 否（rule 驅動）②否（首次套用 previousBySlot 為空；無手動調整時三種策略結果相同） | ① (b) `priceNormalizeDecimalPercent`：正式BN/MS=true，其餘=false；priceSlots (a)。② (b) `priceRebuildMemoryMode`＝'product-layout'(A) / 'text'(KV) / 'text+ranges'(其餘)，低風險，亦可先 (a) 取 A 後以黃金樣本驗證 |
| **PriceCouponManager.applyForAnchor** | A70 / B65 / C67(MS) / D64(鏡面) | A：呼叫 `resolveLayoutForAnchor(..., anchorRotation)` → `PriceColorResolver.resolve(..., slot)` → `PriceTypographyResolver.apply`；B：無 rotation、無 slot、無 typography。MS/鏡面 僅註解／guard 差 | 是（同 `priceInheritAnchorRotation`、`priceTypographyResolver`） | 沿用上列旗標 |
| **PriceCouponManager.rebuildFromPricePreset** | 除 MS 外皆同 | MS 缺（MS 無呼叫者） | 否 | (a) |

### 1.3 smallRatio 0.795 與票券顏色小結
- `SPTextStandard.PRICE_SMALL_RATIO = 0.795`、`TITLE_SMALL_RATIO = 0.82` 在全部 6 份 sp-text-standard 皆相同；A 系透過 `warmup-price-style-resolver.js`（`smallRatio: 0.795`, bigTokens 現折/回饋, smallTokens 蝦幣/折/起）→ `PriceTypographyResolver` 產生價格雙字級；OM/LineOA 則走 `applyPriceTextLayer` 用 **0.82**（只縮 %、$、逗號、數字後「號」，不縮蝦幣/折/起）。兩者不可互換，須各自由旗標控制。
- 票券顏色：內建 rules（VIP #FF770F、SCS/商城券 #D0011B、全站(券) #EE4D2D、default #D0011B）11 份相同；A 多 slotColorRules（rule 驅動，超集安全）。

---

## 2. shared 規則檔

### 2.1 `rules/shared/warmup-banner-rule-factory.js`（正式BN 1207 行 v1.4.0 vs 暖身BN 798 行 v1.3.0）
差異性質：**新增功能為主，含 2 處非 opt-in 預設值變更**。
- 新增（rule 宣告才啟用，超集安全）：工單「商品圖2」欄解析與 `dualProductLayerKeys`（P_01/P_02 雙商品圖切換、before hook 提前隱藏以決定價格錨點）、`variantLayerSets` 四型態主副標變體（VIP 拆字＋LOGO 排版）、`resolveDecoLayers`（DECO_* 素材自動解析）、`ctaHandledByBackground`、`exportConfig`。
- **非 opt-in 變更**：① 預設 `anchorLayerNames` 由 `['product','P','商品圖1','曝品']` 改為 `['商品圖1','P_01','product','P','曝品']`（暖身BN 只有 01_頭巾 自行覆寫；其餘公版若同時有 product 與名為商品圖1 的圖層，錨點會變→像素變）② `KV_BG` 首次載入 `locked = true`（僅互動）。
- 建議：合併為超集；`anchorLayerNames` 預設值以旗標 `warmupAnchorOrder`＝'formal'(正式BN) / 'legacy'(暖身BN) 切換，或由暖身BN 各 rule 明寫舊順序。

### 2.2 `rules/shared/warmup-placement-presets.js`（正式BN 94 行/1.5MB vs 暖身BN 92 行/415KB）
程式碼完全相同（Engine v2.0.0），只差 `PRESETS` 資料。key 空間：正式 57 筆（ddcard/hbn 各 15、popup 4、skbnapp/pc 各 5、mallskinnybn 5、scbn 4、skbnnuz 各 2），暖身 58 筆（頭巾 5、hbn/ddcard 各 12、popup 8、skbn中 各 6、igstory 3、外部team 各 3）。**27 個 key 同名但 0 筆內容相同**（如 `ddcard/01` 正式取自 `01_DD_Card_正式_01_edited.json`，暖身取自 `03_DD_Card_暖身_01_edited.json`）。
- 性質：**不相容資料**。建議：**命名空間隔離**——PRESETS 按工具/family 前綴（如 `formal:ddcard/01`、`warmup:ddcard/01`），`resolveKey` 依目前 family 加前綴；Engine 程式碼共用一份。

### 2.3 `rules/shared/sp-text-standard.js`（3 版）
- 正式BN＝暖身BN＝KV＝MS（MS 僅一行註解不同）342 行；OM_w1＝OM_w2＝LineOA 363 行＝前者＋`applyPriceTextLayer()`（價格用 82% 標題規則、標記 `__spPriceTextStandard`）並匯出。
- 性質：純新增。建議 (a) 合併為超集（OM/LineOA 版），呼叫端由 `priceSpecialCharRanges82` 控制。

### 2.4 `rules/shared/special-block-parser-policy.js`（正式BN v1.1.0 vs 暖身BN v1.2.0）
- 正式BN 新增 SPECIAL_ONLY：skbnapp/skbnpc/各切圖左中右/切圖名稱；暖身BN 新增 `sellerbanner`、`hasUsableRecordData` 的 sellerbn 分支、`isSpecialHeaderRow` 多判「版型/宣傳案型/左/中/右 全在」為特規表頭。
- 性質：雙方各自新增，可聯集；但暖身的 seller 表頭偵測是**非 opt-in**（正式BN 工單若出現該五欄會被改判為特規列而略過通用解析）。建議：SPECIAL_ONLY 聯集 (a)；seller 表頭偵測以旗標 `sheetSellerHeaderDetect`（暖身BN=true，其餘 false）或只在 `sellerbn` family 已註冊時啟用。

### 2.5 `rules/shared/runtime-policy.js`（正式BN＝暖身BN；MS 僅首行註解不同）→ (a) 單一版本。
`warmup-price-style-resolver.js`、`template-rule-utils.js`（11 工具）皆逐字相同 → (a)。

### 2.6 `rules/template-rules.loader.js`（4 版）
| 版本 | 工具 | 特徵 |
|---|---|---|
| L-A 嚴格版 | 正式BN、暖身BN | 重複 register 同 family **拋錯**；`detectFamily` 計分（exact > 長度 > priority），同分不同 family 拋錯；manifest 動態注入 script；只認 `rules.parseSheetBlocks`；list 含 multiOutput |
| L-MS | MS | ＝L-A 但 `detectFamily` **只接受完全相等**，不做包含比對 |
| L-B 寬鬆版 | OM_w1/w2、LineOA、network、AMS、鏡面、跨夜 | 重複 register **合併**（tokens/targets 聯集、rules 淺合併）；detectFamily 依 priority 排序取第一個「相等或互相包含」者；manifest 動態注入；同時接受 `sheetParser` 與 `rules.parseSheetBlocks` |
| L-KV | KV | ＝L-B 但 normalize 不去前綴編號、不做 NFKC；**不用 manifest**（index.html 靜態 script，`ready` 立即 resolve）；只認 `sheetParser` |
- 性質：**不相容行為**（嚴格 vs 合併；計分 vs 順序；exact-only）。建議：單一 Registry 以旗標 `ruleRegistryMode`＝'strict'(正式BN/暖身BN) / 'strict-exact'(MS) / 'merge'(其餘) 及 `ruleNormalizeLegacy`(KV=true) 切換；載入方式統一為 manifest 動態注入（KV/network/AMS/跨夜 目前 manifest 為空、靜態載入，改成 manifest 列表即可，不影響像素）。

### 2.7 `rules/rules.manifest.js`（7 版，僅列載入清單）
| 工具 | shared | 公版 rules |
|---|---|---|
| 正式BN | runtime-policy, special-block-parser-policy, template-rule-utils, sp-text-standard, warmup-price-style-resolver, warmup-banner-rule-factory, warmup-placement-presets, skbn-rule-factory, simple-banner-rule-factory | 01_DD Card, 01_HBN, 02_POPUP, 03_SKBN_APP/PC, 04_Mall Skinny BN, 05_SCBN, 06_SKBN NUZ_APP/PC |
| 暖身BN | 同上前 7 支（無 skbn/simple-banner factory） | 01_頭巾, 02_HBN, 03_DD Card, 04_POPUP, 05_SKBN, 06_AR, 07_AR Large BN, 08_IG Story, 10_Seller BN, 11_外部team, 12_Mepage |
| OM_w1 | template-rule-utils, sp-text-standard, om-wave1-{template-matcher,parser,initial-placements,layout} | om-wave1-router, template, uac_pmax_linelap, rtbhouse, appier, dpa_frame_mau |
| OM_w2 | 同 OM_w1 | ＝OM_w1 ＋ lineoa_rules, fb_linelap_rules |
| MS | runtime-policy, sp-text-standard | ms-template-rules |
| LineOA | template-rule-utils, sp-text-standard | lineoa_rules（其餘 OM 檔為 1 行「已移除」殘檔） |
| 鏡面 | template-rule-utils | mirror.rules |
| KV / network / AMS / 跨夜 | 無 manifest（index.html 靜態 `<script>`） | KV：kv-festival-hexagon + 25節KV_商城狂購節；network：network-affiliate；AMS：line-shopping-ams + 9 支尺寸 rules；跨夜：crossnight-live-promo |
- 建議：統一 core 用單一 manifest 依「工具/分類」給出各自的 ruleFiles 清單（或每工具一份 manifest 由入口選擇）。注意 正式BN 與 暖身BN 的 HBN/DD Card/POPUP rules **同名 family 不同內容**，不可同時載入（L-A 會拋錯）→ 必須由分類選擇載入，或 family 加前綴。

### 2.8 `config/template-routing.js`（2 版）
- 8 工具同一份（`headbandSheetRoutes: []` 空設定，僅註解）；LineOA 為 1 行「V0.2 已移除（死設定）」且 index.html 未載入；MS、鏡面 無此檔。
- 性質：死設定。建議 (a) 保留空版一份（或移除並在 core 判 `TemplateRoutingConfig?.`）。

### 2.9 OM wave1 vs wave2（`rules/shared/om-wave1-*.js` 與 appier/rtbhouse/dpa rules）
| 檔 | w1 | w2 | 差異 |
|---|---|---|---|
| om-wave1-initial-placements.js | 1696 行/46 key | 14649 行/120 key | **w2 是 w1 的嚴格超集**：46 個共同 key 內容逐字相同（僅 P_範圍/P/P_01/P_02/__auto_price_v2_single 幾何），另新增 74 key（Appier +68、FB_Linelap 6），新 key 才含 hidden/locked/文字屬性/DECO 素材 |
| om-wave1-layout.js | 640 | 1056 | w2 新增：`applyCalibratedLayerState`（套用全部圖層狀態，不只 P_*）、價格校正後 `applyPriceTextLayer`＋`fitTextLayerToInk`、`fitLayerToPlacementGuide`（**單品且無 P 槽時退回 P_01 並鋪滿 P_範圍**——w1 此情境會整張掉圖只留 missing-layer 診斷）、Appier_320x50/640x100 膠囊規則、Appier_160x600 banner1 VIP 三行＋35pt 行高、FB_Linelap 膠囊參數；`PRICE_RULES.anchorLayerNames` 加 `P_01`（排在 P 之後，不影響有 P 的公版）、新增 全站券_單券／商城券_單券 productLayouts；匯出 assignImageAsset/applyStaticAssets/findLayer |
| om-wave1-parser.js | 185 | 231 | w2 新增：稀疏列 `rowValues()` 防呆（修 TypeError）、`[券1]/[券2]/[下左中右]` 區段解析、Layout 編號/券頭LOGO/CTA/Logo 標籤、LineOA 專屬 layoutNo 與命名重複豁免 |
| om-wave1-template-matcher.js | 103 | 125 | w2 新增 FB_Linelap 4 尺寸、LineOA_Template 3 版、媒體別名 |
| appier / rtbhouse / dpa_frame_mau _rules.js | 19/14/14 | 20/15/15 | w2 各多一行 `priceRules: L.PRICE_RULES`（w1 這三個 family **沒有**自動價格） |
| template / uac_pmax_linelap / om-wave1-router / Example / template-rule-utils | — | — | 完全相同 |
- 結論：**w2 較新，資料面可完全取代 w1**；行為面有三處會改變 w1 既有輸入的像素：① Appier/Rtbhouse/DPA 多了 `priceRules`（工單有價格且商品名命中 VIP_單券_蝦幣 等時 w2 會生成價格層，w1 不會）② 單品無 P 槽的掉圖修正（w1 無圖→w2 有圖）③ 價格校正後收框＋82% ranges。①②屬修 bug／補功能，需人工確認是否接受「wave1 黃金樣本失效」；否則以 `omWaveProfile`＝'wave1'/'wave2' 旗標保留 w1 行為（w1 版 apply 只套 P_* 幾何、不注入 priceRules、單品不退回 P_01）。建議 (c)→傾向用 w2 取代並更新 w1 黃金樣本。

### 2.10 `rules/lineoa_rules.js`：OM_w2（359 行）vs LineOA（1254 行）
- **不同公版、不同 family，不是同檔新舊版**：OM_w2 註冊 `om_wave1_lineoa`，targets `LineOA_Template_一般 01 / 創貼 05 / 25 spike 創貼 14`，依賴 `OMWave1Layout`/`OMWave1TemplateMatcher`（外廣工單流程）；LineOA 工具註冊 `lineoa_rm`，公版 `01/04_LineOA_Template_push`、`02/03/04_LineOA_Template_RM`、`POPUP`，自有工單格式（「Line OA」分頁、公版編號），並宣告 `TemplateIdentityAliases.POPUP`。
- 兩檔可並存（family/targets 不重疊）；建議改檔名（`om-lineoa_rules.js` / `lineoa-rm_rules.js`）避免同名。**注意**：LineOA 版在 `!window.OMWave1SubtitleLayout` 時自行定義 `OMWave1SubtitleLayout.refresh` 借用 core 掛勾；目前 OM_w2 並未定義該全域（core 只呼叫），若未來任何規則定義了它，LineOA 的動態對齊會失效——整合時建議改成 family 專屬掛勾。

---

## 3. 旗標總表

| 旗標 | 型別/值 | 正式BN | 暖身BN | MS | KV | OM_w1 | OM_w2 | LineOA | network | AMS | 鏡面 | 跨夜 | 控制點 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `priceTypographyResolver` | bool | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | applyForAnchor 是否走 PriceTypographyResolver（0.795 雙字級） |
| `priceDoubleCouponAuto` | bool | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | classify：`+` 判雙券、expandDoubleLayouts |
| `priceInheritAnchorRotation` | bool | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | resolveLayoutForAnchor 傳入 anchorRotation |
| `priceLayerBaselineMode` | 'source' / 'capture' / 'none' | source | source | source | none | capture | capture | capture | capture | capture | capture | capture | PriceLayerFactory.create：textVerticalAlign／captureLayer 來源 |
| `priceSpecialCharRanges82` | bool | ✘ | ✘ | ✘ | ✘ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | create／syncPriceLayer 呼叫 `SPTextStandard.applyPriceTextLayer` |
| `priceFitBoxToInk` | bool | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | ✔ | ✘ | ✘ | ✔ | ✘ | create／syncPriceLayer／captureManual 呼叫 `Renderer.fitTextLayerToInk`（需 Renderer 亦提供） |
| `priceSyncSeparatePositionScale` | bool | ✔ | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ | ✘ | ✘ | ✔ | ✘ | syncPriceLayer 位置/內容比例分離、baseLineHeight、ranges 換算 |
| `priceAnchorBaseLineHeight` | bool | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | createAnchor 是否寫 baseLineHeight |
| `priceNormalizeDecimalPercent` | bool | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | PriceCouponManager.apply 0.2→20% |
| `priceRebuildMemoryMode` | 'product-layout' / 'text' / 'text+ranges' | product-layout | product-layout | product-layout | text | text+ranges | text+ranges | text+ranges | text+ranges | text+ranges | text+ranges | text+ranges | apply 重建回填比對鍵（低像素風險，可先取 A 驗證） |
| `warmupAnchorOrder` | 'formal' / 'legacy' | formal | legacy | — | — | — | — | — | — | — | — | — | warmup-banner-rule-factory 預設 anchorLayerNames |
| `placementPresetNamespace` | string | formal | warmup | — | — | — | — | — | — | — | — | — | warmup-placement-presets PRESETS key 前綴 |
| `sheetSellerHeaderDetect` | bool | ✘ | ✔ | — | — | — | — | — | — | — | — | — | special-block-parser-policy 的 seller 表頭偵測 |
| `ruleRegistryMode` | 'strict' / 'strict-exact' / 'merge' | strict | strict | strict-exact | merge | merge | merge | merge | merge | merge | merge | merge | template-rules.loader register/detectFamily 行為 |
| `ruleNormalizeLegacy` | bool | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | loader normalize（KV 不去編號前綴、不 NFKC） |
| `omWaveProfile` | 'wave1' / 'wave2' | — | — | — | — | wave1 | wave2 | — | — | — | — | — | OM 共用模組行為（見 2.9；若決定以 w2 取代 w1 則不需要） |

直接取超集 (a)、不需旗標：PriceParser、PriceLayoutResolver、PriceColorResolver(slotColorRules)、resolveTemplateRule 候選 id、classify layoutKey 優先序、syncTemplate、captureTypographyState 三支、handleLayerRotationApplied、handleLayerBoxApplied（A 版）、captureManualPriceTransform（A 版＋旗標）、rebuildFromPricePreset、priceSlots、sp-text-standard（OM 版）、runtime-policy、warmup-price-style-resolver、template-rule-utils、template-routing（空版）、warmup-banner-rule-factory 的 opt-in 功能、om-wave1-initial-placements（w2）。
需人工決定 (c)：OM wave1→wave2 取代（2.9 ①②）、正式BN/暖身BN 同名 family rules 的載入選擇方式（2.7）。
