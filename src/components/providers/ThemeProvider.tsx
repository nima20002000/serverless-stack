'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  normalizeTheme,
  resolveTheme,
  themeStorageKey,
  type ResolvedTheme,
  type Theme,
} from '@/lib/theme';

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyResolvedTheme(theme: Theme, systemPrefersDark: boolean) {
  const resolvedTheme = resolveTheme(theme, systemPrefersDark);
  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const storedTheme = normalizeTheme(
      window.localStorage.getItem(themeStorageKey)
    );
    setThemeState(storedTheme);
    setResolvedTheme(applyResolvedTheme(storedTheme, getSystemPrefersDark()));
  }, []);

  useEffect(() => {
    if (!window.matchMedia) {
      setResolvedTheme(applyResolvedTheme(theme, false));
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setResolvedTheme(applyResolvedTheme(theme, mediaQuery.matches));
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(themeStorageKey, nextTheme);
    setThemeState(nextTheme);
    setResolvedTheme(applyResolvedTheme(nextTheme, getSystemPrefersDark()));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return context;
}
