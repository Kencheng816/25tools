# 上傳步驟（GitHub 或 GitLab，第一次／重建 repo）

前置：遠端建好**空**專案；本機裝好 `git` 與 `git-lfs`（LFS 只用在測試資料；GitLab 要在 Settings → General → Visibility… 勾 **Git LFS**，GitHub 預設可用）。
上傳前先刪掉空的 `tools/` 資料夾與 `docs/待刪除檔案.md`，並跑一次 `npm run check`（會確認字型／素材不是 LFS 指標檔）。

```bash
cd "D:\#AI測試\#25節專案\#整合版本\25節Tool_整合版"
# 重建 repo：先把舊的 .git 砍掉，避免帶著「字型在 LFS」的舊歷史
Remove-Item -Recurse -Force .git        # PowerShell；bash 用 rm -rf .git
git init -b main
git lfs install                          # 讀 .gitattributes：只有 tests/golden 與 tests/golden-inputs 走 LFS
git lfs untrack "*.ttf" "*.png" "*.jpg" 2>$null   # 保險：清掉以前手動 track 過的全域規則（沒有就略過）
git add .
git lfs ls-files | Select-String -Pattern "fonts/|assets/|vendor/|templates/"   # 必須是空的：執行時需要的檔案都不在 LFS
git status --short | Select-String -Pattern "node_modules|golden-diff|work/"     # 必須是空的（.gitignore 已排除）
git commit -m "25節Tool 整合版：11 工具一份 core＋入口頁＋對齊 18節 的功能（12 案例黃金全綠）"
git remote add origin <專案的 .git 網址>
git push -u origin main                  # 約 490MB，其中 tests/golden 210MB＋工單 76MB 走 LFS
```

推上去後 CI（GitLab）會自動跑 `check`（幾秒）；`golden` 在 main 分支自動跑（需 headless Chromium，黃金＋全部 E2E 約 30–40 分鐘）。GitHub 沒有對應的 workflow，需要的話再補 `.github/workflows/`。

## GitHub Pages
Settings → Pages → Build and deployment：Source＝Deploy from a branch、Branch＝main／(root) → 網址 `https://<帳號>.github.io/<repo>/`。
根目錄的 `.nojekyll` 要一起推上去（Pages 預設用 Jekyll 建站，會略過 `_` 開頭的 `config/profiles/_defaults.js`）。開啟後若「1. 開始」出現紅字「字型載入失敗…」，表示字型還是 LFS 指標檔：確認 `.gitattributes` 是本專案這份、`git lfs ls-files` 裡沒有 fonts/，必要時重做上面的重建步驟。

## 注意
- 資料夾名含 `#`，PowerShell 請整段加引號。
- 不想用 LFS：刪掉 `.gitattributes` 裡含 `filter=lfs` 的行再 `git add`，全部改一般 git 存放（repo 約 490MB，最大單檔 < 20MB，在 GitHub 100MB 單檔上限內）。
- AMS 有輸出檔名含 `*`（原工具現況），只在 zip 內，不會進 repo。
- 使用者雙擊 `index.html` 即可使用（入口頁 → 工具頁 `app.html?profile=<分類>`），不需伺服器；GitHub Pages 開網址也一樣。
- 之後每次更新：`git add -A && git commit -m "..." && git push`。
