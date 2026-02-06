'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircleIcon } from '@heroicons/react/24/solid';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

function FailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const transactionCode = searchParams.get('code');
  const provider = searchParams.get('provider');
  const paymentStatus = searchParams.get('status');
  const errorMessage = searchParams.get('error');
  const isCancelled = paymentStatus === 'cancelled';
  const isPending = paymentStatus === 'pending';

  const title = isCancelled
    ? 'پرداخت لغو شد'
    : isPending
      ? 'پرداخت در انتظار تایید'
      : 'پرداخت ناموفق';
  const subtitle = isCancelled
    ? 'فرآیند پرداخت توسط شما لغو شد'
    : isPending
      ? 'تایید نهایی درگاه پرداخت هنوز تکمیل نشده است'
      : 'متأسفانه پرداخت شما انجام نشد';
  const infoMessage = isCancelled
    ? 'سبد خرید شما حفظ شده است. می‌توانید روش پرداخت را تغییر دهید و دوباره تلاش کنید.'
    : isPending
      ? 'لطفاً چند دقیقه بعد وضعیت تراکنش را از پروفایل بررسی کنید.'
      : 'مبلغی از حساب شما کسر نشده است. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center">
            {/* Error Icon */}
            <div className="mb-6">
              <XCircleIcon className="w-20 h-20 text-red-500 mx-auto" />
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600 mb-6">{subtitle}</p>

            {/* Transaction Code if available */}
            {transactionCode && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="font-mono font-bold text-gray-900">
                    {transactionCode}
                  </span>
                  <span className="text-gray-600">کد تراکنش</span>
                </div>
              </div>
            )}

            {/* Error Details */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 text-right">
                  {decodeURIComponent(errorMessage)}
                </p>
              </div>
            )}

            {/* Info Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 text-right">
                {infoMessage}
                {provider && !isPending && (
                  <span className="block mt-2 text-xs">
                    Provider: {provider}
                  </span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link href="/cart" className="block">
                <Button variant="primary" className="w-full">
                  بازگشت به سبد خرید
                </Button>
              </Link>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/products')}
              >
                ادامه خرید
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">در حال بارگذاری...</div>
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  );
}
