# GitLab 上傳步驟（第一次）

前置：GitLab 上建好空專案（Settings → General → Visibility… → 勾 **Git Large File Storage (LFS)**），本機裝好 `git` 與 `git-lfs`。
上傳前先刪掉空的 `tools/` 資料夾與 `docs/待刪除檔案.md`（清單上的檔案都已刪完）。

```bash
cd "D:\#AI測試\#25節專案\#整合版本\25節Tool_整合版"
git init -b main
git lfs install                      # 讀 .gitattributes，圖／xlsx／字型／zip 走 LFS
git add .
git status --short | head            # 確認沒有 node_modules/、tests/golden-diff/、work/（.gitignore 已排除）
git commit -m "25節Tool 整合版：11 工具一份 core＋入口頁＋對齊 18節 的功能（12 案例黃金全綠）"
git remote add origin <GitLab 專案的 .git 網址>
git push -u origin main              # 約 490MB，其中 tests/golden 210MB、assets 134MB、工單 76MB、字型 53MB 走 LFS
```

推上去後 CI 會自動跑 `check`（幾秒）；`golden` 在 main 分支自動跑（需 headless Chromium，黃金＋全部 E2E 約 30–40 分鐘）。

## 注意
- 資料夾名含 `#`，PowerShell 請整段加引號。
- 若公司 GitLab 沒開 LFS：刪掉 `.gitattributes` 裡 `filter=lfs` 的行再 `git add`，改用一般 git 存放（單一 repo 上限依 GitLab 設定，通常 10GB）。
- AMS 有輸出檔名含 `*`（原工具現況），只在 zip 內，不會進 repo。
- 使用者雙擊 `index.html` 即可使用（入口頁 → 工具頁 `app.html?profile=<分類>`），不需伺服器。
- 之後每次更新：`git add -A && git commit -m "..." && git push`。
