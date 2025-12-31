import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SelectV2 from './Select';

const CategoryIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h7"
    />
  </svg>
);

const cityOptions = [
  { value: 'tehran', label: 'تهران' },
  { value: 'mashhad', label: 'مشهد' },
  { value: 'isfahan', label: 'اصفهان' },
  { value: 'shiraz', label: 'شیراز' },
  { value: 'tabriz', label: 'تبریز' },
];

const categoryOptions = [
  { value: 'electronics', label: 'الکترونیک' },
  { value: 'clothing', label: 'پوشاک' },
  { value: 'home', label: 'خانه و آشپزخانه' },
  { value: 'sports', label: 'ورزشی' },
  { value: 'books', label: 'کتاب', disabled: true },
];

const meta: Meta<typeof SelectV2> = {
  title: 'UI v2/Select',
  component: SelectV2,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A clean select dropdown with refined styling and clear visual hierarchy.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: {
      control: 'text',
      description: 'Select label',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    helperText: {
      control: 'text',
      description: 'Helper text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the select',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SelectV2>;

export const Default: Story = {
  args: {
    options: cityOptions,
    placeholder: 'شهر را انتخاب کنید',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'شهر',
    options: cityOptions,
    placeholder: 'انتخاب کنید...',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'استان',
    options: cityOptions,
    placeholder: 'انتخاب کنید',
    helperText: 'استان محل سکونت فعلی',
  },
};

export const WithError: Story = {
  args: {
    label: 'دسته‌بندی',
    options: categoryOptions,
    placeholder: 'انتخاب کنید',
    error: 'انتخاب دسته‌بندی الزامی است',
  },
};

export const Disabled: Story = {
  args: {
    label: 'وضعیت',
    options: [
      { value: 'active', label: 'فعال' },
      { value: 'inactive', label: 'غیرفعال' },
    ],
    defaultValue: 'active',
    disabled: true,
  },
};

export const WithDisabledOption: Story = {
  args: {
    label: 'دسته‌بندی',
    options: categoryOptions,
    placeholder: 'انتخاب کنید',
    helperText: 'گزینه "کتاب" در حال حاضر غیرفعال است',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'دسته‌بندی',
    options: categoryOptions,
    placeholder: 'انتخاب کنید',
    icon: <CategoryIcon />,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-[#f8f9fa] rounded-xl w-80">
      <SelectV2
        label="حالت عادی"
        options={cityOptions}
        placeholder="انتخاب کنید"
      />
      <SelectV2
        label="با راهنما"
        options={cityOptions}
        placeholder="انتخاب کنید"
        helperText="شهر مقصد ارسال"
      />
      <SelectV2
        label="با خطا"
        options={cityOptions}
        placeholder="انتخاب کنید"
        error="این فیلد الزامی است"
      />
      <SelectV2
        label="با آیکون"
        options={categoryOptions}
        placeholder="انتخاب کنید"
        icon={<CategoryIcon />}
      />
      <SelectV2
        label="غیرفعال"
        options={cityOptions}
        defaultValue="tehran"
        disabled
      />
    </div>
  ),
};

export const ComparisonWithOld: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h3 className="text-sm font-medium text-[#868e96] mb-4">
          New Design (v2)
        </h3>
        <div className="flex flex-col gap-4 w-80">
          <SelectV2
            label="شهر"
            options={cityOptions}
            placeholder="انتخاب کنید"
          />
          <SelectV2
            label="با خطا"
            options={cityOptions}
            error="انتخاب الزامی است"
          />
        </div>
      </div>
      <div className="border-t border-[#e9ecef] pt-8">
        <h3 className="text-sm font-medium text-[#868e96] mb-3">
          Key Differences
        </h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>• آیکون chevron سفارشی</li>
          <li>• ارتفاع یکسان با Input (44px)</li>
          <li>• پشتیبانی از آیکون سفارشی</li>
          <li>• پشتیبانی از گزینه‌های غیرفعال</li>
          <li>• استایل فوکوس یکپارچه با Input</li>
        </ul>
      </div>
    </div>
  ),
};
