/* 25節 整合版 — 註冊 Service Worker（2026-11-05 自 18節 移植；2026-11-19 補搬「重新整理後兩分鐘內不再跳」）（sw.js）＋「有新版本」提示
 *
 * 只在 http／https 的正式環境註冊；雙擊 index.html（file://）沒有 Service Worker，本機測試伺服器（localhost／127.0.0.1）
 * 預設也不註冊，免得黃金回歸吃到舊快取——網址加 ?sw=1 可強制開、?sw=0 強制關。
 * sw.js 在背景發現檔案有新版時會 postMessage（sw:updated），這裡在畫面底部顯示一條「工具有新版本」提示，按了重新整理。
 */
(function initServiceWorkerRegistration() {
  'use strict';

  const param = new URLSearchParams(location.search).get('sw');
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const enabled = 'serviceWorker' in navigator && location.protocol.startsWith('http') && param !== '0' && (param === '1' || !isLocalHost);
  if (!enabled) return;

  // （二校二修補充 1）按了「重新整理」之後，同一批檔案在兩分鐘內再被通報就不再跳：
  // 新版已經載進來了，再跳一次只是干擾（通報時間與檔名記在 sessionStorage，重新整理後還讀得到）。
  const RELOAD_GRACE_MS = 2 * 60 * 1000;
  const STORAGE_KEY = 'swUpdateReloadedAt';
  const notifiedUrls = new Set();
  function readReloadMark() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch (_error) { return null; }
  }
  function writeReloadMark() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), urls: [...notifiedUrls] })); } catch (_error) { /* 無痕模式等情況略過 */ }
  }
  function suppressedAfterReload(url) {
    const mark = readReloadMark();
    if (!mark || Date.now() - mark.at > RELOAD_GRACE_MS) return false;
    return !url || (mark.urls || []).includes(url);
  }

  let toast = null;
  function showUpdateToast(url = '') {
    if (url) notifiedUrls.add(url);
    if (suppressedAfterReload(url)) return;
    if (toast) return;
    toast = document.createElement('div');
    toast.id = 'swUpdateToast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span>工具有新版本，重新整理即可使用。</span><button type="button">重新整理</button><button type="button" class="sw-toast-close" aria-label="稍後">✕</button>';
    toast.querySelector('button').addEventListener('click', () => { writeReloadMark(); location.reload(); });
    toast.querySelector('.sw-toast-close').addEventListener('click', () => { toast.remove(); toast = null; });
    document.body.appendChild(toast);
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'sw:updated') showUpdateToast(String(event.data.url || ''));
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      // sw.js 本身有新版：等它裝好後提示重新整理（新版會 skipWaiting＋claim）
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'activated' && navigator.serviceWorker.controller) showUpdateToast(); });
      });
    }).catch((error) => console.warn('[sw] 註冊失敗（不影響使用）', error?.message || error));
  });
})();
