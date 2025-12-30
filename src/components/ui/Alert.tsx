import { ReactNode } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  title?: string;
  onClose?: () => void;
  showIcon?: boolean;
  className?: string;
}

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export default function Alert({
  type = 'info',
  children,
  title,
  onClose,
  showIcon = true,
  className = '',
}: AlertProps) {
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const Icon = icons[type];

  return (
    <div
      className={`rounded-lg border p-4 ${styles[type]} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="بستن"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 text-right">
          {title ? (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{title}</p>
              <div className="text-sm opacity-90">{children}</div>
            </div>
          ) : (
            children
          )}
        </div>
        {showIcon && (
          <Icon className={`h-5 w-5 flex-shrink-0 ${iconColors[type]}`} />
        )}
      </div>
    </div>
  );
}
