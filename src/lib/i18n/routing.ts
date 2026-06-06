import {
  defaultLocale,
  isSupportedLocale,
  type Locale,
  supportedLocales,
} from './config';

export type LocalePathInfo = {
  locale: Locale | null;
  unsupportedLocale: string | null;
  pathnameWithoutLocale: string;
};

const localeLikePattern = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export function normalizeLocaleTag(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().split('-')[0].toLowerCase();
}

export function parsePathLocale(pathname: string): LocalePathInfo {
  const segments = pathname.split('/');
  const firstSegment = segments[1] ?? '';

  if (isSupportedLocale(firstSegment)) {
    const rest = `/${segments.slice(2).join('/')}`;
    return {
      locale: firstSegment,
      unsupportedLocale: null,
      pathnameWithoutLocale: rest === '/' ? '/' : rest.replace(/\/+$/, ''),
    };
  }

  if (localeLikePattern.test(firstSegment)) {
    const rest = `/${segments.slice(2).join('/')}`;
    return {
      locale: null,
      unsupportedLocale: firstSegment,
      pathnameWithoutLocale: rest === '/' ? '/' : rest.replace(/\/+$/, ''),
    };
  }

  return {
    locale: null,
    unsupportedLocale: null,
    pathnameWithoutLocale: pathname || '/',
  };
}

export function parseAcceptLanguage(
  acceptLanguage: string | null | undefined
): string[] {
  if (!acceptLanguage) return [];

  return acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(';');
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith('q=')
      );
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.split('=')[1] ?? '0')
        : 1;

      return {
        locale: normalizeLocaleTag(tag),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.locale && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.locale);
}

export function negotiateLocale(options: {
  urlLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  fallbackLocale?: Locale;
}): Locale {
  const urlLocale = normalizeLocaleTag(options.urlLocale);
  if (isSupportedLocale(urlLocale)) return urlLocale;

  const cookieLocale = normalizeLocaleTag(options.cookieLocale);
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  for (const locale of parseAcceptLanguage(options.acceptLanguage)) {
    if (isSupportedLocale(locale)) return locale;
  }

  return options.fallbackLocale ?? defaultLocale;
}

export function shouldHandleLocaleRouting(pathname: string): boolean {
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return false;
  }

  const lastSegment = pathname.split('/').pop() ?? '';
  return !lastSegment.includes('.');
}

export function prefixPathWithLocale(pathname: string, locale: Locale): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function replacePathLocale(pathname: string, locale: Locale): string {
  const pathInfo = parsePathLocale(pathname);
  return prefixPathWithLocale(pathInfo.pathnameWithoutLocale, locale);
}

export function getSupportedLocaleList(): readonly Locale[] {
  return supportedLocales;
}
