import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SkeletonV2, {
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
} from './Skeleton';
import CardV2 from './Card';

const meta: Meta<typeof SkeletonV2> = {
  title: 'UI v2/Skeleton',
  component: SkeletonV2,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Loading placeholder components with smooth animations.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular', 'rounded'],
      description: 'Skeleton shape',
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
      description: 'Animation type',
    },
    width: {
      control: 'text',
      description: 'Width (px or %)',
    },
    height: {
      control: 'text',
      description: 'Height (px or %)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SkeletonV2>;

export const Text: Story = {
  args: {
    variant: 'text',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '200px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 48,
    height: 48,
  },
};

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: 200,
    height: 120,
  },
};

export const Rounded: Story = {
  args: {
    variant: 'rounded',
    width: 200,
    height: 120,
  },
};

export const WaveAnimation: Story = {
  args: {
    variant: 'rounded',
    width: 200,
    height: 120,
    animation: 'wave',
  },
};

export const NoAnimation: Story = {
  args: {
    variant: 'rounded',
    width: 200,
    height: 120,
    animation: 'none',
  },
};

export const TextLines: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <SkeletonText lines={4} />
    </div>
  ),
};

export const Avatar: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SkeletonAvatar size={32} />
      <SkeletonAvatar size={40} />
      <SkeletonAvatar size={48} />
      <SkeletonAvatar size={64} />
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="w-72">
      <CardV2 padding="none">
        <SkeletonCard />
      </CardV2>
    </div>
  ),
};

export const ProfileSkeleton: Story = {
  render: () => (
    <CardV2 className="w-80">
      <div className="flex items-center gap-4">
        <div className="flex-1 text-right">
          <SkeletonV2 variant="text" width="60%" className="mb-2" />
          <SkeletonV2 variant="text" width="40%" />
        </div>
        <SkeletonAvatar size={56} />
      </div>
      <div className="mt-6 pt-4 border-t border-[#f1f3f5]">
        <SkeletonText lines={2} />
      </div>
    </CardV2>
  ),
};

export const ProductListSkeleton: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardV2 key={i} padding="none" className="w-48">
          <SkeletonV2 variant="rectangular" height={140} className="w-full" />
          <div className="p-3 space-y-2">
            <SkeletonV2 variant="text" width="70%" />
            <SkeletonV2 variant="text" width="40%" />
            <div className="flex items-center justify-between pt-2">
              <SkeletonV2 variant="rounded" width={60} height={28} />
              <SkeletonV2 variant="text" width="30%" />
            </div>
          </div>
        </CardV2>
      ))}
    </div>
  ),
};

export const TableSkeleton: Story = {
  render: () => (
    <div className="w-full max-w-xl">
      <div className="border border-[#e9ecef] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#f8f9fa] p-4 flex items-center gap-4">
          <SkeletonV2 variant="text" width="20%" />
          <SkeletonV2 variant="text" width="30%" />
          <SkeletonV2 variant="text" width="25%" />
          <SkeletonV2 variant="text" width="15%" />
        </div>
        {/* Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-4 flex items-center gap-4 border-t border-[#f1f3f5]"
          >
            <SkeletonV2 variant="text" width="20%" />
            <SkeletonV2 variant="text" width="30%" />
            <SkeletonV2 variant="text" width="25%" />
            <SkeletonV2 variant="rounded" width={60} height={24} />
          </div>
        ))}
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-6 bg-[#f8f9fa] rounded-xl">
      <div>
        <h4 className="text-sm font-medium text-[#868e96] mb-3 text-right">
          انواع شکل
        </h4>
        <div className="flex items-end gap-4">
          <div className="text-center">
            <SkeletonV2 variant="circular" width={48} height={48} />
            <span className="text-xs text-[#868e96] mt-2 block">دایره</span>
          </div>
          <div className="text-center">
            <SkeletonV2 variant="rectangular" width={80} height={48} />
            <span className="text-xs text-[#868e96] mt-2 block">مستطیل</span>
          </div>
          <div className="text-center">
            <SkeletonV2 variant="rounded" width={80} height={48} />
            <span className="text-xs text-[#868e96] mt-2 block">گرد</span>
          </div>
          <div className="text-center w-32">
            <SkeletonV2 variant="text" />
            <span className="text-xs text-[#868e96] mt-2 block">متن</span>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-[#868e96] mb-3 text-right">
          انواع انیمیشن
        </h4>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <SkeletonV2
              variant="rounded"
              width={80}
              height={48}
              animation="pulse"
            />
            <span className="text-xs text-[#868e96] mt-2 block">pulse</span>
          </div>
          <div className="text-center">
            <SkeletonV2
              variant="rounded"
              width={80}
              height={48}
              animation="wave"
            />
            <span className="text-xs text-[#868e96] mt-2 block">wave</span>
          </div>
          <div className="text-center">
            <SkeletonV2
              variant="rounded"
              width={80}
              height={48}
              animation="none"
            />
            <span className="text-xs text-[#868e96] mt-2 block">
              بدون انیمیشن
            </span>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const ComparisonInfo: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h3 className="text-sm font-medium text-[#868e96] mb-4">
          Skeleton Components
        </h3>
        <div className="flex gap-4">
          <SkeletonAvatar size={48} />
          <div className="flex-1">
            <SkeletonText lines={2} />
          </div>
        </div>
      </div>
      <div className="border-t border-[#e9ecef] pt-8">
        <h3 className="text-sm font-medium text-[#868e96] mb-3">
          Improvements
        </h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>• انیمیشن wave جدید</li>
          <li>
            • کامپوننت‌های آماده (SkeletonText, SkeletonCard, SkeletonAvatar)
          </li>
          <li>• رنگ پس‌زمینه هماهنگ با design system</li>
          <li>• پشتیبانی از سایز دلخواه</li>
          <li>• ۴ نوع شکل مختلف</li>
        </ul>
      </div>
    </div>
  ),
};
