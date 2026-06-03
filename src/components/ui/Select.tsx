'use client';

import SelectV4, { type SelectOption } from '../ui-v4/Select';

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  label?: string;
  variant?: 'default' | 'filled' | 'minimal';
}

export type { SelectOption };

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  label,
  variant = 'default',
}: SelectProps) {
  return (
    <SelectV4
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options}
      placeholder={placeholder}
      className={className}
      label={label}
      variant={variant}
    />
  );
}
