// Compatibility exports for the legacy ui-v4 path.
// New app code should import from "@/components/ui".

export { default as ButtonV4 } from './Button';
export type { ButtonV4Props } from './Button';

export { default as CardV4 } from './Card';
export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
export type { CardV4Props } from './Card';

export { default as InputV4 } from './Input';
export type { InputV4Props } from './Input';

export { default as AlertV4 } from './Alert';
export type { AlertV4Props } from './Alert';

export { default as BadgeV4 } from './Badge';
export type { BadgeV4Props } from './Badge';

export { default as ModalV4, ModalFooter } from './Modal';
export type { ModalV4Props } from './Modal';

export { default as SelectV4 } from './Select';
export type { SelectV4Props, SelectOption } from './Select';

export {
  default as SkeletonV4,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonProduct,
} from './Skeleton';
export type { SkeletonV4Props } from './Skeleton';

export { default as PillV4 } from './Pill';
export type { PillV4Props } from './Pill';

export { default as StatCardV4 } from './StatCard';
export type { StatCardV4Props } from './StatCard';

export { default as ToastContainer } from './Toast';
