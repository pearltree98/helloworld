// IndexedDB 저장소. 모든 데이터는 이 기기 안에만 있다.
const DB_NAME = 'fieldnote';
const DB_VERSION = 1;

let dbPromise;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('visits')) {
        const s = db.createObjectStore('visits', { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
        s.createIndex('placeId', 'placeId');
      }
      if (!db.objectStoreNames.contains('places')) db.createObjectStore('places', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode = 'readonly') {
  const db = await open();
  return db.transaction(name, mode).objectStore(name);
}

async function tx(names, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(names, 'readwrite');
    const stores = Object.fromEntries(names.map((n) => [n, t.objectStore(n)]));
    fn(stores);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ── 방문 ──
export async function allVisits() {
  const list = await wrap((await store('visits')).getAll());
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export const getVisit = async (id) => wrap((await store('visits')).get(id));
export const putVisit = async (v) => wrap((await store('visits', 'readwrite')).put({ ...v, updatedAt: new Date().toISOString() }));
export const deleteVisit = async (id) => wrap((await store('visits', 'readwrite')).delete(id));

// ── 장소 ──
export const allPlaces = async () => wrap((await store('places')).getAll());
export const getPlace = async (id) => wrap((await store('places')).get(id));
export const putPlace = async (p) => wrap((await store('places', 'readwrite')).put(p));

// ── 설정(key-value) ──
export async function getKV(key, fallback = null) {
  const row = await wrap((await store('kv')).get(key));
  return row ? row.value : fallback;
}
export const setKV = async (key, value) => wrap((await store('kv', 'readwrite')).put({ key, value }));
export const delKV = async (key) => wrap((await store('kv', 'readwrite')).delete(key));

/** 방문 기록이 없는 장소 정리 */
export async function prunePlaces() {
  const [visits, places] = await Promise.all([allVisits(), allPlaces()]);
  const used = new Set(visits.map((v) => v.placeId));
  const orphan = places.filter((p) => !used.has(p.id));
  if (orphan.length) await tx(['places'], ({ places: s }) => orphan.forEach((p) => s.delete(p.id)));
}

export async function bulkPut({ visits = [], places = [] }) {
  await tx(['visits', 'places'], (s) => {
    places.forEach((p) => s.places.put(p));
    visits.forEach((v) => s.visits.put(v));
  });
}

export async function deleteWhere(pred) {
  const [visits, places] = await Promise.all([allVisits(), allPlaces()]);
  await tx(['visits', 'places'], (s) => {
    visits.filter(pred).forEach((v) => s.visits.delete(v.id));
    places.filter(pred).forEach((p) => s.places.delete(p.id));
  });
}

export async function clearAll() {
  await tx(['visits', 'places', 'kv'], (s) => {
    s.visits.clear();
    s.places.clear();
    s.kv.clear();
  });
}
