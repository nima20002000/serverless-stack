'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to safely handle hydration for components that depend on client-side state
 * (e.g., localStorage, Zustand persisted stores).
 *
 * Returns false during SSR and initial client render,
 * then true after hydration is complete.
 *
 * Usage:
 * ```tsx
 * const isHydrated = useHydration();
 * const count = useStore((state) => state.count);
 *
 * // Only show count after hydration to avoid mismatch
 * return <span>{isHydrated ? count : 0}</span>
 * ```
 */
export function useHydration(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
