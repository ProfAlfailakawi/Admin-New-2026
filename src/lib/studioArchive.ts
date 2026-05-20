export type StudioArchiveItem = Record<string, any>;

const DB_NAME = 'smart_content_studio_archive';
const STORE_NAME = 'assets';
const DB_VERSION = 1;

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

const openArchiveDb = (): Promise<IDBDatabase | null> => {
  if (!isBrowser) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

const putAsset = async (key: string, value: string) => {
  const db = await openArchiveDb();
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
};

const getAsset = async (key: string): Promise<string | null> => {
  const db = await openArchiveDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    request.onerror = () => resolve(null);
  });
};

const isDataUrl = (value: any) => typeof value === 'string' && value.startsWith('data:');

export const loadStudioArchive = async <T extends StudioArchiveItem>(storageKey: string, imageFields: string[]): Promise<T[]> => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const hydrated = await Promise.all(parsed.map(async (item: any) => {
      const next = { ...item };
      await Promise.all(imageFields.map(async (field) => {
        const assetKey = next[`${field}ArchiveKey`];
        if ((!next[field] || next[field] === '') && assetKey) {
          const restored = await getAsset(assetKey);
          if (restored) next[field] = restored;
        }
      }));
      return next;
    }));

    return hydrated as T[];
  } catch (err) {
    console.warn(`${storageKey} load skipped:`, err);
    return [];
  }
};

export const saveStudioArchive = async <T extends StudioArchiveItem>(storageKey: string, items: T[], imageFields: string[], limit = 10) => {
  try {
    const limited = (items || []).slice(0, limit);
    const prepared = await Promise.all(limited.map(async (item: any, index) => {
      const next = { ...item };
      await Promise.all(imageFields.map(async (field) => {
        const value = next[field];
        if (isDataUrl(value)) {
          const existingKey = next[`${field}ArchiveKey`];
          const assetKey = existingKey || `${storageKey}_${field}_${Date.now()}_${index}_${Math.random().toString(36).slice(2)}`;
          const saved = await putAsset(assetKey, value);
          if (saved) {
            next[`${field}ArchiveKey`] = assetKey;
            next[field] = '';
          } else {
            next[field] = '';
          }
        }
      }));
      return next;
    }));

    localStorage.setItem(storageKey, JSON.stringify(prepared));
  } catch (err) {
    console.warn(`${storageKey} storage skipped:`, err);
  }
};
