/* 25節 整合版 — Service Worker（2026-11-05 自 18節 移植；18節 2026-10-29 封測回饋：線上版開頁慢）
 *
 * 目的：第二次開頁不再下載字型與程式，也不受 GitHub Pages 固定 max-age=600 的限制。
 * 策略（都只在 http／https；file:// 沒有 Service Worker）：
 *   fonts     — 字型（遠端 WOFF2、內建 TTF）：cache-first。字型內容不會變，有快取就直接用。
 *   html      — index.html／app.html：network-first，離線才用快取（導航一定拿最新頁面）。
 *   static    — js／css／json／圖片等同源靜態檔：stale-while-revalidate——先給快取（快），背景抓新版；
 *               發現內容變了就更新快取並通知頁面顯示「有新版本，請重新整理」。
 *   其他（跨網域非字型）不經手。
 * 快取名稱帶版本，升版時在 activate 清掉舊快取。
 */
'use strict';

const CACHE_VERSION = 'v1';
const CACHES = { fonts: `25tool-fonts-${CACHE_VERSION}`, html: `25tool-html-${CACHE_VERSION}`, static: `25tool-static-${CACHE_VERSION}` };
const FONT_HOSTS = ['raw.githubusercontent.com'];
const STATIC_EXT = /\.(js|css|json|png|jpe?g|webp|gif|svg|ico)$/i;
const FONT_EXT = /\.(woff2?|ttf|otf)$/i;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set(Object.values(CACHES));
    for (const name of await caches.keys()) if (name.startsWith('25tool-') && !keep.has(name)) await caches.delete(name);
    await self.clients.claim();
  })());
});

function classify(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return null;
  if (FONT_EXT.test(url.pathname) && (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname))) return 'fonts';
  if (url.origin !== self.location.origin) return null;
  if (request.mode === 'navigate' || /\.html$/i.test(url.pathname) || url.pathname.endsWith('/')) return 'html';
  if (STATIC_EXT.test(url.pathname)) return 'static';
  return null;
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreSearch: false });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }
}

/** 內容是否不同：先比 ETag／Last-Modified，沒有就比長度。 */
function differs(cached, fresh) {
  const pick = (response, name) => response.headers.get(name) || '';
  const etagA = pick(cached, 'etag'); const etagB = pick(fresh, 'etag');
  if (etagA && etagB) return etagA !== etagB;
  const lmA = pick(cached, 'last-modified'); const lmB = pick(fresh, 'last-modified');
  if (lmA && lmB) return lmA !== lmB;
  return pick(cached, 'content-length') !== pick(fresh, 'content-length');
}

async function notifyClients(url) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => client.postMessage({ type: 'sw:updated', url }));
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (!response.ok) return response;
    if (hit && differs(hit, response)) notifyClients(request.url);
    await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  if (hit) { refresh.catch(() => {}); return hit; }
  const response = await refresh;
  if (!response) throw new Error(`離線且沒有快取：${request.url}`);
  return response;
}

self.addEventListener('fetch', (event) => {
  const kind = classify(event.request);
  if (!kind) return;
  if (kind === 'fonts') event.respondWith(cacheFirst(CACHES.fonts, event.request));
  else if (kind === 'html') event.respondWith(networkFirst(CACHES.html, event.request));
  else event.respondWith(staleWhileRevalidate(CACHES.static, event.request));
});
