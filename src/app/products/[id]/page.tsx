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
    return {
      title: `${product.name} - کیتیا`,
      description: product.description,
    };
  } catch {
    return {
      title: 'محصول یافت نشد - کیتیا',
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
