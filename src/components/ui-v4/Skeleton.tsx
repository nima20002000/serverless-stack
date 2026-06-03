'use client';

import { forwardRef, HTMLAttributes } from 'react';

export interface SkeletonV4Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

const SkeletonV4 = forwardRef<HTMLDivElement, SkeletonV4Props>(
  (
    {
      variant = 'text',
      width,
      height,
      animation = 'shimmer',
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      text: 'h-4 w-full rounded',
      circular: 'rounded-full',
      rectangular: '',
      rounded: 'rounded-lg',
    };

    const animationStyles = {
      pulse: 'animate-pulse bg-muted',
      shimmer:
        'bg-gradient-to-r from-muted via-background to-muted bg-[length:200%_100%] skeleton-shimmer',
      none: 'bg-muted',
    };

    const computedStyle = {
      ...style,
      width: width ?? (variant === 'circular' ? '40px' : undefined),
      height:
        height ??
        (variant === 'circular'
          ? '40px'
          : variant === 'text'
            ? undefined
            : undefined),
    };

    return (
      <>
        <div
          ref={ref}
          className={`
            ${variantStyles[variant]}
            ${animationStyles[animation]}
            ${className}
          `}
          style={computedStyle}
          aria-hidden="true"
          {...props}
        />

        {animation === 'shimmer' && (
          <style jsx global>{`
            .skeleton-shimmer {
              animation: shimmer 1.9s ease-in-out infinite;
            }
            @keyframes shimmer {
              0% {
                background-position: 200% 0;
              }
              100% {
                background-position: -200% 0;
              }
            }
          `}</style>
        )}
      </>
    );
  }
);

SkeletonV4.displayName = 'SkeletonV4';

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonV4
          key={i}
          variant="text"
          width={i === lines - 1 ? '70%' : '100%'}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`space-y-4 rounded-lg border border-border bg-card p-5 ${className}`}
    >
      <SkeletonV4 variant="rounded" height={180} />
      <SkeletonV4 variant="text" width="55%" />
      <SkeletonText lines={2} />
      <div className="flex gap-3 pt-2">
        <SkeletonV4 variant="rounded" width={90} height={36} />
        <SkeletonV4 variant="rounded" width={90} height={36} />
      </div>
    </div>
  );
}

export function SkeletonAvatar({
  size = 44,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <SkeletonV4
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
}

export function SkeletonProduct({ className = '' }: { className?: string }) {
  return (
    <div
      className={`space-y-4 rounded-lg border border-border bg-card p-4 ${className}`}
    >
      <SkeletonV4 variant="rounded" height={200} />
      <div className="space-y-2">
        <SkeletonV4 variant="text" width="80%" />
        <SkeletonV4 variant="text" width="50%" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <SkeletonV4 variant="rounded" width={100} height={38} />
        <SkeletonV4 variant="text" width={60} height={20} />
      </div>
    </div>
  );
}

export default SkeletonV4;
