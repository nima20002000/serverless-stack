import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import Select from './Select';

const noop = () => {};

const meta: Meta<typeof Select> = {
  title: 'Design System/Select',
  component: Select,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

const categoryOptions = [
  { value: 'drinkware', label: 'Drinkware' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'home', label: 'Home' },
  { value: 'accessories', label: 'Accessories' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

export const Default: Story = {
  args: {
    value: '',
    onChange: noop,
    options: categoryOptions,
    placeholder: 'Select category',
  },
};

export const WithLabel: Story = {
  args: {
    value: '',
    onChange: noop,
    options: categoryOptions,
    label: 'Category',
    placeholder: 'Select an option',
  },
};

export const WithSelectedValue: Story = {
  args: {
    value: 'drinkware',
    onChange: noop,
    options: categoryOptions,
    label: 'Category',
  },
};

export const StatusSelect: Story = {
  args: {
    value: 'active',
    onChange: noop,
    options: statusOptions,
    label: 'Status',
  },
};

const InteractiveSelectComponent = () => {
  const [value, setValue] = useState('');

  return (
    <div className="max-w-xs">
      <Select
        value={value}
        onChange={setValue}
        options={categoryOptions}
        label="Category"
        placeholder="Select category"
      />
      {value && (
        <p className="mt-4 text-sm text-muted-foreground">
          Selected:{' '}
          {categoryOptions.find((option) => option.value === value)?.label}
        </p>
      )}
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveSelectComponent />,
};
