/* 25節 整合版 — 字型來源設定（2026-11-05 自 18節 移植；18節 2026-10-29 封測回饋：線上版開頁慢，主因是三個 18 MB 的 TTF）
 *
 * 載入順序（core/… 不用改，app.html 的 FontPreloader 讀這份設定）：
 *   1. remote：WOFF2 版（同一套字型的無損壓縮封裝，約 8 MB／個，TTF 經 gzip 是 11 MB／個），放在 GitHub raw。
 *   2. local ：抓不到（離線、被擋、逾時、檔案壞掉）就退回 repo 內建的 TTF（fonts/），行為與改版前完全相同。
 * 網址加 ?fonts=<base>/ 可臨時改 remote 來源（回歸測試用它指到本機 WOFF2 驗證輸出零誤差）；?fonts=local 強制只用內建 TTF。
 * 用 <script> 載入（不用 fetch），雙擊 index.html 以 file:// 開啟也能用。
 */
window.FONT_CONFIG = {
  family: 'ShopeeNotoSans Content',
  remoteBase: 'https://raw.githubusercontent.com/jimmywu-commits/shopee/main/fonts/',
  localBase: 'fonts/',
  /** 遠端單一檔案超過這麼久沒有任何進度就放棄、改用內建 TTF。 */
  remoteStallMs: 12000,
  faces: [
    { weight: '400', remote: 'ShopeeNotoSans(content)-Regular.woff2', local: 'ShopeeNotoSans(content)-Regular.ttf' },
    { weight: '500', remote: 'ShopeeNotoSans(content)-Medium.woff2', local: 'ShopeeNotoSans(content)-Medium.ttf' },
    { weight: '700', remote: 'ShopeeNotoSans(content)-Bold.woff2', local: 'ShopeeNotoSans(content)-Bold.ttf' },
  ],
};
