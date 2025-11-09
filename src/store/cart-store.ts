import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
        const existingItem = items.find((item) => item.productId === product.productId);

        if (existingItem) {
          // Update quantity if item already exists
          const newQuantity = existingItem.quantity + quantity;

          // Validate against stock
          if (newQuantity > product.stock) {
            throw new Error('موجودی کافی نیست');
          }

          set({
            items: items.map((item) =>
              item.productId === product.productId
                ? { ...item, quantity: newQuantity }
                : item
            ),
          });
        } else {
          // Add new item
          if (quantity > product.stock) {
            throw new Error('موجودی کافی نیست');
          }

          set({
            items: [...items, { ...product, quantity }],
          });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.productId !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        const { items } = get();
        const item = items.find((i) => i.productId === productId);

        if (!item) {
          throw new Error('محصول در سبد خرید یافت نشد');
        }

        // Validate quantity
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          get().removeItem(productId);
          return;
        }

        if (quantity > item.stock) {
          throw new Error('موجودی کافی نیست');
        }

        set({
          items: items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      // Computed values using getters
      get total() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      get itemCount() {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      // Only persist items, computed values will be recalculated
      partialize: (state) => ({ items: state.items }),
    }
  )
);

/**
 * Format price to Persian/Toman format
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}
