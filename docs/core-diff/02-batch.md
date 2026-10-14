# BatchManager（＋__head__ / AppState / ALL_PROJECTS_VALUE / rulesReady / App）差異報告

基準：正式BN。分支代號：**A**＝正式BN、暖身BN、MS；**B**＝LineOA、network、AMS、鏡面、跨夜；**祖**＝KV、OM_w1、OM_w2。
資料來源：`work/diff/modules/<模組>/<工具>.js` 逐方法 `diff`；指紋見 `methods-big.txt`／`methods-small.txt`。
「影響輸出」欄：像素＝匯出圖內容；檔名／資料夾＝ZIP 內路徑；JSON＝匯出 JSON；UI＝只影響畫面／診斷，不影響輸出；否＝純註解或無行為差。

> 先說結論：BatchManager 真正會改變輸出的差異集中在 6 條軸線——(1) 工單列展開方式 `sheetToRowsWithMergedFill`、(2) Parser 管線與「記錄是否有內容」判定、(3) 公版比對嚴格度、(4) `__templateId` 相容路由的 family 值、(5) applyRecordToTemplate 內的 CTA／Preset／SPTextStandard／SmartAsset 順序、(6) 預覽管線是否會「回寫正式 template」。其餘多為診斷文字、UI 或可安全取超集。
> 使用者點名的「MS 上蓋/下蓋」與「鏡面 __specFormat」**不在 BatchManager**，都在 ExportManager（MS.js:169、鏡面.js:52-56），請由 ExportManager 負責人處理；BatchManager 只需保證 `batchRecord.__specFormat` 等 rule 寫入的欄位原樣保留。

## 1. 方法差異表

| 方法 | 版本分布 | 差異內容（行為） | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| `__module_head__.fields` | A(BN/暖身/MS/KV/OM/LineOA/network/跨夜) / AMS 多 `檔名`,`店名`,`LINE_POINTS_PERCENT` / 鏡面 **無 fields**（不使用） | AMS 把 3 個 LINE購物欄位納入「有內容」與 header 判定 | 檔名/像素（決定哪些列會產圖） | (b) `batch.extraFields`：AMS=`['檔名','店名','LINE_POINTS_PERCENT']`，其餘=`[]` |
| `sheetToRowsWithMergedFill` | A=BN/暖身/MS；B=KV/OM_w1/network/AMS/跨夜；C=OM_w2/LineOA；D=鏡面 | A：**矩形**合併範圍全部補左上值，數值格若 `cell.w`≠`cell.v` 取顯示字串（保留前導 0）。B：只補**同欄垂直**合併，數值一律取 `cell.v`，掃描從 `range.s` 起。C：同 B 但從第 0 列/欄起掃（避免 `!ref` 非 A1 時稀疏陣列）。D：同 C 並掛 `rows.__mergedFills`（非列舉屬性） | 像素/檔名（橫向合併的標題列、備註No 前導 0、非 A1 起點分頁都會改變解析結果） | (b) `batch.mergeFillMode`：A 分支=`'rect'`，其他=`'vertical'`；(b) `batch.numericDisplayValue`：BN/暖身/MS=true，其餘 false；(b) `batch.rowsFromZero`：OM_w2/LineOA/鏡面=true，其餘 false；`__mergedFills` 一律掛上 (a) |
| `handleExcelFile` | A=BN/暖身/MS；B=其餘（鏡面再少 detectAndOffer） | A 讀新檔時先 `TextEditor.commit / finalizeActiveTransform / HistoryManager.clear / SmartAssetManager.resetSession / delete _materialSpecTable`；鏡面不呼叫 `detectAndOfferProjectsFromSheet` | UI | (a) 超集（重置只清工作階段狀態）；detectAndOffer 依 `batch.matrixParser` 開關 |
| `generateFromSelectedSheet` | A=BN/暖身/KV；B=OM_w1/OM_w2/LineOA；C=MS；D=network/AMS；E=鏡面；F=跨夜 | ① AssetSpecEngine 前置：BN/暖身/KV/OM/LineOA/network/AMS 有；MS/鏡面/跨夜 **無**。network/AMS 多傳 `sheetName`。② 開頭 `SmartAssetManager.resetSession()`：OM_w1/OM_w2/LineOA/network/AMS/跨夜 有；BN/暖身/KV/MS/鏡面 無 | ① 決定整個 parser 走向（像素/檔名/資料夾）；② UI（人工 Transform 工作階段） | ① (b) `batch.assetSpecEngineFirst`：MS/鏡面/跨夜=false，其餘 true；`sheetName` 一律傳 (a)。② (a) 超集（統一在此 reset；A 分支已在 handleExcelFile reset 過，重複無害） |
| `generateForCurrentProject` | A=BN/暖身；B=KV/OM_w1/network/AMS/跨夜；C=OM_w2/LineOA；D=MS；E=鏡面 | (1) 「記錄有內容」判定：A=`fields`∪`SpecialBlockParserPolicy.hasUsableRecordData`；B=`fields`；C=`__hasContent`∪`fields`；MS=`fields`；鏡面=`__workflow`∪`__hasContent`∪**任一非 `__` 欄位有值**。(2) A 用 `resolveRecordTemplateRoutes`（多路由、try/catch→unmatched）；其餘單路由且例外會直接中斷整批。(3) OM_w2/LineOA 多 `rules.resolveOutputNameForTemplate` 決定檔名。(4) A 的 `sheetTemplateRoute` 多 `templateFile`,`multiOutput` 兩鍵。(5) A 對 unmatched 去重、emptyBlocks 只在「該區塊沒新增 unmatched」時記錄；理由文字不同 | (1) 像素/檔名（鏡面模式會讓只有備註欄的列也產圖）；(2) 錯誤情境；(3) 檔名；(4) JSON 多 2 鍵；(5) UI | (1) (b) `batch.recordContentMode`：鏡面=`'anyField'`，其餘=`'fields'`；`__workflow/__hasContent/special` 檢查 (a) 超集。(2) (a) 超集（多路由 hook 未註冊時等同單路由；try/catch 只改錯誤路徑）。(3) (a) 超集。(4) (a) 超集，**但若 JSON 需逐位元相等則改 (b) `batch.routeMetaExtended`（A=true）**。(5) (a) |
| `normalizeOutputSuffix` | 全同（鏡面僅少註解） | — | 否 | (a) |
| `detectMatrixProjectNames` / `detectAndOfferProjectsFromSheet` / `parseMatrixSheet` | 全同；鏡面 **缺** | 鏡面沒有矩陣工單 | 像素/檔名（鏡面若被矩陣 parser 命中會多產圖） | (b) `batch.matrixParser`：鏡面=false，其餘 true |
| `parseRows` | A=BN/暖身；B=KV/OM/LineOA/network/跨夜；C=MS；D=AMS；E=鏡面 | 見 §2。A：header 允許「特規 Parser 欄位」、`isSpecialOnlyPlacement` 版位禁止回退共用解析（跳列並記警告）、多一個未使用變數。MS：sheetParser 先找 `parseSheetBlocks` 再 `parse`。AMS：header 別名（檔名/文案/店名/LINE POINTS %/GD摳圖LINK→商品圖1）、blockParser 可回 `quantity`/`consumedUntilRow`、**LINE購物逐列模式**（header 同時有 版位+檔名+商品圖1+店名+LINE_POINTS_PERCENT 時一列一筆）。鏡面：**只有** sheetParsers（helper 多 `isMergedFill`），無矩陣、無通用解析 | 像素/檔名/資料夾 | (b) `batch.specialParserPolicy`：BN/暖身=true，其餘 false（window 物件不存在時本就 no-op，可視為 (a)，但建議保留旗標以免 A 的規則檔被載入到別家）；(a) `parseSheetBlocks||parse`；(b) `batch.extraHeaderAliases`：AMS=`'ams'`，其餘 null；(a) 逐列模式（五欄同時存在才觸發）、`consumedUntilRow`/`quantity`、`isMergedFill` helper；(b) `batch.genericRowParser`：鏡面=false，其餘 true |
| `readRecordFromRow` | A=BN…；MS 僅註解；AMS 多 5 組 alias（同上） | AMS 別名 | 像素 | 併入 `batch.extraHeaderAliases` |
| `resolveRecordTemplateRoutes` | 只有 BN/暖身/MS | rule 可回多路由 | 檔名（多輸出） | (a) 超集 |
| `resolveRecordTemplateRoute` | A=BN/暖身/KV/OM_w1/OM_w2/LineOA；B=MS；C=network/AMS/跨夜；D=鏡面 | 規則沒回路由但 record 有 `__templateId` 時的相容路由：A→`family:'om_wave1_subtitle'`、prefix=`__media||id`；C→`family:''`、key=id、prefix=`__media||id`；D→`family = block.templateType || rule.family`、prefix=id；MS→**回 null** | 像素（family 決定後續 hook）＋檔名（prefix） | (b) `batch.explicitTemplateIdRoute`：BN/暖身/KV/OM_w1/OM_w2/LineOA=`'om_wave1'`；network/AMS/跨夜=`'generic'`；鏡面=`'blockFamily'`；MS=`'none'` |
| `ensureTemplateForRoute` / `fetchRouteTemplate` | A(BN/暖身/MS)：只在已載入池找，**不 fetch**；其餘：找不到就 `fetch ./templates/<file>`；後處理 KV=無、OM_w1/OM_w2/LineOA/network/鏡面/跨夜=`TextBaselineModel.prepareTemplate`、AMS 再加 `LayerDefaults.apply` | 像素（可能用到打包內舊 JSON） | (b) `batch.fetchRouteTemplate`：A 分支=false，其餘 true；(c) fetch 後處理三種版本需與 TemplateLoader.loadTemplateFolder 負責人對齊（同一份 JSON 兩條載入路徑的前處理應一致） |
| `findTemplateForRoute` | A=BN/暖身/MS；B=其餘（鏡面僅註解） | A：只認 `templateFile` 或 id 精準相等，命中 >1 視為衝突、0 命中不 fallback。B：先檔名精準、再去編號前綴精準、**再 includes 模糊**，取第一個 | 像素/檔名（選到不同公版） | (b) `batch.templateMatchMode`：A 分支=`'strict'`，其餘=`'fuzzy'` |
| `findTemplateRuleForName` | A：`detectFamily([name])`；B：tokens `includes` | 同上 | 像素 | 併入 `batch.templateMatchMode` |
| `findTemplateForName` | A=BN/暖身；MS 僅訊息；B：先 `findTemplateByDirectName` 直接比名、再 rule.targets `includes` | A 沒有 rule 就失敗、targets 精準、多命中失敗 | 像素/檔名 | 併入 `batch.templateMatchMode` |
| `normalizeTemplateIdentity` | A：`RuntimePolicy` 優先＋去數字前綴；B：不去前綴；LineOA/鏡面 多別名註解 | 身分正規化 | 像素 | 併入 `batch.templateMatchMode`（strict 版去前綴） |
| `findTemplateByDirectName` / `getIdentityAliasGroups` | A：**回 null**（停用）；B：啟用；LineOA/鏡面 再加 `window.TemplateIdentityAliases` 別名群 | 同上 | 像素 | 併入 `batch.templateMatchMode`；別名群 (a) 超集 |
| `makeOutputPrefix` | 全同（MS 註解） | — | 否 | (a) |
| `applyTemplateRuleHook` | A=BN/暖身；B=祖/LineOA/network/鏡面/跨夜；MS；AMS | helpers 差異：A 多 `measureRenderedTextWidth`；MS 多 `measureRenderedTextInkBounds`；AMS 多 `findAssetFilename`（prefix/project 預設取該張圖） | 否（rule 沒用到就無差） | (a) 超集（三個 helper 全給；前提 Renderer 統一版有對應方法） |
| `captureTemplateGeometry` / `restoreTemplateGeometry` | 只有 BN/暖身 | Preset 固定幾何快照 | 像素 | 隨 `WarmupPlacementPresetEngine` 存在與否 (a)，見下 |
| `prepareDynamicProductLayers` | A；MS 只差刪除的鍵名（`__appliedPlacementPresetKey` vs `__smartAssetInitialGeometry`） | 素材集合變動時清哪個快取鍵 | 否 | (a) 兩鍵都刪 |
| `applyRecordToTemplate` | A=BN/暖身；B=KV；C=OM_w1/OM_w2/LineOA/network/AMS；D=MS；E=鏡面；F=跨夜 | ① 首次套版清鍵：A `__appliedPlacementPresetKey`、MS `__smartAssetInitialGeometry`+每層 `__smartAssetBaseline`、跨夜 `template.__renderModel`。② textMap：MS 多 `副標`。③ CTA：A/MS 依 rule `ctaPolicy`（explicit/rule-managed/legacy），命中時寫 `assetFilename=lookupName||filename`、`assetProject`、`hidden=false`；祖/B 一律 legacy 且只寫 `assetFilename=filename`。④ 商品圖命中：A/MS 寫 `logicalAssetKey`、`smartAssetGroup`（rule `resolveSmartAssetGroup`）、`makeAssetId(name,{folder,logicalAssetKey,group,…})`；C/F/AMS：`makeAssetId(name,{layer,template,folder})` 並在素材變更時刪 `__resolvedAsset*`／`smartAssetId`；KV：`makeAssetId(name)`；鏡面：不產 smartAssetId。⑤ 商品圖未命中：MS 保留商品框並標 `__manualUploadRequired`（warning）、lookup 例外不中斷；其餘清空 `assetFilename`（missing）。⑥ Preset：A 呼叫 `WarmupPlacementPresetEngine`（無 preset 且 rule 未宣告 `legacyPresetOptional` 就 **throw**；有 preset 且非 `dynamicLayout` 時鎖幾何、跳過 LayoutRuleEngine）。⑦ `SPTextStandard.applyTemplateNonPriceText`：BN/暖身/MS 在 after-hook 後、Layout 前呼叫；其餘無。⑧ `SmartAssetManager.applyTemplate` 時機：BN/暖身/KV 在 LayoutRuleEngine **前**；OM_w1/OM_w2/LineOA/network/AMS/跨夜/MS 在 **後**；鏡面不呼叫 | ①否 ②像素 ③像素（hidden 翻轉、assetProject 影響載圖資料夾）④ UI/人工同步 ⑤像素 ⑥像素 ⑦像素 ⑧像素（Smart baseline 影響後續同步） | ① (a) 三鍵全刪。② (b) `batch.coreSubtitleTextMap`：MS=true，其餘 false。③ (b) `batch.ctaMode`：BN/暖身/MS=`'policy'`，其餘=`'legacy'`。④ (b) `batch.smartAssetIdMode`：BN/暖身/MS=`'grouped'`；OM_w1/OM_w2/LineOA/network/AMS/跨夜=`'contextual'`；KV=`'plain'`；鏡面=`'none'`；刪 `__resolvedAsset*` (a)。⑤ (b) `batch.missingProductAssetMode`：MS=`'manualUpload'`，其餘=`'clear'`。⑥ (a)：`WarmupPlacementPresetEngine` 是 modules/ 選配，window 不存在時整段等同其他分支——但需確認統一版只在 BN/暖身載入它；否則改 (b) `batch.placementPreset`（BN/暖身=true）。⑦ (b) `batch.applyNonPriceTextStandard`：BN/暖身/MS=true，其餘 false（OM_w1/OM_w2/LineOA 有 SPTextStandard 物件卻不呼叫此方法，不能靠存在性判斷）。⑧ (b) `batch.smartAssetApplyPhase`：BN/暖身/KV=`'beforeLayout'`；OM_w1/OM_w2/LineOA/network/AMS/跨夜/MS=`'afterLayout'`；鏡面=`'none'` |
| `getTemplateAssetPrefix` / `resolveAssetFilename` | 全同；MS 缺（不使用） | — | 否 | (a) |
| `findAssetFilename` | A=BN；B=暖身；C=KV/OM_w1/OM_w2/network/AMS/跨夜；D=MS；E=LineOA；F=鏡面 | A/暖身/MS：委派 `AssetLookup.match`（暖身多 `allowFuzzy` 選項預設 true；MS 不算 `role`）。C：core 內建 4 段比對（精準→補副檔名/prefix→正規化→includes 模糊）＋**「蝦皮VIP_LOGO」特例**＋`getAssetPolicy` 跨專案 fallback。E/F：C 再加 `getAssetLookupScope(template)` 的 `strictScope/templateFolder`；鏡面**移除**蝦皮VIP 特例 | 像素（找到不同檔）＋資料夾 | (b) `batch.assetLookupMode`：BN/暖身/MS=`'module'`；KV/OM_w1/OM_w2/network/AMS/跨夜=`'inline'`；LineOA/鏡面=`'inlineScoped'`。(b) `batch.assetRoleClassify`：MS=false，其餘 true。(b) `batch.shopeeVipGuard`：inline 系=true，鏡面=false。`allowFuzzy` (a) 超集 |
| `renderBatchUI` | A 把 `warning` 也列入缺件；B 只列 `missing*` | 診斷清單 | UI | (a) 取 A |
| `selectGenerated` | A=BN/暖身/MS；B=KV；C=OM_w1/OM_w2/LineOA/network/AMS/跨夜；D=鏡面 | A：commit 編輯、`selectionRevision` 防競態、**不重跑任何 rule**。B：切換後 `rebuildFromPricePreset`＋after-hook＋SmartAsset＋PriceTransform sync。C：同 B 但 `SnapshotManager.shouldProtectVisualState` 時跳過。D：同 C 無 SmartAsset | 像素（切換即回寫正式 template） | 併入 `batch.previewMode`（見下） |
| `clearBatch` | A 多 commit/finalize/History.clear/SmartAsset reset/`hoverLayer=null` | 工作階段清理 | UI | (a) |
| `renderPreviewPlaceholders` / `waitForPreviewFrame` / `refreshPreviewIndexes` / `refreshThumbsForIndexes` | 只差註解；`refreshPreviewIndexes`(A) 與 `refreshThumbsForIndexes`(B/祖) 同體異名 | — | 否 | (a) 兩個名字都保留 |
| `renderPreviewGrid` | A=BN/暖身/MS；B=其餘 | A：對每張 `renderThumbnailForTemplate`（clone 後只載圖）。B：**切換 `AppState.activeIndex/template`**、`refreshTemplateFromBatchRecord`（在正式 template 上再跑 `applyRecordToTemplate(skipExactLayout, preserveProductGeometry)`）、載圖、`stabilizeTemplateBeforePreview`（價格重建＋after-hook＋Smart＋sync＋Layout ×2）後才縮圖；結束還原 activeIndex | **像素**（B 系匯出前 template 已被二次套版與重排；A 系維持首次套版結果） | (b) `batch.previewMode`：BN/暖身/MS=`'snapshot'`；KV=`'mutating'`；OM_w1/OM_w2/LineOA/network/AMS/跨夜=`'mutatingGuarded'`（多 SnapshotManager 保護）；鏡面=`'mutatingGuardedNoSmart'` |
| `refreshTemplateFromBatchRecord` / `refreshGeneratedTemplatesFromBatchRecords` | 只有 B/祖；`__multiSizeSync` 早退（鏡面/跨夜無）；OM_w1 以後多 SnapshotManager 保護 | 同上 | 像素 | 併入 `batch.previewMode`；`__multiSizeSync` 早退 (a)（只有 AssetSpecEngine 會設） |
| `stabilizeTemplateBeforePreview` | KV / OM_w1 系 / network 系（僅註解）/ 鏡面（無 SmartAsset） | 同上 | 像素 | 併入 `batch.previewMode` |
| `renderThumbnailForTemplate` | A：clone＋載圖；KV：**在原 template 上**跑價格/hook/Smart/Layout；OM_w1 以後：clone 上跑（Smart 為 readOnly）；鏡面：clone 無 Smart | KV 版會改正式 template | 像素（KV） | 併入 `batch.previewMode` |
| `makeThumbURLFor` | `__multiSizeSync` 時白底（BN/暖身/KV/OM/LineOA/network/AMS；MS/鏡面/跨夜無）；OM_w2/LineOA 多 `showUploadPrompt`；鏡面無 `showGuides` | 縮圖外觀 | UI | (b) `batch.thumbOptions`（小旗標，`{whiteOnMultiSize, showUploadPrompt, showGuides}`）：預設依上列；或 (a) 取超集若團隊接受縮圖差異 |
| `markThumbsStale` / `indexOfTemplate` | network/AMS/跨夜 | 去抖 400ms 後局部刷新縮圖 | UI | (a) |
| **AppState** | A/MS 多 `historySequence`,`editingOriginalSnapshot`,`editingOriginalIndex`,`selectionRevision`；鏡面少 `historyExtras/futureExtras` | 狀態欄位 | 否 | (a) 超集 |
| **ALL_PROJECTS_VALUE** | 全同（註解不同） | — | 否 | (a) |
| **rulesReady** | A/MS：rule 載入失敗→記錄、`alert`、**不啟動**；其餘：warn 後仍 `App.init()` | 啟動策略 | 否（正常情況） | (b) `boot.abortOnRuleLoadFailure`：BN/暖身/MS=true，其餘 false |
| **__head__** | 純檔頭註解（11 版） | — | 否 | (a) 重寫為統一版說明 |
| **App.init / App.sync** | 跨夜 `sync()` 多 `LinkSyncUI.render()` | UI | 否 | (a) `window.LinkSyncUI?.render?.()` |
| **App.bindUI** | A=BN/暖身、MS（註解）/ 祖 / OM_w1=OM_w2=LineOA / network=AMS / 鏡面 / 跨夜 | 文字工具列：A/MS 走 `applyTextFormat`（先 commit 編輯、`ManualOverrideManager.mark`、`DynamicLayoutManager.refreshForText`、`PriceTransformEngine.setTypographyFontSize`、有標籤的 History）；祖/B 直接改 layer 屬性；OM_w1/OM_w2/LineOA 額外 `OMWave1SubtitleLayout.refresh` 與 `SPTextStandard.applyPriceTextLayer`；跨夜 `markManualTextEdited`＋`linkSyncToggle`；鏡面無專案選單事件；`window.*` 匿出清單略有差 | 只影響手動編輯，不影響批次輸出 | (b) `ui.textToolbarMode`：BN/暖身/MS=`'managed'`，其餘=`'plain'`；OM/LineOA 的兩個外掛呼叫、跨夜 LinkSync 用 `window.X?.` 存在性守衛 (a)；`window.*` 匿出取超集 (a) |

## 2. Parser 優先序

### 2.1 各工具實際判斷順序（`generateFromSelectedSheet` → `generateForCurrentProject` → `parseRows`）

```
正式BN / 暖身BN
  [0] AssetSpecEngine.findHeader(rows)?  → AssetSpecEngine.build 全表接管，return
  [1] All 模式迴圈 → generateForCurrentProject
      [1a] rules sheetParsers（parser.parse，第一個有 blocks 者勝）
      [1b] parseMatrixSheet（矩陣工單）
      [1c] 通用「製作內容/版位」錨點解析
           header 條件：fields 命中 ∪ SpecialBlockParserPolicy.isSpecialHeaderRow
           每個製作物列： blockParser(family by detectFamily) → 有 records 用之
                          → isSpecialOnlyPlacement? 跳列+警告（禁止回退）
                          → 通用區塊（往上找主標列、往下收共用文案）
      記錄有效：fields 有值 ∪ SpecialBlockParserPolicy.hasUsableRecordData

KV / OM_w1 / network（AMS 見下）
  [0] AssetSpecEngine 同上（network/AMS 多傳 sheetName）
  [1a] sheetParsers → [1b] matrix → [1c] 通用（blockParser by tokens；無特規政策）
  記錄有效：fields
OM_w2 / LineOA：同 KV，記錄有效 = __hasContent ∪ fields；檔名多 rules.resolveOutputNameForTemplate
AMS：同 KV，[1c] 內順序 = blockParser（可回 consumedUntilRow/quantity）→ LINE購物逐列模式（五欄齊備）→ 通用區塊
跨夜：無 [0]；[1a] → [1b] → [1c]（同 KV）
MS ：無 [0]；[1a] 用 parser.parseSheetBlocks || parser.parse → [1b] → [1c]（無特規政策）
鏡面：無 [0]；只有 [1a]（helper 多 isMergedFill）；沒有 blocks → 回「工單格式無法解析」警告
      記錄有效：__workflow ∪ __hasContent ∪ 任一非 __ 欄位有值
```

### 2.2 ParserPipeline 提案

分類（family flag `batch.parserProfile`）決定「啟用集合」；集合內固定依 `priority` 由小到大嘗試，第一個回傳非空 blocks 者勝。

| Stage id | priority | 內容 | 啟用條件 |
|---|---|---|---|
| `assetSpec` | 0 | `AssetSpecEngine.findHeader → build`（整表接管，含 sheetName） | `batch.assetSpecEngineFirst` |
| `ruleSheetParsers` | 10 | registry `getSheetParsers()`，每個 parser 先 `parseSheetBlocks` 再 `parse`；helpers 含 `norm / normalizeRecordText / isMergedFill` | 永遠 |
| `matrix` | 20 | `parseMatrixSheet` | `batch.matrixParser` |
| `generic` | 30 | 錨點解析；內部子步驟依序：`blockParser`(30.1，支援 consumedUntilRow/quantity) → `specialOnlyGuard`(30.2，需 `batch.specialParserPolicy`) → `rowMode`(30.3，需 `batch.extraHeaderAliases='ams'` 且五欄齊備) → `block`(30.4) | `batch.genericRowParser` |
| `fallback` | 99 | 回 `{blocks:[], warnings:['工單格式無法解析…']}` | 永遠（鏡面現況） |

對映：

| 工具 | 啟用集合 | 其他影響 parser 的旗標 |
|---|---|---|
| 正式BN、暖身BN | assetSpec, ruleSheetParsers, matrix, generic(含 specialOnlyGuard) | specialParserPolicy=true, mergeFillMode=rect, numericDisplayValue=true, recordContentMode=fields |
| KV、OM_w1、network | assetSpec, ruleSheetParsers, matrix, generic | mergeFillMode=vertical |
| OM_w2、LineOA | 同上 | rowsFromZero=true |
| AMS | assetSpec, ruleSheetParsers, matrix, generic(含 rowMode) | extraHeaderAliases=ams, extraFields |
| 跨夜 | ruleSheetParsers, matrix, generic | — |
| MS | ruleSheetParsers, matrix, generic | mergeFillMode=rect, numericDisplayValue=true |
| 鏡面 | ruleSheetParsers, fallback | rowsFromZero=true, recordContentMode=anyField, matrixParser=false, genericRowParser=false |

「記錄有效」統一為：`__workflow===true || __hasContent===true || SpecialBlockParserPolicy?.hasUsableRecordData(...) || (recordContentMode==='anyField' ? 任一非 __ 欄位有值 : fields.some(有值))`。前三項在對應 rule/物件不存在時自然為 false，可直接取超集。

## 3. 旗標總表

| 旗標 | 型別/可能值 | 預設：A（正式BN/暖身BN/MS） | 預設：B（LineOA/network/AMS/鏡面/跨夜） | 預設：祖（KV/OM_w1/OM_w2） | 用在哪些方法 |
|---|---|---|---|---|---|
| `batch.assetSpecEngineFirst` | bool | BN/暖身 true；**MS false** | LineOA/network/AMS true；**鏡面/跨夜 false** | true | generateFromSelectedSheet |
| `batch.matrixParser` | bool | true | **鏡面 false**，其餘 true | true | parseRows, handleExcelFile(detectAndOffer), App.bindUI 分頁事件 |
| `batch.genericRowParser` | bool | true | **鏡面 false**，其餘 true | true | parseRows |
| `batch.specialParserPolicy` | bool | BN/暖身 true；MS false | false | false | parseRows(header/skip), generateForCurrentProject(記錄有效) |
| `batch.extraHeaderAliases` | `null \| 'ams'` | null | **AMS 'ams'**，其餘 null | null | parseRows.detectColMap, readRecordFromRow |
| `batch.extraFields` | string[] | [] | **AMS ['檔名','店名','LINE_POINTS_PERCENT']** | [] | fields（記錄有效、header 判定） |
| `batch.recordContentMode` | `'fields' \| 'anyField'` | fields | **鏡面 anyField**，其餘 fields | fields | generateForCurrentProject |
| `batch.mergeFillMode` | `'rect' \| 'vertical'` | rect | vertical | vertical | sheetToRowsWithMergedFill |
| `batch.numericDisplayValue` | bool | true | false | false | sheetToRowsWithMergedFill |
| `batch.rowsFromZero` | bool | false | LineOA/鏡面 true；network/AMS/跨夜 false | OM_w2 true；KV/OM_w1 false | sheetToRowsWithMergedFill |
| `batch.explicitTemplateIdRoute` | `'om_wave1' \| 'generic' \| 'blockFamily' \| 'none'` | BN/暖身 om_wave1；**MS none** | LineOA om_wave1；network/AMS/跨夜 generic；鏡面 blockFamily | om_wave1 | resolveRecordTemplateRoute |
| `batch.templateMatchMode` | `'strict' \| 'fuzzy'` | strict | fuzzy | fuzzy | findTemplateForRoute, findTemplateRuleForName, findTemplateForName, findTemplateByDirectName, normalizeTemplateIdentity |
| `batch.fetchRouteTemplate` | bool | false | true | true | ensureTemplateForRoute（後處理版本差異列為 (c)） |
| `batch.routeMetaExtended` | bool（僅在 JSON 需逐位元相等時啟用） | true | false | false | generateForCurrentProject(sheetTemplateRoute) |
| `batch.ctaMode` | `'policy' \| 'legacy'` | policy | legacy | legacy | applyRecordToTemplate |
| `batch.coreSubtitleTextMap` | bool | **MS true**；BN/暖身 false | false | false | applyRecordToTemplate.textMap |
| `batch.smartAssetIdMode` | `'grouped' \| 'contextual' \| 'plain' \| 'none'` | grouped | LineOA/network/AMS/跨夜 contextual；鏡面 none | KV plain；OM_w1/OM_w2 contextual | applyRecordToTemplate.applyImage |
| `batch.missingProductAssetMode` | `'clear' \| 'manualUpload'` | **MS manualUpload**；BN/暖身 clear | clear | clear | applyRecordToTemplate.applyImage |
| `batch.placementPreset` | bool（若無法靠模組存在性判斷才需要） | BN/暖身 true；MS false | false | false | applyRecordToTemplate, captureTemplateGeometry, restoreTemplateGeometry |
| `batch.applyNonPriceTextStandard` | bool | true | false | false | applyRecordToTemplate |
| `batch.smartAssetApplyPhase` | `'beforeLayout' \| 'afterLayout' \| 'none'` | BN/暖身 beforeLayout；**MS afterLayout** | 鏡面 none；其餘 afterLayout | KV beforeLayout；OM_w1/OM_w2 afterLayout | applyRecordToTemplate |
| `batch.assetLookupMode` | `'module' \| 'inline' \| 'inlineScoped'` | module | LineOA/鏡面 inlineScoped；network/AMS/跨夜 inline | inline | findAssetFilename |
| `batch.assetRoleClassify` | bool | BN/暖身 true；**MS false** | true | true | findAssetFilename |
| `batch.shopeeVipGuard` | bool（僅 inline 系有效） | — | **鏡面 false**，其餘 true | true | findAssetFilename |
| `batch.previewMode` | `'snapshot' \| 'mutating' \| 'mutatingGuarded' \| 'mutatingGuardedNoSmart'` | snapshot | 鏡面 mutatingGuardedNoSmart；其餘 mutatingGuarded | KV mutating；OM_w1/OM_w2 mutatingGuarded | renderPreviewGrid, renderThumbnailForTemplate, selectGenerated, refreshTemplateFromBatchRecord, stabilizeTemplateBeforePreview |
| `batch.thumbOptions` | `{whiteOnMultiSize, showUploadPrompt, showGuides}` | BN/暖身 {T,F,T}；MS {F,F,T} | LineOA {T,T,T}；network/AMS {T,F,T}；鏡面 {F,F,F}；跨夜 {F,F,T} | KV/OM_w1 {T,F,T}；OM_w2 {T,T,T} | makeThumbURLFor（僅縮圖） |
| `boot.abortOnRuleLoadFailure` | bool | true | false | false | rulesReady |
| `ui.textToolbarMode` | `'managed' \| 'plain'` | managed | plain | plain | App.bindUI |

**需人工決定 (c) 清單**
1. `fetchRouteTemplate` 後處理（無 / `TextBaselineModel.prepareTemplate` / +`LayerDefaults.apply`）— 應與 TemplateLoader.loadTemplateFolder 的載入前處理統一，請與 TemplateLoader 報告對齊。
2. `batch.routeMetaExtended`（JSON 多 `templateFile`/`multiOutput`）— 取決於黃金樣本比對是否含 JSON 逐位元。
3. `batch.placementPreset` 是否可以只靠 `window.WarmupPlacementPresetEngine` 存在性判斷 — 取決於統一版 modules/ 載入清單是否仍按工具分開。
