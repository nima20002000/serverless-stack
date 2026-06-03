'use client';

import { HTMLAttributes, ReactNode } from 'react';
import CardV4 from '../ui-v4/Card';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  ...props
}: CardProps) {
  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <CardV4 className={`${paddingStyles[padding]} ${className}`} {...props}>
      {children}
    </CardV4>
  );
}
