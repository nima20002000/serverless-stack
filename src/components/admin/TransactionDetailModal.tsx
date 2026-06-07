'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatDateTime, formatNumber, formatPrice } from '@/lib/utils/format';
import { formatShippingAddress } from '@/lib/shipping-address';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface Transaction {
  id: string;
  transactionCode: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentMethod: 'STRIPE' | 'PAYPAL';
  isGuest: boolean;
  createdAt: string;
  paymentProviderRef?: string | null;
  stripePaymentIntentId?: string | null;
  paypalOrderId?: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  shippingAddress: string;
  shippingCountry: string | null;
  shippingRegion: string | null;
  shippingCity: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  postalCode: string | null;
  createAccount: boolean;
  user: {
    id: string;
    uid: string;
    name: string;
    email: string | null;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
    };
    variant: {
      id: string;
      name: string;
      color: string | null;
      size: string | null;
      material: string | null;
    } | null;
  }>;
  invoice: {
    id: string;
    invoiceNumber: string;
    generatedAt: string;
  } | null;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const getPaymentProviderLabel = (method: Transaction['paymentMethod']) =>
  method === 'PAYPAL' ? 'PayPal' : 'Stripe';

export default function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
}: TransactionDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!transaction) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-emerald-300" />
        );
      case 'FAILED':
        return (
          <XCircleIcon className="w-6 h-6 text-red-600 dark:text-rose-300" />
        );
      case 'PENDING':
        return (
          <ClockIcon className="w-6 h-6 text-yellow-600 dark:text-amber-300" />
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
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
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: Transaction['paymentMethod']) =>
    getPaymentProviderLabel(method);

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(
        () => setCopiedField((current) => (current === field ? null : current)),
        1800
      );
    } catch {
      setCopiedField(null);
    }
  };

  const totalItems = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const formattedShippingAddress =
    formatShippingAddress(transaction) || transaction.shippingAddress;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction details"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Transaction Status Header */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-900/60 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(transaction.status)}
            <div>
              <div className="text-sm text-gray-600 dark:text-slate-400">
                Transaction status
              </div>
              <div className="mt-1">{getStatusBadge(transaction.status)}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Transaction code
            </div>
            <code className="text-lg font-bold bg-white dark:bg-slate-800 px-3 py-1 rounded mt-1 inline-block">
              {transaction.transactionCode}
            </code>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5" />
              Payment
            </h3>
            <div className="space-y-3 bg-gray-50 dark:bg-slate-900/60 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Amount:
                </span>
                <span className="font-bold text-lg">
                  {formatPrice(Number(transaction.amount))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Provider:
                </span>
                <span className="font-medium">
                  {getPaymentMethodLabel(transaction.paymentMethod)}
                </span>
              </div>
              {transaction.paymentProviderRef && (
                <div className="space-y-2">
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Provider reference:
                  </span>
                  <code
                    className="block text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded break-all text-left"
                    dir="ltr"
                  >
                    {transaction.paymentProviderRef}
                  </code>
                </div>
              )}
              {transaction.stripePaymentIntentId && (
                <div className="space-y-2">
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Stripe Intent:
                  </span>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded break-all text-left"
                      dir="ltr"
                    >
                      {transaction.stripePaymentIntentId}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          transaction.stripePaymentIntentId as string,
                          'stripe-intent'
                        )
                      }
                      className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      Copy
                    </button>
                  </div>
                  {copiedField === 'stripe-intent' && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-300">
                      Stripe ID copied.
                    </span>
                  )}
                </div>
              )}
              {transaction.paypalOrderId && (
                <div className="space-y-2">
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    PayPal Order:
                  </span>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded break-all text-left"
                      dir="ltr"
                    >
                      {transaction.paypalOrderId}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          transaction.paypalOrderId as string,
                          'paypal-order'
                        )
                      }
                      className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      Copy
                    </button>
                  </div>
                  {copiedField === 'paypal-order' && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-300">
                      PayPal ID copied.
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Created:
                </span>
                <span className="text-sm flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {transaction.createdAt ? (
                    formatDateTime(transaction.createdAt)
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500">
                      Unknown
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Customer
            </h3>
            <div className="space-y-3 bg-gray-50 dark:bg-slate-900/60 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <UserIcon className="w-4 h-4 mt-1 text-gray-500 dark:text-slate-400" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Name:
                  </div>
                  <div className="font-medium flex items-center gap-2">
                    {transaction.user
                      ? transaction.user.name
                      : transaction.fullName}
                    {transaction.isGuest && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded">
                        Guest
                      </span>
                    )}
                  </div>
                  {transaction.user && (
                    <div className="mt-1">
                      <code className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded font-medium">
                        {transaction.user.uid}
                      </code>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <PhoneIcon className="w-4 h-4 mt-1 text-gray-500 dark:text-slate-400" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Phone:
                  </div>
                  <div className="font-medium" dir="ltr">
                    {transaction.phone}
                  </div>
                </div>
              </div>
              {(transaction.email || transaction.user?.email) && (
                <div className="flex items-start gap-2">
                  <EnvelopeIcon className="w-4 h-4 mt-1 text-gray-500 dark:text-slate-400" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 dark:text-slate-400">
                      Email:
                    </div>
                    <div className="font-medium text-sm" dir="ltr">
                      {transaction.user?.email || transaction.email}
                    </div>
                  </div>
                </div>
              )}
              {transaction.createAccount && (
                <div className="text-xs text-blue-600 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded">
                  Customer requested account creation.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <MapPinIcon className="w-5 h-5" />
            Shipping address
          </h3>
          <div className="bg-gray-50 dark:bg-slate-900/60 p-4 rounded-lg">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {formattedShippingAddress || 'Not provided'}
            </p>
            {transaction.postalCode && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Postal code:
                </span>
                <code className="text-sm bg-white dark:bg-slate-800 px-2 py-1 rounded">
                  {transaction.postalCode}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBagIcon className="w-5 h-5" />
            Products ({formatNumber(totalItems)} items)
          </h3>
          <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Unit price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {transaction.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3 text-left">
                      <div className="font-medium text-gray-900 dark:text-slate-100">
                        {item.product.name}
                      </div>
                      {item.variant && (
                        <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          {item.variant.name}
                          {item.variant.color &&
                            ` - Color: ${item.variant.color}`}
                          {item.variant.size && ` - Size: ${item.variant.size}`}
                          {item.variant.material &&
                            ` - Material: ${item.variant.material}`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="font-medium">
                        {formatNumber(item.quantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      {formatPrice(Number(item.price))}
                    </td>
                    <td className="px-4 py-3 text-left font-semibold">
                      {formatPrice(Number(item.price) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-slate-900/60">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-slate-100"
                  >
                    Total:
                  </td>
                  <td className="px-4 py-3 text-left font-bold text-lg">
                    {formatPrice(Number(transaction.amount))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Invoice Information */}
        {transaction.invoice && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5" />
              Invoice
            </h3>
            <div className="bg-green-50 dark:bg-emerald-900/30 border border-green-200 dark:border-emerald-700/50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Invoice number:
                  </div>
                  <div className="font-bold text-lg">
                    {transaction.invoice.invoiceNumber}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Generated:
                  </div>
                  <div className="text-sm">
                    {transaction.invoice.generatedAt ? (
                      formatDateTime(transaction.invoice.generatedAt)
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500">
                        Unknown
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
