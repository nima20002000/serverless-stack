'use client';

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface InputV2Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
}

const InputV2 = forwardRef<HTMLInputElement, InputV2Props>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconPosition = 'end',
      fullWidth = true,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const hasIcon = !!icon;

    const baseInputStyles = `
      w-full h-11 px-4
      bg-white
      border border-[#dee2e6]
      rounded-lg
      text-[#212529] text-sm text-right
      placeholder:text-[#adb5bd]
      transition-all duration-150
      focus:outline-none focus:border-[#495057] focus:ring-1 focus:ring-[#495057]
      disabled:bg-[#f8f9fa] disabled:text-[#868e96] disabled:cursor-not-allowed
    `;

    const errorStyles = error
      ? 'border-[#c53030] focus:border-[#c53030] focus:ring-[#c53030]'
      : '';

    const iconPaddingStyles = hasIcon
      ? iconPosition === 'start'
        ? 'pe-4 ps-11'
        : 'ps-4 pe-11'
      : '';

    return (
      <div className={fullWidth ? 'w-full' : 'w-auto'}>
        {label && (
          <label className="block text-sm font-medium text-[#343a40] mb-2 text-right">
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            disabled={disabled}
            className={`
              ${baseInputStyles}
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
                w-5 h-5 text-[#868e96]
                pointer-events-none
                ${iconPosition === 'start' ? 'start-4' : 'end-4'}
              `}
            >
              {icon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-[#c53030] text-right">{error}</p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[#868e96] text-right">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

InputV2.displayName = 'InputV2';

export default InputV2;
