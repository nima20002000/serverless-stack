import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CardV4, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
import ButtonV4 from './Button';

const meta: Meta<typeof CardV4> = {
  title: 'Design System v4 (Girlish)/Card',
  component: CardV4,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'blush',
      values: [
        {
          name: 'blush',
          value:
            'radial-gradient(circle at top, #fff1f2 0%, #ffffff 48%, #fce7f3 100%)',
        },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'soft', 'glass', 'outlined'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CardV4>;

export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <CardContent>
        <CardTitle>کارت پیش‌فرض</CardTitle>
        <CardDescription>ظاهر تمیز و نرم برای محتوا</CardDescription>
      </CardContent>
    ),
  },
};

export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6">
      {['default', 'elevated', 'soft', 'glass', 'outlined'].map((variant) => (
        <CardV4 key={variant} variant={variant as any}>
          <CardContent>
            <CardTitle>{variant}</CardTitle>
            <CardDescription>نسخه {variant}</CardDescription>
          </CardContent>
        </CardV4>
      ))}
    </div>
  ),
};

export const Structured: Story = {
  render: () => (
    <CardV4 variant="elevated" className="max-w-md">
      <CardHeader>
        <CardTitle>سفارش شما</CardTitle>
        <CardDescription>جزئیات پرداخت و ارسال</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-right text-sm text-rose-700">
          <div className="flex justify-between">
            <span>محصولات</span>
            <span>۲ قلم</span>
          </div>
          <div className="flex justify-between">
            <span>مبلغ</span>
            <span>۳۵۰,۰۰۰ تومان</span>
          </div>
          <div className="flex justify-between">
            <span>ارسال</span>
            <span>رایگان</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <ButtonV4 variant="ghost">ویرایش</ButtonV4>
        <ButtonV4>پرداخت</ButtonV4>
      </CardFooter>
    </CardV4>
  ),
};
