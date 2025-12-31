import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import InputV3 from './Input';

const SearchIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const meta: Meta<typeof InputV3> = {
  title: 'Design System v3 (Girlish)/Input',
  component: InputV3,
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
type Story = StoryObj<typeof InputV3>;

export const Default: Story = {
  args: {
    label: 'نام',
    placeholder: 'نام خود را وارد کنید',
  },
};

export const Filled: Story = {
  args: {
    label: 'ایمیل',
    placeholder: 'ایمیل خود را وارد کنید',
    variant: 'filled',
  },
};

export const Minimal: Story = {
  args: {
    label: 'شماره تلفن',
    placeholder: '۰۹۱۲۱۲۳۴۵۶۷',
    variant: 'minimal',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'جستجو',
    placeholder: 'جستجوی محصول...',
    icon: <SearchIcon />,
  },
};

export const WithError: Story = {
  args: {
    label: 'ایمیل',
    placeholder: 'ایمیل',
    error: 'لطفاً یک ایمیل معتبر وارد کنید',
    defaultValue: 'invalid-email',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'رمز عبور',
    placeholder: 'رمز عبور خود را وارد کنید',
    type: 'password',
    helperText: 'رمز عبور باید حداقل ۸ کاراکتر باشد',
  },
};

export const Disabled: Story = {
  args: {
    label: 'غیرفعال',
    defaultValue: 'مقدار ثابت',
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <InputV3 variant="default" label="پیش‌فرض" placeholder="با حاشیه" />
      <InputV3 variant="filled" label="پر شده" placeholder="با پس‌زمینه" />
      <InputV3 variant="minimal" label="مینیمال" placeholder="فقط خط زیر" />
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
