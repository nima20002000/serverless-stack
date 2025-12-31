'use client';

import { forwardRef, HTMLAttributes } from 'react';

export interface SkeletonV3Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

const SkeletonV3 = forwardRef<HTMLDivElement, SkeletonV3Props>(
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
    const baseStyles =
      'bg-gradient-to-r from-rose-100 via-rose-50 to-rose-100 bg-[length:200%_100%]';

    const variantStyles = {
      text: 'h-4 w-full rounded-lg',
      circular: 'rounded-full',
      rectangular: '',
      rounded: 'rounded-xl',
    };

    const animationStyles = {
      pulse: 'animate-pulse',
      shimmer: 'skeleton-shimmer',
      none: '',
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
            ${baseStyles}
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
              animation: shimmer 2s ease-in-out infinite;
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

SkeletonV3.displayName = 'SkeletonV3';

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
        <SkeletonV3
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
      className={`p-5 space-y-4 bg-white rounded-2xl border border-rose-100 ${className}`}
    >
      <SkeletonV3 variant="rounded" height={180} />
      <SkeletonV3 variant="text" width="55%" />
      <SkeletonText lines={2} />
      <div className="flex gap-3 pt-2">
        <SkeletonV3 variant="rounded" width={90} height={36} />
        <SkeletonV3 variant="rounded" width={90} height={36} />
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
    <SkeletonV3
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
      className={`p-4 space-y-4 bg-white rounded-2xl border border-rose-100 ${className}`}
    >
      <SkeletonV3 variant="rounded" height={200} />
      <div className="space-y-2">
        <SkeletonV3 variant="text" width="80%" />
        <SkeletonV3 variant="text" width="50%" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <SkeletonV3 variant="rounded" width={100} height={38} />
        <SkeletonV3 variant="text" width={60} height={20} />
      </div>
    </div>
  );
}

export default SkeletonV3;
