import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BadgeV2 from './Badge';

const meta: Meta<typeof BadgeV2> = {
  title: 'UI v2/Badge',
  component: BadgeV2,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A compact badge component for status indicators and labels.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'success', 'warning', 'error', 'info'],
      description: 'Badge variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Badge size',
    },
    dot: {
      control: 'boolean',
      description: 'Show status dot',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BadgeV2>;

export const Default: Story = {
  args: {
    variant: 'default',
    children: 'پیش‌فرض',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'خطی',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'تأیید شده',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'در انتظار',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'رد شده',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'جدید',
  },
};

export const WithDot: Story = {
  args: {
    variant: 'success',
    children: 'فعال',
    dot: true,
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'کوچک',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-[#f8f9fa] rounded-xl">
      <div>
        <h4 className="text-sm font-medium text-[#868e96] mb-3 text-right">
          بدون نقطه
        </h4>
        <div className="flex flex-wrap gap-2">
          <BadgeV2 variant="default">پیش‌فرض</BadgeV2>
          <BadgeV2 variant="outline">خطی</BadgeV2>
          <BadgeV2 variant="success">موفق</BadgeV2>
          <BadgeV2 variant="warning">هشدار</BadgeV2>
          <BadgeV2 variant="error">خطا</BadgeV2>
          <BadgeV2 variant="info">اطلاعات</BadgeV2>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-[#868e96] mb-3 text-right">
          با نقطه
        </h4>
        <div className="flex flex-wrap gap-2">
          <BadgeV2 variant="default" dot>
            پیش‌فرض
          </BadgeV2>
          <BadgeV2 variant="outline" dot>
            خطی
          </BadgeV2>
          <BadgeV2 variant="success" dot>
            فعال
          </BadgeV2>
          <BadgeV2 variant="warning" dot>
            در انتظار
          </BadgeV2>
          <BadgeV2 variant="error" dot>
            آفلاین
          </BadgeV2>
          <BadgeV2 variant="info" dot>
            جدید
          </BadgeV2>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-[#868e96] mb-3 text-right">
          سایز کوچک
        </h4>
        <div className="flex flex-wrap gap-2">
          <BadgeV2 variant="success" size="sm">
            تخفیف
          </BadgeV2>
          <BadgeV2 variant="warning" size="sm">
            محدود
          </BadgeV2>
          <BadgeV2 variant="info" size="sm">
            جدید
          </BadgeV2>
        </div>
      </div>
    </div>
  ),
};

export const UseCases: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-xl border border-[#e9ecef]">
      <div className="flex items-center justify-between">
        <BadgeV2 variant="success" dot>
          آنلاین
        </BadgeV2>
        <span className="text-[#212529] font-medium">وضعیت کاربر</span>
      </div>
      <div className="flex items-center justify-between">
        <BadgeV2 variant="warning">در حال پردازش</BadgeV2>
        <span className="text-[#212529] font-medium">وضعیت سفارش</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <BadgeV2 variant="info" size="sm">
            جدید
          </BadgeV2>
          <BadgeV2 variant="success" size="sm">
            ۲۰٪ تخفیف
          </BadgeV2>
        </div>
        <span className="text-[#212529] font-medium">برچسب محصول</span>
      </div>
      <div className="flex items-center justify-between">
        <BadgeV2 variant="error" dot>
          ناموجود
        </BadgeV2>
        <span className="text-[#212529] font-medium">موجودی</span>
      </div>
    </div>
  ),
};

export const ComparisonInfo: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h3 className="text-sm font-medium text-[#868e96] mb-4">
          Badge Component
        </h3>
        <div className="flex flex-wrap gap-2">
          <BadgeV2 variant="success" dot>
            فعال
          </BadgeV2>
          <BadgeV2 variant="warning">در انتظار</BadgeV2>
          <BadgeV2 variant="error" dot>
            خطا
          </BadgeV2>
          <BadgeV2 variant="info">جدید</BadgeV2>
        </div>
      </div>
      <div className="border-t border-[#e9ecef] pt-8">
        <h3 className="text-sm font-medium text-[#868e96] mb-3">Features</h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>• کامپوننت جدید (در نسخه قبلی وجود نداشت)</li>
          <li>• نقطه وضعیت (status dot)</li>
          <li>• ۶ نوع رنگی مختلف</li>
          <li>• ۲ سایز (sm و md)</li>
          <li>• رنگ‌های نرم و چشم‌نواز</li>
        </ul>
      </div>
    </div>
  ),
};
