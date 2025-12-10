import type { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * Browser-safe storage wrapper for Zustand persist middleware
 * Prevents "Access to storage is not allowed" errors during SSR
 */
export const createBrowserStorage = <T>(): PersistStorage<T> => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  return {
    getItem: (name: string): StorageValue<T> | null => {
      if (!isBrowser) return null;
      try {
        const value = localStorage.getItem(name);
        return value ? (JSON.parse(value) as StorageValue<T>) : null;
      } catch (error) {
        console.warn(`Error reading from localStorage: ${error}`);
        return null;
      }
    },
    setItem: (name: string, value: StorageValue<T>): void => {
      if (!isBrowser) return;
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        console.warn(`Error writing to localStorage: ${error}`);
      }
    },
    removeItem: (name: string): void => {
      if (!isBrowser) return;
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.warn(`Error removing from localStorage: ${error}`);
      }
    },
  };
};
