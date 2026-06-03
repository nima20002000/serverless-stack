// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { renderHook, waitForEffects } from '@utils/hook-utils';

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();

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

    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => {});

    const { unmount } = renderHook(() => useVersionCheck());
    await waitForEffects();

    expect(localStorage.getItem('commerce_boilerplate_build_version')).toBe(
      'build-1'
    );
    expect(reloadSpy).not.toHaveBeenCalled();

    unmount();
  });

  it('clears caches and reloads when version changes', async () => {
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
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => {});

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
    expect(reloadSpy).toHaveBeenCalled();

    unmount();
  });
});
