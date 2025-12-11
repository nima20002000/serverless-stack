'use client';

import Modal from '@/components/ui/Modal';
import { formatPrice } from '@/services/product-service';
import { format } from 'date-fns-jalali';
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
  paymentMethod: 'ZARINPAL' | 'DIGIPAY';
  isGuest: boolean;
  createdAt: string;
  zarinpalAuthority?: string | null;
  zarinpalRefId?: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  shippingAddress: string;
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
    createdAt: string;
  } | null;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
      case 'FAILED':
        return <XCircleIcon className="w-6 h-6 text-red-600" />;
      case 'PENDING':
        return <ClockIcon className="w-6 h-6 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
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
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      ZARINPAL: 'زرین‌پال',
      DIGIPAY: 'دیجی‌پی',
    };
    return labels[method as keyof typeof labels] || method;
  };

  const totalItems = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="جزئیات تراکنش" size="2xl">
      <div className="space-y-6">
        {/* Transaction Status Header */}
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(transaction.status)}
            <div>
              <div className="text-sm text-gray-600">وضعیت تراکنش</div>
              <div className="mt-1">{getStatusBadge(transaction.status)}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm text-gray-600">کد تراکنش</div>
            <code className="text-lg font-bold bg-white px-3 py-1 rounded mt-1 inline-block">
              {transaction.transactionCode}
            </code>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5" />
              اطلاعات پرداخت
            </h3>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">مبلغ کل:</span>
                <span className="font-bold text-lg">
                  {formatPrice(Number(transaction.amount))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">درگاه پرداخت:</span>
                <span className="font-medium">
                  {getPaymentMethodLabel(transaction.paymentMethod)}
                </span>
              </div>
              {transaction.zarinpalRefId && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">کد رهگیری:</span>
                  <code className="text-sm bg-white px-2 py-1 rounded">
                    {transaction.zarinpalRefId}
                  </code>
                </div>
              )}
              {transaction.zarinpalAuthority && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Authority:</span>
                  <code className="text-xs bg-white px-2 py-1 rounded">
                    {transaction.zarinpalAuthority.substring(0, 20)}...
                  </code>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">تاریخ ایجاد:</span>
                <span className="text-sm flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {format(new Date(transaction.createdAt), 'yyyy/MM/dd - HH:mm')}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              اطلاعات مشتری
            </h3>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <UserIcon className="w-4 h-4 mt-1 text-gray-500" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">نام:</div>
                  <div className="font-medium flex items-center gap-2">
                    {transaction.user ? transaction.user.name : transaction.fullName}
                    {transaction.isGuest && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                        مهمان
                      </span>
                    )}
                  </div>
                  {transaction.user && (
                    <div className="mt-1">
                      <code className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                        {transaction.user.uid}
                      </code>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <PhoneIcon className="w-4 h-4 mt-1 text-gray-500" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">تلفن:</div>
                  <div className="font-medium" dir="ltr">
                    {transaction.phone}
                  </div>
                </div>
              </div>
              {(transaction.email || transaction.user?.email) && (
                <div className="flex items-start gap-2">
                  <EnvelopeIcon className="w-4 h-4 mt-1 text-gray-500" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">ایمیل:</div>
                    <div className="font-medium text-sm" dir="ltr">
                      {transaction.user?.email || transaction.email}
                    </div>
                  </div>
                </div>
              )}
              {transaction.createAccount && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  درخواست ایجاد حساب کاربری
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPinIcon className="w-5 h-5" />
            آدرس ارسال
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm leading-relaxed">{transaction.shippingAddress}</p>
            {transaction.postalCode && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-600">کد پستی:</span>
                <code className="text-sm bg-white px-2 py-1 rounded">
                  {transaction.postalCode}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBagIcon className="w-5 h-5" />
            محصولات ({totalItems.toLocaleString('fa-IR')} عدد)
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    محصول
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    تعداد
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    قیمت واحد
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    جمع
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transaction.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-gray-900">
                        {item.product.name}
                      </div>
                      {item.variant && (
                        <div className="text-xs text-blue-600 mt-1">
                          {item.variant.name}
                          {item.variant.color && ` - رنگ: ${item.variant.color}`}
                          {item.variant.size && ` - سایز: ${item.variant.size}`}
                          {item.variant.material && ` - جنس: ${item.variant.material}`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">
                        {item.quantity.toLocaleString('fa-IR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPrice(Number(item.price))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatPrice(Number(item.price) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right font-semibold text-gray-900"
                  >
                    جمع کل:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg">
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
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5" />
              اطلاعات فاکتور
            </h3>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">شماره فاکتور:</div>
                  <div className="font-bold text-lg">
                    {transaction.invoice.invoiceNumber}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm text-gray-600">تاریخ صدور:</div>
                  <div className="text-sm">
                    {format(
                      new Date(transaction.invoice.createdAt),
                      'yyyy/MM/dd - HH:mm'
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
