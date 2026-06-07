import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/products/ProductDetail';
import RelatedProducts from '@/components/products/RelatedProducts';
import { getProductById, getRelatedProducts } from '@/services/product-service';
import { Tables } from '@/lib/supabase/types';
import {
  generateProductSchema,
  generateBreadcrumbSchema,
  generateProductBreadcrumbs,
  renderJsonLd,
} from '@/lib/seo/structured-data';
import { getProductOgImage } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { formatPrice } from '@/lib/utils/format';
import { siteConfig, siteLocale } from '@/config/site';
import { getRequestLocale } from '@/lib/i18n/server';

type Product = Tables<'products'>;
type ProductVariant = Tables<'product_variants'>;
import { cache } from 'react';

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// Cache the product query to avoid duplicate fetching between metadata and page
const getCachedProduct = cache(async (id: string, locale: string) => {
  return getProductById(id, true, false, locale);
});

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getRequestLocale();
  try {
    const product = await getCachedProduct(id, locale);

    // Get first image from media or fallback to legacy images
    const productWithRelations = product as Product & {
      seoTitle?: string | null;
      seoDescription?: string | null;
      media?: Array<{
        id: string;
        type: 'IMAGE' | 'VIDEO';
        url: string;
        alt?: string;
        order: number;
      }>;
      category?: { id: string; name: string; slug: string } | null;
    };

    const firstImage =
      productWithRelations.media && productWithRelations.media.length > 0
        ? productWithRelations.media.find((m) => m.type === 'IMAGE')?.url
        : product.images && product.images.length > 0
          ? product.images[0]
          : undefined;

    // Optimize image for Open Graph (1200x630)
    const ogImage = firstImage ? getProductOgImage(firstImage) : undefined;

    // Calculate final price
    const finalPrice = product.discountPercent
      ? Number(product.price) * (1 - product.discountPercent / 100)
      : Number(product.price);

    // Build description
    const categoryName = productWithRelations.category?.name || '';
    const stockStatus = product.stock > 0 ? 'In stock' : 'Out of stock';
    const priceText = `Price: ${formatPrice(finalPrice)}`;
    const fullDescription = `${product.description} | ${categoryName ? `Category: ${categoryName} | ` : ''}${priceText} | Availability: ${stockStatus}`;
    const metadataTitle =
      productWithRelations.seoTitle ||
      `${product.name} - ${siteConfig.displayName}`;
    const metadataDescription =
      productWithRelations.seoDescription || fullDescription.substring(0, 160);

    return {
      title: metadataTitle,
      description: metadataDescription,
      openGraph: {
        title: metadataTitle,
        description: metadataDescription,
        locale: locale === 'de' ? 'de_DE' : siteLocale.ogLocale,
        siteName: siteConfig.displayName,
        images: ogImage
          ? [
              {
                url: ogImage,
                width: 1200,
                height: 630,
                alt: product.name,
              },
            ]
          : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: metadataTitle,
        description: metadataDescription,
        images: ogImage ? [ogImage] : undefined,
      },
      alternates: {
        canonical: getAbsoluteUrl(`/products/${id}`),
      },
      other: {
        'og:type': 'product',
        'product:price:amount': finalPrice.toString(),
        'product:price:currency': siteLocale.currency,
        'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
        'product:condition': 'new',
      },
    };
  } catch {
    return {
      title: `Product not found - ${siteConfig.displayName}`,
      description: 'This product is not currently available.',
    };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  const locale = await getRequestLocale();
  let product;
  let relatedProducts;

  try {
    product = await getCachedProduct(id, locale);
    // Fetch related products
    relatedProducts = await getRelatedProducts(id, { limit: 4, locale });
  } catch {
    notFound();
  }

  // Serialize product data for client component
  type ProductWithRelations = Product & {
    variants?: Array<
      ProductVariant & {
        media?: Array<{
          id: string;
          type: 'IMAGE' | 'VIDEO';
          url: string;
          alt?: string;
          order: number;
        }>;
      }
    >;
    category?: { id: string; name: string; slug: string } | null;
    tags?: Array<{ id: string; name: string; slug: string }>;
    media?: Array<{
      id: string;
      type: 'IMAGE' | 'VIDEO';
      url: string;
      alt?: string;
      order: number;
    }>;
  };

  const productWithRelations = product as ProductWithRelations;
  const serializedProduct = {
    ...product,
    price: Number(product.price),
    images: product.images || [],
    discountPercent: product.discountPercent,
    hasVariants: product.hasVariants,
    isFeatured: product.isFeatured,
    category: 'category' in product ? productWithRelations.category : null,
    tags: 'tags' in product ? productWithRelations.tags || [] : [],
    media: 'media' in product ? productWithRelations.media || [] : [],
    variants:
      'variants' in product &&
      productWithRelations.variants &&
      Array.isArray(productWithRelations.variants)
        ? productWithRelations.variants.map((v) => ({
            ...v,
            sku: v.sku || undefined,
            color: v.color || undefined,
            size: v.size || undefined,
            material: v.material || undefined,
            priceAdjust: Number(v.priceAdjust),
            media: v.media || [],
          }))
        : [],
  };

  // Serialize related products for client component
  const serializedRelatedProducts = relatedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    discountPercent: p.discountPercent,
    stock: p.stock,
    images: p.images || [],
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    hasVariants: p.hasVariants,
    variants: p.variants
      ? p.variants.map((v) => ({
          ...v,
          sku: v.sku || undefined,
          color: v.color || undefined,
          size: v.size || undefined,
          material: v.material || undefined,
          priceAdjust: Number(v.priceAdjust),
          media: v.media || [],
        }))
      : [],
  }));

  // Generate JSON-LD structured data
  const productSchema = generateProductSchema(productWithRelations);
  const breadcrumbItems = generateProductBreadcrumbs(productWithRelations);
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      {/* Product JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(productSchema) }}
      />
      {/* Breadcrumb JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <div className="min-h-screen bg-slate-50 pt-16 dark:bg-slate-950">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <ProductDetail product={serializedProduct} />
          <RelatedProducts products={serializedRelatedProducts} />
        </main>
      </div>
    </>
  );
}
