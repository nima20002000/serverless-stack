'use client';

import { useVersionCheck } from '@/hooks/useVersionCheck';

/**
 * VersionProvider - Client component that handles version checking and cache busting.
 *
 * This component:
 * - Registers the service worker
 * - Periodically checks for new versions via /api/version
 * - Clears caches and reloads when a new version is detected
 *
 * Place this in your root layout to enable automatic cache busting.
 */
export function VersionProvider({ children }: { children: React.ReactNode }) {
  useVersionCheck({
    checkInterval: 5 * 60 * 1000, // Check every 5 minutes
  });

  return <>{children}</>;
}
