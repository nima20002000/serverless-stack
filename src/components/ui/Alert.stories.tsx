import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Alert from './Alert';

const noop = () => {};

const meta: Meta<typeof Alert> = {
  title: 'Design System/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
    },
    showIcon: {
      control: 'boolean',
    },
    title: {
      control: 'text',
    },
  },
  args: {
    onClose: undefined,
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: {
    type: 'info',
    children: 'Inventory sync is running in the background.',
  },
};

export const Success: Story = {
  args: {
    type: 'success',
    children: 'The order was updated successfully.',
  },
};

export const Warning: Story = {
  args: {
    type: 'warning',
    children: 'This product has limited stock.',
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    children: 'The payment could not be completed.',
  },
};

export const WithTitle: Story = {
  args: {
    type: 'success',
    title: 'Order confirmed',
    children: 'A confirmation email will be sent to the customer.',
  },
};

export const Dismissible: Story = {
  args: {
    type: 'info',
    children: 'This message can be dismissed.',
    onClose: noop,
  },
};

export const WithoutIcon: Story = {
  args: {
    type: 'warning',
    children: 'This warning is shown without an icon.',
    showIcon: false,
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <Alert type="info">Informational message</Alert>
      <Alert type="success">Success message</Alert>
      <Alert type="warning">Warning message</Alert>
      <Alert type="error">Error message</Alert>
    </div>
  ),
};
