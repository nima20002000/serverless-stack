'use client';

import { useMemo, useCallback } from 'react';
import { formatDateTime, formatPrice } from '@/lib/utils/format';

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
      COMPLETED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    const labels = {
      COMPLETED: 'موفق',
      PENDING: 'در انتظار',
      FAILED: 'ناموفق',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  }, []);

  const getPaymentMethodBadge = useCallback((method: string) => {
    const labels = {
      STRIPE: 'استرایپ',
      PAYPAL: 'پی‌پال',
    };
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
        {labels[method as keyof typeof labels] || 'UNKNOWN'}
      </span>
    );
  }, []);

  const renderedTransactions = useMemo(() => {
    if (isLoading) {
      return (
        <div className="text-center py-8 text-gray-600">در حال بارگذاری...</div>
      );
    }

    if (transactions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-600">
          هنوز تراکنشی ثبت نشده است
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  کد تراکنش: {transaction.transactionCode}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatDateTime(transaction.createdAt)}
                </div>
                <div className="mt-2">
                  {getPaymentMethodBadge(transaction.paymentMethod)}
                </div>
                {transaction.paymentProviderRef && (
                  <div className="mt-2 text-xs text-gray-600" dir="ltr">
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

            <div className="border-t border-gray-100 pt-3 mt-3">
              <div className="text-sm text-gray-600 mb-2">محصولات:</div>
              <div className="space-y-2">
                {transaction.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-700">
                        {item.product.name} × {item.quantity}
                      </span>
                      {item.variant && (
                        <span className="text-xs text-blue-600 mt-0.5">
                          {item.variant.name}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">
                      {formatPrice(Number(item.price))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-center">
              <span className="text-gray-700 font-medium">مبلغ کل:</span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(Number(transaction.amount))}
              </span>
            </div>

            {transaction.invoice && (
              <div className="mt-3 text-sm text-gray-600">
                شماره فاکتور: {transaction.invoice.invoiceNumber}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [transactions, isLoading, getStatusBadge, getPaymentMethodBadge]);

  return renderedTransactions;
}
