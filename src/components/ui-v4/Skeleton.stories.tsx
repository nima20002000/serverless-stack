import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SkeletonV4, {
  SkeletonText,
  SkeletonAvatar,
  SkeletonProduct,
} from './Skeleton';
import CardV4, { CardHeader, CardTitle, CardContent } from './Card';

const meta: Meta<typeof SkeletonV4> = {
  title: 'Design System v4 (Girlish)/Skeleton',
  component: SkeletonV4,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SkeletonV4>;

export const Basic: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <div>
        <p className="text-sm text-rose-500 mb-2 text-right">متن</p>
        <SkeletonV4 variant="text" />
      </div>
      <div>
        <p className="text-sm text-rose-500 mb-2 text-right">دایره‌ای</p>
        <div className="flex gap-3 justify-end">
          <SkeletonV4 variant="circular" width={40} height={40} />
          <SkeletonV4 variant="circular" width={50} height={50} />
          <SkeletonV4 variant="circular" width={60} height={60} />
        </div>
      </div>
      <div>
        <p className="text-sm text-rose-500 mb-2 text-right">گرد</p>
        <SkeletonV4 variant="rounded" height={100} />
      </div>
    </div>
  ),
};

export const Patterns: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 max-w-3xl">
      <CardV4>
        <CardHeader>
          <CardTitle>پاراگراف</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonText lines={3} />
        </CardContent>
      </CardV4>
      <CardV4>
        <CardHeader>
          <CardTitle>پروفایل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center justify-end">
            <div className="flex-1">
              <SkeletonV4 variant="text" width="60%" className="mb-2" />
              <SkeletonV4 variant="text" width="40%" />
            </div>
            <SkeletonAvatar size={50} />
          </div>
        </CardContent>
      </CardV4>
    </div>
  ),
};

export const ProductCards: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-6 max-w-4xl">
      <SkeletonProduct />
      <SkeletonProduct />
      <SkeletonProduct />
    </div>
  ),
};
