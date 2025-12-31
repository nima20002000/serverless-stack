'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface PillV4Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'rose' | 'blush' | 'peach' | 'mint' | 'cream';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children: ReactNode;
}

const PillV4 = forwardRef<HTMLSpanElement, PillV4Props>(
  (
    { tone = 'rose', size = 'md', icon, children, className = '', ...props },
    ref
  ) => {
    const toneStyles = {
      rose: 'bg-rose-100 text-rose-700 border border-rose-200',
      blush: 'bg-pink-100 text-pink-700 border border-pink-200',
      peach: 'bg-amber-100 text-amber-700 border border-amber-200',
      mint: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      cream: 'bg-rose-50 text-rose-600 border border-rose-100',
    };

    const sizeStyles = {
      sm: 'h-6 px-3 text-xs',
      md: 'h-7 px-4 text-sm',
      lg: 'h-8 px-5 text-sm',
    };

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-2
          rounded-full font-medium
          ${toneStyles[tone]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {icon && <span className="text-base leading-none">{icon}</span>}
        {children}
      </span>
    );
  }
);

PillV4.displayName = 'PillV4';

export default PillV4;
