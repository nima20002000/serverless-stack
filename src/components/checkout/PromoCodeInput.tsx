'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  TicketIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useCheckoutStore, AppliedPromoCode } from '@/store/checkout-store';
import { formatPrice } from '@/lib/utils/format';

interface PromoCodeInputProps {
  subtotal: number;
  onPromoApplied?: (promo: AppliedPromoCode | null) => void;
}

export default function PromoCodeInput({
  subtotal,
  onPromoApplied,
}: PromoCodeInputProps) {
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { promoCode, setPromoCode, clearPromoCode } = useCheckoutStore();

  const handleApplyCode = async () => {
    if (!inputCode.trim()) {
      setError('Enter a promo code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: inputCode.trim().toUpperCase(),
          subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Promo code is not valid.');
        return;
      }

      // Apply the promo code
      const appliedPromo: AppliedPromoCode = {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
      };

      setPromoCode(appliedPromo);
      setInputCode('');
      onPromoApplied?.(appliedPromo);
    } catch {
      setError('Unable to validate this promo code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCode = () => {
    clearPromoCode();
    setError(null);
    onPromoApplied?.(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleApplyCode();
    }
  };

  // If promo code is applied, show applied state
  if (promoCode) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                  {promoCode.code}
                </code>
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {promoCode.discountType === 'PERCENT'
                    ? `${promoCode.discountValue}% off`
                    : `${formatPrice(promoCode.discountValue)} off`}
                </span>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                Discount applied: {formatPrice(promoCode.discountAmount)}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveCode}
            className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-colors"
            aria-label="Remove promo code"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Show input form
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Promo code"
            value={inputCode}
            onChange={(e) => {
              setInputCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            icon={<TicketIcon className="w-5 h-5" />}
            iconPosition="start"
            error={error || undefined}
            disabled={isLoading}
            className="font-mono text-left"
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleApplyCode}
          isLoading={isLoading}
          disabled={!inputCode.trim() || isLoading}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
