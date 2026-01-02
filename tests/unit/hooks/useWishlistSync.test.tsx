// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWishlistSync } from '@/hooks/useWishlistSync';
import { useWishlistStore } from '@/store/wishlist-store';
import { renderHook, waitForEffects } from '@utils/hook-utils';

const sessionState = {
  status: 'unauthenticated' as 'authenticated' | 'unauthenticated' | 'loading',
  data: null as any,
};

vi.mock('next-auth/react', () => ({
  useSession: () => sessionState,
}));

describe('useWishlistSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState.status = 'unauthenticated';
    sessionState.data = null;
    useWishlistStore.setState({
      items: [],
      isInitialized: false,
      isSyncing: false,
      lastSyncedAt: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('marks store initialized when unauthenticated', async () => {
    const { unmount } = renderHook(() => useWishlistSync());

    await waitForEffects();

    expect(useWishlistStore.getState().isInitialized).toBe(true);
    expect(useWishlistStore.getState().isSyncing).toBe(false);

    unmount();
  });

  it('fetches wishlist for authenticated user on initial load', async () => {
    sessionState.status = 'authenticated';
    sessionState.data = { user: { id: 'user-1' } };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              productId: 'p1',
              variantId: null,
              createdAt: '2024-01-01T00:00:00Z',
              product: {
                name: 'Product',
                price: 100,
                images: ['img'],
                stock: 2,
              },
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', fetchMock as any);

    const { unmount } = renderHook(() => useWishlistSync());

    await waitForEffects();

    expect(fetchMock).toHaveBeenCalledWith('/api/user/wishlist');
    const items = useWishlistStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe('p1');
    expect(items[0].name).toBe('Product');
    expect(useWishlistStore.getState().isInitialized).toBe(true);

    unmount();
  });

  it('merges local items after login transition', async () => {
    sessionState.status = 'unauthenticated';
    sessionState.data = null;
    useWishlistStore.setState({
      items: [
        {
          productId: 'p1',
          variantId: 'v1',
          name: 'Local',
          price: 50,
          image: 'img',
          stock: 1,
          addedAt: '2024-01-01T00:00:00Z',
        },
      ],
      isInitialized: false,
      isSyncing: false,
      lastSyncedAt: null,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            wishlist: {
              items: [
                {
                  productId: 'p1',
                  variantId: 'v1',
                  createdAt: '2024-01-02T00:00:00Z',
                  product: {
                    name: 'Merged',
                    price: 75,
                    images: ['img2'],
                    stock: 3,
                  },
                },
              ],
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

    vi.stubGlobal('fetch', fetchMock as any);

    const hook = renderHook(() => useWishlistSync());
    await waitForEffects();

    sessionState.status = 'authenticated';
    sessionState.data = { user: { id: 'user-1' } };
    hook.rerender();
    await waitForEffects();

    expect(fetchMock).toHaveBeenCalledWith('/api/user/wishlist/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 'p1', variantId: 'v1' }],
      }),
    });

    const items = useWishlistStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Merged');
    expect(items[0].variantId).toBe('v1');

    hook.unmount();
  });
});
