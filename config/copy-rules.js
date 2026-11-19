/* 25節 整合版 — 文案規則設定（2026-11-13 二校二修 V2 #4，自 18節 整合版搬入）
 *
 * 來源：GD 的「警語智慧偵測」規則（jimmywu-commits/shopee／警語智慧偵測：warning_inline_demo_v2.html＋警語驗證規則.xlsx），
 * 由 modules/copy-lint.js 讀取。這裡只放「資料」：要改字、加禁用語、調字數上限，直接改這個檔案。
 *
 *   replacements   用字替換（真的會改字）：匯入工單時改工單文字、面板／畫布打字時即時改。價格層不動。
 *   bannedPhrases  禁用語（只進診斷，紅點）。
 *   charLimits     字數上限（只進診斷，橘點）：中文字算 1，其他（英數、半形／全形標點）算 0.5。
 *   charLimitsByProfile  依工具（profile）覆蓋上限：25節 各工單表頭寫的字數不一樣（BN 主標 6～7／副標 7～8、LineOA／OM 主標 8～12），
 *                  這裡取各工具最寬的那一個，沒列的工具用 charLimits。
 *   profileOptions  依工具關掉某條規則：MS 攻略頁一行兩句靠空格隔開（「換季家電9折起 最高折$4,000」），keepHeadlineSpaces＝不刪、也不提示中文旁空格。
 *   headlineAllowedChars  主／副標允許的字元（其餘視為標點，只提示）；1,000 的逗號與 8.5折 的小數點另外放行。
 *   headlineAllowedTokens 主／副標放行的片段（連同後面那一個空格）：M/D 日期、HH:MM 時間，25節 另加 5.25 式日期與「25號」。
 *   shrimpKeyword／shrimpLegalPattern  主副標提到蝦幣時，警語應補的條件結構（只提示）。
 */
window.CopyRules = Object.freeze({
  replacements: [
    ['撒', '灑'],
  ],
  bannedPhrases: ['限搶', '限量搶購', '手刀搶購'],
  charLimits: { title: 8, subtitle: 8, legal: 14 },
  charLimitsByProfile: {
    LineOA: { title: 12, subtitle: 12, legal: 14 },
    OM_w1: { title: 12, subtitle: 12, legal: 14 },
    OM_w2: { title: 12, subtitle: 12, legal: 14 },
    MS: { title: 21, subtitle: 21, legal: 21 },
  },
  profileOptions: {
    MS: { keepHeadlineSpaces: true },
  },
  // 25節 MS 主標用「蝦皮直營 | 品牌好物」分段，直線不當標點。
  // 底線／連字號放行：ME PAGE 這類版位的主標是素材代號（icon_點我）、商品名偶有 Mi-Band 這種寫法，不當標點。
  headlineAllowedChars: '\\u4e00-\\u9fffA-Za-z0-9 $%|｜_\\-',
  // 日期 M/D、時間 HH:MM 不當標點，後面那一個空格不當「中文旁空格」；
  // 25節 工單慣用「5.25 商城狂購節」「25號 商城狂購節」，這兩種也放行（使用者 2026-11-13 決定）。
  headlineAllowedTokens: ['\\d{1,2}/\\d{1,2}', '\\d{1,2}:\\d{2}', '\\d{1,2}\\.\\d{1,2}', '\\d{1,2}號'],
  shrimpKeyword: '蝦幣',
  shrimpLegalPattern: '需領券|滿\\$[\\d,]+|最高(?:享|回饋|領)?[\\d,]+蝦幣',
  // 數字格式：前面接價格字或已有 $ 才補 $；後面接這些單位不補 $；黏著英文／./／ 的數字不動。
  pricePrefixes: '現折|折抵|現抵|立減|下殺|低至|只要|特價|原價|售價|最高|滿|折|省|殺|減|抵|價|享',
  noDollarUnits: '蝦幣|%|折',
  // 「元」不排除——「數字元」就是金額，改成「$數字」（100元 → $100、1000元 → $1,000）。
  skipAfterUnits: '月|日|號|個|件|組|组|人|次|款|色|天|週|周|年|入|份|吋|寸',
  yuanUnit: '元',
});
