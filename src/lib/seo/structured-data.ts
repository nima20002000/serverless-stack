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
}

// Minimal variant interface for schema generation
interface SchemaVariant {
  name: string;
  stock: number;
  priceAdjust: number;
  media?: Array<{ url: string }>;
}

// Get base URL from environment or default
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://kitia.ir';
};

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
    images.push(...selectedVariant.media.map((m) => m.url));
  } else if (product.media && product.media.length > 0) {
    images.push(...product.media.map((m) => m.url));
  } else if (product.images && product.images.length > 0) {
    images.push(...product.images);
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

  const availability = stock > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name,
    description: product.description || `${product.name} - خرید آنلاین از کیتیا`,
    ...(images.length > 0 && { image: images }),
    ...(product.sku && { sku: product.sku }),
    brand: {
      '@type': 'Brand',
      name: 'کیتیا',
    },
    offers: {
      '@type': 'Offer',
      price: finalPrice.toString(),
      priceCurrency: 'IRR',
      availability,
      url: `${baseUrl}/products/${product.slug || product.id}`,
      ...(product.discount && product.discount > 0 && {
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
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
    name: 'کیتیا',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'فروشگاه آنلاین محصولات با کیفیت',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'پشتیبانی مشتریان',
      availableLanguage: 'Persian',
      telephone: '+98-21-1234-5678', // Replace with actual phone
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IR',
      addressLocality: 'تهران',
      addressRegion: 'تهران',
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
      name: 'خانه',
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
    name: 'کیتیا',
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
