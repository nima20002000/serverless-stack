import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyCartSyncEventToItems,
  createCartSyncId,
  mergeCartItems,
  parseCartSyncEvent,
  useCartStore,
  selectItemCount,
  selectTotal,
  type CartItem,
  type CartSyncEvent,
} from '@/store/cart-store';

describe('cart-store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0, itemCount: 0 });
  });

  it('adds new items and updates quantities for existing items', () => {
    useCartStore.getState().addItem(
      {
        productId: 'p1',
        name: 'Product',
        price: 100,
        image: 'img',
        stock: 5,
      },
      2
    );

    useCartStore.getState().addItem(
      {
        productId: 'p1',
        name: 'Product',
        price: 100,
        image: 'img',
        stock: 5,
      },
      1
    );

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('throws when adding beyond stock', () => {
    expect(() =>
      useCartStore.getState().addItem(
        {
          productId: 'p1',
          name: 'Product',
          price: 100,
          image: 'img',
          stock: 1,
        },
        2
      )
    ).toThrow('Not enough stock available');
  });

  it('removes unavailable items by product ids', () => {
    useCartStore.setState({
      items: [
        {
          productId: 'p1',
          name: 'A',
          price: 10,
          quantity: 1,
          image: 'img',
          stock: 2,
        },
        {
          productId: 'p2',
          name: 'B',
          price: 20,
          quantity: 2,
          image: 'img',
          stock: 2,
        },
      ],
    });

    useCartStore.getState().removeUnavailableItems(['p1']);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe('p2');
  });

  it('updates quantity and removes when quantity is zero', () => {
    useCartStore.setState({
      items: [
        {
          productId: 'p1',
          name: 'A',
          price: 10,
          quantity: 2,
          image: 'img',
          stock: 5,
        },
      ],
    });

    useCartStore.getState().updateQuantity('p1', 0);

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('throws when updating beyond stock', () => {
    useCartStore.setState({
      items: [
        {
          productId: 'p1',
          name: 'A',
          price: 10,
          quantity: 1,
          image: 'img',
          stock: 1,
        },
      ],
    });

    expect(() => useCartStore.getState().updateQuantity('p1', 2)).toThrow(
      'Not enough stock available'
    );
  });

  it('calculates total and item count via selectors', () => {
    useCartStore.setState({
      items: [
        {
          productId: 'p1',
          name: 'A',
          price: 10,
          quantity: 2,
          image: 'img',
          stock: 5,
        },
        {
          productId: 'p2',
          name: 'B',
          price: 20,
          quantity: 1,
          image: 'img',
          stock: 5,
        },
      ],
    });

    const state = useCartStore.getState();
    expect(selectTotal(state)).toBe(40);
    expect(selectItemCount(state)).toBe(3);
  });

  it('merges duplicate same-variant items and caps quantity at stock', () => {
    const items = mergeCartItems([
      {
        productId: 'p1',
        variantId: 'v1',
        name: 'A',
        price: 10,
        quantity: 3,
        image: 'img',
        stock: 5,
      },
      {
        productId: 'p1',
        variantId: 'v1',
        name: 'A',
        price: 10,
        quantity: 4,
        image: 'img',
        stock: 5,
      },
      {
        productId: 'p1',
        variantId: 'v2',
        name: 'A',
        price: 10,
        quantity: 1,
        image: 'img',
        stock: 5,
      },
    ]);

    expect(items).toHaveLength(2);
    expect(items.find((item) => item.variantId === 'v1')?.quantity).toBe(5);
    expect(items.find((item) => item.variantId === 'v2')?.quantity).toBe(1);
  });

  it('applies remote cart add events without duplicating same variants', () => {
    const item: Omit<CartItem, 'quantity'> = {
      productId: 'p1',
      variantId: 'v1',
      name: 'A',
      price: 10,
      image: 'img',
      stock: 5,
    };
    const event: CartSyncEvent = {
      id: 'event-1',
      sourceId: 'other-tab',
      createdAt: 1,
      type: 'add',
      item,
      quantity: 4,
    };

    const items = applyCartSyncEventToItems([{ ...item, quantity: 3 }], event);

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it('applies remote quantity, remove, and clear events', () => {
    const items: CartItem[] = [
      {
        productId: 'p1',
        variantId: 'v1',
        name: 'A',
        price: 10,
        quantity: 2,
        image: 'img',
        stock: 5,
      },
      {
        productId: 'p2',
        name: 'B',
        price: 20,
        quantity: 1,
        image: 'img',
        stock: 3,
      },
    ];

    const updated = applyCartSyncEventToItems(items, {
      id: 'event-2',
      sourceId: 'other-tab',
      createdAt: 1,
      type: 'updateQuantity',
      productId: 'p1',
      variantId: 'v1',
      quantity: 10,
    });
    expect(updated.find((item) => item.productId === 'p1')?.quantity).toBe(5);

    const removed = applyCartSyncEventToItems(updated, {
      id: 'event-3',
      sourceId: 'other-tab',
      createdAt: 2,
      type: 'remove',
      productId: 'p1',
      variantId: 'v1',
    });
    expect(removed.map((item) => item.productId)).toEqual(['p2']);

    const cleared = applyCartSyncEventToItems(removed, {
      id: 'event-4',
      sourceId: 'other-tab',
      createdAt: 3,
      type: 'clear',
    });
    expect(cleared).toEqual([]);
  });

  it('ignores malformed cart sync event payloads', () => {
    expect(parseCartSyncEvent('{not valid json')).toBeNull();
    expect(parseCartSyncEvent(null)).toBeNull();
    expect(parseCartSyncEvent({ type: 'clear' })).toBeNull();
    expect(
      parseCartSyncEvent({
        id: 'event-5',
        sourceId: 'other-tab',
        createdAt: 1,
        type: 'add',
      })
    ).toBeNull();
    expect(
      parseCartSyncEvent({
        id: {},
        sourceId: {},
        createdAt: 1,
        type: 'clear',
      })
    ).toBeNull();
    expect(
      parseCartSyncEvent({
        id: 'event-6',
        sourceId: 'other-tab',
        createdAt: 1,
        type: 'remove',
        productId: 'p1',
        variantId: null,
      })
    ).toBeNull();
    expect(
      parseCartSyncEvent({
        id: 'event-7',
        sourceId: 'other-tab',
        createdAt: 1,
        type: 'updateQuantity',
        productId: 'p1',
        quantity: Infinity,
      })
    ).toBeNull();
    expect(
      parseCartSyncEvent({
        id: 'event-8',
        sourceId: 'other-tab',
        createdAt: 1,
        type: 'add',
        item: {
          productId: 'p1',
          name: 'A',
          price: 10,
          image: 'img',
          stock: Infinity,
        },
        quantity: 1,
      })
    ).toBeNull();
  });

  it('creates cart sync ids when crypto.randomUUID is unavailable', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {},
    });

    try {
      expect(createCartSyncId()).toEqual(expect.any(String));
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });
});
