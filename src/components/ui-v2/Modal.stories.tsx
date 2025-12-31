'use client';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import ModalV2, { ModalFooter } from './Modal';
import ButtonV2 from './Button';
import InputV2 from './Input';
import AlertV2 from './Alert';

const meta: Meta<typeof ModalV2> = {
  title: 'UI v2/Modal',
  component: ModalV2,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A refined modal dialog with smooth animations and accessible focus management.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      description: 'Modal width',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Show close button',
    },
    closeOnBackdrop: {
      control: 'boolean',
      description: 'Close when clicking backdrop',
    },
    closeOnEscape: {
      control: 'boolean',
      description: 'Close when pressing Escape',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ModalV2>;

// Interactive wrapper for stories
const ModalWrapper = ({
  title,
  description,
  size,
  children,
}: {
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
      <ButtonV2 onClick={() => setIsOpen(true)}>باز کردن مودال</ButtonV2>

      <ModalV2
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        size={size}
      >
        {children || (
          <div className="text-right">
            <p className="text-[#495057]">
              این محتوای داخل مودال است. می‌توانید هر چیزی در اینجا قرار دهید.
            </p>
          </div>
        )}
      </ModalV2>
    </div>
  );
};

export const Default: Story = {
  render: () => (
    <ModalWrapper
      title="عنوان مودال"
      description="توضیحات کوتاه درباره محتوای این مودال."
    />
  ),
};

export const Small: Story = {
  render: () => (
    <ModalWrapper title="مودال کوچک" size="sm">
      <p className="text-[#495057] text-right">
        این یک مودال با سایز کوچک است.
      </p>
    </ModalWrapper>
  ),
};

export const Large: Story = {
  render: () => (
    <ModalWrapper title="مودال بزرگ" size="lg">
      <div className="space-y-4 text-right">
        <p className="text-[#495057]">
          این یک مودال با سایز بزرگ است که می‌تواند محتوای بیشتری را در خود جای
          دهد.
        </p>
        <p className="text-[#868e96]">
          مودال‌های بزرگ برای فرم‌های پیچیده یا نمایش اطلاعات جامع مناسب هستند.
        </p>
      </div>
    </ModalWrapper>
  ),
};

export const WithForm: Story = {
  render: () => {
    const FormModal = () => {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
          <ButtonV2 onClick={() => setIsOpen(true)}>ویرایش پروفایل</ButtonV2>

          <ModalV2
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="ویرایش پروفایل"
            description="اطلاعات شخصی خود را ویرایش کنید."
            size="md"
          >
            <div className="space-y-4">
              <InputV2 label="نام" placeholder="نام خود را وارد کنید" />
              <InputV2
                label="ایمیل"
                placeholder="ایمیل خود را وارد کنید"
                type="email"
              />
              <InputV2 label="شماره تماس" placeholder="09xxxxxxxxx" />
            </div>
            <ModalFooter>
              <ButtonV2 variant="ghost" onClick={() => setIsOpen(false)}>
                انصراف
              </ButtonV2>
              <ButtonV2>ذخیره تغییرات</ButtonV2>
            </ModalFooter>
          </ModalV2>
        </div>
      );
    };

    return <FormModal />;
  },
};

export const Confirmation: Story = {
  render: () => {
    const ConfirmModal = () => {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
          <ButtonV2 variant="danger" onClick={() => setIsOpen(true)}>
            حذف حساب
          </ButtonV2>

          <ModalV2
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="تأیید حذف"
            size="sm"
          >
            <div className="space-y-4">
              <AlertV2 type="warning">
                این عملیات غیرقابل بازگشت است. تمام اطلاعات شما حذف خواهد شد.
              </AlertV2>
              <p className="text-[#495057] text-right text-sm">
                آیا مطمئن هستید که می‌خواهید حساب کاربری خود را حذف کنید؟
              </p>
            </div>
            <ModalFooter>
              <ButtonV2 variant="ghost" onClick={() => setIsOpen(false)}>
                انصراف
              </ButtonV2>
              <ButtonV2 variant="danger">حذف حساب</ButtonV2>
            </ModalFooter>
          </ModalV2>
        </div>
      );
    };

    return <ConfirmModal />;
  },
};

export const ScrollableContent: Story = {
  render: () => (
    <ModalWrapper
      title="محتوای طولانی"
      description="این مودال محتوای زیادی دارد"
      size="md"
    >
      <div className="space-y-4 text-right">
        {Array.from({ length: 10 }).map((_, i) => (
          <p key={i} className="text-[#495057]">
            این پاراگراف شماره {i + 1} است. محتوای مودال می‌تواند به اندازه‌ای
            طولانی باشد که نیاز به اسکرول داشته باشد. سیستم به صورت خودکار
            اسکرول را مدیریت می‌کند.
          </p>
        ))}
      </div>
    </ModalWrapper>
  ),
};

export const ComparisonWithOld: Story = {
  render: () => {
    const CompareModal = () => {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fa] p-8 gap-8">
          <ButtonV2 onClick={() => setIsOpen(true)}>مشاهده مودال جدید</ButtonV2>

          <div className="bg-white p-6 rounded-xl border border-[#e9ecef] max-w-md text-right">
            <h3 className="text-sm font-medium text-[#868e96] mb-3">
              Key Differences
            </h3>
            <ul className="text-sm text-[#495057] space-y-2">
              <li>• پس‌زمینه تاریک با blur ظریف</li>
              <li>• انیمیشن slideUp نرم هنگام باز شدن</li>
              <li>• مدیریت فوکوس و دسترسی‌پذیری</li>
              <li>• Portal rendering برای z-index صحیح</li>
              <li>• کامپوننت ModalFooter برای دکمه‌ها</li>
              <li>• سایز‌های بیشتر (sm تا full)</li>
            </ul>
          </div>

          <ModalV2
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="مودال طراحی جدید"
            description="با انیمیشن و دسترسی‌پذیری بهتر"
          >
            <p className="text-[#495057] text-right">
              این مودال با طراحی جدید ساخته شده است و شامل بهبودهای زیادی در UX
              و دسترسی‌پذیری است.
            </p>
            <ModalFooter>
              <ButtonV2 variant="ghost" onClick={() => setIsOpen(false)}>
                بستن
              </ButtonV2>
              <ButtonV2>تأیید</ButtonV2>
            </ModalFooter>
          </ModalV2>
        </div>
      );
    };

    return <CompareModal />;
  },
};
