import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import AlertV2 from './Alert';

const meta: Meta<typeof AlertV2> = {
  title: 'UI v2/Alert',
  component: AlertV2,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A refined alert component for displaying feedback messages with clear visual hierarchy.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'Alert type',
    },
    title: {
      control: 'text',
      description: 'Alert title',
    },
    showIcon: {
      control: 'boolean',
      description: 'Show type icon',
    },
    compact: {
      control: 'boolean',
      description: 'Use compact padding',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AlertV2>;

export const Info: Story = {
  args: {
    type: 'info',
    children: 'این یک پیام اطلاعاتی است که کاربر را از وضعیت فعلی مطلع می‌کند.',
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
    children: 'توجه: این عملیات قابل بازگشت نیست.',
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    children: 'خطایی در پردازش درخواست رخ داد. لطفاً دوباره تلاش کنید.',
  },
};

export const WithTitle: Story = {
  args: {
    type: 'info',
    title: 'اطلاعیه مهم',
    children: 'این یک پیام با عنوان است که اطلاعات بیشتری ارائه می‌دهد.',
  },
};

export const Dismissible: Story = {
  args: {
    type: 'success',
    title: 'سفارش ثبت شد',
    children: 'سفارش شما با موفقیت ثبت شد و در حال پردازش است.',
    onClose: fn(),
  },
};

export const Compact: Story = {
  args: {
    type: 'info',
    children: 'پیام کوتاه با پدینگ کمتر',
    compact: true,
  },
};

export const WithoutIcon: Story = {
  args: {
    type: 'warning',
    children: 'این پیام بدون آیکون نمایش داده می‌شود.',
    showIcon: false,
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-6 bg-[#f8f9fa] rounded-xl">
      <AlertV2 type="info">پیام اطلاعاتی</AlertV2>
      <AlertV2 type="success">عملیات موفق</AlertV2>
      <AlertV2 type="warning">هشدار</AlertV2>
      <AlertV2 type="error">خطا</AlertV2>
    </div>
  ),
};

export const AllTypesWithTitle: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-6 bg-[#f8f9fa] rounded-xl">
      <AlertV2 type="info" title="اطلاعات">
        این یک پیام اطلاعاتی است.
      </AlertV2>
      <AlertV2 type="success" title="موفقیت">
        عملیات با موفقیت انجام شد.
      </AlertV2>
      <AlertV2 type="warning" title="هشدار">
        لطفاً به این نکته توجه کنید.
      </AlertV2>
      <AlertV2 type="error" title="خطا">
        مشکلی پیش آمده است.
      </AlertV2>
    </div>
  ),
};

export const ComparisonWithOld: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h3 className="text-sm font-medium text-[#868e96] mb-4">
          New Design (v2)
        </h3>
        <div className="flex flex-col gap-3 w-96">
          <AlertV2 type="success" title="ثبت موفق">
            اطلاعات شما با موفقیت ذخیره شد.
          </AlertV2>
          <AlertV2 type="error" onClose={fn()}>
            خطایی رخ داده است.
          </AlertV2>
        </div>
      </div>
      <div className="border-t border-[#e9ecef] pt-8">
        <h3 className="text-sm font-medium text-[#868e96] mb-3">
          Key Differences
        </h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>• آیکون‌های سفارشی SVG به جای Heroicons</li>
          <li>• رنگ‌های پس‌زمینه نرم‌تر</li>
          <li>• حاشیه‌های ظریف‌تر</li>
          <li>• چیدمان RTL بهینه‌شده</li>
          <li>• حالت compact برای فضاهای کم</li>
        </ul>
      </div>
    </div>
  ),
};
