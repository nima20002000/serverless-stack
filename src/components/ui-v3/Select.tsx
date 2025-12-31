'use client';

import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectV3Props extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children'
> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
  variant?: 'default' | 'filled' | 'minimal';
}

const chevronIcon = (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

const SelectV3 = forwardRef<HTMLSelectElement, SelectV3Props>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      icon,
      fullWidth = true,
      variant = 'default',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseSelectStyles = `
      w-full h-12 px-4 pe-10
      text-rose-900 text-sm text-right
      appearance-none
      cursor-pointer
      transition-all duration-300 ease-out
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variantStyles = {
      default: `
        bg-white
        border-2 border-rose-200
        rounded-xl
        focus:border-rose-400 focus:ring-4 focus:ring-rose-100
        hover:border-rose-300
        disabled:bg-rose-50
      `,
      filled: `
        bg-rose-50
        border-2 border-transparent
        rounded-xl
        focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100
        hover:bg-rose-100/50
        disabled:bg-rose-100
      `,
      minimal: `
        bg-transparent
        border-b-2 border-rose-200
        rounded-none
        focus:border-rose-400
        hover:border-rose-300
        disabled:bg-transparent
      `,
    };

    const errorStyles = error
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : '';

    const iconPaddingStyles = icon ? 'ps-12' : '';

    return (
      <div className={fullWidth ? 'w-full' : 'w-auto'}>
        {label && (
          <label className="block text-sm font-medium text-rose-700 mb-2 text-right">
            {label}
          </label>
        )}

        <div className="relative group">
          <select
            ref={ref}
            disabled={disabled}
            className={`
              ${baseSelectStyles}
              ${variantStyles[variant]}
              ${errorStyles}
              ${iconPaddingStyles}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-rose-300">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron icon */}
          <div
            className="
              absolute top-1/2 -translate-y-1/2 end-3
              pointer-events-none text-rose-400
              transition-transform duration-200
              group-focus-within:rotate-180
            "
          >
            {chevronIcon}
          </div>

          {/* Custom icon */}
          {icon && (
            <div
              className="
                absolute top-1/2 -translate-y-1/2 start-4
                flex items-center justify-center
                w-5 h-5 text-rose-400
                pointer-events-none
                transition-colors duration-300
                group-focus-within:text-rose-500
              "
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
          <p className="mt-2 text-sm text-rose-400 text-right">{helperText}</p>
        )}
      </div>
    );
  }
);

SelectV3.displayName = 'SelectV3';

export default SelectV3;
