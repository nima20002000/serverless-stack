import { siteConfig, siteLocale } from '@/config/site';
import { getBaseUrl } from './config';

interface BreadcrumbItem {
  name: string;
  url: string;
}

// Minimal product interface for schema generation
interface SchemaProduct {
  id: string;
  name: string;
  description: string;
  slug?: string; // Optional, will use id if not present
  price: number;
  stock: number;
  discount?: number | null;
  discountPercent?: number | null;
  sku?: string | null;
  images?: string[] | null;
  category?: { name: string; slug: string } | null;
  media?: Array<{ url: string; type?: string }>;
  variants?: Array<{ media?: Array<{ url: string; type?: string }> }>;
}

// Minimal variant interface for schema generation
interface SchemaVariant {
  name: string;
  stock: number;
  priceAdjust: number;
  media?: Array<{ url: string; type?: string }>;
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

/**
 * Generate Product JSON-LD structured data
 * Creates rich snippet for product pages with offers, images, and ratings
 */
export function generateProductSchema(
  product: SchemaProduct,
  selectedVariant?: SchemaVariant
): object {
  const baseUrl = getBaseUrl();

  // Get images from product media or variant media
  const images: string[] = [];

  if (selectedVariant?.media && selectedVariant.media.length > 0) {
    // Use selected variant's media
    const variantImages = selectedVariant.media
      .filter((m) => m.type === 'IMAGE' || !m.type)
      .map((m) => m.url);
    images.push(...variantImages);
  } else if (product.media && product.media.length > 0) {
    // Use product-level media
    const productImages = product.media
      .filter((m) => m.type === 'IMAGE' || !m.type)
      .map((m) => m.url);
    images.push(...productImages);
  } else if (product.images && product.images.length > 0) {
    // Use legacy images field
    images.push(...product.images);
  } else if (product.variants && product.variants.length > 0) {
    // Fallback: collect images from all variants if product has no direct media
    for (const variant of product.variants) {
      if (variant.media && variant.media.length > 0) {
        const variantImages = variant.media
          .filter((m) => m.type === 'IMAGE' || !m.type)
          .map((m) => m.url);
        images.push(...variantImages);
      }
    }
  }

  // Calculate final price (with variant adjustment if applicable)
  let finalPrice = product.price;
  if (selectedVariant) {
    finalPrice += selectedVariant.priceAdjust;
  }

  // Apply discount if exists
  if (product.discount && product.discount > 0) {
    finalPrice = finalPrice * (1 - product.discount / 100);
  }

  // Determine stock availability
  let stock = product.stock;
  if (selectedVariant) {
    stock = selectedVariant.stock;
  }

  const availability =
    stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  // Schema.org requires at least one image - use logo as absolute last resort
  const schemaImages =
    images.length > 0
      ? images.map((image) => toAbsoluteUrl(image, baseUrl))
      : [`${baseUrl}/images/og-default.svg`];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: selectedVariant
      ? `${product.name} - ${selectedVariant.name}`
      : product.name,
    description: product.description || `${product.name} - ${siteConfig.name}`,
    image: schemaImages,
    ...(product.sku && { sku: product.sku }),
    brand: {
      '@type': 'Brand',
      name: siteConfig.name,
    },
    offers: {
      '@type': 'Offer',
      price: finalPrice.toString(),
      priceCurrency: siteLocale.currency,
      availability,
      url: `${baseUrl}/products/${product.slug || product.id}`,
      ...(product.discount &&
        product.discount > 0 && {
          priceValidUntil: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(), // 30 days
        }),
    },
  };

  return schema;
}

/**
 * Generate Organization JSON-LD structured data
 * Should be included in the root layout for site-wide branding
 */
export function generateOrganizationSchema(): object {
  const baseUrl = getBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: baseUrl,
    logo: `${baseUrl}/logo.svg`,
    description: siteConfig.description,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: siteConfig.language,
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: process.env.NEXT_PUBLIC_SITE_COUNTRY || 'US',
    },
  };
}

/**
 * Generate BreadcrumbList JSON-LD structured data
 * Shows navigation hierarchy (Home > Category > Subcategory > Product)
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  const baseUrl = getBaseUrl();

  const listItems = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: listItems,
  };
}

/**
 * Generate breadcrumb items for a product page
 * Includes category hierarchy if available
 */
export function generateProductBreadcrumbs(
  product: SchemaProduct,
  categoryHierarchy?: Array<{ name: string; slug: string }>
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    {
      name: 'Home',
      url: '/',
    },
  ];

  // Add category hierarchy if provided
  if (categoryHierarchy && categoryHierarchy.length > 0) {
    categoryHierarchy.forEach((category) => {
      items.push({
        name: category.name,
        url: `/products?category=${category.slug}`,
      });
    });
  } else if (product.category) {
    // Fallback to just the direct category
    items.push({
      name: product.category.name,
      url: `/products?category=${product.category.slug}`,
    });
  }

  // Add the product itself
  items.push({
    name: product.name,
    url: `/products/${product.slug || product.id}`,
  });

  return items;
}

/**
 * Generate WebSite JSON-LD structured data
 * Includes site search capability
 */
export function generateWebSiteSchema(): object {
  const baseUrl = getBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Helper function to inject JSON-LD script into the page
 * Returns a script tag with type="application/ld+json"
 */
export function renderJsonLd(data: object): string {
  return JSON.stringify(data);
}
