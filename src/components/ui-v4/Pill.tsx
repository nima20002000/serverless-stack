'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface PillV4Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children: ReactNode;
}

const PillV4 = forwardRef<HTMLSpanElement, PillV4Props>(
  (
    { tone = 'neutral', size = 'md', icon, children, className = '', ...props },
    ref
  ) => {
    const toneStyles = {
      neutral: 'bg-muted text-foreground border border-border',
      primary: 'bg-primary-muted text-foreground border border-primary/25',
      success: 'bg-success-muted text-foreground border border-success/25',
      warning: 'bg-warning-muted text-foreground border border-warning/35',
      danger: 'bg-danger-muted text-foreground border border-danger/25',
    };

    const sizeStyles = {
      sm: 'h-6 px-3 text-xs',
      md: 'h-7 px-4 text-sm',
      lg: 'h-8 px-5 text-sm',
    };

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-2 rounded-full font-medium
          ${toneStyles[tone]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {icon && <span className="text-base leading-none">{icon}</span>}
        {children}
      </span>
    );
  }
);

PillV4.displayName = 'PillV4';

export default PillV4;
