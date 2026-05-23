import type { StudioBackgroundPresetId, StudioRealityMode } from './studioReality';

export type StudioTasteSignal = {
  mode?: StudioRealityMode;
  background?: StudioBackgroundPresetId;
  theme?: string;
  format?: string;
  label?: string;
  source?: string;
};

export type StudioBackgroundLibraryItem = StudioTasteSignal & {
  id: string;
  url: string;
  createdAt: string;
  usedCount: number;
  caption?: string | null;
  auditScore?: number | null;
};

type StudioTasteProfile = {
  modes: Record<string, number>;
  backgrounds: Record<string, number>;
  themes: Record<string, number>;
  formats: Record<string, number>;
  labels: Record<string, number>;
  lastUpdated: string;
};

const TASTE_KEY = 'smart_studio_taste_profile_v1';
const LIBRARY_META_KEY = 'smart_studio_background_library_meta_v1';
const DB_NAME = 'smart_content_studio_learning';
const STORE_NAME = 'background_assets';
const DB_VERSION = 1;
const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

const emptyProfile = (): StudioTasteProfile => ({ modes: {}, backgrounds: {}, themes: {}, formats: {}, labels: {}, lastUpdated: new Date().toISOString() });

const increment = (bucket: Record<string, number>, key?: string) => {
  const clean = String(key || '').trim();
  if (!clean) return;
  bucket[clean] = (bucket[clean] || 0) + 1;
};

const topKeys = (bucket: Record<string, number>, max = 3) => Object.entries(bucket || {})
  .sort((a, b) => b[1] - a[1])
  .slice(0, max)
  .map(([key]) => key);

const openLearningDb = (): Promise<IDBDatabase | null> => {
  if (!isBrowser) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

const putAsset = async (key: string, value: string) => {
  const db = await openLearningDb();
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
};

const getAsset = async (key: string): Promise<string | null> => {
  const db = await openLearningDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    request.onerror = () => resolve(null);
  });
};

export const loadStudioTasteProfile = (): StudioTasteProfile => {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw);
    return {
      modes: parsed?.modes || {},
      backgrounds: parsed?.backgrounds || {},
      themes: parsed?.themes || {},
      formats: parsed?.formats || {},
      labels: parsed?.labels || {},
      lastUpdated: parsed?.lastUpdated || new Date().toISOString(),
    };
  } catch {
    return emptyProfile();
  }
};

export const recordStudioTasteChoice = (signal: StudioTasteSignal) => {
  try {
    const profile = loadStudioTasteProfile();
    increment(profile.modes, signal.mode);
    increment(profile.backgrounds, signal.background);
    increment(profile.themes, signal.theme);
    increment(profile.formats, signal.format);
    increment(profile.labels, signal.label || signal.source);
    profile.lastUpdated = new Date().toISOString();
    localStorage.setItem(TASTE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Studio taste learning skipped:', err);
  }
};

export const buildStudioTastePrompt = () => {
  const profile = loadStudioTasteProfile();
  const favoriteModes = topKeys(profile.modes, 2);
  const favoriteBackgrounds = topKeys(profile.backgrounds, 4);
  const favoriteThemes = topKeys(profile.themes, 3);
  const favoriteFormats = topKeys(profile.formats, 2);
  const parts = [
    favoriteModes.length ? `Preferred realism modes: ${favoriteModes.join(', ')}` : '',
    favoriteBackgrounds.length ? `Preferred restaurant background types: ${favoriteBackgrounds.join(', ')}` : '',
    favoriteThemes.length ? `Preferred visual themes: ${favoriteThemes.join(', ')}` : '',
    favoriteFormats.length ? `Preferred content formats: ${favoriteFormats.join(', ')}` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `USER TASTE MEMORY: Respect the user's repeated selections when choosing the background and camera feel. ${parts.join('. ')}. Keep the result human-real, ordinary, and believable; never override the dish lock or reality bans.`;
};

export const loadStudioBackgroundLibrary = async (): Promise<StudioBackgroundLibraryItem[]> => {
  try {
    const raw = localStorage.getItem(LIBRARY_META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const hydrated = await Promise.all(parsed.map(async (item: any) => {
      const url = item.assetKey ? await getAsset(item.assetKey) : item.url;
      return { ...item, url: url || '' } as StudioBackgroundLibraryItem;
    }));
    return hydrated.filter((item) => item.url);
  } catch (err) {
    console.warn('Studio background library load skipped:', err);
    return [];
  }
};

export const saveStudioBackgroundToLibrary = async (item: Omit<StudioBackgroundLibraryItem, 'id' | 'createdAt' | 'usedCount'>) => {
  const id = `studio_bg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const assetKey = `${id}_image`;
  const saved = await putAsset(assetKey, item.url);
  if (!saved) throw new Error('تعذر حفظ الخلفية داخل مكتبة المتصفح');
  const raw = localStorage.getItem(LIBRARY_META_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const meta = {
    ...item,
    id,
    url: '',
    assetKey,
    createdAt: new Date().toISOString(),
    usedCount: 0,
  };
  const next = [meta, ...(Array.isArray(current) ? current : []).filter((entry: any) => entry.id !== id)].slice(0, 24);
  localStorage.setItem(LIBRARY_META_KEY, JSON.stringify(next));
  recordStudioTasteChoice({ mode: item.mode, background: item.background, theme: item.theme, format: item.format, label: item.label || 'saved-background', source: 'background-library-save' });
  return { ...meta, url: item.url } as StudioBackgroundLibraryItem;
};

export const markStudioBackgroundUsed = (item: StudioBackgroundLibraryItem) => {
  try {
    const raw = localStorage.getItem(LIBRARY_META_KEY);
    const current = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(current)) return;
    const next = current.map((entry: any) => entry.id === item.id ? { ...entry, usedCount: (entry.usedCount || 0) + 1 } : entry);
    localStorage.setItem(LIBRARY_META_KEY, JSON.stringify(next));
    recordStudioTasteChoice({ mode: item.mode, background: item.background, theme: item.theme, format: item.format, label: item.label || 'library-background', source: 'background-library-use' });
  } catch (err) {
    console.warn('Studio background usage learning skipped:', err);
  }
};
