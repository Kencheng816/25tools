/* 25節 整合版 — 註冊 Service Worker（2026-11-05 自 18節 移植）（sw.js）＋「有新版本」提示
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

  let toast = null;
  function showUpdateToast() {
    if (toast) return;
    toast = document.createElement('div');
    toast.id = 'swUpdateToast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span>工具有新版本，重新整理即可使用。</span><button type="button">重新整理</button><button type="button" class="sw-toast-close" aria-label="稍後">✕</button>';
    toast.querySelector('button').addEventListener('click', () => location.reload());
    toast.querySelector('.sw-toast-close').addEventListener('click', () => { toast.remove(); toast = null; });
    document.body.appendChild(toast);
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'sw:updated') showUpdateToast();
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
