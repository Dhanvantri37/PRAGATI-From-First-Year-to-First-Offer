// ── PRAGATI Service Worker Registration ──────────────────────────────────────
// Registers the custom service-worker.js from /public/
// Call register() to enable PWA features; call unregister() to disable.

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/)
);

export function register(config) {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported in this browser.');
    return;
  }

  const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

  if (isLocalhost) {
    // On localhost, validate the SW before registering
    checkValidServiceWorker(swUrl, config);
    navigator.serviceWorker.ready.then(() => {
      console.log('[SW] Running in offline-first mode via service worker (localhost).');
    });
  } else {
    // Production: just register
    registerValidSW(swUrl, config);
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker.register(swUrl).then(registration => {
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content available — trigger config callback
            console.log('[SW] New content available — will load on next page refresh.');
            if (config && config.onUpdate) config.onUpdate(registration);
          } else {
            console.log('[SW] Content cached for offline use.');
            if (config && config.onSuccess) config.onSuccess(registration);
          }
        }
      };
    };
  }).catch(error => {
    console.error('[SW] Registration failed:', error);
  });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then(response => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && !contentType.includes('javascript'))
      ) {
        // SW not found — reload
        navigator.serviceWorker.ready.then(registration => registration.unregister())
          .then(() => window.location.reload());
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[SW] No internet connection. Running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => registration.unregister())
      .catch(error => console.error(error.message));
  }
}
