import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton, SkeletonText, SkeletonImage } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular'],
      description: 'Shape variant',
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
      description: 'Animation type',
    },
    width: {
      control: 'text',
      description: 'Width of the skeleton',
    },
    height: {
      control: 'text',
      description: 'Height of the skeleton',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: 200,
    height: 100,
  },
};

export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 64,
    height: 64,
  },
};

export const Text: Story = {
  args: {
    variant: 'text',
    width: '100%',
    height: 16,
  },
};

export const PulseAnimation: Story = {
  args: {
    variant: 'rectangular',
    width: 200,
    height: 100,
    animation: 'pulse',
  },
};

export const NoAnimation: Story = {
  args: {
    variant: 'rectangular',
    width: 200,
    height: 100,
    animation: 'none',
  },
};

export const TextLines: StoryObj<typeof SkeletonText> = {
  render: () => (
    <div className="max-w-md">
      <SkeletonText lines={3} />
    </div>
  ),
};

export const ImageSkeleton: StoryObj<typeof SkeletonImage> = {
  render: () => (
    <div className="w-48">
      <SkeletonImage aspectRatio="4/5" />
    </div>
  ),
};

export const ProductCardSkeleton: Story = {
  render: () => (
    <div className="w-64 bg-white rounded-lg shadow-md p-4 space-y-4">
      <SkeletonImage aspectRatio="1/1" />
      <SkeletonText lines={2} />
      <Skeleton variant="text" height={24} width="40%" />
    </div>
  ),
};

export const ProfileSkeleton: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={64} height={64} />
      <div className="flex-1">
        <Skeleton variant="text" height={20} width="60%" className="mb-2" />
        <Skeleton variant="text" height={16} width="40%" />
      </div>
    </div>
  ),
};

export const TableRowSkeleton: Story = {
  render: () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white rounded-lg"
        >
          <Skeleton variant="rectangular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={16} width="70%" />
            <Skeleton variant="text" height={14} width="40%" />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  ),
};
