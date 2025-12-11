import ProductList from '@/components/products/ProductList';
import { getActiveProducts } from '@/services/product-service';

// Use ISR for better performance - revalidate every 60 seconds
export const revalidate = 60;

export default async function ProductsPage() {
  const result = await getActiveProducts({ page: 1, perPage: 20 });

  // Serialize Decimal prices to numbers for client components
  const products = result.data.map((product) => ({
    ...product,
    price: Number(product.price),
    discountPercent: product.discountPercent,
    isFeatured: product.isFeatured,
    variants: product.variants?.map(v => ({ ...v, priceAdjust: Number(v.priceAdjust) })),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-right mb-2">
            محصولات
          </h1>
          <p className="text-gray-600 text-right">
            مشاهده و خرید بهترین محصولات
          </p>
        </div>

        <ProductList
          initialProducts={products}
          initialPage={1}
          initialTotal={result.total}
        />
      </main>
    </div>
  );
}
