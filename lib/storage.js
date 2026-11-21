let dbPromise = null;

export function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('jarvis', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('days')) {
          db.createObjectStore('days', { keyPath: 'date' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDay(dateKey) {
  const db = await openDB();
  const tx = db.transaction('days', 'readonly');
  const result = await requestToPromise(tx.objectStore('days').get(dateKey));
  return result === undefined ? null : result;
}

export async function putDay(day) {
  const db = await openDB();
  const tx = db.transaction('days', 'readwrite');
  tx.objectStore('days').put(day);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAllDays() {
  const db = await openDB();
  const tx = db.transaction('days', 'readonly');
  const all = await requestToPromise(tx.objectStore('days').getAll());
  return all.sort((a, b) => a.date.localeCompare(b.date));
}
