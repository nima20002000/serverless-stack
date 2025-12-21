import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/products/ProductDetail';
import { getProductById } from '@/services/product-service';
import { Tables } from '@/lib/supabase/types';

type Product = Tables<'products'>;
type ProductVariant = Tables<'product_variants'>;
import { cache } from 'react';

// Use ISR for better performance - revalidate every 60 seconds
export const revalidate = 60;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// Cache the product query to avoid duplicate fetching between metadata and page
const getCachedProduct = cache(async (id: string) => {
  return getProductById(id, true);
});

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getCachedProduct(id);

    // Get first image from media or fallback to legacy images
    const productWithRelations = product as Product & {
      media?: Array<{ id: string; type: 'IMAGE' | 'VIDEO'; url: string; alt?: string; order: number }>;
      category?: { id: string; name: string; slug: string } | null;
    };

    const firstImage = productWithRelations.media && productWithRelations.media.length > 0
      ? productWithRelations.media.find(m => m.type === 'IMAGE')?.url
      : product.images && product.images.length > 0
        ? product.images[0]
        : undefined;

    // Calculate final price
    const finalPrice = product.discountPercent
      ? Number(product.price) * (1 - product.discountPercent / 100)
      : Number(product.price);

    // Build description
    const categoryName = productWithRelations.category?.name || '';
    const stockStatus = product.stock > 0 ? 'موجود' : 'ناموجود';
    const priceText = `قیمت: ${finalPrice.toLocaleString('fa-IR')} تومان`;
    const fullDescription = `${product.description} | ${categoryName ? `دسته: ${categoryName} | ` : ''}${priceText} | وضعیت: ${stockStatus}`;

    return {
      title: `${product.name} - کیتیا`,
      description: fullDescription.substring(0, 160),
      openGraph: {
        title: `${product.name} - کیتیا`,
        description: product.description,
        type: "website",
        locale: "fa_IR",
        siteName: "کیتیا",
        images: firstImage ? [
          {
            url: firstImage,
            width: 800,
            height: 800,
            alt: product.name,
          }
        ] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: `${product.name} - کیتیا`,
        description: product.description,
        images: firstImage ? [firstImage] : undefined,
      },
      alternates: {
        canonical: `/products/${id}`,
      },
      other: {
        'product:price:amount': finalPrice.toString(),
        'product:price:currency': 'IRR',
        'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
        'product:condition': 'new',
      },
    };
  } catch {
    return {
      title: 'محصول یافت نشد - کیتیا',
      description: 'این محصول در حال حاضر در دسترس نیست.',
    };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  let product;

  try {
    product = await getCachedProduct(id);
  } catch {
    notFound();
  }

  // Serialize product data for client component
  type ProductWithRelations = Product & {
    variants?: Array<ProductVariant & { media?: Array<{ id: string; type: 'IMAGE' | 'VIDEO'; url: string; alt?: string; order: number }> }>;
    category?: { id: string; name: string; slug: string } | null;
    tags?: Array<{ id: string; name: string; slug: string }>;
    media?: Array<{ id: string; type: 'IMAGE' | 'VIDEO'; url: string; alt?: string; order: number }>;
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
    tags: 'tags' in product ? (productWithRelations.tags || []) : [],
    media: 'media' in product ? (productWithRelations.media || []) : [],
    variants: 'variants' in product && productWithRelations.variants && Array.isArray(productWithRelations.variants)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductDetail product={serializedProduct} />
      </main>
    </div>
  );
}
