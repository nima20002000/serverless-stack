'use client';

import { ReactNode } from 'react';
import AlertV4 from '../ui-v4/Alert';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  title?: string;
  onClose?: () => void;
  showIcon?: boolean;
  className?: string;
  variant?: 'filled' | 'outlined' | 'soft';
}

export default function Alert({
  type = 'info',
  children,
  title,
  onClose,
  showIcon = true,
  className = '',
  variant = 'soft',
}: AlertProps) {
  return (
    <AlertV4
      type={type}
      title={title}
      onClose={onClose}
      showIcon={showIcon}
      variant={variant}
      className={className}
    >
      {children}
    </AlertV4>
  );
}
