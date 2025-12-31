'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface BadgeV2Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: ReactNode;
}

const BadgeV2 = forwardRef<HTMLSpanElement, BadgeV2Props>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-1.5
      font-medium
      rounded-full
      whitespace-nowrap
    `;

    const variantStyles = {
      default: 'bg-[#f1f3f5] text-[#495057]',
      outline: 'bg-transparent border border-[#dee2e6] text-[#495057]',
      success: 'bg-[#d1fae5] text-[#065f46]',
      warning: 'bg-[#fef3c7] text-[#92400e]',
      error: 'bg-[#fee2e2] text-[#991b1b]',
      info: 'bg-[#dbeafe] text-[#1e40af]',
    };

    const sizeStyles = {
      sm: 'h-5 px-2 text-xs',
      md: 'h-6 px-2.5 text-xs',
    };

    const dotColors = {
      default: 'bg-[#868e96]',
      outline: 'bg-[#868e96]',
      success: 'bg-[#10b981]',
      warning: 'bg-[#f59e0b]',
      error: 'bg-[#ef4444]',
      info: 'bg-[#3b82f6]',
    };

    return (
      <span
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

BadgeV2.displayName = 'BadgeV2';

export default BadgeV2;
