'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Session } from 'next-auth';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidName,
} from '@/lib/utils/text';
import { validateShippingAddress } from '@/lib/shipping-address';
import { useCheckoutStore } from '@/store/checkout-store';
import { useTranslations } from '@/components/providers/I18nProvider';

interface CheckoutFormProps {
  session: Session | null;
  onSubmit: (data: {
    fullName: string;
    phone: string;
    email: string;
    shippingAddress: string;
    shippingCountry: string;
    shippingRegion: string;
    shippingCity: string;
    shippingAddressLine1: string;
    shippingAddressLine2: string;
    postalCode: string;
  }) => void;
  isProcessing: boolean;
  hideSubmitButton?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  compact?: boolean;
}

export default function CheckoutForm({
  session,
  onSubmit,
  isProcessing,
  hideSubmitButton = false,
  formRef,
  compact = false,
}: CheckoutFormProps) {
  const t = useTranslations();
  const {
    formData: savedFormData,
    setFormData: saveFormData,
    _hasHydrated,
  } = useCheckoutStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCountry, setShippingCountry] = useState('');
  const [shippingRegion, setShippingRegion] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingAddressLine1, setShippingAddressLine1] = useState('');
  const [shippingAddressLine2, setShippingAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  const [loadedProfileForUserId, setLoadedProfileForUserId] = useState<
    string | null
  >(null);

  const [initialProfileData, setInitialProfileData] = useState<{
    name: string | null;
    phone: string | null;
    email: string | null;
  }>({
    name: null,
    phone: null,
    email: null,
  });

  useEffect(() => {
    if (!_hasHydrated) return;

    const currentUserId = session?.user?.id || null;
    if (currentUserId && loadedProfileForUserId === currentUserId) {
      return;
    }

    const loadUserData = async () => {
      if (session?.user) {
        setInitialProfileData({
          name: session.user.name || null,
          phone: session.user.phone || null,
          email: session.user.email || null,
        });

        setFullName(session.user.name || '');
        setPhone(session.user.phone || '');
        setEmail(session.user.email || '');

        setShippingAddress(savedFormData.shippingAddress || '');
        setShippingCountry(savedFormData.shippingCountry || '');
        setShippingRegion(savedFormData.shippingRegion || '');
        setShippingCity(savedFormData.shippingCity || '');
        setShippingAddressLine1(savedFormData.shippingAddressLine1 || '');
        setShippingAddressLine2(savedFormData.shippingAddressLine2 || '');
        setPostalCode(savedFormData.postalCode || '');

        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            setShippingAddress(data.shippingAddress ?? '');
            setShippingCountry(data.shippingCountry ?? '');
            setShippingRegion(data.shippingRegion ?? '');
            setShippingCity(data.shippingCity ?? '');
            setShippingAddressLine1(
              data.shippingAddressLine1 ?? data.shippingAddress ?? ''
            );
            setShippingAddressLine2(data.shippingAddressLine2 ?? '');
            setPostalCode(data.postalCode ?? '');
          }
        } catch (error) {
          console.error('Error loading shipping data:', error);
        }

        setLoadedProfileForUserId(session.user.id);
      } else if (!hasLoadedSavedData) {
        if (savedFormData.fullName) setFullName(savedFormData.fullName);
        if (savedFormData.phone) setPhone(savedFormData.phone);
        if (savedFormData.email) setEmail(savedFormData.email);
        if (savedFormData.shippingAddress)
          setShippingAddress(savedFormData.shippingAddress);
        if (savedFormData.shippingCountry)
          setShippingCountry(savedFormData.shippingCountry);
        if (savedFormData.shippingRegion)
          setShippingRegion(savedFormData.shippingRegion);
        if (savedFormData.shippingCity)
          setShippingCity(savedFormData.shippingCity);
        if (savedFormData.shippingAddressLine1)
          setShippingAddressLine1(savedFormData.shippingAddressLine1);
        if (savedFormData.shippingAddressLine2)
          setShippingAddressLine2(savedFormData.shippingAddressLine2);
        if (savedFormData.postalCode) setPostalCode(savedFormData.postalCode);
      }

      setHasLoadedSavedData(true);
      setIsLoadingProfile(false);
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, _hasHydrated]);

  useEffect(() => {
    if (!hasLoadedSavedData) return;

    saveFormData({
      fullName,
      phone,
      email,
      shippingAddress,
      shippingCountry,
      shippingRegion,
      shippingCity,
      shippingAddressLine1,
      shippingAddressLine2,
      postalCode,
    });
  }, [
    fullName,
    phone,
    email,
    shippingAddress,
    shippingCountry,
    shippingRegion,
    shippingCity,
    shippingAddressLine1,
    shippingAddressLine2,
    postalCode,
    hasLoadedSavedData,
    saveFormData,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError(t('checkout.enterFullName'));
      return;
    }

    if (fullName.trim() && !isValidName(fullName)) {
      setFormError(t('checkout.invalidName'));
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!phone.trim() || !isValidPhoneNumber(normalizedPhone)) {
      setFormError(t('checkout.invalidPhone'));
      return;
    }

    const shippingAddressResult = validateShippingAddress({
      shippingCountry,
      shippingRegion,
      shippingCity,
      shippingAddressLine1,
      shippingAddressLine2,
      postalCode,
      shippingAddress,
    });

    if (!shippingAddressResult.valid) {
      setFormError(
        shippingAddressResult.error.includes('country')
          ? t('validation.shippingCountry')
          : t('validation.addressLine1')
      );
      return;
    }

    onSubmit({
      fullName,
      phone: normalizedPhone,
      email,
      shippingAddress: shippingAddressResult.address.shippingAddress,
      shippingCountry: shippingAddressResult.address.shippingCountry,
      shippingRegion: shippingAddressResult.address.shippingRegion,
      shippingCity: shippingAddressResult.address.shippingCity,
      shippingAddressLine1: shippingAddressResult.address.shippingAddressLine1,
      shippingAddressLine2: shippingAddressResult.address.shippingAddressLine2,
      postalCode: shippingAddressResult.address.postalCode,
    });
  };

  if (!_hasHydrated || (isLoadingProfile && session)) {
    if (compact) {
      return (
        <div className="text-center py-8 text-slate-500">
          {t('common.loading')}
        </div>
      );
    }
    return (
      <Card className="mt-6">
        <div className="text-center py-8 text-slate-500">
          {t('common.loading')}
        </div>
      </Card>
    );
  }

  const isLoggedIn = !!session;
  const hasProfileName = !!(isLoggedIn && initialProfileData.name);
  const hasProfilePhone = !!(isLoggedIn && initialProfileData.phone);
  const hasProfileEmail = !!(isLoggedIn && initialProfileData.email);

  const formContent = (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert type="error" onClose={() => setFormError('')}>
          {formError}
        </Alert>
      )}

      <div>
        <Input
          id="fullName"
          label={t('checkout.fullName')}
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          dir="auto"
          disabled={hasProfileName}
          autoComplete="name"
        />
        {hasProfileName && (
          <p className="text-sm text-slate-500 text-start mt-2">
            {
              t('checkout.profileNameHint', {
                profileLink: t('checkout.profileLink'),
              }).split(t('checkout.profileLink'))[0]
            }
            <Link href="/profile" className="underline hover:text-slate-700">
              {t('checkout.profileLink')}
            </Link>
            {t('checkout.profileNameHint', {
              profileLink: t('checkout.profileLink'),
            }).split(t('checkout.profileLink'))[1] ?? ''}
          </p>
        )}
      </div>

      <div>
        <Input
          id="phone"
          name="phone"
          label={t('checkout.phone')}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+12125551234"
          required
          dir="ltr"
          disabled={hasProfilePhone}
          autoComplete="tel"
        />
        {hasProfilePhone && (
          <p className="text-sm text-slate-500 text-start mt-2">
            {
              t('checkout.profilePhoneHint', {
                profileLink: t('checkout.profileLink'),
              }).split(t('checkout.profileLink'))[0]
            }
            <Link href="/profile" className="underline hover:text-slate-700">
              {t('checkout.profileLink')}
            </Link>
            {t('checkout.profilePhoneHint', {
              profileLink: t('checkout.profileLink'),
            }).split(t('checkout.profileLink'))[1] ?? ''}
          </p>
        )}
      </div>

      <div>
        <Input
          id="email"
          label={t('checkout.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          disabled={hasProfileEmail}
          autoComplete="email"
        />
        {hasProfileEmail && (
          <p className="text-sm text-slate-500 text-start mt-2">
            {
              t('checkout.profileEmailHint', {
                profileLink: t('checkout.profileLink'),
              }).split(t('checkout.profileLink'))[0]
            }
            <Link href="/profile" className="underline hover:text-slate-700">
              {t('checkout.profileLink')}
            </Link>
            {t('checkout.profileEmailHint', {
              profileLink: t('checkout.profileLink'),
            }).split(t('checkout.profileLink'))[1] ?? ''}
          </p>
        )}
      </div>

      <div>
        <Input
          id="shippingCountry"
          label={t('checkout.country')}
          type="text"
          value={shippingCountry}
          onChange={(e) => setShippingCountry(e.target.value)}
          required
          dir="auto"
          autoComplete="country-name"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="shippingCity"
          label={t('checkout.city')}
          type="text"
          value={shippingCity}
          onChange={(e) => setShippingCity(e.target.value)}
          dir="auto"
          autoComplete="address-level2"
        />
        <Input
          id="shippingRegion"
          label={t('checkout.region')}
          type="text"
          value={shippingRegion}
          onChange={(e) => setShippingRegion(e.target.value)}
          dir="auto"
          autoComplete="address-level1"
        />
      </div>

      <div>
        <Input
          id="shippingAddressLine1"
          label={t('checkout.addressLine1')}
          type="text"
          value={shippingAddressLine1}
          onChange={(e) => {
            setShippingAddressLine1(e.target.value);
            setShippingAddress(e.target.value);
          }}
          required
          dir="auto"
          autoComplete="address-line1"
        />
      </div>

      <div>
        <Input
          id="shippingAddressLine2"
          label={t('checkout.addressLine2')}
          type="text"
          value={shippingAddressLine2}
          onChange={(e) => setShippingAddressLine2(e.target.value)}
          dir="auto"
          autoComplete="address-line2"
        />
      </div>

      <div>
        <Input
          id="postalCode"
          label={t('checkout.postalCodeOptional')}
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value.slice(0, 32))}
          placeholder="10001 or SW1A 1AA"
          maxLength={32}
          dir="ltr"
          autoComplete="postal-code"
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-800 text-start">
          {t('checkout.fulfillmentNotice')}
        </p>
      </div>

      {!hideSubmitButton && (
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isProcessing}
          disabled={isProcessing}
        >
          {t('checkout.continueToPayment')}
        </Button>
      )}
    </form>
  );

  if (compact) return formContent;

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-bold text-slate-900 text-start mb-4 border-b border-slate-100 pb-3">
        {t('checkout.shippingInformation')}
      </h2>
      {formContent}
    </Card>
  );
}
