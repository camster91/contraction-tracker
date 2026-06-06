// IndexedDB-backed auto-backup. The single source of truth for contraction data is
// localStorage (live working copy), and we mirror every write to IndexedDB so a
// localStorage wipe (browser cleanup, quota pressure) doesn't lose the history.
//
// Falls back silently to localStorage-only on browsers without IndexedDB.

const DB_NAME = 'olive-backup';
const DB_VERSION = 1;
const STORE = 'history';
const KEY = 'latest';

type BackupRecord = {
  version: number;
  savedAt: string;
  contractions: unknown[];
  current: unknown;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function autoBackup(contractions: unknown, current: unknown): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const record: BackupRecord = {
        version: 1,
        savedAt: new Date().toISOString(),
        contractions: Array.isArray(contractions) ? contractions : [],
        current: current ?? null,
      };
      const req = store.put(record, KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Dedicated backup just for the in-progress current timer.
export async function saveCurrentToIdb(current: unknown): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.put({ version: 1, savedAt: new Date().toISOString(), current, contractions: [] }, 'current');
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Clear the current timer backup from IDB (when stopped or restored)
export async function clearCurrentFromIdb(): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.delete('current');
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Re-export openDB for use in App.tsx mount effect (inline IDB read without a wrapper)
export { openDB as openDBForLoad };

// Load the standalone current-timer backup (no full history restore needed)
export async function loadCurrentBackup<T>(): Promise<{ current: T | null; savedAt: string | null } | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get('current');
      req.onsuccess = () => {
        const rec = req.result;
        if (!rec) { resolve(null); return; }
        resolve({ current: (rec.current as T | null) ?? null, savedAt: rec.savedAt ?? null });
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadAutoBackup<T>(): Promise<{ contractions: T[]; current: T | null; savedAt: string | null } | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(KEY);
      req.onsuccess = () => {
        const rec = req.result as BackupRecord | undefined;
        if (!rec) {
          resolve(null);
          return;
        }
        resolve({
          contractions: (rec.contractions as T[]) || [],
          current: (rec.current as T | null) || null,
          savedAt: rec.savedAt,
        });
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}