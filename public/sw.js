const CACHE_NAME = 'sonamonir-pathshala-pwa-v25-fresh';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest?v=sonamonir_v25',
  '/privacy-policy.html',
  '/sonamonir-icon-192.png?v=6',
  '/sonamonir-icon-512.png?v=6',
  '/sonamonir-maskable-512.png?v=6',
  '/favicon.png?v=6',
  '/mian_bhai.jpg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Full offline caching for Google Play Store review (caches HTML shell, JS/CSS bundles, images, and audio)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/@vite')) {
    return;
  }

  const isStaticAsset = /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff|woff2|mp3)$/i.test(url.pathname);

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, clone);
              cache.put('/', clone.clone());
            }).catch(() => {});
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req, { ignoreSearch: true });
        })
    );
    return;
  }

  event.respondWith(
    fetch(req).catch(() => {
      return caches.match(req, { ignoreSearch: true }).then((cached) => cached || caches.match('/'));
    })
  );
});
