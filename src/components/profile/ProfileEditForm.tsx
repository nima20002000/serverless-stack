'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          نام
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ایمیل
        </label>
        <input
          type="email"
          dir="ltr"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          شماره تلفن
        </label>
        <input
          type="text"
          dir="ltr"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="09xxxxxxxxx"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          آدرس ارسال
        </label>
        <textarea
          value={formData.shippingAddress}
          onChange={(e) =>
            setFormData({ ...formData, shippingAddress: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          کد پستی
        </label>
        <input
          type="text"
          dir="ltr"
          value={formData.postalCode}
          onChange={(e) =>
            setFormData({ ...formData, postalCode: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="1234567890"
        />
      </div>
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
