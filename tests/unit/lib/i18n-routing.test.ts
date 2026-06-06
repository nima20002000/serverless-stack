import { describe, expect, it } from 'vitest';
import {
  negotiateLocale,
  parseAcceptLanguage,
  parsePathLocale,
  prefixPathWithLocale,
  replacePathLocale,
} from '@/lib/i18n/routing';

describe('i18n routing helpers', () => {
  it('parses supported and unsupported URL locale prefixes', () => {
    expect(parsePathLocale('/de/cart')).toEqual({
      locale: 'de',
      unsupportedLocale: null,
      pathnameWithoutLocale: '/cart',
    });

    expect(parsePathLocale('/fr/cart')).toEqual({
      locale: null,
      unsupportedLocale: 'fr',
      pathnameWithoutLocale: '/cart',
    });

    expect(parsePathLocale('/de-DE/cart')).toEqual({
      locale: null,
      unsupportedLocale: 'de-DE',
      pathnameWithoutLocale: '/cart',
    });

    expect(parsePathLocale('/products')).toEqual({
      locale: null,
      unsupportedLocale: null,
      pathnameWithoutLocale: '/products',
    });
  });

  it('parses Accept-Language by quality order', () => {
    expect(parseAcceptLanguage('fr-CA;q=0.9,de-DE;q=0.8,en;q=0.7')).toEqual([
      'fr',
      'de',
      'en',
    ]);
  });

  it('uses URL, cookie, Accept-Language, default precedence', () => {
    expect(
      negotiateLocale({
        urlLocale: 'de',
        cookieLocale: 'en',
        acceptLanguage: 'en;q=1',
      })
    ).toBe('de');

    expect(
      negotiateLocale({
        cookieLocale: 'de',
        acceptLanguage: 'en;q=1',
      })
    ).toBe('de');

    expect(negotiateLocale({ acceptLanguage: 'de-DE,en;q=0.8' })).toBe('de');
    expect(negotiateLocale({ acceptLanguage: 'fr-FR' })).toBe('en');
  });

  it('creates and replaces localized paths while preserving nested routes', () => {
    expect(prefixPathWithLocale('/', 'de')).toBe('/de');
    expect(prefixPathWithLocale('/cart', 'de')).toBe('/de/cart');
    expect(replacePathLocale('/de/cart?ignored=true', 'en')).toBe(
      '/en/cart?ignored=true'
    );
  });
});
