import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SkeletonV3, {
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonProduct,
} from './Skeleton';

const meta: Meta<typeof SkeletonV3> = {
  title: 'Design System v3 (Girlish)/Skeleton',
  component: SkeletonV3,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'rose',
      values: [
        {
          name: 'rose',
          value:
            'linear-gradient(135deg, #fff1f2 0%, #ffffff 50%, #fce7f3 100%)',
        },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular', 'rounded'],
    },
    animation: {
      control: 'select',
      options: ['shimmer', 'pulse', 'none'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof SkeletonV3>;

export const Text: Story = {
  args: {
    variant: 'text',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 60,
    height: 60,
  },
};

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: 300,
    height: 200,
  },
};

export const Rounded: Story = {
  args: {
    variant: 'rounded',
    width: 300,
    height: 100,
  },
};

export const ShimmerAnimation: Story = {
  args: {
    variant: 'rounded',
    animation: 'shimmer',
    width: 300,
    height: 100,
  },
};

export const PulseAnimation: Story = {
  args: {
    variant: 'rounded',
    animation: 'pulse',
    width: 300,
    height: 100,
  },
};

export const NoAnimation: Story = {
  args: {
    variant: 'rounded',
    animation: 'none',
    width: 300,
    height: 100,
  },
};

export const TextBlock: Story = {
  render: () => <SkeletonText lines={4} />,
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Avatar: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <SkeletonAvatar size={40} />
      <SkeletonAvatar size={50} />
      <SkeletonAvatar size={60} />
    </div>
  ),
};

export const ProfileSkeleton: Story = {
  render: () => (
    <div className="flex gap-4 items-center p-4 bg-white rounded-2xl border border-rose-100 w-80">
      <SkeletonAvatar size={50} />
      <div className="flex-1 space-y-2">
        <SkeletonV3 variant="text" width="70%" />
        <SkeletonV3 variant="text" width="50%" />
      </div>
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => <SkeletonCard />,
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const ProductSkeleton: Story = {
  render: () => <SkeletonProduct />,
  decorators: [
    (Story) => (
      <div style={{ width: '280px' }}>
        <Story />
      </div>
    ),
  ],
};

export const ProductGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-6">
      <SkeletonProduct />
      <SkeletonProduct />
      <SkeletonProduct />
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '900px' }}>
        <Story />
      </div>
    ),
  ],
};

export const FormSkeleton: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-white rounded-2xl border border-rose-100 w-80">
      <div className="space-y-2">
        <SkeletonV3 variant="text" width="30%" height={16} />
        <SkeletonV3 variant="rounded" height={48} />
      </div>
      <div className="space-y-2">
        <SkeletonV3 variant="text" width="40%" height={16} />
        <SkeletonV3 variant="rounded" height={48} />
      </div>
      <div className="space-y-2">
        <SkeletonV3 variant="text" width="35%" height={16} />
        <SkeletonV3 variant="rounded" height={48} />
      </div>
      <div className="flex gap-3 pt-4">
        <SkeletonV3 variant="rounded" width={100} height={44} />
        <SkeletonV3 variant="rounded" width={100} height={44} />
      </div>
    </div>
  ),
};
