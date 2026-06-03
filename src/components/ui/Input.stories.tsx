import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Input from './Input';

const meta: Meta<typeof Input> = {
  title: 'Design System/Input',
  component: Input,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    helperText: {
      control: 'text',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Customer name',
    placeholder: 'Alex Morgan',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Email',
    placeholder: 'alex@example.com',
    helperText: 'Used for order updates.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Password',
    error: 'Password must be at least 8 characters.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled field',
    placeholder: 'Unavailable',
    disabled: true,
  },
};

export const FormExample: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <Input label="Name" placeholder="Alex Morgan" />
      <Input label="Email" type="email" placeholder="alex@example.com" />
      <Input
        label="Password"
        type="password"
        placeholder="Password"
        helperText="Use at least 8 characters."
      />
    </div>
  ),
};
