const CACHE = 'atlas-v11';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/precache.json', {cache:'no-store'});
    if (!response.ok) throw new Error('Precache manifest unavailable');
    const assets = await response.json();
    const cache = await caches.open(CACHE);
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('atlas-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') return (await cache.match('/index.html')) || fetch(event.request);
    return (await cache.match(event.request, {ignoreSearch:true})) || fetch(event.request);
  })());
});
