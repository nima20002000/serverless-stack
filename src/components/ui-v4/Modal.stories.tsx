'use client';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import ModalV4, { ModalFooter } from './Modal';
import ButtonV4 from './Button';
import InputV4 from './Input';
import SelectV4 from './Select';

const meta: Meta<typeof ModalV4> = {
  title: 'Design System v4 (Girlish)/Modal',
  component: ModalV4,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'blush',
      values: [
        {
          name: 'blush',
          value:
            'radial-gradient(circle at top, #fff1f2 0%, #ffffff 48%, #fce7f3 100%)',
        },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ModalV4>;

export const Default: Story = {
  render: () => {
    const ModalDemo = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div className="p-8 text-center">
          <ButtonV4 onClick={() => setIsOpen(true)}>باز کردن مودال</ButtonV4>
          <ModalV4
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="عنوان مودال"
            description="توضیحات مختصر درباره محتوای مودال"
          >
            <p className="text-rose-700 text-right leading-relaxed">
              این یک نمونه از مودال است. می‌توانید هر محتوایی را در اینجا قرار
              دهید.
            </p>
          </ModalV4>
        </div>
      );
    };
    return <ModalDemo />;
  },
};

export const WithForm: Story = {
  render: () => {
    const FormModalDemo = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div className="p-8 text-center">
          <ButtonV4 onClick={() => setIsOpen(true)}>ویرایش پروفایل</ButtonV4>
          <ModalV4
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="ویرایش پروفایل"
            description="اطلاعات حساب کاربری خود را ویرایش کنید"
          >
            <div className="space-y-4">
              <InputV4 label="نام" defaultValue="سارا" variant="filled" />
              <InputV4
                label="نام خانوادگی"
                defaultValue="احمدی"
                variant="filled"
              />
              <InputV4
                label="ایمیل"
                defaultValue="sara@example.com"
                variant="filled"
              />
              <SelectV4
                label="شهر"
                options={[
                  { value: 'tehran', label: 'تهران' },
                  { value: 'isfahan', label: 'اصفهان' },
                  { value: 'shiraz', label: 'شیراز' },
                ]}
                defaultValue="tehran"
                variant="filled"
              />
            </div>
            <ModalFooter>
              <ButtonV4 variant="ghost" onClick={() => setIsOpen(false)}>
                انصراف
              </ButtonV4>
              <ButtonV4 onClick={() => setIsOpen(false)}>
                ذخیره تغییرات
              </ButtonV4>
            </ModalFooter>
          </ModalV4>
        </div>
      );
    };
    return <FormModalDemo />;
  },
};

export const Confirmation: Story = {
  render: () => {
    const ConfirmModalDemo = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div className="p-8 text-center">
          <ButtonV4 variant="danger" onClick={() => setIsOpen(true)}>
            حذف حساب
          </ButtonV4>
          <ModalV4
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="تایید حذف"
            size="sm"
          >
            <p className="text-rose-700 text-right leading-relaxed">
              آیا مطمئن هستید که می‌خواهید حساب کاربری خود را حذف کنید؟ این
              عملیات قابل بازگشت نیست.
            </p>
            <ModalFooter>
              <ButtonV4 variant="ghost" onClick={() => setIsOpen(false)}>
                انصراف
              </ButtonV4>
              <ButtonV4 variant="danger" onClick={() => setIsOpen(false)}>
                حذف
              </ButtonV4>
            </ModalFooter>
          </ModalV4>
        </div>
      );
    };
    return <ConfirmModalDemo />;
  },
};

export const Large: Story = {
  render: () => {
    const LargeModalDemo = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div className="p-8 text-center">
          <ButtonV4 onClick={() => setIsOpen(true)}>مشاهده جزئیات</ButtonV4>
          <ModalV4
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="جزئیات سفارش"
            description="اطلاعات کامل سفارش شما"
            size="lg"
          >
            <div className="space-y-4 text-right">
              <div className="border-b border-rose-100 pb-4">
                <h4 className="font-semibold text-rose-900 mb-2">محصولات</h4>
                <ul className="space-y-2 text-sm text-rose-700">
                  <li className="flex justify-between">
                    <span>۲۵۰,۰۰۰ تومان</span>
                    <span>پیراهن تابستانی × ۱</span>
                  </li>
                  <li className="flex justify-between">
                    <span>۱۸۰,۰۰۰ تومان</span>
                    <span>کیف دستی × ۱</span>
                  </li>
                </ul>
              </div>
              <div className="border-b border-rose-100 pb-4">
                <h4 className="font-semibold text-rose-900 mb-2">آدرس تحویل</h4>
                <p className="text-sm text-rose-600">
                  تهران، خیابان ولیعصر، کوچه مهتاب، پلاک ۱۲
                </p>
              </div>
              <div className="flex justify-between font-bold text-rose-900">
                <span>۴۳۰,۰۰۰ تومان</span>
                <span>جمع کل:</span>
              </div>
            </div>
            <ModalFooter>
              <ButtonV4 variant="ghost" onClick={() => setIsOpen(false)}>
                بستن
              </ButtonV4>
              <ButtonV4>پیگیری سفارش</ButtonV4>
            </ModalFooter>
          </ModalV4>
        </div>
      );
    };
    return <LargeModalDemo />;
  },
};
