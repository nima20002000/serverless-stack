'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  TrashIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import {
  useCartStore,
  formatPrice,
  selectTotal,
  selectItemCount,
  type CartItem,
} from '@/store/cart-store';
import { toast } from '@/store/toast-store';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { optimizeImage } from '@/lib/cloudflare-images-client';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import PromoCodeInput from '@/components/checkout/PromoCodeInput';
import { useCheckoutStore } from '@/store/checkout-store';
import { useTextDirection } from '@/components/providers/I18nProvider';
import { getPreviousChevronClass } from '@/lib/i18n/direction';

export default function CheckoutPage() {
  const direction = useTextDirection();
  const router = useRouter();
  const { data: session, status } = useSession();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeUnavailableItems = useCartStore(
    (state) => state.removeUnavailableItems
  );
  const total = useCartStore(selectTotal);
  const itemCount = useCartStore(selectItemCount);
  const { promoCode: appliedPromo } = useCheckoutStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'PAYPAL'>(
    'STRIPE'
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Calculate discount
  const discountAmount = appliedPromo?.discountAmount || 0;
  const subtotal = total; // Items total before discount
  const finalTotal = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    // Only redirect if cart is empty AND session is not loading
    if (status !== 'loading' && items.length === 0) {
      router.push('/cart');
    }
  }, [items.length, router, status]);

  const processPayment = useCallback(
    async (formData: {
      fullName: string;
      phone: string;
      email: string;
      shippingAddress: string;
      shippingCountry: string;
      shippingRegion: string;
      shippingCity: string;
      shippingAddressLine1: string;
      shippingAddressLine2: string;
      postalCode: string;
    }) => {
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
              variantId: item.variantId,
              quantity: item.quantity,
            })),
            paymentMethod,
            shippingInfo: {
              fullName: formData.fullName,
              phone: formData.phone,
              email: formData.email || undefined,
              shippingAddress: formData.shippingAddress,
              shippingCountry: formData.shippingCountry,
              shippingRegion: formData.shippingRegion,
              shippingCity: formData.shippingCity,
              shippingAddressLine1: formData.shippingAddressLine1,
              shippingAddressLine2: formData.shippingAddressLine2,
              postalCode: formData.postalCode || undefined,
            },
            // Include promo code if applied
            promoCode: appliedPromo?.code,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Check if there are unavailable products that should be removed from cart
          if (
            data.unavailableProductIds &&
            data.unavailableProductIds.length > 0
          ) {
            removeUnavailableItems(data.unavailableProductIds);
          }
          throw new Error(data.error || 'Unable to start checkout.');
        }

        // Redirect to payment gateway
        window.location.href = data.paymentUrl;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Unable to start checkout.'
        );
        setIsProcessing(false);
      }
    },
    [items, paymentMethod, removeUnavailableItems, appliedPromo]
  );

  const handleCheckout = useCallback(
    (formData: {
      fullName: string;
      phone: string;
      email: string;
      shippingAddress: string;
      shippingCountry: string;
      shippingRegion: string;
      shippingCity: string;
      shippingAddressLine1: string;
      shippingAddressLine2: string;
      postalCode: string;
    }) => {
      processPayment(formData);
    },
    [processPayment]
  );

  const handleRemoveItem = useCallback(
    (item: CartItem) => {
      removeItem(item.productId, item.variantId);
      toast.info(`${item.name} removed from cart.`);
    },
    [removeItem]
  );

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-300" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Minimal Checkout Header */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/cart"
              className="flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeftIcon
                className={`h-4 w-4 ${getPreviousChevronClass(direction)}`}
              />
              <span className="text-sm">Back to cart</span>
            </Link>
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-slate-950 dark:text-white">
                Commerce Starter
              </span>
            </Link>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <LockClosedIcon className="w-4 h-4" />
              <span className="text-xs">Secure checkout</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <Alert type="error" className="mb-6" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Form and Payment Methods */}
          <div className="lg:col-span-7 space-y-6">
            {/* Payment Method Selection */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
                Payment method
              </h2>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'STRIPE'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 dark:border-slate-200 dark:bg-slate-800 dark:ring-slate-200'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="STRIPE"
                    checked={paymentMethod === 'STRIPE'}
                    onChange={() => setPaymentMethod('STRIPE')}
                    className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      Stripe
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Pay by card through Stripe Checkout.
                    </div>
                  </div>
                  <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                    Card
                  </span>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'PAYPAL'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 dark:border-slate-200 dark:bg-slate-800 dark:ring-slate-200'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PAYPAL"
                    checked={paymentMethod === 'PAYPAL'}
                    onChange={() => setPaymentMethod('PAYPAL')}
                    className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      PayPal
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Pay with a PayPal account or supported wallet.
                    </div>
                  </div>
                  <span className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                    Wallet
                  </span>
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Payment details are collected by your selected provider. This
                store never receives raw card or PayPal credentials.
              </p>
            </div>

            {/* Shipping Form */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
                Shipping information
              </h2>
              <CheckoutForm
                session={session}
                onSubmit={handleCheckout}
                isProcessing={isProcessing}
                hideSubmitButton
                formRef={formRef}
                compact
              />
            </div>

            {/* Submit Button - Mobile */}
            <div className="lg:hidden">
              <Button
                type="button"
                variant="primary"
                className="w-full py-3"
                isLoading={isProcessing}
                disabled={isProcessing}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {`Pay ${formatPrice(finalTotal)}`}
              </Button>
              <div className="mt-3 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                <ShieldCheckIcon className="w-4 h-4" />
                <span className="text-xs">Encrypted provider checkout</span>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-8 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
                Order summary
              </h2>

              {/* Items */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || 'no-variant'}`}
                    className="flex gap-3 group"
                  >
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      {item.image ? (
                        <Image
                          src={optimizeImage.cartItem(item.image)}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <span className="text-[10px]">No image</span>
                        </div>
                      )}
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-[10px] font-medium text-white dark:bg-slate-300 dark:text-slate-950">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {item.name}
                      </h3>
                      {item.variantName && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {item.variantName}
                        </p>
                      )}
                      <p className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item)}
                      className="p-1 text-slate-400 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 dark:text-slate-500 dark:hover:text-rose-300"
                      aria-label={`Remove ${item.name}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-slate-200 dark:border-slate-800" />

              {/* Promo Code Input */}
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Promo code
                </h3>
                <PromoCodeInput subtotal={subtotal} />
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-slate-200 dark:border-slate-800" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {appliedPromo && discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-300">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>- {formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Shipping</span>
                  <span>Calculated later</span>
                </div>
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-slate-200 dark:border-slate-800" />

              {/* Final Total */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Total
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatPrice(finalTotal)}
                </span>
              </div>

              {/* Submit Button - Desktop */}
              <div className="hidden lg:block mt-6">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full py-3"
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  {`Pay ${formatPrice(finalTotal)}`}
                </Button>
                <div className="mt-3 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span className="text-xs">Encrypted provider checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
