'use client';

import { useEffect, useCallback, useRef } from 'react';

interface BuildVersion {
  buildId: string;
  gitHash: string | null;
  buildTime: string;
  timestamp: number;
}

interface VersionCheckOptions {
  checkInterval?: number; // ms between checks (default: 5 minutes)
  onUpdateAvailable?: (newVersion: BuildVersion) => void;
}

const DEFAULT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'kitia_build_version';

/**
 * Hook that monitors for new app versions and handles cache clearing.
 *
 * When a new version is detected:
 * 1. Clears all service worker caches
 * 2. Unregisters old service workers
 * 3. Calls onUpdateAvailable callback
 * 4. Stores new version in localStorage
 *
 * The hook registers a service worker on mount and periodically checks
 * the /api/version endpoint for updates.
 */
export function useVersionCheck(options: VersionCheckOptions = {}) {
  const { checkInterval = DEFAULT_CHECK_INTERVAL, onUpdateAvailable } = options;

  const currentVersionRef = useRef<string | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getStoredVersion = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  const storeVersion = useCallback((version: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch {
      // localStorage might be disabled
    }
  }, []);

  const clearAllCaches = useCallback(async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch {
      // Silently fail - caches may not be available
    }
  }, []);

  const unregisterServiceWorkers = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    } catch {
      // Silently fail - service workers may not be available
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version available - will be handled by version check
            }
          });
        }
      });
    } catch {
      // Silently fail - service worker registration may fail in some environments
    }
  }, []);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch('/api/version', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) return;

      const versionData: BuildVersion = await response.json();
      const newVersion = versionData.buildId;
      const storedVersion = getStoredVersion();

      // First load - just store the version
      if (!storedVersion) {
        storeVersion(newVersion);
        currentVersionRef.current = newVersion;
        return;
      }

      // Check if version changed
      if (storedVersion !== newVersion) {
        // Clear caches and unregister old service workers
        await clearAllCaches();
        await unregisterServiceWorkers();

        // Store new version
        storeVersion(newVersion);
        currentVersionRef.current = newVersion;

        // Re-register service worker with new version
        await registerServiceWorker();

        // Notify callback
        if (onUpdateAvailable) {
          onUpdateAvailable(versionData);
        }

        // Force reload to get fresh content
        window.location.reload();
      }
    } catch {
      // Silently fail - version check may fail due to network issues
    }
  }, [
    getStoredVersion,
    storeVersion,
    clearAllCaches,
    unregisterServiceWorkers,
    registerServiceWorker,
    onUpdateAvailable,
  ]);

  useEffect(() => {
    // Initial setup
    registerServiceWorker();
    checkVersion();

    // Set up periodic checks
    checkIntervalRef.current = setInterval(checkVersion, checkInterval);

    // Also check on visibility change (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [registerServiceWorker, checkVersion, checkInterval]);

  return {
    checkVersion,
    clearAllCaches,
  };
}
