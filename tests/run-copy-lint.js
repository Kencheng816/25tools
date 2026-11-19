#!/usr/bin/env node
/* 文案規則單元測試（不開瀏覽器）：config/copy-rules.js＋modules/copy-lint.js 的純函式。
 * 案例來自 GD 的「警語驗證規則.xlsx」測試案例分頁＋18節 2026-11-12 的決定（撒→灑、字元算法）＋25節 2026-11-13 的差異（依工具字數、5.25／25號／| 放行、折 前 $ 保留）。
 * 用法：node tests/run-copy-lint.js
 */
'use strict';

const path = require('path');
global.window = global; // config/copy-rules.js 用 window.CopyRules
require(path.join(__dirname, '..', 'config', 'copy-rules.js'));
const CopyLint = require(path.join(__dirname, '..', 'modules', 'copy-lint.js'));

const problems = [];
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) problems.push(`${name}：得到 ${JSON.stringify(actual)}，應為 ${JSON.stringify(wanted)}`);
};
const lintKinds = (layers) => CopyLint.lintTemplate({ layers: Object.fromEntries(layers) }).map((issue) => issue.kind);
const text = (key, value, extra = {}) => [key, { type: 'text', text: value, ...extra }];

// 用字替換
expect('撒→灑', CopyLint.replaceWords('狂撒\n優惠券'), '狂灑\n優惠券');
expect('沒有要換的字不動', CopyLint.replaceWords('滿千折$350'), '滿千折$350');

// 字元算法：中文 1、其他（含全形標點）0.5
expect('字數 今天是11/12日。', CopyLint.weightedLength('今天是11/12日。'), 7);
expect('字數 滿$200享9折', CopyLint.weightedLength('滿$200享9折'), 5.5);

// 圖層分類
expect('分類 title', CopyLint.classifyLayer('title', { type: 'text' }), 'title');
expect('分類 subtitle 不是 title', CopyLint.classifyLayer('subtitle', { type: 'text' }), 'subtitle');
expect('分類 主標題', CopyLint.classifyLayer('主標題', { type: 'text', psdName: '主標題' }), 'title');
expect('分類 法務小字', CopyLint.classifyLayer('法務小字', { type: 'text', psdName: '法務小字' }), 'legal');
expect('分類 價格層不檢查', CopyLint.classifyLayer('title', { type: 'text', source: 'auto_price_v2' }), null);
expect('分類 品名不檢查', CopyLint.classifyLayer('商品_01_品名', { type: 'text', psdName: '商品_01_品名' }), null);

// 主副標格式
expect('標點 1,000 與 8.5折 放行', CopyLint.headlineIssues('滿$1,000享8.5折'), []);
expect('標點 逗號提示', CopyLint.headlineIssues('輸碼領，好友折扣')[0].startsWith('有標點'), true);
expect('中文旁空格', CopyLint.headlineIssues('Dyson 溫控吹風機'), ['中文旁有空格']);
expect('日期＋空格 放行（18節慣用）', CopyLint.headlineIssues('4/18 刷卡享88折'), []);
expect('時間 放行', CopyLint.headlineIssues('4/17 20:00搶優惠'), []);

// 數字格式建議
expect('滿200享9折 → 滿$200享9折', CopyLint.suggestNumberFormat('滿200享9折'), '滿$200享9折');
expect('$12900 → $12,900', CopyLint.suggestNumberFormat('特價$12900'), '特價$12,900');
expect('9月限定 不動', CopyLint.suggestNumberFormat('9月限定活動'), '9月限定活動');
expect('100元 → $100（元不排除）', CopyLint.suggestNumberFormat('4/18 刷卡100元'), '4/18 刷卡$100');
expect('滿1000元 → 滿$1,000', CopyLint.suggestNumberFormat('滿1000元享9折'), '滿$1,000享9折');
expect('iPhone15／11.11／9/9 不動', CopyLint.suggestNumberFormat('iPhone15 11.11 9/9'), 'iPhone15 11.11 9/9');
expect('18%蝦幣 不加 $', CopyLint.suggestNumberFormat('VIP獨享18%蝦幣'), 'VIP獨享18%蝦幣');
expect('滿$999折$100 的 $ 要留著（2026-11-13 修）', CopyLint.suggestNumberFormat('滿$999折$100'), '滿$999折$100');
expect('滿1500折150 兩個都補 $', CopyLint.suggestNumberFormat('全站滿1500折150'), '全站滿$1,500折$150');
expect('滿$999折$100 的 $ 要留著', CopyLint.suggestNumberFormat('滿$999折$100'), '滿$999折$100');
expect('滿1500折150 兩個都補 $', CopyLint.suggestNumberFormat('全站滿1500折150'), '全站滿$1,500折$150');
expect('8/25滿$599折$60 不動', CopyLint.suggestNumberFormat('8/25滿$599折$60'), '8/25滿$599折$60');
expect('4/18 00:00 不動', CopyLint.suggestNumberFormat('4/18 00:00灑Line好友優惠券'), '4/18 00:00灑Line好友優惠券');

// 警語日期區間
expect('11/1~11/2 提示', CopyLint.legalDateIssue('11/1~11/2 期間限定').length > 0, true);
expect('11/1 - 11/2 通過', CopyLint.legalDateIssue('11/1 - 11/2 期間限定'), '');

// 第二期自動校正（依欄位種類）
expect('欄位分類 主標題', CopyLint.classifyField('主標題'), 'title');
expect('欄位分類 法務小字', CopyLint.classifyField('法務小字'), 'legal');
expect('欄位分類 品名不套', CopyLint.classifyField('商品_01_品名'), null);
expect('主標 日期後空格保留', CopyLint.autoCorrect('4/18 刷卡享88折', 'title'), '4/18 刷卡享88折');
expect('主標 刪中文旁空格', CopyLint.autoCorrect('Dyson 溫控吹風機 限時', 'title'), 'Dyson溫控吹風機限時');
expect('主標 刪標點（句尾驚嘆號）', CopyLint.autoCorrect('優惠倒數6小時！', 'title'), '優惠倒數6小時');
expect('副標 刪標點（引號、逗號）', CopyLint.autoCorrect('輸碼「AJ25」，領折扣', 'subtitle'), '輸碼AJ25領折扣');
expect('刪標點 放行 1,000／8.5折／日期時間／$％', CopyLint.autoCorrect('4/18 20:00滿$1,000享8.5折再送5%', 'title'), '4/18 20:00滿$1,000享8.5折再送5%');
expect('主標 底線不刪（ME PAGE 素材代號）', CopyLint.autoCorrect('icon_點我', 'title'), 'icon_點我');
expect('主標 連字號不刪', CopyLint.autoCorrect('Mi-Band 8', 'title'), 'Mi-Band 8');
expect('警語 標點不刪', CopyLint.autoCorrect('優惠券限今日使用，數量有限！', 'legal'), '優惠券限今日使用，數量有限！');
expect('主標 補 $', CopyLint.autoCorrect('滿200享9折', 'subtitle'), '滿$200享9折');
expect('警語 日期區間＋$', CopyLint.autoCorrect('11/1~11/2 滿1000最高享300蝦幣', 'legal'), '11/1 - 11/2 滿$1,000最高享300蝦幣');
expect('警語 不刪空格', CopyLint.autoCorrect('優惠數量有限 售完為止', 'legal'), '優惠數量有限 售完為止');
expect('其他欄位只換字', CopyLint.autoCorrect('狂撒 滿200', null), '狂灑 滿200');

// 25節 差異
expect('5.25 日期＋空格 放行', CopyLint.autoCorrect('5.25 商城狂購節', 'title'), '5.25 商城狂購節');
expect('5.25 不當標點', CopyLint.headlineIssues('5.25 商城狂購節'), []);
expect('25號＋空格 放行', CopyLint.autoCorrect('25號 商城狂購節', 'title'), '25號 商城狂購節');
expect('MS 的 | 不當標點', CopyLint.headlineIssues('蝦皮直營|品牌好物'), []);
expect('字數上限 依工具 LineOA 主標 12', CopyLint.charLimitsFor('LineOA').title, 12);
expect('字數上限 MS 21', CopyLint.charLimitsFor('MS').subtitle, 21);
expect('字數上限 沒列的工具用共用值', CopyLint.charLimitsFor('KV'), { title: 8, subtitle: 8, legal: 14 });
expect('LineOA 10 字主標不報超過', CopyLint.lintTemplate({ layers: Object.fromEntries([text('主標', '今日商城加碼滿千折$200')]) }, 'LineOA').map((i) => i.kind), []);
expect('MS 不刪中文旁空格', CopyLint.autoCorrect('換季家電9折起 最高折4000', 'subtitle', 'MS'), '換季家電9折起 最高折$4,000');
expect('MS 不提示中文旁空格', CopyLint.lintTemplate({ layers: Object.fromEntries([text('副標', '家電9折起 最高折$4,000')]) }, 'MS').map((i) => i.kind), []);
expect('其他工具照刪', CopyLint.autoCorrect('換季家電9折起 最高折$4,000', 'subtitle', 'KV'), '換季家電9折起最高折$4,000');
expect('BN 同一句報超過', CopyLint.lintTemplate({ layers: Object.fromEntries([text('主標', '今日商城加碼滿千折$200')]) }, '正式BN').map((i) => i.kind), ['字數超過上限']);

// 整張檢查（規則表的測試案例）
expect('禁用語 限搶', lintKinds([text('主標', 'iPhone新機配件'), text('副標', '全館滿額折$300'), text('警語', '9/18 限搶92折')]).includes('禁用語'), true);
expect('蝦幣沒補條件', lintKinds([text('主標', 'SHARP空氣清淨機'), text('副標', '享蝦幣10%回饋'), text('警語', '11/1')]).includes('蝦幣警語未補條件'), true);
expect('蝦幣有補條件', lintKinds([text('主標', '羅技限量禮盒換購'), text('副標', '享蝦幣5%'), text('警語', '滿$1,000最高享300蝦幣')]).includes('蝦幣警語未補條件'), false);
expect('字數超過', lintKinds([text('主標', '這是一個超過八個字的主標題')]).includes('字數超過上限'), true);
expect('合規案例沒有提示', lintKinds([text('主標', '看直播送豪禮'), text('副標', '領券最高再9折'), text('警語', '11/1 - 11/3 需登錄送豪禮')]), []);
expect('英文多的主標照 0.5 算仍會超過 8', lintKinds([text('主標', 'Timberland秋冬新品')]), ['字數超過上限']);
expect('隱藏圖層不檢查', lintKinds([text('主標', '限搶', { hidden: true })]), []);

if (problems.length) { console.log('✗ 文案規則'); problems.forEach((line) => console.log(`    ${line}`)); console.log('run-copy-lint：失敗'); process.exit(1); }
console.log('✓ 文案規則：用字替換、字元算法、圖層分類、主副標格式、數字建議、警語日期、禁用語／蝦幣／字數整張檢查');
console.log('run-copy-lint：通過');
