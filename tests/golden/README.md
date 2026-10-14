# 黃金樣本總表（步驟 1）— 2026-09-10

由 `tests/golden-capture/capture-golden.js` 以 HeadlessChrome/152.0.7977.0（@sparticuz/chromium 152.0.0，SwiftShader、`--disable-gpu --font-render-hinting=none --disable-lcd-text`）跑**原始工具**產出。每個 case 皆連跑兩次、圖片 sha256 完全一致。

| 工具（版本） | 分頁 | record | 圖片 | 備註 |
|---|---|---|---|---|
| 正式BN V0.8 | ` BN 正式`（前有空格） | 62 | 92 | SKBN APP/PC 含左/中/右切圖；14 警告、75 skipped 為原行為。**2026-09-15 回饋 2**：SKBN 系改放 `03_SKBN/APP`、`03_SKBN/PC`、`06_SKBN NUZ/APP|PC`（內容位元組不變） |
| 暖身BN V1.5 | `BN 暖身` | 109 | 109 | 未匹配 2（AR No07 案型不支援、AR Large No97 主標超寬）；開頁 pageerror「素材模糊比對不明確」。**2026-09-15 回饋 1／2**：全部改依來源公版分資料夾（01_頭巾／02_HBN／…）；頭巾、POPUP、AR Large BN、Mepage 共 41 張因透明背景改存 PNG（同一畫布、只換編碼），其餘 68 張位元組不變 |
| KV V0.2 | `工單KV+Logo` | 7 | 7 | rules 走 index.html 靜態 script |
| 外廣OM wave1 V0.5 | `外廣_Wave1` | 60 | 60 | skipped 6 列 VideoElements 無公版 |
| 外廣OM wave2 V0.4 | `外廣_wave2` | 79 | 78 | **LineOA「25 spike 創貼 14」與「一般 01」`__outputName` 同名互覆**；整合版決策：檔名補後綴 |
| 暖正MS V0.5 | `攻略頁_GD做圖列表` | 33 | 33 | 11 案型資料夾；6 張 中標_全藍 落根目錄 |
| Line OA V0.5 | `Line OA` | 8 | 8 | 推文-1 三格灰底＝UploadSlot 留空 |
| Line OA V0.5 | `LineOA_Wave1` | 2 | 2 | 次要分頁（保留） |
| Affiliate network V0.7 | `Network_5.19-5.25` | 151 | 151 +診斷報告.txt | 警告 155（BigGo 回饋比例無效 45、商品圖 _tn.svg 不在 assets） |
| Line購物AMS V0.6 | `2026.4_Line購物_4.19-4.25` | 9 | 9 | 工單中唯一 AMS 表頭分頁（4 月資料）；膠囊為 png |
| 鏡面 V0.2 | `425_鏡面` | 6 | 6 +診斷報告.txt | 1080×1920 png（418 分頁與 425 完全相同，已捨棄） |
| 跨夜直播 V0.5 | `425跨夜_線上宣傳圖` | 21 | 21 +診斷報告.txt | `5.PN_AR_01_100x101` 實際 100×100（418 分頁已捨棄） |

合計 12 case、576 張圖（2026-09-10 決策：捨棄 Network_4.19-4.25、鏡面 418、跨夜 418）。

**基準說明**：黃金樣本＝原工具輸出，但 2026-09-15 起依使用者回饋加上兩個整合版新行為：(1) 所有工具「成品有透明像素就存 PNG」——暖身BN 41、MS 下蓋 11、LineOA 推文 5、外廣 wave2 LineOA 2 張由 .jpg 改 .png（同一畫布、只換編碼）；(2) 正式／暖身BN 依來源公版分資料夾。其餘檔案位元組與原工具相同。

## 素材上傳順序（2026-09-14 重要修正）
B 系工具（KV／OM／LineOA／network／AMS／鏡面／跨夜）的素材模糊比對會取「第一個命中」，結果依賴
(1) 瀏覽器列舉資料夾的順序（Linux 為雜湊順序、每個資料夾不同；Windows 為檔名順序）與
(2) 使用者選取的根資料夾名稱（webkitRelativePath 的第一段，B 系會拿路徑跟公版名比對）。
因此擷取器與回歸器改為：檔案依 webkitRelativePath 碼位排序、根資料夾名固定為 `templates`／`assets`。
本日以此規則重擷 B 系黃金：KV／network／AMS／鏡面／跨夜 無變化；OM_w1 3 張、OM_w2 4 張、LineOA 2＋2 張與雜湊順序版不同（LOGO 選到不同檔）。
A 系（AssetLookup 歧義即拋錯）不受順序影響。

## 回歸比對規則（供 run-golden.js）
- 只比 `images/` 內的 jpg/png；`診斷報告.txt` 含產生時間／耗時，排除。
- `session.json` 做 JSON diff 時忽略時間戳欄位。
- 外廣OM wave2 LineOA 兩張為刻意差異（檔名補後綴），以檔名對映比對。

## 每個 case 的檔案
```
<工具>/<分頁>/
├─ images/            工具「依規格表」下載 zip 的原始解壓
├─ session.json       AppState.templates 全量（座標／文字／顏色）
└─ capture-meta.json  chrome、rule 清單、產出數、警告、skipped、輸入檔 sha256
```
