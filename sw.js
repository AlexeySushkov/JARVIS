const CACHE = 'jarvis-v11';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js?v=11',
  '/lib/slots.js', '/lib/dates.js', '/lib/view.js', '/lib/storage.js',
  '/lib/export.js', '/lib/jarvis.js', '/lib/version.js', '/lib/notify-ui.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});

// Сеть в приоритете: пользователь всегда получает свежий код, кэш — только офлайн.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then((cached) => {
      if (cached) return cached;
      if (req.mode === 'navigate') return caches.match('/');
      return Response.error();
    }))
  );
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
