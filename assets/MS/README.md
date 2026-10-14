# assets/ 資料夾說明

- `shopee-logo.svg`：工具UI本身的品牌Logo（左上角），**不要刪除**。
- 各專案的素材（KV背景、CTA、LOGO...等）請依專案名稱建立子資料夾放入，例如：

```
assets/
  shopee-logo.svg        ← 工具UI本身用的，保留
  <專案名稱>/             ← 例如 "4.17 直播日"
    <公版名稱>_KV_BG.png
    <公版名稱>_CTA.png
  共用素材/                ← 不分專案/公版都能用的素材（例如共用LOGO）
    xxx_LOGO.svg
```

實際載入方式：在網頁左側面板點「載入素材資料夾」，選取整個 `assets` 根資料夾即可，
程式會依第一層子資料夾名稱自動分類。詳細規則與尋找優先順序請見
`docs/ADD_TEMPLATE_GUIDE.md` 的「步驟4：素材歸檔」。
