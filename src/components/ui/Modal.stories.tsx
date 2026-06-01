import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';

const noop = () => {};

const meta: Meta<typeof Modal> = {
  title: 'Design System/Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl'],
    },
    isOpen: {
      control: 'boolean',
    },
    title: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: noop,
    title: 'Edit product',
    children: (
      <p className="text-muted-foreground">
        Modal content can contain forms, summaries, or confirmation details.
      </p>
    ),
  },
};

export const Small: Story = {
  args: {
    isOpen: true,
    onClose: noop,
    title: 'Small modal',
    size: 'sm',
    children: <p className="text-muted-foreground">Compact dialog content.</p>,
  },
};

export const ConfirmationDialog: Story = {
  args: {
    isOpen: true,
    onClose: noop,
    title: 'Delete item',
    size: 'sm',
    children: (
      <div className="space-y-4">
        <p className="text-muted-foreground">This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </div>
      </div>
    ),
  },
};

export const FormModal: Story = {
  args: {
    isOpen: true,
    onClose: noop,
    title: 'Customer details',
    size: 'md',
    children: (
      <div className="space-y-4">
        <Input label="Name" placeholder="Alex Morgan" />
        <Input label="Email" type="email" placeholder="alex@example.com" />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Save</Button>
        </div>
      </div>
    ),
  },
};

const InteractiveModalComponent = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>Open modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Interactive modal"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Close the modal with the button, backdrop, or Escape key.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveModalComponent />,
};
