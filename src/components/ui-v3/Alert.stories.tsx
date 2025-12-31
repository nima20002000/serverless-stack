import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AlertV3 from './Alert';

const meta: Meta<typeof AlertV3> = {
  title: 'Design System v3 (Girlish)/Alert',
  component: AlertV3,
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
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
    },
    variant: {
      control: 'select',
      options: ['soft', 'filled', 'outlined'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AlertV3>;

export const Success: Story = {
  args: {
    type: 'success',
    children: 'عملیات با موفقیت انجام شد.',
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    children: 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.',
  },
};

export const Warning: Story = {
  args: {
    type: 'warning',
    children: 'این عملیات قابل بازگشت نیست.',
  },
};

export const Info: Story = {
  args: {
    type: 'info',
    children: 'اطلاعات جدید در دسترس است.',
  },
};

export const WithTitle: Story = {
  args: {
    type: 'success',
    title: 'موفقیت!',
    children: 'سفارش شما با موفقیت ثبت شد.',
  },
};

export const Closable: Story = {
  args: {
    type: 'info',
    children: 'این پیام قابل بستن است.',
    onClose: () => alert('Alert closed!'),
  },
};

export const Compact: Story = {
  args: {
    type: 'warning',
    children: 'پیام فشرده',
    compact: true,
  },
};

export const FilledVariant: Story = {
  args: {
    type: 'success',
    variant: 'filled',
    children: 'اعلان با پس‌زمینه کامل',
  },
};

export const OutlinedVariant: Story = {
  args: {
    type: 'error',
    variant: 'outlined',
    children: 'اعلان با حاشیه',
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <AlertV3 type="success">عملیات موفق</AlertV3>
      <AlertV3 type="error">خطا رخ داد</AlertV3>
      <AlertV3 type="warning">هشدار</AlertV3>
      <AlertV3 type="info">اطلاعات</AlertV3>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-rose-600 mb-2 text-right">نرم (Soft)</p>
        <AlertV3 type="success" variant="soft">
          اعلان نرم
        </AlertV3>
      </div>
      <div>
        <p className="text-sm text-rose-600 mb-2 text-right">پر (Filled)</p>
        <AlertV3 type="success" variant="filled">
          اعلان پر
        </AlertV3>
      </div>
      <div>
        <p className="text-sm text-rose-600 mb-2 text-right">
          حاشیه‌دار (Outlined)
        </p>
        <AlertV3 type="success" variant="outlined">
          اعلان حاشیه‌دار
        </AlertV3>
      </div>
    </div>
  ),
};
