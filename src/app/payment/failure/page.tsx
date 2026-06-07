'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useI18n, useTranslations } from '@/components/providers/I18nProvider';
import { prefixPathWithLocale } from '@/lib/i18n/routing';

function providerLabel(provider: string | null) {
  const normalizedProvider = provider?.toLowerCase();
  if (normalizedProvider === 'stripe') return 'Stripe';
  if (normalizedProvider === 'paypal') return 'PayPal';
  return null;
}

function FailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const t = useTranslations();

  const transactionCode = searchParams.get('code');
  const provider = searchParams.get('provider');
  const paymentStatus = searchParams.get('status');
  const errorMessage = searchParams.get('error');
  const readableProvider = providerLabel(provider);
  const isCancelled = paymentStatus === 'cancelled';
  const isPending = paymentStatus === 'pending';
  const hasMissingCode = !transactionCode;

  const title = hasMissingCode
    ? t('payment.statusUnavailable')
    : isCancelled
      ? t('payment.cancelled')
      : isPending
        ? t('payment.pending')
        : t('payment.failed');
  const subtitle = hasMissingCode
    ? t('payment.unavailableDescription')
    : isCancelled
      ? t('payment.cancelledDescription')
      : isPending
        ? t('payment.pendingDescription')
        : t('payment.failedDescription');
  const infoMessage = hasMissingCode
    ? t('payment.missingCodeInfo')
    : isCancelled
      ? t('payment.cancelledInfo')
      : isPending
        ? t('payment.pendingInfo')
        : t('payment.failedInfo');
  const icon = isPending ? (
    <ClockIcon className="w-20 h-20 text-amber-500 mx-auto" />
  ) : hasMissingCode ? (
    <ExclamationTriangleIcon className="w-20 h-20 text-amber-500 mx-auto" />
  ) : (
    <XCircleIcon className="w-20 h-20 text-red-500 mx-auto" />
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-950">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center">
            {/* Error Icon */}
            <div className="mb-6">{icon}</div>

            {/* Error Message */}
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            <p className="mb-6 text-gray-600 dark:text-slate-400">{subtitle}</p>

            {/* Transaction Code if available */}
            {transactionCode && (
              <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-slate-800/80">
                <div className="flex justify-between text-sm">
                  <span className="font-mono font-bold text-gray-900 dark:text-slate-100">
                    {transactionCode}
                  </span>
                  <span className="text-gray-600 dark:text-slate-400">
                    {t('payment.transactionCode')}
                  </span>
                </div>
              </div>
            )}

            {readableProvider && (
              <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-slate-800/80">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {readableProvider}
                  </span>
                  <span className="text-gray-600 dark:text-slate-400">
                    {t('payment.provider')}
                  </span>
                </div>
              </div>
            )}

            {/* Error Details */}
            {errorMessage && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-rose-800 dark:bg-rose-900/30">
                <p className="text-sm text-red-800 dark:text-rose-200">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Info Message */}
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-amber-800 dark:bg-amber-900/25">
              <p className="text-sm text-yellow-800 dark:text-amber-200">
                {infoMessage}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href={prefixPathWithLocale('/cart', locale)}
                className="block"
              >
                <Button variant="primary" className="w-full">
                  {t('payment.returnToCart')}
                </Button>
              </Link>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  router.push(prefixPathWithLocale('/products', locale))
                }
              >
                {t('payment.continueShopping')}
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
          <div className="text-gray-600 dark:text-slate-400">Loading...</div>
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  );
}
