'use client';

import { useMemo, useCallback } from 'react';
import { formatDateTime, formatPrice } from '@/lib/utils/format';
import { formatShippingAddress } from '@/lib/shipping-address';

interface Transaction {
  id: string;
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentMethod: 'STRIPE' | 'PAYPAL';
  paymentProviderRef?: string | null;
  stripePaymentIntentId?: string | null;
  paypalOrderId?: string | null;
  isGuest: boolean;
  transactionCode: string;
  createdAt: string;
  shippingAddress?: string | null;
  shippingCountry?: string | null;
  shippingRegion?: string | null;
  shippingCity?: string | null;
  shippingAddressLine1?: string | null;
  shippingAddressLine2?: string | null;
  postalCode?: string | null;
  items: {
    id: string;
    quantity: number;
    price: string;
    product: {
      id: string;
      name: string;
      price: string;
      media: Array<{
        url: string;
        alt: string | null;
      }>;
    };
    variant: {
      id: string;
      name: string;
      color: string | null;
      size: string | null;
      material: string | null;
    } | null;
  }[];
  invoice: {
    invoiceNumber: string;
    generatedAt: string;
    pdfUrl: string | null;
  } | null;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export default function TransactionHistory({
  transactions,
  isLoading,
}: TransactionHistoryProps) {
  const getStatusBadge = useCallback((status: string) => {
    const colors = {
      COMPLETED:
        'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200',
      PENDING:
        'bg-yellow-100 text-yellow-800 dark:bg-amber-900/40 dark:text-amber-200',
      FAILED: 'bg-red-100 text-red-800 dark:bg-rose-900/40 dark:text-rose-200',
    };
    const labels = {
      COMPLETED: 'Completed',
      PENDING: 'Pending',
      FAILED: 'Failed',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  }, []);

  const getPaymentMethodBadge = useCallback((method: string) => {
    const labels = {
      STRIPE: 'Stripe',
      PAYPAL: 'PayPal',
    };
    return (
      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {labels[method as keyof typeof labels] || 'Unknown provider'}
      </span>
    );
  }, []);

  const renderedTransactions = useMemo(() => {
    if (isLoading) {
      return (
        <div className="py-8 text-center text-gray-600 dark:text-slate-400">
          Loading...
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <div className="py-8 text-center text-gray-600 dark:text-slate-400">
          No transactions yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {transactions.map((transaction) => {
          const formattedShippingAddress =
            formatShippingAddress(transaction) || transaction.shippingAddress;

          return (
            <div
              key={transaction.id}
              className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md dark:border-slate-800 dark:hover:shadow-none"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-slate-100">
                    Transaction code: {transaction.transactionCode}
                  </div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                    {formatDateTime(transaction.createdAt)}
                  </div>
                  <div className="mt-2">
                    {getPaymentMethodBadge(transaction.paymentMethod)}
                  </div>
                  {transaction.paymentProviderRef && (
                    <div
                      className="mt-2 text-xs text-gray-600 dark:text-slate-400"
                      dir="ltr"
                    >
                      Ref: {transaction.paymentProviderRef}
                    </div>
                  )}
                  {transaction.stripePaymentIntentId && (
                    <div
                      className="mt-1 text-xs text-indigo-600 break-all"
                      dir="ltr"
                    >
                      Stripe Intent: {transaction.stripePaymentIntentId}
                    </div>
                  )}
                  {transaction.paypalOrderId && (
                    <div
                      className="mt-1 text-xs text-sky-600 break-all"
                      dir="ltr"
                    >
                      PayPal Order: {transaction.paypalOrderId}
                    </div>
                  )}
                </div>
                {getStatusBadge(transaction.status)}
              </div>

              {formattedShippingAddress && (
                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-slate-800">
                  <div className="mb-1 text-sm text-gray-600 dark:text-slate-400">
                    Shipping address:
                  </div>
                  <div className="whitespace-pre-line text-sm text-gray-700 dark:text-slate-300">
                    {formattedShippingAddress}
                  </div>
                </div>
              )}

              <div className="mt-3 border-t border-gray-100 pt-3 dark:border-slate-800">
                <div className="mb-2 text-sm text-gray-600 dark:text-slate-400">
                  Products:
                </div>
                <div className="space-y-2">
                  {transaction.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-700 dark:text-slate-300">
                          {item.product.name} x {item.quantity}
                        </span>
                        {item.variant && (
                          <span className="mt-0.5 text-xs text-blue-600 dark:text-blue-300">
                            {item.variant.name}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {formatPrice(Number(item.price))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-800">
                <span className="font-medium text-gray-700 dark:text-slate-300">
                  Total:
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPrice(Number(transaction.amount))}
                </span>
              </div>

              {transaction.invoice && (
                <div className="mt-3 text-sm text-gray-600 dark:text-slate-400">
                  Invoice number: {transaction.invoice.invoiceNumber}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [transactions, isLoading, getStatusBadge, getPaymentMethodBadge]);

  return renderedTransactions;
}
