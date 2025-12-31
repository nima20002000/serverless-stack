'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface BadgeV4Props extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'outline'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'premium';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
}

const BadgeV4 = forwardRef<HTMLSpanElement, BadgeV4Props>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      pulse = false,
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
      transition-all duration-200
    `;

    const variantStyles = {
      default: 'bg-rose-100/80 text-rose-700 border border-rose-200',
      outline: 'bg-transparent border border-rose-300 text-rose-500',
      success: 'bg-emerald-100/80 text-emerald-700 border border-emerald-200',
      warning: 'bg-amber-100/80 text-amber-700 border border-amber-200',
      error: 'bg-rose-100/80 text-rose-700 border border-rose-200',
      info: 'bg-rose-50 text-rose-600 border border-rose-200',
      premium:
        'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-[0_10px_20px_-12px_rgba(244,63,94,0.6)]',
    };

    const sizeStyles = {
      sm: 'h-5 px-2 text-[11px]',
      md: 'h-6 px-3 text-xs',
      lg: 'h-7 px-4 text-sm',
    };

    const dotColors = {
      default: 'bg-rose-500',
      outline: 'bg-rose-400',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-rose-500',
      info: 'bg-rose-400',
      premium: 'bg-white',
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
          <span className="relative flex h-2 w-2">
            {pulse && (
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${dotColors[variant]} opacity-75 animate-ping`}
              />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`}
            />
          </span>
        )}
        {children}
      </span>
    );
  }
);

BadgeV4.displayName = 'BadgeV4';

export default BadgeV4;
