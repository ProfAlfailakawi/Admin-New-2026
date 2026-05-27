type AnyRecord = Record<string, any>;

const PROTECTED_EXACT_KEYS = new Set(['shared_company_data']);
const BACKUP_SUFFIXES = ['_last_good', '_backup', '__last_good', '__recovery'];
const IMPORTANT_COLLECTION_KEYS = [
  'invoices',
  'orders',
  'customers',
  'expenses',
  'testimonials',
  'products',
  'supplierCopies',
  'pulseAnalysisHistory',
  'pulseReviews',
  'campaigns',
  'squads',
  'promocodes',
  'diwaniyaOrders',
];

const rawStorage = (() => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const proto = Object.getPrototypeOf(window.localStorage);
  return {
    getItem: proto.getItem.bind(window.localStorage) as Storage['getItem'],
    setItem: proto.setItem.bind(window.localStorage) as Storage['setItem'],
    removeItem: proto.removeItem.bind(window.localStorage) as Storage['removeItem'],
    clear: proto.clear.bind(window.localStorage) as Storage['clear'],
    key: proto.key.bind(window.localStorage) as Storage['key'],
    get length() {
      return window.localStorage.length;
    },
  };
})();

export const isProtectedStorageKey = (key: string) =>
  key.startsWith('ktk_') || PROTECTED_EXACT_KEYS.has(key);

const isBackupKey = (key: string) => BACKUP_SUFFIXES.some(suffix => key.endsWith(suffix));

const parseMaybeJson = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const hasMeaningfulData = (value: any): boolean => {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value !== 'object') return true;

  const record = value as AnyRecord;
  if (IMPORTANT_COLLECTION_KEYS.some(key => Array.isArray(record[key]) && record[key].length > 0)) {
    return true;
  }

  return Object.entries(record).some(([key, item]) => {
    if (key === 'settings' || key === 'appVersion' || key === 'version') return false;
    if (Array.isArray(item)) return item.length > 0;
    if (item && typeof item === 'object') return Object.keys(item).length > 0;
    return item !== undefined && item !== null && item !== '';
  });
};

const mergeArrayByIdentity = (oldArray: any[], newArray: any[]) => {
  if (newArray.length === 0 && oldArray.length > 0) return oldArray;
  if (newArray.length > 0 && newArray.length < oldArray.length) return newArray;

  const byKey = new Map<string, any>();
  const order: string[] = [];
  const push = (item: any, index: number, source: 'old' | 'new') => {
    const key = item && typeof item === 'object'
      ? String(item.id ?? item.docId ?? item.invoiceId ?? item.orderId ?? item.code ?? item.phone ?? `${source}-${index}`)
      : `${source}-${index}`;
    if (!byKey.has(key)) order.push(key);
    const prev = byKey.get(key);
    byKey.set(key, prev && item && typeof item === 'object' ? safeMergeData(prev, item) : item);
  };

  oldArray.forEach((item, index) => push(item, index, 'old'));
  newArray.forEach((item, index) => push(item, index, 'new'));
  return order.map(key => byKey.get(key));
};

export const safeMergeData = <T = any>(oldValue: any, newValue: T): T => {
  if (!hasMeaningfulData(newValue) && hasMeaningfulData(oldValue)) return oldValue as T;
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    return mergeArrayByIdentity(oldValue, newValue) as T;
  }
  if (
    oldValue &&
    newValue &&
    typeof oldValue === 'object' &&
    typeof newValue === 'object' &&
    !Array.isArray(oldValue) &&
    !Array.isArray(newValue)
  ) {
    const merged: AnyRecord = { ...(oldValue as AnyRecord), ...(newValue as AnyRecord) };
    Object.keys(merged).forEach(key => {
      const oldChild = (oldValue as AnyRecord)[key];
      const newChild = (newValue as AnyRecord)[key];
      if (newChild === undefined || newChild === null) {
        merged[key] = oldChild;
      } else if (!hasMeaningfulData(newChild) && hasMeaningfulData(oldChild)) {
        merged[key] = oldChild;
      } else if (Array.isArray(oldChild) && Array.isArray(newChild)) {
        merged[key] = mergeArrayByIdentity(oldChild, newChild);
      } else if (
        oldChild &&
        newChild &&
        typeof oldChild === 'object' &&
        typeof newChild === 'object' &&
        !Array.isArray(oldChild) &&
        !Array.isArray(newChild)
      ) {
        merged[key] = safeMergeData(oldChild, newChild);
      }
    });
    return merged as T;
  }
  return newValue;
};

const writeRaw = (key: string, value: string) => {
  try {
    rawStorage?.setItem(key, value);
  } catch (err: any) {
    if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
      console.error(`[DATA_GUARD] LocalStorage quota exceeded while writing '${key}'.`);
      // Optional: try to clear oldest backups if quota is hit
      try {
        const backupKeys = [];
        for (let i = 0; i < (rawStorage?.length || 0); i++) {
          const k = rawStorage?.key(i);
          if (k && isBackupKey(k)) backupKeys.push(k);
        }
        // Remove oldest 2 backups to try making space
        backupKeys.slice(0, 2).forEach(bk => rawStorage?.removeItem(bk));
      } catch (e) {}
    } else {
      console.error(`[DATA_GUARD] LocalStorage write error for '${key}':`, err);
    }
  }
};

const rememberGoodCopy = (key: string, serializedValue: string) => {
  if (!rawStorage || isBackupKey(key)) return;
  const parsed = parseMaybeJson(serializedValue);
  if (!hasMeaningfulData(parsed)) return;

  // Avoid redundant backups for large files to save quota
  // If the data is > 500KB, we only keep one backup
  const isLarge = serializedValue.length > 500000;
  
  writeRaw(`${key}__last_good`, serializedValue);
  
  if (!isLarge) {
    writeRaw(`${key}__recovery`, JSON.stringify({
      savedAt: new Date().toISOString(),
      value: serializedValue,
    }));
  } else {
    // For large files, cleanup the recovery key to save space
    try { rawStorage.removeItem(`${key}__recovery`); } catch(e) {}
  }
};

export const readLastGoodStorageValue = (key: string): string | null => {
  if (!rawStorage) return null;
  const direct = rawStorage.getItem(`${key}__last_good`) || rawStorage.getItem(`${key}_last_good`) || rawStorage.getItem(`${key}_backup`);
  if (direct) return direct;
  const recovery = parseMaybeJson(rawStorage.getItem(`${key}__recovery`));
  return typeof recovery?.value === 'string' ? recovery.value : null;
};

export const getProtectedStorageItem = (key: string): string | null => {
  if (!rawStorage) return null;
  const current = rawStorage.getItem(key);
  if (hasMeaningfulData(parseMaybeJson(current))) return current;
  const fallback = readLastGoodStorageValue(key);
  return hasMeaningfulData(parseMaybeJson(fallback)) ? fallback : current;
};

export const setProtectedStorageItem = (key: string, value: string): boolean => {
  if (!rawStorage) return false;
  if (!isProtectedStorageKey(key) || isBackupKey(key)) {
    writeRaw(key, value);
    return true;
  }

  const current = rawStorage.getItem(key);
  // Optimization: If current value is exactly the same as incoming, skip everything
  if (current === value && value !== null) return true;

  const currentParsed = parseMaybeJson(current);
  const incomingParsed = parseMaybeJson(value);

  if (!hasMeaningfulData(incomingParsed) && hasMeaningfulData(currentParsed)) {
    rememberGoodCopy(key, current || '');
    console.warn(`[DATA_GUARD] Blocked empty overwrite for localStorage key '${key}'.`);
    return false;
  }

  const finalValue = hasMeaningfulData(currentParsed)
    ? JSON.stringify(safeMergeData(currentParsed, incomingParsed))
    : value;

  // Final check: if merged value is same as current, skip redundant write
  if (finalValue === current && current !== null) return true;

  if (hasMeaningfulData(currentParsed)) rememberGoodCopy(key, current || '');
  writeRaw(key, finalValue);
  rememberGoodCopy(key, finalValue);
  return true;
};

export const removeProtectedStorageItemIntentionally = (key: string) => {
  if (!rawStorage) return;
  const current = rawStorage.getItem(key);
  if (isProtectedStorageKey(key) && hasMeaningfulData(parseMaybeJson(current))) {
    rememberGoodCopy(key, current || '');
  }
  rawStorage.removeItem(key);
};

export const installLocalStorageDataGuard = () => {
  if (!rawStorage || (window as any).__ktkDataGuardInstalled) return;
  (window as any).__ktkDataGuardInstalled = true;

  const guardedSetItem = function (key: string, value: string) {
    const storageKey = String(key);
    const storageValue = String(value);
    if (isProtectedStorageKey(storageKey)) {
      setProtectedStorageItem(storageKey, storageValue);
      return;
    }
    rawStorage.setItem(storageKey, storageValue);
  };

  const guardedRemoveItem = function (key: string) {
    const storageKey = String(key);
    if (isProtectedStorageKey(storageKey) && !isBackupKey(storageKey)) {
      const current = rawStorage.getItem(storageKey);
      if (hasMeaningfulData(parseMaybeJson(current))) rememberGoodCopy(storageKey, current || '');
      console.warn(`[DATA_GUARD] Blocked removeItem for protected localStorage key '${storageKey}'.`);
      return;
    }
    rawStorage.removeItem(storageKey);
  };

  const guardedClear = function () {
    const preserved: Record<string, string> = {};
    for (let i = 0; i < rawStorage.length; i += 1) {
      const key = rawStorage.key(i);
      if (!key || !isProtectedStorageKey(key)) continue;
      const value = rawStorage.getItem(key);
      if (value !== null) preserved[key] = value;
    }
    rawStorage.clear();
    Object.entries(preserved).forEach(([key, value]) => rawStorage.setItem(key, value));
    console.warn('[DATA_GUARD] localStorage.clear() preserved protected KTK data.');
  };

  const proto = Object.getPrototypeOf(window.localStorage);
  proto.setItem = guardedSetItem;
  proto.removeItem = guardedRemoveItem;
  proto.clear = guardedClear;
};
