import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Card from './Card';

const meta: Meta<typeof Card> = {
  title: 'Design System/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="mb-2 text-lg font-semibold">Order summary</h3>
        <p className="text-muted-foreground">
          Review subtotal, shipping, taxes, and payment state.
        </p>
      </div>
    ),
  },
};

export const SmallPadding: Story = {
  args: {
    padding: 'sm',
    children: <p className="font-semibold">Compact content</p>,
  },
};

export const MediumPadding: Story = {
  args: {
    padding: 'md',
    children: <p className="font-semibold">Default spacing</p>,
  },
};

export const LargePadding: Story = {
  args: {
    padding: 'lg',
    children: <p className="font-semibold">Roomier content</p>,
  },
};

export const ProductCard: Story = {
  args: {
    children: (
      <div className="text-start">
        <div className="mb-4 flex h-48 items-center justify-center rounded-lg bg-muted">
          <span className="text-muted-foreground">Product image</span>
        </div>
        <h3 className="mb-1 font-semibold">Reusable product</h3>
        <p className="mb-2 text-sm text-muted-foreground">Category</p>
        <p className="text-lg font-bold text-primary">$125.00</p>
      </div>
    ),
  },
};

export const StatsCard: Story = {
  args: {
    children: (
      <div className="text-center">
        <p className="mb-1 text-3xl font-bold text-primary">1,234</p>
        <p className="text-muted-foreground">Orders</p>
      </div>
    ),
  },
};
