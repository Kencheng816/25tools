# 步驟 2 差異報告：ExportManager / Interaction / Inspector / UI 模組 / index.html / style.css

範圍：ExportManager、Interaction、Inspector、LayerManager、TextEditor、HistoryManager、ManualOverrideManager、DynamicLayoutManager、LoadingOverlay、TemplateList、DOM、BatchDiagnostics、LinkSync、LinkSyncUI、markManualTextEdited、LayerDefaults、OUTPUT_NAME/TOOL_NAME、11 份 index.html、style.css、MS `core/work-order-export-planner.js`。
基準＝正式BN。分支：A（正式BN、暖身BN、MS）、B（LineOA、network、AMS、鏡面、跨夜）、祖先（KV、OM_w1、OM_w2）。
合併策略代號：(a) 直接取超集；(b) family 旗標；(c) 需人工決定。

---

## 1. ExportManager

| 方法 | 版本分布 | 差異內容（行為差異） | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| askImageFormat | 6 版：A=正式BN/暖身BN/KV；B=OM_w1/w2/LineOA；C=MS；D=network/AMS；E=鏡面；F=跨夜 | 只有 modal 文案不同（「依規格表／依媒體規則／依工單設定／依工單規則」及說明句）；三顆按鈕 data-format 皆 auto/png/jpg | 僅 UI | (b) `export.autoLabel`（文字表）：正式BN/暖身BN/KV/MS＝依規格表；OM/LineOA＝依媒體規則；network/AMS/跨夜＝依工單設定；鏡面＝依工單規則 |
| export（單張 zip 檔名） | A=正式BN/MS `25SaleTool_<id>_<ts>.zip`；B=暖身BN/KV `18SaleTool_…`；C=OM/LineOA/network/AMS/跨夜 `25節生成工具_<id>_<ts>.zip`；D=鏡面 `${OUTPUT_NAME}_<id>_<ts>.zip` | zip 檔名前綴不同 | 檔名（zip 外層，不影響 zip 內容） | (b) `export.zipPrefix`：正式BN/MS＝`25SaleTool`；暖身BN/KV＝`18SaleTool`；OM_w1/w2/LineOA/network/AMS/跨夜＝`25節生成工具`；鏡面＝`25節Tool_鏡面` |
| exportVisibleBatch（批次 zip 檔名） | A=正式BN：specDriven→`25節Tool_network_輸出.zip` 否則 `25SaleTool_batch_<ts>.zip`；B=暖身BN/KV 同邏輯但 `18…`；C/E=OM/LineOA/network/AMS/跨夜 `25節生成工具_批次輸出_<ts>.zip`；D=MS 固定 `25SaleTool_batch_<ts>.zip`（無 specDriven 分支）；F=鏡面 `${OUTPUT_NAME}_輸出.zip`（無時間戳） | 檔名規則 | 檔名 | (b) `export.batchZipName` 函式表，預設值如左；正式BN 保留 specDriven 分支 |
| getMaterialSpecTable / resolveSpecFormat | 只有 正式BN/暖身BN/KV/MS（A 系＋KV） | 解析 Excel「素材規格表」分頁 → 媒體+尺寸→jpg/png；查不到→jpg。其餘 7 工具無此方法 | 格式（jpg/png） | (a) 超集保留；由 `export.formatSource` 旗標決定是否呼叫（見 §2） |
| resolveBannerSubfolder | A=正式BN/暖身BN/KV/MS：regex `^(Template|UAC-Pmax-LineLAP)[_-]?(banner\d+)[_-]` → `Template/banner1`；B=OM_w1/w2/LineOA：以 `__layoutNo` 或檔名找 `bannerN` 只回 `banner1`（媒體層由 resolveArchiveMedia 決定）；network/AMS/鏡面/跨夜：無 | 資料夾 | 資料夾 | (b) `export.folderStrategy`（見 §2），兩種實作並存 |
| normalizeArchiveMediaName / resolveArchiveMedia | 只有 OM_w1/w2/LineOA | 寫死媒體名正規化：Template/Appier/Rtbhouse/UAC_Pmax_LineLAP/DPA Frame_MAU；來源 `__media` → project → 檔名前綴 | 資料夾 | (a) 保留，僅 `folderStrategy='omMedia'` 時使用 |
| resolveArchiveFolder | A=OM_w1/w2/LineOA：`媒體/bannerN`；B=network/AMS/跨夜：`sanitize(__outputRoot)/sanitize(__outputFolder)`，皆空則 `project` | 資料夾 | 資料夾 | (b) 同 `export.folderStrategy` |
| resolveRecommendedFormat | A=OM_w1/w2：media==='DPA Frame_MAU'→png 否則 jpg；B=LineOA：先看 `__outputFormat`（png/jpg/jpeg）再走 A 規則；C=network/AMS/跨夜：`__outputFormat==='png'`→png 否則 jpg | 格式 | 格式 | (b) `export.formatSource`（見 §2） |
| sanitizeFolderSegment | network/AMS/跨夜 | `[\\/:*?"<>|]`→`_` | 資料夾 | (a) |
| resolveTemplateFormat | 鏡面 | png/jpg 手動覆蓋；auto 時 `__specFormat`==='jpg'→jpg **否則 png**（預設 PNG，與其他工具預設 JPG 相反） | 格式 | (b) `export.formatSource='specFormat'`＋`export.defaultFormat`：鏡面＝png，其餘＝jpg |
| findMissingVisibleAssets | 鏡面 | 可見 image 圖層有 assetFilename 但 `__assetMissing` 或 images 缺 → 該張**不輸出**，寫入診斷報告 | 輸出張數 | (b) `export.skipMissingAssets`：鏡面＝true，其餘＝false |
| buildZip（9 版） | 詳見 §2 | 主要分歧：①渲染路徑（A：`clone(item.data)` 唯讀快照＋`loadImagesForTemplate` ＋ `renderSceneTo(ctx,t,images,{showMissing:false,showGuides:false})`；B/祖先：切換 `AppState.activeIndex/template`，呼叫 `BatchManager.refreshTemplateFromBatchRecord`，`loadImagesForActiveTemplate`，`renderSceneTo(ctx)`，結束後還原並 `App.sync()`；KV 的 renderSceneTo 內還會跑 `PriceTransformEngine.syncTemplate`＋`LayoutRuleEngine.apply`）；②scale：正式BN/暖身BN/KV/OM/LineOA/network＝`__multiSizeSync`？min(exportScale,2)：exportScale(4)；MS/AMS/鏡面/跨夜＝一律 exportScale(4)；③白底：A/祖先/network 在 `__multiSizeSync` 時先填白；鏡面在 jpg 時填白（且 ctx alpha:false）；MS/AMS/跨夜 不填；④150KB 壓縮：正式BN/暖身BN/KV/OM/LineOA/network 對 `__multiSizeSync` 項 ≥150000 bytes 二分搜尋 q∈[0,1] 12 次；MS/AMS 無；鏡面/跨夜 改用 `compressCanvasToLimit(__kLimitBytes)`；⑤multiOutput 尺寸後綴：僅正式BN/暖身BN（`sheetTemplateRoute.multiOutput===true` 且檔名無尺寸→追加 `_WxH`）；⑥exportConfig（folder/perItemSubfolder/slices）：正式BN/MS；⑦MS 上蓋→下蓋歸檔（WorkOrderExportArchivePlanner）；⑧診斷報告（見下列）；⑨檔名 stem：A=`templateId||item.name`；B/祖先=`__outputName||templateId||item.name`；⑩KV/OM/LineOA/network/AMS/跨夜 toBlob 失敗 alert 文案略異 | 像素／檔名／資料夾／格式 全都受影響 | (c)＋(b)：渲染路徑差異需人工確認 `refreshTemplateFromBatchRecord`＋`syncTemplate/LayoutRuleEngine.apply` 對 B/祖先是否為像素必要（黃金樣本比對決定）；其餘拆成 §4 旗標 |
| canvasToBlob | A=10 工具；B=跨夜（多註解）；AMS 無（buildZip 內 inline toBlob） | 邏輯相同 | 無 | (a) |
| compressCanvasToLimit | A=鏡面；B=跨夜 | 相同演算法：PNG 無損不壓、超限只警告；JPG 若 >kLimit 在 q∈[0.92,1] 二分 12 次，壓不到→ok:false（該張**不輸出**）。跨夜多 `strategy/warning` 欄位並寫 BatchDiagnostics.addExportNote | 像素（JPG 品質）、輸出張數 | (b) `export.compressMode`：鏡面/跨夜＝`kLimit`；正式BN/暖身BN/KV/OM/LineOA/network＝`multiSize150k`；MS/AMS＝`none` |
| formatBytes | 鏡面（ExportManager 內）；跨夜（BatchDiagnostics 內，格式不同：<1000→`B`；否則 1 位小數 KB） | 只影響診斷報告文字 | 診斷報告 txt 內容 | (b) 隨 `export.diagnostics` 選實作 |
| buildDiagnosticText / 診斷報告 | 正式BN/暖身BN/KV/OM/LineOA/network：`specDriven && AssetSpecEngine` 時附 `[__outputRoot/]診斷報告.txt`（AssetSpecEngine.diagnosticText）；跨夜：`batchMode` 時一律附 `[__outputRoot/]診斷報告.txt`（BatchDiagnostics.text）；鏡面：**一律**附根目錄 `診斷報告.txt`（自有 buildDiagnosticText，含 TOOL_NAME、時間）；MS/AMS：不附 | zip 內多一檔、內容 | (b) `export.diagnostics`：正式BN/暖身BN/KV/OM_w1/w2/LineOA/network＝`assetSpec`；跨夜＝`batchDiagnostics`；鏡面＝`mirror`；MS/AMS＝`none` |
| exportJSON | A=正式BN/暖身BN/KV/MS：`JSON.stringify(AppState.template)`；B=其餘 7 工具：先 `TextEditor.commit()`，輸出 `SnapshotManager.createSnapshot(t)`，MIME 加 charset | JSON 檔內容 | 僅 JSON 側檔（非圖片） | (b) `export.jsonMode`：A 系＋KV＝`raw`；其餘＝`snapshot` |
| createZip / downloadBlob | 11 版相同 | — | 無 | (a) |

---

## 2. 輸出格式與檔名決策（buildZip 對照）

### 2.1 格式決策順序（format==='auto' 時；png/jpg 一律強制全體）

| 工具 | 決策順序 |
|---|---|
| 正式BN | `__multiSizeSync`→jpg ▸ `exportConfig.format`（依 ruleFamily 反查 TemplateRuleRegistry） ▸ `resolveSpecFormat(__media||project, WxH)`（素材規格表） ▸ jpg |
| 暖身BN、KV | `__multiSizeSync`→jpg ▸ `resolveSpecFormat` ▸ jpg（無 exportConfig） |
| MS | `exportConfig.format` ▸ `resolveSpecFormat` ▸ jpg（無 multiSizeSync） |
| OM_w1、OM_w2 | `resolveArchiveMedia`==='DPA Frame_MAU'→png ▸ jpg |
| LineOA | `__outputFormat`(png/jpg/jpeg) ▸ DPA Frame_MAU→png ▸ jpg |
| network、AMS、跨夜 | `__outputFormat==='png'`→png ▸ jpg |
| 鏡面 | `__specFormat`==='jpg'/'jpeg'→jpg ▸ **png** |

### 2.2 檔名 stem

| 工具 | stem |
|---|---|
| 正式BN、暖身BN | `templateId||item.name` 去副檔名；`sheetTemplateRoute.multiOutput===true` 且未含 `WxH` → 追加 `_WxH` |
| KV、MS | `templateId||item.name`（MS 在歸檔群組內改為 planner 的 `NN_來源公版名`） |
| OM_w1/w2、LineOA、network、AMS、跨夜 | `__outputName||templateId||item.name` |
| 鏡面 | `__outputName||templateId||item.name||'image'` |

### 2.3 資料夾決策

| 工具 | 路徑 |
|---|---|
| 正式BN | ①`exportCfg.folder` 有值 → `folder[/stem]/stem.ext`＋`slices` 切圖 `stem_suffix.ext`；②否則 specItem → `__outputRoot/__outputFolder||'未分類'/file`；③否則 `dedupedProject/Template|UAC-Pmax-LineLAP/bannerN/file`（project 與 banner 第一段同名時去重） |
| 暖身BN、KV | 同正式BN 的 ②③（無 exportConfig） |
| MS | ①`WorkOrderExportArchivePlanner.build(全部 templates)`（僅 auto）：`__sourceTemplateName` 以「上蓋_X」開群組 `NN_X`，到第一個「下蓋_」結束；群組內 `NN_來源名.ext`；有 slices 亦切；②否則 `exportCfg.folder` 邏輯；③否則 `dedupedProject/banner/file`（無 spec 分支） |
| OM_w1/w2、LineOA | `normalizeArchiveMediaName(__media||project||檔名前綴)/bannerN(__layoutNo 或檔名)/file` |
| network、AMS、跨夜 | `sanitize(__outputRoot)/sanitize(__outputFolder)/file`；皆空 → `sanitize(project)/file` |
| 鏡面 | `project/file`（無 root/folder） |

### 2.4 像素相關參數

| 項目 | 正式BN/暖身BN/KV/OM/LineOA/network | MS/AMS | 鏡面 | 跨夜 |
|---|---|---|---|---|
| supersample scale | `__multiSizeSync`? min(4,2) : 4 | 4 | 4 | 4 |
| 白底 | `__multiSizeSync` 時填白 | 不填 | jpg 時填白（ctx alpha:false） | 不填 |
| 壓縮 | `__multiSizeSync` 且 ≥150000B → q∈[0,1] 二分 | 無 | `__kLimitBytes` → q∈[0.92,1]；失敗不輸出 | 同鏡面＋匯出備註 |
| 渲染來源 | 正式BN/暖身BN：`clone(item.data)` 唯讀；KV/OM/LineOA/network：切 AppState＋refreshTemplateFromBatchRecord | MS：clone 唯讀；AMS：切 AppState | 切 AppState | 切 AppState |

---

## 3. Interaction

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| isSmartAssetLayer / beginSync / updateSync / finishSync / finalizeActiveTransform | 只有 正式BN/暖身BN/MS | 統一把變形事件分派給 SmartAssetManager（智慧素材）或 AssetSyncHub（其他）；MS 版不呼叫 AssetSyncHub；正式BN/MS finishSync 額外 `markActiveThumbStale`（暖身BN 無）。KV/OM/LineOA/network/AMS/跨夜：在各處直接同時呼叫 `SmartAssetManager.*MainCanvasTransform` 與 `AssetSyncHub.*`；鏡面：兩者皆無 | 僅 UI／同步（但同步會改其他版位資料 → 間接影響其他張輸出） | (b) `interaction.syncMode`：正式BN/暖身BN＝`dispatch`；MS＝`smartOnly`；KV/OM_w1/w2/LineOA/network/AMS/跨夜＝`both`；鏡面＝`none`；`interaction.markThumbStale`：正式BN/MS＝true，其餘 9 工具＝false（OM_w2/LineOA 僅在上傳槽套用後標記，屬 dropUpload 路徑） |
| bindCanvas | A=正式BN/暖身BN/KV/OM_w1/鏡面；B=OM_w2/LineOA（＋dragover/drop→上傳槽）；C=MS（＋dragover/drop→手動商品上傳）；D=network/AMS/跨夜（`ManualAssetUpload.bindDropZone`） | 拖曳上傳綁定方式三種 | UI | (b) `interaction.dropUpload`：正式BN/暖身BN/KV/OM_w1/鏡面＝`none`；OM_w2/LineOA＝`uploadSlot`；MS＝`manualProduct`；network/AMS/跨夜＝`manualAssetUpload` |
| onMouseMove | A=10 工具；B=MS（懸停在手動上傳佔位時 cursor=pointer） | UI | UI | (a)（受 `dropUpload==='manualProduct'` 守衛） |
| onMouseDown | 6 版：正式BN/暖身BN 呼叫 beginSync、resizeStart 帶 `typography`；KV/OM_w1 直接呼叫 Smart+Hub；OM_w2/LineOA ＋單擊空上傳槽開檔案；MS ＋單擊手動上傳佔位；network/AMS/跨夜 ＋單擊 `ManualAssetUpload.isUploadSlot && __assetMissing` 開檔案；鏡面 無同步 | UI | (b) 同 `interaction.syncMode`＋`interaction.dropUpload` |
| onMouseUp | A=正式BN/暖身BN/MS 走 finalizeActiveTransform；B=其餘 inline 同邏輯；鏡面無同步呼叫 | UI | (a) 以 finalizeActiveTransform 為主，內部依 syncMode 分派 |
| resizeSelectedByWheel | A=正式BN/暖身BN/MS：`PriceTransformEngine.applyTypographyScale`＋`ManualOverrideManager.mark`；B=KV：直接改 fontSizePx/Pt/lineHeight(×1.08)；C=OM/LineOA：同 KV ＋ `SPTextStandard.applyPriceTextLayer`；D=network/AMS/跨夜：同 KV；E=鏡面：同 KV 無同步 | **文字圖層字級計算方式不同 → 影響像素**（若使用者滾輪縮放文字） | (b) `text.scaleMode`：正式BN/暖身BN/MS＝`typographyEngine`；KV/network/AMS/跨夜/鏡面＝`legacyFontSize`；OM_w1/w2/LineOA＝`legacyFontSize+spTextStandard` |
| moveSelected | 5 版：同上字級差異（拖角把手縮放文字）；正式BN/暖身BN/MS 多 `PriceTransformEngine.handleLayerRotationApplied`（旋轉） | 像素（互動後） | (b) 同 `text.scaleMode`；`price.rotationHook`：A 系＝true，其餘＝false |
| onDoubleClick | A=9 工具：文字→TextEditor；image 且 `__assetSpec`→replaceSpecDrivenImage；B=MS/鏡面：只有文字；C=跨夜：image 且 `ManualAssetUpload.isUploadSlot`→`ManualAssetUpload.pickFile` | UI | (b) `interaction.dblclickReplace`：正式BN/暖身BN/KV/OM/LineOA/network/AMS＝`assetSpec`；跨夜＝`uploadSlot`；MS/鏡面＝`none` |
| replaceSpecDrivenImage | A=正式BN/暖身BN：多版位同步替換＋`HistoryManager.pushSnapshot/attachExtra`、`fitMode` 只在缺值時補 contain、`refreshPreviewIndexes(affected)`；B=KV/OM/LineOA：無 history 快照、`fitMode='contain'` 強制、`renderPreviewGrid`；C=network/AMS：改呼叫 `ManualAssetUpload.pickFile` | 手動換圖後 fitMode 差異會影響像素 | (b) `interaction.replaceAssetImpl`：正式BN/暖身BN＝`A`；KV/OM_w1/w2/LineOA＝`legacy`；network/AMS/跨夜＝`manualAssetUpload` |
| bindKeyboard | A=正式BN/暖身BN/MS：Ctrl+Z/Shift+Z、**Ctrl+Y redo**、Delete/Backspace 明確 no-op、方向鍵移動＋`ManualOverrideManager.mark`；B=KV/OM/LineOA：無 Ctrl+Y、Delete 無處理（等同 no-op）；C=network/AMS：Delete/Backspace 清除上傳槽素材（`ManualAssetUpload.canClear/clearAsset`）；D=鏡面：同 B 無同步；E=跨夜：同 C ＋ 純 `D` 鍵切換 `LinkSyncUI.toggle()` | Delete 會清素材 → 影響該張輸出；其餘 UI | (b) `keyboard.deleteClearsUploadSlot`：network/AMS/跨夜＝true，其餘＝false；`keyboard.ctrlYRedo`：A 系＝true，其餘＝false（建議統一 true，無害）；`keyboard.linkSyncToggleKey`：跨夜＝'d'，其餘＝null |
| onCanvasDragOver/onCanvasDrop/openUploadSlotPicker/applyUploadSlotFile | OM_w2/LineOA | 上傳槽：依 `__maskLayerName`（預設「載入BN範圖」）對齊遮罩框，`sizingMode='coverByPBox'`；LineOA 多 `__uploadSizingMode` 覆蓋與 `onUploadSlotAssetApplied` rule hook | 像素（上傳後） | (a) 保留 LineOA 版（超集，OM_w2 未設 `__uploadSizingMode` 時行為相同） |
| isManualUploadPlaceholder/isImageFile/applyManualProductUpload/openManualUploadPicker/onCanvasFileDrop | MS | 手動商品上傳：建立 `__manual_upload_*` bucket、設 role=product、產生 smartAssetId | 像素（上傳後） | (a) 保留，`dropUpload==='manualProduct'` 時啟用 |
| replaceUploadSlotImage | 跨夜 | 轉呼叫 ManualAssetUpload.pickFile | UI | (a) |

## 4. Inspector

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| render | A=10 工具；B=MS 僅註解不同 | 無 | 無 | (a) |
| applyBoxFromInputs | 6 版：正式BN/暖身BN/MS：無變更早退、`push('inspector-box')`、`Interaction.beginSync`、`ManualOverrideManager.mark`、文字寬度變→`applyTypographyScale`；KV：只 AssetSyncHub＋applyBox；OM_w1：＋Smart 同步、auto_price_v2 寬變→legacy 字級換算＋`SPTextStandard.applyPriceTextLayer`；OM_w2/LineOA：＋寬不變時 `captureManualPriceTransform`；network/AMS/跨夜：同 OM_w2 無 SPTextStandard；鏡面：同 network 無同步 | 像素（互動後價格字級） | (b) 同 `text.scaleMode`＋`interaction.syncMode` |
| applyTextFromInputs | 5 版：正式BN/暖身BN/MS：changed 檢查、`pushCoalesced`、`setTypographyFontSize`、`ManualOverrideManager.mark`、文字變→`DynamicLayoutManager.refreshForText`；KV/OM_w1/w2/LineOA：舊寫法（fontSizePt、lineHeight ×1.08 fallback），變更後 `OMWave1SubtitleLayout.refresh`（OM/KV 才有此全域，KV/LineOA 為 no-op），OM 系 ＋SPTextStandard；network/AMS/鏡面：同 KV 無 OMWave1；跨夜：＋`markManualTextEdited` | 像素（Inspector 改字後 layout） | (b) `text.afterEditHook`：正式BN/暖身BN/MS＝`dynamicLayout`；KV/OM_w1/w2/LineOA＝`omWave1Subtitle`；跨夜＝`markManualTextEdited`；network/AMS/鏡面＝`none` |

## 5. LayerManager

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| render / select / toggleVisible / toggleLock | A=10 工具（`__nonInteractive` 圖層 disabled）；B=鏡面（無 `__nonInteractive` 判斷） | UI | UI | (a) 超集（鏡面無此旗標圖層，行為不變） |
| hitTest | 6 版：正式BN：`getSelectionBox`、排除 `locked`、P_範圍參考線面積比較；暖身BN：同但 `getLayerBox`；KV/OM_w1/network/AMS/跨夜：`getLayerBox`、**不排除 locked**、面積比較；OM_w2：＋上傳槽只在遮罩內命中；LineOA：＋`locked` 穿透；鏡面：無面積比較、locked 穿透 | UI（選取） | (b) `hit.useSelectionBox`：正式BN＝true，其餘 false；`hit.lockedPassthrough`：正式BN/暖身BN/LineOA/鏡面＝true，KV/OM_w1/w2/network/AMS/跨夜/MS＝(MS 同正式BN true)、其餘 false；`hit.uploadSlotMaskClip`：OM_w2/LineOA＝true |
| hitHandle | A=正式BN/MS（selectionBox、locked→null）；B=暖身BN（layerBox、locked→null）；C=其餘（layerBox、不檢查 locked） | UI | (b) 同 `hit.useSelectionBox`／`hit.lockedPassthrough` |
| hitUploadSlot | OM_w2/LineOA | 依遮罩框命中上傳槽 | UI | (a) |

## 6. TextEditor

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| open | A=正式BN/暖身BN/MS：locked 不可編輯、切換編輯時先 commit、保存 `editingOriginalSnapshot/Index`；B=其餘 8 工具：無 snapshot（樣式設定展開寫法相同） | UI | (b) `text.editSnapshot`：A 系＝true，其餘 false |
| syncFromEditor | A=A 系：`DynamicLayoutManager.refreshForText`；B=KV/OM/LineOA：`OMWave1SubtitleLayout.refresh`；C=network/AMS/鏡面/跨夜：無 hook | 像素（編輯中即時 layout） | (b) 同 `text.afterEditHook` |
| commit | 6 版：A 系：以 `pushSnapshot(editingOriginalSnapshot)` 記錄「編輯前」、無變更時還原快照、refreshForText；KV/OM_w1：`push()`＋`SmartAssetManager.syncPriceTextFromMainCanvas`＋OMWave1 refresh；OM_w2/LineOA：＋auto_price_v2 → SPTextStandard＋captureManualPriceTransform；network/AMS：同 KV 無 OMWave1；鏡面：無 Smart 同步、auto_price_v2→captureManualPriceTransform；跨夜：同 network ＋markManualTextEdited | 像素（改字後價格外框/baseline） | (b) `text.afterEditHook`＋`text.priceRecalcOnCommit`：OM_w2/LineOA＝`spTextStandard+capture`；鏡面＝`capture`；其餘＝none |
| cancel | A 系：還原整份 snapshot；其餘：只還原 `layer.text` | UI | (b) 同 `text.editSnapshot` |
| _finishUi | A 系 | 共用收尾 | 無 | (a) |

## 7. HistoryManager（A vs B）

| 方法 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| 整體結構 | A=正式BN/暖身BN/MS：Transaction 模型 `{id,label,before[],after[],smartAssetBefore/After}`，`_snapshot/_capture/_restore`，restore 後 `loadImagesForActiveTemplate`＋`App.sync`＋`refreshPreviewIndexes(changed)`；B=KV/OM_w1/w2/LineOA/network/AMS/跨夜：`history[]` 存整份 template clone，`historyExtras/futureExtras` 並列陣列＋`swapExtra`，undo/redo 後 `App.sync`＋`renderPreviewGrid()`；C=鏡面：純 clone 陣列無 extras | UI（復原狀態），但 undo 後結果會進輸出 | (c)：A 版功能為超集（label、coalesce、多版位原子交易、smart-asset session），但 API 不同（`push()` 無參數相容；`attachExtra` 語意不同：A 為追加 before 快照到最後 tx，B 為覆寫最後一筆 extras）。建議統一採 A 版，並提供 B 相容 shim：`attachExtra(snapshot)` 在 B 模式下 → `tx.before` 追加；undo 後 `renderPreviewGrid` vs `refreshPreviewIndexes` 需人工確認縮圖行為 |
| push | A：`push(label, beforeSnapshot, index)` 上限 80，切斷 future；B：`push()` 上限 80；鏡面：同 B | 無 | (a) A 版相容 |
| pushCoalesced / pushSnapshot / attachSmartAssetState / clear | 只有 A 系 | — | 無 | (a) |
| swapExtra | 只有 B 系（非鏡面） | — | 無 | 以 A 版 `_restore` 取代 |

## 8. 其餘小模組

| 模組 | 版本分布 | 差異內容 | 影響輸出？ | 合併策略 |
|---|---|---|---|---|
| ManualOverrideManager | A=正式BN/暖身BN（mark/clearLayer/clearTemplate/isManual）；B=MS（只有 mark）；其餘 8 工具無 | 記錄手動覆寫屬性，供 DynamicLayoutManager 保護 | 間接像素（防止 rule 覆寫手動值） | (a) 超集；其他工具無呼叫點 |
| DynamicLayoutManager | 正式BN/暖身BN/MS 三份完全相同 | refreshForText：保護手動值→`SPTextStandard.applyNonPriceTextLayer`→rules.onTextChanged→`applyTemplateNonPriceText` | 像素（改字後） | (a)；由 `text.afterEditHook='dynamicLayout'` 啟用 |
| LoadingOverlay | A=10 工具（含 ensureStartup/showStartup/updateStartup/finishStartup/hideStartup，但 updateStartup 第一行 `return`，show/finish 為空函式 → 實際 no-op）；B=MS 無 startup 系列 | 無實際行為差異 | UI | (a) |
| TemplateList | A=正式BN/暖身BN/MS：select 時先 `TextEditor.commit`、`finalizeActiveTransform`、`selectionRevision` 競態保護、`loadImagesForTemplate(..., {project})`；B=其餘 8：直接 `loadImagesForActiveTemplate` | UI（切換公版競態） | (a) 取 A 版（超集、行為更安全） |
| DOM | 11 份相同 | — | 無 | (a) |
| BatchDiagnostics | 跨夜 | `__baseWarnings/__assetWarnings/__exportNotes`、`text()` 產生診斷報告 | 診斷報告內容 | (a)；`export.diagnostics='batchDiagnostics'` 時使用 |
| LinkSync / LinkSyncUI | 跨夜 | 單一公版跨版位連動雙向斷開（`#linkSyncToggle`、D 鍵） | 間接像素（斷開後其他張不被同步） | (b) `linkSync.enabled`：跨夜＝true，其餘 false（false 時 `isEnabled` 恆 true） |
| markManualTextEdited | 跨夜 | 設 `__manualTextEdited`，觸發 `afterManualTextMetricsChanged` hook | 像素（規則重算） | (a)；由 `text.afterEditHook='markManualTextEdited'` 啟用 |
| LayerDefaults | AMS | `configure({lockOnLoad})`→載入時鎖定圖層 | UI（鎖定；不影響像素） | (a)；預設 lockOnLoad→false 對其他工具無副作用 |
| OUTPUT_NAME / TOOL_NAME | 鏡面 | `'25節Tool_鏡面'` / `'25節鏡面'`，用於 zip 檔名與診斷報告標題 | 檔名／診斷報告 | (b) 併入 `export.zipPrefix`、`tool.name` 表 |

## 9. MS `core/work-order-export-planner.js`

僅 MS 載入（index.html 於 `app.core.js` 之前）。`WorkOrderExportArchivePlanner.build(entries)`：依工單順序，遇「上蓋_X」（且無活動群組）開新群組 `NN_X`；群組內每項 `NN_來源公版名`；遇「下蓋_」結束群組；群組未結束前再遇上蓋不另開；未在群組內的項目 `grouped:false`。來源名順序：`data.batchSourceName → batchRecord.__sourceTemplateName → sheetTemplateRoute.sourceTemplateId → sourceTemplateId → item.name → templateId`，去 `.json/.template.json`。只在 `format==='auto'` 時生效，以「全部 templates」規劃，故取消勾選不改編號。
合併策略：(a) 檔案原樣併入 core 目錄；buildZip 以 `export.folderStrategy==='msArchive'` 守衛，`window.WorkOrderExportArchivePlanner` 不存在時 plan 為空陣列（與 MS 現況 `?.build?.() || []` 相同）。

---

## 10. index.html / style.css 差異摘要

### index.html（9 版；正式BN＝暖身BN，OM_w1＝OM_w2）
- **DOM id**：11 份共同 id 集合完全一致，唯一差異＝`#linkSyncToggle`（只在跨夜，位於批次工具列 `<label>…連動</label>`）。統一版可保留此 checkbox，由 `linkSync.enabled` 控制顯示。
- 文字差異：`<title>`／`.brand-title`：正式BN/暖身BN/OM/LineOA/network/AMS＝「25節生成工具」；KV＝「18節生成工具」；跨夜＝「25節生成工具_跨夜直播宣傳圖」；鏡面＝「25節鏡面生成工具」；MS 同正式BN。`#exportJsonBtn` 文字：KV/正式BN/暖身BN/MS/network/AMS/跨夜＝「輸出 JSON」，OM/LineOA/鏡面＝「輸出完整 JSON」。`#activeTemplateName` 初值：MS/鏡面＝「尚未載入」，其餘＝「DDcard」（啟動後即被覆寫）。
- `<link rel="stylesheet" href="smart-assets/smart-asset-editor.css">`：只在 OM_w1/w2/LineOA。
- **script 載入順序**（皆在 body 末）：
  - 正式BN/暖身BN/OM_w1/w2/LineOA：jszip → xlsx → `rules/rules.manifest.js` → `config/template-routing.js`（正式BN/暖身BN 在 loader 前；OM/LineOA 在 loader 後；MS/鏡面無此檔） → `rules/template-rules.loader.js` → `core/product-engine.js` → `renderers/shape-renderer.js` → `core/app.core.js` → `smart-assets/product-shadow.engine.js` → `smart-assets/smart-asset-manager.js` → `modules/asset-review-modal.js` → `modules/single-size-asset-sync.js` → `modules/multi-size-asset-sync.js`
  - MS：manifest → loader → product-engine → shape-renderer → **`core/work-order-export-planner.js`** → app.core → product-shadow → smart-asset-manager（無 modules/、無 template-routing）
  - KV：`rules/xxx_rules.js` → loader → template-routing → `rules/shared/template-rule-utils.js` → `rules/Example_Template_rules.js` → `rules/shared/sp-text-standard.js` → `rules/shared/kv-festival-hexagon.js` → `rules/25節KV_商城狂購節_rules.js` → product-engine → shape-renderer → app.core → smart-assets ×2 → modules ×3（規則檔**手動列出、在 core 之前**）
  - network/AMS/跨夜：`rules/xxx_rules.js` → loader → template-routing → template-rule-utils → product-engine → shape-renderer → app.core → smart-assets ×2 → `modules/multi-size-asset-sync.js`（無 asset-review-modal、single-size）→ **規則檔在 app.core 之後**（network：`network-affiliate_rules.js`；跨夜：`crossnight-live-promo_rules.js`；AMS：`shared/line-shopping-ams.js` ＋ 9 支版位 rules ＋ Example）
  - 鏡面：jszip → xlsx → manifest → loader → `core/app.core.js`（**無 product-engine、shape-renderer、smart-assets、modules**）
  - 注意：規則檔「core 之前（KV）」vs「core 之後（network/AMS/跨夜）」兩種順序並存，統一 core 需同時支援（loader 等待註冊完成再 boot 的機制已存在於 TemplateLoader.boot）。

### style.css（4 版）
- 基底版（正式BN/暖身BN/KV/OM_w1/w2/LineOA，507 行）。
- network/AMS/跨夜（532 行）＝基底 ＋ `.batch-thumb.is-stale` 系列（縮圖待更新灰階＋旋轉圈、`@keyframes thumbStaleSpin`）→ 超集。
- MS（486 行）＝基底 − `.app-toast/.app-toast.is-open`（showToast 樣式）。
- 鏡面（497 行）＝基底 − 舊別名 selector（`.template-item`、`.fileDrop`、`.ghostBtn`、`.primaryBtn`、`.layer-item`、`.layer-icon/.layer-meta`、`.icon-btn`、`.brand-version`、`.controls input/textarea`）；無新增規則。
- 合併策略：(a) 取 network 版為超集再補 `.app-toast`（已在基底）。CSS 只影響 UI，不影響 canvas 輸出。

---

## 11. 旗標總表

| 旗標 | 型別／值域 | 正式BN | 暖身BN | KV | OM_w1 | OM_w2 | MS | LineOA | network | AMS | 鏡面 | 跨夜 | 影響 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `export.zipPrefix` | string | 25SaleTool | 18SaleTool | 18SaleTool | 25節生成工具 | 25節生成工具 | 25SaleTool | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節Tool_鏡面 | 25節生成工具 | 檔名 |
| `export.batchZipName` | enum | specDriven/batchTs | specDriven/batchTs(18) | specDriven/batchTs(18) | 批次輸出_ts | 批次輸出_ts | batchTs | 批次輸出_ts | 批次輸出_ts | 批次輸出_ts | `${prefix}_輸出` | 批次輸出_ts | 檔名 |
| `export.autoLabel` | string | 依規格表 | 依規格表 | 依規格表 | 依媒體規則 | 依媒體規則 | 依規格表 | 依媒體規則 | 依工單設定 | 依工單設定 | 依工單規則 | 依工單設定 | UI |
| `export.formatSource` | enum | exportCfg+specTable | specTable | specTable | omMedia | omMedia | exportCfg+specTable | outputFormat+omMedia | outputFormat | outputFormat | specFormat | outputFormat | 格式 |
| `export.defaultFormat` | jpg/png | jpg | jpg | jpg | jpg | jpg | jpg | jpg | jpg | jpg | **png** | jpg | 格式 |
| `export.multiSizeForceJpg` | bool | true | true | true | false | false | false | false | false | false | false | false | 格式 |
| `export.stemSource` | enum | templateId | templateId | templateId | outputName | outputName | templateId | outputName | outputName | outputName | outputName | outputName | 檔名 |
| `export.multiOutputSizeSuffix` | bool | true | true | false | false | false | false | false | false | false | false | false | 檔名 |
| `export.folderStrategy` | enum | exportCfg→spec→banner | spec→banner | spec→banner | omMedia | omMedia | msArchive→exportCfg→banner | omMedia | rootFolder | rootFolder | project | rootFolder | 資料夾 |
| `export.slices` | bool | true | false | false | false | false | true | false | false | false | false | false | 檔案數 |
| `export.scaleMode` | enum | multiSize2x | multiSize2x | multiSize2x | multiSize2x | multiSize2x | fixed4x | multiSize2x | multiSize2x | fixed4x | fixed4x | fixed4x | 像素 |
| `export.whiteFill` | enum | multiSize | multiSize | multiSize | multiSize | multiSize | none | multiSize | multiSize | none | jpg | none | 像素 |
| `export.compressMode` | enum | multiSize150k | multiSize150k | multiSize150k | multiSize150k | multiSize150k | none | multiSize150k | multiSize150k | none | kLimit | kLimit | 像素/張數 |
| `export.skipMissingAssets` | bool | false | false | false | false | false | false | false | false | false | true | false | 張數 |
| `export.diagnostics` | enum | assetSpec | assetSpec | assetSpec | assetSpec | assetSpec | none | assetSpec | assetSpec | none | mirror | batchDiagnostics | zip 內容 |
| `export.renderPath` | enum | snapshot | snapshot | activeSwitch | activeSwitch | activeSwitch | snapshot | activeSwitch | activeSwitch | activeSwitch | activeSwitch | activeSwitch | **像素（需人工驗證）** |
| `export.jsonMode` | enum | raw | raw | raw | snapshot | snapshot | raw | snapshot | snapshot | snapshot | snapshot | snapshot | JSON 側檔 |
| `interaction.syncMode` | enum | dispatch | dispatch | both | both | both | smartOnly | both | both | both | none | both | 同步 |
| `interaction.markThumbStale`（變形結束後標記縮圖待更新） | bool | true | false | false | false | false | true | false | false | false | false | false | UI |
| `interaction.dropUpload` | enum | none | none | none | none | uploadSlot | manualProduct | uploadSlot | manualAssetUpload | manualAssetUpload | none | manualAssetUpload | UI/像素 |
| `interaction.dblclickReplace` | enum | assetSpec | assetSpec | assetSpec | assetSpec | assetSpec | none | assetSpec | assetSpec | assetSpec | none | uploadSlot | UI |
| `interaction.replaceAssetImpl` | enum | A | A | legacy | legacy | legacy | — | legacy | manualAssetUpload | manualAssetUpload | — | manualAssetUpload | 像素（fitMode） |
| `text.scaleMode` | enum | typographyEngine | typographyEngine | legacy | legacy+spText | legacy+spText | typographyEngine | legacy+spText | legacy | legacy | legacy | legacy | 像素 |
| `text.afterEditHook` | enum | dynamicLayout | dynamicLayout | omWave1Subtitle | omWave1Subtitle | omWave1Subtitle | dynamicLayout | omWave1Subtitle | none | none | none | markManualTextEdited | 像素 |
| `text.priceRecalcOnCommit` | enum | none | none | none | none | spText+capture | none | spText+capture | none | none | capture | none | 像素 |
| `text.editSnapshot` | bool | true | true | false | false | false | true | false | false | false | false | false | UI |
| `price.rotationHook` | bool | true | true | false | false | false | true | false | false | false | false | false | 像素 |
| `keyboard.deleteClearsUploadSlot` | bool | false | false | false | false | false | false | false | true | true | false | true | 像素（清素材） |
| `keyboard.ctrlYRedo` | bool | true | true | false | false | false | true | false | false | false | false | false | UI |
| `keyboard.linkSyncToggleKey` | string/null | null | null | null | null | null | null | null | null | null | null | 'd' | UI |
| `hit.useSelectionBox` | bool | true | false | false | false | false | true | false | false | false | false | false | UI |
| `hit.lockedPassthrough` | bool | true | true | false | false | false | true | true | false | false | true | false | UI |
| `hit.uploadSlotMaskClip` | bool | false | false | false | false | true | false | true | false | false | false | false | UI |
| `history.model` | enum | tx | tx | legacyExtras | legacyExtras | legacyExtras | tx | legacyExtras | legacyExtras | legacyExtras | plain | legacyExtras | UI（需人工決定統一 tx） |
| `linkSync.enabled` | bool | false | false | false | false | false | false | false | false | false | false | true | 同步 |
| `tool.name` | string | 25節生成工具 | 25節生成工具 | 18節生成工具 | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節生成工具 | 25節鏡面生成工具 | 25節生成工具_跨夜直播宣傳圖 | UI/診斷報告 |

### 需人工決定（c）清單
1. **`export.renderPath`**：A 系用唯讀 clone＋顯式 images；B/祖先切換 AppState 並先呼叫 `BatchManager.refreshTemplateFromBatchRecord`（KV 的 renderSceneTo 內另跑 `PriceTransformEngine.syncTemplate`＋`LayoutRuleEngine.apply`，屬 Renderer 模組差異）。若統一走 snapshot，需以黃金樣本確認 B/祖先每張輸出零像素差；否則保留兩條路徑並以旗標切換。
2. **HistoryManager 模型**：建議統一 A 版 tx 模型，但 `attachExtra` 語意、undo 後 `renderPreviewGrid` vs `refreshPreviewIndexes` 需確認不影響縮圖／輸出。
3. `text.scaleMode` 三種字級換算（typographyEngine / legacy ×1.08 / legacy＋SPTextStandard）只影響互動後結果，黃金樣本（無互動）不會覆蓋；建議另補「滾輪縮放文字後匯出」的回歸案例。
