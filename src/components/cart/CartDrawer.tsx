'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useCartStore, formatPrice, selectTotal } from '@/store/cart-store';
import CartItem from './CartItem';
import Button from '@/components/ui/Button';
import {
  useTextDirection,
  useTranslations,
} from '@/components/providers/I18nProvider';
import { getCartDrawerDirectionClasses } from '@/lib/i18n/direction';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const t = useTranslations();
  const direction = useTextDirection();
  const drawerClasses = getCartDrawerDirectionClasses(direction);
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
      setError(err instanceof Error ? err.message : t('cart.couldNotUpdate'));
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
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={`pointer-events-none fixed inset-y-0 flex max-w-full ${drawerClasses.container}`}
            >
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom={drawerClasses.enterFrom}
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo={drawerClasses.leaveTo}
              >
                <Dialog.Panel
                  className="pointer-events-auto w-screen max-w-md"
                  data-testid="cart-drawer-panel"
                  data-direction={direction}
                >
                  <div className="flex h-full flex-col bg-white shadow-xl dark:bg-slate-950">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800">
                      <Dialog.Title className="text-lg font-bold text-slate-950 dark:text-white">
                        {t('cart.title')}
                      </Dialog.Title>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        onClick={onClose}
                      >
                        <span className="sr-only">{t('cart.closeCart')}</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>

                    {error && (
                      <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-rose-800 dark:bg-rose-900/30">
                        <p className="text-sm text-red-700 dark:text-rose-200">
                          {error}
                        </p>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 py-6">
                      {items.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <h3 className="mb-2 text-lg font-bold text-slate-950 dark:text-white">
                            {t('cart.emptyTitle')}
                          </h3>
                          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                            {t('cart.drawerEmptyDescription')}
                          </p>
                          <Button
                            variant="primary"
                            onClick={handleContinueShopping}
                          >
                            {t('cart.browseProducts')}
                          </Button>
                        </div>
                      ) : (
                        <div>
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

                    {items.length > 0 && (
                      <div className="space-y-4 border-t border-slate-200 bg-slate-50 px-5 py-6 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span className="text-slate-950 dark:text-white">
                            {t('cart.total')}
                          </span>
                          <span className="text-slate-950 dark:text-white">
                            {formatPrice(total)}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <Button
                            variant="primary"
                            fullWidth
                            onClick={handleCheckout}
                          >
                            {t('cart.viewCart')}
                          </Button>
                          <Button
                            variant="secondary"
                            fullWidth
                            onClick={handleContinueShopping}
                          >
                            {t('cart.continueShopping')}
                          </Button>
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
