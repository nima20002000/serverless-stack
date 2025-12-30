import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Input from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text above the input',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    helperText: {
      control: 'text',
      description: 'Helper text below the input',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel'],
      description: 'Input type',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'متن خود را وارد کنید...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'نام کاربری',
    placeholder: 'نام کاربری را وارد کنید',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'ایمیل',
    placeholder: 'example@email.com',
    helperText: 'ایمیل شما با کسی به اشتراک گذاشته نمی‌شود.',
  },
};

export const WithError: Story = {
  args: {
    label: 'رمز عبور',
    type: 'password',
    placeholder: 'رمز عبور را وارد کنید',
    error: 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'فیلد غیرفعال',
    placeholder: 'این فیلد غیرفعال است',
    disabled: true,
  },
};

export const Email: Story = {
  args: {
    label: 'آدرس ایمیل',
    type: 'email',
    placeholder: 'email@example.com',
  },
};

export const Password: Story = {
  args: {
    label: 'رمز عبور',
    type: 'password',
    placeholder: '••••••••',
  },
};

export const Phone: Story = {
  args: {
    label: 'شماره تلفن',
    type: 'tel',
    placeholder: '۰۹۱۲۳۴۵۶۷۸۹',
  },
};

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Input label="نام" placeholder="نام خود را وارد کنید" />
      <Input label="ایمیل" type="email" placeholder="email@example.com" />
      <Input
        label="رمز عبور"
        type="password"
        placeholder="رمز عبور"
        helperText="حداقل ۸ کاراکتر"
      />
    </div>
  ),
};
