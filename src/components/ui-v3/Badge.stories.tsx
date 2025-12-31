import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BadgeV3 from './Badge';

const meta: Meta<typeof BadgeV3> = {
  title: 'Design System v3 (Girlish)/Badge',
  component: BadgeV3,
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
      options: [
        'default',
        'outline',
        'success',
        'warning',
        'error',
        'info',
        'premium',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof BadgeV3>;

export const Default: Story = {
  args: {
    children: 'پیش‌فرض',
  },
};

export const Outline: Story = {
  args: {
    children: 'حاشیه‌دار',
    variant: 'outline',
  },
};

export const Success: Story = {
  args: {
    children: 'موفق',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'هشدار',
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    children: 'خطا',
    variant: 'error',
  },
};

export const Info: Story = {
  args: {
    children: 'اطلاعات',
    variant: 'info',
  },
};

export const Premium: Story = {
  args: {
    children: 'ویژه',
    variant: 'premium',
  },
};

export const WithDot: Story = {
  args: {
    children: 'آنلاین',
    variant: 'success',
    dot: true,
  },
};

export const WithPulse: Story = {
  args: {
    children: 'زنده',
    variant: 'error',
    dot: true,
    pulse: true,
  },
};

export const Small: Story = {
  args: {
    children: 'کوچک',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'بزرگ',
    size: 'lg',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 justify-center">
      <BadgeV3 variant="default">پیش‌فرض</BadgeV3>
      <BadgeV3 variant="outline">حاشیه‌دار</BadgeV3>
      <BadgeV3 variant="success">موفق</BadgeV3>
      <BadgeV3 variant="warning">هشدار</BadgeV3>
      <BadgeV3 variant="error">خطا</BadgeV3>
      <BadgeV3 variant="info">اطلاعات</BadgeV3>
      <BadgeV3 variant="premium">ویژه</BadgeV3>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-3 items-center justify-center">
      <BadgeV3 size="sm">کوچک</BadgeV3>
      <BadgeV3 size="md">متوسط</BadgeV3>
      <BadgeV3 size="lg">بزرگ</BadgeV3>
    </div>
  ),
};

export const StatusIndicators: Story = {
  render: () => (
    <div className="flex flex-col gap-3 items-center">
      <BadgeV3 variant="success" dot pulse>
        آنلاین
      </BadgeV3>
      <BadgeV3 variant="warning" dot>
        در انتظار
      </BadgeV3>
      <BadgeV3 variant="error" dot>
        آفلاین
      </BadgeV3>
      <BadgeV3 variant="info" dot pulse>
        در حال پردازش
      </BadgeV3>
    </div>
  ),
};
