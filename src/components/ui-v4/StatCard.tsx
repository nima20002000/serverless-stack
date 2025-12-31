'use client';

import { HTMLAttributes, ReactNode } from 'react';
import CardV4, { CardHeader, CardTitle, CardContent } from './Card';

export interface StatCardV4Props extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  trend?: string;
  icon?: ReactNode;
  accent?: 'rose' | 'pink' | 'peach' | 'mint';
}

const accentStyles = {
  rose: 'text-rose-600 bg-rose-100/80',
  pink: 'text-pink-600 bg-pink-100/80',
  peach: 'text-amber-600 bg-amber-100/80',
  mint: 'text-emerald-600 bg-emerald-100/80',
};

export default function StatCardV4({
  label,
  value,
  trend,
  icon,
  accent = 'rose',
  className = '',
  ...props
}: StatCardV4Props) {
  return (
    <CardV4
      variant="soft"
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,207,232,0.25),_transparent_55%)]" />
      <CardHeader className="relative flex items-start justify-between">
        <div className="text-right">
          <CardTitle className="text-sm text-rose-500">{label}</CardTitle>
          <p className="text-2xl font-semibold text-rose-900 mt-2">{value}</p>
        </div>
        {icon && (
          <span
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${accentStyles[accent]}`}
          >
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent className="relative pt-0">
        {trend && (
          <span
            className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full ${accentStyles[accent]}`}
          >
            {trend}
          </span>
        )}
      </CardContent>
    </CardV4>
  );
}
