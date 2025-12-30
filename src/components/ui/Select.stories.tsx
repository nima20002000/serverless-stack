import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import Select from './Select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text above the select',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when no option is selected',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

const categoryOptions = [
  { value: 'electronics', label: 'الکترونیک' },
  { value: 'clothing', label: 'پوشاک' },
  { value: 'home', label: 'خانه و آشپزخانه' },
  { value: 'sports', label: 'ورزشی' },
  { value: 'beauty', label: 'زیبایی و سلامت' },
];

const statusOptions = [
  { value: 'active', label: 'فعال' },
  { value: 'inactive', label: 'غیرفعال' },
  { value: 'pending', label: 'در انتظار' },
];

export const Default: Story = {
  args: {
    value: '',
    onChange: fn(),
    options: categoryOptions,
    placeholder: 'انتخاب دسته‌بندی',
  },
};

export const WithLabel: Story = {
  args: {
    value: '',
    onChange: fn(),
    options: categoryOptions,
    label: 'دسته‌بندی',
    placeholder: 'انتخاب کنید',
  },
};

export const WithSelectedValue: Story = {
  args: {
    value: 'electronics',
    onChange: fn(),
    options: categoryOptions,
    label: 'دسته‌بندی',
  },
};

export const StatusSelect: Story = {
  args: {
    value: 'active',
    onChange: fn(),
    options: statusOptions,
    label: 'وضعیت',
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
        label="انتخاب دسته‌بندی"
        placeholder="یک دسته‌بندی انتخاب کنید"
      />
      {value && (
        <p className="mt-4 text-sm text-gray-600">
          انتخاب شده: {categoryOptions.find((o) => o.value === value)?.label}
        </p>
      )}
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveSelectComponent />,
};

export const MultipleSelects: Story = {
  render: () => (
    <div className="space-y-4 max-w-xs">
      <Select
        value=""
        onChange={() => {}}
        options={categoryOptions}
        label="دسته‌بندی"
        placeholder="انتخاب دسته‌بندی"
      />
      <Select
        value=""
        onChange={() => {}}
        options={statusOptions}
        label="وضعیت"
        placeholder="انتخاب وضعیت"
      />
    </div>
  ),
};
