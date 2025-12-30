import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import Modal from './Modal';
import Button from './Button';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Modal size',
    },
    isOpen: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    title: {
      control: 'text',
      description: 'Modal title',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    title: 'عنوان مودال',
    children: (
      <div className="text-right">
        <p className="text-gray-600">
          این محتوای مودال است. شما می‌توانید هر چیزی را در اینجا قرار دهید.
        </p>
      </div>
    ),
  },
};

export const Small: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    title: 'مودال کوچک',
    size: 'sm',
    children: <p className="text-gray-600">این یک مودال کوچک است.</p>,
  },
};

export const Large: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    title: 'مودال بزرگ',
    size: 'xl',
    children: (
      <div className="text-right space-y-4">
        <p className="text-gray-600">
          این یک مودال بزرگ است که می‌تواند محتوای بیشتری را در خود جای دهد.
        </p>
        <p className="text-gray-600">
          لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ و با استفاده
          از طراحان گرافیک است.
        </p>
      </div>
    ),
  },
};

export const ConfirmationDialog: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    title: 'تایید حذف',
    size: 'sm',
    children: (
      <div className="text-right space-y-4">
        <p className="text-gray-600">
          آیا از حذف این مورد اطمینان دارید؟ این عمل قابل بازگشت نیست.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary">انصراف</Button>
          <Button variant="danger">حذف</Button>
        </div>
      </div>
    ),
  },
};

export const FormModal: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    title: 'ویرایش پروفایل',
    size: 'md',
    children: (
      <div className="text-right space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            نام
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="نام خود را وارد کنید"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ایمیل
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="email@example.com"
          />
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary">انصراف</Button>
          <Button variant="primary">ذخیره</Button>
        </div>
      </div>
    ),
  },
};

const InteractiveModalComponent = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>باز کردن مودال</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="مودال تعاملی"
      >
        <div className="text-right space-y-4">
          <p className="text-gray-600">
            این یک مودال تعاملی است. روی دکمه بستن یا خارج از مودال کلیک کنید تا
            بسته شود.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>بستن</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveModalComponent />,
};
