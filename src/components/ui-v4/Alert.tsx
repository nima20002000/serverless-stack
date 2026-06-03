'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface AlertV4Props extends HTMLAttributes<HTMLDivElement> {
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
      className="h-5 w-5"
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
      className="h-5 w-5"
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
      className="h-5 w-5"
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
      className="h-5 w-5"
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
    className="h-4 w-4"
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

const AlertV4 = forwardRef<HTMLDivElement, AlertV4Props>(
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
        soft: 'bg-success-muted border-success/25 text-foreground',
        filled: 'bg-success border-success text-success-foreground',
        outlined: 'bg-card border-success text-foreground',
        icon: variant === 'filled' ? 'text-success-foreground' : 'text-success',
        title:
          variant === 'filled' ? 'text-success-foreground' : 'text-foreground',
      },
      error: {
        soft: 'bg-danger-muted border-danger/25 text-foreground',
        filled: 'bg-danger border-danger text-danger-foreground',
        outlined: 'bg-card border-danger text-foreground',
        icon: variant === 'filled' ? 'text-danger-foreground' : 'text-danger',
        title:
          variant === 'filled' ? 'text-danger-foreground' : 'text-foreground',
      },
      warning: {
        soft: 'bg-warning-muted border-warning/35 text-foreground',
        filled: 'bg-warning border-warning text-warning-foreground',
        outlined: 'bg-card border-warning text-foreground',
        icon: variant === 'filled' ? 'text-warning-foreground' : 'text-warning',
        title:
          variant === 'filled' ? 'text-warning-foreground' : 'text-foreground',
      },
      info: {
        soft: 'bg-muted border-border text-foreground',
        filled: 'bg-primary border-primary text-primary-foreground',
        outlined: 'bg-card border-border text-foreground',
        icon: variant === 'filled' ? 'text-primary-foreground' : 'text-primary',
        title:
          variant === 'filled' ? 'text-primary-foreground' : 'text-foreground',
      },
    };

    const colors = typeColors[type];

    return (
      <div
        ref={ref}
        role="alert"
        className={`
          ${colors[variant]}
          rounded-lg border
          ${compact ? 'p-3' : 'p-4'}
          ${className}
        `}
        {...props}
      >
        <div className="flex items-start gap-3">
          {showIcon && (
            <div className={`mt-0.5 flex-shrink-0 ${colors.icon}`}>
              {icons[type]}
            </div>
          )}

          <div className="min-w-0 flex-1 text-start">
            {title && (
              <p className={`mb-1 font-semibold ${colors.title}`}>{title}</p>
            )}
            <div className="text-sm leading-relaxed">{children}</div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close alert"
            >
              {closeIcon}
            </button>
          )}
        </div>
      </div>
    );
  }
);

AlertV4.displayName = 'AlertV4';

export default AlertV4;
