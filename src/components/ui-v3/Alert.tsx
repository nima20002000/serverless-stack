'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface AlertV3Props extends HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  showIcon?: boolean;
  compact?: boolean;
  variant?: 'filled' | 'outlined' | 'soft';
}

const icons = {
  success: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  error: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  warning: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  info: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

const closeIcon = (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const AlertV3 = forwardRef<HTMLDivElement, AlertV3Props>(
  (
    {
      type = 'info',
      title,
      children,
      onClose,
      showIcon = true,
      compact = false,
      variant = 'soft',
      className = '',
      ...props
    },
    ref
  ) => {
    const typeColors = {
      success: {
        soft: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        filled: 'bg-emerald-500 border-emerald-500 text-white',
        outlined: 'bg-transparent border-emerald-300 text-emerald-600',
        icon: variant === 'filled' ? 'text-white' : 'text-emerald-500',
        title: variant === 'filled' ? 'text-white' : 'text-emerald-800',
      },
      error: {
        soft: 'bg-red-50 border-red-200 text-red-700',
        filled: 'bg-red-500 border-red-500 text-white',
        outlined: 'bg-transparent border-red-300 text-red-600',
        icon: variant === 'filled' ? 'text-white' : 'text-red-500',
        title: variant === 'filled' ? 'text-white' : 'text-red-800',
      },
      warning: {
        soft: 'bg-amber-50 border-amber-200 text-amber-700',
        filled: 'bg-amber-500 border-amber-500 text-white',
        outlined: 'bg-transparent border-amber-300 text-amber-600',
        icon: variant === 'filled' ? 'text-white' : 'text-amber-500',
        title: variant === 'filled' ? 'text-white' : 'text-amber-800',
      },
      info: {
        soft: 'bg-rose-50 border-rose-200 text-rose-700',
        filled: 'bg-rose-500 border-rose-500 text-white',
        outlined: 'bg-transparent border-rose-300 text-rose-600',
        icon: variant === 'filled' ? 'text-white' : 'text-rose-500',
        title: variant === 'filled' ? 'text-white' : 'text-rose-800',
      },
    };

    const colors = typeColors[type];
    const paddingStyles = compact ? 'p-3' : 'p-4';

    return (
      <div
        ref={ref}
        role="alert"
        className={`
          ${colors[variant]}
          border-2 rounded-xl
          ${paddingStyles}
          transition-all duration-300
          ${className}
        `}
        {...props}
      >
        <div className="flex items-start gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className={`
                flex-shrink-0 p-1 -mt-0.5
                opacity-60 hover:opacity-100
                transition-opacity duration-200
                rounded-lg hover:bg-black/5
              `}
              aria-label="بستن"
            >
              {closeIcon}
            </button>
          )}

          <div className="flex-1 text-right">
            {title && (
              <p className={`font-semibold ${colors.title} mb-1`}>{title}</p>
            )}
            <div className="text-sm">{children}</div>
          </div>

          {showIcon && (
            <div className={`flex-shrink-0 ${colors.icon}`}>{icons[type]}</div>
          )}
        </div>
      </div>
    );
  }
);

AlertV3.displayName = 'AlertV3';

export default AlertV3;
