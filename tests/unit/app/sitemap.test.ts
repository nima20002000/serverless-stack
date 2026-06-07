import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllProducts } from '@/services/product-service';
import { getAllCategories } from '@/services/category-service';
import { getEnabledLanguages } from '@/services/localization-service';

vi.mock('@/services/product-service', () => ({
  getAllProducts: vi.fn(),
}));

vi.mock('@/services/category-service', () => ({
  getAllCategories: vi.fn(),
}));

vi.mock('@/services/localization-service', () => ({
  getEnabledLanguages: vi.fn(),
}));

vi.mock('@/lib/seo/config', () => ({
  getBaseUrl: () => 'https://shop.example.com',
  getAbsoluteUrl: (path: string) => `https://shop.example.com${path}`,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    warn: vi.fn(),
  },
}));

describe('sitemap route', () => {
  const getAllProductsMock = vi.mocked(getAllProducts);
  const getAllCategoriesMock = vi.mocked(getAllCategories);
  const getEnabledLanguagesMock = vi.mocked(getEnabledLanguages);

  const loadSitemap = async () => {
    const { default: sitemap } = await import('@/app/sitemap');
    return sitemap;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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

  it('includes public static pages, active products, and categories', async () => {
    getAllProductsMock.mockResolvedValue({
      data: [
        {
          id: 'product-1',
          updatedAt: '2024-03-04T12:00:00.000Z',
        },
        {
          id: 'product-2',
          updatedAt: '2024-03-05T12:00:00.000Z',
        },
      ],
    } as any);
    getAllCategoriesMock.mockResolvedValue([
      {
        id: 'category-1',
        updatedAt: '2024-03-06T12:00:00.000Z',
      },
    ] as any);
    const sitemap = await loadSitemap();

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(getAllProductsMock).toHaveBeenCalledWith({
      includeInactive: false,
      perPage: 10000,
    });
    expect(urls).toEqual(
      expect.arrayContaining([
        'https://shop.example.com/en',
        'https://shop.example.com/de',
        'https://shop.example.com/en/products',
        'https://shop.example.com/de/products',
        'https://shop.example.com/en/about',
        'https://shop.example.com/de/about',
        'https://shop.example.com/en/contact',
        'https://shop.example.com/de/contact',
        'https://shop.example.com/en/faq',
        'https://shop.example.com/de/faq',
        'https://shop.example.com/en/cart',
        'https://shop.example.com/de/cart',
        'https://shop.example.com/en/checkout',
        'https://shop.example.com/de/checkout',
        'https://shop.example.com/en/terms',
        'https://shop.example.com/de/terms',
        'https://shop.example.com/en/privacy',
        'https://shop.example.com/de/privacy',
        'https://shop.example.com/en/shipping',
        'https://shop.example.com/de/shipping',
        'https://shop.example.com/en/refund-policy',
        'https://shop.example.com/de/refund-policy',
        'https://shop.example.com/en/products/product-1',
        'https://shop.example.com/de/products/product-1',
        'https://shop.example.com/en/products/product-2',
        'https://shop.example.com/de/products/product-2',
        'https://shop.example.com/en/products?category=category-1',
        'https://shop.example.com/de/products?category=category-1',
      ])
    );
    expect(
      entries.find(
        (entry) => entry.url === 'https://shop.example.com/de/products'
      )?.alternates
    ).toEqual({
      languages: {
        en: 'https://shop.example.com/en/products',
        de: 'https://shop.example.com/de/products',
        'x-default': 'https://shop.example.com/en/products',
      },
    });
    expect(urls.some((url) => url.includes('/admin'))).toBe(false);
    expect(urls.some((url) => url.includes('/api'))).toBe(false);
    expect(urls.some((url) => url.includes('/profile'))).toBe(false);
  });

  it('uses dynamic lastModified and priority metadata for products and categories', async () => {
    getAllProductsMock.mockResolvedValue({
      data: [
        {
          id: 'product-1',
          updatedAt: '2024-03-04T12:00:00.000Z',
        },
      ],
    } as any);
    getAllCategoriesMock.mockResolvedValue([
      {
        id: 'category-1',
        updatedAt: '2024-03-06T12:00:00.000Z',
      },
    ] as any);
    const sitemap = await loadSitemap();

    const entries = await sitemap();

    expect(
      entries.find(
        (entry) => entry.url === 'https://shop.example.com/products/product-1'
      )
    ).toBeUndefined();
    expect(
      entries.find(
        (entry) =>
          entry.url === 'https://shop.example.com/en/products/product-1'
      )
    ).toEqual({
      url: 'https://shop.example.com/en/products/product-1',
      lastModified: new Date('2024-03-04T12:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          en: 'https://shop.example.com/en/products/product-1',
          de: 'https://shop.example.com/de/products/product-1',
          'x-default': 'https://shop.example.com/en/products/product-1',
        },
      },
    });
    expect(
      entries.find(
        (entry) =>
          entry.url ===
          'https://shop.example.com/en/products?category=category-1'
      )
    ).toEqual({
      url: 'https://shop.example.com/en/products?category=category-1',
      lastModified: new Date('2024-03-06T12:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: {
        languages: {
          en: 'https://shop.example.com/en/products?category=category-1',
          de: 'https://shop.example.com/de/products?category=category-1',
          'x-default':
            'https://shop.example.com/en/products?category=category-1',
        },
      },
    });
  });

  it('falls back to static public pages when dynamic data fails', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    getAllProductsMock.mockRejectedValue(new Error('catalog unavailable'));
    const sitemap = await loadSitemap();

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://shop.example.com/en',
        'https://shop.example.com/de',
        'https://shop.example.com/en/products',
        'https://shop.example.com/de/checkout',
      ])
    );
    expect(urls).not.toContain('https://shop.example.com/products/product-1');
    expect(getAllCategoriesMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error generating sitemap:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });
});
