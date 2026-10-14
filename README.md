# 25節Tool 整合版

把 11 個 25節產圖工具（正式BN、暖身BN、KV、外廣OM wave1/wave2、暖正MS、Line OA、Affiliate network、Line購物AMS、鏡面、跨夜直播）整合成單一入口，輸出與原工具零像素差異。

## 使用
1. 直接雙擊 `index.html` 開啟入口頁即可（不需伺服器、不需安裝；設定檔全部用 `<script>` 載入，`file://` 下可正常運作）。放到靜態伺服器或 GitLab Pages 也一樣。入口頁列出 11 個工具卡片：點卡片或上方選單開工具，或「上傳工單自動判別」——依分頁名判別工具，只對到一個就直接開啟並把工單帶進工具（不用再上傳一次）；同時符合多個時卡片會亮起，點選其中一個即可（工單同樣會帶入）。工具頁是 `app.html?profile=<分類>`（可「另開分頁」單獨使用），左側依序三區：**1. 開始 → 2. 公版與素材 → 3. 輸出**。
2. 「1. 開始」：上傳工單 Excel（由入口頁帶入的會顯示「已載入工單」綠框，按鈕變成「重新上傳工單」）→ 若工單只對應一種工具就直接啟用；若同一份工單有不同工具的分頁（例如跨夜＋鏡面），會請你先選分頁再啟用。判斷不出來（或多個都符合）才會展開「手動選擇工具分類」。也可以直接「載入存檔」跳回上次的狀態。
3. 「2. 公版與素材」：上傳公版 `templates/<分類>/` 與素材 `assets/<分類>/` 資料夾 → 預覽檔案。產出清單下方的診斷區只留四級摘要（重要且緊急／重要不緊急／不重要但緊急／資訊）與三列收合（未匹配／略過、素材檢查、解析診斷），點任一列從右側打開診斷面板：依四級分組、有圖的項目點了切到那張、可下載 診斷報告.txt。
4. 分類啟用後不可在同頁切換；切換會重新載入頁面（`?profile=<分類>`）。
5. 選取任何圖片圖層後，「調整」面板有「素材庫」「上傳替換」「清除圖片」（右鍵圖層或按 L 也可開素材庫：單擊先預覽、雙擊／Enter／「套用」才正式替換、Esc 還原）（也可把圖檔拖到畫布上的圖層、或按 Delete 清除）；上傳的圖會先裁掉透明邊，再等比塞進原外框、外框縮成貼合圖片（之後拉控制點維持比例）；手動結果（含外框）會記在該張圖上，之後重新套版不會被蓋掉，存檔也會一起保存。有同步群組的版位（例如 network 同一列的多個尺寸）會一起換。
6. 選到價格層或商品／票券圖層時，「調整」面板顯示「票券類型」：目前判斷（工單自動流程的結果）與下拉手動指定；手動換商品圖後會依新檔名查 `config/coupon-catalog.js` 型錄自動重上價格顏色；正式BN／暖身BN 這類「價格由規則算出來」的版位，換票券素材還會把價格層依新素材重算（`modules/coupon-price-sync.js`，自 18節 移植）：單／雙券三層判讀（檔名「雙券／單券」→ 讀圖看橘色票根高度 → 預設單券）、名稱沒有「券」就不顯示價格、「_有價格」素材移除價格層、規則不認得的素材價格維持原樣；位置優先參考同版型已用同素材的版位。素材庫單擊預覽時也即時重算，Esc 還原。工單自動流程不受影響。
7. 下載圖片：主按鈕「依工單規則（推薦）」，對話框條列說明；ZIP 內除圖片外另附「存檔/」（可載回）與「診斷報告.txt」（四級分類；network／鏡面／跨夜維持原工具自己的報告）。「依工單規則」輸出時，成品只要有透明像素就自動存 PNG（所有工具；例：頭巾、POPUP、AR Large BN、Mepage、MS 下蓋、LineOA 推文空格）；正式／暖身BN 依來源公版分資料夾（`01_頭巾/`、`02_HBN/`、`03_SKBN/APP/`…）。
8. 「重置專案」（在「預覽檔案」下方）會整頁重來、回到「1. 開始」；要保留成果請先「儲存存檔」。
9. 「匯出」面板的「儲存存檔」會把目前所有圖的最終狀態＋工單＋公版＋用到的素材打包成一個 `<分類>_<分頁>_<時間>.25tool.zip`；「載入存檔」把它載回，可繼續微調、再存、再下載（載回時以畫面為準，不重跑規則）。

## 結構
```
index.html                 入口頁（工具卡片、工單自動判別；launcher/、config/tools.js）
app.html                   工具頁（?profile=<分類>；入口頁用 iframe 載入，工單以 postMessage 帶入）
style.css／theme-25.css   工具頁樣式；theme-25.css 是深色主題覆寫層（蝦皮橘強調色、8px 網格、統一面板、三字級、按鈕四態、空狀態），載在最後，之後調主題只動這一支
core/bootstrap.js          工具頁啟動流程（上傳工單→分頁→分類偵測→載 core；接收入口頁帶入的工單）
core/app.core.js           統一 core（以正式BN V0.8 為底，加法合併）
core/profile-loader.js     依分類合併旗標三層、載入 rules/<分類>/ 規則與 core 模組
core/session-archive.js    存檔（.25tool.zip）儲存／載回
modules/manual-asset-controls.js  任何圖片圖層的上傳替換／清除（手動紀錄 __manualAssetOverrides）
modules/text-editing-ux.js  畫布文字編輯：游標在插入點、點擊定位、拖曳反白、Enter 換行、文字框隨文字貼合（自 18節 移植）
modules/text-float-toolbar.js  文字浮動工具列（字級／粗體／顏色／對齊／行距；雙擊編輯出現、右鍵、Ctrl+/、釘選）
modules/thumb-sync.js      主畫布改了 → 該張縮圖灰化，放開滑鼠後重畫（自 18節 移植）
modules/layer-lock-defaults.js  layers.lockOnLoadPatterns（預設 *kv_bg*）的圖層第一次出現就鎖定，可解鎖
modules/asset-link-sync.js  同版型、同素材的圖層跨版位連動（sync.assetLink；工具列「連動」／D 鍵可單張斷開）
modules/product-group-sync.js  商品圖↔價格等比連動（sync.productGroup；智慧物件引擎接管的商品圖由引擎處理）
modules/multi-select.js    Shift 多選：一起拖、方向鍵一起微調
modules/shortcut-help.js   工具列「⌨ 快捷鍵」卡片（按 ? 也可開）
modules/diagnostics-panel.js  左欄診斷區收合（四級摘要＋三列徽章）＋右側診斷面板（頁籤、點項目切到那張、下載報告）
modules/diagnostics-report.js  診斷彙整四級分類（critical／important／minor／info），給 zip 的 診斷報告.txt 與診斷面板共用
modules/coupon-price-sync.js  換票券素材後價格重算（單／雙券判讀、非票券不顯示、_有價格移除）；素材庫預覽即時重算
modules/asset-library.js   素材庫（Inspector「素材庫」鈕／L 鍵／右鍵圖層／點空槽）：單擊預覽、雙擊／Enter／套用才替換、Esc 還原、toast 復原；只列共用素材資料夾
config/coupon-catalog.js   票券型錄（資料＋分類函式）；modules/coupon-controls.js 為其 Inspector／換圖入口
core/template-rules.loader.js  規則登錄器＋逐支載入（單一版本，行為差異走 rules.* 旗標）
config/profiles/           _defaults.js（共用＋family 預設）＋每個分類一份 <分類>.profile.js（只放差異，JSON 包一行登錄）；flags.registry.json 為選項登錄表
rules/shared/              所有分類共用的規則工具（manifest 以 '@shared/…' 引用）
rules/<分類>/              各分類規則檔（含 rules.manifest.js；分類專屬的 shared/ 仍放在各自資料夾）
templates/<分類>/          公版 JSON
assets/<分類>/             素材
vendor/                    jszip 3.10.1、xlsx 0.18.5 本機副本
tests/golden/              黃金樣本（原工具輸出）
tests/golden-inputs/       黃金樣本用的工單
tests/golden-capture/      從原工具擷取黃金樣本
tests/run-golden/          整合版回歸比對
docs/core-diff/            11 工具 core 差異分析
docs/GitLab上傳步驟.md     第一次 push 的指令與注意事項
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
npm run check                   # 不開瀏覽器：manifest／profile／入口頁工具表引用檢查＋票券型錄一致性
npm run test:launcher           # 入口頁：上傳工單自動判別→開工具→工單帶入（http 與 file:// 各跑一次）
npm run test:golden             # 黃金回歸（12 案例、585 張）
npm run test:click-export       # 黃金回歸＋逐張點縮圖再下載（抓互動路徑，--click-thumbs）
npm run test:roundtrip          # 存檔往返：產圖→存檔→新分頁載回→再產圖，必須與第一次及黃金位元組相同
npm run test:manual-assets      # 手動素材：替換一層＋清除一層→只有同步群組內的圖改變、其餘不變→存檔往返一致
npm run test:manual-fit         # 手動上傳貼合：裁透明邊、等比貼合、拉大後外框記回、套回不被蓋
npm run test:text-edit          # 文字（Inspector 改字）：縮圖更新、切回仍保留、只有那張輸出改變、存檔往返
npm run test:text-ux            # 文字（畫布）：雙擊編輯、Enter 換行、反白、點擊定位、Ctrl+Enter 貼合、Esc、Ctrl+/
npm run test:interaction        # 互動六項：縮圖同步、KV_BG 鎖定、選取框貼墨跡、同素材連動、商品組、多選
npm run test:asset-library      # 素材庫：L 開面板、預覽／Esc 還原、套用／復原、右鍵選單、空槽選單
npm run test:coupon             # 票券型錄：換商品圖→價格自動重上色；手動指定→再上色；存檔往返一致
npm run test:coupon-price       # 換票券→價格重算：雙券／單券／非票券／_有價格／圖形判讀／素材庫預覽
npm run test:export-bundle      # 下載：對話框條列、zip 附存檔＋診斷報告、zip 內存檔載回再下載相同
npm run test:diagnostics        # 診斷面板：四級摘要、收合列、面板頁籤、點項目切張、下載報告
node tests/run-golden/run-golden.js --case "正式BN/BN 正式"   # 單一案例
node tests/run-golden/run-golden.js --batch 1/3               # 分批跑（單次執行有時間上限的環境）
```
通過條件：每張輸出圖與 `tests/golden/.../images/` 位元組相同；差異圖與存檔樣本寫到 `tests/golden-diff/`（已 gitignore）。
CI 見 `.gitlab-ci.yml`：`check` 每次 push 都跑；`golden` 在預設分支自動跑、其他分支手動觸發。

## repo 大小與 LFS
| 目錄 | 大小 | 說明 |
|---|---|---|
| tests/golden | 210 MB | 585 張黃金圖＋session.json（回歸必要） |
| assets | 134 MB | 11 分類的素材（回歸輸入；使用者也可直接拿來上傳） |
| tests/golden-inputs | 76 MB | 12 份工單 |
| fonts | 53 MB | ShopeeNotoSans |
| 其餘程式與設定 | < 20 MB | |

`.gitattributes` 已把 png／jpg／xlsx／字型／zip 設為 Git LFS；GitLab 專案需開啟 LFS（Settings → General → Visibility → Git LFS）。若不用 LFS，刪掉 `.gitattributes` 的 lfs 行即可，但 clone 會變成約 500 MB。
