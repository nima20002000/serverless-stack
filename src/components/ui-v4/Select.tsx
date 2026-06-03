'use client';

import { SelectHTMLAttributes, forwardRef, ReactNode, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectV4Props extends Omit<
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
    className="h-4 w-4"
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

const SelectV4 = forwardRef<HTMLSelectElement, SelectV4Props>(
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
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id ?? props.name ?? generatedId;

    const variantStyles = {
      default:
        'bg-card border border-input rounded-lg hover:border-muted-foreground/40 focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:bg-muted',
      filled:
        'bg-muted border border-transparent rounded-lg hover:border-border focus:bg-card focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:bg-muted',
      minimal:
        'bg-transparent border-b border-input rounded-none hover:border-muted-foreground/40 focus:border-ring disabled:bg-transparent',
    };

    return (
      <div className={fullWidth ? 'w-full' : 'w-auto'}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-2 block text-start text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="group relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={!!error || undefined}
            aria-describedby={
              error
                ? `${selectId}-error`
                : helperText
                  ? `${selectId}-helper`
                  : undefined
            }
            className={`
              h-10 w-full appearance-none px-3 pe-10 text-start text-sm text-foreground
              transition-colors duration-200 ease-out focus:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
              ${variantStyles[variant]}
              ${error ? 'border-danger focus:border-danger focus:ring-danger/25' : ''}
              ${icon ? 'ps-10' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-muted-foreground">
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

          <div className="pointer-events-none absolute top-1/2 end-3 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground">
            {chevronIcon}
          </div>

          {icon && (
            <div className="pointer-events-none absolute top-1/2 start-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors group-focus-within:text-foreground">
              {icon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-2 text-start text-sm text-danger"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${selectId}-helper`}
            className="mt-2 text-start text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

SelectV4.displayName = 'SelectV4';

export default SelectV4;
