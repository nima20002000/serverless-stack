'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';

export interface CardV4Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'soft' | 'glass' | 'outlined';
  hoverable?: boolean;
  children: ReactNode;
}

const CardV4 = forwardRef<HTMLDivElement, CardV4Props>(
  (
    {
      variant = 'default',
      hoverable = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      rounded-lg
      border
      text-slate-950 dark:text-slate-100
      transition-all duration-200 ease-out
      dark:border-slate-800
    `;

    const variantStyles = {
      default:
        'bg-white/95 border-slate-200 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 dark:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.85)]',
      elevated:
        'bg-white border-slate-200 shadow-md dark:bg-slate-900 dark:border-slate-800 dark:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.9)]',
      soft: 'bg-slate-50/80 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800',
      glass:
        'bg-white/80 border-white/70 backdrop-blur shadow-sm dark:bg-slate-900/55 dark:border-slate-700/70 dark:shadow-[0_20px_45px_-30px_rgba(15,23,42,0.85)]',
      outlined:
        'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700',
    };

    const hoverStyles = hoverable ? 'hover:-translate-y-1 hover:shadow-md' : '';

    return (
      <div
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${hoverStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardV4.displayName = 'CardV4';

export const CardHeader = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => <div className={`px-6 pt-6 pb-3 ${className}`}>{children}</div>;

export const CardTitle = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <h3
    className={`text-base font-semibold text-slate-900 dark:text-slate-100 ${className}`}
  >
    {children}
  </h3>
);

export const CardDescription = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <p className={`text-sm text-slate-500 dark:text-slate-400 mt-1 ${className}`}>
    {children}
  </p>
);

export const CardContent = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => <div className={`px-6 pb-6 ${className}`}>{children}</div>;

export const CardFooter = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`px-6 pb-6 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-3 justify-end ${className}`}
  >
    {children}
  </div>
);

export default CardV4;
