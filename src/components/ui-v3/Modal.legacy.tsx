'use client';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import ModalV3, { ModalFooter } from './Modal';
import ButtonV3 from './Button';
import InputV3 from './Input';
import SelectV3 from './Select';

const meta: Meta<typeof ModalV3> = {
  title: 'Design System v3 (Girlish)/Modal',
  component: ModalV3,
  parameters: {
    layout: 'fullscreen',
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
};

export default meta;
type Story = StoryObj<typeof ModalV3>;

export const Default: Story = {
  render: () => {
    const ModalDemo = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div className="p-8 text-center">
          <ButtonV3 onClick={() => setIsOpen(true)}>باز کردن مودال</ButtonV3>
          <ModalV3
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="عنوان مودال"
            description="توضیحات مختصر درباره محتوای مودال"
          >
            <p className="text-rose-700 text-right">
              این یک نمونه از مودال است. می‌توانید هر محتوایی را در اینجا قرار
              دهید.
            </p>
          </ModalV3>
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
          <ButtonV3 onClick={() => setIsOpen(true)}>ویرایش پروفایل</ButtonV3>
          <ModalV3
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="ویرایش پروفایل"
            description="اطلاعات حساب کاربری خود را ویرایش کنید"
          >
            <div className="space-y-4">
              <InputV3 label="نام" defaultValue="سارا" variant="filled" />
              <InputV3
                label="نام خانوادگی"
                defaultValue="احمدی"
                variant="filled"
              />
              <InputV3
                label="ایمیل"
                defaultValue="sara@example.com"
                variant="filled"
              />
              <SelectV3
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
              <ButtonV3 variant="ghost" onClick={() => setIsOpen(false)}>
                انصراف
              </ButtonV3>
              <ButtonV3 onClick={() => setIsOpen(false)}>
                ذخیره تغییرات
              </ButtonV3>
            </ModalFooter>
          </ModalV3>
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
          <ButtonV3 variant="danger" onClick={() => setIsOpen(true)}>
            حذف حساب
          </ButtonV3>
          <ModalV3
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="تایید حذف"
            size="sm"
          >
            <p className="text-rose-700 text-right">
              آیا مطمئن هستید که می‌خواهید حساب کاربری خود را حذف کنید؟ این
              عملیات قابل بازگشت نیست.
            </p>
            <ModalFooter>
              <ButtonV3 variant="ghost" onClick={() => setIsOpen(false)}>
                انصراف
              </ButtonV3>
              <ButtonV3 variant="danger" onClick={() => setIsOpen(false)}>
                حذف
              </ButtonV3>
            </ModalFooter>
          </ModalV3>
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
          <ButtonV3 onClick={() => setIsOpen(true)}>مشاهده جزئیات</ButtonV3>
          <ModalV3
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
              <ButtonV3 variant="ghost" onClick={() => setIsOpen(false)}>
                بستن
              </ButtonV3>
              <ButtonV3>پیگیری سفارش</ButtonV3>
            </ModalFooter>
          </ModalV3>
        </div>
      );
    };
    return <LargeModalDemo />;
  },
};
