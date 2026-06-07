import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProductById } from '@/services/product-service';
import { getEnabledLanguages } from '@/services/localization-service';
import { log } from '@/lib/logger';

const headersMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

vi.mock('@/services/product-service', () => ({
  getProductById: vi.fn(),
  getActiveProducts: vi.fn(),
  getRelatedProducts: vi.fn(),
}));

vi.mock('@/services/localization-service', () => ({
  getEnabledLanguages: vi.fn(),
}));

vi.mock('@/lib/seo/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/seo/config')>();
  return {
    ...actual,
    getBaseUrl: () => 'https://shop.example.com',
    getAbsoluteUrl: (path: string) => `https://shop.example.com${path}`,
  };
});

vi.mock('@/lib/logger', () => ({
  log: {
    warn: vi.fn(),
  },
}));

describe('localized product metadata', () => {
  const getProductByIdMock = vi.mocked(getProductById);
  const getEnabledLanguagesMock = vi.mocked(getEnabledLanguages);
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headersMock.mockResolvedValue(new Headers({ 'x-site-locale': 'de' }));
    getEnabledLanguagesMock.mockResolvedValue([
      {
        code: 'en',
        label: 'English',
        nativeLabel: 'English',
        direction: 'ltr',
        isEnabled: true,
        isDefault: true,
        sortOrder: 0,
      },
      {
        code: 'de',
        label: 'German',
        nativeLabel: 'Deutsch',
        direction: 'ltr',
        isEnabled: true,
        isDefault: false,
        sortOrder: 10,
      },
    ]);
  });

  it('renders localized metadata, canonical, hreflang, and fallback warnings', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name: 'Deutscher Becher',
      description: 'Deutsche Produktbeschreibung',
      seoTitle: 'Deutscher SEO-Titel',
      seoDescription: null,
      price: 12.5,
      stock: 3,
      discountPercent: null,
      images: [],
      media: [{ id: 'm1', type: 'IMAGE', url: '/p.jpg', order: 0 }],
      category: { id: 'c1', name: 'Tassen', slug: 'tassen' },
      translationFallback: {
        locale: 'de',
        requestedLocale: 'de',
        defaultLocale: 'en',
        fallbackFields: ['seoDescription'],
      },
    } as any);

    const { generateMetadata } = await import('@/app/products/[id]/page');

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'product-1' }),
    });

    expect(metadata.title).toBe('Deutscher SEO-Titel');
    expect(metadata.description).toContain('Preis');
    expect(metadata.description).toContain('Verfügbarkeit');
    expect(metadata.openGraph).toMatchObject({
      locale: 'de_DE',
      title: 'Deutscher SEO-Titel',
    });
    expect(metadata.alternates).toEqual({
      canonical: 'https://shop.example.com/de/products/product-1',
      languages: {
        en: 'https://shop.example.com/en/products/product-1',
        de: 'https://shop.example.com/de/products/product-1',
        'x-default': 'https://shop.example.com/en/products/product-1',
      },
    });
    expect(logMock.warn).toHaveBeenCalledWith(
      'Localized metadata used default-language fallback',
      expect.objectContaining({
        source: 'product:product-1',
        fields: ['seoDescription'],
      })
    );
  });

  it('omits disabled languages from listing metadata alternates', async () => {
    headersMock.mockResolvedValue(new Headers({ 'x-site-locale': 'en' }));
    getEnabledLanguagesMock.mockResolvedValue([
      {
        code: 'en',
        label: 'English',
        nativeLabel: 'English',
        direction: 'ltr',
        isEnabled: true,
        isDefault: true,
        sortOrder: 0,
      },
    ]);

    const { generateMetadata } = await import('@/app/products/page');

    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ search: 'mug' }),
    });

    expect(metadata.alternates).toEqual({
      canonical: 'https://shop.example.com/en/products?search=mug',
      languages: {
        en: 'https://shop.example.com/en/products?search=mug',
        'x-default': 'https://shop.example.com/en/products?search=mug',
      },
    });
  });
});
