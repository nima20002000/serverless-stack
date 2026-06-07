import type { Metadata } from 'next';
import { siteLocale } from '@/config/site';
import {
  defaultLocale,
  isSupportedLocale,
  type Locale,
  supportedLocales,
} from '@/lib/i18n/config';
import { parsePathLocale, prefixPathWithLocale } from '@/lib/i18n/routing';
import type {
  ManagedLanguage,
  TranslationFallback,
} from '@/lib/i18n/localized-content';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { log } from '@/lib/logger';

const localeToOgLocale: Record<Locale, string> = {
  en: siteLocale.ogLocale,
  de: 'de_DE',
};

const localeToIntlLocale: Record<Locale, string> = {
  en: siteLocale.locale || 'en-US',
  de: 'de-DE',
};

function splitPathAndSearch(pathWithSearch: string): {
  pathname: string;
  search: string;
} {
  const [pathname = '/', search = ''] = pathWithSearch.split('?');
  return {
    pathname: pathname.startsWith('/') ? pathname : `/${pathname}`,
    search: search ? `?${search}` : '',
  };
}

export function getOpenGraphLocale(locale: Locale): string {
  return localeToOgLocale[locale] || siteLocale.ogLocale;
}

export function getIntlLocale(locale: Locale): string {
  return localeToIntlLocale[locale] || siteLocale.locale || 'en-US';
}

export function getManagedLocaleCodes(
  languages?: Array<ManagedLanguage | Locale>
): Locale[] {
  if (!languages || languages.length === 0) return [...supportedLocales];

  const codes = languages
    .map((language) =>
      typeof language === 'string' ? language : language.code
    )
    .filter(isSupportedLocale);

  return codes.length > 0 ? Array.from(new Set(codes)) : [...supportedLocales];
}

export function getLocalizedPath(
  pathWithSearch: string,
  locale: Locale
): string {
  const { pathname, search } = splitPathAndSearch(pathWithSearch);
  const pathInfo = parsePathLocale(pathname);
  return `${prefixPathWithLocale(pathInfo.pathnameWithoutLocale, locale)}${search}`;
}

export function getLocalizedUrl(
  pathWithSearch: string,
  locale: Locale
): string {
  return getAbsoluteUrl(getLocalizedPath(pathWithSearch, locale));
}

export function buildLanguageAlternates(
  pathWithSearch: string,
  languages?: Array<ManagedLanguage | Locale>
): Record<string, string> {
  const localeCodes = getManagedLocaleCodes(languages);
  const alternates = localeCodes.reduce<Record<string, string>>(
    (result, locale) => {
      result[locale] = getLocalizedUrl(pathWithSearch, locale);
      return result;
    },
    {}
  );

  alternates['x-default'] = getLocalizedUrl(pathWithSearch, defaultLocale);
  return alternates;
}

export function buildLocalizedAlternates(
  pathWithSearch: string,
  locale: Locale,
  languages?: Array<ManagedLanguage | Locale>
): NonNullable<Metadata['alternates']> {
  return {
    canonical: getLocalizedUrl(pathWithSearch, locale),
    languages: buildLanguageAlternates(pathWithSearch, languages),
  };
}

export function warnLocalizedMetadataFallback(
  source: string,
  fallback?: TranslationFallback | null
): void {
  if (
    !fallback ||
    fallback.requestedLocale === fallback.defaultLocale ||
    fallback.fallbackFields.length === 0
  ) {
    return;
  }

  log.warn('Localized metadata used default-language fallback', {
    source,
    requestedLocale: fallback.requestedLocale,
    defaultLocale: fallback.defaultLocale,
    fields: fallback.fallbackFields,
  });
}
