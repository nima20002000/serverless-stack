import type { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * Safely get localStorage reference without throwing
 * Some browsers throw even when accessing the localStorage property
 */
function getLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    // Some contexts throw when just accessing window.localStorage
    const storage = window.localStorage;
    // Test if we can actually use it
    const testKey = '__zustand_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

// Lazy-initialized storage reference
let cachedStorage: Storage | null | undefined = undefined;

function getStorage(): Storage | null {
  if (cachedStorage === undefined) {
    cachedStorage = getLocalStorage();
  }
  return cachedStorage;
}

/**
 * Browser-safe storage adapter for Zustand persist middleware
 *
 * This adapter safely handles all edge cases:
 * - Server-side rendering (window undefined)
 * - Private/incognito browsing modes
 * - Restricted iframe contexts
 * - Browser extensions blocking storage
 * - Safari's strict storage policies
 *
 * When storage is unavailable, operations silently no-op and
 * getItem returns null (Zustand uses initial state)
 */
export const createBrowserStorage = <T>(): PersistStorage<T> => {
  return {
    getItem: (name: string): StorageValue<T> | null => {
      try {
        const storage = getStorage();
        if (!storage) return null;
        const value = storage.getItem(name);
        return value ? (JSON.parse(value) as StorageValue<T>) : null;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: StorageValue<T>): void => {
      try {
        const storage = getStorage();
        if (!storage) return;
        storage.setItem(name, JSON.stringify(value));
      } catch {
        // Storage unavailable or quota exceeded - silently fail
      }
    },
    removeItem: (name: string): void => {
      try {
        const storage = getStorage();
        if (!storage) return;
        storage.removeItem(name);
      } catch {
        // Storage unavailable - silently fail
      }
    },
  };
};
