const CACHE_NAME = 'darkom-gypsum-pro-v44';
const ASSETS = ['./', './index.html', './catalog.default.json', './tailwind.css', './prices/', './works/', './calc/', './faq/', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js', './vendor/qrcode.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  // network first so a new release shows up on the next open; cache is only the offline fallback
  e.respondWith(fetch(e.request).then((r) => {
    if (r.status === 200) { const cl = r.clone(); caches.open(CACHE_NAME).then((ca) => ca.put(e.request, cl)); }
    return r;
  }).catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html'))));
});
