# config/profiles — 工具設定檔（步驟 3 前置）

## 這是什麼
整合版只有一份 core，11 個原工具的行為差異全部變成「旗標」。每個工具一份 `<代號>.profile.js`，上傳工單後依 `sheetHints` 自動偵測分類 → 載入對應 profile → core 讀 `flags` 決定走哪條路。
`flags.registry.json` 是旗標登錄表（唯一真相）：每個旗標的型別、可選值、影響範圍（pixel／filename／folder／format／asset／ui／none）、白話說明與出處章節。

- 設定檔只放資料，不放程式：每個檔案是「一段 JSON 包一行 `window.__profileRegistry[key] = {...}`」的 `.js`（`index.js`／`_defaults.js`／`<代號>.profile.js`）。之所以不用 `.json`，是因為雙擊 index.html（file://）時瀏覽器不允許 fetch 本機檔案，但 `<script>` 可以；`core/profile-loader.js` 用 `<script>` 逐一載入。`flags.registry.json` 只給人和檢查腳本看，瀏覽器不載。
- **旗標分三層（步驟 4a，2026-09-15）**：`_defaults.js` 的 `defaults`（11 工具的多數值）→ `families.<family>`（同血緣共用值）→ 各 `<代號>.profile.js` 的 `flags`（**只放該工具與前兩層不同的旗標**）。`core/profile-loader.js` 的 `mergeFlagLayers` 依此順序合成完整 118 個旗標後才交給 core。要看某工具的完整旗標，把三層疊起來即可；要改「所有 B 系工具」的行為，改 `families.b` 一處。登錄表每個旗標多了 `default` 欄（＝defaults 層的值）。
- 對該工具不適用的旗標列在 `_inapplicable`；推不出來的列在 `_todo`（目前皆為空）。
- `family`：a＝正式BN／暖身BN／MS；b＝LineOA／network／AMS／鏡面／跨夜；ancestor＝KV／OM_w1／OM_w2（血緣見 docs/core-diff/00-總覽.md）。
- `rulesNamespace`：該工具規則檔的命名空間資料夾（正式BN／暖身BN 同名 family 必須隔離）。

## 已定決策如何反映
| 決策 | 反映方式 |
|---|---|
| 1 OM_w1／OM_w2 各自獨立 | 兩份 profile 都在；`rules.omWaveProfile`＝wave1／wave2 |
| 2 KV 維持舊行為 | `templates.textBaselinePrepare=false`、`render.textEngine=legacy`、`price.layerBaselineMode=none` 只在 KV |
| 3 智慧型物件三套並存 | `smartAsset.engine`＝a（正式BN/暖身BN/MS）／b／kv／none（鏡面） |
| 4 匯出路徑 A／B 都保留 | `export.renderPath`＝snapshot／activeSwitch（須與 `batch.previewMode` 一致） |
| 5 正式／暖身同名公版合一檔 | `templates.variant`＝formal／warmup／none；兩份 BN profile 各自存在，sheetHints 分別是「 BN 正式」「BN 暖身」 |
| 6 復原/重做採正式BN 版＋shim | 單一實作，**不設旗標**（原報告 `history.model`、`keyboard.ctrlYRedo` 已移除） |
| 7 session.json 多兩鍵 | 比對時忽略，**不設旗標**（原 `batch.routeMetaExtended` 已移除） |
| 8 手動縮放文字統一 applyTypographyScale | 單一實作，**不設旗標**（原 `text.scaleMode` 已移除） |
| 9 OM_w2 LineOA 檔名補後綴 | `export.dedupeOutputName=true` 僅 OM_w2 |

## 旗標數量
| | 數量 |
|---|---|
| 登錄前（五份報告旗標總表合計：02-batch 28、03-render 19、04-assets 25、05-export-ui 36、06-price-shared 16） | 124 |
| 移除：決策已定為單一實作（history.model、keyboard.ctrlYRedo、text.scaleMode、batch.routeMetaExtended） | −4 |
| 去重合併（同一行為不同名字）：assets.lookupEngine ⇐ batch.assetLookupMode；assets.shopeeVipGuard ⇐ batch.shopeeVipGuard＋assets.flatFuzzy.shopeeVipGuard；assets.roleClassify ⇐ batch.assetRoleClassify；templates.snapshotRestore ⇐ assets.flatFuzzy.snapshotPathFirst；templates.variant ⇐ warmupAnchorOrder＋placementPresetNamespace；ui.selectionBoxMode ⇐ hit.useSelectionBox；interaction.dropUpload ⇐ hit.uploadSlotMaskClip；interaction.linkSync ⇐ linkSync.enabled＋keyboard.linkSyncToggleKey（batch.assetRoleClassify 改名 assets.roleClassify，不減） | −7 |
| 拆分／新增：batch.thumbOptions 拆成 3 個 bool（+2）；新增 render.loadShapeRenderer（鏡面未載入 shape-renderer，03 §7）、export.dedupeOutputName（決策 9） | +4 |
| **登錄後** | **117** |
| 2026-09-15 回饋 1–3（export.transparentToPng、export.folderStrategy 新值、ui.selectionBoxMode 新值）等 | +3 |
| 2026-10-13 對齊 18節（layers.lockOnLoadPatterns、sync.assetLink、sync.productGroup、export.bundleSessionArchive、export.bundleDiagnostics） | +5 |
| **目前** | **125** |

## 群組一覽
| 群組 | 說明 | 旗標數 |
|---|---|---|
| `batch` | 工單解析、公版比對、套版順序、預覽管線（BatchManager） | 22 |
| `render` | 文字／形狀／圖片繪製、幾何、shape-renderer、product-engine | 17 |
| `assets` | 素材查找、URL fallback、上傳後刷新、缺件診斷 | 15 |
| `templates` | 公版 JSON 載入前處理、正式／暖身版型切換 | 6 |
| `export` | 輸出格式、檔名、資料夾、倍率、白底、壓縮、渲染路徑 | 22 |
| `price` | 價格層產生、雙字級、雙券、同步縮放 | 11 |
| `smartAsset` | 智慧型物件引擎選擇與群內差異 | 3 |
| `interaction` | 畫布互動：同步、拖檔上傳、雙擊換圖、鍵盤 | 7 |
| `text` | 文字編輯後的重排與快照 | 3 |
| `ui` | 只影響畫面／縮圖／選取，不影響輸出 | 11 |
| `rules` | 規則登錄器與 OM 模組版本 | 4 |
| `boot` | 啟動策略 | 1 |
| `layers` | 圖層預設（第一次出現就鎖定的樣式） | 1 |
| `sync` | 自 18節 移植的互動連動模組（同素材跨版位、商品組；single-size 的圖層清單） | 2 |

影響範圍分布：pixel 78、ui 15、asset 10、filename 8、format 5、folder 3、interaction 3、none 2、text 1。
（affects=pixel 且說明含「僅互動後」者，黃金樣本批次輸出不會覆蓋，需另補互動回歸案例。）

## 值矩陣（旗標 × 工具）
| 旗標 | 型別 | 影響 | 正式BN | 暖身BN | KV | OM_w1 | OM_w2 | MS | LineOA | network | AMS | 鏡面 | 跨夜 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `batch.assetSpecEngineFirst` | bool | pixel | true | true | true | true | true | false | true | true | true | false | false |
| `batch.matrixParser` | bool | pixel | true | true | true | true | true | true | true | true | true | false | true |
| `batch.genericRowParser` | bool | pixel | true | true | true | true | true | true | true | true | true | false | true |
| `batch.specialParserPolicy` | bool | pixel | true | true | false | false | false | false | false | false | false | false | false |
| `batch.sellerHeaderDetect` | bool | pixel | false | true | false | false | false | false | false | false | false | false | false |
| `batch.extraHeaderAliases` | enum | pixel | none | none | none | none | none | none | none | none | ams | none | none |
| `batch.extraFields` | enum | pixel | none | none | none | none | none | none | none | none | lineShoppingAms | none | none |
| `batch.recordContentMode` | enum | pixel | fields | fields | fields | fields | fields | fields | fields | fields | fields | anyField | fields |
| `batch.mergeFillMode` | enum | pixel | rect | rect | vertical | vertical | vertical | rect | vertical | vertical | vertical | vertical | vertical |
| `batch.numericDisplayValue` | bool | pixel | true | true | false | false | false | true | false | false | false | false | false |
| `batch.rowsFromZero` | bool | pixel | false | false | false | false | true | false | true | false | false | true | false |
| `batch.explicitTemplateIdRoute` | enum | pixel | omWave1 | omWave1 | omWave1 | omWave1 | omWave1 | none | omWave1 | generic | generic | blockFamily | generic |
| `batch.templateMatchMode` | enum | pixel | strict | strict | fuzzy | fuzzy | fuzzy | strict | fuzzy | fuzzy | fuzzy | fuzzy | fuzzy |
| `batch.fetchRouteTemplate` | bool | pixel | false | false | true | true | true | false | true | true | true | true | true |
| `batch.ctaMode` | enum | pixel | policy | policy | legacy | legacy | legacy | policy | legacy | legacy | legacy | legacy | legacy |
| `batch.coreSubtitleTextMap` | bool | pixel | false | false | false | false | false | true | false | false | false | false | false |
| `batch.smartAssetIdMode` | enum | pixel | grouped | grouped | plain | contextual | contextual | grouped | contextual | contextual | contextual | none | contextual |
| `batch.missingProductAssetMode` | enum | pixel | clear | clear | clear | clear | clear | manualUpload | clear | clear | clear | clear | clear |
| `batch.placementPreset` | bool | pixel | true | true | false | false | false | false | false | false | false | false | false |
| `batch.applyNonPriceTextStandard` | bool | pixel | true | true | false | false | false | true | false | false | false | false | false |
| `batch.smartAssetApplyPhase` | enum | pixel | beforeLayout | beforeLayout | beforeLayout | afterLayout | afterLayout | afterLayout | afterLayout | afterLayout | afterLayout | none | afterLayout |
| `batch.previewMode` | enum | pixel | snapshot | snapshot | mutating | mutatingGuarded | mutatingGuarded | snapshot | mutatingGuarded | mutatingGuarded | mutatingGuarded | mutatingGuardedNoSmart | mutatingGuarded |
| `render.appliesLayout` | bool | pixel | false | false | true | true | true | false | true | true | true | true | true |
| `render.textEngine` | enum | pixel | baselineModel | baselineModel | legacy | baselineModel | baselineModel | baselineModel | baselineModel | baselineModel | baselineModel | baselineModel | baselineModel |
| `render.autoLogoShadow` | bool | pixel | true | true | true | true | true | true | true | false | false | true | false |
| `render.shapeLegacyTriangleOverride` | bool | pixel | true | true | true | true | true | true | true | true | false | true | true |
| `render.maskScope` | enum | pixel | image | image | image | image | image | image | image | image | all | image | image |
| `render.useProductEngineSizing` | bool | pixel | true | true | true | true | true | true | true | true | true | false | true |
| `render.applyBoxSyncCenterForAllTypes` | bool | pixel | true | true | false | false | true | true | true | false | false | true | false |
| `render.applyBoxCoverSyncHeight` | bool | pixel | false | false | false | false | true | false | true | false | false | true | false |
| `render.applyBoxDdcardHeightRule` | bool | pixel | true | true | true | true | true | false | true | true | true | true | true |
| `render.loadShapeRenderer` | bool | pixel | true | true | true | true | true | true | true | true | true | false | true |
| `render.shapeFillEnabledMode` | enum | pixel | ignore | ignore | ignore | ignore | flag | ignore | flag | ignore | flagStrict | ignore | flagOrNoFill |
| `render.shapeRotationSource` | enum | pixel | transform | transform | transform | transform | transform | transform | transform | transform | corners | transform | transform |
| `render.shapePsdCornerRadii` | bool | pixel | false | false | false | false | false | false | false | false | true | false | false |
| `render.shapeCornerCurve` | enum | pixel | arcTo | arcTo | arcTo | arcTo | arcTo | arcTo | arcTo | arcTo | bezier | arcTo | arcTo |
| `render.shapeStrokeInset` | bool | pixel | false | false | false | false | false | false | false | false | false | false | true |
| `render.shapeBoxSource` | enum | pixel | bboxFirst | bboxFirst | bboxFirst | bboxFirst | bboxFirst | bboxFirst | bboxFirst | bboxFirst | bboxFirst | bboxFirst | pathBoundsFirstOverlap |
| `render.productSizingHeightPriority` | enum | pixel | explicit | explicit | legacy | legacy | explicit | explicit | explicit | legacy | legacy | explicit | legacy |
| `assets.lookupEngine` | enum | asset | assetLookup | assetLookup | flatFuzzy | flatFuzzy | flatFuzzy | assetLookup | flatFuzzyScoped | flatFuzzy | flatFuzzy | flatFuzzyScoped | flatFuzzy |
| `assets.lookupProjectMode` | enum | asset | identityFolder | identityFolder | explicit | explicit | explicit | identityFolder | explicit | explicit | explicitFirstNonEmpty | explicit | explicit |
| `assets.roleClassify` | bool | asset | true | true | true | true | true | false | true | true | true | true | true |
| `assets.shopeeVipGuard` | bool | asset | true | true | true | true | true | true | true | true | true | false | true |
| `assets.moduleCommonFolder` | enum | asset | productOnly | productOnly | always | always | always | always | always | always | always | always | always |
| `assets.crossProjectFallback` | bool | asset | false | false | true | true | true | false | true | true | true | true | true |
| `assets.urlCommonFolder` | enum | asset | productOnly | productOnly | always | always | always | always | always | always | always | always | always |
| `assets.urlTemplateSubfolderSource` | enum | asset | template | template | activeIndex | activeIndex | activeIndex | template | activeIndex | activeIndex | activeIndex | activeIndex | activeIndex |
| `assets.urlExtensionExpand` | bool | asset | false | false | false | false | false | true | false | false | false | false | false |
| `assets.templatePrefixVariants` | bool | asset | false | false | false | false | false | true | false | false | false | false | false |
| `assets.missingDiagnostics` | enum | ui | spec | spec | spec | spec | spec | none | templateList | spec | spec | templateListMarkMissing | batchDiagnosticsAlways |
| `assets.waitFontsBeforeLoad` | bool | pixel | false | false | false | false | false | false | false | false | false | false | true |
| `assets.captureRenderModel` | bool | pixel | false | false | false | false | false | false | false | false | false | false | true |
| `assets.afterUploadRefresh` | enum | pixel | refreshThumbsKeepState | refreshThumbsKeepState | reapplyRecordsRegrid | reapplyRecordsRegrid | reapplyRecordsRegrid | refreshThumbsKeepState | reapplyRecordsRegrid | reapplyRecordsRegrid | reapplyRecordsRegrid | reapplyRecordsRegrid | reapplyRecordsRegrid |
| `assets.multiSizeMaterialPredicate` | enum | pixel | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | dynamicLogoSpec | anyAssetFilename |
| `templates.variant` | enum | pixel | formal | warmup | none | none | none | none | none | none | none | none | none |
| `templates.identityConflict` | enum | pixel | excludeAll | excludeAll | keepAll | keepAll | keepAll | excludeAll | keepAll | keepAll | keepAll | keepAll | keepAll |
| `templates.snapshotRestore` | bool | pixel | false | false | false | true | true | false | true | true | true | true | true |
| `templates.prepareHook` | enum | pixel | assetSpecEngine | assetSpecEngine | assetSpecEngine | assetSpecEngine | assetSpecEngine | none | assetSpecEngine | assetSpecEngine | assetSpecEngine | none | ruleHook |
| `templates.textBaselinePrepare` | bool | pixel | true | true | false | true | true | true | true | true | true | true | true |
| `templates.layerDefaults` | bool | pixel | false | false | false | false | false | false | false | false | true | false | false |
| `export.zipPrefix` | string | filename | 25SaleTool | 18SaleTool | 18SaleTool | 25節生成工具 | 25節生成工具 | 25SaleTool | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節Tool_鏡面 | 25節生成工具 |
| `export.batchZipName` | enum | filename | specDrivenOrBatchTs | specDrivenOrBatchTs | specDrivenOrBatchTs | batchOutputTs | batchOutputTs | batchTs | batchOutputTs | batchOutputTs | batchOutputTs | prefixOutput | batchOutputTs |
| `export.autoLabel` | string | ui | 依工單規則 | 依工單規則 | 依工單規則 | 依工單規則 | 依工單規則 | 依工單規則 | 依工單規則 | 依工單規則 | 依工單規則 | 依工單規則 | 依工單規則 |
| `export.formatSource` | enum | format | exportCfgSpecTable | specTable | specTable | omMedia | omMedia | exportCfgSpecTable | outputFormatOmMedia | outputFormat | outputFormat | specFormat | outputFormat |
| `export.defaultFormat` | enum | format | jpg | jpg | jpg | jpg | jpg | jpg | jpg | jpg | jpg | png | jpg |
| `export.multiSizeForceJpg` | bool | format | true | true | true | false | false | false | false | false | false | false | false |
| `export.stemSource` | enum | filename | templateId | templateId | templateId | outputName | outputName | templateId | outputName | outputName | outputName | outputName | outputName |
| `export.multiOutputSizeSuffix` | bool | filename | true | true | false | false | false | false | false | false | false | false | false |
| `export.dedupeOutputName` | bool | filename | false | false | false | false | true | false | false | false | false | false | false |
| `export.folderStrategy` | enum | folder | sourceTemplate | sourceTemplate | specBanner | omMedia | omMedia | msArchiveExportCfgBanner | omMedia | rootFolder | rootFolder | project | rootFolder |
| `export.slices` | bool | filename | true | false | false | false | false | true | false | false | false | false | false |
| `export.scaleMode` | enum | pixel | multiSize2x | multiSize2x | multiSize2x | multiSize2x | multiSize2x | fixed4x | multiSize2x | multiSize2x | fixed4x | fixed4x | fixed4x |
| `export.whiteFill` | enum | pixel | multiSize | multiSize | multiSize | multiSize | multiSize | none | multiSize | multiSize | none | jpg | none |
| `export.compressMode` | enum | pixel | multiSize150k | multiSize150k | multiSize150k | multiSize150k | multiSize150k | none | multiSize150k | multiSize150k | none | kLimit | kLimit |
| `export.skipMissingAssets` | bool | filename | false | false | false | false | false | false | false | false | false | true | false |
| `export.diagnostics` | enum | filename | assetSpec | assetSpec | assetSpec | assetSpec | assetSpec | none | assetSpec | assetSpec | none | mirror | batchDiagnostics |
| `export.renderPath` | enum | pixel | snapshot | snapshot | activeSwitch | activeSwitch | activeSwitch | snapshot | activeSwitch | activeSwitch | activeSwitch | activeSwitch | activeSwitch |
| `export.jsonMode` | enum | format | raw | raw | raw | snapshot | snapshot | raw | snapshot | snapshot | snapshot | snapshot | snapshot |
| `price.typographyResolver` | bool | pixel | true | true | false | false | false | true | false | false | false | false | false |
| `price.doubleCouponAuto` | bool | pixel | true | true | false | false | false | true | false | false | false | false | false |
| `price.inheritAnchorRotation` | bool | pixel | true | true | false | false | false | true | false | false | false | false | false |
| `price.layerBaselineMode` | enum | pixel | source | source | none | capture | capture | source | capture | capture | capture | capture | capture |
| `price.specialCharRanges82` | bool | pixel | false | false | false | true | true | false | true | false | false | false | false |
| `price.fitBoxToInk` | bool | pixel | false | false | false | false | true | false | true | false | false | true | false |
| `price.syncSeparatePositionScale` | bool | pixel | true | true | false | false | true | true | true | false | false | true | false |
| `price.anchorBaseLineHeight` | bool | pixel | true | true | false | false | false | true | false | false | false | false | false |
| `price.normalizeDecimalPercent` | bool | pixel | true | false | false | false | false | true | false | false | false | false | false |
| `price.rebuildMemoryMode` | enum | pixel | productLayout | productLayout | text | textRanges | textRanges | productLayout | textRanges | textRanges | textRanges | textRanges | textRanges |
| `price.rotationHook` | bool | pixel | true | true | false | false | false | true | false | false | false | false | false |
| `smartAsset.engine` | enum | pixel | a | a | kv | b | b | a | b | b | b | none | b |
| `smartAsset.multiProductLink` | bool | pixel | true | false | false | false | false | true | false | false | false | false | false |
| `smartAsset.skipHiddenProduct` | bool | pixel | true | false | false | false | false | true | false | false | false | false | false |
| `interaction.syncMode` | enum | pixel | dispatch | dispatch | both | both | both | smartOnly | both | both | both | none | both |
| `interaction.markThumbStale` | bool | ui | true | false | false | false | false | true | false | false | false | false | false |
| `interaction.dropUpload` | enum | pixel | none | none | none | none | uploadSlot | manualProduct | uploadSlot | manualAssetUpload | manualAssetUpload | none | manualAssetUpload |
| `interaction.dblclickReplace` | enum | ui | assetSpec | assetSpec | assetSpec | assetSpec | assetSpec | none | assetSpec | assetSpec | assetSpec | none | uploadSlot |
| `interaction.replaceAssetImpl` | enum | pixel | a | a | legacy | legacy | legacy | none | legacy | manualAssetUpload | manualAssetUpload | none | manualAssetUpload |
| `interaction.deleteClearsUploadSlot` | bool | pixel | false | false | false | false | false | false | false | true | true | false | true |
| `interaction.linkSync` | bool | pixel | true | true | true | true | true | true | true | true | true | true | true |
| `text.afterEditHook` | enum | pixel | dynamicLayout | dynamicLayout | omWave1Subtitle | omWave1Subtitle | omWave1Subtitle | dynamicLayout | omWave1Subtitle | none | none | none | markManualTextEdited |
| `text.priceRecalcOnCommit` | enum | pixel | none | none | none | none | spTextCapture | none | spTextCapture | none | none | capture | none |
| `text.editSnapshot` | bool | ui | true | true | false | false | false | true | false | false | false | false | false |
| `ui.textToolbarMode` | enum | ui | managed | managed | plain | plain | plain | managed | plain | plain | plain | plain | plain |
| `ui.selectionBoxMode` | enum | ui | inkFitAll | inkFitAll | inkFitAll | inkFitAll | inkFitAll | inkFitAll | inkFitAll | inkFitAll | inkFitAll | inkFitAll | inkFitAll |
| `ui.rotateHandleAnchor` | enum | ui | topCenter | topRight | topRight | topRight | topCenter | topCenter | topCenter | topRight | topRight | topCenter | topRight |
| `ui.specOverlaySkip` | enum | ui | specDrivenAndMultiSize | specDrivenAndMultiSize | specDrivenAndMultiSize | specDrivenAndMultiSize | specDrivenAndMultiSize | none | specDrivenAndMultiSize | specDrivenAndMultiSize | specDrivenAndMultiSize | none | specDriven |
| `ui.thumbWhiteOnMultiSize` | bool | ui | true | true | true | true | true | false | true | true | true | false | false |
| `ui.thumbShowUploadPrompt` | bool | ui | false | false | false | false | true | false | true | false | false | false | false |
| `ui.thumbShowGuides` | bool | ui | true | true | true | true | true | true | true | true | true | false | true |
| `ui.manualUploadExcludeLocked` | bool | ui | false | false | false | false | false | false | false | false | true | false | false |
| `ui.assetReviewMode` | enum | pixel | transactional | transactional | live | live | live | off | live | off | off | off | off |
| `ui.hitLockedPassthrough` | bool | ui | true | true | false | false | false | true | true | false | false | true | false |
| `ui.toolName` | string | ui | 25節生成工具 | 25節生成工具 | 18節生成工具 | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節鏡面生成工具 | 25節生成工具_跨夜直播宣傳圖 |
| `rules.registryMode` | enum | pixel | strict | strict | merge | merge | merge | strictExact | merge | merge | merge | merge | merge |
| `rules.normalizeLegacy` | bool | pixel | false | false | true | false | false | false | false | false | false | false | false |
| `rules.omWaveProfile` | enum | pixel | none | none | none | wave1 | wave2 | none | none | none | none | none | none |
| `boot.abortOnRuleLoadFailure` | bool | none | true | true | false | false | false | true | false | false | false | false | false |
| `export.diagnosticsTitle` | string | text |  |  |  |  |  |  |  |  |  | 25節鏡面 |  |
| `rules.loadFailurePolicy` | enum | none | reject | reject | continue | reject | reject | reject | reject | reject | reject | reject | reject |
| `export.transparentToPng` | bool | format | true | true | true | true | true | true | true | true | true | true | true |
| `layers.lockOnLoadPatterns` | array | interaction | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] | ["*kv_bg*"] |
| `sync.assetLink` | bool | interaction | true | true | true | true | true | true | true | true | true | true | true |
| `sync.productGroup` | bool | interaction | true | true | true | true | true | true | true | true | true | true | true |
| `export.bundleSessionArchive` | bool | folder | true | true | true | true | true | true | true | true | true | true | true |
| `export.bundleDiagnostics` | bool | folder | true | true | true | true | true | true | true | true | true | true | true |

## _todo 清單
- **MS** `smartAsset.multiProductLink`：MS 精簡版 SAM 是否採正式BN 版行為（04-assets §10.1 (c)），需黃金樣本驗證後決定 true/false
- **MS** `smartAsset.skipHiddenProduct`：MS 精簡版 SAM 是否採正式BN 版行為（04-assets §10.1 (c)），需黃金樣本驗證後決定 true/false

## _inapplicable（不適用、填預設值）摘要
- **正式BN**：`assets.shopeeVipGuard`、`ui.manualUploadExcludeLocked`
- **暖身BN**：`assets.shopeeVipGuard`、`ui.manualUploadExcludeLocked`
- **KV**：`assets.moduleCommonFolder`、`smartAsset.multiProductLink`、`smartAsset.skipHiddenProduct`、`ui.manualUploadExcludeLocked`
- **OM_w1**：`assets.moduleCommonFolder`、`smartAsset.multiProductLink`、`smartAsset.skipHiddenProduct`、`ui.manualUploadExcludeLocked`
- **OM_w2**：`assets.moduleCommonFolder`、`smartAsset.multiProductLink`、`smartAsset.skipHiddenProduct`、`ui.manualUploadExcludeLocked`
- **MS**：`assets.shopeeVipGuard`、`assets.multiSizeMaterialPredicate`、`ui.manualUploadExcludeLocked`
- **LineOA**：`assets.moduleCommonFolder`、`smartAsset.multiProductLink`、`smartAsset.skipHiddenProduct`、`ui.manualUploadExcludeLocked`
- **network**：`assets.moduleCommonFolder`、`smartAsset.multiProductLink`、`smartAsset.skipHiddenProduct`
- **AMS**：`assets.moduleCommonFolder`、`smartAsset.multiProductLink`、`smartAsset.skipHiddenProduct`
- **鏡面**：`render.shapeFillEnabledMode`、`render.shapeRotationSource`、`render.shapePsdCornerRadii`、`render.shapeCornerCurve`、`render.shapeStrokeInset`、`render.shapeBoxSource`、`render.productSizingHeightPriority`、`assets.moduleCommonFolder`、`assets.multiSizeMaterialPredicate`、`smartAsset.multiProductLink`、`smartAsset.skipHiddenProduct`、`ui.manualUploadExcludeLocked`
- **跨夜**：`assets.moduleCommonFolder`、`smartAsset.multiProductLink`、`smartAsset.skipHiddenProduct`

## 其他待對齊（不是旗標，記錄用）
- `batch.previewMode` 與 `export.renderPath` 描述同一套架構（預覽 vs 匯出），設定時必須同為 snapshot 系或 mutating 系。
- 復原/重做：採正式BN 的 Transaction 模型，對 B 系提供 `attachExtra` 相容 shim（追加 before 快照）；undo 後縮圖刷新行為需人工確認（05-export-ui §7）。
- `templates.prepareHook` 同時管 loadTemplateFolder 與 fetchRouteTemplate 兩條載入路徑（00-總覽 §5-7）。
- 檔案由 session outputs 的 gen-profiles.js 產生；改旗標請改 JSON 本身（或重跑產生器後覆蓋）。
