import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import InputV2 from './Input';

const SearchIcon = () => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const EmailIcon = () => (
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
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const meta: Meta<typeof InputV2> = {
  title: 'UI v2/Input',
  component: InputV2,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A clean, minimal input field with refined focus states and clear feedback.',
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
      description: 'Input label',
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
      description: 'Disable the input',
    },
  },
};

export default meta;
type Story = StoryObj<typeof InputV2>;

export const Default: Story = {
  args: {
    placeholder: 'متن را وارد کنید...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'نام کامل',
    placeholder: 'نام و نام خانوادگی',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'ایمیل',
    placeholder: 'example@email.com',
    helperText: 'ایمیل شما به کسی نشان داده نمی‌شود',
  },
};

export const WithError: Story = {
  args: {
    label: 'رمز عبور',
    type: 'password',
    placeholder: '********',
    error: 'رمز عبور باید حداقل ۸ کاراکتر باشد',
    defaultValue: '123',
  },
};

export const Disabled: Story = {
  args: {
    label: 'فیلد غیرفعال',
    placeholder: 'قابل ویرایش نیست',
    disabled: true,
    defaultValue: 'مقدار ثابت',
  },
};

export const WithIconEnd: Story = {
  args: {
    label: 'جستجو',
    placeholder: 'جستجو کنید...',
    icon: <SearchIcon />,
    iconPosition: 'end',
  },
};

export const WithIconStart: Story = {
  args: {
    label: 'ایمیل',
    placeholder: 'آدرس ایمیل',
    icon: <EmailIcon />,
    iconPosition: 'start',
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-[#f8f9fa] rounded-xl w-80">
      <InputV2 label="حالت عادی" placeholder="متن را وارد کنید" />
      <InputV2
        label="با راهنما"
        placeholder="شماره تماس"
        helperText="شماره موبایل ۱۱ رقمی"
      />
      <InputV2
        label="با خطا"
        placeholder="ایمیل"
        defaultValue="invalid-email"
        error="فرمت ایمیل صحیح نیست"
      />
      <InputV2 label="با آیکون" placeholder="جستجو..." icon={<SearchIcon />} />
      <InputV2
        label="غیرفعال"
        placeholder="غیرفعال"
        disabled
        defaultValue="مقدار ثابت"
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
          <InputV2
            label="نام کاربری"
            placeholder="نام کاربری خود را وارد کنید"
          />
          <InputV2
            label="با خطا"
            defaultValue="test"
            error="این فیلد الزامی است"
          />
        </div>
      </div>
      <div className="border-t border-[#e9ecef] pt-8">
        <h3 className="text-sm font-medium text-[#868e96] mb-3">
          Key Differences
        </h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>• فوکوس با رینگ خاکستری تیره به جای آبی</li>
          <li>• ارتفاع ثابت ۴۴px برای یکپارچگی</li>
          <li>• پشتیبانی از آیکون در دو جهت</li>
          <li>• انتقال نرم‌تر حالت‌ها</li>
          <li>• placeholder با رنگ ملایم‌تر</li>
        </ul>
      </div>
    </div>
  ),
};
