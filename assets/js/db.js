// ----------------------------------------------------
// BANCO DE DADOS LOCAL: IndexedDB Wrapper
// ----------------------------------------------------
const DB_NAME = 'Consulta360_DB';
const DB_VERSION = 3;
const STORE_NAME = 'folha_cache';
const STORE_AGREGADA = 'folha_agregada_cpf';

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_AGREGADA)) {
        db.createObjectStore(STORE_AGREGADA, { keyPath: 'id' });
      }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

async function setCache(id, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, data, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCache(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => reject(req.error);
  });
}

async function getCacheRaw(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function removeCache(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, STORE_AGREGADA], 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.objectStore(STORE_AGREGADA).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------------------------------------------
// Agregação por CPF
// ----------------------------------------------------
async function setAgregada(id, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AGREGADA, 'readwrite');
    const store = tx.objectStore(STORE_AGREGADA);
    store.put({ id, data, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAgregada(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AGREGADA, 'readonly');
    const store = tx.objectStore(STORE_AGREGADA);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => reject(req.error);
  });
}

// Retorna todos os registros do cache (sem filtro)
async function getAllCache() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Retorna apenas as chaves do cache, opcionalmente filtradas por prefixo
async function listCacheKeys(prefix = '') {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = prefix
      ? store.openCursor(IDBKeyRange.bound(prefix, prefix + '\uffff'))
      : store.openCursor();
    const keys = [];
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { keys.push(cursor.key); cursor.continue(); }
      else { resolve(keys); }
    };
    req.onerror = () => reject(req.error);
  });
}

// Limpa todo o cache e metadados de forma encapsulada
async function clearAllCache() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, STORE_AGREGADA, 'metadata'], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(STORE_AGREGADA).clear();
    tx.objectStore('metadata').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------------------------------------------
// Metadados (Para Sincronização em Massa)
// ----------------------------------------------------

async function setMetadata(key, value) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    store.put({ key, value, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getMetadata(key) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------
// Helper: Resolve o label de data/hora de um cache
// Elimina bloco duplicado em home.js, graficos.js, auditoria.js
// ----------------------------------------------------
async function resolveTimestampLabel(cacheKey, metaKey) {
  const meta = await getMetadata(metaKey);
  if (meta && meta.timestamp) {
    const d = new Date(meta.timestamp);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR')}`;
  }
  const rawObj = await getCacheRaw(cacheKey);
  if (rawObj && rawObj.timestamp) {
    const d = new Date(rawObj.timestamp);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR')}`;
  }
  return 'Data desconhecida';
}
