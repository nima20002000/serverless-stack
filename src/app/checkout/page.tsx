'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useCartStore, formatPrice } from '@/store/cart-store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, total, itemCount } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/checkout');
    }

    // Redirect to cart if cart is empty
    if (status === 'authenticated' && items.length === 0) {
      router.push('/cart');
    }
  }, [status, items.length, router]);

  const handleCheckout = async () => {
    try {
      setError('');
      setIsProcessing(true);

      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در ایجاد تراکنش');
      }

      // Redirect to Zarinpal payment page
      window.location.href = data.paymentUrl;
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/cart"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowRightIcon className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 text-right">
              تکمیل خرید
            </h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Alert type="error" className="mb-6" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-lg font-bold text-gray-900 text-right mb-4 border-b pb-3">
                خلاصه سفارش
              </h2>

              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-4 py-3 border-b last:border-b-0"
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg" />
                    <div className="flex-1 text-right">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-left font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* User Info */}
            <Card className="mt-6">
              <h2 className="text-lg font-bold text-gray-900 text-right mb-4 border-b pb-3">
                اطلاعات خریدار
              </h2>
              <div className="space-y-3 text-right">
                <div>
                  <span className="text-gray-600">نام:</span>{' '}
                  <span className="font-medium">{session?.user?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">ایمیل:</span>{' '}
                  <span className="font-medium">{session?.user?.email}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card>
                <h2 className="text-lg font-bold text-gray-900 text-right mb-4 border-b pb-3">
                  اطلاعات پرداخت
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900">{itemCount}</span>
                    <span className="text-gray-600">تعداد کالاها</span>
                  </div>

                  <div className="flex justify-between text-sm border-t pt-3">
                    <span className="text-gray-900" dir="rtl">
                      {formatPrice(total)}
                    </span>
                    <span className="text-gray-600">جمع جزء</span>
                  </div>

                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span className="text-gray-900" dir="rtl">
                      {formatPrice(total)}
                    </span>
                    <span className="text-gray-900">مبلغ قابل پرداخت</span>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-4"
                    onClick={handleCheckout}
                    isLoading={isProcessing}
                    disabled={isProcessing}
                  >
                    پرداخت
                  </Button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <p className="text-xs text-blue-800 text-right">
                      پس از کلیک بر روی دکمه پرداخت، به درگاه پرداخت زرین‌پال هدایت می‌شوید
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
