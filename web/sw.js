// Offline support for the web app (iPhone / iPad home screen, any browser).
// scripts/build-web.mjs fills in VERSION and FILES; a new deploy gives a new VERSION, so the
// new files are downloaded in the background and used the next time the app is opened.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = 'setplan-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('setplan-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('./') : null);
    return hit || fetch(req);
  }));
});
