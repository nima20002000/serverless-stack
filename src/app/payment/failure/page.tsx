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

function providerLabel(provider: string | null) {
  const normalizedProvider = provider?.toLowerCase();
  if (normalizedProvider === 'stripe') return 'Stripe';
  if (normalizedProvider === 'paypal') return 'PayPal';
  return null;
}

function FailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const transactionCode = searchParams.get('code');
  const provider = searchParams.get('provider');
  const paymentStatus = searchParams.get('status');
  const errorMessage = searchParams.get('error');
  const readableProvider = providerLabel(provider);
  const isCancelled = paymentStatus === 'cancelled';
  const isPending = paymentStatus === 'pending';
  const hasMissingCode = !transactionCode;

  const title = hasMissingCode
    ? 'Payment status unavailable'
    : isCancelled
      ? 'Payment cancelled'
      : isPending
        ? 'Payment pending'
        : 'Payment failed';
  const subtitle = hasMissingCode
    ? 'The payment provider returned without a transaction code.'
    : isCancelled
      ? 'You cancelled checkout before payment was completed.'
      : isPending
        ? 'The payment provider is still processing this transaction.'
        : 'The payment provider could not complete this payment.';
  const infoMessage = hasMissingCode
    ? 'Your cart has not been cleared. Return to the cart to continue checkout.'
    : isCancelled
      ? 'Your cart is still available so you can retry checkout.'
      : isPending
        ? 'Your cart is still available. You can wait and check your profile later, or retry checkout.'
        : 'No payment was captured by this page. Return to the cart to choose Stripe or PayPal again.';
  const icon = isPending ? (
    <ClockIcon className="w-20 h-20 text-amber-500 mx-auto" />
  ) : hasMissingCode ? (
    <ExclamationTriangleIcon className="w-20 h-20 text-amber-500 mx-auto" />
  ) : (
    <XCircleIcon className="w-20 h-20 text-red-500 mx-auto" />
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center">
            {/* Error Icon */}
            <div className="mb-6">{icon}</div>

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
                  <span className="text-gray-600">Transaction code</span>
                </div>
              </div>
            )}

            {readableProvider && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">
                    {readableProvider}
                  </span>
                  <span className="text-gray-600">Provider</span>
                </div>
              </div>
            )}

            {/* Error Details */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            )}

            {/* Info Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">{infoMessage}</p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link href="/cart" className="block">
                <Button variant="primary" className="w-full">
                  Return to cart
                </Button>
              </Link>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/products')}
              >
                Continue shopping
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
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  );
}
