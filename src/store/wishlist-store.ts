import { create } from 'zustand';
import { browserPersist, createBrowserStorage } from '@/lib/browser-storage';

export interface WishlistItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  discountPercent?: number;
  variantName?: string;
  addedAt: string;
}

interface WishlistStore {
  // State
  items: WishlistItem[];
  isInitialized: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Actions
  setItems: (items: WishlistItem[]) => void;
  addItem: (item: Omit<WishlistItem, 'addedAt'>) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearWishlist: () => void;
  isInWishlist: (productId: string, variantId?: string) => boolean;

  // Sync actions (for authenticated users)
  setIsSyncing: (syncing: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  browserPersist<WishlistStore, Pick<WishlistStore, 'items'>>(
    (set, get) => ({
      items: [],
      isInitialized: false,
      isSyncing: false,
      lastSyncedAt: null,

      setItems: (items) =>
        set({ items, lastSyncedAt: new Date().toISOString() }),

      addItem: (item) => {
        const { items } = get();
        // Check if already in wishlist (product + variant combo)
        const exists = items.some(
          (i) =>
            i.productId === item.productId && i.variantId === item.variantId
        );
        if (exists) return; // Already in wishlist

        set({
          items: [...items, { ...item, addedAt: new Date().toISOString() }],
        });
      },

      removeItem: (productId, variantId) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        });
      },

      clearWishlist: () => set({ items: [] }),

      isInWishlist: (productId, variantId) => {
        return get().items.some(
          (i) => i.productId === productId && i.variantId === variantId
        );
      },

      setIsSyncing: (syncing) => set({ isSyncing: syncing }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
    }),
    {
      name: 'wishlist-storage',
      storage: createBrowserStorage(),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

/**
 * Selector for item count
 */
export const selectWishlistCount = (state: WishlistStore) => state.items.length;
