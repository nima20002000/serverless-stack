'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useCartStore } from '@/store/cart-store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((state) => state.clearCart);

  const transactionCode = searchParams.get('code');
  const refId = searchParams.get('refId');

  useEffect(() => {
    // Clear cart after successful payment
    clearCart();
  }, [clearCart]);

  if (!transactionCode) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center">
            {/* Success Icon */}
            <div className="mb-6">
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto" />
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              پرداخت موفق
            </h1>
            <p className="text-gray-600 mb-6">خرید شما با موفقیت انجام شد</p>

            {/* Transaction Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-mono font-bold text-gray-900">
                  {transactionCode}
                </span>
                <span className="text-gray-600">کد تراکنش</span>
              </div>

              {refId && (
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="font-mono text-gray-900">{refId}</span>
                  <span className="text-gray-600">شماره پیگیری</span>
                </div>
              )}
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 text-right">
                کد تراکنش خود را یادداشت کنید. شما می‌توانید وضعیت سفارش خود را
                از طریق پروفایل خود پیگیری کنید.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/products')}
              >
                ادامه خرید
              </Button>

              <Link href="/profile" className="block">
                <Button variant="secondary" className="w-full">
                  مشاهده تراکنش‌ها
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">در حال بارگذاری...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
