'use client';

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface InputV4Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  variant?: 'default' | 'filled' | 'minimal';
}

const InputV4 = forwardRef<HTMLInputElement, InputV4Props>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconPosition = 'end',
      fullWidth = true,
      variant = 'default',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const hasIcon = !!icon;

    const baseInputStyles = `
      w-full h-11 px-4
      text-rose-900 text-sm text-right
      placeholder:text-rose-300
      transition-all duration-200 ease-out
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      dark:text-slate-100 dark:placeholder:text-slate-500
    `;

    const variantStyles = {
      default: `
        bg-white
        border border-rose-200
        rounded-2xl
        focus:border-rose-400 focus:ring-4 focus:ring-rose-100/80
        hover:border-rose-300
        disabled:bg-rose-50
        dark:bg-slate-900 dark:border-slate-700 dark:focus:border-slate-500 dark:focus:ring-slate-700/60 dark:hover:border-slate-600 dark:disabled:bg-slate-800
      `,
      filled: `
        bg-rose-50/80
        border border-rose-100
        rounded-2xl
        focus:bg-white focus:border-rose-300 focus:ring-4 focus:ring-rose-100/70
        hover:bg-rose-50
        disabled:bg-rose-100
        dark:bg-slate-900/70 dark:border-slate-700 dark:focus:bg-slate-900 dark:focus:border-slate-500 dark:focus:ring-slate-700/60 dark:hover:bg-slate-800/80 dark:disabled:bg-slate-800
      `,
      minimal: `
        bg-transparent
        border-b border-rose-200
        rounded-none
        focus:border-rose-400
        hover:border-rose-300
        disabled:bg-transparent
        dark:border-slate-700 dark:focus:border-slate-500 dark:hover:border-slate-600
      `,
    };

    const errorStyles = error
      ? `
        border-red-300 focus:border-red-400 focus:ring-red-100/70
        placeholder:text-red-300
        dark:border-rose-600 dark:focus:border-rose-500 dark:focus:ring-rose-900/60 dark:placeholder:text-rose-400
      `
      : '';

    const iconPaddingStyles = hasIcon
      ? iconPosition === 'start'
        ? 'pe-4 ps-11'
        : 'ps-4 pe-11'
      : '';

    return (
      <div className={fullWidth ? 'w-full' : 'w-auto'}>
        {label && (
          <label className="block text-sm font-medium text-rose-700 dark:text-slate-300 mb-2 text-right">
            {label}
          </label>
        )}

        <div className="relative group">
          <input
            ref={ref}
            disabled={disabled}
            className={`
              ${baseInputStyles}
              ${variantStyles[variant]}
              ${errorStyles}
              ${iconPaddingStyles}
              ${className}
            `}
            {...props}
          />

          {hasIcon && (
            <div
              className={`
                absolute top-1/2 -translate-y-1/2
                flex items-center justify-center
                w-5 h-5 text-rose-400 dark:text-slate-500
                pointer-events-none
                transition-colors duration-200
                group-focus-within:text-rose-500 dark:group-focus-within:text-slate-200
                ${iconPosition === 'start' ? 'start-4' : 'end-4'}
              `}
            >
              {icon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-500 dark:text-rose-300 text-right flex items-center gap-1 justify-end">
            <span>{error}</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </p>
        )}

        {helperText && !error && (
          <p className="mt-2 text-sm text-rose-400 dark:text-slate-500 text-right">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

InputV4.displayName = 'InputV4';

export default InputV4;
