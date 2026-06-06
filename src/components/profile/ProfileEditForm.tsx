'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidName,
} from '@/lib/utils/text';
import { validateShippingAddress } from '@/lib/shipping-address';

interface ProfileEditFormProps {
  initialData: {
    name: string;
    email: string;
    phone: string;
    shippingAddress: string;
    shippingCountry: string;
    shippingRegion: string;
    shippingCity: string;
    shippingAddressLine1: string;
    shippingAddressLine2: string;
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

    const hasStructuredAddressInput = [
      formData.shippingCountry,
      formData.shippingRegion,
      formData.shippingCity,
      formData.shippingAddressLine2,
    ].some((value) => value.trim());
    const hasChangedLegacyLine1 =
      formData.shippingAddressLine1.trim() !== '' &&
      formData.shippingAddressLine1.trim() !==
        initialData.shippingAddress.trim();
    const shippingAddressResult =
      hasStructuredAddressInput || hasChangedLegacyLine1
        ? validateShippingAddress(formData)
        : null;

    if (shippingAddressResult && !shippingAddressResult.valid) {
      onValidationError(shippingAddressResult.error);
      return;
    }

    // Normalize phone before sending
    const normalizedData = {
      ...formData,
      phone: formData.phone
        ? normalizePhoneNumber(formData.phone)
        : formData.phone,
      ...(shippingAddressResult?.valid
        ? {
            shippingAddress: shippingAddressResult.address.shippingAddress,
            shippingCountry: shippingAddressResult.address.shippingCountry,
            shippingRegion: shippingAddressResult.address.shippingRegion,
            shippingCity: shippingAddressResult.address.shippingCity,
            shippingAddressLine1:
              shippingAddressResult.address.shippingAddressLine1,
            shippingAddressLine2:
              shippingAddressResult.address.shippingAddressLine2,
            postalCode: shippingAddressResult.address.postalCode,
          }
        : {}),
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
      <Input
        label="Country"
        type="text"
        value={formData.shippingCountry}
        onChange={(e) =>
          setFormData({ ...formData, shippingCountry: e.target.value })
        }
        autoComplete="country-name"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="City"
          type="text"
          value={formData.shippingCity}
          onChange={(e) =>
            setFormData({ ...formData, shippingCity: e.target.value })
          }
          autoComplete="address-level2"
        />
        <Input
          label="State, region, or province"
          type="text"
          value={formData.shippingRegion}
          onChange={(e) =>
            setFormData({ ...formData, shippingRegion: e.target.value })
          }
          autoComplete="address-level1"
        />
      </div>
      <Input
        label="Address line 1"
        type="text"
        value={formData.shippingAddressLine1}
        onChange={(e) =>
          setFormData({
            ...formData,
            shippingAddressLine1: e.target.value,
            shippingAddress: e.target.value,
          })
        }
        autoComplete="address-line1"
      />
      <Input
        label="Address line 2"
        type="text"
        value={formData.shippingAddressLine2}
        onChange={(e) =>
          setFormData({ ...formData, shippingAddressLine2: e.target.value })
        }
        autoComplete="address-line2"
      />
      <Input
        label="Postal or ZIP code"
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
