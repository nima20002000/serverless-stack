import { create } from 'zustand';
import { browserPersist, createBrowserStorage } from '@/lib/browser-storage';
import { formatPrice as formatStorefrontPrice } from '@/lib/utils/format';

export const CART_STORAGE_KEY = 'cart-storage';
export const CART_SYNC_EVENT_KEY = 'cart-sync-event';
const CART_SYNC_CHANNEL_NAME = 'cart-sync';

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
  removeUnavailableItems: (productIds: string[]) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string
  ) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

type CartItemIdentity = Pick<CartItem, 'productId' | 'variantId'>;

type CartSyncEventBase = {
  id: string;
  sourceId: string;
  createdAt: number;
};

export type CartSyncEvent =
  | (CartSyncEventBase & {
      type: 'add';
      item: Omit<CartItem, 'quantity'>;
      quantity: number;
    })
  | (CartSyncEventBase & {
      type: 'updateQuantity';
      productId: string;
      variantId?: string;
      quantity: number;
    })
  | (CartSyncEventBase & {
      type: 'remove';
      productId: string;
      variantId?: string;
    })
  | (CartSyncEventBase & {
      type: 'removeUnavailable';
      productIds: string[];
    })
  | (CartSyncEventBase & {
      type: 'clear';
    });

function getCartItemKey(item: CartItemIdentity): string {
  return `${item.productId}::${item.variantId ?? ''}`;
}

function isSameCartItem(a: CartItemIdentity, b: CartItemIdentity): boolean {
  return a.productId === b.productId && a.variantId === b.variantId;
}

function normalizeQuantity(quantity: number, stock: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (!Number.isFinite(stock) || stock <= 0) return 0;
  return Math.min(Math.floor(quantity), Math.floor(stock));
}

function sanitizeCartItem(item: CartItem): CartItem | null {
  if (!item.productId || !item.name) return null;

  const stock = Math.max(0, Math.floor(item.stock || 0));
  const quantity = normalizeQuantity(item.quantity, stock);
  if (quantity <= 0) return null;

  return {
    ...item,
    price: Number.isFinite(item.price) ? item.price : 0,
    stock,
    quantity,
  };
}

export function mergeCartItems(items: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();

  for (const item of items) {
    const sanitizedItem = sanitizeCartItem(item);
    if (!sanitizedItem) continue;

    const key = getCartItemKey(sanitizedItem);
    const existingItem = merged.get(key);
    if (!existingItem) {
      merged.set(key, sanitizedItem);
      continue;
    }

    const stock = Math.max(existingItem.stock, sanitizedItem.stock);
    merged.set(key, {
      ...existingItem,
      ...sanitizedItem,
      stock,
      quantity: normalizeQuantity(
        existingItem.quantity + sanitizedItem.quantity,
        stock
      ),
    });
  }

  return Array.from(merged.values());
}

function addCartItem(
  items: CartItem[],
  product: Omit<CartItem, 'quantity'>,
  quantity: number,
  options: { throwOnStockLimit: boolean }
): CartItem[] {
  const stock = Math.max(0, Math.floor(product.stock || 0));
  const requestedQuantity = Math.floor(quantity);
  if (!Number.isFinite(quantity) || requestedQuantity <= 0) {
    return items;
  }

  const existingItem = items.find((item) => isSameCartItem(item, product));
  const existingQuantity = existingItem?.quantity ?? 0;
  const newQuantity = existingQuantity + requestedQuantity;

  if (newQuantity > stock && options.throwOnStockLimit) {
    throw new Error('Not enough stock available');
  }

  const cappedQuantity = normalizeQuantity(newQuantity, stock);
  if (existingItem) {
    return items.map((item) =>
      isSameCartItem(item, product)
        ? { ...item, ...product, stock, quantity: cappedQuantity }
        : item
    );
  }

  if (requestedQuantity > stock && options.throwOnStockLimit) {
    throw new Error('Not enough stock available');
  }

  if (cappedQuantity <= 0) {
    return items;
  }

  return [...items, { ...product, stock, quantity: cappedQuantity }];
}

function updateCartItemQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
  variantId: string | undefined,
  options: { throwWhenMissing: boolean; throwOnStockLimit: boolean }
): CartItem[] {
  const item = items.find(
    (cartItem) =>
      cartItem.productId === productId && cartItem.variantId === variantId
  );

  if (!item) {
    if (options.throwWhenMissing) {
      throw new Error('Cart item was not found');
    }
    return items;
  }

  if (quantity <= 0) {
    return items.filter(
      (cartItem) =>
        !(cartItem.productId === productId && cartItem.variantId === variantId)
    );
  }

  if (quantity > item.stock && options.throwOnStockLimit) {
    throw new Error('Not enough stock available');
  }

  const cappedQuantity = normalizeQuantity(quantity, item.stock);
  return items.map((cartItem) =>
    cartItem.productId === productId && cartItem.variantId === variantId
      ? { ...cartItem, quantity: cappedQuantity }
      : cartItem
  );
}

function removeCartItem(
  items: CartItem[],
  productId: string,
  variantId?: string
): CartItem[] {
  return items.filter(
    (item) => !(item.productId === productId && item.variantId === variantId)
  );
}

function removeUnavailableCartItems(
  items: CartItem[],
  productIds: string[]
): CartItem[] {
  if (!productIds || productIds.length === 0) return items;

  const productIdSet = new Set(productIds);
  return items.filter((item) => !productIdSet.has(item.productId));
}

export function createCartSyncId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function createCartSyncEvent(
  type: CartSyncEvent['type'],
  payload: Omit<CartSyncEvent, keyof CartSyncEventBase | 'type'>
): CartSyncEvent {
  return {
    id: createCartSyncId(),
    sourceId: getCartSyncSourceId(),
    createdAt: Date.now(),
    type,
    ...payload,
  } as CartSyncEvent;
}

let cartSyncSourceId: string | null = null;
let cartSyncChannel: BroadcastChannel | null | undefined;
let cartSyncInitialized = false;
const seenCartSyncEventIds = new Set<string>();

function getCartSyncSourceId(): string {
  if (!cartSyncSourceId) {
    cartSyncSourceId = createCartSyncId();
  }
  return cartSyncSourceId;
}

function getCartSyncChannel(): BroadcastChannel | null {
  if (
    typeof window === 'undefined' ||
    typeof BroadcastChannel === 'undefined'
  ) {
    return null;
  }

  if (cartSyncChannel === undefined) {
    cartSyncChannel = new BroadcastChannel(CART_SYNC_CHANNEL_NAME);
  }

  return cartSyncChannel;
}

function rememberCartSyncEvent(id: string): boolean {
  if (seenCartSyncEventIds.has(id)) {
    return false;
  }

  seenCartSyncEventIds.add(id);
  if (seenCartSyncEventIds.size > 100) {
    const firstId = seenCartSyncEventIds.values().next().value;
    if (firstId) seenCartSyncEventIds.delete(firstId);
  }
  return true;
}

export function parseCartSyncEvent(value: unknown): CartSyncEvent | null {
  try {
    const event =
      typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
    if (!event || typeof event !== 'object') return null;

    const candidate = event as Record<string, unknown>;
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.sourceId !== 'string' ||
      !Number.isFinite(candidate.createdAt) ||
      typeof candidate.type !== 'string'
    ) {
      return null;
    }

    const hasValidOptionalVariantId =
      candidate.variantId === undefined ||
      typeof candidate.variantId === 'string';

    switch (candidate.type) {
      case 'add': {
        const item = candidate.item as Partial<CartItem> | undefined;
        return item &&
          typeof item.productId === 'string' &&
          typeof item.name === 'string' &&
          Number.isFinite(item.price) &&
          typeof item.image === 'string' &&
          Number.isFinite(item.stock) &&
          (item.variantId === undefined ||
            typeof item.variantId === 'string') &&
          (item.variantName === undefined ||
            typeof item.variantName === 'string') &&
          Number.isFinite(candidate.quantity)
          ? (candidate as CartSyncEvent)
          : null;
      }
      case 'updateQuantity':
        return typeof candidate.productId === 'string' &&
          hasValidOptionalVariantId &&
          Number.isFinite(candidate.quantity)
          ? (candidate as CartSyncEvent)
          : null;
      case 'remove':
        return typeof candidate.productId === 'string' &&
          hasValidOptionalVariantId
          ? (candidate as CartSyncEvent)
          : null;
      case 'removeUnavailable':
        return Array.isArray(candidate.productIds) &&
          candidate.productIds.every(
            (productId) => typeof productId === 'string'
          )
          ? (candidate as CartSyncEvent)
          : null;
      case 'clear':
        return candidate as CartSyncEvent;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function applyCartSyncEventToItems(
  items: CartItem[],
  event: CartSyncEvent
): CartItem[] {
  switch (event.type) {
    case 'add':
      return addCartItem(items, event.item, event.quantity, {
        throwOnStockLimit: false,
      });
    case 'updateQuantity':
      return updateCartItemQuantity(
        items,
        event.productId,
        event.quantity,
        event.variantId,
        {
          throwWhenMissing: false,
          throwOnStockLimit: false,
        }
      );
    case 'remove':
      return removeCartItem(items, event.productId, event.variantId);
    case 'removeUnavailable':
      return removeUnavailableCartItems(items, event.productIds);
    case 'clear':
      return [];
    default:
      return items;
  }
}

function publishCartSyncEvent(
  type: CartSyncEvent['type'],
  payload: Omit<CartSyncEvent, keyof CartSyncEventBase | 'type'>
): void {
  if (typeof window === 'undefined') return;

  const event = createCartSyncEvent(type, payload);
  rememberCartSyncEvent(event.id);

  try {
    getCartSyncChannel()?.postMessage(event);
  } catch {
    // BroadcastChannel unavailable or closed; localStorage remains the fallback.
  }

  try {
    window.localStorage.setItem(CART_SYNC_EVENT_KEY, JSON.stringify(event));
  } catch {
    // Storage unavailable; the current tab still has the updated in-memory cart.
  }
}

function applyRemoteCartSyncEvent(event: CartSyncEvent | null): void {
  if (!event || event.sourceId === getCartSyncSourceId()) return;
  if (!rememberCartSyncEvent(event.id)) return;

  useCartStore.setState((state) => ({
    items: applyCartSyncEventToItems(state.items, event),
  }));
}

export const useCartStore = create<CartStore>()(
  browserPersist<CartStore, Pick<CartStore, 'items'>>(
    (set, get) => ({
      items: [],

      addItem: (product, quantity) => {
        const { items } = get();
        const newItems = addCartItem(items, product, quantity, {
          throwOnStockLimit: true,
        });
        set({ items: newItems });
        publishCartSyncEvent('add', { item: product, quantity });
      },

      removeItem: (productId, variantId) => {
        set({ items: removeCartItem(get().items, productId, variantId) });
        publishCartSyncEvent('remove', { productId, variantId });
      },

      removeUnavailableItems: (productIds) => {
        if (!productIds || productIds.length === 0) return;

        set({ items: removeUnavailableCartItems(get().items, productIds) });
        publishCartSyncEvent('removeUnavailable', { productIds });
      },

      updateQuantity: (productId, quantity, variantId) => {
        const { items } = get();
        const newItems = updateCartItemQuantity(
          items,
          productId,
          quantity,
          variantId,
          {
            throwWhenMissing: true,
            throwOnStockLimit: true,
          }
        );
        set({ items: newItems });
        publishCartSyncEvent('updateQuantity', {
          productId,
          variantId,
          quantity,
        });
      },

      clearCart: () => {
        set({ items: [] });
        publishCartSyncEvent('clear', {});
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

export function initializeCartSync(): void {
  if (typeof window === 'undefined' || cartSyncInitialized) return;
  cartSyncInitialized = true;

  getCartSyncChannel()?.addEventListener('message', (event) => {
    applyRemoteCartSyncEvent(parseCartSyncEvent(event.data));
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== CART_SYNC_EVENT_KEY || !event.newValue) return;
    applyRemoteCartSyncEvent(parseCartSyncEvent(event.newValue));
  });
}

initializeCartSync();

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

export function formatPrice(price: number): string {
  return formatStorefrontPrice(price);
}
