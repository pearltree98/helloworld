// Answer recordings in IndexedDB: { id, qid, blob, mimeType, createdAt }.
// Only the newest `cap` recordings are kept; older ones are deleted first.

const DB_NAME = 'card-roleplay';
const STORE = 'recordings';
let dbPromise = null;

export const hasIDB = () => typeof indexedDB !== 'undefined';

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

/** Runs fn(store) in one transaction; resolves with the request's result (or fn's return value). */
function run(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const out = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : typeof out === 'function' ? out() : out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const saveRecording = (record) => run('readwrite', (store) => store.put(record));
export const getRecording = (id) => run('readonly', (store) => store.get(id));
export const countRecordings = () => run('readonly', (store) => store.count());
export const clearRecordings = () => run('readwrite', (store) => store.clear());

/** Deletes the oldest recordings beyond `cap`; resolves with how many were deleted. */
export function pruneRecordings(cap) {
  return run('readwrite', (store) => {
    let deleted = 0;
    const countReq = store.count();
    countReq.onsuccess = () => {
      let excess = countReq.result - cap;
      if (excess <= 0) return;
      const cursorReq = store.index('createdAt').openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor || excess <= 0) return;
        cursor.delete();
        deleted++;
        excess--;
        cursor.continue();
      };
    };
    return () => deleted;
  });
}
