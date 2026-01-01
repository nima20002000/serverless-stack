'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowRightIcon,
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
import { DIGIPAY_CONFIG } from '@/config/constants';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ZarinpalBadge from '@/components/payment/ZarinpalBadge';
import { optimizeImage } from '@/lib/cloudflare-images-client';
import DigipayBadge from '@/components/payment/DigipayBadge';
import ZibalBadge from '@/components/payment/ZibalBadge';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import DigipayGuidanceModal from '@/components/checkout/DigipayGuidanceModal';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeUnavailableItems = useCartStore(
    (state) => state.removeUnavailableItems
  );
  const total = useCartStore(selectTotal);
  const itemCount = useCartStore(selectItemCount);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'zarinpal' | 'digipay' | 'zibal'
  >('zarinpal');
  const [showDigipayModal, setShowDigipayModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<{
    fullName: string;
    phone: string;
    email: string;
    shippingAddress: string;
    postalCode: string;
    createAccount: boolean;
    phoneVerified: boolean;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Calculate surcharge for Digipay
  const digipaySurcharge =
    paymentMethod === 'digipay'
      ? Math.round(total * (DIGIPAY_CONFIG.SURCHARGE_PERCENT / 100))
      : 0;
  const finalTotal = total + digipaySurcharge;

  useEffect(() => {
    // Only redirect if cart is empty AND session is not loading
    // This prevents redirect during session updates (e.g., after OTP login)
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
      postalCode: string;
      createAccount: boolean;
      phoneVerified: boolean;
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
            paymentMethod:
              paymentMethod === 'digipay'
                ? 'DIGIPAY'
                : paymentMethod === 'zibal'
                  ? 'ZIBAL'
                  : 'ZARINPAL',
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
          // Check if there are unavailable products that should be removed from cart
          if (
            data.unavailableProductIds &&
            data.unavailableProductIds.length > 0
          ) {
            removeUnavailableItems(data.unavailableProductIds);
          }
          throw new Error(data.error || 'خطا در ایجاد تراکنش');
        }

        // Redirect to payment gateway
        window.location.href = data.paymentUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در ایجاد تراکنش');
        setIsProcessing(false);
      }
    },
    [items, paymentMethod, removeUnavailableItems]
  );

  const handleCheckout = useCallback(
    (formData: {
      fullName: string;
      phone: string;
      email: string;
      shippingAddress: string;
      postalCode: string;
      createAccount: boolean;
      phoneVerified: boolean;
    }) => {
      // If digipay is selected, show guidance modal first
      if (paymentMethod === 'digipay') {
        setPendingFormData(formData);
        setShowDigipayModal(true);
        return;
      }

      // For other payment methods, process immediately
      processPayment(formData);
    },
    [paymentMethod, processPayment]
  );

  const handleDigipayConfirm = useCallback(() => {
    if (pendingFormData) {
      processPayment(pendingFormData);
    }
  }, [pendingFormData, processPayment]);

  const handleDigipayModalClose = useCallback(() => {
    setShowDigipayModal(false);
    setPendingFormData(null);
  }, []);

  const handleRemoveItem = useCallback(
    (item: CartItem) => {
      removeItem(item.productId, item.variantId);
      toast.info(`${item.name} از سبد خرید حذف شد`);
    },
    [removeItem]
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Minimal Checkout Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/cart"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowRightIcon className="w-4 h-4" />
              <span className="text-sm">بازگشت به سبد خرید</span>
            </Link>
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-l from-rose-600 to-pink-500 bg-clip-text text-transparent">
                کیتیا
              </span>
            </Link>
            <div className="flex items-center gap-1.5 text-slate-500">
              <LockClosedIcon className="w-4 h-4" />
              <span className="text-xs">پرداخت امن</span>
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
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                روش پرداخت
              </h2>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'zarinpal'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="zarinpal"
                    checked={paymentMethod === 'zarinpal'}
                    onChange={() => setPaymentMethod('zarinpal')}
                    className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 text-sm">
                      زرین‌پال
                    </div>
                    <div className="text-xs text-slate-500">
                      پرداخت با کارت بانکی
                    </div>
                  </div>
                  <ZarinpalBadge />
                </label>

                <label
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'zibal'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="zibal"
                    checked={paymentMethod === 'zibal'}
                    onChange={() => setPaymentMethod('zibal')}
                    className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 text-sm">
                      زیبال
                    </div>
                    <div className="text-xs text-slate-500">
                      پرداخت با کارت بانکی
                    </div>
                  </div>
                  <ZibalBadge />
                </label>

                <label
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'digipay'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="digipay"
                    checked={paymentMethod === 'digipay'}
                    onChange={() => setPaymentMethod('digipay')}
                    className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 text-sm">
                      دیجی‌پی
                    </div>
                    <div className="text-xs text-slate-500">
                      پرداخت اقساطی (+{DIGIPAY_CONFIG.SURCHARGE_PERCENT}٪
                      کارمزد)
                    </div>
                  </div>
                  <DigipayBadge />
                </label>
              </div>

              {/* Digipay Installment Info */}
              {paymentMethod === 'digipay' && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-emerald-800">
                      ۴ قسط بدون بهره
                    </span>
                  </div>
                  <div className="text-xs text-emerald-700 space-y-1">
                    <div className="flex justify-between">
                      <span>پیش‌پرداخت امروز:</span>
                      <span className="font-medium">
                        {formatPrice(Math.round(finalTotal / 4))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>۳ قسط ماهانه:</span>
                      <span className="font-medium">
                        هر کدام {formatPrice(Math.round(finalTotal / 4))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                اطلاعات ارسال
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
                {paymentMethod === 'digipay'
                  ? `پرداخت ${formatPrice(Math.round(finalTotal / 4))}`
                  : `پرداخت ${formatPrice(finalTotal)}`}
              </Button>
              <div className="flex items-center justify-center gap-2 mt-3 text-slate-500">
                <ShieldCheckIcon className="w-4 h-4" />
                <span className="text-xs">پرداخت امن و رمزگذاری شده</span>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 lg:sticky lg:top-8">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                خلاصه سفارش
              </h2>

              {/* Items */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || 'no-variant'}`}
                    className="flex gap-3 group"
                  >
                    <div className="relative flex-shrink-0 w-14 h-14 bg-slate-100 rounded-lg overflow-hidden">
                      {item.image ? (
                        <Image
                          src={optimizeImage.cartItem(item.image)}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="text-[10px]">بدون تصویر</span>
                        </div>
                      )}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-600 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 truncate">
                        {item.name}
                      </h3>
                      {item.variantName && (
                        <p className="text-xs text-slate-500 truncate">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-sm text-slate-900 mt-0.5">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                      aria-label={`حذف ${item.name}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 my-4" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>{itemCount} کالا</span>
                  <span>{formatPrice(total)}</span>
                </div>

                {paymentMethod === 'digipay' && digipaySurcharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>کارمزد دیجی‌پی</span>
                    <span>+ {formatPrice(digipaySurcharge)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>هزینه ارسال</span>
                  <span className="text-emerald-600">رایگان</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 my-4" />

              {/* Final Total */}
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-900">
                  {paymentMethod === 'digipay' ? 'پرداخت امروز' : 'مبلغ نهایی'}
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {paymentMethod === 'digipay'
                    ? formatPrice(Math.round(finalTotal / 4))
                    : formatPrice(finalTotal)}
                </span>
              </div>

              {paymentMethod === 'digipay' && (
                <p className="text-xs text-slate-500 mt-1 text-left">
                  مجموع: {formatPrice(finalTotal)}
                </p>
              )}

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
                  {paymentMethod === 'digipay'
                    ? `پرداخت ${formatPrice(Math.round(finalTotal / 4))}`
                    : `پرداخت ${formatPrice(finalTotal)}`}
                </Button>
                <div className="flex items-center justify-center gap-2 mt-3 text-slate-500">
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span className="text-xs">پرداخت امن و رمزگذاری شده</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Digipay Guidance Modal */}
      <DigipayGuidanceModal
        isOpen={showDigipayModal}
        onClose={handleDigipayModalClose}
        onConfirm={handleDigipayConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}
