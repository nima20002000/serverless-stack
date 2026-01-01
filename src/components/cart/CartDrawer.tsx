'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useCartStore, formatPrice, selectTotal } from '@/store/cart-store';
import CartItem from './CartItem';
import ButtonV4 from '@/components/ui-v4/Button';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, updateQuantity, removeItem } = useCartStore();
  const total = useCartStore(selectTotal);
  const [error, setError] = useState('');

  const handleUpdateQuantity = (
    productId: string,
    quantity: number,
    variantId?: string
  ) => {
    try {
      setError('');
      updateQuantity(productId, quantity, variantId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'خطا در به‌روزرسانی سبد خرید'
      );
    }
  };

  const handleRemove = (productId: string, variantId?: string) => {
    setError('');
    removeItem(productId, variantId);
  };

  const handleCheckout = () => {
    onClose();
    router.push('/cart');
  };

  const handleContinueShopping = () => {
    onClose();
    router.push('/products');
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-rose-900/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pr-10">
              {/* Drawer Panel */}
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-[0_0_50px_-20px_rgba(244,63,94,0.3)] rounded-l-3xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-5 border-b border-rose-100">
                      <button
                        type="button"
                        className="rounded-xl p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        onClick={onClose}
                      >
                        <span className="sr-only">بستن</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                      <Dialog.Title className="text-lg font-bold text-rose-900">
                        سبد خرید
                      </Dialog.Title>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                        <p className="text-sm text-rose-600 text-right">
                          {error}
                        </p>
                      </div>
                    )}

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto px-4 py-6">
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="text-rose-300 mb-4">
                            <svg
                              className="w-24 h-24 mx-auto"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                              />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-rose-900 mb-2">
                            سبد خرید خالی است
                          </h3>
                          <p className="text-sm text-rose-500 mb-6">
                            محصولی به سبد خرید اضافه نشده است
                          </p>
                          <ButtonV4
                            variant="primary"
                            onClick={handleContinueShopping}
                          >
                            مشاهده محصولات
                          </ButtonV4>
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {items.map((item) => (
                            <CartItem
                              key={`${item.productId}-${item.variantId || 'no-variant'}`}
                              item={item}
                              onUpdateQuantity={handleUpdateQuantity}
                              onRemove={handleRemove}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer - Cart Summary */}
                    {items.length > 0 && (
                      <div className="border-t border-rose-100 px-5 py-6 space-y-4 bg-gradient-to-t from-rose-50/50 to-white">
                        {/* Total */}
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span className="text-rose-600" dir="rtl">
                            {formatPrice(total)}
                          </span>
                          <span className="text-rose-900">جمع کل</span>
                        </div>

                        {/* Buttons */}
                        <div className="space-y-3">
                          <ButtonV4
                            variant="primary"
                            fullWidth
                            onClick={handleCheckout}
                          >
                            ادامه فرآیند خرید
                          </ButtonV4>
                          <ButtonV4
                            variant="secondary"
                            fullWidth
                            onClick={handleContinueShopping}
                          >
                            ادامه خرید
                          </ButtonV4>
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
