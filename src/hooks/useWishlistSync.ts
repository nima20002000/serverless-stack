'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWishlistStore } from '@/store/wishlist-store';

interface ServerWishlistItem {
  productId: string;
  variantId?: string;
  createdAt: string;
  product?: {
    name?: string;
    price?: number;
    images?: string[];
    stock?: number;
    discountPercent?: number | null;
  };
  variant?: {
    name?: string;
  } | null;
}

/**
 * Convert server wishlist format to store format
 */
function convertServerItemsToStoreFormat(items: ServerWishlistItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    name: item.product?.name || 'Unknown',
    price: item.product?.price || 0,
    image: item.product?.images?.[0] || '',
    stock: item.product?.stock || 0,
    discountPercent: item.product?.discountPercent ?? undefined,
    variantName: item.variant?.name,
    addedAt: item.createdAt,
  }));
}

/**
 * Hook to sync wishlist state with server
 * - On login: Merge local wishlist with server, then fetch combined result
 * - On initial load: Fetch from server if authenticated
 * - On logout: Keep local wishlist (for guest continuation)
 */
export function useWishlistSync() {
  const isE2E =
    process.env.NEXT_PUBLIC_E2E_TEST === 'true' ||
    (typeof document !== 'undefined' &&
      document.cookie.includes('e2e-test=true'));

  const { data: session, status } = useSession();
  const items = useWishlistStore((state) => state.items);
  const setItems = useWishlistStore((state) => state.setItems);
  const setIsSyncing = useWishlistStore((state) => state.setIsSyncing);
  const setInitialized = useWishlistStore((state) => state.setInitialized);
  const isInitialized = useWishlistStore((state) => state.isInitialized);

  // Track if we've already synced for this session to prevent multiple merges
  const hasSyncedRef = useRef(false);
  const previousStatusRef = useRef(status);

  const mergeAndSync = useCallback(
    async (localItems: typeof items) => {
      setIsSyncing(true);
      try {
        // If there are local items, merge them first
        if (localItems.length > 0) {
          const mergePayload = localItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
          }));

          const mergeResponse = await fetch('/api/user/wishlist/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: mergePayload }),
          });

          if (mergeResponse.ok) {
            const mergeData = await mergeResponse.json();
            // Use the merged wishlist from the response
            const serverItems = convertServerItemsToStoreFormat(
              mergeData.wishlist.items
            );
            setItems(serverItems);
            return;
          }
        }

        // Fallback: just fetch from server (no local items or merge failed)
        const response = await fetch('/api/user/wishlist');
        if (response.ok) {
          const data = await response.json();
          const serverItems = convertServerItemsToStoreFormat(data.items);
          setItems(serverItems);
        }
      } catch (error) {
        console.error('Error syncing wishlist:', error);
      } finally {
        setIsSyncing(false);
        setInitialized(true);
      }
    },
    [setItems, setIsSyncing, setInitialized]
  );

  const syncFromServer = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/user/wishlist');
      if (response.ok) {
        const data = await response.json();
        const serverItems = convertServerItemsToStoreFormat(data.items);
        setItems(serverItems);
      }
    } catch (error) {
      console.error('Error syncing wishlist:', error);
    } finally {
      setIsSyncing(false);
      setInitialized(true);
    }
  }, [setItems, setIsSyncing, setInitialized]);

  useEffect(() => {
    // Skip wishlist sync in E2E to avoid network flakiness
    if (isE2E) {
      setInitialized(true);
      return;
    }

    if (status === 'loading') return;

    const wasUnauthenticated = previousStatusRef.current === 'unauthenticated';
    const justLoggedIn =
      status === 'authenticated' && wasUnauthenticated && session?.user?.id;

    previousStatusRef.current = status;

    if (justLoggedIn && !hasSyncedRef.current) {
      // User just logged in - merge local wishlist with server
      hasSyncedRef.current = true;
      mergeAndSync(items);
    } else if (
      status === 'authenticated' &&
      session?.user?.id &&
      !isInitialized &&
      !hasSyncedRef.current
    ) {
      // Already authenticated on page load - just fetch from server
      hasSyncedRef.current = true;
      syncFromServer();
    } else if (status === 'unauthenticated') {
      // Not logged in - reset sync state for next login and mark as initialized
      hasSyncedRef.current = false;
      setInitialized(true);
    }
  }, [
    isE2E,
    status,
    session,
    isInitialized,
    items,
    mergeAndSync,
    syncFromServer,
    setInitialized,
  ]);
}
