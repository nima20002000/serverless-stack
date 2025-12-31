import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BadgeV4 from './Badge';

const meta: Meta<typeof BadgeV4> = {
  title: 'Design System v4 (Girlish)/Badge',
  component: BadgeV4,
  parameters: {
    layout: 'centered',
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
type Story = StoryObj<typeof BadgeV4>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 justify-center">
      <BadgeV4 variant="default">پیش‌فرض</BadgeV4>
      <BadgeV4 variant="outline">حاشیه‌دار</BadgeV4>
      <BadgeV4 variant="success">موفق</BadgeV4>
      <BadgeV4 variant="warning">هشدار</BadgeV4>
      <BadgeV4 variant="error">خطا</BadgeV4>
      <BadgeV4 variant="info">اطلاعات</BadgeV4>
      <BadgeV4 variant="premium">ویژه</BadgeV4>
    </div>
  ),
};

export const WithDot: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 justify-center">
      <BadgeV4 variant="success" dot>
        آنلاین
      </BadgeV4>
      <BadgeV4 variant="warning" dot>
        در انتظار
      </BadgeV4>
      <BadgeV4 variant="error" dot>
        آفلاین
      </BadgeV4>
    </div>
  ),
};

export const WithPulse: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 justify-center">
      <BadgeV4 variant="success" dot pulse>
        زنده
      </BadgeV4>
      <BadgeV4 variant="error" dot pulse>
        فوری
      </BadgeV4>
      <BadgeV4 variant="premium" dot pulse>
        جدید
      </BadgeV4>
    </div>
  ),
};
