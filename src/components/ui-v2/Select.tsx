'use client';

import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectV2Props extends Omit<
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
}

const chevronIcon = (
  <svg
    className="w-4 h-4 text-[#868e96]"
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

const SelectV2 = forwardRef<HTMLSelectElement, SelectV2Props>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      icon,
      fullWidth = true,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseSelectStyles = `
      w-full h-11 px-4 pe-10
      bg-white
      border border-[#dee2e6]
      rounded-lg
      text-[#212529] text-sm text-right
      appearance-none
      cursor-pointer
      transition-all duration-150
      focus:outline-none focus:border-[#495057] focus:ring-1 focus:ring-[#495057]
      disabled:bg-[#f8f9fa] disabled:text-[#868e96] disabled:cursor-not-allowed
    `;

    const errorStyles = error
      ? 'border-[#c53030] focus:border-[#c53030] focus:ring-[#c53030]'
      : '';

    const iconPaddingStyles = icon ? 'ps-11' : '';

    return (
      <div className={fullWidth ? 'w-full' : 'w-auto'}>
        {label && (
          <label className="block text-sm font-medium text-[#343a40] mb-2 text-right">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={`
              ${baseSelectStyles}
              ${errorStyles}
              ${iconPaddingStyles}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
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
              pointer-events-none
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
                w-5 h-5 text-[#868e96]
                pointer-events-none
              "
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

SelectV2.displayName = 'SelectV2';

export default SelectV2;
