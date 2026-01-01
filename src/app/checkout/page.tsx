'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import {
  useCartStore,
  formatPrice,
  selectTotal,
  selectItemCount,
} from '@/store/cart-store';
import { DIGIPAY_CONFIG } from '@/config/constants';
import Image from 'next/image';
import Card from '@/components/ui/Card';
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

        // Redirect to Zarinpal payment page
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-slate-500">در حال بارگذاری...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/cart"
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowRightIcon className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 text-right">
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
          {/* Order Summary, Shipping Form, and Payment Method (mobile) */}
          <div className="lg:col-span-2">
            {/* Order Summary */}
            <Card>
              <h2 className="text-lg font-bold text-slate-900 text-right mb-4 border-b border-slate-100 pb-3">
                اطلاعات سفارش
              </h2>

              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || 'no-variant'}`}
                    className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-slate-50 rounded-xl overflow-hidden">
                      {item.image ? (
                        <Image
                          src={optimizeImage.cartItem(item.image)}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="text-xs">بدون تصویر</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="font-medium text-slate-900">
                        {item.name}
                      </h3>
                      {item.variantName && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-sm text-slate-600">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-left font-bold text-slate-900">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Payment Method Selection - shown here for mobile, after order summary */}
            <Card className="mt-6 lg:hidden">
              <h2 className="text-lg font-bold text-slate-900 text-right mb-4 border-b border-slate-100 pb-3">
                روش پرداخت
              </h2>
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    paymentMethod === 'zarinpal'
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="zarinpal"
                    checked={paymentMethod === 'zarinpal'}
                    onChange={() => setPaymentMethod('zarinpal')}
                    className="w-4 h-4 text-slate-700 border-slate-300 focus:ring-slate-400"
                  />
                  <div className="flex-1 text-right">
                    <div className="font-medium text-slate-900">زرین‌پال</div>
                    <div className="text-sm text-slate-600">
                      پرداخت امن با کلیه کارت‌های بانکی
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <ZarinpalBadge />
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    paymentMethod === 'zibal'
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="zibal"
                    checked={paymentMethod === 'zibal'}
                    onChange={() => setPaymentMethod('zibal')}
                    className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                  />
                  <div className="flex-1 text-right">
                    <div className="font-medium text-slate-900">زیبال</div>
                    <div className="text-sm text-slate-600">
                      پرداخت امن با کلیه کارت‌های بانکی
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <ZibalBadge />
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    paymentMethod === 'digipay'
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="digipay"
                    checked={paymentMethod === 'digipay'}
                    onChange={() => setPaymentMethod('digipay')}
                    className="w-4 h-4 text-slate-700 border-slate-300 focus:ring-slate-400"
                  />
                  <div className="flex-1 text-right">
                    <div className="font-medium text-slate-900">دیجی پی</div>
                    <div className="text-sm text-slate-600">پرداخت اقساطی</div>
                    <div className="text-xs text-slate-500 mt-1">
                      + {DIGIPAY_CONFIG.SURCHARGE_PERCENT}٪ کارمزد درگاه
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <DigipayBadge />
                  </div>
                </label>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mt-4">
                  <p className="text-xs text-slate-700 text-right">
                    {paymentMethod === 'digipay'
                      ? 'پس از تکمیل فرم و کلیک بر روی دکمه پرداخت، به درگاه پرداخت دیجی‌پی هدایت می‌شوید'
                      : paymentMethod === 'zibal'
                        ? 'پس از تکمیل فرم و کلیک بر روی دکمه پرداخت، به درگاه پرداخت زیبال هدایت می‌شوید'
                        : 'پس از تکمیل فرم و کلیک بر روی دکمه پرداخت، به درگاه پرداخت زرین‌پال هدایت می‌شوید'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Shipping Information Form */}
            <CheckoutForm
              session={session}
              onSubmit={handleCheckout}
              isProcessing={isProcessing}
              hideSubmitButton
              formRef={formRef}
            />
          </div>

          {/* Payment Method (desktop) and Payment Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Payment Method Selection - shown here for desktop only */}
              <Card className="hidden lg:block">
                <h2 className="text-lg font-bold text-slate-900 text-right mb-4 border-b border-slate-100 pb-3">
                  روش پرداخت
                </h2>
                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                      paymentMethod === 'zarinpal'
                        ? 'border-slate-400 bg-slate-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethodDesktop"
                      value="zarinpal"
                      checked={paymentMethod === 'zarinpal'}
                      onChange={() => setPaymentMethod('zarinpal')}
                      className="w-4 h-4 text-slate-700 border-slate-300 focus:ring-slate-400"
                    />
                    <div className="flex-1 text-right">
                      <div className="font-medium text-slate-900">زرین‌پال</div>
                      <div className="text-sm text-slate-600">
                        پرداخت امن با کلیه کارت‌های بانکی
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <ZarinpalBadge />
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                      paymentMethod === 'zibal'
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethodDesktop"
                      value="zibal"
                      checked={paymentMethod === 'zibal'}
                      onChange={() => setPaymentMethod('zibal')}
                      className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <div className="flex-1 text-right">
                      <div className="font-medium text-slate-900">زیبال</div>
                      <div className="text-sm text-slate-600">
                        پرداخت امن با کلیه کارت‌های بانکی
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <ZibalBadge />
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                      paymentMethod === 'digipay'
                        ? 'border-slate-400 bg-slate-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethodDesktop"
                      value="digipay"
                      checked={paymentMethod === 'digipay'}
                      onChange={() => setPaymentMethod('digipay')}
                      className="w-4 h-4 text-slate-700 border-slate-300 focus:ring-slate-400"
                    />
                    <div className="flex-1 text-right">
                      <div className="font-medium text-slate-900">دیجی پی</div>
                      <div className="text-sm text-slate-600">پرداخت اقساطی</div>
                      <div className="text-xs text-slate-500 mt-1">
                        + {DIGIPAY_CONFIG.SURCHARGE_PERCENT}٪ کارمزد درگاه
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <DigipayBadge />
                    </div>
                  </label>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mt-4">
                    <p className="text-xs text-slate-700 text-right">
                      {paymentMethod === 'digipay'
                        ? 'پس از تکمیل فرم و کلیک بر روی دکمه پرداخت، به درگاه پرداخت دیجی‌پی هدایت می‌شوید'
                        : paymentMethod === 'zibal'
                          ? 'پس از تکمیل فرم و کلیک بر روی دکمه پرداخت، به درگاه پرداخت زیبال هدایت می‌شوید'
                          : 'پس از تکمیل فرم و کلیک بر روی دکمه پرداخت، به درگاه پرداخت زرین‌پال هدایت می‌شوید'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Payment Information */}
              <Card>
                <h2 className="text-lg font-bold text-slate-900 text-right mb-4 border-b border-slate-100 pb-3">
                  اطلاعات پرداخت
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-900">{itemCount}</span>
                    <span className="text-slate-600">تعداد کالاها</span>
                  </div>

                  <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                    <span className="text-slate-900" dir="rtl">
                      {formatPrice(total)}
                    </span>
                    <span className="text-slate-600">قیمت کالاها</span>
                  </div>

                  {/* Digipay Surcharge - Only show when Digipay is selected */}
                  {paymentMethod === 'digipay' && digipaySurcharge > 0 && (
                    <div className="flex justify-between text-sm text-slate-700 bg-slate-50 rounded-2xl px-3 py-2 -mx-1">
                      <span dir="rtl">+ {formatPrice(digipaySurcharge)}</span>
                      <span>
                        کارمزد درگاه دیجی‌پی ({DIGIPAY_CONFIG.SURCHARGE_PERCENT}
                        ٪)
                      </span>
                    </div>
                  )}

                  {/* Show different total based on payment method */}
                  {paymentMethod === 'digipay' ? (
                    <>
                      <div className="flex justify-between text-sm border-t border-slate-100 pt-3 text-slate-500">
                        <span dir="rtl">{formatPrice(finalTotal)}</span>
                        <span>مجموع کل</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold bg-emerald-50 rounded-2xl px-3 py-3 -mx-1 border border-emerald-200">
                        <span className="text-emerald-700" dir="rtl">
                          {formatPrice(Math.round(finalTotal / 4))}
                        </span>
                        <span className="text-emerald-700">پرداخت امروز</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-lg font-bold border-t border-slate-100 pt-3">
                      <span className="text-slate-900" dir="rtl">
                        {formatPrice(finalTotal)}
                      </span>
                      <span className="text-slate-900">مبلغ قابل پرداخت</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Digipay Installment Details - shown below payment info for both mobile and desktop */}
              {paymentMethod === 'digipay' && (
                <Card className="bg-white border-slate-200">
                  <div className="text-sm text-slate-800 font-bold mb-4 text-right border-b border-slate-200 pb-3">
                    جزئیات اقساط
                  </div>
                  <div className="space-y-3">
                    <div className="bg-emerald-100 border border-emerald-300 rounded-2xl p-3">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-sm font-medium text-emerald-800">
                          پرداخت امروز (پیش‌پرداخت)
                        </span>
                        <span className="font-bold text-emerald-900 text-base whitespace-nowrap">
                          {formatPrice(Math.round(finalTotal / 4))}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-2 text-right">
                        با پرداخت این مبلغ، سفارش شما ثبت و ارسال می‌شود
                      </p>
                    </div>
                    <div className="flex justify-between items-center gap-4 px-1">
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        ۳ قسط ماهانه
                      </span>
                      <span className="font-bold text-slate-900 text-base whitespace-nowrap">
                        هر قسط {formatPrice(Math.round(finalTotal / 4))}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 text-right bg-slate-50 rounded-2xl p-2">
                      اقساط بعدی به صورت خودکار از حساب دیجی‌پی شما کسر می‌شود
                    </p>
                  </div>
                </Card>
              )}

              {/* Submit Button - visible on desktop only */}
              <Button
                type="button"
                variant="primary"
                className="w-full hidden lg:block"
                isLoading={isProcessing}
                disabled={isProcessing}
                onClick={() => formRef.current?.requestSubmit()}
              >
                پرداخت
              </Button>

              {/* Mobile Submit Button - visible on mobile only */}
              <Button
                type="button"
                variant="primary"
                className="w-full lg:hidden"
                isLoading={isProcessing}
                disabled={isProcessing}
                onClick={() => formRef.current?.requestSubmit()}
              >
                پرداخت
              </Button>
            </div>
          </div>
        </div>
      </div>

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
