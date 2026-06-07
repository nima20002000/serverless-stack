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
import { useI18n, useTranslations } from '@/components/providers/I18nProvider';
import { prefixPathWithLocale } from '@/lib/i18n/routing';

type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

interface TransactionStatusResponse {
  transactionCode: string;
  status: TransactionStatus;
  paymentMethod: 'STRIPE' | 'PAYPAL';
  stripePaymentIntentId: string | null;
  paypalOrderId: string | null;
}

function providerLabel(provider: string | null) {
  const normalizedProvider = provider?.toLowerCase();
  if (normalizedProvider === 'stripe') return 'Stripe';
  if (normalizedProvider === 'paypal') return 'PayPal';
  return null;
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const t = useTranslations();
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
      setStatusError(t('payment.missingTransactionCode'));
      setIsLoading(false);
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
              : t('payment.unableToLoadStatus')
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
          error instanceof Error
            ? error.message
            : t('payment.unableToLoadStatus')
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
  }, [clearCart, clearCheckoutFormData, t, transactionCode]);

  const showPollingNotice = status === 'PENDING' && attempts > 0;
  const isPendingLong = status === 'PENDING' && attempts >= 30;

  const readableProvider = providerLabel(provider);
  const hasMissingCode = !transactionCode;

  let title = t('payment.pending');
  let description = t('payment.pendingSuccessDescription');
  let icon = <ClockIcon className="w-20 h-20 text-amber-500 mx-auto" />;
  let noticeClass =
    'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/25 dark:text-amber-200';

  if (hasMissingCode) {
    title = t('payment.statusUnavailable');
    description = t('payment.unavailableSuccessDescription');
    icon = <XCircleIcon className="w-20 h-20 text-red-500 mx-auto" />;
    noticeClass =
      'border border-red-200 bg-red-50 text-red-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200';
  } else if (status === 'COMPLETED') {
    title = t('payment.completed');
    description = t('payment.completedDescription');
    icon = <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto" />;
    noticeClass =
      'border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
  } else if (status === 'FAILED') {
    title = t('payment.failed');
    description = t('payment.failedDescription');
    icon = <XCircleIcon className="w-20 h-20 text-red-500 mx-auto" />;
    noticeClass =
      'border border-red-200 bg-red-50 text-red-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200';
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-950">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center">
            <div className="mb-6">{icon}</div>

            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            <p className="mb-6 text-gray-600 dark:text-slate-400">
              {description}
            </p>

            <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-slate-800/80">
              {transactionCode && (
                <div className="flex justify-between text-sm">
                  <span className="font-mono font-bold text-gray-900 dark:text-slate-100">
                    {transactionCode}
                  </span>
                  <span className="text-gray-600 dark:text-slate-400">
                    {t('payment.transactionCode')}
                  </span>
                </div>
              )}

              {readableProvider && (
                <div className="flex justify-between border-t border-gray-200 pt-3 text-sm dark:border-slate-700">
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {readableProvider}
                  </span>
                  <span className="text-gray-600 dark:text-slate-400">
                    {t('payment.provider')}
                  </span>
                </div>
              )}

              {refId && (
                <div className="flex justify-between border-t border-gray-200 pt-3 text-sm dark:border-slate-700">
                  <span className="font-mono text-gray-900 dark:text-slate-100">
                    {refId}
                  </span>
                  <span className="text-gray-600 dark:text-slate-400">
                    {t('payment.reference')}
                  </span>
                </div>
              )}

              {captureId && (
                <div className="flex justify-between border-t border-gray-200 pt-3 text-sm dark:border-slate-700">
                  <span className="break-all font-mono text-gray-900 dark:text-slate-100">
                    {captureId}
                  </span>
                  <span className="text-gray-600 dark:text-slate-400">
                    {t('payment.paypalCapture')}
                  </span>
                </div>
              )}

              {sessionId && (
                <div className="flex justify-between border-t border-gray-200 pt-3 text-sm dark:border-slate-700">
                  <span className="break-all font-mono text-gray-900 dark:text-slate-100">
                    {sessionId}
                  </span>
                  <span className="text-gray-600 dark:text-slate-400">
                    {t('payment.stripeSession')}
                  </span>
                </div>
              )}
            </div>

            <div className={`mb-6 rounded-lg p-4 ${noticeClass}`}>
              {isLoading && (
                <p className="text-sm">{t('payment.checkingStatus')}</p>
              )}
              {!isLoading && status === 'COMPLETED' && (
                <p className="text-sm">{t('payment.cartCleared')}</p>
              )}
              {!isLoading && status === 'FAILED' && (
                <p className="text-sm">{t('payment.retryCheckout')}</p>
              )}
              {!isLoading && status === 'PENDING' && !isPendingLong && (
                <p className="text-sm">{t('payment.keepOpen')}</p>
              )}
              {!isLoading && status === 'PENDING' && isPendingLong && (
                <p className="text-sm">{t('payment.takingLonger')}</p>
              )}
              {!isLoading && !status && statusError && (
                <p className="text-sm">{statusError}</p>
              )}
              {!isLoading && showPollingNotice && (
                <p className="text-xs mt-2 opacity-80">
                  {t('payment.statusCheck', { attempts })}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {status === 'FAILED' || status === 'PENDING' || hasMissingCode ? (
                <Link
                  href={prefixPathWithLocale('/cart', locale)}
                  className="block"
                >
                  <Button variant="primary" className="w-full">
                    {t('payment.returnToCart')}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() =>
                    router.push(prefixPathWithLocale('/products', locale))
                  }
                >
                  {t('payment.continueShopping')}
                </Button>
              )}

              <Link
                href={prefixPathWithLocale('/profile', locale)}
                className="block"
              >
                <Button variant="secondary" className="w-full">
                  {t('payment.viewTransactions')}
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
          <div className="text-gray-600 dark:text-slate-400">Loading...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
