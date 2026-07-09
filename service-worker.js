// service-worker.js — PWA Cache Shell
// ATENÇÃO: Atualize CACHE_NAME a cada deploy (alinhado à versão do app no footer).
// Versão atual: v0.0.10 → CACHE_NAME = 'consulta360-v10'
const CACHE_NAME = 'consulta360-v10';
const ASSETS = [
  './',
  './index.html',
  './favicon.ico',
  './manifest.json',
  './assets/css/global.css',
  // ── Scripts de lógica ──
  './assets/js/api.js',
  './assets/js/auditoria.js',
  './assets/js/autosync.js',
  './assets/js/comparacao.js',
  './assets/js/config.js',
  './assets/js/contracheque.js',
  './assets/js/dashboard.js',
  './assets/js/db.js',
  './assets/js/despesas.js',
  './assets/js/diff.js',
  './assets/js/evolucao.js',
  './assets/js/graficos.js',
  './assets/js/home.js',
  './assets/js/layout.js',
  './assets/js/receitas.js',
  './assets/js/router.js',
  './assets/js/logger.js',
  './assets/js/logs.js',
  './assets/js/workers/agregadorWorker.js',
  // ── Componentes ──
  './components/footer/npa.js',
  './components/footer/versao.js',
  './components/header/menu.js',
  // ── Fragmentos HTML (body) — necessário para navegação offline ──
  './body/auditoria_ia.html',
  './body/changelog.html',
  './body/comparacao.html',
  './body/config.html',
  './body/contracheque.html',
  './body/dashboard.html',
  './body/despesas.html',
  './body/diff.html',
  './body/evolucao.html',
  './body/graficos.html',
  './body/home.html',
  './body/info.html',
  './body/receitas.html',
  './body/logs.html',
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
          // Cache de novos assets que passarem por aqui (GET apenas)
          if (e.request.url.startsWith('http') && e.request.method === 'GET') {
            cache.put(e.request, fetchRes.clone());
          }
          return fetchRes;
        });
      });
    })
  );
});
