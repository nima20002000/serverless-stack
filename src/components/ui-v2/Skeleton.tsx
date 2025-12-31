'use client';

import { forwardRef, HTMLAttributes } from 'react';

export interface SkeletonV2Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const SkeletonV2 = forwardRef<HTMLDivElement, SkeletonV2Props>(
  (
    {
      variant = 'text',
      width,
      height,
      animation = 'pulse',
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-[#e9ecef]';

    const variantStyles = {
      text: 'h-4 w-full rounded',
      circular: 'rounded-full',
      rectangular: '',
      rounded: 'rounded-lg',
    };

    const animationStyles = {
      pulse: 'animate-pulse',
      wave: 'skeleton-wave',
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

        {animation === 'wave' && (
          <style jsx global>{`
            .skeleton-wave {
              position: relative;
              overflow: hidden;
            }
            .skeleton-wave::after {
              content: '';
              position: absolute;
              inset: 0;
              transform: translateX(-100%);
              background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.4),
                transparent
              );
              animation: wave 1.5s infinite;
            }
            @keyframes wave {
              100% {
                transform: translateX(100%);
              }
            }
          `}</style>
        )}
      </>
    );
  }
);

SkeletonV2.displayName = 'SkeletonV2';

// Skeleton group for common patterns
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonV2
          key={i}
          variant="text"
          width={i === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 space-y-4 ${className}`}>
      <SkeletonV2 variant="rounded" height={160} />
      <SkeletonV2 variant="text" width="60%" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 pt-2">
        <SkeletonV2 variant="rounded" width={80} height={32} />
        <SkeletonV2 variant="rounded" width={80} height={32} />
      </div>
    </div>
  );
}

export function SkeletonAvatar({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <SkeletonV2
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
}

export default SkeletonV2;
