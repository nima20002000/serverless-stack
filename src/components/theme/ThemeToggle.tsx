'use client';

import {
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '@/components/providers/ThemeProvider';
import { type Theme, themes } from '@/lib/theme';

const themeLabels: Record<Theme, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'System theme',
};

const themeIcons = {
  light: SunIcon,
  dark: MoonIcon,
  system: ComputerDesktopIcon,
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900"
      role="group"
      aria-label="Theme"
      data-testid="theme-toggle"
    >
      {themes.map((item) => {
        const Icon = themeIcons[item];
        const isActive = theme === item;

        return (
          <button
            key={item}
            type="button"
            onClick={() => setTheme(item)}
            className={`rounded-md p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isActive
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            aria-label={themeLabels[item]}
            aria-pressed={isActive}
            data-testid={`theme-toggle-${item}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
