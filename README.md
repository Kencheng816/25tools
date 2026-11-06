# 25節Tool 整合版

把 11 個 25節產圖工具（正式BN、暖身BN、KV、外廣OM wave1/wave2、暖正MS、Line OA、Affiliate network、Line購物AMS、鏡面、跨夜直播）整合成單一入口，輸出與原工具零像素差異。

## 使用
1. 直接雙擊 `index.html` 開啟入口頁即可（不需伺服器、不需安裝；設定檔與公版全部用 `<script>` 載入，`file://` 下可正常運作）。放到 GitHub Pages 也一樣。入口頁只有工具卡片（KV、暖身 BN、正式 BN、暖正 MS、外廣 OM、Line OA、Affiliate network、Line購物 AMS、跨夜 鏡面、跨夜直播宣傳圖）：點卡片開該工具的獨立頁面 `app.html?profile=<分類>`；「外廣 OM」一張卡片包 Wave 1／Wave 2（`app.html?group=OM`），匯入工單時依分頁自動選版本。
2. 進工具頁後公版已內建載好（`templates/<分類>/_bundle.js`），畫布先蓋著「尚未匯入工單」，並自動跳出**匯入工單**彈窗（關掉後可按頂部列「⬆ 匯入工單」再開）：拖曳或點選工單 Excel → 選分頁（打 ✓ 的才是這個工具的分頁；分頁名完全等於關鍵字的優先，像「CopyRita原本的Line OA」這種備份頁不會被選到）→ 拖曳或點選素材資料夾（可選）→ 確認匯入，工具自己跑完「素材 → 工單 → 產生所有預覽」。也可從彈窗「載入存檔」回到上次的狀態。
3. 左欄：**調整**（目前選到那張的文案欄位、每格旁一顆色票；品牌 LOGO／商品各一顆按鈕開編輯視窗）、**製作物清單**（依製作內容分組、可勾選要下載的）、**圖層**（進階模式才顯示）。頂部列右側 ⚙ 是**進階模式**：打開才有「輸出 JSON」、圖層清單、逐層微調（XY 寬高／字級）、格線、診斷摘要與右側診斷面板（依版位分卡：有問題的版位／沒做出來的／解析資訊，點卡片跳到那張、可下載 診斷報告.txt）。
4. 文案：在調整面板的欄位直接打字（畫布即時更新，放開才更新縮圖）、色票改顏色；或在畫布雙擊文字層編輯（Enter 換行、Ctrl+Enter 貼合、Esc 還原）。**手動改過的那一張就以畫面為準**：下載／縮圖不再重套工單，規則重畫也不會把字和顏色抄回工單。A 系公版（正式BN／暖身BN／MS）的文字層帶逐段樣式，改顏色會連每一段一起換（`modules/text-color-ranges.js`）。
5. 商品：「編輯商品」開合成視窗（做法與 Circle 編輯器相同）：拖曳、拉角縮放、旋轉、陰影（預設開、光源左／中／右）、去背（橡皮擦／裁切／自動去背／點色）、換圖；確認後烤成一張 PNG 放回商品層，價格依「券」在合成圖裡的位置與大小等比貼回；「還原自動排版」回到合成前（單一商品連智慧物件掛載一起還原，下載與自動產圖逐 byte 相同）。暖身BN 的工單「商品圖1」可寫「A + B」（半形／全形＋，例「免運車 + 禮物盒icon」）：拆成兩層自動排（2 張一大一小、3 張三角、其他並排）、各自可調；**名字含「券」的組合不拆**（25節 券面一律整張素材、價格由價格引擎依整張券算）。
6. 素材：選取任何圖片圖層後，進階的圖層微調區有「素材庫」「上傳替換」「清除圖片」（右鍵圖層或按 L 也可開素材庫；拖圖檔到畫布圖層、Delete 清除）；上傳的圖會先裁掉透明邊再等比貼合原外框。同版型、同素材的圖層會跨版位連動（工具列「連動」開關或 D 鍵可單張斷開；A 系也有）。選到價格層或票券圖層時有「票券類型」：換票券素材會依新素材重算價格（單／雙券三層判讀、沒有「券」不顯示價格、`_有價格` 移除價格層）。
7. 下載圖片：頂部列「下載圖片」直接依工單規則輸出（不再跳格式視窗），ZIP 內除圖片外另附「存檔/」與「診斷報告.txt」；成品有透明像素就自動存 PNG。**正式BN／暖身BN 的資料夾與檔名依工單**（`export.folderStrategy=workOrderContent`）：資料夾＝工單製作內容由上而下編號（`01_頭巾/`、`02_HBN/`、`05_SKBN_APP/`…），檔名＝`製作內容[_變體]_編號[_尾綴]`，編號取工單「編號」欄的代碼（`HBN_260525HBN13.jpg`、`SKBN_APP_中_260525SKBN01.jpg`），頭巾這類沒有編號欄的用「備註」出圖編號（`頭巾_01_點我領.png`），都沒有才用流水號；縮圖與製作物清單顯示同一個名字。其他工具維持各自原本的歸檔方式。
8. 「儲存存檔」把目前所有圖的最終狀態＋工單＋公版＋用到的素材打包成 `<分類>_<分頁>_<時間>.25tool.zip`，從匯入彈窗「載入存檔」載回可繼續微調、再存、再下載（載回時以畫面為準，不重跑規則）。「重置」整頁重來。
9. **新手導覽**：第一次開工具頁會自動用一份內建的範例工單跑 15 步教學（聚光燈＋說明＋假游標示範：匯入、雙擊改字、滾輪縮放／拖曳／旋轉、右鍵換素材、色票、編輯商品、進階、存檔、下載），結束會清掉範例回到匯入視窗；頂部列「使用教學」可重看，網址加 `?tour` 強制再跑、`?tour=0` 不跑。只在單一分類頁自動跑（外廣 OM 群組頁不會）。
10. 效能：字型先抓 GitHub raw 的 WOFF2（`config/fonts.js`），抓不到退回內建 TTF；線上版（http）有 Service Worker（`sw.js`），第二次開頁幾乎不用重新下載，有新版本時底部會提示重新整理。

## 結構
```
index.html                 入口頁（工具卡片；launcher/、config/tools.js）
app.html                   工具頁（?profile=<分類> 或 ?group=<卡片>；頂部列＋左欄 調整／製作物清單／圖層）
style.css／theme-25.css   工具頁樣式；theme-25.css 是深色主題覆寫層（載在最後；§1–7 主題、§8 更新提示、§9 棋盤格、§10 診斷卡、§11 匯入彈窗、§12 頂部列／進階、§13 調整面板、§14 LOGO 視窗、§15 合成視窗、券面視窗）
sw.js／core/sw-register.js Service Worker（只在 http／https 註冊；localhost／file:// 不註冊，?sw=1 強制）
config/fonts.js            字型來源（遠端 WOFF2 → 內建 TTF；?fonts=local 強制內建）
config/tools.js            入口頁卡片登錄表（id／label／group／profiles）
core/bootstrap.js          工具頁啟動（?profile／?group → 啟用分類 → 載內建公版 → 交給 core；window.ToolBootstrap 給匯入彈窗用）
core/app.core.js           統一 core（以正式BN V0.8 為底，加法合併；A／B 兩套實作）
core/profile-loader.js     依分類合併旗標三層、預抓並依序載入 rules／core／模組
core/session-archive.js    存檔（.25tool.zip）儲存／載回
core/work-order-content-planner.js  依工單「製作內容」規劃資料夾與檔名（workOrderContent）
modules/import-flow.js     匯入工單彈窗（工單＋素材一次套用、自動產預覽、空狀態、自動跳窗一次）
modules/topbar.js          頂部列：進階模式（localStorage 25tool_advanced）、下載直接依工單規則、匯入前反灰
modules/project-tabs.js    批次預覽的專案分頁（一份工單多專案時）
modules/adjust-panel.js    調整面板：文案欄位＋色票、品牌 LOGO／商品按鈕
modules/manual-override-guard.js  手動改過的製作物以畫面為準；規則重畫不蓋手動的文字／顏色／字級
modules/text-color-ranges.js  改文字顏色連 textStyleRanges 每段一起換（A 系公版）
modules/product-composer.js  編輯商品合成視窗（vendor/circle/ 三支 Circle 原檔：拖曳縮放旋轉／陰影／去背）
modules/multi-product.js   工單「A + B」多張商品自動排版（旗標 batch.multiProductSplit；含「券」不拆）
modules/logo-editor.js     編輯 LOGO 視窗（底色／縮放／位置，烤成 PNG 放回）
modules/coupon-slots.js／coupon-slot-editor.js  券面價格範圍定義（進階；目前沒有定義，config/coupon-price-slots.js 為空）
modules/record-number-naming.js  工單「編號」欄 → 檔名與縮圖名稱（搭配 planner）
modules/link-sync-ui-a.js  A 系的「連動」開關與 D 鍵
modules/tour.js            新手導覽（引擎照 Mall-SKBN tour.js；步驟在 STEPS）；tour/tour-sample-data.js 範例工單＋素材（npm run build:tour-sample 重做）
modules/manual-asset-controls.js  任何圖片圖層的上傳替換／清除（手動紀錄 __manualAssetOverrides）
modules/text-editing-ux.js  畫布文字編輯：游標在插入點、點擊定位、拖曳反白、Enter 換行、文字框隨文字貼合
modules/text-float-toolbar.js  文字浮動工具列（字級／粗體／顏色／對齊／行距）
modules/thumb-sync.js      主畫布改了 → 該張縮圖灰化，放開滑鼠後重畫
modules/layer-lock-defaults.js  layers.lockOnLoadPatterns（預設 *kv_bg*）的圖層第一次出現就鎖定
modules/asset-link-sync.js  同版型、同素材的圖層跨版位連動（sync.assetLink）
modules/product-group-sync.js  商品圖↔價格等比連動（智慧物件引擎接管的商品圖由引擎處理）
modules/multi-select.js    Shift 多選
modules/shortcut-help.js   工具列「⌨ 快捷鍵」卡片
modules/diagnostics-panel.js  左欄診斷摘要＋右側診斷面板（依版位分卡；進階模式）
modules/diagnostics-report.js  診斷彙整四級分類（旗標 diagnostics.skipBlocks／mutedWarnings；文字超出框分三級：超畫布／超框 50%＝橘、小幅超框＝資訊＋工單字數建議、公版範例本身超框不報）
modules/coupon-price-sync.js  換票券素材後價格重算
modules/asset-library.js   素材庫
config/coupon-catalog.js   票券型錄；modules/coupon-controls.js 為其 Inspector／換圖入口
core/template-rules.loader.js  規則登錄器＋逐支載入
config/profiles/           _defaults.js（共用＋family 預設）＋每個分類一份 <分類>.profile.js；flags.registry.json 為旗標登錄表
rules/shared/、rules/<分類>/  規則檔（含 rules.manifest.js）
templates/<分類>/          公版 JSON＋_bundle.js（內建公版；JSON 改了要跑 npm run bundle:templates）
assets/<分類>/             素材（回歸輸入；使用者也可直接拿來匯入）
vendor/                    jszip、xlsx 本機副本；vendor/circle/ Circle 編輯器原檔
tests/golden/              黃金樣本（README.md 有每次有意重拍的紀錄）
tests/golden-inputs/       黃金樣本用的工單
tests/run-golden/          整合版回歸
docs/上傳步驟.md           第一次 push／GitHub Pages／GitHub Actions
```

## 運作方式（給要改程式的人）
- **一份 core、兩套實作**：`core/app.core.js` 內 17 個模組各有 A 系（正式BN 為底）與 B 系（外廣 wave1 為底）兩份實作，開頁時依分類的 `family` 用 `pickLineage` 選一份；其餘差異用旗標 `flag('群組.名稱', 預設)` 控制。加功能請走「加法」：新行為放在旗標後面，預設值＝原行為。
- **分類（profile）**：`config/profiles/<分類>.profile.js` 只放與 `_defaults.js`（共用＋family 預設）不同的旗標，加上 `rulesNamespace`、`coreScripts`（要載哪些引擎變體）、`templatesDir`／`assetsDir`、`sheetHints`（工單分頁名關鍵字）。所有旗標的說明在 `config/profiles/flags.registry.json`。
- **啟動順序**（`core/profile-loader.js`）：決定分類 → 載 `rules/<分類>/rules.manifest.js` → `core/template-rules.loader.js` 逐支載規則（`rulesAfterCore` 的分類改在 core 之後載）→ 分類專屬 scripts → core 與引擎模組 → `App.init()`。切換分類＝重新載入頁面。
- **手動操作不會被自動流程蓋掉**：手動換圖／清除記在 `template.__manualAssetOverrides`、票券手動指定記在 `template.__couponOverrides`、文字層的手動修改（內容／字級／顏色／位置…）記在 `template.__manualTextOverrides`（做法是「套版後記基線、主畫布重繪時比對」，不用攔每個編輯入口），`applyRecordToTemplate` 尾端與 `afterApplyRecordToTemplate` 鉤子之後一律套回；三者都跟著存檔。手動改了哪張，那張縮圖 0.4 秒後自動重畫。
- **新增一個分類**：新增 `rules/<分類>/`（含 `rules.manifest.js`）、`templates/<分類>/`、`config/profiles/<分類>.profile.js` 並在 `index.js` 登錄；把該分類的一份工單放進 `tests/golden-inputs/`、原工具產出放進 `tests/golden/`，在 `tests/run-golden/cases.json` 加一筆。跑 `node tests/check-manifests.js` 確認引用都存在。

## 回歸測試
所有測試都用 headless Chromium 走跟使用者一樣的操作（上傳公版／素材／工單 → 預覽 → 下載），黃金類比對輸出圖是否與 `tests/golden/` 位元組相同；互動類用真實滑鼠／鍵盤操作畫布驗證功能。
```bash
npm install                     # 只裝測試相依（工具本身是純靜態網頁，不需建置）
export NODE_PATH=$PWD/node_modules GOLDEN_WORK_DIR=/tmp/golden-work   # 工作目錄須為純 ASCII 路徑（CDP 檔案上傳對 # 與中文路徑失效）
npm run check                   # 不開瀏覽器：manifest／profile／入口頁卡片表檢查＋票券型錄一致性＋LFS 指標檔／.nojekyll 檢查＋公版 bundle 同步
npm run bundle:templates        # 公版 JSON 改了之後重打包 templates/<分類>/_bundle.js
npm run test:launcher           # 入口頁卡片→工具頁（公版內建、空狀態、自動跳窗、版面健檢）、OM 群組彈窗選分頁產圖、Line OA 精準分頁（http 與 file:// 各跑一次）
npm run test:golden             # 黃金回歸（12 案例）
npm run test:click-export       # 黃金回歸＋逐張點縮圖再下載（--click-thumbs）
node tests/run-golden/run-golden.js --import-flow   # 走使用者實際用的匯入彈窗路徑，輸出要與黃金逐 byte 相同
npm run test:roundtrip          # 存檔往返
npm run test:manual-assets      # 手動素材：替換一層＋清除一層
npm run test:manual-fit         # 手動上傳貼合
npm run test:text-edit          # 文字（Inspector 改字）
npm run test:text-ux            # 文字（畫布）
npm run test:interaction        # 互動六項
npm run test:asset-library      # 素材庫
npm run test:coupon             # 票券型錄
npm run test:coupon-price       # 換票券→價格重算
npm run test:export-bundle      # 下載：直接依工單規則、zip 附存檔＋診斷報告
npm run test:diagnostics        # 診斷面板（依版位分卡；先開進階模式）
npm run test:tour               # 新手導覽：?tour=1 自動開始、每步打亮與示範、完成後清掉範例回到匯入視窗；沒有 ?tour 的自動化環境不自動跑
npm run test:edit-flows         # 手動編輯流程：改主標／改副標顏色進下載、其他張不變、存檔往返；商品合成 0.6 倍價格跟著縮／還原回黃金；「A + B」拆與不拆
node tests/run-golden/run-golden.js --case "正式BN/BN 正式"   # 單一案例
node tests/run-golden/run-golden.js --batch 1/4               # 分批跑（單次執行有時間上限的環境）
node tests/run-golden/run-golden.js --case "暖身BN/BN 暖身" --update-golden   # 輸出有意改變時重拍黃金（只寫差異檔；要在 tests/golden/README.md 記原因）
```
通過條件：每張輸出圖與 `tests/golden/.../images/` 位元組相同；差異圖與存檔樣本寫到 `tests/golden-diff/`（已 gitignore）。
CI：GitHub 用 `.github/workflows/ci.yml`（`check` 每次 push 都跑；`golden` 在 main 自動跑、其他分支可手動 Run workflow；黃金是在 Ubuntu 22.04 的 Chromium 拍的，golden job 固定跑 ubuntu-22.04 並裝同一組字型套件），GitLab 用 `.gitlab-ci.yml`。

## 上 GitHub／GitLab
2026-10-14 起**不使用 Git LFS**（與 18節 整合版同一做法）：GitHub Pages 與「Download ZIP」拿到的 LFS 檔是幾行文字的指標檔，不是真檔，字型變指標時瀏覽器會悄悄退回系統字型、產圖字體全錯；整個 repo 約 490MB、單檔最大 72MB，一般 git 放得下。`npm run check` 會掃整個專案有沒有 LFS 指標檔、`.gitattributes` 有沒有 LFS 規則、根目錄有沒有 `.nojekyll`；工具頁開啟時字型載不到會跳出紅色「字型沒有載入，先別產圖」視窗。
- **GitHub Pages**：Settings → Pages → 來源選 main 分支根目錄，網址 `https://<帳號>.github.io/<repo>/`（入口頁）。根目錄的 `.nojekyll` 不可刪：Pages 預設用 Jekyll 建站，會略過 `_` 開頭的檔案，`config/profiles/_defaults.js` 與 `templates/<分類>/_bundle.js` 就 404、所有工具都「啟用失敗」。Pages 的 deploy 偶爾出現 502 紅叉是 GitHub 當下故障，Re-run 即可。
- **下載 ZIP**／clone：解壓或 clone 後雙擊 `index.html` 即可，不需 git-lfs。
- 曾經用 LFS 推過的 repo：照 `docs/上傳步驟.md` 的「從 LFS 換回一般檔」做一次，或直接重建 repo。

## repo 大小
| 目錄 | 大小 | 說明 |
|---|---|---|
| tests/golden | 210 MB | 576 張黃金圖＋session.json（回歸必要） |
| assets | 134 MB | 11 分類的素材（回歸輸入；使用者也可直接拿來上傳） |
| tests/golden-inputs | 76 MB | 12 份工單 |
| fonts | 53 MB | ShopeeNotoSans |
| templates | 27 MB | 公版 JSON＋內建 _bundle.js |
| 其餘程式與設定 | < 10 MB | |

不使用 Git LFS（原因見上一節）；`.gitattributes` 只管換行與二進位標記。clone 約 505 MB。
