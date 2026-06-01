import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, selectItemCount, selectTotal } from '@/store/cart-store';

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
});
