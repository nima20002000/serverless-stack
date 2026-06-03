'use client';

import { HTMLAttributes, ReactNode } from 'react';
import CardV4, { CardHeader, CardTitle, CardContent } from './Card';

export interface StatCardV4Props extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  trend?: string;
  icon?: ReactNode;
  accent?: 'neutral' | 'primary' | 'success' | 'warning';
}

const accentStyles = {
  neutral: 'text-foreground bg-muted',
  primary: 'text-primary bg-primary-muted',
  success: 'text-success bg-success-muted',
  warning: 'text-warning bg-warning-muted',
};

export default function StatCardV4({
  label,
  value,
  trend,
  icon,
  accent = 'primary',
  className = '',
  ...props
}: StatCardV4Props) {
  return (
    <CardV4
      variant="soft"
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      <CardHeader className="relative flex items-start justify-between gap-4">
        <div className="text-start">
          <CardTitle className="text-sm text-muted-foreground">
            {label}
          </CardTitle>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        {icon && (
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentStyles[accent]}`}
          >
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent className="relative pt-0">
        {trend && (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${accentStyles[accent]}`}
          >
            {trend}
          </span>
        )}
      </CardContent>
    </CardV4>
  );
}
