import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CardV2, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
import ButtonV2 from './Button';
import BadgeV2 from './Badge';

const meta: Meta<typeof CardV2> = {
  title: 'UI v2/Card',
  component: CardV2,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile card component with refined shadows and clean borders.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Internal padding',
    },
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated', 'ghost'],
      description: 'Visual style variant',
    },
    hoverable: {
      control: 'boolean',
      description: 'Add hover effects',
    },
  },
};

export default meta;
type Story = StoryObj<typeof CardV2>;

export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <div className="text-right">
        <h3 className="text-lg font-semibold text-[#212529] mb-2">
          عنوان کارت
        </h3>
        <p className="text-sm text-[#868e96]">
          این یک متن توضیحی برای کارت است که نشان‌دهنده محتوای داخل آن می‌باشد.
        </p>
      </div>
    ),
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <div className="text-right">
        <h3 className="text-lg font-semibold text-[#212529] mb-2">کارت خطی</h3>
        <p className="text-sm text-[#868e96]">بدون سایه، فقط با حاشیه.</p>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div className="text-right">
        <h3 className="text-lg font-semibold text-[#212529] mb-2">
          کارت برجسته
        </h3>
        <p className="text-sm text-[#868e96]">با سایه بیشتر برای تأکید.</p>
      </div>
    ),
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: (
      <div className="text-right">
        <h3 className="text-lg font-semibold text-[#212529] mb-2">کارت شفاف</h3>
        <p className="text-sm text-[#868e96]">پس‌زمینه خاکستری روشن.</p>
      </div>
    ),
  },
};

export const Hoverable: Story = {
  args: {
    variant: 'default',
    hoverable: true,
    children: (
      <div className="text-right">
        <h3 className="text-lg font-semibold text-[#212529] mb-2">
          کارت تعاملی
        </h3>
        <p className="text-sm text-[#868e96]">ماوس را روی کارت ببرید.</p>
      </div>
    ),
  },
};

export const WithStructuredContent: Story = {
  render: () => (
    <CardV2 className="w-80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <BadgeV2 variant="success" dot>
            فعال
          </BadgeV2>
          <CardTitle>مدیریت حساب</CardTitle>
        </div>
        <CardDescription>تنظیمات پروفایل و امنیت</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[#495057] text-right">
          از این بخش می‌توانید اطلاعات حساب کاربری خود را مدیریت کنید.
        </p>
      </CardContent>
      <CardFooter>
        <ButtonV2 variant="ghost" size="sm">
          لغو
        </ButtonV2>
        <ButtonV2 size="sm">ذخیره</ButtonV2>
      </CardFooter>
    </CardV2>
  ),
};

export const ProductCard: Story = {
  render: () => (
    <CardV2 padding="none" hoverable className="w-72 overflow-hidden">
      <div className="aspect-square bg-[#f1f3f5] flex items-center justify-center">
        <svg
          className="w-16 h-16 text-[#ced4da]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div className="p-4 text-right">
        <div className="flex items-center justify-between mb-2">
          <BadgeV2 variant="warning" size="sm">
            تخفیف
          </BadgeV2>
          <h3 className="font-semibold text-[#212529]">نام محصول</h3>
        </div>
        <p className="text-sm text-[#868e96] mb-3">توضیحات کوتاه محصول</p>
        <div className="flex items-center justify-between">
          <ButtonV2 size="sm">افزودن به سبد</ButtonV2>
          <div className="text-left">
            <span className="text-lg font-bold text-[#212529]">۲۵۰,۰۰۰</span>
            <span className="text-xs text-[#868e96] ms-1">تومان</span>
          </div>
        </div>
      </div>
    </CardV2>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 p-6 bg-[#f8f9fa] rounded-xl">
      <CardV2 variant="default">
        <p className="text-sm text-[#495057] text-right">پیش‌فرض</p>
      </CardV2>
      <CardV2 variant="outlined">
        <p className="text-sm text-[#495057] text-right">خطی</p>
      </CardV2>
      <CardV2 variant="elevated">
        <p className="text-sm text-[#495057] text-right">برجسته</p>
      </CardV2>
      <CardV2 variant="ghost">
        <p className="text-sm text-[#495057] text-right">شفاف</p>
      </CardV2>
    </div>
  ),
};

export const ComparisonWithOld: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h3 className="text-sm font-medium text-[#868e96] mb-3">
          New Design (v2)
        </h3>
        <div className="flex gap-4">
          <CardV2 className="w-64">
            <h4 className="font-semibold text-[#212529] text-right mb-2">
              کارت جدید
            </h4>
            <p className="text-sm text-[#868e96] text-right">
              طراحی مینیمال با سایه‌های نرم
            </p>
          </CardV2>
          <CardV2 variant="elevated" hoverable className="w-64">
            <h4 className="font-semibold text-[#212529] text-right mb-2">
              کارت تعاملی
            </h4>
            <p className="text-sm text-[#868e96] text-right">با افکت هاور</p>
          </CardV2>
        </div>
      </div>
      <div className="border-t border-[#e9ecef] pt-8">
        <h3 className="text-sm font-medium text-[#868e96] mb-3">
          Key Differences
        </h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>• سایه‌های نرم‌تر و طبیعی‌تر</li>
          <li>• حاشیه‌های ظریف‌تر</li>
          <li>• گوشه‌های xl به جای lg</li>
          <li>• پشتیبانی از sub-components ساختاریافته</li>
          <li>• انیمیشن هاور نرم</li>
        </ul>
      </div>
    </div>
  ),
};
