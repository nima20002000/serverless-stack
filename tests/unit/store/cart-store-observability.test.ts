// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportFallbackWarning } from '@/lib/observability/client';
import { useCartStore } from '@/store/cart-store';

vi.mock('@/lib/observability/client', () => ({
  reportFallbackWarning: vi.fn(),
}));

describe('cart-store fallback observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    useCartStore.setState({ items: [], total: 0, itemCount: 0 });
    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true,
      value: undefined,
    });
  });

  it('reports when BroadcastChannel is unavailable and localStorage is used for cart sync', () => {
    useCartStore.getState().addItem(
      {
        productId: 'p-observe',
        name: 'Observed product',
        price: 10,
        image: 'img',
        stock: 2,
      },
      1
    );

    expect(reportFallbackWarning).toHaveBeenCalledWith({
      name: 'cart-sync-broadcast-unavailable',
      primary: 'BroadcastChannel cart sync',
      fallback: 'localStorage cart sync event',
      reason: 'BroadcastChannel unavailable',
      context: { eventType: 'add' },
    });
    expect(window.localStorage.getItem('cart-sync-event')).toContain(
      'p-observe'
    );
  });
});
