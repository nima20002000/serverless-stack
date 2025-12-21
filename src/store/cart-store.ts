import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createBrowserStorage } from '@/lib/browser-storage';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
  variantId?: string;
  variantName?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity) => {
        const { items } = get();
        // Match by productId AND variantId (if variant exists)
        const existingItem = items.find(
          (item) =>
            item.productId === product.productId &&
            item.variantId === product.variantId
        );

        if (existingItem) {
          // Update quantity if item already exists
          const newQuantity = existingItem.quantity + quantity;

          // Validate against stock
          if (newQuantity > product.stock) {
            throw new Error('موجودی کافی نیست');
          }

          const newItems = items.map((item) =>
            item.productId === product.productId &&
            item.variantId === product.variantId
              ? { ...item, quantity: newQuantity }
              : item
          );

          set({
            items: newItems,
          });
        } else {
          // Add new item
          if (quantity > product.stock) {
            throw new Error('موجودی کافی نیست');
          }

          const newItems = [...items, { ...product, quantity }];

          set({
            items: newItems,
          });
        }
      },

      removeItem: (productId, variantId) => {
        const newItems = get().items.filter(
          (item) =>
            !(item.productId === productId && item.variantId === variantId)
        );
        set({
          items: newItems,
        });
      },

      updateQuantity: (productId, quantity, variantId) => {
        const { items } = get();
        const item = items.find(
          (i) => i.productId === productId && i.variantId === variantId
        );

        if (!item) {
          throw new Error('محصول در سبد خرید یافت نشد');
        }

        // Validate quantity
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          get().removeItem(productId, variantId);
          return;
        }

        if (quantity > item.stock) {
          throw new Error('موجودی کافی نیست');
        }

        const newItems = items.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity }
            : i
        );

        set({
          items: newItems,
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      // These are placeholder values - use selectors below for actual computed values
      total: 0,
      itemCount: 0,
    }),
    {
      name: 'cart-storage',
      // Use browser-safe storage to prevent SSR errors
      storage: createBrowserStorage(),
      // Only persist items, computed values will be recalculated
      partialize: (state) => ({ items: state.items }),
    }
  )
);

/**
 * Selector for computing total from items
 */
export const selectTotal = (state: CartStore) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

/**
 * Selector for computing item count from items
 */
export const selectItemCount = (state: CartStore) =>
  state.items.reduce((count, item) => count + item.quantity, 0);

/**
 * Format price to Persian/Toman format
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}
