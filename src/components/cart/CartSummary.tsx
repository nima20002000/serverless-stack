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
        <h2 className="border-b border-slate-200 pb-3 text-lg font-bold text-slate-950 dark:border-slate-800 dark:text-white">
          Order summary
        </h2>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Items</span>
          <span className="font-medium text-slate-950 dark:text-white">
            {itemCount}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium text-slate-950 dark:text-white">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-bold dark:border-slate-800">
          <span className="text-slate-950 dark:text-white">Total</span>
          <span className="text-slate-950 dark:text-white">
            {formatPrice(subtotal)}
          </span>
        </div>

        {onCheckout && (
          <Button
            variant="primary"
            className="mt-4 w-full"
            onClick={onCheckout}
            isLoading={isLoading}
            disabled={itemCount === 0}
          >
            Continue to checkout
          </Button>
        )}
      </div>
    </Card>
  );
}
