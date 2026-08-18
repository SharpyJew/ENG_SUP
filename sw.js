const CACHE_NAME = 'eng-sup-cache-v1';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // Главная страница — сначала сеть (чтобы всегда видеть свежую версию),
  // офлайн — последняя закэшированная копия. Кэш обновляется сам при каждом
  // успешном онлайн-заходе, вручную чистить не нужно.
  if(req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/ENG_SUP/') || url.pathname === '/'){
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return resp;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Файлы из docs/ (PDF и т.д.) — не меняются после заливки, кэшируем при первом просмотре
  if(url.pathname.includes('/docs/')){
    event.respondWith(
      caches.match(req).then(cached => {
        if(cached) return cached;
        return fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return resp;
        });
      })
    );
    return;
  }

  // Всё остальное (иконка, манифест, шрифты) — сеть, а если недоступна — кэш
  event.respondWith(
    fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return resp;
    }).catch(() => caches.match(req))
  );
});
