export const themeStorageKey = 'serverless-stack-theme';

export const themes = ['light', 'dark', 'system'] as const;
export type Theme = (typeof themes)[number];
export type ResolvedTheme = 'light' | 'dark';

export function isTheme(value: string | null | undefined): value is Theme {
  return themes.includes(value as Theme);
}

export function normalizeTheme(value: string | null | undefined): Theme {
  return isTheme(value) ? value : 'system';
}

export function resolveTheme(
  theme: Theme,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light';
  return theme;
}

export function getThemeBootScript() {
  return `
(function () {
  try {
    var key = '${themeStorageKey}';
    var stored = window.localStorage.getItem(key);
    var theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    var root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.theme = theme;
    root.dataset.resolvedTheme = resolved;
    root.style.colorScheme = resolved;
  } catch (_) {}
})();`;
}
