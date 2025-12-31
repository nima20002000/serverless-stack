'use client';

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface ButtonV3Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  rounded?: 'default' | 'full';
  children: ReactNode;
}

const ButtonV3 = forwardRef<HTMLButtonElement, ButtonV3Props>(
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
      font-medium tracking-wide
      transition-all duration-300 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      active:scale-[0.97]
      select-none
    `;

    const variantStyles = {
      primary: `
        bg-gradient-to-r from-rose-400 to-rose-500
        text-white
        hover:from-rose-500 hover:to-rose-600
        focus-visible:ring-rose-400
        shadow-md shadow-rose-200/50 hover:shadow-lg hover:shadow-rose-300/50
      `,
      secondary: `
        bg-rose-50 text-rose-600
        hover:bg-rose-100
        focus-visible:ring-rose-300
        border border-rose-100
      `,
      outline: `
        bg-transparent text-rose-500
        border-2 border-rose-300
        hover:bg-rose-50 hover:border-rose-400
        focus-visible:ring-rose-300
      `,
      ghost: `
        bg-transparent text-rose-500
        hover:bg-rose-50
        focus-visible:ring-rose-300
      `,
      danger: `
        bg-gradient-to-r from-red-400 to-red-500
        text-white
        hover:from-red-500 hover:to-red-600
        focus-visible:ring-red-400
        shadow-md shadow-red-200/50
      `,
      soft: `
        bg-gradient-to-r from-pink-50 to-rose-50
        text-rose-600
        hover:from-pink-100 hover:to-rose-100
        focus-visible:ring-rose-300
        border border-rose-100/50
      `,
    };

    const sizeStyles = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-13 px-7 text-base',
    };

    const roundedStyles = {
      default:
        size === 'sm'
          ? 'rounded-lg'
          : size === 'md'
            ? 'rounded-xl'
            : 'rounded-2xl',
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

ButtonV3.displayName = 'ButtonV3';

export default ButtonV3;
