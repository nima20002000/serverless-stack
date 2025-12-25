'use client';

import ProductCard from './ProductCard';

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string | null;
  order: number;
}

interface Variant {
  id: string;
  name: string;
  sku?: string | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  priceAdjust: number;
  stock: number;
  isActive: boolean;
  media?: MediaItem[];
}

interface RelatedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercent?: number | null;
  stock: number;
  images: string[];
  isActive: boolean;
  isFeatured?: boolean;
  hasVariants?: boolean;
  variants?: Variant[];
}

interface RelatedProductsProps {
  products: RelatedProduct[];
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-right">
        محصولات مرتبط
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
