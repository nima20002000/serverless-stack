'use client';

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useWishlistStore } from '@/store/wishlist-store';

/**
 * Hook to sync wishlist state with server
 * - On login: Fetch server wishlist
 * - On initial load: Fetch from server if authenticated
 * - On logout: Keep local wishlist (for guest continuation)
 */
export function useWishlistSync() {
  const { data: session, status } = useSession();
  const setItems = useWishlistStore((state) => state.setItems);
  const setIsSyncing = useWishlistStore((state) => state.setIsSyncing);
  const setInitialized = useWishlistStore((state) => state.setInitialized);
  const isInitialized = useWishlistStore((state) => state.isInitialized);

  const syncFromServer = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/user/wishlist');
      if (response.ok) {
        const data = await response.json();
        // Convert server format to store format
        const serverItems = data.items.map(
          (item: {
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
          }) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.product?.name || 'Unknown',
            price: item.product?.price || 0,
            image: item.product?.images?.[0] || '',
            stock: item.product?.stock || 0,
            discountPercent: item.product?.discountPercent ?? undefined,
            variantName: item.variant?.name,
            addedAt: item.createdAt,
          })
        );
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
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user?.id && !isInitialized) {
      // Fetch from server and sync
      syncFromServer();
    } else if (status === 'unauthenticated') {
      // Keep local items, just mark as initialized
      setInitialized(true);
    }
  }, [status, session, isInitialized, syncFromServer, setInitialized]);
}
