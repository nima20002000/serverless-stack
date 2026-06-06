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
      default:
        'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      outline:
        'bg-transparent border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300',
      success:
        'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800',
      warning:
        'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
      error:
        'bg-red-100 text-red-700 border border-red-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800',
      info: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800',
      premium:
        'bg-slate-900 text-white border border-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:border-slate-100',
    };

    const sizeStyles = {
      sm: 'h-5 px-2 text-[11px]',
      md: 'h-6 px-3 text-xs',
      lg: 'h-7 px-4 text-sm',
    };

    const dotColors = {
      default: 'bg-slate-500',
      outline: 'bg-slate-400',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
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
