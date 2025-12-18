interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  style?: React.CSSProperties;
}

/**
 * Base skeleton component for loading states
 * Provides animated placeholders while content is loading
 */
export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  style: externalStyle,
}: SkeletonProps) {
  const animationClass = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }[animation];

  const variantClass = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }[variant];

  const internalStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...externalStyle,
  };

  return (
    <div
      className={`bg-gray-200 ${variantClass} ${animationClass} ${className}`}
      style={internalStyle}
    />
  );
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-4/5' : ''}`}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for images
 */
export function SkeletonImage({
  aspectRatio = '4/5',
  className = '',
}: {
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <Skeleton
      className={`w-full ${className}`}
      style={{ aspectRatio }}
    />
  );
}
