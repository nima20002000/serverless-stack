import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Card from './Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Padding size',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">عنوان کارت</h3>
        <p className="text-gray-600">محتوای کارت در اینجا قرار می‌گیرد.</p>
      </div>
    ),
  },
};

export const SmallPadding: Story = {
  args: {
    padding: 'sm',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">کارت با پدینگ کوچک</h3>
        <p className="text-gray-600">این کارت پدینگ کمتری دارد.</p>
      </div>
    ),
  },
};

export const MediumPadding: Story = {
  args: {
    padding: 'md',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">کارت با پدینگ متوسط</h3>
        <p className="text-gray-600">این پدینگ پیش‌فرض است.</p>
      </div>
    ),
  },
};

export const LargePadding: Story = {
  args: {
    padding: 'lg',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">کارت با پدینگ بزرگ</h3>
        <p className="text-gray-600">این کارت پدینگ بیشتری دارد.</p>
      </div>
    ),
  },
};

export const ProductCard: Story = {
  args: {
    children: (
      <div className="text-right">
        <div className="bg-gray-100 rounded-lg h-48 mb-4 flex items-center justify-center">
          <span className="text-gray-400">تصویر محصول</span>
        </div>
        <h3 className="font-semibold mb-1">نام محصول</h3>
        <p className="text-sm text-gray-500 mb-2">دسته‌بندی</p>
        <p className="text-lg font-bold text-blue-600">۱۲۵,۰۰۰ تومان</p>
      </div>
    ),
  },
};

export const StatsCard: Story = {
  args: {
    children: (
      <div className="text-center">
        <p className="text-3xl font-bold text-blue-600 mb-1">۱,۲۳۴</p>
        <p className="text-gray-600">تعداد سفارشات</p>
      </div>
    ),
  },
};

export const AllPaddings: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card padding="sm">
        <p className="font-semibold">کوچک (sm)</p>
      </Card>
      <Card padding="md">
        <p className="font-semibold">متوسط (md)</p>
      </Card>
      <Card padding="lg">
        <p className="font-semibold">بزرگ (lg)</p>
      </Card>
    </div>
  ),
};
