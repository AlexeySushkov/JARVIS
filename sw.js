const CACHE = 'jarvis-v2';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js',
  '/lib/slots.js', '/lib/dates.js', '/lib/view.js', '/lib/storage.js',
  '/lib/export.js', '/lib/jarvis.js', '/lib/schedule.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put('/', copy));
      return res;
    }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});

self.addEventListener('push', (e) => {
  let payload = {};
  try { payload = e.data.json(); } catch (err) {}
  const title = payload.title || 'JARVIS';
  const options = {
    body: payload.body || '',
    data: payload.data || {},
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  const params = new URLSearchParams();
  if (d.slotId) params.set('slot', d.slotId);
  if (d.targetDayKey) params.set('date', d.targetDayKey);
  const q = params.toString();
  const url = q ? '/?' + q : '/';
  e.waitUntil(clients.openWindow(url));
});
