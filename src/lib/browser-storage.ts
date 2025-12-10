import type { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * Test if localStorage is actually accessible
 * The check `typeof window !== 'undefined'` is not sufficient because:
 * - Storage access can be blocked by browser policies
 * - Private/incognito mode may restrict storage
 * - Embedded iframes may not have storage access
 * - Safari private mode throws when writing
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Cache the result to avoid repeated tests
let storageAvailable: boolean | null = null;

function getStorageAvailable(): boolean {
  if (storageAvailable === null) {
    storageAvailable = isStorageAvailable();
  }
  return storageAvailable;
}

/**
 * Browser-safe storage wrapper for Zustand persist middleware
 * Prevents "Access to storage is not allowed" errors during SSR
 * and in contexts where localStorage is restricted
 */
export const createBrowserStorage = <T>(): PersistStorage<T> => {
  return {
    getItem: (name: string): StorageValue<T> | null => {
      if (!getStorageAvailable()) return null;
      try {
        const value = window.localStorage.getItem(name);
        return value ? (JSON.parse(value) as StorageValue<T>) : null;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: StorageValue<T>): void => {
      if (!getStorageAvailable()) return;
      try {
        window.localStorage.setItem(name, JSON.stringify(value));
      } catch {
        // Silently fail - storage is not available
      }
    },
    removeItem: (name: string): void => {
      if (!getStorageAvailable()) return;
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Silently fail - storage is not available
      }
    },
  };
};
