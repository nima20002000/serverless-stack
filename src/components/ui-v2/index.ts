/**
 * Kitia Design System v2
 *
 * A refined, minimalist design system focused on clarity and user experience.
 */

// Core components
export { default as ButtonV2 } from './Button';
export type { ButtonV2Props } from './Button';

export {
  default as CardV2,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
export type { CardV2Props } from './Card';

export { default as InputV2 } from './Input';
export type { InputV2Props } from './Input';

export { default as AlertV2 } from './Alert';
export type { AlertV2Props } from './Alert';

export { default as ModalV2, ModalFooter } from './Modal';
export type { ModalV2Props } from './Modal';

export { default as SelectV2 } from './Select';
export type { SelectV2Props, SelectOption } from './Select';

export { default as BadgeV2 } from './Badge';
export type { BadgeV2Props } from './Badge';

export {
  default as SkeletonV2,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
} from './Skeleton';
export type { SkeletonV2Props } from './Skeleton';

// Design tokens
export { tokens, cssVariables } from './design-tokens';
