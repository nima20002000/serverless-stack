/**
 * Digipay surcharge badge component
 * Shows the 12% surcharge info for Digipay payment method on product pages
 */

import { DIGIPAY_CONFIG } from '@/config/constants';

interface DigipaySurchargeBadgeProps {
  className?: string;
}

export default function DigipaySurchargeBadge({
  className = '',
}: DigipaySurchargeBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg text-xs ${className}`}
    >
      <svg
        className="w-3.5 h-3.5 text-purple-600"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          fill="currentColor"
          opacity="0.8"
        />
        <path
          d="M2 17L12 22L22 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 12L12 17L22 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-purple-700 font-medium" dir="rtl">
        دیجی‌پی: +{DIGIPAY_CONFIG.SURCHARGE_PERCENT}٪
      </span>
    </div>
  );
}
