'use client';

import SelectV4, { SelectOption } from '../ui-v4/Select';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  label?: string;
  variant?: 'default' | 'filled' | 'minimal';
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'انتخاب کنید',
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
