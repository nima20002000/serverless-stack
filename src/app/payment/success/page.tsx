'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { useCartStore } from '@/store/cart-store';
import { useCheckoutStore } from '@/store/checkout-store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

interface TransactionStatusResponse {
  transactionCode: string;
  status: TransactionStatus;
  paymentMethod: 'STRIPE' | 'PAYPAL';
  stripePaymentIntentId: string | null;
  paypalOrderId: string | null;
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((state) => state.clearCart);
  const clearCheckoutFormData = useCheckoutStore(
    (state) => state.clearFormData
  );

  const transactionCode = searchParams.get('code');
  const provider = searchParams.get('provider');
  const captureId = searchParams.get('captureId');
  const sessionId = searchParams.get('session_id');
  const refId = searchParams.get('refId');
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const hasClearedCartRef = useRef(false);
  const pollAttemptsRef = useRef(0);

  useEffect(() => {
    if (!transactionCode) {
      router.push('/');
      return () => undefined;
    }

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    pollAttemptsRef.current = 0;
    setAttempts(0);

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/transactions/status?code=${encodeURIComponent(transactionCode)}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'خطا در بررسی وضعیت پرداخت'
          );
        }

        const data = (await response.json()) as TransactionStatusResponse;

        if (!isMounted) {
          return;
        }

        setStatus(data.status);
        setStatusError('');

        if (data.status === 'COMPLETED') {
          if (!hasClearedCartRef.current) {
            clearCart();
            clearCheckoutFormData();
            hasClearedCartRef.current = true;
          }
          if (intervalId) {
            clearInterval(intervalId);
          }
          return;
        }

        if (data.status === 'FAILED') {
          if (intervalId) {
            clearInterval(intervalId);
          }
          return;
        }

        pollAttemptsRef.current += 1;
        setAttempts(pollAttemptsRef.current);
        if (pollAttemptsRef.current >= 30 && intervalId) {
          clearInterval(intervalId);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setStatusError(
          error instanceof Error ? error.message : 'خطا در بررسی وضعیت پرداخت'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchStatus();

    intervalId = setInterval(() => {
      void fetchStatus();
    }, 4000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [clearCart, clearCheckoutFormData, router, transactionCode]);

  const showPollingNotice = status === 'PENDING' && attempts > 0;
  const isPendingLong = status === 'PENDING' && attempts >= 30;

  let title = 'در حال بررسی پرداخت';
  let description = 'پرداخت شما ثبت شده و در حال تایید نهایی است.';
  let icon = <ClockIcon className="w-20 h-20 text-amber-500 mx-auto" />;
  let noticeClass = 'bg-amber-50 border border-amber-200 text-amber-800';

  if (status === 'COMPLETED') {
    title = 'پرداخت موفق';
    description = 'خرید شما با موفقیت انجام شد';
    icon = <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto" />;
    noticeClass = 'bg-blue-50 border border-blue-200 text-blue-800';
  } else if (status === 'FAILED') {
    title = 'پرداخت ناموفق';
    description = 'پرداخت تایید نشد. می‌توانید دوباره تلاش کنید.';
    icon = <XCircleIcon className="w-20 h-20 text-red-500 mx-auto" />;
    noticeClass = 'bg-red-50 border border-red-200 text-red-800';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center">
            <div className="mb-6">{icon}</div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600 mb-6">{description}</p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              {transactionCode && (
                <div className="flex justify-between text-sm">
                  <span className="font-mono font-bold text-gray-900">
                    {transactionCode}
                  </span>
                  <span className="text-gray-600">کد تراکنش</span>
                </div>
              )}

              {refId && (
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="font-mono text-gray-900">{refId}</span>
                  <span className="text-gray-600">شماره پیگیری</span>
                </div>
              )}

              {captureId && (
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="font-mono text-gray-900 break-all">
                    {captureId}
                  </span>
                  <span className="text-gray-600">PayPal Capture</span>
                </div>
              )}

              {sessionId && (
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="font-mono text-gray-900 break-all">
                    {sessionId}
                  </span>
                  <span className="text-gray-600">Stripe Session</span>
                </div>
              )}
            </div>

            <div className={`rounded-lg p-4 mb-6 ${noticeClass}`}>
              {isLoading && (
                <p className="text-sm text-right">
                  در حال بررسی وضعیت پرداخت...
                </p>
              )}
              {!isLoading && status === 'COMPLETED' && (
                <p className="text-sm text-right">
                  تراکنش تایید شد. وضعیت سفارش را از پروفایل می‌توانید پیگیری
                  کنید.
                </p>
              )}
              {!isLoading && status === 'FAILED' && (
                <p className="text-sm text-right">
                  سفارش شما تکمیل نشده است و سبد خرید شما حفظ شده تا دوباره تلاش
                  کنید.
                </p>
              )}
              {!isLoading && status === 'PENDING' && !isPendingLong && (
                <p className="text-sm text-right">
                  درگاه پرداخت پاسخ نهایی را هنوز ارسال نکرده است. این صفحه
                  خودکار وضعیت را بررسی می‌کند.
                </p>
              )}
              {!isLoading && status === 'PENDING' && isPendingLong && (
                <p className="text-sm text-right">
                  تایید پرداخت بیش از حد معمول زمان برده است. چند دقیقه دیگر
                  دوباره بررسی کنید یا از پروفایل وضعیت را ببینید.
                </p>
              )}
              {!isLoading && !status && statusError && (
                <p className="text-sm text-right">{statusError}</p>
              )}
              {!isLoading && showPollingNotice && (
                <p className="text-xs mt-2 text-right opacity-80">
                  در حال بررسی مجدد...
                </p>
              )}
            </div>

            <div className="space-y-3">
              {status === 'FAILED' ? (
                <Link href="/cart" className="block">
                  <Button variant="primary" className="w-full">
                    بازگشت به سبد خرید
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push('/products')}
                >
                  ادامه خرید
                </Button>
              )}

              <Link href="/profile" className="block">
                <Button variant="secondary" className="w-full">
                  مشاهده تراکنش‌ها
                </Button>
              </Link>

              {status === 'PENDING' && provider === 'stripe' && (
                <Link href="/cart" className="block">
                  <Button variant="secondary" className="w-full">
                    بازگشت به سبد خرید
                  </Button>
                </Link>
              )}
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
