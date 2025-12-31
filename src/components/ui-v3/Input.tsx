'use client';

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface InputV3Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  variant?: 'default' | 'filled' | 'minimal';
}

const InputV3 = forwardRef<HTMLInputElement, InputV3Props>(
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
      w-full h-12 px-4
      text-pink-900 text-sm text-right
      placeholder:text-pink-300
      transition-all duration-300 ease-out
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variantStyles = {
      default: `
        bg-white
        border-2 border-pink-200
        rounded-xl
        focus:border-pink-400 focus:ring-4 focus:ring-pink-100
        hover:border-pink-300
        disabled:bg-pink-50
      `,
      filled: `
        bg-pink-50
        border-2 border-transparent
        rounded-xl
        focus:bg-white focus:border-pink-400 focus:ring-4 focus:ring-pink-100
        hover:bg-pink-100/50
        disabled:bg-pink-100
      `,
      minimal: `
        bg-transparent
        border-b-2 border-pink-200
        rounded-none
        focus:border-pink-400
        hover:border-pink-300
        disabled:bg-transparent
      `,
    };

    const errorStyles = error
      ? `
        border-red-300 focus:border-red-400 focus:ring-red-100
        placeholder:text-red-300
      `
      : '';

    const iconPaddingStyles = hasIcon
      ? iconPosition === 'start'
        ? 'pe-4 ps-12'
        : 'ps-4 pe-12'
      : '';

    return (
      <div className={fullWidth ? 'w-full' : 'w-auto'}>
        {label && (
          <label className="block text-sm font-medium text-pink-700 mb-2 text-right">
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
                w-5 h-5 text-pink-400
                pointer-events-none
                transition-colors duration-300
                group-focus-within:text-pink-500
                ${iconPosition === 'start' ? 'start-4' : 'end-4'}
              `}
            >
              {icon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-500 text-right flex items-center gap-1 justify-end">
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
          <p className="mt-2 text-sm text-pink-400 text-right">{helperText}</p>
        )}
      </div>
    );
  }
);

InputV3.displayName = 'InputV3';

export default InputV3;
