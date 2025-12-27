'use client';

import { formatPrice } from '@/store/cart-store';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
  onCheckout?: () => void;
  isLoading?: boolean;
}

export default function CartSummary({
  subtotal,
  itemCount,
  onCheckout,
  isLoading = false,
}: CartSummaryProps) {
  return (
    <Card>
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 text-right border-b pb-3">
          خلاصه سبد خرید
        </h2>

        {/* Item Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-900">{itemCount}</span>
          <span className="text-gray-600">تعداد کالاها</span>
        </div>

        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm border-t pt-3">
          <span className="text-gray-900 font-medium" dir="rtl">
            {formatPrice(subtotal)}
          </span>
          <span className="text-gray-600">جمع جزء</span>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between text-lg font-bold border-t pt-3">
          <span className="text-gray-900" dir="rtl">
            {formatPrice(subtotal)}
          </span>
          <span className="text-gray-900">مبلغ قابل پرداخت</span>
        </div>

        {/* Checkout Button */}
        {onCheckout && (
          <Button
            variant="primary"
            className="w-full mt-4"
            onClick={onCheckout}
            isLoading={isLoading}
            disabled={itemCount === 0}
          >
            ادامه فرآیند خرید
          </Button>
        )}
      </div>
    </Card>
  );
}
