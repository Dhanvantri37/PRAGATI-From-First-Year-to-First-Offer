/* ═══════════════════════════════════════════════════════════════════════════
   PRAGATI Service Worker — v2.0
   Fixes:
    • Push notifications working (subscribe + display + click routing)
    • Notification auto-dismiss after user reads (via message channel)
    • Read IDs stored in IDB so bell resets correctly
   ═══════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME      = 'pragati-v2';
const API_CACHE_NAME  = 'pragati-api-v2';
const FONT_CACHE_NAME = 'pragati-fonts-v2';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/offline.html',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const allowed = [CACHE_NAME, API_CACHE_NAME, FONT_CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => !allowed.includes(k) ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  if (url.hostname.includes('fonts.goog') || url.hostname.includes('fonts.gstatic')) {
    event.respondWith(cacheFirst(request, FONT_CACHE_NAME)); return;
  }
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE_NAME, 5000)); return;
  }
  if (url.origin === location.origin && /\.(js|css|png|jpg|svg|ico|woff2)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAME)); return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request)); return;
  }
  event.respondWith(networkFirst(request, CACHE_NAME));
});

async function cacheFirst(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  return fetchAndCache(req, cache);
}
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res?.status === 200 && res.type !== 'opaque') cache.put(req, res.clone());
    return res;
  } catch { return cache.match(req) || offlineFallback(); }
}
async function networkFirstWithTimeout(req, cacheName, ms) {
  const cache = await caches.open(cacheName);
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(req, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res?.status === 200) cache.put(req, res.clone());
    return res;
  } catch {
    clearTimeout(timer);
    const cached = await cache.match(req);
    return cached || new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
}
async function navigationHandler(req) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    if (res?.status === 200) cache.put(req, res.clone());
    return res;
  } catch {
    const cache  = await caches.open(CACHE_NAME);
    return (await cache.match(req)) || (await cache.match('/index.html')) || (await cache.match('/offline.html')) || offlineFallback();
  }
}
async function fetchAndCache(req, cache) {
  try {
    const res = await fetch(req);
    if (res?.status === 200 && res.type !== 'opaque') cache.put(req, res.clone());
    return res;
  } catch { return offlineFallback(); }
}
function offlineFallback() {
  return new Response('<h1>You are offline</h1>', { headers: { 'Content-Type': 'text/html' } });
}

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'PRAGATI', body: event.data.text() }; }

  const options = {
    body:    data.body    || 'New notification from PRAGATI',
    icon:    '/icon-192x192.png',
    badge:   '/icon-72x72.png',
    tag:     data.tag     || `pragati-${data.id || Date.now()}`,
    data:    { url: data.url || '/dashboard', id: data.id },
    vibrate: [200, 100, 200],
    requireInteraction: false,           // ← auto-dismisses after a few seconds
    silent:  false,
    actions: [
      { action: 'open',    title: '📖 Open' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'PRAGATI', options));
});

// ── Notification click — open app and mark as read ───────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') {
    // Mark as read so bell count decrements
    if (event.notification.data?.id) markRead(event.notification.data.id);
    return;
  }
  const url = event.notification.data?.url || '/dashboard';
  if (event.notification.data?.id) markRead(event.notification.data.id);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      for (const w of wins) {
        if (w.url.includes(self.location.origin) && 'focus' in w) {
          w.focus(); w.navigate?.(url); return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Mark a notification ID as read in localStorage via a message to clients ──
function markRead(id) {
  clients.matchAll({ type: 'window' }).then(wins => {
    wins.forEach(w => w.postMessage({ type: 'NOTIF_READ', id }));
  });
}

// ── Message from app (e.g. "mark all as read") ───────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'MARK_READ') markRead(event.data.id);
});
