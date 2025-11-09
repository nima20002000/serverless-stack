import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getProductById, formatPrice } from '@/services/product-service';

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

  const isOutOfStock = product.stock === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-right">
          <a href="/products" className="text-blue-600 hover:text-blue-700">
            محصولات
          </a>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-700">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <Card>
            <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
              <div className="text-gray-400 text-8xl">📦</div>
            </div>
          </Card>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4 text-right">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mb-6">
              <span className="text-3xl font-bold text-blue-600">
                {formatPrice(Number(product.price))}
              </span>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {isOutOfStock ? (
                <span className="inline-block bg-red-100 text-red-800 px-4 py-2 rounded-lg font-medium">
                  ناموجود
                </span>
              ) : (
                <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                  موجود ({product.stock} عدد)
                </span>
              )}
            </div>

            {/* Description */}
            <Card className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 text-right">
                توضیحات محصول
              </h2>
              <p className="text-gray-700 leading-relaxed text-right whitespace-pre-line">
                {product.description}
              </p>
            </Card>

            {/* Add to Cart */}
            <div className="space-y-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isOutOfStock}
                onClick={() => {
                  // TODO: Implement cart functionality
                  alert('سبد خرید به زودی اضافه خواهد شد');
                }}
              >
                {isOutOfStock ? 'ناموجود' : 'افزودن به سبد خرید'}
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => window.history.back()}
              >
                بازگشت به لیست محصولات
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
