import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import Alert from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'The type of alert to display',
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show the icon',
    },
    title: {
      control: 'text',
      description: 'Optional title for the alert',
    },
    onClose: {
      description: 'Callback when close button is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: {
    type: 'info',
    children: 'این یک پیام اطلاعاتی است.',
  },
};

export const Success: Story = {
  args: {
    type: 'success',
    children: 'عملیات با موفقیت انجام شد.',
  },
};

export const Warning: Story = {
  args: {
    type: 'warning',
    children: 'لطفاً به این نکته توجه کنید.',
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    children: 'خطایی در سیستم رخ داده است.',
  },
};

export const WithTitle: Story = {
  args: {
    type: 'success',
    title: 'پرداخت موفق',
    children: 'سفارش شما با موفقیت ثبت شد و در حال پردازش است.',
  },
};

export const Dismissible: Story = {
  args: {
    type: 'info',
    children: 'این پیام قابل بستن است.',
    onClose: fn(),
  },
};

export const WithoutIcon: Story = {
  args: {
    type: 'warning',
    children: 'این هشدار بدون آیکون نمایش داده می‌شود.',
    showIcon: false,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Alert type="info">پیام اطلاعاتی</Alert>
      <Alert type="success">پیام موفقیت</Alert>
      <Alert type="warning">پیام هشدار</Alert>
      <Alert type="error">پیام خطا</Alert>
    </div>
  ),
};
