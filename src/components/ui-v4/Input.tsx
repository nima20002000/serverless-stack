'use client';

import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';

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
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasIcon = !!icon;

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
            htmlFor={inputId}
            className="mb-2 block text-start text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="group relative">
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error || undefined}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            className={`
              h-10 w-full px-3 text-start text-sm text-foreground placeholder:text-muted-foreground
              transition-colors duration-200 ease-out focus:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
              ${variantStyles[variant]}
              ${error ? 'border-danger focus:border-danger focus:ring-danger/25' : ''}
              ${hasIcon ? (iconPosition === 'start' ? 'ps-10' : 'pe-10') : ''}
              ${className}
            `}
            {...props}
          />

          {hasIcon && (
            <div
              className={`
                pointer-events-none absolute top-1/2 flex h-5 w-5 -translate-y-1/2
                items-center justify-center text-muted-foreground transition-colors
                group-focus-within:text-foreground
                ${iconPosition === 'start' ? 'start-3' : 'end-3'}
              `}
            >
              {icon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-2 text-start text-sm text-danger"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="mt-2 text-start text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

InputV4.displayName = 'InputV4';

export default InputV4;
