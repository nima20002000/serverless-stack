import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'Button style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
    },
  },
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'دکمه اصلی',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'دکمه ثانویه',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'حذف',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'دکمه شفاف',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'کوچک',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'متوسط',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'بزرگ',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'در حال ارسال',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'غیرفعال',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">اصلی</Button>
      <Button variant="secondary">ثانویه</Button>
      <Button variant="danger">خطر</Button>
      <Button variant="ghost">شفاف</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">کوچک</Button>
      <Button size="md">متوسط</Button>
      <Button size="lg">بزرگ</Button>
    </div>
  ),
};
