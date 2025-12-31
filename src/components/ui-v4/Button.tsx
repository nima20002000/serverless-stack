'use client';

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface ButtonV4Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  rounded?: 'default' | 'full';
  children: ReactNode;
}

const ButtonV4 = forwardRef<HTMLButtonElement, ButtonV4Props>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'start',
      fullWidth = false,
      rounded = 'default',
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold tracking-[0.01em]
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/70
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      active:translate-y-[1px]
      select-none
    `;

    const variantStyles = {
      primary: `
        bg-rose-500 text-white
        hover:bg-rose-600
        shadow-[0_18px_30px_-18px_rgba(244,63,94,0.7)]
      `,
      secondary: `
        bg-white text-rose-600
        border border-rose-200
        hover:bg-rose-50 hover:border-rose-300
      `,
      outline: `
        bg-transparent text-rose-600
        border-2 border-rose-300
        hover:border-rose-400 hover:bg-rose-50
      `,
      ghost: `
        bg-transparent text-rose-500
        hover:bg-rose-50
      `,
      danger: `
        bg-rose-600 text-white
        hover:bg-rose-700
        shadow-[0_18px_30px_-18px_rgba(225,29,72,0.7)]
      `,
      soft: `
        bg-rose-50 text-rose-700
        border border-rose-100
        hover:bg-rose-100/70
      `,
    };

    const sizeStyles = {
      sm: 'h-9 px-4 text-xs',
      md: 'h-11 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const roundedStyles = {
      default:
        size === 'sm'
          ? 'rounded-xl'
          : size === 'md'
            ? 'rounded-2xl'
            : 'rounded-[20px]',
      full: 'rounded-full',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    const LoadingSpinner = () => (
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${roundedStyles[rounded]}
          ${widthStyles}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>در حال پردازش...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'start' && (
              <span className="flex-shrink-0">{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'end' && (
              <span className="flex-shrink-0">{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

ButtonV4.displayName = 'ButtonV4';

export default ButtonV4;
