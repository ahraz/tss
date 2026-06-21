// ============================================================
// GTA Scrub — IndexedDB Photo Store
// ============================================================
// Photos (clock-in/out, receipts) are stored as base64 data URLs
// in IndexedDB instead of localStorage, so they don't blow the
// ~5 MB localStorage quota. Shifts and expenses store only a
// photo ID reference in localStorage; the actual blob lives here.
// ============================================================

const DB_NAME = 'gta-scrub-photo-store';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save a photo (data URL string) by key.
 * Keys follow the pattern: `shift:<shiftId>:in`, `shift:<shiftId>:out`, `expense:<expenseId>`.
 */
export async function putPhoto(key: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataUrl, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Retrieve a photo (data URL string) by key.
 * Returns `null` if not found.
 */
export async function getPhoto(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/**
 * Delete a photo by key.
 */
export async function deletePhoto(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Delete all photos whose keys start with a given prefix.
 * Used for bulk cleanup (e.g. clear shifts older than N days).
 */
export async function deletePhotosByPrefix(prefix: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    let deleted = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (String(cursor.key).startsWith(prefix)) {
          cursor.delete();
          deleted++;
        }
        cursor.continue();
      } else {
        db.close();
        resolve(deleted);
      }
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/**
 * Count total photos and estimate their size (in bytes).
 */
export async function getPhotoStoreInfo(): Promise<{ count: number; estimatedBytes: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    let count = 0;
    let estimatedBytes = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        count++;
        estimatedBytes += (String(cursor.value).length * 2);
        cursor.continue();
      } else {
        db.close();
        resolve({ count, estimatedBytes });
      }
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
