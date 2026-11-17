#!/usr/bin/env node
/* 重做導覽範例資料 tour/tour-sample-data.js（工單＋素材內嵌 base64；modules/tour.js 用）。（2026-11-06 自 18節 移植，改用 25節 暖身BN 的工單格式與素材）
 * 用法：node tests/tools/build-tour-sample.js  （需 NODE_PATH 指到有 xlsx 的 node_modules） */
'use strict';
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
// 25節 暖身BN 工單 HBN 區塊的表頭（與黃金工單同一列結構）
const header = ['製作內容01', 'K數', '檔案格式', '尺寸', '', '版配', '', '', '', '', '', '', '備註', '編號', '曝光', '主標 7字內', '副標 8字內(藍底)', '保護文字 約14字', 'CTA 參考規範', '商品圖1', '價格', '備註', '入稿/檢查PIC'];
const rows = [
  ['25節 暖身BN 導覽範例工單（內建，導覽結束會清掉）'],
  [],
  header,
  // 2026-11-17：備註No 要跟正式工單同一筆（置版預設 warmup-placement-presets 的 hbn/<備註No> 決定券上價格的位置／大小／角度），
  // 不然 $200 會套到別張的版面（使用者回報「教學模式的價格不正確」）。4＝全站券加蝦幣、12＝商城券_雙券、6＝沒有價格的多商品。
  ['HBN', '', 'JPG', '1200x360px', '', 'HBN', '', '', '', '', '', '', 4, '260525HBN04', '暖身', '全站滿千折$200', '短影音簽到領蝦幣', '優惠券限5/25使用，數量有限，先搶先贏', '放心買 安心退', '全站券加蝦幣', '$200', '', ''],
  ['', '', '', '', '', '', '', '', '', '', '', '', 12, '260525HBN12', '暖身', '商城滿千折$200', '今日限定立即用', '優惠券限今日使用，數量有限，先搶先贏', '放心買 安心退', '商城券_雙券', '$200', '', ''],
  ['', '', '', '', '', '', '', '', '', '', '', '', 6, '260525HBN06', '暖身', '不限店家無限免運', '免運禮盒雙重送', '免運優惠須依店家適用之物流為主', '放心買 安心退', '免運車 + 禮物盒icon', '', '', ''],
];
const ws = XLSX.utils.aoa_to_sheet(rows);
// 2026-11-17：「製作內容」那一欄不能用合併儲存格——core 會把合併格展開成每列都有「HBN」，每一列都被當成一筆新的製作物從該列讀到區塊底，
// 3 列會變 1+2+3=6 張（HBN12_2、HBN06_3…）。正式工單只有第一列有「HBN」，其餘列空白，這裡照做；其他欄也不需要合併。
ws['!merges'] = [];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'BN 暖身');
const excel = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

// 素材：02_HBN 公版素材＋根目錄的活動／品牌 LOGO（svg）＋共用素材裡的券與商品
const ASSETS = [
  ['02_HBN', '02_HBN_KV_BG.png'], ['02_HBN', '02_HBN_規範.png'],
  ['', '橫式_25號商城狂購節_LOGO_白.svg'], ['', '橫式_25號商城狂購節_LOGO_黃.svg'], ['', '蝦皮VIP_LOGO.svg'], ['', '蝦皮直營_LOGO.svg'], ['', '蝦皮購物_LOGO_白.svg'], ['', '25節USP_對外_LOGO.svg'],
  ['共用素材', '全站券加蝦幣.png'], ['共用素材', '商城券_雙券.png'], ['共用素材', '全站券_雙券.png'], ['共用素材', '免運車.png'], ['共用素材', '禮物盒icon.png'],
];
const files = ASSETS.map(([dir, name]) => ({
  path: dir ? `assets/${dir}/${name}` : `assets/${name}`,
  name,
  type: name.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
  b64: fs.readFileSync(path.join(ROOT, 'assets/暖身BN', dir, name)).toString('base64'),
}));

const out = `/* 25節 暖身BN 新手導覽用的範例資料（modules/tour.js 開始導覽時才載入；導覽結束就清掉，不影響實際工單）
 * 工單：一個 HBN 區塊 3 筆（1 全站券加蝦幣 $200／2 商城券_雙券 $200／3「免運車 + 禮物盒icon」多商品）；素材：02_HBN 公版素材＋LOGO＋券與商品。
 * 重做：node tests/tools/build-tour-sample.js（素材與工單內容都從 assets/暖身BN 抽） */
window.TOUR_SAMPLE = ${JSON.stringify({ excelName: '2026.5.25商城狂購節_美術工單_導覽範例.xlsx', sheet: 'BN 暖身', excel: excel.toString('base64'), files })};
`;
fs.mkdirSync(path.join(ROOT, 'tour'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tour', 'tour-sample-data.js'), out);
console.log(`tour/tour-sample-data.js ${(out.length / 1024).toFixed(0)} KB，${files.length} 張素材`);
