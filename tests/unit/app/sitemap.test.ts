import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllProducts } from '@/services/product-service';
import { getAllCategories } from '@/services/category-service';

vi.mock('@/services/product-service', () => ({
  getAllProducts: vi.fn(),
}));

vi.mock('@/services/category-service', () => ({
  getAllCategories: vi.fn(),
}));

vi.mock('@/lib/seo/config', () => ({
  getBaseUrl: () => 'https://shop.example.com',
}));

describe('sitemap route', () => {
  const getAllProductsMock = vi.mocked(getAllProducts);
  const getAllCategoriesMock = vi.mocked(getAllCategories);

  const loadSitemap = async () => {
    const { default: sitemap } = await import('@/app/sitemap');
    return sitemap;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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
        'https://shop.example.com',
        'https://shop.example.com/products',
        'https://shop.example.com/about',
        'https://shop.example.com/contact',
        'https://shop.example.com/faq',
        'https://shop.example.com/cart',
        'https://shop.example.com/checkout',
        'https://shop.example.com/terms',
        'https://shop.example.com/privacy',
        'https://shop.example.com/shipping',
        'https://shop.example.com/refund-policy',
        'https://shop.example.com/products/product-1',
        'https://shop.example.com/products/product-2',
        'https://shop.example.com/products?category=category-1',
      ])
    );
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
    ).toEqual({
      url: 'https://shop.example.com/products/product-1',
      lastModified: new Date('2024-03-04T12:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
    expect(
      entries.find(
        (entry) =>
          entry.url === 'https://shop.example.com/products?category=category-1'
      )
    ).toEqual({
      url: 'https://shop.example.com/products?category=category-1',
      lastModified: new Date('2024-03-06T12:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.7,
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
        'https://shop.example.com',
        'https://shop.example.com/products',
        'https://shop.example.com/checkout',
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
