'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface CardV3Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'elevated' | 'glass' | 'gradient';
  hoverable?: boolean;
  as?: 'div' | 'article' | 'section';
}

const CardV3 = forwardRef<HTMLDivElement, CardV3Props>(
  (
    {
      children,
      padding = 'md',
      variant = 'default',
      hoverable = false,
      as: Component = 'div',
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      relative overflow-hidden
      transition-all duration-300 ease-out
    `;

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const variantStyles = {
      default: `
        bg-white
        border border-pink-100
        rounded-2xl
        shadow-sm shadow-pink-100/30
      `,
      outlined: `
        bg-transparent
        border-2 border-dashed border-pink-200
        rounded-2xl
      `,
      elevated: `
        bg-white
        rounded-2xl
        shadow-lg shadow-pink-100/40
        border border-pink-50
      `,
      glass: `
        bg-white/70 backdrop-blur-lg
        border border-pink-100/50
        rounded-2xl
        shadow-lg shadow-pink-100/20
      `,
      gradient: `
        bg-gradient-to-br from-white via-pink-50/30 to-fuchsia-50/50
        border border-pink-100/50
        rounded-2xl
        shadow-sm shadow-pink-100/30
      `,
    };

    const hoverStyles = hoverable
      ? `
        cursor-pointer
        hover:shadow-xl hover:shadow-pink-200/40
        hover:-translate-y-1 hover:border-pink-200
        active:translate-y-0 active:shadow-lg
      `
      : '';

    return (
      <Component
        ref={ref}
        className={`
          ${baseStyles}
          ${paddingStyles[padding]}
          ${variantStyles[variant]}
          ${hoverStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

CardV3.displayName = 'CardV3';

// Card sub-components for structured content
export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={`pb-4 border-b border-pink-100 mb-4 ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className = '', children, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-semibold text-pink-900 leading-tight ${className}`}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className = '', children, ...props }, ref) => (
  <p ref={ref} className={`text-sm text-pink-400 mt-1 ${className}`} {...props}>
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={`pt-4 border-t border-pink-100 mt-4 flex items-center gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

export default CardV3;
