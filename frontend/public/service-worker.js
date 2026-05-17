/* ═══════════════════════════════════════════════════════════════════════════
   PRAGATI Service Worker — v1.0
   Strategy:
   - App shell (HTML/CSS/JS)  → Cache First
   - API calls                → Network First, fall back to cache
   - Google Fonts             → Cache First with long TTL
   - Images/Icons             → Cache First
   ═══════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME      = 'pragati-v1';
const API_CACHE_NAME  = 'pragati-api-v1';
const FONT_CACHE_NAME = 'pragati-fonts-v1';

// App shell resources to pre-cache on install
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

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Pre-cache partial failure (OK):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const allowedCaches = [CACHE_NAME, API_CACHE_NAME, FONT_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (!allowedCaches.includes(key)) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── Google Fonts: Cache First ──
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE_NAME, 60 * 60 * 24 * 365));
    return;
  }

  // ── API calls: Network First with 5s timeout, fall back to cache ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE_NAME, 5000));
    return;
  }

  // ── Same-origin static assets (JS, CSS, images): Cache First ──
  if (url.origin === location.origin && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  )) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // ── HTML navigation: Network First, fallback to cached index.html ──
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // ── Default: Network First ──
  event.respondWith(networkFirst(request, CACHE_NAME));
});

/* ── Strategy implementations ────────────────────────────────────────────── */

async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cache   = await caches.open(cacheName);
  const cached  = await cache.match(request);
  if (cached) {
    // Optional: check if it's too old
    if (maxAgeSeconds) {
      const dateHeader = cached.headers.get('date');
      if (dateHeader) {
        const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
        if (age > maxAgeSeconds) {
          return fetchAndCache(request, cache) || cached;
        }
      }
    }
    return cached;
  }
  return fetchAndCache(request, cache);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cache.match(request) || offlineFallback();
  }
}

async function networkFirstWithTimeout(request, cacheName, timeout) {
  const cache = await caches.open(cacheName);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timer);
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving API from cache (offline):', request.url);
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try to serve cached page
    const cache  = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fall back to index.html for SPA routing
    const index  = await cache.match('/index.html');
    if (index) return index;
    // Last resort: offline page
    return cache.match('/offline.html') || offlineFallback();
  }
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback();
  }
}

function offlineFallback() {
  return new Response('<h1>You are offline</h1><p>Please check your internet connection.</p>', {
    headers: { 'Content-Type': 'text/html' },
  });
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
    tag:     data.tag     || 'pragati-notif',
    data:    data.url     || '/dashboard',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open',    title: '📖 Open App' },
      { action: 'dismiss', title: '✕ Dismiss'  },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'PRAGATI', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
