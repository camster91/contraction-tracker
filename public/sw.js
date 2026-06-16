/* Olive — Contraction Timer PWA service worker.
 * Cache-first for app shell, network-first for HTML.
 * Pre-caches JS/CSS bundles during install so the app loads
 * instantly on repeat visits. */

const CACHE_NAME = 'olive-v9';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the shell
      return cache.addAll(APP_SHELL).then(() => {
        // Also pre-cache all JS, CSS, and font assets from the current build
        // so the app loads instantly on repeat visits
        return fetch('/')
          .then((r) => r.text())
          .then((html) => {
            const matches = html.match(/\/assets\/[^\s"']+\.(?:js|css|woff2?)/g);
            if (matches) return cache.addAll([...new Set(matches)]).catch(() => {});
          })
          .catch(() => {});
      }).catch(() => {});
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML so updates ship immediately
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((r) => r || new Response('Offline', { status: 503 }))),
    );
    return;
  }

  // Cache-first for everything else (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    }),
  );
});
