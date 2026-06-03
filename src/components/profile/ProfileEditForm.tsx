'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidName,
} from '@/lib/utils/text';

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
    'text-slate-900 text-sm text-start placeholder:text-slate-400',
    'bg-white border border-slate-200 rounded-lg',
    'focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100/80',
    'transition-all duration-200 ease-out',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500',
    'dark:focus:border-slate-500 dark:focus:ring-slate-700/60',
  ].join(' ');

  const handleSubmit = async () => {
    // Validate name
    if (formData.name.trim() && !isValidName(formData.name)) {
      onValidationError(
        'Name can contain letters, spaces, hyphens, periods, and apostrophes.'
      );
      return;
    }

    // Validate phone if provided
    if (formData.phone.trim()) {
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      if (!isValidPhoneNumber(normalizedPhone)) {
        onValidationError('Please enter a valid phone number.');
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
    <div className="space-y-4">
      <Input
        label="Name"
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        autoComplete="name"
      />
      <Input
        label="Email"
        type="email"
        dir="ltr"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        autoComplete="email"
      />
      <Input
        label="Phone number"
        type="tel"
        dir="ltr"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="+12125551234"
        autoComplete="tel"
      />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Shipping address
        </label>
        <textarea
          value={formData.shippingAddress}
          onChange={(e) =>
            setFormData({ ...formData, shippingAddress: e.target.value })
          }
          className={textareaClassName}
          rows={3}
          dir="auto"
          autoComplete="street-address"
        />
      </div>
      <Input
        label="Postal code"
        type="text"
        dir="ltr"
        value={formData.postalCode}
        onChange={(e) =>
          setFormData({
            ...formData,
            postalCode: e.target.value.slice(0, 32),
          })
        }
        placeholder="10001 or SW1A 1AA"
        maxLength={32}
        autoComplete="postal-code"
      />
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isUpdating}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
