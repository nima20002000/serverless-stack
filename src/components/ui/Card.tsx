'use client';

import { ReactNode } from 'react';
import CardV4 from '../ui-v4/Card';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  className = '',
  padding = 'md',
}: CardProps) {
  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <CardV4 className={`${paddingStyles[padding]} ${className}`}>
      {children}
    </CardV4>
  );
}
