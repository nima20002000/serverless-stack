import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SelectV4 from './Select';

const meta: Meta<typeof SelectV4> = {
  title: 'Design System v4 (Girlish)/Select',
  component: SelectV4,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SelectV4>;

export const Default: Story = {
  args: {
    label: 'دسته‌بندی',
    placeholder: 'انتخاب کنید',
    options: [
      { value: 'beauty', label: 'آرایشی' },
      { value: 'accessories', label: 'اکسسوری' },
      { value: 'skincare', label: 'مراقبت پوست' },
    ],
  },
};

export const Filled: Story = {
  args: {
    label: 'سایز',
    variant: 'filled',
    options: [
      { value: 's', label: 'کوچک' },
      { value: 'm', label: 'متوسط' },
      { value: 'l', label: 'بزرگ' },
    ],
  },
};

export const Minimal: Story = {
  args: {
    label: 'رنگ',
    variant: 'minimal',
    options: [
      { value: 'rose', label: 'رز' },
      { value: 'peach', label: 'هلویی' },
      { value: 'mint', label: 'نعنایی' },
    ],
  },
};
