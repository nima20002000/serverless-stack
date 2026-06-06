export const supportedLocales = ['en', 'de'] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'en';
export const localeCookieName = 'site-locale';
export const localeHeaderName = 'x-site-locale';
export const localeDirectionHeaderName = 'x-site-locale-dir';

export const localeMetadata: Record<
  Locale,
  { label: string; nativeLabel: string; direction: 'ltr' | 'rtl' }
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

export function getLocaleDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeMetadata[locale].direction;
}
