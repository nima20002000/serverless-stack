import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SelectV3 from './Select';

const meta: Meta<typeof SelectV3> = {
  title: 'Design System v3 (Girlish)/Select',
  component: SelectV3,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'rose',
      values: [
        {
          name: 'rose',
          value:
            'linear-gradient(135deg, #fff1f2 0%, #ffffff 50%, #fce7f3 100%)',
        },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'filled', 'minimal'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SelectV3>;

const categoryOptions = [
  { value: 'clothing', label: 'پوشاک' },
  { value: 'accessories', label: 'اکسسوری' },
  { value: 'cosmetics', label: 'آرایشی' },
  { value: 'electronics', label: 'الکترونیک' },
];

export const Default: Story = {
  args: {
    label: 'دسته‌بندی',
    placeholder: 'انتخاب کنید',
    options: categoryOptions,
  },
};

export const Filled: Story = {
  args: {
    label: 'دسته‌بندی',
    placeholder: 'انتخاب کنید',
    variant: 'filled',
    options: categoryOptions,
  },
};

export const Minimal: Story = {
  args: {
    label: 'دسته‌بندی',
    placeholder: 'انتخاب کنید',
    variant: 'minimal',
    options: categoryOptions,
  },
};

export const WithError: Story = {
  args: {
    label: 'استان',
    placeholder: 'استان خود را انتخاب کنید',
    error: 'لطفاً یک استان انتخاب کنید',
    options: [
      { value: 'tehran', label: 'تهران' },
      { value: 'isfahan', label: 'اصفهان' },
      { value: 'shiraz', label: 'شیراز' },
    ],
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'زبان',
    helperText: 'زبان رابط کاربری را انتخاب کنید',
    options: [
      { value: 'fa', label: 'فارسی' },
      { value: 'en', label: 'English' },
      { value: 'ar', label: 'العربية' },
    ],
    defaultValue: 'fa',
  },
};

export const Disabled: Story = {
  args: {
    label: 'غیرفعال',
    disabled: true,
    options: categoryOptions,
    defaultValue: 'clothing',
  },
};

export const WithDisabledOption: Story = {
  args: {
    label: 'وضعیت',
    placeholder: 'انتخاب کنید',
    options: [
      { value: 'active', label: 'فعال' },
      { value: 'pending', label: 'در انتظار' },
      { value: 'archived', label: 'آرشیو شده', disabled: true },
    ],
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <SelectV3
        variant="default"
        label="پیش‌فرض"
        placeholder="انتخاب کنید"
        options={categoryOptions}
      />
      <SelectV3
        variant="filled"
        label="پر شده"
        placeholder="انتخاب کنید"
        options={categoryOptions}
      />
      <SelectV3
        variant="minimal"
        label="مینیمال"
        placeholder="انتخاب کنید"
        options={categoryOptions}
      />
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};
