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
    const product = await getProductById(params.id);
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
    product = await getProductById(params.id);
  } catch (error) {
    notFound();
  }

  // Serialize product data for client component
  const serializedProduct = {
    ...product,
    price: Number(product.price),
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
