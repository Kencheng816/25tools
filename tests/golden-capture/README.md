# 黃金樣本擷取器（golden-capture）

用 headless Chromium 跑**原始工具**，走與使用者相同的操作路徑（上傳公版 → 上傳素材 → 上傳工單 → 選分頁/專案 → 預覽檔案 → 下載圖片），把輸出存進 `tests/golden/<工具>/<分頁>[__<專案>]/`。原工具檔案不做任何修改。

## 輸出結構

```
tests/golden/<工具>/<分頁>/
├─ images/            下載 zip 解壓後的原始輸出（與工具「依規格表」下載完全相同）
├─ session.json       批次全部 template 資料（圖層座標／文字／顏色），供 JSON 層級 diff
└─ capture-meta.json  Chromium 版本、載入的 rule 檔、產出數、警告、輸入檔 sha256
```

## 執行

```bash
# 相依套件：repo 根目錄 `npm install`（package.json 的 devDependencies；node_modules 已 gitignore）

export GOLDEN_SOURCE_ROOT=/path/to/#整合版本      # 含 11 個工具的資料夾
export GOLDEN_WORK_DIR=/tmp/golden-work            # 純 ASCII 路徑（CDP 檔案上傳對 # 與中文路徑失效）

node capture-golden.js discover --tool 正式BN                  # 列出分頁與偵測到的專案
node capture-golden.js capture  --tool 正式BN --sheet " BN 正式"   # 擷取一個分頁
```

## 渲染環境固定條件

- `@sparticuz/chromium` 152.0.0（HeadlessChrome/152.0.7977.0）、SwiftShader 軟體渲染
- `--disable-gpu --font-render-hinting=none --disable-lcd-text`
- 字型：工具自帶 `fonts/` 的 ShopeeNotoSans
- CDN（jszip 3.10.1、xlsx 0.18.5）由攔截器改餵 npm 同版本檔案；兩者只影響工單解析與打包，不影響像素

回歸比對（`run-golden.js`，步驟 5）必須在同一組條件下執行，逐像素比對才有意義。
