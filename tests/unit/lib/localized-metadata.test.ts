import { beforeEach, describe, expect, it, vi } from 'vitest';
import { log } from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  log: {
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/seo/config', () => ({
  getAbsoluteUrl: (path: string) => `https://shop.example.com${path}`,
}));

describe('localized metadata helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds canonical and hreflang URLs with locale prefixes', async () => {
    const { buildLocalizedAlternates } =
      await import('@/lib/seo/localized-metadata');

    expect(
      buildLocalizedAlternates('/products?search=mug', 'de', ['en', 'de'])
    ).toEqual({
      canonical: 'https://shop.example.com/de/products?search=mug',
      languages: {
        en: 'https://shop.example.com/en/products?search=mug',
        de: 'https://shop.example.com/de/products?search=mug',
        'x-default': 'https://shop.example.com/en/products?search=mug',
      },
    });
  });

  it('warns when localized metadata falls back to default-language fields', async () => {
    const { warnLocalizedMetadataFallback } =
      await import('@/lib/seo/localized-metadata');

    warnLocalizedMetadataFallback('product:p1', {
      locale: 'de',
      requestedLocale: 'de',
      defaultLocale: 'en',
      fallbackFields: ['seoTitle', 'seoDescription'],
    });

    expect(log.warn).toHaveBeenCalledWith(
      'Localized metadata used default-language fallback',
      {
        source: 'product:p1',
        requestedLocale: 'de',
        defaultLocale: 'en',
        fields: ['seoTitle', 'seoDescription'],
      }
    );
  });
});
