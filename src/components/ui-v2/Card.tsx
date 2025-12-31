'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';

export interface CardV2Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  hoverable?: boolean;
  as?: 'div' | 'article' | 'section';
}

const CardV2 = forwardRef<HTMLDivElement, CardV2Props>(
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
      transition-all duration-200
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
        border border-[#e9ecef]
        rounded-xl
        shadow-sm
      `,
      outlined: `
        bg-transparent
        border border-[#dee2e6]
        rounded-xl
      `,
      elevated: `
        bg-white
        rounded-xl
        shadow-md
        border border-[#f1f3f5]
      `,
      ghost: `
        bg-[#f8f9fa]
        rounded-xl
      `,
    };

    const hoverStyles = hoverable
      ? `
        cursor-pointer
        hover:shadow-lg hover:border-[#ced4da]
        hover:-translate-y-0.5
        active:translate-y-0 active:shadow-md
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

CardV2.displayName = 'CardV2';

// Card sub-components for structured content
export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={`pb-4 border-b border-[#f1f3f5] mb-4 ${className}`}
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
    className={`text-lg font-semibold text-[#212529] leading-tight ${className}`}
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
  <p
    ref={ref}
    className={`text-sm text-[#868e96] mt-1 ${className}`}
    {...props}
  >
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
    className={`pt-4 border-t border-[#f1f3f5] mt-4 flex items-center gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

export default CardV2;
