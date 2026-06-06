import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateCategoryAltText,
  generateFallbackAltText,
  generateHeroAltText,
  generateProductAltText,
} from '@/lib/seo/alt-text';
import {
  generateBreadcrumbSchema,
  generateProductBreadcrumbs,
  generateProductSchema,
  generateWebSiteSchema,
  renderJsonLd,
} from '@/lib/seo/structured-data';
import { getProductOgImage } from '@/lib/seo/og-images';

const ORIGINAL_ENV = { ...process.env };

describe('SEO config helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('builds base and absolute URLs from configured site URLs', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example.com';
    const { getBaseUrl, getAbsoluteUrl } = await import('@/lib/seo/config');

    expect(getBaseUrl()).toBe('https://shop.example.com');
    expect(getAbsoluteUrl('/products/p1')).toBe(
      'https://shop.example.com/products/p1'
    );
    expect(getAbsoluteUrl('products/p2')).toBe(
      'https://shop.example.com/products/p2'
    );
    expect(getAbsoluteUrl('https://cdn.example.com/p.jpg')).toBe(
      'https://cdn.example.com/p.jpg'
    );
  });

  it('uses Vercel preview URL and avoids localhost app URL in production', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_URL = 'store-preview.vercel.app';
    const { getBaseUrl } = await import('@/lib/seo/config');

    expect(getBaseUrl()).toBe('https://store-preview.vercel.app');
  });

  it('falls back to local base URL when no deployment URL is configured', async () => {
    const { getBaseUrl } = await import('@/lib/seo/config');

    expect(getBaseUrl()).toBe('http://localhost:3000');
  });
});

describe('SEO alt text helpers', () => {
  it('generates product alt text with variant details and image position', () => {
    expect(
      generateProductAltText({
        productName: 'Travel mug',
        variantName: 'Insulated',
        color: 'Blue',
        size: '16 oz',
        material: 'Steel',
        imageIndex: 1,
        totalImages: 3,
      })
    ).toBe('Travel mug - Insulated Blue 16 oz Steel - Image 2 of 3');
  });

  it('does not duplicate a variant name already present in the product name', () => {
    expect(
      generateProductAltText({
        productName: 'Travel mug Blue',
        variantName: 'Blue',
        totalImages: 1,
        imageIndex: 0,
      })
    ).toBe('Travel mug Blue');
  });

  it('generates category, hero, and fallback alt text', () => {
    expect(generateCategoryAltText({ categoryName: 'Accessories' })).toBe(
      'Category Accessories'
    );
    expect(generateHeroAltText('Storefront hero')).toBe('Storefront hero');
    expect(generateFallbackAltText('Product name')).toBe('Product name');
  });
});

describe('SEO Open Graph image helpers', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED = 'true';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('builds an Open Graph resize URL only for configured media origin', () => {
    expect(
      getProductOgImage('https://cdn.example.com/products/p1.jpg?version=1')
    ).toBe(
      'https://cdn.example.com/cdn-cgi/image/width=1200,height=630,format=auto,quality=85,fit=cover,gravity=center/products/p1.jpg?version=1'
    );
    expect(getProductOgImage('https://other.example.com/p1.jpg')).toBe(
      'https://other.example.com/p1.jpg'
    );
  });

  it('returns the original image when resizing is disabled', () => {
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED = 'false';

    expect(getProductOgImage('https://cdn.example.com/products/p1.jpg')).toBe(
      'https://cdn.example.com/products/p1.jpg'
    );
  });
});

describe('SEO structured data helpers', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example.com';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('generates product JSON-LD with canonical URL, image, price, and stock fields', () => {
    const schema = generateProductSchema(
      {
        id: 'p1',
        slug: 'travel-mug',
        name: 'Travel mug',
        description: 'Insulated mug',
        price: 100,
        stock: 4,
        sku: 'MUG-1',
        media: [{ url: '/media/product.jpg', type: 'IMAGE' }],
      },
      {
        name: 'Blue',
        stock: 0,
        priceAdjust: 25,
        media: [{ url: '/media/variant.jpg', type: 'IMAGE' }],
      }
    );

    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Travel mug - Blue',
      description: 'Insulated mug',
      sku: 'MUG-1',
      image: ['https://shop.example.com/media/variant.jpg'],
      offers: {
        '@type': 'Offer',
        price: '125',
        priceCurrency: 'USD',
        availability: 'https://schema.org/OutOfStock',
        url: 'https://shop.example.com/products/travel-mug',
      },
    });
  });

  it('falls back to default image and category breadcrumbs when product media is absent', () => {
    const product = {
      id: 'p1',
      name: 'Travel mug',
      description: '',
      price: 100,
      stock: 1,
      category: { name: 'Drinkware', slug: 'drinkware' },
    };

    expect(generateProductSchema(product)).toMatchObject({
      description: 'Travel mug - Serverless Stack',
      image: ['https://shop.example.com/images/og-default.png'],
      offers: {
        availability: 'https://schema.org/InStock',
        url: 'https://shop.example.com/products/p1',
      },
    });
    expect(generateProductBreadcrumbs(product)).toEqual([
      { name: 'Home', url: '/' },
      { name: 'Drinkware', url: '/products?category=drinkware' },
      { name: 'Travel mug', url: '/products/p1' },
    ]);
  });

  it('generates breadcrumb and website schemas with absolute URLs', () => {
    expect(
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Products', url: '/products' },
        { name: 'External', url: 'https://docs.example.com' },
      ])
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://shop.example.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Products',
          item: 'https://shop.example.com/products',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'External',
          item: 'https://docs.example.com',
        },
      ],
    });

    expect(generateWebSiteSchema()).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Serverless Stack',
      url: 'https://shop.example.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate:
            'https://shop.example.com/products?search={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    });
  });

  it('serializes JSON-LD without mutating fields', () => {
    expect(renderJsonLd({ '@type': 'Thing', name: 'Example' })).toBe(
      '{"@type":"Thing","name":"Example"}'
    );
  });
});
