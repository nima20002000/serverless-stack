'use client';

import SkeletonV4, { SkeletonText as SkeletonTextV4 } from '../ui-v4/Skeleton';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  style?: React.CSSProperties;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  style,
}: SkeletonProps) {
  const animationMap = {
    pulse: 'pulse',
    wave: 'shimmer',
    none: 'none',
  } as const;

  return (
    <SkeletonV4
      className={className}
      variant={variant}
      width={width}
      height={height}
      animation={animationMap[animation]}
      style={style}
    />
  );
}

export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return <SkeletonTextV4 lines={lines} className={className} />;
}

export function SkeletonImage({
  aspectRatio = '4/5',
  className = '',
}: {
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <Skeleton
      className={className}
      style={{ aspectRatio }}
      variant="rectangular"
    />
  );
}
