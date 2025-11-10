import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import ProductDetail from '@/components/products/ProductDetail';
import { getProductById } from '@/services/product-service';

interface ProductPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const product = await getProductById(params.id, true);
    return {
      title: `${product.name} - کیتیا`,
      description: product.description,
    };
  } catch (error) {
    return {
      title: 'محصول یافت نشد - کیتیا',
    };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  let product;

  try {
    product = await getProductById(params.id, true);
  } catch (error) {
    notFound();
  }

  // Serialize product data for client component
  const serializedProduct: any = {
    ...product,
    price: Number(product.price),
    category: 'category' in product ? product.category : null,
    tags: 'tags' in product ? (product.tags || []) : [],
    media: 'media' in product ? (product.media || []) : [],
    variants: 'variants' in product && product.variants && Array.isArray(product.variants)
      ? product.variants.map((v: any) => ({
          ...v,
          priceAdjust: Number(v.priceAdjust),
          media: v.media || [],
        }))
      : [],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductDetail product={serializedProduct} />
      </main>
    </div>
  );
}
