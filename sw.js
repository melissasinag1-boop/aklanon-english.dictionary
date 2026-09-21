// Offline support. Change CACHE (for example to v2) after editing files
// so returning users receive the new version.
const CACHE = 'aklanon-dictionary-v1';

const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'entries.json',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Serve from cache right away, refresh the cache in the background.
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async function (cache) {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then(function (res) {
          if (res && res.ok && res.status === 200) cache.put(req, res.clone()).catch(function () {});
          return res;
        })
        .catch(function () { return null; });

      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') return cache.match('index.html');
      return Response.error();
    })
  );
});
