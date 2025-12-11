'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useCartStore, formatPrice, selectTotal, selectItemCount } from '@/store/cart-store';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import ZarinpalBadge from '@/components/payment/ZarinpalBadge';
import CheckoutForm from '@/components/checkout/CheckoutForm';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const items = useCartStore((state) => state.items);
  const total = useCartStore(selectTotal);
  const itemCount = useCartStore(selectItemCount);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only redirect if cart is empty AND session is not loading
    // This prevents redirect during session updates (e.g., after OTP login)
    if (status !== 'loading' && items.length === 0) {
      router.push('/cart');
    }
  }, [items.length, router, status]);

  const handleCheckout = useCallback(async (formData: {
    fullName: string;
    phone: string;
    email: string;
    shippingAddress: string;
    postalCode: string;
    createAccount: boolean;
    phoneVerified: boolean;
  }) => {
    try {
      setError('');
      setIsProcessing(true);

      // For logged-in users who haven't verified their phone, require verification
      if (session && !session.user.phone && !formData.phoneVerified) {
        throw new Error('لطفاً شماره تلفن خود را تایید کنید');
      }

      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          // TODO: Add payment method selection UI when Digipay is integrated
          // paymentMethod: 'ZARINPAL' | 'DIGIPAY'
          shippingInfo: {
            fullName: formData.fullName,
            phone: formData.phone,
            email: formData.email || undefined,
            shippingAddress: formData.shippingAddress,
            postalCode: formData.postalCode || undefined,
            createAccount: formData.createAccount,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در ایجاد تراکنش');
      }

      // Redirect to Zarinpal payment page
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ایجاد تراکنش');
      setIsProcessing(false);
    }
  }, [items, session]);

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
          {/* Order Summary and Shipping Form */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-lg font-bold text-gray-900 text-right mb-4 border-b pb-3">
                خلاصه سفارش
              </h2>

              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || 'no-variant'}`}
                    className="flex items-center gap-4 py-3 border-b last:border-b-0"
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg" />
                    <div className="flex-1 text-right">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      {item.variantName && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.variantName}
                        </p>
                      )}
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

            {/* Shipping Information Form */}
            <CheckoutForm
              session={session}
              onSubmit={handleCheckout}
              isProcessing={isProcessing}
            />

            {/* Payment Method */}
            <Card className="mt-6">
              <h2 className="text-lg font-bold text-gray-900 text-right mb-4 border-b pb-3">
                روش پرداخت
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="zarinpal"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 text-right">
                    <div className="font-medium text-gray-900">زرین‌پال</div>
                    <div className="text-sm text-gray-600">پرداخت امن با کلیه کارت‌های بانکی</div>
                  </div>
                  <div className="flex-shrink-0">
                    <ZarinpalBadge />
                  </div>
                </label>
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

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <p className="text-xs text-blue-800 text-right">
                      پس از تکمیل فرم و کلیک بر روی دکمه پرداخت، به درگاه پرداخت زرین‌پال هدایت می‌شوید
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
