import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import ButtonV2 from './Button';

const PlusIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const ArrowIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 8l4 4m0 0l-4 4m4-4H3"
    />
  </svg>
);

const meta: Meta<typeof ButtonV2> = {
  title: 'UI v2/Button',
  component: ButtonV2,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A refined button component with clean minimalist aesthetics and purposeful interactions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Expand to full container width',
    },
  },
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ButtonV2>;

// Primary variants
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'دکمه اصلی',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'دکمه ثانویه',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'دکمه خطی',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'دکمه شفاف',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'حذف',
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'کوچک',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'متوسط',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'بزرگ',
  },
};

// States
export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'در حال ارسال',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'غیرفعال',
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'تمام عرض',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

// With icons
export const WithIconStart: Story = {
  args: {
    children: 'افزودن',
    icon: <PlusIcon />,
    iconPosition: 'start',
  },
};

export const WithIconEnd: Story = {
  args: {
    children: 'ادامه',
    icon: <ArrowIcon />,
    iconPosition: 'end',
  },
};

// Showcase all variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-[#f8f9fa] rounded-xl">
      <div className="flex flex-wrap items-center gap-3">
        <ButtonV2 variant="primary">اصلی</ButtonV2>
        <ButtonV2 variant="secondary">ثانویه</ButtonV2>
        <ButtonV2 variant="outline">خطی</ButtonV2>
        <ButtonV2 variant="ghost">شفاف</ButtonV2>
        <ButtonV2 variant="danger">خطر</ButtonV2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonV2 size="sm">کوچک</ButtonV2>
        <ButtonV2 size="md">متوسط</ButtonV2>
        <ButtonV2 size="lg">بزرگ</ButtonV2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonV2 icon={<PlusIcon />}>با آیکون</ButtonV2>
        <ButtonV2 isLoading>در حال بارگذاری</ButtonV2>
        <ButtonV2 disabled>غیرفعال</ButtonV2>
      </div>
    </div>
  ),
};

// Comparison with old design
export const ComparisonWithOld: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h3 className="text-sm font-medium text-[#868e96] mb-3">
          New Design (v2)
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonV2 variant="primary">اصلی</ButtonV2>
          <ButtonV2 variant="secondary">ثانویه</ButtonV2>
          <ButtonV2 variant="outline">خطی</ButtonV2>
          <ButtonV2 variant="ghost">شفاف</ButtonV2>
          <ButtonV2 variant="danger">خطر</ButtonV2>
        </div>
      </div>
      <div className="border-t border-[#e9ecef] pt-8">
        <h3 className="text-sm font-medium text-[#868e96] mb-3">
          Key Differences
        </h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>• استفاده از رنگ‌های خنثی به جای آبی تیره</li>
          <li>• انیمیشن ظریف هنگام کلیک (scale)</li>
          <li>• سایه نرم‌تر و طبیعی‌تر</li>
          <li>• گوشه‌های کمتر گرد (بیشتر هندسی)</li>
          <li>• پدینگ و ارتفاع بهینه‌شده</li>
        </ul>
      </div>
    </div>
  ),
};
