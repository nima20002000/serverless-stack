'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface AlertV2Props extends HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  showIcon?: boolean;
  compact?: boolean;
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
        d="M5 13l4 4L19 7"
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
        d="M6 18L18 6M6 6l12 12"
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

const AlertV2 = forwardRef<HTMLDivElement, AlertV2Props>(
  (
    {
      type = 'info',
      title,
      children,
      onClose,
      showIcon = true,
      compact = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const typeStyles = {
      success: {
        container: 'bg-[#f0fdf4] border-[#bbf7d0]',
        icon: 'text-[#16a34a]',
        title: 'text-[#166534]',
        content: 'text-[#15803d]',
      },
      error: {
        container: 'bg-[#fef2f2] border-[#fecaca]',
        icon: 'text-[#dc2626]',
        title: 'text-[#991b1b]',
        content: 'text-[#b91c1c]',
      },
      warning: {
        container: 'bg-[#fffbeb] border-[#fde68a]',
        icon: 'text-[#d97706]',
        title: 'text-[#92400e]',
        content: 'text-[#b45309]',
      },
      info: {
        container: 'bg-[#eff6ff] border-[#bfdbfe]',
        icon: 'text-[#2563eb]',
        title: 'text-[#1e40af]',
        content: 'text-[#1d4ed8]',
      },
    };

    const styles = typeStyles[type];
    const paddingStyles = compact ? 'p-3' : 'p-4';

    return (
      <div
        ref={ref}
        role="alert"
        className={`
          ${styles.container}
          border rounded-lg
          ${paddingStyles}
          ${className}
        `}
        {...props}
      >
        <div className="flex items-start gap-3">
          {/* Close button - positioned at the start for RTL */}
          {onClose && (
            <button
              onClick={onClose}
              className={`
                flex-shrink-0
                text-[#9ca3af] hover:text-[#6b7280]
                transition-colors
                p-0.5 -mt-0.5
              `}
              aria-label="بستن"
            >
              {closeIcon}
            </button>
          )}

          {/* Content */}
          <div className="flex-1 text-right">
            {title && (
              <p className={`font-medium ${styles.title} mb-1`}>{title}</p>
            )}
            <div className={`text-sm ${styles.content}`}>{children}</div>
          </div>

          {/* Icon - at the end for RTL */}
          {showIcon && (
            <div className={`flex-shrink-0 ${styles.icon}`}>{icons[type]}</div>
          )}
        </div>
      </div>
    );
  }
);

AlertV2.displayName = 'AlertV2';

export default AlertV2;
