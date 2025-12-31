'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface BadgeV3Props extends HTMLAttributes<HTMLSpanElement> {
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

const BadgeV3 = forwardRef<HTMLSpanElement, BadgeV3Props>(
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
      default: 'bg-pink-100 text-pink-600 border border-pink-200',
      outline: 'bg-transparent border-2 border-pink-300 text-pink-500',
      success: 'bg-emerald-100 text-emerald-600 border border-emerald-200',
      warning: 'bg-amber-100 text-amber-600 border border-amber-200',
      error: 'bg-red-100 text-red-600 border border-red-200',
      info: 'bg-sky-100 text-sky-600 border border-sky-200',
      premium:
        'bg-gradient-to-r from-pink-400 to-fuchsia-500 text-white shadow-sm shadow-pink-200',
    };

    const sizeStyles = {
      sm: 'h-5 px-2 text-xs',
      md: 'h-6 px-3 text-xs',
      lg: 'h-7 px-4 text-sm',
    };

    const dotColors = {
      default: 'bg-pink-500',
      outline: 'bg-pink-400',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
      info: 'bg-sky-500',
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

BadgeV3.displayName = 'BadgeV3';

export default BadgeV3;
