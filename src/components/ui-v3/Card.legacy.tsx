import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CardV3, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
import ButtonV3 from './Button';
import BadgeV3 from './Badge';

const meta: Meta<typeof CardV3> = {
  title: 'Design System v3 (Girlish)/Card',
  component: CardV3,
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
      options: ['default', 'outlined', 'elevated', 'glass', 'gradient'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CardV3>;

export const Default: Story = {
  args: {
    children: (
      <div className="text-right">
        <h3 className="font-semibold text-rose-900">کارت پیش‌فرض</h3>
        <p className="text-sm text-rose-500 mt-2">محتوای کارت</p>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div className="text-right">
        <h3 className="font-semibold text-rose-900">کارت برجسته</h3>
        <p className="text-sm text-rose-500 mt-2">با سایه عمیق‌تر</p>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Gradient: Story = {
  args: {
    variant: 'gradient',
    children: (
      <div className="text-right">
        <h3 className="font-semibold text-rose-900">کارت گرادیانی</h3>
        <p className="text-sm text-rose-500 mt-2">پس‌زمینه گرادیان ملایم</p>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Glass: Story = {
  args: {
    variant: 'glass',
    children: (
      <div className="text-right">
        <h3 className="font-semibold text-rose-900">کارت شیشه‌ای</h3>
        <p className="text-sm text-rose-500 mt-2">افکت بلور</p>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <div className="text-right">
        <h3 className="font-semibold text-rose-900">کارت حاشیه‌دار</h3>
        <p className="text-sm text-rose-500 mt-2">با خط‌چین</p>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Hoverable: Story = {
  args: {
    variant: 'elevated',
    hoverable: true,
    children: (
      <div className="text-right">
        <h3 className="font-semibold text-rose-900">کارت تعاملی</h3>
        <p className="text-sm text-rose-500 mt-2">موس را روی کارت ببرید</p>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const StructuredCard: Story = {
  render: () => (
    <CardV3 variant="elevated" className="w-80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <BadgeV3 variant="premium">ویژه</BadgeV3>
          <CardTitle>عنوان کارت</CardTitle>
        </div>
        <CardDescription>توضیحات مختصر درباره محتوا</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-rose-700 text-right text-sm">
          این یک نمونه از کارت ساختاریافته است که شامل هدر، محتوا و فوتر
          می‌باشد.
        </p>
      </CardContent>
      <CardFooter>
        <ButtonV3 variant="ghost" size="sm">
          انصراف
        </ButtonV3>
        <ButtonV3 size="sm">تایید</ButtonV3>
      </CardFooter>
    </CardV3>
  ),
};

export const ProductCard: Story = {
  render: () => (
    <CardV3 variant="gradient" hoverable className="w-72">
      <div className="aspect-square bg-rose-100 rounded-xl mb-4 flex items-center justify-center">
        <span className="text-4xl">👗</span>
      </div>
      <div className="text-right">
        <div className="flex items-center justify-between mb-2">
          <BadgeV3 variant="success" size="sm">
            موجود
          </BadgeV3>
          <h3 className="font-semibold text-rose-900">پیراهن زنانه</h3>
        </div>
        <p className="text-sm text-rose-400 mb-4">پیراهن تابستانی گلدار</p>
        <div className="flex items-center justify-between">
          <ButtonV3 size="sm">افزودن به سبد</ButtonV3>
          <span className="font-bold text-rose-600">۲۵۰,۰۰۰ تومان</span>
        </div>
      </div>
    </CardV3>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {(['default', 'elevated', 'gradient', 'glass', 'outlined'] as const).map(
        (variant) => (
          <CardV3 key={variant} variant={variant} className="w-48">
            <p className="text-rose-900 text-right font-medium">{variant}</p>
          </CardV3>
        )
      )}
    </div>
  ),
};
