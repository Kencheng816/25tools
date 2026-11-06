/* 整合版（自 18節 移植，2026-11-06）— 手動改過的東西要算數（18節 2026-11-04 封測回饋；25節 P0-1「頭巾文字改不了色」同一個洞）
 *
 * 一、畫面為準：下載／縮圖時 core 會把工單再套一次（BatchManager.refreshTemplateFromBatchRecord：文字、素材檔名都重比對），
 *     所以面板改的字、換的素材、合成的商品到下載時全部跳回工單原樣。core 本來就有「存檔載回＝畫面為準」的機制
 *     （SnapshotManager.shouldProtectVisualState，看 template.__restoreSnapshot），這裡沿用：只要這張製作物被手動動過
 *     （任何會進 HistoryManager 的操作：改字、換色、拖圖層、換素材、合成商品…），就標成畫面為準，之後不再重套工單。
 *     沒動過的製作物完全不受影響（黃金輸出不變）。
 * 二、規則不蓋手動屬性：
 * 問題：有些規則檔的 layoutRules.applyProgrammaticLayout（正式BN DD card、POPUP…）每次畫布重畫都會把主標／副標／警語的
 * 座標、字級、顏色寫回預設值，所以在面板改顏色、字級會「改了又跳回去」。
 * core 的 ManualOverrideManager 已經把使用者手動改過的屬性記在 layer.__manualOverrides（改字時 Inspector.applyTextFromInputs 會標
 * fontSizePx／color／fontFamily／lineHeight…；拖框會標 x／y／width／height）。
 * 做法：包住 LayoutRuleEngine.apply——跑規則前先記下所有手動屬性的值，跑完再寫回去。純加法，不動 core、不動規則檔。
 * 只保「文字與字型類」屬性（內容／顏色／字級／字型／行高／字距；內容是因為 HBN 這類規則每次重畫會把主標從工單再抄一次）；
 * 座標類仍交給規則排版（主標置中、膠囊對齊這些靠它）。
 */
(function initManualOverrideGuard() {
  'use strict';

  const GUARDED = ['text', 'color', 'fontSizePx', 'fontSizePt', 'fontFamily', 'lineHeight', 'lineHeightMultiplier', 'letterSpacing'];

  function snapshot(template) {
    const saved = [];
    Object.values(template?.layers || {}).forEach((layer) => {
      const manual = layer?.__manualOverrides;
      if (!manual) return;
      const props = GUARDED.filter((prop) => manual[prop] && layer[prop] !== undefined);
      if (props.length) saved.push({ layer, values: Object.fromEntries(props.map((prop) => [prop, layer[prop]])) });
    });
    return saved;
  }

  const restore = (saved) => saved.forEach(({ layer, values }) => Object.assign(layer, values));

  /** 這張製作物從此以畫面為準（下載／縮圖不再重套工單）。 */
  function markEdited(template = window.AppState?.template) {
    if (template?.layers && !template.__restoreSnapshot) template.__restoreSnapshot = true;
  }

  function wireHistory() {
    const history = window.HistoryManager;
    if (!history || history.__manualGuardWired) return;
    ['push', 'pushCoalesced'].forEach((method) => {
      const original = history[method];
      if (typeof original !== 'function') return;
      history[method] = function pushMarkingEdited(...args) { markEdited(); return original.apply(this, args); };
    });
    const pushSnapshot = history.pushSnapshot;
    if (typeof pushSnapshot === 'function') {
      history.pushSnapshot = function pushSnapshotMarkingEdited(snapshot, index, ...rest) {
        markEdited(window.AppState?.templates?.[index]?.data || window.AppState?.template);
        return pushSnapshot.call(this, snapshot, index, ...rest);
      };
    }
    history.__manualGuardWired = true;
  }

  function wire() {
    wireHistory();
    const engine = window.LayoutRuleEngine;
    if (!engine?.apply || engine.apply.__manualGuardWired) return;
    const original = engine.apply;
    const wrapped = function applyKeepingManualOverrides(template = window.AppState?.template, ...rest) {
      const saved = snapshot(template);
      const result = original.call(this, template, ...rest);
      if (saved.length) restore(saved);
      return result;
    };
    wrapped.__manualGuardWired = true;
    engine.apply = wrapped;
  }

  function main() {
    const whenReady = () => { if (window.__coreScriptsReady && window.__appReady) Promise.resolve(window.__appReady).then(wire); else setTimeout(whenReady, 100); };
    whenReady();
  }

  window.ManualEditGuard = Object.freeze({ markEdited });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
