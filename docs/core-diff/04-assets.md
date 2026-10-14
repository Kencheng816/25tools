# 步驟 2 差異報告：素材載入／查找／同步模組

範圍：TemplateLoader、AssetStore、AssetLookup、classifyAssetRole／ASSET_POLICY／getAssetPolicy、AssetSyncHub、SnapshotManager、ManualAssetUpload、normalizeIdentityLoose／resolveTemplateFolderName／getAssetLookupScope、EMBEDDED_ASSETS、SVG、encodeAssetPath、normalizeLayerIdentifier、normStr、normalizeAssetStemExact、assetNameVariantsForTemplate；外掛 `smart-assets/smart-asset-manager.js`、`modules/multi-size-asset-sync.js`、`modules/asset-review-modal.js`。
基準＝正式BN。分支代號：A＝正式BN/暖身BN/MS；B＝LineOA/network/AMS/鏡面/跨夜；祖＝KV/OM_w1/OM_w2（OM_w1 與 OM_w2 全部檔案 md5 相同，以下合寫 OM）。
「影響輸出」欄：像素＝改變匯出圖；素材＝可能選到不同檔案（進而改變像素）；否＝只影響 UI/診斷/狀態。

---

## 1. TemplateLoader

| 方法 | 版本分布 | 差異內容（行為差異） | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| boot | A16：正式BN/暖身BN；B17：其餘 8 個；C14：MS | 只差註解與 `rulesLoaded` 未使用變數。 | 否 | (a) 直接取超集 |
| clearTemplates | A24：正式BN/暖身BN/MS；B23：KV/鏡面；C24：OM/LineOA/network/AMS/跨夜 | A 多重設 `AppState.historySequence = 0`；C 多呼叫 `SmartAssetManager.resetSession()`；B 兩者皆無。兩者都是「有就做」的重置，無副作用衝突。 | 否 | (a) 直接取超集（兩行都做；鏡面無 SmartAssetManager 為 no-op） |
| resolveAssetLookupProject | A16：正式BN/暖身BN/MS；B5：KV/OM/network/跨夜；C8：LineOA；D13：AMS；E17：跨夜（僅註解差） | **A**：explicit project 需 bucket 非空才採用；否則以 template identity（`normalizeTemplateIdentity`/normStr）對素材資料夾名做「相等或前綴」比對，取最長 key；再退 currentProject（亦需非空）。**B/祖**：`options.project ?? batchProject ?? __project`，非空即回傳，否則 currentProject；不做資料夾比對、不檢查 bucket。**AMS**：把 `??` 改為「第一個非空且非 All」，修正 `options.project=''` 蓋掉 batchProject 的 bug。LineOA/跨夜 與 B5 邏輯相同（差註解）。 | 素材 | (b) `assets.lookupProjectMode`：`'identityFolder'`（正式BN/暖身BN/MS）、`'explicit'`（KV/OM/LineOA/network/鏡面/跨夜）、`'explicitFirstNonEmpty'`（AMS） |
| updateSpecAssetWarning / resolveAssetSpec | A65：正式BN/暖身BN/KV/OM/LineOA；B74：network/AMS；無：MS/鏡面/跨夜 | 只在 `layer.__assetSpec` 存在時作用（僅 network rules 會寫入 `AssetSpecEngine`／`__assetSpec`）。B74 多一段 `layer.__assetCleared === true` → 清空檔名、標記缺失、回 `{cleared:true}`（配合 ManualAssetUpload.clearAsset）。MS/鏡面/跨夜 已移除整段 spec 流程。 | 素材（僅 network） | (a) 直接取 B74 超集（無 `__assetSpec` 時整段 no-op；`__assetCleared` 只有 ManualAssetUpload 會寫） |
| loadImagesForTemplate | 8 版：A106 正式BN／B116 暖身BN／C108 KV／D120 OM·network·AMS／E86 MS／F133 LineOA／G111 鏡面／H129 跨夜 | 共同骨架：逐 image layer → findLocalAssetFile（blob）→ EMBEDDED_ASSETS → `./assets/...` URL 探測。差異：<br>① **URL fallback 順序**：正式BN／暖身BN：`assets/<project>/f`、`assets/<project>/<templateId>/f`（以 template 自身決定，不讀 activeIndex）、**只有 role=product** 才加 `assets/共用素材/f`、再 `assets/f, ./f, assets/f, f`。KV/OM/network/AMS/跨夜：`assets/<project>/f`、`assets/<project>/<AppState.templates[activeIndex].name>/f`（依全域 activeIndex）、**一律** `assets/共用素材/f`、root。MS：對每個候選再展開副檔名 `[原, .png,.svg,.webp,.jpg,.jpeg]`，其餘同 KV 順序但不看 role。LineOA/鏡面：`getAssetLookupScope` strict 時改為 `assets/<公版同名資料夾>/f` → `assets/<project>/f` → `assets/f` → `assets/共用素材/f` 停止；非 strict 同 KV。<br>② **候選檔名**：MS 用 `assetNameVariantsForTemplate` 把「<templateId>_xxx.png」剝前綴多產生一個候選。<br>③ **暖身BN 專屬**：`layer.__retryMissingAssetWhenHidden===true` 的隱藏圖層仍載入；`allowFuzzy: layer.__exactAssetMatch !== true` 傳給 findLocalAssetFile；`layer.__allowCommonAssetFallback===true` 讓非 product 也探 共用素材；結尾呼叫 `BatchManager.applyTemplateRuleHook('afterLoadImagesForTemplate')`。<br>④ **B 分支**：命中後呼叫 `setResolvedAssetMetadata` 寫 `__resolvedAssetFolder/Filename/Path`（供 Snapshot 還原精準回找）。<br>⑤ **LineOA**：每層成功/失敗寫 `recordAssetLoadDiagnostic` 到 `template.batchDiagnostics`。<br>⑥ **跨夜**：開頭 `await TextBaselineModel.waitForFonts()`；無 assetFilename 或載入失敗一律 `__assetMissing=true` 並 `BatchDiagnostics.addAssetWarning`；結尾 `applyTemplateRuleHook('afterTemplateAssetsReady')` 與 `captureRenderModel(template)`（建立 `__renderModel` 基準）。<br>⑦ MS/鏡面/跨夜：無 spec 流程與 spec warning。 | 素材＋像素（③⑥會改幾何：afterLoadImages/afterTemplateAssetsReady hook 由 rules 重算版型） | (b) 多旗標：`assets.urlFallback.commonFolder`＝`'productOnly'`（正式BN/暖身BN）/`'always'`（其餘）；`assets.urlFallback.templateSubfolderSource`＝`'template'`（正式BN/暖身BN/MS）/`'activeIndex'`（KV/OM/LineOA/network/AMS/鏡面/跨夜）；`assets.urlFallback.extensionExpand`＝true 僅 MS；`assets.templatePrefixVariants`＝true 僅 MS；`assets.missingDiagnostics`＝`'spec'`（正式BN/暖身BN/KV/OM/network/AMS）/`'templateList'`（LineOA）/`'batchDiagnosticsAlways'`（跨夜）/`'none'`（MS/鏡面）；`assets.waitFontsBeforeLoad`＝true 僅跨夜；`assets.captureRenderModel`＝true 僅跨夜。<br>(a) 超集可直接納入：④ setResolvedAssetMetadata（純寫 metadata）、③ 暖身BN 三個 layer 旗標（預設不觸發）、暖身BN/跨夜 hook（rules 未註冊即 no-op）、strict scope（rules 未註冊即 off） |
| findLocalAssetFile | A13 正式BN／B13 暖身BN／E12 MS；C100 KV；D118 OM/network/AMS/跨夜；F123 LineOA；G113 鏡面 | **A 分支**：委派 `AssetLookup.match(filename,{folder,role,prefix[,allowFuzzy]})`；MS 不傳 role。歧義會 **throw**（會讓 loadImagesForTemplate 的 Promise.all reject）。<br>**祖/B 分支**：自行實作於 `AssetStore.getFlatForLookup` 的扁平表上做多層比對（見第 2 節決策樹）；不 throw。KV→OM 差異：OM 起多一段「Snapshot 保護狀態下先用 `__resolvedAssetPath` 精準回找」。LineOA/鏡面：傳入 strictScope/templateFolder 給 getFlatForLookup，並在 strict 下關掉跨專案 fallback。鏡面：**移除**「蝦皮VIP_LOGO 不可退到 VIP_LOGO」特例。 | 素材 | (b) `assets.lookupEngine`＝`'assetLookup'`（正式BN/暖身BN/MS）/`'flatFuzzy'`（其餘 8 個）；`assets.flatFuzzy.shopeeVipGuard`＝true（KV/OM/LineOA/network/AMS/跨夜）/false（鏡面）；`assets.flatFuzzy.snapshotPathFirst`＝false（KV）/true（B 全部＋OM） |
| loadAssetFolder | A37：正式BN/暖身BN/MS；B45：其餘 8 個 | A：decode 走 `RuntimePolicy.decodeHashUnicode`；上傳後 `imageLoadCache.clear()`、`ShapeRenderer.invalidateAssetCache()`，直接 `loadImagesForTemplate(AppState.template,{project})`，批次模式只 `BatchManager.refreshPreviewIndexes(全部)`（保留 History/Override/SmartAsset session）。B/祖：`loadImagesForActiveTemplate()`；批次模式 `refreshGeneratedTemplatesFromBatchRecords()` **重新套工單** 後 `renderPreviewGrid()`。 | 像素（B 重套工單會把手動調整洗掉；A 不會） | (b) `assets.afterUploadRefresh`＝`'refreshThumbsKeepState'`（正式BN/暖身BN/MS）/`'reapplyRecordsRegrid'`（其餘 8 個）；cache clear 兩行可取超集 |
| loadTemplateFolder | A61 正式BN/暖身BN；D60 MS；B21 KV；C33 OM/LineOA/network；E34 AMS；F31 鏡面；G33 跨夜 | **A**：先清批次/History/SmartAsset session；每檔 `TextBaselineModel.prepareTemplate(data,{source:'json'})`、`AssetSpecEngine.prepareTemplate`（MS 無）、寫 `__templateFile`；以 `normalizeTemplateIdentity(file.name)` 分組，**同 identity ≥2 全部排除並 alert**；解析失敗收集 errors 並 alert。<br>**KV**：無清理、無 prepareTemplate、無 identity 檢查，解析失敗靜默略過。<br>**B/OM**：KV 基礎 + `SnapshotManager.prepareLoadedSnapshot`（是快照則 source='snapshot-restore' 且不跑 AssetSpecEngine），status 顯示快照數。AMS 另加 `LayerDefaults.apply(data)`（非快照）；鏡面移除 AssetSpecEngine；跨夜改為 `applyTemplateRuleHook('prepareTemplate', data, {}, [])`。B/祖皆 **無 identity 衝突處理**。 | 像素（prepareTemplate/LayerDefaults/hook 改初始幾何與鎖定；identity 排除改變載入哪些公版） | (b) `templates.identityConflict`＝`'excludeAll'`（正式BN/暖身BN/MS）/`'keepAll'`（其餘）；`templates.snapshotRestore`＝false（A 三個＋KV）/true（B 全部＋OM）；`templates.prepareHook`＝`'assetSpecEngine'`（正式BN/暖身BN/KV/OM/LineOA/network/AMS）/`'none'`（MS/鏡面）/`'ruleHook'`（跨夜）；`templates.layerDefaults`＝true 僅 AMS；`TextBaselineModel.prepareTemplate` 除 KV 外全部都呼叫 → (c) 需人工決定 KV 是否可補上（KV 的 TemplateLoader 完全不引用 TextBaselineModel，補上會改文字基線＝像素） |
| setResolvedAssetMetadata | 僅 B＋OM（A42） | 新增，內容一致。 | 否 | (a) 直接取超集 |
| recordAssetLoadDiagnostic | 僅 LineOA/鏡面（A21） | 新增。 | 否 | (a) 併入 `assets.missingDiagnostics='templateList'` |
| captureRenderModel | 僅跨夜（A6） | 建立 `template.__renderModel` 一次性基準（multi-size sync 依賴）。 | 否（但 multi-size sync 在其他工具因無基準而從未生效，若一併開啟會改互動行為） | (b) `assets.captureRenderModel`（僅跨夜 true） |

## 2. AssetStore

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| getBucket / getTotalFileCount / getFolderNames | 全部相同（指紋差異僅來自後方註解） | — | 否 | (a) |
| getFlatForLookup | A10 正式BN/暖身BN；C14 MS（同 A 邏輯）；B21 KV/OM/network/AMS/跨夜；D30 LineOA/鏡面 | **A/MS**：`<project>` →（`includeCommon===true` 才）`共用素材` →（`includeRoot!==false`）root；**不掃其他資料夾**。實際上 A 分支僅 SpecOverlay 等處呼叫，findLocalAssetFile 不用它。<br>**B/祖**：`<project>` → `共用素材` → root → `allowCrossProjectFallback!==false` 時 **所有其他資料夾**。<br>**LineOA/鏡面**：`templateFolder` 永遠排第一；`strictScope` 時 `templateFolder` → `<project>` → root → `共用素材` → 停止。 | 素材 | (b) `assets.flatLookup.crossProjectFallback`＝false（正式BN/暖身BN/MS）/true（其餘）；strict/templateFolder 選項取超集（無 rules 註冊即無效） |
| getFileEntries | A23 正式BN/暖身BN；B21 其餘；MS 無；跨夜 C25（只差註解） | 內容相同。 | 否 | (a) |

## 3. AssetLookup（僅 A 分支）

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| _entriesForFolder | 正式BN/暖身BN/MS 相同 | — | 否 | (a) |
| _folderOrder | A8 正式BN/暖身BN；B8 MS | 正式BN：`folder` →（role==='product' 才）`共用素材` → root。MS：`folder` → `共用素材`（一律）→ root。 | 素材 | (b) `assets.assetLookup.commonFolder`＝`'productOnly'`（正式BN/暖身BN）/`'always'`（MS） |
| match | A66 正式BN；B69 暖身BN；C66 MS | 四層：①含副檔名完整精準 ②無副檔名同 stem 唯一 ③寬鬆正規化精準 ④同資料夾唯一模糊（includes 雙向）；多命中 **throw**。暖身BN 多 `allowFuzzy=true` 參數，false 時跳過④。MS 無 role 參數。 | 素材 | (a) 取暖身BN 超集（allowFuzzy 預設 true＝正式BN 行為） |

## 4. classifyAssetRole／ASSET_POLICY／getAssetPolicy

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| classifyAssetRole | 正式BN/暖身BN A27；其餘 8 個 A19；MS 無 | 函式本體完全相同（差註解）。MS 不做角色分類。 | 否（本體同） | (a) |
| ASSET_POLICY | KV/OM/LineOA/network/AMS/鏡面/跨夜 相同；正式BN/暖身BN/MS 無 | background/product/ticket：不可跨專案、不可模糊；logo/cta/decoration：可。A 分支改由 AssetLookup 的資料夾邊界取代此表。 | 素材（僅 flatFuzzy 引擎使用） | (a)（只在 `lookupEngine='flatFuzzy'` 生效） |
| getAssetPolicy | 同上（LineOA/鏡面 只差註解） | — | 否 | (a) |

## 5. normalizeIdentityLoose／resolveTemplateFolderName／getAssetLookupScope（LineOA/鏡面）

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| 三者 | 僅 LineOA/鏡面，內容相同 | `getAssetLookupScope(template)` 讀 `getRuleSection(family,'assetLookup').scope==='strict'`；strict 時用 `window.TemplateIdentityAliases`（rules 宣告）把 templateId 對到實際存在的素材 bucket 名。兩工具的 rules 都註冊 `assetLookup:{scope:'strict'}`。 | 素材（僅 rules 註冊時） | (a) 直接取超集（其他 9 個工具 rules 未註冊 → strictScope=false，行為不變） |

## 6. AssetSyncHub

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| register/unregister | 9 個相同；MS/鏡面 無此物件 | — | 否 | (a) |
| shouldSkipProduct | 正式BN/暖身BN/OM/LineOA/network/AMS A4；跨夜 B6（註解）；KV 無 | `SmartAssetManager.ownsLayer` 擁有的圖層不進 hub。KV 無此檢查（KV 的 SmartAssetManager 亦無 ownsLayer）。 | 像素（互動同步範圍） | (a) 取超集（KV 的 SAM 無 ownsLayer → 回 false，等同原行為） |
| begin/update/finish | 跨夜多 `shouldSkip = shouldSkipProduct || !LinkSync.isEnabled(template)` | 跨夜有「連動開關」；其他工具無 LinkSync。network/AMS finish 多行只是註解。 | 像素（互動） | (a) 取超集，`LinkSync` 不存在時視為 enabled |
| MS/鏡面 | 無 AssetSyncHub | 兩工具無任何 sync 引擎註冊；有物件亦為 no-op。 | 否 | (a) |

## 7. SnapshotManager（B＋OM）

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| 全部方法 | OM/LineOA/network/AMS/跨夜 相同（A）；鏡面 createSnapshot B16 | 鏡面 `snapshotMeta` 少 `layoutNo`、`media` 兩欄（其 batchRecord 無此欄位，值本來就是空字串）。A 分支與 KV 無 SnapshotManager（匯出 JSON 不含 snapshotMeta、載入時不辨識快照）。 | 否（快照 JSON 多兩個空欄位；載入辨識受 `templates.snapshotRestore` 旗標控制） | (a) 取超集（含兩欄），搭配 `templates.snapshotRestore` |
| transientKeys | 含 `__omWave1LockSnapshot`、`__renderModel` 等 | 全版相同。 | 否 | (a) |

## 8. ManualAssetUpload（network/AMS/跨夜）

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| configure/drawSlot/registerFile/applyFile/clearAsset/pickFile/slotAt/bindDropZone | 三版相同 | 介面：`configure({isUploadSlot, accept, label})`；`applyFile(key,layer,file,{template,syncGroup})` 註冊到 `手動替換` bucket、寫 `__manualAsset`、刪 `__assetCleared`、強制 `keepAspectRatio=true, fitMode='contain'`；`clearAsset` 寫 `__assetCleared=true`、清 `AppState.images[key]`。預設 `isUploadSlot=()=>false`。 | 像素（僅使用者操作後） | (a) 直接取超集（rules 未 configure 即完全不啟用） |
| isUploadSlot | network/跨夜 A6；AMS B9 | AMS 多 `layer.locked` → false。 | 否 | (b) `manualUpload.excludeLocked`＝true（AMS）/false（network/跨夜） |
| groupUsages | network/AMS A18；跨夜 B24 | 跨夜：來源 `LinkSync.isEnabled` 為 false 只作用自己；目標未啟用連動則跳過；候選改用 `MultiSizeAssetSync.isSyncTarget`（network 用 `candidateLayer.__assetSpec`）；補保證來源自身在結果內。 | 像素（互動） | (a) 取跨夜超集：`isSyncTarget` 不存在時退回 `__assetSpec` 判斷；`LinkSync` 不存在視為 enabled |
| canClear | 跨夜 B8 只差註解 | — | 否 | (a) |

## 9. 小型常數／helper

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| EMBEDDED_ASSETS | 全部 `Object.freeze({})`；差註解 | 無內嵌素材。 | 否 | (a) |
| SVG | 全部相同；AMS 多註解 | — | 否 | (a) |
| encodeAssetPath | 全部相同；MS 差註解、少 `window.__suspendBlobRevocation=false` 初始化 | MS 沒有 asset-review-modal，該旗標無人讀。 | 否 | (a) |
| normalizeLayerIdentifier | 全部相同；MS 少 `window.decodeHashUnicode/normalizeAssetStemExact/normalizeLayerIdentifier` 三個 window 匯出 | MS 無選用模組需要它。 | 否 | (a) |
| normStr / normalizeAssetStemExact | 全部相同（MS 無 normalizeAssetStemExact；註解差） | — | 否 | (a) |
| assetNameVariantsForTemplate | 僅 MS | 剝 `<sourceTemplateId|templateId|canvas.templateId|batchSourceName>_` 前綴產生候選。 | 素材 | (b) `assets.templatePrefixVariants`＝true 僅 MS |

## 10. 外掛模組

### 10.1 smart-assets/smart-asset-manager.js（7 版，鏡面無；OM_w1＝OM_w2＝LineOA 同 md5）

| 群 | 工具 | 特徵 | 差異 |
|---|---|---|---|
| A-SAM | 正式BN 2174 行／暖身BN 2146／MS 1946 | runtime registry＋alias group（`makeAssetId(filename,{folder,group})`、mergeGroups、logical asset、priceLayout/priceContent 簽章、snapshot/restoreSession） | 正式BN vs 暖身BN：正式BN `productEntry` 排除 `hidden===true` 商品；`smartMemberRole` 對多商品（左/中/右_P）逐一找子層；`linkedUsageEntriesFor` 多商品版位改「同圖層 key＋同素材＋同價格文字」連動。MS：大幅精簡（無 bind/patchLoader/syncAll/waitForApp/withEditingContext/getSyncMode；多 captureLayerBaseline/ensureInitialGeometrySnapshot/restoreLayerBaseline），422 行差異。 |
| B-SAM | OM/LineOA 1766／network·AMS 1764／跨夜 1690 | session-only baselineStore、child baseline、placement/product delta、`ownsLayer`、`rescaleSelectedPriceTypography` | OM→network：只刪 `SPTextStandard.applyPriceTextLayer` 兩處呼叫與註解。network→跨夜：移除 `__network` 早退與 `NetworkSmartObjectSync` 掛鉤（跨夜無此引擎）。 |
| 祖-SAM | KV 1349 | **localStorage** 持久化（`om-wave1.smart-assets.v4`）、`syncFromMainCanvas`、無 ownsLayer/resetSession | 與 A、B 皆非同源可 diff。 |

影響輸出：像素（決定商品/價格/陰影幾何與跨版位同步）。
合併策略：(c) **需人工決定**——三個實作互不相容，建議整合版保留三份檔案（`smart-asset-manager.a.js`／`.b.js`／`.kv.js`）由 `family.smartAssetEngine`＝`'a'`（正式BN/暖身BN/MS）/`'b'`（OM/LineOA/network/AMS/跨夜）/`'kv'`（KV）/`'none'`（鏡面）選載；群內差異：正式BN vs 暖身BN 以旗標 `smartAsset.multiProductLink`（正式BN true／暖身BN false）與 `smartAsset.skipHiddenProduct`（正式BN true／暖身BN false）；MS 精簡版 (c) 人工決定是否以正式BN 版取代（需黃金樣本驗證）；B 群可直接取 OM 超集（`SPTextStandard`/`NetworkSmartObjectSync` 不存在即 no-op，`__network` 早退只 network 會寫入）。

### 10.2 modules/multi-size-asset-sync.js（3 版；MS/鏡面不載入）

| 版本 | 工具 | 差異 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| 353 行 | 正式BN/暖身BN/KV/OM/LineOA | `isEligible` 要求 `__assetSpec.kind==='dynamic-logo'`（只有 network rules 會寫）→ 在這 5 個工具 **實際永不生效**；`materialKey(layer)` 無群組前綴。 | 否（實際 no-op） | — |
| 372 行 | network/AMS | 加 `groupKeyResolver`、`materialKey(layer,template)` 前綴、`markGroupStale` 連來源縮圖一起刷。 | 像素（互動） | (a) 超集（groupKeyResolver 預設 ''＝舊行為） |
| 390 行 | 跨夜 | 加 `materialPredicate`（預設「有 assetFilename 即可」）、`materialKeyResolver`、`isSyncTarget`／`isEligible` 看 `LinkSync`；materialKey 改由 assetFilename stem。 | 像素（互動） | (b) `multiSizeSync.materialPredicate`＝`'dynamicLogoSpec'`（正式BN/暖身BN/KV/OM/LineOA/network/AMS）/`'anyAssetFilename'`（跨夜）。其餘取跨夜超集。 |

### 10.3 modules/asset-review-modal.js（2 版；正式BN/暖身BN 166 行；KV/OM/LineOA 191 行；其餘不載入）

| 差異 | 影響輸出？ | 合併策略 |
|---|---|---|
| A 版：預設 OFF，需 `template.__reviewRequired/reviewRequired/smartAssetPolicy.reviewRequired===true`；預覽用 working copy 且 `renderSceneTo(...,{readOnly:true})`；確認後才 overwrite，並依 `SmartAssetManager.ownsLayer` 走 `syncFromSource` 或 AssetSyncHub；失敗還原。祖版：只要 `__reviewLayerKey` 就跳窗，直接操作 live template 與 `AppState.images`，確認後寫 `adjustmentCache` 與 `template.__defaultBox`，經 AssetSyncHub 同步。 | 像素（使用者確認後幾何） | (b) `assetReview.mode`＝`'transactional'`（正式BN/暖身BN）/`'live'`（KV/OM/LineOA）/`'off'`（其餘）。目前 11 個工具的 rules 均未寫 `__reviewLayerKey`（grep 無命中），實際皆未觸發。 |

---

## 素材查找決策樹（findLocalAssetFile；本機上傳素材）

**A：正式BN／暖身BN（`AssetLookup.match`）**
1. folder ＝ `resolveAssetLookupProject`：explicit project（bucket 非空）→ 與 template identity 相等/前綴的資料夾（最長）→ currentProject（非空）→ ''。
2. role ＝ `classifyAssetRole`。資料夾順序：`folder` →（role=product）`共用素材` → root('')。**不掃其他資料夾。**
3. 每個資料夾內依序：①完整檔名精準（NFKC、小寫）②無副檔名同 stem 唯一 ③寬鬆正規化（去空白/底線/括號/點）精準 ④同資料夾唯一模糊（includes 雙向；暖身BN `allowFuzzy=false` 時跳過）。任一層多命中 → **throw**（中斷整批載圖）。
4. 候選變體：raw、basename、`<prefix>_basename`、`<prefix>_raw`（prefix 由呼叫端傳，core 目前不傳）。

**A：MS** — 同上，但資料夾順序 `folder` → `共用素材`（一律）→ root；不分 role；候選檔名先經 `assetNameVariantsForTemplate` 剝 templateId 前綴。

**祖：KV（flatFuzzy）**
1. lookupProject ＝ explicit → currentProject → ''（不檢查 bucket）。
2. files ＝ `getFlatForLookup(project,{allowCrossProjectFallback})`：`<project>` → `共用素材` → root →（policy 允許：logo/cta/decoration）**所有其他資料夾**。
3. 直接 key 命中（完整字串→basename）→ 「basename 相等 且 路徑含公版名（templateId/batchSourceName/psdName/activeIndex name+file）」→ basename 相等 → 蝦皮VIP 特例 → 全字串正規化相等 → policy 禁模糊(background/product/ticket) 則 **null** → 路徑含公版名 且 includes 模糊 → 全體 includes 模糊取「長度最接近」。

**B：OM／network／AMS／跨夜** — 同 KV，多兩點：(0) `SnapshotManager.shouldProtectVisualState` 且 `layer.__resolvedAssetPath` 存在 → 先精準比對完整相對路徑；AMS 的 lookupProject 改「第一個非空且非 All」。

**B：LineOA／鏡面（strict 由 rules 註冊）** — `getAssetLookupScope`：templateFolder＝`resolveTemplateFolderName(templateId)`（經 TemplateIdentityAliases 對到實存 bucket）。files 順序：`templateFolder` → `<project>` → root → `共用素材` → **停止**（不跨資料夾、policy 的 crossProject 亦強制 false）。後續比對層同 KV；鏡面無蝦皮VIP 特例。找不到 → `recordAssetLoadDiagnostic`。

**URL fallback（無本機檔時，`./assets/...`）**
- 正式BN/暖身BN：`assets/<proj>/f` → `assets/<proj>/<template 自身 id>/f` →（product 或 `__allowCommonAssetFallback`）`assets/共用素材/f` → `assets/f`、`./f`、`assets/f`、`f`。
- KV/OM/network/AMS/跨夜：`assets/<proj>/f` → `assets/<proj>/<templates[activeIndex].name>/f` → `assets/共用素材/f` → root 四種。
- MS：同 KV 順序，但每個候選展開 6 種副檔名。
- LineOA/鏡面 strict：`assets/<templateFolder>/f` → `assets/<proj>/f` → `assets/f` → `assets/共用素材/f` 停止。

---

## 旗標總表

| 旗標 | 值域 | 正式BN | 暖身BN | KV | OM_w1/w2 | MS | LineOA | network | AMS | 鏡面 | 跨夜 | 影響像素 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `assets.lookupEngine` | assetLookup / flatFuzzy | assetLookup | assetLookup | flatFuzzy | flatFuzzy | assetLookup | flatFuzzy | flatFuzzy | flatFuzzy | flatFuzzy | flatFuzzy | 是（素材） |
| `assets.lookupProjectMode` | identityFolder / explicit / explicitFirstNonEmpty | identityFolder | identityFolder | explicit | explicit | identityFolder | explicit | explicit | explicitFirstNonEmpty | explicit | explicit | 是（素材） |
| `assets.assetLookup.commonFolder` | productOnly / always | productOnly | productOnly | – | – | always | – | – | – | – | – | 是（素材） |
| `assets.flatLookup.crossProjectFallback` | bool | false | false | true | true | false | true | true | true | true | true | 是（素材） |
| `assets.flatFuzzy.shopeeVipGuard` | bool | – | – | true | true | – | true | true | true | false | true | 是（素材） |
| `assets.flatFuzzy.snapshotPathFirst` | bool | – | – | false | true | – | true | true | true | true | true | 是（素材） |
| `assets.urlFallback.commonFolder` | productOnly / always | productOnly | productOnly | always | always | always | always | always | always | always | always | 是（素材） |
| `assets.urlFallback.templateSubfolderSource` | template / activeIndex | template | template | activeIndex | activeIndex | template | activeIndex | activeIndex | activeIndex | activeIndex | activeIndex | 是（素材） |
| `assets.urlFallback.extensionExpand` | bool | false | false | false | false | true | false | false | false | false | false | 是（素材） |
| `assets.templatePrefixVariants` | bool | false | false | false | false | true | false | false | false | false | false | 是（素材） |
| `assets.missingDiagnostics` | spec / templateList / batchDiagnosticsAlways / none | spec | spec | spec | spec | none | templateList | spec | spec | none | batchDiagnosticsAlways | 否 |
| `assets.waitFontsBeforeLoad` | bool | false | false | false | false | false | false | false | false | false | true | 是 |
| `assets.captureRenderModel` | bool | false | false | false | false | false | false | false | false | false | true | 否（互動） |
| `assets.afterUploadRefresh` | refreshThumbsKeepState / reapplyRecordsRegrid | keep | keep | reapply | reapply | keep | reapply | reapply | reapply | reapply | reapply | 是 |
| `templates.identityConflict` | excludeAll / keepAll | excludeAll | excludeAll | keepAll | keepAll | excludeAll | keepAll | keepAll | keepAll | keepAll | keepAll | 是 |
| `templates.snapshotRestore` | bool | false | false | false | true | false | true | true | true | true | true | 是 |
| `templates.prepareHook` | assetSpecEngine / none / ruleHook | assetSpecEngine | assetSpecEngine | assetSpecEngine | assetSpecEngine | none | assetSpecEngine | assetSpecEngine | assetSpecEngine | none | ruleHook | 是 |
| `templates.textBaselinePrepare` | bool | true | true | false | true | true | true | true | true | true | true | 是 |
| `templates.layerDefaults` | bool | false | false | false | false | false | false | false | true | false | false | 是 |
| `manualUpload.excludeLocked` | bool | – | – | – | – | – | – | false | true | – | false | 否 |
| `multiSizeSync.materialPredicate` | dynamicLogoSpec / anyAssetFilename | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | – | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | – | anyAssetFilename | 是（互動） |
| `assetReview.mode` | transactional / live / off | transactional | transactional | live | live | off | live | off | off | off | off | 是（互動） |
| `family.smartAssetEngine` | a / b / kv / none | a | a | kv | b | a(精簡) | b | b | b | none | b | 是 |
| `smartAsset.multiProductLink` | bool | true | false | – | – | (c) | – | – | – | – | – | 是 |
| `smartAsset.skipHiddenProduct` | bool | true | false | – | – | (c) | – | – | – | – | – | 是 |

需人工決定 (c)：
1. `loadTemplateFolder` 的 `TextBaselineModel.prepareTemplate` 只有 KV 不呼叫；統一 core 若對 KV 也執行會改文字基線（像素）。建議旗標 `templates.textBaselinePrepare`＝false 僅 KV，其餘 true。
2. `family.smartAssetEngine`：三實作不相容，是否維持三檔並存；MS 精簡版是否可由正式BN 版取代。
3. A 分支 `AssetLookup.match` 的 throw（歧義即中斷）vs. B 的 silent fallback——統一 core 必須維持各自行為，僅能以 `lookupEngine` 旗標分流，不建議互相靠近。
