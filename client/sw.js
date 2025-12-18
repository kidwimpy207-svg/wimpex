const CACHE_NAME = 'wimpex-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/chat_component.css',
  '/chat_demo.css',
  '/app.js',
  '/manifest.json',
  '/offline.html',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const netResp = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, netResp.clone().catch(()=>{}));
        return netResp;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('/offline.html');
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      if (req.url.startsWith(self.location.origin)) {
        cache.put(req, net.clone().catch(()=>{}));
      }
      return net;
    } catch (e) {
      return cached || new Response(null, { status: 504, statusText: 'Gateway Timeout' });
    }
  })());
});

self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'Wimpex', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Wimpex';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
    icon: '/assets/icon-192.svg'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
