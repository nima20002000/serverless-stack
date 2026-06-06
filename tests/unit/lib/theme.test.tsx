// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getThemeBootScript,
  normalizeTheme,
  resolveTheme,
  themeStorageKey,
} from '@/lib/theme';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import ThemeToggle from '@/components/theme/ThemeToggle';

type MatchMediaListener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(prefersDark: boolean) {
  const listeners = new Set<MatchMediaListener>();
  const mediaQuery = {
    matches: prefersDark,
    media: '',
    onchange: null,
    addEventListener: (_event: 'change', listener: MatchMediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_event: 'change', listener: MatchMediaListener) => {
      listeners.delete(listener);
    },
    addListener: (listener: MatchMediaListener) => {
      listeners.add(listener);
    },
    removeListener: (listener: MatchMediaListener) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      mediaQuery.media = query;
      return mediaQuery;
    }),
  });

  return {
    setPrefersDark(nextPrefersDark: boolean) {
      mediaQuery.matches = nextPrefersDark;
      listeners.forEach((listener) =>
        listener({ matches: nextPrefersDark } as MediaQueryListEvent)
      );
    },
  };
}

function mockLocalStorage() {
  const store = new Map<string, string>();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
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
      key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
      get length() {
        return store.size;
      },
    },
  });
}

function renderThemeToggle(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
  });

  return { container, root };
}

describe('theme contract', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-resolved-theme');
    document.documentElement.style.colorScheme = '';
    mockLocalStorage();
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('normalizes and resolves only supported theme values', () => {
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('system')).toBe('system');
    expect(normalizeTheme('sepia')).toBe('system');
    expect(normalizeTheme(null)).toBe('system');

    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('boot script applies stored dark preference before React hydrates', () => {
    mockMatchMedia(false);
    window.localStorage.setItem(themeStorageKey, 'dark');

    window.eval(getThemeBootScript());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.resolvedTheme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('boot script resolves system theme from media preference', () => {
    mockMatchMedia(true);
    window.localStorage.setItem(themeStorageKey, 'system');

    window.eval(getThemeBootScript());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('system');
    expect(document.documentElement.dataset.resolvedTheme).toBe('dark');
  });

  it('theme toggle persists explicit choices and updates root attributes', () => {
    mockMatchMedia(false);
    window.localStorage.setItem(themeStorageKey, 'light');
    const { container, root } = renderThemeToggle();

    const darkButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="theme-toggle-dark"]'
    );
    expect(darkButton).not.toBeNull();

    act(() => {
      darkButton?.click();
    });

    expect(window.localStorage.getItem(themeStorageKey)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.resolvedTheme).toBe('dark');
    expect(darkButton?.getAttribute('aria-pressed')).toBe('true');

    act(() => {
      root.unmount();
    });
  });

  it('system theme follows media changes without changing stored preference', () => {
    const media = mockMatchMedia(false);
    window.localStorage.setItem(themeStorageKey, 'system');
    const { root } = renderThemeToggle();

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.dataset.theme).toBe('system');
    expect(document.documentElement.dataset.resolvedTheme).toBe('light');

    act(() => {
      media.setPrefersDark(true);
    });

    expect(window.localStorage.getItem(themeStorageKey)).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.resolvedTheme).toBe('dark');

    act(() => {
      root.unmount();
    });
  });
});
