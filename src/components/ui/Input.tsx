'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import InputV4 from '../ui-v4/Input';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'minimal';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, variant = 'default', ...props }, ref) => {
    return (
      <InputV4
        ref={ref}
        label={label}
        error={error}
        helperText={helperText}
        variant={variant}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input;
