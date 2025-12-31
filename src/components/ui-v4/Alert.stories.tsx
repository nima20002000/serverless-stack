import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AlertV4 from './Alert';

const meta: Meta<typeof AlertV4> = {
  title: 'Design System v4 (Girlish)/Alert',
  component: AlertV4,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AlertV4>;

export const Soft: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <AlertV4 type="success">پرداخت با موفقیت انجام شد.</AlertV4>
      <AlertV4 type="error">خطایی رخ داده است.</AlertV4>
      <AlertV4 type="warning">موجودی محدود است.</AlertV4>
      <AlertV4 type="info">کد تخفیف جدید فعال شد.</AlertV4>
    </div>
  ),
};

export const Filled: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <AlertV4 type="success" variant="filled">
        سفارش ثبت شد.
      </AlertV4>
      <AlertV4 type="error" variant="filled">
        عملیات ناموفق بود.
      </AlertV4>
      <AlertV4 type="warning" variant="filled">
        زمان محدود برای خرید.
      </AlertV4>
      <AlertV4 type="info" variant="filled">
        خبرنامه برای شما فعال شد.
      </AlertV4>
    </div>
  ),
};

export const WithTitle: Story = {
  render: () => (
    <AlertV4 type="info" title="به‌روزرسانی وضعیت">
      سفارش شما در حال پردازش است و به‌زودی ارسال می‌شود.
    </AlertV4>
  ),
};
