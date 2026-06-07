// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { renderHook, waitForEffects } from '@utils/hook-utils';

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    const localStorageMock = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    vi.stubGlobal('localStorage', localStorageMock);

    Object.defineProperty(window, 'caches', {
      value: {
        keys: vi.fn().mockResolvedValue(['cache-1']),
        delete: vi.fn().mockResolvedValue(true),
      },
      configurable: true,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue({ addEventListener: vi.fn() }),
        getRegistrations: vi
          .fn()
          .mockResolvedValue([{ unregister: vi.fn().mockResolvedValue(true) }]),
        controller: {},
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores version on first load without reloading', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          buildId: 'build-1',
          gitHash: null,
          buildTime: 'now',
          timestamp: 1,
        }),
    });
    vi.stubGlobal('fetch', fetchMock as any);

    const { unmount } = renderHook(() => useVersionCheck());
    await waitForEffects();

    expect(localStorage.getItem('commerce_boilerplate_build_version')).toBe(
      'build-1'
    );
    expect(window.caches.delete).not.toHaveBeenCalled();

    unmount();
  });

  it('clears caches and stores new version when version changes', async () => {
    localStorage.setItem('commerce_boilerplate_build_version', 'build-old');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          buildId: 'build-new',
          gitHash: null,
          buildTime: 'now',
          timestamp: 2,
        }),
    });
    vi.stubGlobal('fetch', fetchMock as any);

    const onUpdateAvailable = vi.fn();

    const { unmount } = renderHook(() =>
      useVersionCheck({ onUpdateAvailable })
    );
    await waitForEffects();

    expect(window.caches.keys).toHaveBeenCalled();
    expect(window.caches.delete).toHaveBeenCalledWith('cache-1');
    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalled();
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    expect(onUpdateAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ buildId: 'build-new' })
    );
    expect(localStorage.getItem('commerce_boilerplate_build_version')).toBe(
      'build-new'
    );

    unmount();
  });
});
