'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  normalizePhoneNumber,
  isValidIranianPhone,
  isValidName,
} from '@/lib/utils/persian';

interface ProfileEditFormProps {
  initialData: {
    name: string;
    email: string;
    phone: string;
    shippingAddress: string;
    postalCode: string;
  };
  onSave: (data: ProfileEditFormProps['initialData']) => Promise<void>;
  onCancel: () => void;
  isUpdating: boolean;
  onValidationError: (error: string) => void;
}

export default function ProfileEditForm({
  initialData,
  onSave,
  onCancel,
  isUpdating,
  onValidationError,
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState(initialData);
  const textareaClassName = [
    'w-full min-h-[96px] px-4 py-2',
    'text-rose-900 text-sm text-right placeholder:text-rose-300',
    'bg-white border border-rose-200 rounded-2xl',
    'focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/80',
    'transition-all duration-200 ease-out',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500',
    'dark:focus:border-slate-500 dark:focus:ring-slate-700/60',
  ].join(' ');

  const handleSubmit = async () => {
    // Validate name
    if (formData.name.trim() && !isValidName(formData.name)) {
      onValidationError('نام باید شامل حروف فارسی یا انگلیسی باشد');
      return;
    }

    // Validate phone if provided
    if (formData.phone.trim()) {
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      if (!isValidIranianPhone(normalizedPhone)) {
        onValidationError(
          'شماره تلفن نامعتبر است (از اعداد فارسی یا انگلیسی استفاده کنید)'
        );
        return;
      }
    }

    // Normalize phone before sending
    const normalizedData = {
      ...formData,
      phone: formData.phone
        ? normalizePhoneNumber(formData.phone)
        : formData.phone,
    };

    await onSave(normalizedData);
  };

  return (
    <div className="space-y-4 text-right">
      <Input
        label="نام"
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <Input
        label="ایمیل"
        type="email"
        dir="ltr"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <Input
        label="شماره تلفن"
        type="text"
        dir="ltr"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="09xxxxxxxxx"
      />
      <div>
        <label className="block text-sm font-medium text-rose-700 mb-2">
          آدرس ارسال
        </label>
        <textarea
          value={formData.shippingAddress}
          onChange={(e) =>
            setFormData({ ...formData, shippingAddress: e.target.value })
          }
          className={textareaClassName}
          rows={3}
        />
      </div>
      <Input
        label="کد پستی"
        type="text"
        dir="ltr"
        value={formData.postalCode}
        onChange={(e) =>
          setFormData({ ...formData, postalCode: e.target.value })
        }
        placeholder="1234567890"
      />
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isUpdating}>
          انصراف
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isUpdating}>
          {isUpdating ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </Button>
      </div>
    </div>
  );
}
