import {
  parseTextDirection,
  resolveTextDirection,
  type TextDirection,
} from './direction';

export const supportedLocales = ['en', 'de'] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'en';
export const localeCookieName = 'site-locale';
export const localeHeaderName = 'x-site-locale';
export const localeDirectionHeaderName = 'x-site-locale-dir';
export const configuredDirection = parseTextDirection(
  process.env.NEXT_PUBLIC_SITE_DIRECTION
);

export const localeMetadata: Record<
  Locale,
  { label: string; nativeLabel: string; direction: TextDirection }
> = {
  en: {
    label: 'English',
    nativeLabel: 'English',
    direction: 'ltr',
  },
  de: {
    label: 'German',
    nativeLabel: 'Deutsch',
    direction: 'ltr',
  },
};

export function isSupportedLocale(
  value: string | null | undefined
): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function getLocaleDirection(locale: Locale): TextDirection {
  return resolveTextDirection({
    configuredDirection,
    localeDirection: localeMetadata[locale].direction,
  });
}

export type { TextDirection };
