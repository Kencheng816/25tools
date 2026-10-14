# app.core.js 模組級指紋矩陣

同一欄內相同字母＝內容相同（忽略空白）；數字＝行數；ver＝版本數。

```
module                                正式BN |    暖身BN |      KV |   OM_w1 |   OM_w2 |      MS |  LineOA | network |     AMS |      鏡面 |      跨夜 | ver
__head__                                A8 |      B8 |      B8 |      B8 |      B8 |      C7 |      B8 |      D9 |      D9 |     E12 |     F26 | 6
$                                       A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 | 1
qs                                      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 | 1
qsa                                     A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 | 1
clone                                   A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 | 1
round                                   A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 | 1
normStr                                 A7 |      A7 |      A7 |      A7 |      A7 |      B7 |      A7 |      A7 |      A7 |      A7 |      A7 | 2
getRuleSection                          A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 | 1
escapeHtml                              A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 |      A3 | 1
encodeAssetPath                        A13 |     A13 |     A13 |     A13 |     A13 |      B6 |     A13 |     A13 |     A13 |     A13 |     A13 | 2
scheduleBlobRevoke                     A12 |     A12 |     A12 |     A12 |     A12 |      B4 |     A12 |     A12 |     A12 |     A12 |     A12 | 2
showToast                              A16 |     A16 |     A16 |     A16 |     A16 |       - |     A16 |     A16 |     A16 |     A16 |     A16 | 1
decodeHashUnicode                       A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 | 1
normalizeAssetStemExact                 A8 |      A8 |      A8 |      A8 |      A8 |       - |      A8 |      A8 |      A8 |      A8 |      A8 | 1
normalizeLayerIdentifier               A13 |     A13 |     A13 |     A13 |     A13 |      B7 |     A13 |     A13 |     A13 |     A13 |     A13 | 2
SVG                                     A9 |      A9 |      A9 |      A9 |      A9 |      A9 |      A9 |      A9 |     B17 |      A9 |      A9 | 2
GLOBAL_VECTOR_RULES                     A5 |      A5 |      A5 |      A5 |      A5 |      A5 |      A5 |      A5 |       - |      A5 |      A5 | 1
EMBEDDED_ASSETS                        A10 |     A10 |     A10 |     A10 |     A10 |      B6 |     A10 |     A10 |     A10 |      C3 |     A10 | 3
AppState                               A34 |     A34 |     B31 |     B31 |     B31 |     A34 |     B31 |     B31 |     B31 |     C31 |     B31 | 3
ALL_PROJECTS_VALUE                      A3 |      A3 |      B5 |      B5 |      B5 |     C10 |      B5 |      B5 |      B5 |      B5 |      B5 | 3
classifyAssetRole                      A28 |     A28 |     B20 |     B20 |     B20 |       - |     B20 |     B20 |     B20 |     B20 |     B20 | 2
imageLoadCache                          A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 | 1
AssetStore                             A47 |     A47 |     B57 |     B57 |     B57 |     C27 |     D71 |     B57 |     B57 |     D71 |     E61 | 5
AssetLookup                            A88 |     B91 |       - |       - |       - |     C88 |       - |       - |       - |       - |       - | 3
activeLayerKey                          A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 |      A1 | 1
activeLayer                             A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 | 1
DOM                                    A24 |     A24 |     A24 |     A24 |     A24 |     A24 |     A24 |     A24 |     A24 |     A24 |     A24 | 1
ctx                                     A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 |      A2 | 1
ManualOverrideManager                  A20 |     A20 |       - |       - |       - |     B11 |       - |       - |       - |       - |       - | 2
HistoryManager                         A89 |     A89 |     B54 |     B54 |     B54 |     A89 |     B54 |     B54 |     B54 |     C27 |     B54 | 3
TemplateLoader                        A469 |    B479 |    C515 |    D600 |    D600 |    E368 |    F642 |    G609 |    H618 |    I530 |    J550 | 10
Geometry                              A133 |    B119 |    C113 |    C113 |    D120 |    E119 |    D120 |    C113 |    C113 |    F108 |    C113 | 6
AssetSyncHub                           A28 |     A28 |     B21 |     A28 |     A28 |       - |     A28 |     C34 |     D34 |       - |     E39 | 5
SpecOverlayManager                    A192 |    A192 |    A191 |    A191 |    A191 |    B190 |    A191 |    A191 |    A191 |    C190 |    D191 | 4
CapsuleRuleEngine                     A166 |    A166 |    A166 |    A166 |    A166 |    B132 |    C166 |    A166 |    A166 |    C166 |    A166 | 3
LayoutRuleEngine                      A136 |    A136 |    A135 |    A135 |    A135 |    B133 |    A135 |    A135 |    A135 |    C134 |    A135 | 3
TextBaselineModel                     A162 |    A162 |       - |    A163 |    A163 |    A162 |    B166 |    A163 |    A163 |    B166 |    A163 | 2
Renderer                              A777 |    B777 |    C668 |    D778 |    E854 |    F895 |    G898 |    H773 |    I732 |    J867 |    K860 | 11
LayerManager                           A69 |     B68 |     C68 |     C68 |     D96 |     A69 |     E99 |     C68 |     C68 |     F60 |     C68 | 6
DynamicLayoutManager                   A38 |     A38 |       - |       - |       - |     A38 |       - |       - |       - |       - |       - | 1
Inspector                              A82 |     A82 |     B72 |     C90 |     D93 |     E82 |     D93 |     F87 |     F87 |     G82 |     H90 | 8
TextEditor                             A87 |     A87 |    B119 |    B119 |    C125 |     A87 |    C125 |    D116 |    D116 |    E119 |    F117 | 6
PreviewZoom                            A45 |     A45 |     A45 |     A45 |     A45 |     A45 |     A45 |     A45 |     A45 |     A45 |     A45 | 1
ExportManager                         A325 |    B289 |    C342 |    D325 |    D325 |    E340 |    F328 |    G304 |    H284 |    I401 |    J354 | 10
TemplateFilter                        A141 |    A141 |    A141 |    A141 |    A141 |    A141 |    A141 |    A141 |    A141 |    A141 |    A141 | 1
TemplateList                           A35 |     A35 |     B22 |     B22 |     B22 |     A35 |     B22 |     B22 |     B22 |     B22 |     B22 | 2
LoadingOverlay                        A111 |    A111 |    A111 |    A111 |    A111 |     B57 |    A111 |    A111 |    A111 |    A111 |    A111 | 2
PriceRuleEngine                       A286 |    A286 |    B224 |    B224 |    B224 |    C285 |    B224 |    B224 |    B224 |    D223 |    B224 | 4
PriceColorResolver                     A61 |     A61 |     B49 |     B49 |     B49 |     A61 |     B49 |     B49 |     B49 |     B49 |     B49 | 2
PriceLayoutResolver                    A26 |     A26 |     A26 |     A26 |     A26 |     A26 |     A26 |     A26 |     A26 |     A26 |     A26 | 1
PriceTypographyResolver                A66 |     A66 |       - |       - |       - |     B65 |       - |       - |       - |       - |       - | 2
PriceParser                            A22 |     A22 |     A22 |     A22 |     A22 |     A22 |     A22 |     A22 |     A22 |     A22 |     A22 | 1
PriceLayerFactory                      A92 |     A92 |     B75 |     C81 |     D90 |     A92 |     D90 |     E80 |     E80 |     F89 |     E80 | 6
PriceTransformEngine                  A224 |    A224 |    B129 |    C130 |    D183 |    E215 |    D183 |    B129 |    B129 |    F182 |    B129 | 6
PriceCouponManager                    A285 |    B248 |    C207 |    D225 |    D225 |    E252 |    D225 |    D225 |    D225 |    F224 |    D225 | 6
BatchManager                         A1923 |   B1923 |   C1953 |   D1981 |   E2005 |   F1826 |   G2025 |   H2009 |   I2082 |   J1520 |   K1986 | 11
Interaction                           A290 |    B287 |    C247 |    D253 |    E350 |    F315 |    G362 |    H223 |    H223 |    I183 |    J239 | 10
App                                   A207 |    A207 |    B201 |    C205 |    C205 |    D205 |    C205 |    E203 |    E203 |    F190 |    G204 | 7
rulesReady                             A18 |     A18 |     B12 |     B12 |     B12 |     A18 |     B12 |     B12 |     B12 |     B12 |     B12 | 2
ASSET_POLICY                             - |       - |      A9 |      A9 |      A9 |       - |      A9 |      A9 |      A9 |      A9 |      A9 | 1
getAssetPolicy                           - |       - |      A9 |      A9 |      A9 |       - |      B7 |      A9 |      A9 |      C7 |      A9 | 3
SnapshotManager                          - |       - |       - |     A89 |     A89 |       - |     A89 |     A89 |     A89 |     B87 |     A89 | 2
assetNameVariantsForTemplate             - |       - |       - |       - |       - |     A24 |       - |       - |       - |       - |       - | 1
normalizeIdentityLoose                   - |       - |       - |       - |       - |       - |      A1 |       - |       - |      A1 |       - | 1
resolveTemplateFolderName                - |       - |       - |       - |       - |       - |     A17 |       - |       - |     A17 |       - | 1
getAssetLookupScope                      - |       - |       - |       - |       - |       - |     A17 |       - |       - |     A17 |       - | 1
ManualAssetUpload                        - |       - |       - |       - |       - |       - |       - |    A210 |    B213 |       - |    C217 | 3
LayerDefaults                            - |       - |       - |       - |       - |       - |       - |       - |     A26 |       - |       - | 1
TOOL_NAME                                - |       - |       - |       - |       - |       - |       - |       - |       - |      A1 |       - | 1
OUTPUT_NAME                              - |       - |       - |       - |       - |       - |       - |       - |       - |     A10 |       - | 1
BatchDiagnostics                         - |       - |       - |       - |       - |       - |       - |       - |       - |       - |     A74 | 1
LinkSync                                 - |       - |       - |       - |       - |       - |       - |       - |       - |       - |     A32 | 1
markManualTextEdited                     - |       - |       - |       - |       - |       - |       - |       - |       - |       - |     A12 | 1
LinkSyncUI                               - |       - |       - |       - |       - |       - |       - |       - |       - |       - |     A26 | 1
```

## 方法級（大模組）
```

### TemplateLoader
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
boot                                        A16 |    A16 |    B17 |    B17 |    B17 |    C14 |    B17 |    B17 |    B17 |    B17 |    B17 | 3
clearTemplates                              A24 |    A24 |    B23 |    C24 |    C24 |    A24 |    C24 |    C24 |    C24 |    B23 |    C24 | 3
resolveAssetLookupProject                   A16 |    A16 |     B5 |     B5 |     B5 |    A16 |     C8 |     B5 |    D13 |     C8 |    E17 | 5
updateSpecAssetWarning                      A12 |    A12 |    A12 |    A12 |    A12 |      - |    A12 |    A12 |    A12 |      - |      - | 1
resolveAssetSpec                            A65 |    A65 |    A65 |    A65 |    A65 |      - |    A65 |    B74 |    B74 |      - |      - | 2
loadImagesForTemplate                      A106 |   B116 |   C108 |   D120 |   D120 |    E86 |   F133 |   D120 |   D120 |   G111 |   H129 | 8
findLocalAssetFile                          A13 |    B13 |   C100 |   D118 |   D118 |    E12 |   F123 |   D118 |   D118 |   G113 |   D118 | 7
loadAssetFolder                             A37 |    A37 |    B45 |    B45 |    B45 |    A37 |    B45 |    B45 |    B45 |    B45 |    B45 | 2
loadTemplateFolder                          A61 |    A61 |    B21 |    C33 |    C33 |    D60 |    C33 |    C33 |    E34 |    F31 |    G33 | 7
setResolvedAssetMetadata                      - |      - |      - |    A42 |    A42 |      - |    A42 |    A42 |    A42 |    A42 |    A42 | 1
recordAssetLoadDiagnostic                     - |      - |      - |      - |      - |      - |    A21 |      - |      - |    A21 |      - | 1
captureRenderModel                            - |      - |      - |      - |      - |      - |      - |      - |      - |      - |     A6 | 1

### ExportManager
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
__module_head__                              A1 |     A1 |     A1 |     A1 |     A1 |     A1 |     A1 |     A1 |     A1 |     B2 |     A1 | 2
askImageFormat                              A39 |    A39 |    A39 |    B39 |    B39 |    C40 |    B39 |    D39 |    D39 |    E36 |    F39 | 6
export                                       A6 |     B6 |     B6 |     C6 |     C6 |     A6 |     C6 |     C6 |     C6 |     D7 |     C6 | 4
exportVisibleBatch                          A11 |    B11 |    B11 |     C7 |     C7 |    D11 |     C7 |     E9 |     E9 |     F8 |     E9 | 6
getMaterialSpecTable                        A31 |    A31 |    A31 |      - |      - |    A31 |      - |      - |      - |      - |      - | 1
resolveSpecFormat                            A7 |     A7 |     A7 |      - |      - |     A7 |      - |      - |      - |      - |      - | 1
resolveBannerSubfolder                       A6 |     A6 |     A6 |     B8 |     B8 |     A6 |     B8 |      - |      - |      - |      - | 2
buildZip                                   A123 |    B87 |   C140 |   D128 |   D128 |   E137 |   D128 |   F128 |   G119 |   H132 |   I122 | 9
canvasToBlob                                A11 |    A11 |    A11 |    A11 |    A11 |    A11 |    A11 |    A11 |      - |    A11 |    B13 | 2
exportJSON                                   A9 |     A9 |     A9 |    B12 |    B12 |     A9 |    B12 |    B12 |    B12 |    B12 |    B12 | 2
normalizeArchiveMediaName                     - |      - |      - |    A15 |    A15 |      - |    A15 |      - |      - |      - |      - | 1
resolveArchiveMedia                           - |      - |      - |     A7 |     A7 |      - |     A7 |      - |      - |      - |      - | 1
resolveArchiveFolder                          - |      - |      - |     A6 |     A6 |      - |     A6 |     B8 |     B8 |      - |     B8 | 2
resolveRecommendedFormat                      - |      - |      - |     A4 |     A4 |      - |     B7 |     C5 |     C5 |      - |     C5 | 3
sanitizeFolderSegment                         - |      - |      - |      - |      - |      - |      - |     A4 |     A4 |      - |     A4 | 1
resolveTemplateFormat                         - |      - |      - |      - |      - |      - |      - |      - |      - |     A7 |      - | 1
findMissingVisibleAssets                      - |      - |      - |      - |      - |      - |      - |      - |      - |     A7 |      - | 1
compressCanvasToLimit                         - |      - |      - |      - |      - |      - |      - |      - |      - |    A45 |    B54 | 2
formatBytes                                   - |      - |      - |      - |      - |      - |      - |      - |      - |     A6 |      - | 1
buildDiagnosticText                           - |      - |      - |      - |      - |      - |      - |      - |      - |    A47 |      - | 1

### Renderer
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
_drawLayers                                 A26 |    A26 |    A26 |    A26 |    B26 |    A26 |    B26 |    A26 |    C30 |    D15 |    A26 | 4
drawPlacementGuide                          A14 |    A14 |    A14 |    A14 |    A14 |    A14 |    A14 |    A14 |    A14 |      - |    A14 | 1
render                                      A18 |    A18 |    B19 |    B19 |    B19 |    A18 |    B19 |    B19 |    B19 |    B19 |    B19 | 2
renderSceneTo                                A6 |     A6 |     B7 |     B7 |     B7 |     A6 |     B7 |     B7 |     B7 |     B7 |     B7 | 2
drawShape                                   A73 |    A73 |    A73 |    A73 |    A73 |    A73 |    A73 |    A73 |    B25 |    A73 |    A73 | 2
drawText                                   A118 |   A118 |    B83 |   A118 |   A118 |   A118 |   C162 |   A118 |   A118 |   C162 |   A118 | 3
isTextBottomAligned                          A4 |     A4 |      - |     A4 |     A4 |     A4 |     A4 |     A4 |     A4 |     A4 |     A4 | 1
isTextSourceBaselineAligned                  A4 |     A4 |      - |     A4 |     A4 |     A4 |     A4 |     A4 |     A4 |     A4 |     A4 | 1
getSourceTextBaseline                       A11 |    A11 |      - |    A11 |    A11 |    A11 |    A11 |    A11 |    A11 |    A11 |    A11 | 1
getStyledLineInkMetrics                     A23 |    A23 |      - |    A23 |    A23 |    A23 |    A23 |    A23 |    A23 |    A23 |    A23 | 1
shouldUseOriginalStyledBaseline              A9 |     A9 |      - |     A9 |     A9 |     A9 |     A9 |     A9 |     A9 |     A9 |     A9 | 1
getOriginalTextBaseline                     A15 |    A15 |      - |    A15 |    A15 |    A15 |    A15 |    A15 |    A15 |    A15 |    A15 | 1
drawStyledTextLine                          A57 |    A57 |    B73 |    A57 |    C69 |    A57 |    C69 |    A57 |    A57 |    C69 |    A57 | 3
measureRenderedTextWidth                    A16 |    A16 |      - |    A16 |    A16 |    A16 |    B16 |    A16 |    A16 |    B16 |    A16 | 2
drawTextCaret                               A45 |    A45 |    B29 |    A45 |    A45 |    A45 |    A45 |    A45 |    A45 |    A45 |    A45 | 2
findLayerByCanonicalName                     A6 |     A6 |     A6 |     A6 |     A6 |     A6 |     A6 |     A6 |     B9 |     A6 |    C12 | 3
applyImageMask                              A15 |    A15 |    A15 |    A15 |    A15 |    A15 |    A15 |    A15 |      - |    A15 |    B20 | 2
drawImage                                   A47 |    A47 |    A47 |    A47 |    B53 |    C60 |    B53 |    D42 |    E41 |    A47 |    F56 | 6
drawSelection                               A49 |    B49 |    B48 |    B48 |    C48 |    A49 |    C48 |    B48 |    B48 |    C48 |    B48 | 3
shouldCenterStyledTextByFirstSegment          - |      - |     A7 |      - |      - |      - |      - |      - |      - |      - |      - | 1
fitTextLayerToInk                             - |      - |      - |      - |    A58 |      - |    B58 |      - |      - |    B58 |      - | 2
measureRenderedTextInkBounds                  - |      - |      - |      - |      - |   A105 |      - |      - |      - |      - |      - | 1
applyLayerMask                                - |      - |      - |      - |      - |      - |      - |      - |    A16 |      - |      - | 1
clipToBottomEdge                              - |      - |      - |      - |      - |      - |      - |      - |      - |      - |    A47 | 1
applyShadowMask                               - |      - |      - |      - |      - |      - |      - |      - |      - |      - |    A15 | 1

### BatchManager
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
__module_head__                              A7 |     A7 |     B8 |     B8 |     B8 |     A7 |     B8 |     B8 |     C8 |     D7 |     B8 | 4
sheetToRowsWithMergedFill                   A76 |    A76 |    B69 |    B69 |    C76 |    A76 |    C76 |    B69 |    B69 |    D82 |    B69 | 4
handleExcelFile                             A28 |    A28 |    B22 |    B22 |    B22 |    A28 |    B22 |    B22 |    B22 |    C20 |    B22 | 3
generateFromSelectedSheet                  A125 |   A125 |   A125 |   B127 |   B127 |   C108 |   B127 |   D127 |   D127 |   E109 |   F110 | 6
generateForCurrentProject                   A95 |    A95 |    B78 |    B78 |    C95 |    D94 |    C95 |    B78 |    B78 |    E97 |    B78 | 5
normalizeOutputSuffix                       A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |     B8 |    A16 | 2
detectMatrixProjectNames                    A30 |    A30 |    A30 |    A30 |    A30 |    B28 |    A30 |    A30 |    A30 |      - |    A30 | 2
detectAndOfferProjectsFromSheet             A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |      - |    A16 | 1
parseMatrixSheet                           A106 |   A106 |   A106 |   A106 |   A106 |   A106 |   A106 |   A106 |   A106 |      - |   A106 | 1
parseRows                                  A293 |   A293 |   B284 |   B284 |   B284 |   C281 |   B284 |   B284 |   D338 |    E24 |   B284 | 5
resolveRecordTemplateRoutes                 A18 |    A18 |      - |      - |      - |    A18 |      - |      - |      - |      - |      - | 1
resolveRecordTemplateRoute                  A36 |    A36 |    A36 |    A36 |    A36 |    B20 |    A36 |    C35 |    C35 |    D35 |    C35 | 4
readRecordFromRow                           A49 |    A49 |    A49 |    A49 |    A49 |    B49 |    A49 |    A49 |    C54 |      - |    A49 | 3
ensureTemplateForRoute                       A7 |     A7 |     B7 |     B7 |     B7 |     A7 |     B7 |     B7 |     B7 |     B7 |     B7 | 2
findTemplateForRoute                        A17 |    A17 |    B54 |    B54 |    B54 |    A17 |    B54 |    B54 |    B54 |    C54 |    B54 | 3
findTemplateRuleForName                     A12 |    A12 |     B6 |     B6 |     B6 |    A12 |     B6 |     B6 |     B6 |     B6 |     B6 | 2
findTemplateForName                         A22 |    A22 |    B27 |    B27 |    B27 |    C22 |    B27 |    B27 |    B27 |    B27 |    B27 | 3
normalizeTemplateIdentity                    A3 |     A3 |     B3 |     B3 |     B3 |     A3 |     C5 |     B3 |     B3 |     D5 |     B3 | 4
findTemplateByDirectName                     A5 |     A5 |    B13 |    B13 |    B13 |      - |    C17 |    B13 |    B13 |    C17 |    B13 | 3
makeOutputPrefix                             A6 |     A6 |     A6 |     A6 |     A6 |     B5 |     A6 |     A6 |     A6 |     A6 |     A6 | 2
applyTemplateRuleHook                       A34 |    A34 |    B33 |    B33 |    B33 |    C34 |    B33 |    B33 |    D46 |    B33 |    B33 | 4
captureTemplateGeometry                     A22 |    A22 |      - |      - |      - |      - |      - |      - |      - |      - |      - | 1
restoreTemplateGeometry                     A16 |    A16 |      - |      - |      - |      - |      - |      - |      - |      - |      - | 1
prepareDynamicProductLayers                A109 |   A109 |   A109 |   A109 |   A109 |   B109 |   A109 |   A109 |   A109 |   A109 |   A109 | 2
applyRecordToTemplate                      A223 |   A223 |   B175 |   C183 |   C183 |   D240 |   C183 |   C183 |   C183 |   E181 |   F186 | 6
getTemplateAssetPrefix                       A7 |     A7 |     A7 |     A7 |     A7 |      - |     A7 |     A7 |     A7 |     A7 |     A7 | 1
findAssetFilename                           A15 |    B15 |    C73 |    C73 |    C73 |    D14 |    E80 |    C73 |    C73 |    F72 |    C73 | 6
resolveAssetFilename                         A5 |     A5 |     A5 |     A5 |     A5 |      - |     A5 |     A5 |     A5 |     A5 |     A5 | 1
renderBatchUI                               A69 |    A69 |    B69 |    B69 |    B69 |    A69 |    B69 |    B69 |    B69 |    B69 |    B69 | 2
selectGenerated                             A25 |    A25 |    B21 |    C23 |    C23 |    A25 |    C23 |    C23 |    C23 |    D22 |    C23 | 4
clearBatch                                  A24 |    A24 |    B18 |    B18 |    B18 |    A24 |    B18 |    B18 |    B18 |    B18 |    B18 | 2
renderPreviewPlaceholders                   A18 |    A18 |    A18 |    A18 |    A18 |    B36 |    A18 |    A18 |    A18 |    A18 |    A18 | 2
waitForPreviewFrame                         A23 |    A23 |     B6 |     B6 |     B6 |      - |     B6 |     B6 |     B6 |     B6 |     B6 | 2
refreshPreviewIndexes                       A16 |    A16 |      - |      - |      - |    A16 |      - |      - |      - |      - |      - | 1
renderPreviewGrid                           A39 |    A39 |    B55 |    B55 |    B55 |    A39 |    B55 |    B55 |    B55 |    B55 |    B55 | 2
makeThumbURLFor                             A20 |    A20 |    B22 |    B22 |    C22 |    D16 |    C22 |    B22 |    B22 |    E18 |    F18 | 6
renderThumbnailForTemplate                   A8 |     A8 |    B11 |    C18 |    C18 |     A8 |    C18 |    C18 |    C18 |    D17 |    C18 | 4
fetchRouteTemplate                            - |      - |    A15 |    B16 |    B16 |      - |    B16 |    B16 |    C17 |    B16 |    B16 | 3
refreshTemplateFromBatchRecord                - |      - |    A18 |    B22 |    B22 |      - |    B22 |    B22 |    B22 |    C17 |    C17 | 3
refreshGeneratedTemplatesFromBatchRecords      - |      - |     A8 |     A8 |     A8 |      - |     A8 |     A8 |     A8 |     A8 |     A8 | 1
stabilizeTemplateBeforePreview                - |      - |    A36 |    B40 |    B40 |      - |    B40 |    C44 |    C44 |    D39 |    C44 | 4
refreshThumbsForIndexes                       - |      - |    A16 |    A16 |    A16 |      - |    A16 |    A16 |    A16 |    A16 |    A16 | 1
getIdentityAliasGroups                        - |      - |      - |      - |      - |      - |     A7 |      - |      - |     A7 |      - | 1
markThumbsStale                               - |      - |      - |      - |      - |      - |      - |    A20 |    A20 |      - |    A20 | 1
indexOfTemplate                               - |      - |      - |      - |      - |      - |      - |     A5 |     A5 |      - |     A5 | 1

### Interaction
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
isSmartAssetLayer                           A11 |    A11 |      - |      - |      - |    A11 |      - |      - |      - |      - |      - | 1
beginSync                                    A4 |     A4 |      - |      - |      - |     B3 |      - |      - |      - |      - |      - | 2
updateSync                                   A4 |     A4 |      - |      - |      - |     B3 |      - |      - |      - |      - |      - | 2
finishSync                                   A7 |     B4 |      - |      - |      - |     C6 |      - |      - |      - |      - |      - | 3
finalizeActiveTransform                     A14 |    A14 |      - |      - |      - |    A14 |      - |      - |      - |      - |      - | 1
bindCanvas                                  A13 |    A13 |    A13 |    A13 |    B15 |    C18 |    B15 |    D15 |    D15 |    A13 |    D15 | 4
onMouseMove                                 A27 |    A27 |    A27 |    A27 |    A27 |    B30 |    A27 |    A27 |    A27 |    A27 |    A27 | 2
onMouseDown                                 A26 |    A26 |    B22 |    B22 |    C27 |    D31 |    C27 |    E28 |    E28 |    F20 |    E28 | 6
onMouseUp                                    A6 |     A6 |    B16 |    B16 |    B16 |     C5 |    B16 |    B16 |    B16 |    D14 |    B16 | 4
resizeSelectedByWheel                       A33 |    A33 |    B36 |    C39 |    C39 |    A33 |    C39 |    D38 |    D38 |    E32 |    D38 | 5
onDoubleClick                               A14 |    A14 |    A14 |    A14 |    A14 |    B11 |    A14 |    A14 |    A14 |    B11 |    C19 | 3
replaceSpecDrivenImage                      A62 |    A62 |    B53 |    B53 |    B53 |      - |    B53 |     C5 |     C5 |      - |      - | 3
moveSelected                                A34 |    A34 |    B33 |    C36 |    C36 |    A34 |    C36 |    D35 |    D35 |    E33 |    D35 | 5
bindKeyboard                                A16 |    A16 |    B14 |    B14 |    B14 |    A16 |    B14 |    C26 |    C26 |    D14 |    E37 | 5
onCanvasDragOver                              - |      - |      - |      - |    A11 |      - |    A11 |      - |      - |      - |      - | 1
onCanvasDrop                                  - |      - |      - |      - |    A11 |      - |    A11 |      - |      - |      - |      - | 1
openUploadSlotPicker                          - |      - |      - |      - |    A14 |      - |    A14 |      - |      - |      - |      - | 1
applyUploadSlotFile                           - |      - |      - |      - |    A54 |      - |    B66 |      - |      - |      - |      - | 2
isManualUploadPlaceholder                     - |      - |      - |      - |      - |     A3 |      - |      - |      - |      - |      - | 1
isImageFile                                   - |      - |      - |      - |      - |     A3 |      - |      - |      - |      - |      - | 1
applyManualProductUpload                      - |      - |      - |      - |      - |    A48 |      - |      - |      - |      - |      - | 1
openManualUploadPicker                        - |      - |      - |      - |      - |    A16 |      - |      - |      - |      - |      - | 1
onCanvasFileDrop                              - |      - |      - |      - |      - |    A11 |      - |      - |      - |      - |      - | 1
replaceUploadSlotImage                        - |      - |      - |      - |      - |      - |      - |      - |      - |      - |     A5 | 1

### Inspector
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
render                                      A23 |    A23 |    A23 |    A23 |    A23 |    B23 |    A23 |    A23 |    A23 |    A23 |    A23 | 2
applyBoxFromInputs                          A19 |    A19 |     B9 |    C24 |    D27 |    A19 |    D27 |    E23 |    E23 |    F18 |    E23 | 6
applyTextFromInputs                         A31 |    A31 |    B31 |    C34 |    C34 |    A31 |    C34 |    D32 |    D32 |    D32 |    E35 | 5
```

## 方法級（其餘模組，只列有差異者）
```

### Geometry
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
getRenderedImageBox                         A13 |    A13 |    A13 |    A13 |    A13 |    A13 |    A13 |    A13 |    A13 |     B7 |    A13 | 2
getLayerBox                                  A6 |     B4 |     B4 |     B4 |     B4 |     A6 |     B4 |     B4 |     B4 |     B4 |     B4 | 2
getSelectionBox                             A12 |      - |      - |      - |      - |    A12 |      - |      - |      - |      - |      - | 1
applyBox                                    A34 |    A34 |    B28 |    B28 |    C33 |    D30 |    C33 |    B28 |    B28 |    E33 |    B28 | 5
handles                                     A28 |    B28 |    B28 |    B28 |    C30 |    A28 |    C30 |    B28 |    B28 |    C30 |    B28 | 3
mousePos                                     A4 |     A4 |     A4 |     A4 |     A4 |     B7 |     A4 |     A4 |     A4 |     A4 |     A4 | 2
screenRectForBox                            A13 |    A13 |    A13 |    A13 |    A13 |      - |    A13 |    A13 |    A13 |     B7 |    A13 | 2

### AssetStore
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
getFolderNames                               A5 |     A5 |     B6 |     B6 |     B6 |     C4 |    D11 |     B6 |     B6 |    D11 |     B6 | 4
getFlatForLookup                            A10 |    A10 |    B21 |    B21 |    B21 |    C14 |    D30 |    B21 |    B21 |    D30 |    B21 | 4
getFileEntries                              A23 |    A23 |    B21 |    B21 |    B21 |      - |    B21 |    B21 |    B21 |    B21 |    C25 | 3

### AssetLookup
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
__module_head__                              A1 |     A1 |      - |      - |      - |     A1 |      - |      - |      - |      - |      - | 1
_entriesForFolder                           A13 |    A13 |      - |      - |      - |    A13 |      - |      - |      - |      - |      - | 1
_folderOrder                                 A8 |     A8 |      - |      - |      - |     B8 |      - |      - |      - |      - |      - | 2
match                                       A66 |    B69 |      - |      - |      - |    C66 |      - |      - |      - |      - |      - | 3

### PriceRuleEngine
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
__module_head__                             A10 |    A10 |    A10 |    A10 |    A10 |     B9 |    A10 |    A10 |    A10 |     C9 |    A10 | 3
priceParts                                   A7 |     A7 |      - |      - |      - |     A7 |      - |      - |      - |      - |      - | 1
shouldUseDoubleCoupon                        A7 |     A7 |      - |      - |      - |     A7 |      - |      - |      - |      - |      - | 1
expandDoubleLayouts                         A38 |    A38 |      - |      - |      - |    A38 |      - |      - |      - |      - |      - | 1
classify                                    A72 |    A72 |    B68 |    B68 |    B68 |    A72 |    B68 |    B68 |    B68 |    C68 |    B68 | 3
resolveTemplateRule                         A24 |    A24 |    B21 |    B21 |    B21 |    A24 |    B21 |    B21 |    B21 |    B21 |    B21 | 2
resolveLayoutForAnchor                      A57 |    A57 |    B54 |    B54 |    B54 |    A57 |    B54 |    B54 |    B54 |    B54 |    B54 | 2

### PriceCouponManager
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
apply                                      A139 |   B102 |    C66 |    D84 |    D84 |   E137 |    D84 |    D84 |    D84 |    D84 |    D84 | 5
applyForAnchor                              A70 |    A70 |    B65 |    B65 |    B65 |    C67 |    B65 |    B65 |    B65 |    D64 |    B65 | 4
rebuildFromPricePreset                      A28 |    A28 |    A28 |    A28 |    A28 |      - |    A28 |    A28 |    A28 |    A28 |    A28 | 1

### PriceTransformEngine
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
canFollowProduct                             A8 |     A8 |     A8 |     A8 |     A8 |    B11 |     A8 |     A8 |     A8 |     A8 |     A8 | 2
syncTemplate                                A12 |    A12 |    A12 |    A12 |    A12 |      - |    A12 |    A12 |    A12 |    A12 |    A12 | 1
captureTypographyState                      A13 |    A13 |      - |      - |      - |    A13 |      - |      - |      - |      - |      - | 1
applyTypographyScale                        A22 |    A22 |      - |      - |      - |    A22 |      - |      - |      - |      - |      - | 1
setTypographyFontSize                        A7 |     A7 |      - |      - |      - |     A7 |      - |      - |      - |      - |      - | 1
syncPriceLayer                              A62 |    A62 |    B39 |    C40 |    D70 |    A62 |    D70 |    B39 |    B39 |    E69 |    B39 | 5
handleLayerBoxApplied                       A32 |    A32 |    B30 |    B30 |    C30 |    A32 |    C30 |    B30 |    B30 |    C30 |    B30 | 3
handleLayerRotationApplied                  A16 |    A16 |      - |      - |      - |    A16 |      - |      - |      - |      - |      - | 1
captureManualPriceTransform                 A37 |    A37 |    B25 |    B25 |    C48 |    A37 |    C48 |    B25 |    B25 |    C48 |    B25 | 3

### PriceLayerFactory
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
create                                      A53 |    A53 |    B46 |    C52 |    D61 |    A53 |    D61 |    E51 |    E51 |    F60 |    E51 | 6
createAnchor                                A38 |    A38 |    B28 |    B28 |    B28 |    A38 |    B28 |    B28 |    B28 |    B28 |    B28 | 2

### LayerManager
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
render                                      A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    A16 |    B15 |    A16 | 2
select                                       A7 |     A7 |     A7 |     A7 |     A7 |     A7 |     A7 |     A7 |     A7 |     B7 |     A7 | 2
toggleVisible                               A10 |    A10 |    A10 |    A10 |    A10 |    A10 |    A10 |    A10 |    A10 |    B10 |    A10 | 2
hitTest                                     A27 |    B26 |    C26 |    C26 |    D39 |    A27 |    E42 |    C26 |    C26 |    F19 |    C26 | 6
hitHandle                                    A8 |     B8 |     C8 |     C8 |     C8 |     A8 |     C8 |     C8 |     C8 |     C8 |     C8 | 3
hitUploadSlot                                 - |      - |      - |      - |    A15 |      - |    A15 |      - |      - |      - |      - | 1

### TextEditor
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
open                                        A23 |    A23 |    B42 |    B42 |    B42 |    A23 |    B42 |    B42 |    B42 |    B42 |    B42 | 2
syncFromEditor                               A9 |     A9 |    B12 |    B12 |    B12 |     A9 |    B12 |    C11 |    C11 |    C11 |    C11 | 3
_finishUi                                   A10 |    A10 |      - |      - |      - |    A10 |      - |      - |      - |      - |      - | 1
commit                                      A22 |    A22 |    B28 |    B28 |    C34 |    A22 |    C34 |    D27 |    D27 |    E30 |    F28 | 6
cancel                                      A10 |    A10 |    B20 |    B20 |    B20 |    A10 |    B20 |    C19 |    C19 |    C19 |    C19 | 3

### App
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
init                                         A8 |     A8 |     A8 |     A8 |     A8 |     A8 |     A8 |     A8 |     A8 |     A8 |     B8 | 2
bindUI                                     A198 |   A198 |   B192 |   C196 |   C196 |   D196 |   C196 |   E194 |   E194 |   F181 |   G195 | 7

### HistoryManager
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
_snapshot                                    A5 |     A5 |      - |      - |      - |     A5 |      - |      - |      - |      - |      - | 1
_capture                                     A3 |     A3 |      - |      - |      - |     A3 |      - |      - |      - |      - |      - | 1
_restore                                    A18 |    A18 |      - |      - |      - |    A18 |      - |      - |      - |      - |      - | 1
push                                        A11 |    A11 |    B14 |    B14 |    B14 |    A11 |    B14 |    B14 |    B14 |     C6 |    B14 | 3
pushCoalesced                                A8 |     A8 |      - |      - |      - |     A8 |      - |      - |      - |      - |      - | 1
pushSnapshot                                 A3 |     A3 |      - |      - |      - |     A3 |      - |      - |      - |      - |      - | 1
attachExtra                                 A10 |    A10 |     B4 |     B4 |     B4 |    A10 |     B4 |     B4 |     B4 |      - |     B4 | 2
attachSmartAssetState                        A5 |     A5 |      - |      - |      - |     A5 |      - |      - |      - |      - |      - | 1
undo                                         A9 |     A9 |    B12 |    B12 |    B12 |     A9 |    B12 |    B12 |    B12 |     C9 |    B12 | 3
redo                                         A7 |     A7 |    B14 |    B14 |    B14 |     A7 |    B14 |    B14 |    B14 |    C11 |    B14 | 3
clear                                        A9 |     A9 |      - |      - |      - |     A9 |      - |      - |      - |      - |      - | 1
swapExtra                                     - |      - |     A9 |     A9 |     A9 |      - |     A9 |     A9 |     A9 |      - |     A9 | 1

### CapsuleRuleEngine
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
getTemplateFamily                           A31 |    A31 |    A31 |    A31 |    A31 |    B27 |    A31 |    A31 |    A31 |    A31 |    A31 | 2
measureTextWidth                            A19 |    A19 |    A19 |    A19 |    A19 |    B16 |    C19 |    A19 |    A19 |    C19 |    A19 | 3
buildLayer                                  A68 |    A68 |    A68 |    A68 |    A68 |    B41 |    A68 |    A68 |    A68 |    A68 |    A68 | 2

### LayoutRuleEngine
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
apply                                       A25 |    A25 |    A25 |    A25 |    A25 |    B22 |    A25 |    A25 |    A25 |    C24 |    A25 | 3

### SpecOverlayManager
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
getTemplateSpecKeyword                      A22 |    A22 |    A22 |    A22 |    A22 |    B21 |    A22 |    A22 |    A22 |    C22 |    A22 | 3
getAllowedSpecFilenames                     A13 |    A13 |    A13 |    A13 |    A13 |    B12 |    A13 |    A13 |    A13 |    B12 |    C13 | 3
getCandidateFilenames                        A7 |     A7 |     A7 |     A7 |     A7 |     A7 |     A7 |     A7 |     A7 |     B7 |     A7 | 2

### TextBaselineModel
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
__module_head__                              A6 |     A6 |      - |     A6 |     A6 |     A6 |     A6 |     A6 |     A6 |     A6 |     A6 | 1
normalizeText                                A7 |     A7 |      - |     A7 |     A7 |     A7 |    B10 |     A7 |     A7 |    B10 |     A7 | 2
waitForFonts                                A18 |    A18 |      - |    A18 |    A18 |    A18 |    A18 |    A18 |    A18 |    A18 |    A18 | 1
getMeasureContext                            A5 |     A5 |      - |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 | 1
fontForReference                            A12 |    A12 |      - |    A12 |    A12 |    A12 |    A12 |    A12 |    A12 |    A12 |    A12 | 1
measureInk                                  A31 |    A31 |      - |    A31 |    A31 |    A31 |    A31 |    A31 |    A31 |    A31 |    A31 | 1
getSourceValues                             A24 |    A24 |      - |    A24 |    A24 |    A24 |    A24 |    A24 |    A24 |    A24 |    A24 | 1
createReference                             A28 |    A28 |      - |    A28 |    A28 |    A28 |    A28 |    A28 |    A28 |    A28 |    A28 | 1
captureLayer                                A10 |    A10 |      - |    A10 |    A10 |    A10 |    A10 |    A10 |    A10 |    A10 |    A10 | 1
captureTemplate                              A5 |     A5 |      - |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 | 1
prepareTemplate                              A5 |     A5 |      - |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 |     A5 | 1
isSourceMode                                A11 |    A11 |      - |    A12 |    A12 |    A11 |    A12 |    A12 |    A12 |    A12 |    A12 | 1

### AssetSyncHub
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
__module_head__                              A2 |     A2 |     A2 |     A2 |     A2 |      - |     A2 |     A2 |     A2 |      - |     A2 | 1
register                                     A4 |     A4 |     A4 |     A4 |     A4 |      - |     A4 |     A4 |     A4 |      - |     A4 | 1
unregister                                   A3 |     A3 |     A3 |     A3 |     A3 |      - |     A3 |     A3 |     A3 |      - |     A3 | 1
shouldSkipProduct                            A4 |     A4 |      - |     A4 |     A4 |      - |     A4 |     A4 |     A4 |      - |     B6 | 2
begin                                        A4 |     A4 |     B3 |     A4 |     A4 |      - |     A4 |     A4 |     A4 |      - |     C4 | 3
update                                       A4 |     A4 |     B3 |     A4 |     A4 |      - |     A4 |     A4 |     A4 |      - |     C4 | 3
finish                                       A7 |     A7 |     B6 |     A7 |     A7 |      - |     A7 |    C13 |    D13 |      - |    E13 | 5
shouldSkip                                    - |      - |      - |      - |      - |      - |      - |      - |      - |      - |     A3 | 1

### SnapshotManager
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
__module_head__                               - |      - |      - |    A14 |    A14 |      - |    A14 |    A14 |    A14 |    A14 |    A14 | 1
isSnapshot                                    - |      - |      - |     A8 |     A8 |      - |     A8 |     A8 |     A8 |     A8 |     A8 | 1
sourceTemplateId                              - |      - |      - |    A11 |    A11 |      - |    A11 |    A11 |    A11 |    A11 |    A11 | 1
cleanValue                                    - |      - |      - |    A17 |    A17 |      - |    A17 |    A17 |    A17 |    A17 |    A17 | 1
createSnapshot                                - |      - |      - |    A18 |    A18 |      - |    A18 |    A18 |    A18 |    B16 |    A18 | 2
prepareLoadedSnapshot                         - |      - |      - |    A15 |    A15 |      - |    A15 |    A15 |    A15 |    A15 |    A15 | 1
shouldProtectVisualState                      - |      - |      - |     A6 |     A6 |      - |     A6 |     A6 |     A6 |     A6 |     A6 | 1

### ManualAssetUpload
method                                     正式BN |   暖身BN |     KV |  OM_w1 |  OM_w2 |     MS | LineOA | network |    AMS |     鏡面 |     跨夜 | ver
__module_head__                               - |      - |      - |      - |      - |      - |      - |     A6 |     A6 |      - |     A6 | 1
configure                                     - |      - |      - |      - |      - |      - |      - |     A3 |     A3 |      - |     A3 | 1
isUploadSlot                                  - |      - |      - |      - |      - |      - |      - |     A6 |     B9 |      - |     A6 | 2
drawSlot                                      - |      - |      - |      - |      - |      - |      - |    A30 |    A30 |      - |    A30 | 1
groupUsages                                   - |      - |      - |      - |      - |      - |      - |    A18 |    A18 |      - |    B24 | 2
registerFile                                  - |      - |      - |      - |      - |      - |      - |    A10 |    A10 |      - |    A10 | 1
applyFile                                     - |      - |      - |      - |      - |      - |      - |    A41 |    A41 |      - |    A41 | 1
canClear                                      - |      - |      - |      - |      - |      - |      - |     A7 |     A7 |      - |     B8 | 2
clearAsset                                    - |      - |      - |      - |      - |      - |      - |    A31 |    A31 |      - |    A31 | 1
pickFile                                      - |      - |      - |      - |      - |      - |      - |    A16 |    A16 |      - |    A16 | 1
slotAt                                        - |      - |      - |      - |      - |      - |      - |     A8 |     A8 |      - |     A8 | 1
bindDropZone                                  - |      - |      - |      - |      - |      - |      - |    A34 |    A34 |      - |    A34 | 1
```
