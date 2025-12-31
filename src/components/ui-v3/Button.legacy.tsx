import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ButtonV3 from './Button';

const meta: Meta<typeof ButtonV3> = {
  title: 'Design System v3 (Girlish)/Button',
  component: ButtonV3,
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
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'soft'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    rounded: {
      control: 'select',
      options: ['default', 'full'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ButtonV3>;

export const Primary: Story = {
  args: {
    children: 'دکمه اصلی',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'دکمه ثانویه',
    variant: 'secondary',
  },
};

export const Soft: Story = {
  args: {
    children: 'دکمه نرم',
    variant: 'soft',
  },
};

export const Outline: Story = {
  args: {
    children: 'حاشیه‌دار',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    children: 'شفاف',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'حذف',
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    children: 'در حال ذخیره',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'غیرفعال',
    disabled: true,
  },
};

export const WithIcon: Story = {
  args: {
    children: 'علاقه‌مندی',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
  },
};

export const FullRounded: Story = {
  args: {
    children: 'کاملاً گرد',
    rounded: 'full',
  },
};

export const FullWidth: Story = {
  args: {
    children: 'عرض کامل',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 items-center">
      <ButtonV3 variant="primary">اصلی</ButtonV3>
      <ButtonV3 variant="secondary">ثانویه</ButtonV3>
      <ButtonV3 variant="soft">نرم</ButtonV3>
      <ButtonV3 variant="outline">حاشیه‌دار</ButtonV3>
      <ButtonV3 variant="ghost">شفاف</ButtonV3>
      <ButtonV3 variant="danger">خطر</ButtonV3>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <ButtonV3 size="sm">کوچک</ButtonV3>
      <ButtonV3 size="md">متوسط</ButtonV3>
      <ButtonV3 size="lg">بزرگ</ButtonV3>
    </div>
  ),
};
