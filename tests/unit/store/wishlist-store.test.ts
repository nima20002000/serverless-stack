import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWishlistStore, selectWishlistCount } from '@/store/wishlist-store';

describe('wishlist-store', () => {
  beforeEach(() => {
    useWishlistStore.setState({
      items: [],
      isInitialized: false,
      isSyncing: false,
      lastSyncedAt: null,
    });
  });

  it('adds item and prevents duplicates', () => {
    const item = {
      productId: 'p1',
      variantId: 'v1',
      name: 'Product',
      price: 10,
      image: 'img',
      stock: 2,
      addedAt: 'now',
    };

    useWishlistStore.getState().addItem(item);
    useWishlistStore.getState().addItem(item);

    expect(useWishlistStore.getState().items).toHaveLength(1);
  });

  it('removes item by product and variant', () => {
    useWishlistStore.setState({
      items: [
        {
          productId: 'p1',
          variantId: 'v1',
          name: 'Product',
          price: 10,
          image: 'img',
          stock: 2,
          addedAt: 'now',
        },
      ],
    });

    useWishlistStore.getState().removeItem('p1', 'v1');
    expect(useWishlistStore.getState().items).toHaveLength(0);
  });

  it('sets items and updates lastSyncedAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    useWishlistStore.getState().setItems([
      {
        productId: 'p1',
        variantId: 'v1',
        name: 'Product',
        price: 10,
        image: 'img',
        stock: 2,
        addedAt: 'now',
      },
    ]);

    expect(useWishlistStore.getState().lastSyncedAt).toBe(
      '2024-01-01T00:00:00.000Z'
    );

    vi.useRealTimers();
  });

  it('checks item existence and count', () => {
    useWishlistStore.setState({
      items: [
        {
          productId: 'p1',
          variantId: 'v1',
          name: 'Product',
          price: 10,
          image: 'img',
          stock: 2,
          addedAt: 'now',
        },
      ],
    });

    expect(useWishlistStore.getState().isInWishlist('p1', 'v1')).toBe(true);
    expect(selectWishlistCount(useWishlistStore.getState())).toBe(1);
  });
});
