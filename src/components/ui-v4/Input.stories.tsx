import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import InputV4 from './Input';

const meta: Meta<typeof InputV4> = {
  title: 'Design System v4 (Girlish)/Input',
  component: InputV4,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'filled', 'minimal'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof InputV4>;

export const Default: Story = {
  args: {
    label: 'نام',
    placeholder: 'نام خود را وارد کنید',
  },
};

export const Filled: Story = {
  args: {
    label: 'ایمیل',
    placeholder: 'example@kitia.ir',
    variant: 'filled',
  },
};

export const Minimal: Story = {
  args: {
    label: 'جستجو',
    placeholder: 'جستجو...',
    variant: 'minimal',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'جستجو',
    placeholder: 'نام محصول',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
};

export const Error: Story = {
  args: {
    label: 'ایمیل',
    placeholder: 'example@kitia.ir',
    error: 'ایمیل نامعتبر است',
  },
};
