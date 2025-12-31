'use client';

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface ButtonV2Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  children: ReactNode;
}

const ButtonV2 = forwardRef<HTMLButtonElement, ButtonV2Props>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'start',
      fullWidth = false,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium transition-all
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      active:scale-[0.98]
    `;

    const variantStyles = {
      primary: `
        bg-[#212529] text-white
        hover:bg-[#343a40]
        focus-visible:ring-[#495057]
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-[#f1f3f5] text-[#212529]
        hover:bg-[#e9ecef]
        focus-visible:ring-[#adb5bd]
      `,
      outline: `
        bg-transparent text-[#212529]
        border border-[#dee2e6]
        hover:bg-[#f8f9fa] hover:border-[#ced4da]
        focus-visible:ring-[#adb5bd]
      `,
      ghost: `
        bg-transparent text-[#495057]
        hover:bg-[#f8f9fa] hover:text-[#212529]
        focus-visible:ring-[#adb5bd]
      `,
      danger: `
        bg-[#c53030] text-white
        hover:bg-[#9b2c2c]
        focus-visible:ring-[#c53030]
      `,
    };

    const sizeStyles = {
      sm: 'h-8 px-3 text-sm rounded-md',
      md: 'h-10 px-4 text-sm rounded-lg',
      lg: 'h-12 px-6 text-base rounded-lg',
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

ButtonV2.displayName = 'ButtonV2';

export default ButtonV2;
