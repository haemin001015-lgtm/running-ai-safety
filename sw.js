const CACHE = 'nightwatch-v5';
const SHELL = ['./','./index.html','./assets/app.css?v=5','./assets/app.js?v=5','./assets/data.js?v=5','./assets/fonts.css',
               './manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // 제보 전송은 항상 네트워크로
  if (new URL(req.url).origin !== location.origin) return; // 팀 저장소 호출은 캐시하지 않음
  if (req.mode === 'navigate') {                          // 화면(HTML)은 최신 우선
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then(h => h || caches.match('./index.html'))));
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
