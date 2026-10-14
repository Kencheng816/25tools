# 步驟 2 差異報告：Renderer / Geometry / TextBaselineModel / LayoutRuleEngine / CapsuleRuleEngine / SpecOverlayManager / shape-renderer.js / product-engine.js

基準＝正式BN。分支縮寫：A＝正式BN、暖身BN、MS；B＝LineOA、network、AMS、鏡面、跨夜；祖＝KV、OM_w1、OM_w2。
「版本分布」欄的字母對應 `methods-big.txt`。指紋矩陣有三處是「前置註解被算進下一個方法」造成的假差異，程式碼實際相同：
`Renderer.drawStyledTextLine` C69（OM_w2/LineOA/鏡面）、`Renderer.findLayerByCanonicalName` B9（AMS）/C12（跨夜）、`TextBaselineModel.isSourceMode` A12（祖/B）、`LayoutRuleEngine.apply`/`CapsuleRuleEngine.getTemplateFamily`/`SpecOverlayManager.getTemplateSpecKeyword` 的 MS/鏡面版差異也只是註解與未使用變數。下表不再列這些。

---

## 1. Renderer

| 方法 | 版本分布 | 差異內容（行為） | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| `render` / `renderSceneTo` | A18/A6：正式BN、暖身BN、MS ／ B19/B7：KV、OM_w1、OM_w2、LineOA、network、AMS、鏡面、跨夜 | B/祖 版每次繪製前先執行 `PriceTransformEngine.syncTemplate(t)` 與 `LayoutRuleEngine.apply(t)`（繪製即同步幾何）；A 版繪製唯讀，幾何同步只在初始化／編輯 Transaction 執行（`allowDynamicGeometry` 守門）。 | **是**（若同步時機不同，layout/價格幾何可能不同） | (b) `renderAppliesLayout`：A＝false；B、祖＝true |
| `_drawLayers` | A26：正式BN、暖身BN、KV、OM_w1、MS、network、跨夜 ／ B26：OM_w2、LineOA ／ C30：AMS ／ D15：鏡面 | B26：多傳 `showUploadPrompt` 給 drawImage（上傳框提示，僅 UI/預覽）。C30：AMS 把遮罩從 drawImage 抽到這裡，對 shape/image/text 三種圖層統一套 `applyLayerMask`（見下）。D15：鏡面沒有 P_範圍參考框（`SmartAssetManager.isPlacementGuide` 分流與 `drawPlacementGuide`）——鏡面未載入 SmartAssetManager，走 `?.` 自然為 false，結果相同。 | showUploadPrompt：僅UI；AMS 遮罩範圍：**是**（見 applyLayerMask）；鏡面：否 | showUploadPrompt (a)；鏡面 (a)；遮罩範圍見 `applyLayerMask` |
| `drawPlacementGuide` | A14：除鏡面外全部 ／ 鏡面無 | 鏡面沒有此方法；只在 ui 或 showGuides 時呼叫，匯出不畫。 | 僅UI | (a) |
| `drawShape` | A73：除 AMS 外全部 ／ B25：AMS | A73：`GLOBAL_VECTOR_RULES` 命中或 shapeKind∈{righttriangle,ctaarrow,ctaarrowright} 時強制用圖層外框畫「向右三角形」；shapeKind=triangle 時優先用 `geometry.corners` 當頂點畫多邊形。B25：全部刪除，一律交 `ShapeRenderer.renderJsonShape`（AMS 的 shape-renderer 會從 corners 算旋轉角）。 | **是** | (b) `shapeLegacyTriangleOverride`：AMS＝false；其餘全部＝true |
| `drawText` | B83：KV ／ A118：正式BN、暖身BN、OM_w1、OM_w2、MS、network、AMS、跨夜 ／ C162：LineOA、鏡面 | **KV（B83）**：(1) 不設定 `fontKerning='normal'` / `textRendering='optimizeLegibility'`；(2) 沒有 bottom 對齊、沒有 TextBaselineModel source-baseline；所有行都用 `textBaseline='top'` 且 y＝框內以 lineHeight 垂直置中；底線 y＝行頂+fontSize+2。**A118**：加入 `textVerticalAlign=bottom`（最後一行 ink 下緣貼框底）、source-baseline（首行基線＝TextBaselineModel 參考值×字級縮放）；混排時傳 `positionMode='baseline'`。**C162**：A118 ＋ 換行正規化多認`\u0003 / \u2028 / \u2029` ＋ 新增 `textDecoration` 含 `line-through` 時畫刪除線（以該行最大字級分段 ink 中線為 y，寬度＝整行實測寬）。 | **是**（KV 與 A 的文字垂直定位與抗鋸齒設定不同；line-through 只在 LineOA rules 有用到） | (b) `textEngine`：KV＝`'legacy'`；其餘＝`'baseline-model'`。line-through 與 `\u0003 / \u2028 / \u2029` 正規化 (a)（各工具 templates 皆無 \u0003/\u2028/\u2029；line-through 只在 LineOA rules 出現） |
| `isTextBottomAligned` / `isTextSourceBaselineAligned` / `getSourceTextBaseline` / `getStyledLineInkMetrics` / `shouldUseOriginalStyledBaseline` / `getOriginalTextBaseline` / `measureRenderedTextWidth` | A：除 KV 外全部 ／ KV 無（measureRenderedTextWidth 在 LineOA/鏡面為 B16） | KV 缺整組 baseline 輔助方法（配合 textEngine='legacy'）。LineOA/鏡面 `measureRenderedTextWidth` B16 僅換行正規化差異。 | 隨 `textEngine` | 併入 `textEngine` 旗標；B16 (a) |
| `drawStyledTextLine` | B73：KV ／ A57（＝C69）：其餘全部 | **KV**：三種垂直模式—(1) psdName 符合 `/^usp_(上|中|下)$/` 時「以第一分段 ink 中心對齊所有分段」；(2) `styledTextVerticalAlign==='source-baseline'` 時以「最大字級分段」的 ink 底端為整行底線，每分段 drawY＝底線−自身 descent；(3) 其他 `textBaseline='top'`。**A**：由呼叫端 positionMode 決定；非 baseline 模式且混字級時用 `getOriginalTextBaseline`（基準字級 ascent）當基線；沒有 usp_ 特例。另 A 在此再次設定 fontKerning/textRendering。KV rules（sp-text-standard、商城狂購節）確實使用 source-baseline 與 textStyleRanges，此路徑會被走到。 | **是** | (b) `textEngine`（同上）；KV 的 `shouldCenterStyledTextByFirstSegment` 隨 legacy 引擎一起保留 |
| `drawTextCaret` | B29：KV ／ A45：其餘 | KV 版無 bottom/source-baseline 的游標定位。 | 僅UI | 隨 `textEngine` |
| `fitTextLayerToInk` | A58：OM_w2 ／ B58：LineOA、鏡面 ／ 其餘無 | 把文字圖層框收斂到實測 ink 範圍並重算 x/y/center，最後 force 重新 capture TextBaselineModel 參考。B58 只差換行正規化。由 PriceTransformEngine（B/祖分支）呼叫，A 分支無呼叫端。 | 否（純新增、無呼叫端） | (a) |
| `measureRenderedTextInkBounds` | A105：MS ／ 其餘無 | 量測文字實際 ink 左右邊界（供 MS 工單/排版模組使用），不繪圖。 | 否 | (a) |
| `applyImageMask` | A15：除 AMS、跨夜外全部 ／ 跨夜 B20 ／ AMS 無（改為 `applyLayerMask`） | A15：依 `__maskLayerName/maskLayerName` 找遮罩圖層，用 `ShapeRenderer.clipJsonShape` 裁切，無 ShapeRenderer 時用矩形。跨夜 B20：多認 `__maskEdges==='bottom'` → `clipToBottomEdge`（只裁下緣、沿用遮罩左下/右下圓角，左右上不裁）。 | 跨夜新增只在 layer 宣告 `__maskEdges` 時生效 | (a) |
| `applyLayerMask`（AMS 新增） | A16：AMS | 同 applyImageMask，但 (1) 多認 `effects.maskBy / effects.clipBy`；(2) 在 `_drawLayers` 對 shape/text 圖層也套用（A 只對 image 套用）。`maskBy/clipBy` 只在 AMS core 出現，各工具 templates 無。 | **是**（若 A 分支 template 的 shape/text 圖層帶 maskLayerName，統一後會被裁切） | (b) `maskScope`：AMS＝`'all'`；其餘＝`'image'` |
| `clipToBottomEdge` / `applyShadowMask` | A47/A15：跨夜 | 見上；`applyShadowMask` 依 `__shadowMaskLayerName` 把陰影裁在另一圖層完整形狀內，只作用於陰影。 | 只在 layer 宣告時生效 | (a) |
| `drawImage` | A47：正式BN、暖身BN、KV、OM_w1、鏡面 ／ B53：OM_w2、LineOA ／ C60：MS ／ D42：network ／ E41：AMS ／ F56：跨夜 | 共同：遮罩→translate/rotate→陰影→圖片。差異：(1) **自動 LOGO 陰影**：A47/B53/C60 當 key/psdName/assetFilename ∈ {蝦皮購物_LOGO_白, 直式_18號會員日_LOGO_白, 蝦皮購物18號會員日_LOGO_白, 18號會員日_LOGO_白} 時自動加 `#f26602`/0.51/multiply/117°/2px/blur6 陰影；D42/E41/F56 移除，只吃 `layer.dropShadow`。(2) 缺圖佈位：B53 加 `__uploadSlot` 「+上傳圖片」文字；C60 加 `__manualUploadRequired` 藍框「+上傳素材」；D42/E41/F56 缺圖時若 `ManualAssetUpload.isUploadSlot` 則畫上傳槽。(3) E41：遮罩改由 `_drawLayers` 套。(4) F56：陰影獨立 save/restore 並先套 `applyShadowMask`。 | (1) **是**；(2) 僅UI（ExportManager 以 showMissing:false 匯出）；(3)(4) 否 | (1) (b) `autoLogoShadow`：network、AMS、跨夜＝false；其餘＝true。(2) (a)，統一 core 需含 ManualAssetUpload 或以 `?.` 守護。(3)(4) (a) |
| `findLayerByCanonicalName` | 全部相同（B9/C12 為註解假差異） | — | 否 | (a) |
| `drawSelection` | A49：正式BN、MS ／ B49/B48：暖身BN、KV、OM_w1、network、AMS、跨夜 ／ C48：OM_w2、LineOA、鏡面 | A49：用 `Geometry.getSelectionBox`（auto_price_v2 價格框貼合實測文字寬）且旋轉握把連線到「上緣中央」；B：`getLayerBox`＋連線到右上角；C：`getLayerBox`＋連線到上緣中央。 | 僅UI | (b) `selectionBoxMode`：正式BN、MS＝`'ink-fit-price'`，其餘＝`'layer'`；`rotateHandleAnchor`：正式BN、MS、OM_w2、LineOA、鏡面＝`'top-center'`，暖身BN、KV、OM_w1、network、AMS、跨夜＝`'top-right'`（需與 Geometry.handles 一致） |

## 2. Geometry

| 方法 | 版本分布 | 差異內容（行為） | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| `getRenderedImageBox` | A13：除鏡面外全部 ／ B7：鏡面 | A13 先委派 `window.ProductEngine.getRenderedImageBox`（依 keepAspectRatio/sizingMode 算比例）；鏡面沒有 product-engine.js，只有 fallback（width＝layer.width‖targetWidth、height＝layer.height，不算比例）。鏡面 templates 只有 image（無 keepAspectRatio）與 text。 | **是**（若統一 core 為鏡面載入 ProductEngine 且圖層帶 keepAspectRatio） | (b) `useProductEngineSizing`：鏡面＝false；其餘＝true |
| `getLayerBox` | A6：正式BN、MS ／ B4：其餘 | 僅程式碼排版差異（同一 return 拆行），行為相同。 | 否 | (a) |
| `getSelectionBox` | A12：正式BN、MS ／ 其餘無 | 價格圖層（source=auto_price_v2）選取框貼合 `measureRenderedTextWidth` 實測寬。 | 僅UI | 隨 `selectionBoxMode` |
| `applyBox` | A34：正式BN、暖身BN ／ B28：KV、OM_w1、network、AMS、跨夜 ／ C33：OM_w2、LineOA ／ D30：MS ／ E33：鏡面 | A34：所有圖層型別都同步 centerX/centerY；接受 `options.template / notifyLayout / notifyPrice`。B28：只有 image 更新 center；無 options；PriceTransformEngine 通知不帶 template。C33/E33：＝A 的 center 同步（無 options）＋ `sizingMode∈{coverByPBox,cover}` 也同步 targetHeight/maxTargetHeight。D30：＝A 但不認 `productImageSizingRule==='ddcardHeightPriorityNoWidthLimit'`。 | **是**（互動編輯後的幾何；批次/匯出若經 applyBox 亦受影響） | (b) `applyBoxSyncCenterForAllTypes`：KV、OM_w1、network、AMS、跨夜＝false，其餘＝true；`applyBoxCoverSyncHeight`：OM_w2、LineOA、鏡面＝true，其餘＝false；`applyBoxDdcardHeightRule`：MS＝false，其餘＝true。options 參數 (a) |
| `handles` | A28：正式BN、MS ／ B28：暖身BN、KV、OM_w1、network、AMS、跨夜 ／ C30：OM_w2、LineOA、鏡面 | 旋轉握把未旋轉位置：A/C＝上緣中央外側 26px；B＝右上角外側。 | 僅UI | 隨 `rotateHandleAnchor` |
| `mousePos` / `screenRectForBox` | MS B7 / 鏡面 B7、MS 無 screenRectForBox | 程式碼相同（指紋含相鄰註解）；MS 缺 `screenRectForBox`（只被 UI 用）。 | 否 | (a) |

## 3. TextBaselineModel

| 方法 | 版本分布 | 差異內容（行為） | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| 整個模組 | 存在：除 KV 外全部 ／ KV 無 | KV 沒有 TextBaselineModel（配合 textEngine='legacy'）。 | **是** | 隨 `textEngine` |
| `normalizeText` | A7：其餘 ／ B10：LineOA、鏡面 | B10 換行多認`\u0003 / \u2028 / \u2029`，影響 lineCount → source-baseline 首行基線。 | 只在文字含這些字元時 | (a)（同 drawText 的正規化，建議三處一起用同一 helper） |
| 其餘 11 個方法 | 全部相同 | — | 否 | (a) |

## 4. LayoutRuleEngine

| 方法 | 版本分布 | 差異內容（行為） | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| `apply` | A25/B22/C24 | 僅註解差異；程式碼相同。呼叫時機差異見 Renderer.render（`renderAppliesLayout`）。 | 否 | (a) |

## 5. CapsuleRuleEngine

| 方法 | 版本分布 | 差異內容（行為） | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| `getTemplateFamily` | A31：除 MS ／ B27：MS | MS 只少了未使用的 `label` 變數與註解。 | 否 | (a) |
| `measureTextWidth` | A19：其餘 ／ B16：MS ／ C19：LineOA、鏡面 | A/C：若 `layer.hbnTitleLogoGroupProxy===true` 且有 `hbnTitleLogoGroupWidth`，直接回傳該寬（LOGO+標題群組代理寬）；MS 沒有此捷徑。C 只多換行正規化。 | **是**（僅當 rules 產生 hbnTitleLogoGroupProxy 圖層；MS rules 無此欄位） | (a)（MS 走不到；若要保守可設 `capsuleGroupProxyWidth`：MS＝false） |
| `buildLayer` | A68：其餘 ／ B41：MS | A 多：(1) `rules.isolatedIGCapsule` → 呼叫 `rules.resolveCapsuleWidth` 覆蓋膠囊寬、`centerSource==='subtitle'` 時以副標題為中心；(2) isolatedCapsule 也可啟用 preserveSubtitleY/Box/LegalY；(3) `hbnTitleLogoGroupProxy` 副標題用 `rules.groupedSubtitleHeightPx` 當膠囊高。MS 皆無。所有新增都由 rules 欄位驅動。 | **是**（僅當 rules 設定對應欄位；MS rules 無） | (a) |

## 6. SpecOverlayManager（只在 `options.ui` 時 draw，匯出與批次縮圖不畫）

| 方法 | 版本分布 | 差異內容（行為） | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| `getTemplateSpecKeyword` | A22/B21/C22 | 僅註解與一個未使用變數。 | 僅UI | (a) |
| `getAllowedSpecFilenames` | A13：正式BN、暖身BN、KV、OM_w1、OM_w2、LineOA、network、AMS ／ B12：MS、鏡面 ／ C13：跨夜 | A：`ruleFamily==='spec-driven'` 或 `batchRecord.__multiSizeSync` 時不載規範圖；C：只看 spec-driven；B：兩者都不排除。 | 僅UI | (b) `specOverlaySkip`：A 組＝`['spec-driven','multiSizeSync']`；跨夜＝`['spec-driven']`；MS、鏡面＝`[]` |
| `getCandidateFilenames` | A7/B7 | 僅註解。 | 僅UI | (a) |

## 7. renderers/shape-renderer.js（10 份，7 版；鏡面未載入）

| 版本 | 工具 | 相對於基準（S1＝正式BN/暖身BN）的行為差異 | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| S1 | 正式BN、暖身BN | 基準。有 `invalidateAssetCache`（TemplateLoader 呼叫）。圓角用 `arcTo`。`getFill` 無填色時回 `#ffffff`。 | — | — |
| S2 | KV | ＝S1 少 `invalidateAssetCache`（呼叫端用 `?.`）。 | 否 | (a) |
| S3 | OM_w1、network | ＝S2 ＋ `createRuleFromJsonLayer` 讀 `geometry/shape/layer.startAngleDeg` 給多邊形起始角。各工具 templates 皆無 startAngleDeg。 | 否（資料驅動，目前無資料） | (a) |
| S4 | OM_w2、LineOA | ＝S3 ＋ `isFillEnabled`：`rule/layer/shape.fillEnabled` 或 `shape.stroke.raw.fillEnabled` 為 false 時不 `fill()`（只描邊）。**暖身BN 有 2 個 template、外廣OM 65、LineOA 5、Affiliate 19、跨夜 16 個 template 含 `fillEnabled:false`**；S1/S2/S3 會把它們填成 fill 色（或白）。 | **是** | (b) `shapeFillEnabledMode`：正式BN、暖身BN、KV、OM_w1、network、MS＝`'ignore'`；OM_w2、LineOA＝`'flag'`；AMS＝`'flag-strict'`（不看 stroke.raw）；跨夜＝`'flag-or-no-fill'`（見 S7） |
| S5 | MS | ＝S1 ＋ `hexRectangle/hexRect` 渲染器（水平六角矩形，slantRatio/slantPx）。移除未使用的 `roundRectPath`。 | 否（新 renderer 名，其餘工具 rules 不會指定） | (a) |
| S6 | AMS | ＝S3 ＋ (1) 旋轉角改由 `layer.rotation` → `geometry.rotation` → 從 `geometry.corners` 計算（不再用 `geometry.transform.rotationDeg`）；有旋轉時 bbox 改用 `geometry.unrotatedBox` 或 corners 反推的未旋轉框。(2) `psdCornerRadii`：從 `shape.rawShapeDescriptor.keyOriginType[0].keyOriginRRectRadii` 讀四角各自半徑（正式BN 32、暖身BN 46 個 template 含此欄位——目前被忽略、四角都用 cornerRadius）。(3) 圓角改用 **cubic Bezier（kappa 0.5523）** 取代 `arcTo`。(4) fill/stroke 各自獨立（paint 物件）、`isFillEnabled` 不看 stroke.raw。(5) `CTA_箭頭` 名稱硬畫向右三角形只在無 rotation/corners 資料時才啟用（各 template 無 CTA_箭頭）。 | **是**（(1)(2)(3) 都會改變 A/祖 分支既有 template 的形狀像素；(3) 影響所有圓角矩形的邊緣抗鋸齒） | (b) `shapeRotationSource`：AMS＝`'corners'`，其餘＝`'transform'`；`shapePsdCornerRadii`：AMS＝true，其餘＝false；`shapeCornerCurve`：AMS＝`'bezier'`，其餘＝`'arcTo'` |
| S7 | 跨夜 | ＝S3 ＋ (1) `isFillEnabled`：除 fillEnabled 旗標外，**沒有任何 fill 來源時也不填**（S1~S6 會填白）。(2) `fillGradient`（rule/layer 設定沿 x 軸線性漸層）。(3) `insetBoxForStroke`：有描邊時框內縮 stroke.width/2（描邊不外溢 pathBounds）。(4) 多邊形可用 `points/pointsNormalized` 自訂頂點。(5) `resolveExportedBox`：**優先 `shape.pathBounds` 再 `geometry.bbox`**（S1~S6 反過來），且匯出框與 layer 框不重疊時改用 layer 框。 | **是**（(1)(3)(5) 會改變既有 template 像素；(2)(4) 資料驅動） | (1) 併入 `shapeFillEnabledMode='flag-or-no-fill'`；(3) (b) `shapeStrokeInset`：跨夜＝true，其餘＝false；(5) (b) `shapeBoxSource`：跨夜＝`'pathBounds-first+overlap'`，其餘＝`'bbox-first'`；(2)(4) (a) |

## 8. core/product-engine.js（10 份，4 版；鏡面未載入）

| 版本 | 工具 | 行為差異 | 影響輸出像素？ | 合併策略 |
|---|---|---|---|---|
| P1 | 正式BN、暖身BN、MS（MS 只差註解） | keepAspectRatio 時：`containByPBox/widthContain` → 寬優先再限高；`heightContain` → 高優先再限寬；`heightBased` → 高；`widthBased` → 寬；**無明確 mode 且 `targetHeight && !targetWidth`** → 高；否則寬。 | — | — |
| P2 | KV、OM_w1、network、AMS、跨夜 | 無 `widthBased` 分支；條件為 **`mode==='heightbased' || layer.targetHeight`** → 只要 layer 有 targetHeight 就走高優先（即使有 targetWidth 或 sizingMode='widthBased'）。正式BN 32、暖身BN 30 個 template 含 targetHeight；外廣OM/LineOA/Affiliate/跨夜 各 1~2。 | **是** | (b) `productSizingHeightPriority`：KV、OM_w1、network、AMS、跨夜＝`'legacy'`（有 targetHeight 即高優先）；正式BN、暖身BN、MS、OM_w2、LineOA＝`'explicit'` |
| P3 | OM_w2、LineOA | ＝P2 ＋ `coverByPBox/cover` 模式（cover 填滿框、取較大縮放）。 | 否（新 mode，其他工具 template 不用） | (a) |
| — | 鏡面 | 未載入；Geometry fallback 不算比例。 | 見 Geometry `useProductEngineSizing` | (b) |

---

## 旗標總表

| 旗標名 | 型別/可能值 | 各分支預設 | 用在哪些方法 |
|---|---|---|---|
| `renderAppliesLayout` | bool | A（正式BN、暖身BN、MS）＝false；B、祖 全部＝true | Renderer.render、Renderer.renderSceneTo |
| `textEngine` | `'legacy'` \| `'baseline-model'` | KV＝legacy；其餘＝baseline-model | Renderer.drawText、drawStyledTextLine、drawTextCaret、measureRenderedTextWidth、isTextBottomAligned 等整組、TextBaselineModel 是否啟用、KV 的 shouldCenterStyledTextByFirstSegment |
| `autoLogoShadow` | bool | network、AMS、跨夜＝false；其餘（含鏡面、KV、OM）＝true | Renderer.drawImage |
| `shapeLegacyTriangleOverride` | bool | AMS＝false；其餘＝true | Renderer.drawShape |
| `maskScope` | `'image'` \| `'all'` | AMS＝all；其餘＝image | Renderer._drawLayers、applyImageMask/applyLayerMask |
| `useProductEngineSizing` | bool | 鏡面＝false；其餘＝true | Geometry.getRenderedImageBox |
| `applyBoxSyncCenterForAllTypes` | bool | KV、OM_w1、network、AMS、跨夜＝false；正式BN、暖身BN、MS、OM_w2、LineOA、鏡面＝true | Geometry.applyBox |
| `applyBoxCoverSyncHeight` | bool | OM_w2、LineOA、鏡面＝true；其餘＝false | Geometry.applyBox |
| `applyBoxDdcardHeightRule` | bool | MS＝false；其餘＝true | Geometry.applyBox |
| `selectionBoxMode`（UI） | `'layer'` \| `'ink-fit-price'` | 正式BN、MS＝ink-fit-price；其餘＝layer | Geometry.getSelectionBox、Renderer.drawSelection |
| `rotateHandleAnchor`（UI） | `'top-center'` \| `'top-right'` | 正式BN、MS、OM_w2、LineOA、鏡面＝top-center；暖身BN、KV、OM_w1、network、AMS、跨夜＝top-right | Geometry.handles、Renderer.drawSelection |
| `specOverlaySkip`（UI） | string[] | 正式BN、暖身BN、KV、OM_w1、OM_w2、LineOA、network、AMS＝['spec-driven','multiSizeSync']；跨夜＝['spec-driven']；MS、鏡面＝[] | SpecOverlayManager.getAllowedSpecFilenames |
| `shapeFillEnabledMode` | `'ignore'` \| `'flag'` \| `'flag-strict'` \| `'flag-or-no-fill'` | 正式BN、暖身BN、KV、OM_w1、network、MS＝ignore；OM_w2、LineOA＝flag；AMS＝flag-strict；跨夜＝flag-or-no-fill | shape-renderer isFillEnabled / fillIfNeeded / applyPaint |
| `shapeRotationSource` | `'transform'` \| `'corners'` | AMS＝corners；其餘＝transform | shape-renderer getRotation、getBox、createRuleFromJsonLayer、CTA_箭頭 fallback |
| `shapePsdCornerRadii` | bool | AMS＝true；其餘＝false | shape-renderer drawRoundedRectangle、traceJsonShapePath、createRuleFromJsonLayer |
| `shapeCornerCurve` | `'arcTo'` \| `'bezier'` | AMS＝bezier；其餘＝arcTo | shape-renderer roundRectCornersPath / appendRoundRectCorners / traceJsonShapePath |
| `shapeStrokeInset` | bool | 跨夜＝true；其餘＝false | shape-renderer withTransform / insetBoxForStroke |
| `shapeBoxSource` | `'bbox-first'` \| `'pathBounds-first+overlap'` | 跨夜＝pathBounds-first+overlap；其餘＝bbox-first | shape-renderer createRuleFromJsonLayer / resolveExportedBox |
| `productSizingHeightPriority` | `'explicit'` \| `'legacy'` | KV、OM_w1、network、AMS、跨夜＝legacy；正式BN、暖身BN、MS、OM_w2、LineOA＝explicit | product-engine getRenderedImageBox |

純新增、直接取超集（無旗標）：`fitTextLayerToInk`、`measureRenderedTextInkBounds`、`clipToBottomEdge`/`__maskEdges`、`applyShadowMask`、line-through 刪除線、`\u0003 / \u2028 / \u2029` 換行正規化、上傳槽/缺圖佈位（UI）、`hexRectangle`、`startAngleDeg`、`fillGradient`、`points/pointsNormalized`、`coverByPBox`、CapsuleRuleEngine 的 isolatedIGCapsule / hbnTitleLogoGroupProxy、Geometry.applyBox 的 options 參數。

---

## 可能導致像素差異的重點（需黃金樣本逐像素驗證）

1. **文字抗鋸齒/字距設定**：KV 不設 `fontKerning='normal'`、`textRendering='optimizeLegibility'`，其餘 10 工具都設。這會影響 KV 所有文字圖層的每一個字形位置與邊緣。→ `textEngine='legacy'` 必須連這兩行一起關掉。
2. **文字垂直定位**：KV 的 source-baseline（最大字級分段 ink 底端對齊）與 usp_ 首分段置中，對上 A 的 TextBaselineModel（框內 ink 區塊置中＋ascent）——演算法不同，KV rules 確實使用 source-baseline。
3. **文字量測**：`measureRenderedTextWidth` / `measureTextSegments` 的 per-char 量測相同；但 LineOA/鏡面 的換行正規化若遇`\u0003` 會改變行數與寬度（目前 templates 無此字元）。
4. **圖片縮放**：product-engine `targetHeight` 優先規則（P1 vs P2）——正式BN/暖身BN 有 30+ template 含 targetHeight，若套 P2 邏輯會改變商品圖尺寸；鏡面無 ProductEngine 完全不算比例。
5. **圖片遮罩**：AMS 對 shape/text 也套遮罩；跨夜 `__maskEdges='bottom'` 只裁下緣；陰影另裁（`applyShadowMask`）。
6. **形狀**：(a) 圓角 arcTo vs Bezier（AMS）— 每個圓角矩形邊緣像素都不同；(b) `fillEnabled:false` 是否填色（暖身BN 2 個 template、B/祖 分支多數 template 會受影響）；(c) 跨夜「無 fill 來源就不填」 vs 其餘「填白」；(d) 旋轉角來源（transform.rotationDeg vs corners）；(e) 四角各自半徑（keyOriginRRectRadii，正式BN/暖身BN 各 30~46 個 template 含此資料但目前被忽略）；(f) 跨夜描邊內縮半個線寬與 pathBounds 優先。
7. **自動 LOGO 陰影**（依圖層名稱）：network/AMS/跨夜 已移除；其餘工具若 template 有 `蝦皮購物_LOGO_白` 等圖層會自動加橘色 multiply 陰影。
8. **drawShape 的 CTA 箭頭/三角形攔截**：AMS 交給 ShapeRenderer 用 corners 角度畫；其餘工具用圖層外框硬畫向右三角形或用 corners 當多邊形頂點。
9. **繪製時同步幾何**（`renderAppliesLayout`）：B/祖 分支每次 render 都跑 PriceTransformEngine.syncTemplate + LayoutRuleEngine.apply；A 分支不跑——若同步時機不同，價格/膠囊幾何可能不同。
