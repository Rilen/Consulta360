const CACHE_NAME = 'consulta360-v2';
const ASSETS = [
  './',
  './index.html',
  './favicon.ico',
  './assets/css/global.css',
  './assets/js/api.js',
  './assets/js/auditoria.js',
  './assets/js/autosync.js',
  './assets/js/config.js',
  './assets/js/contracheque.js',
  './assets/js/db.js',
  './assets/js/despesas.js',
  './assets/js/evolucao.js',
  './assets/js/graficos.js',
  './assets/js/home.js',
  './assets/js/layout.js',
  './assets/js/receitas.js',
  './assets/js/router.js',
  './assets/js/dashboard.js',
  './assets/js/diff.js',
  './assets/js/comparacao.js',
  './components/footer/npa.js',
  './components/footer/versao.js',
  './components/header/logo.js',
  './components/header/menu.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Não interceptar requisições para a API externa ou para o /data/ (que já usa IndexedDB/WebDAV)
  if (e.request.url.includes('/data/') || e.request.url.includes('/dadosabertos') || e.request.url.includes('.workers.dev')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Opcional: fazer cache de novos assets que passarem por aqui
          if (e.request.url.startsWith('http') && e.request.method === 'GET') {
            cache.put(e.request, fetchRes.clone());
          }
          return fetchRes;
        });
      });
    })
  );
});
