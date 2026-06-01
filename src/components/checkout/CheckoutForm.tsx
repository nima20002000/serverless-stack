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
  isValidIranianPhone,
  isValidName,
} from '@/lib/utils/persian';
import { useCheckoutStore } from '@/store/checkout-store';

interface CheckoutFormProps {
  session: Session | null;
  onSubmit: (data: {
    fullName: string;
    phone: string;
    email: string;
    shippingAddress: string;
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
  const {
    formData: savedFormData,
    setFormData: saveFormData,
    _hasHydrated,
  } = useCheckoutStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
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
        setPostalCode(savedFormData.postalCode || '');

        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            if (data.shippingAddress) setShippingAddress(data.shippingAddress);
            if (data.postalCode) setPostalCode(data.postalCode);
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
      postalCode,
    });
  }, [
    fullName,
    phone,
    email,
    shippingAddress,
    postalCode,
    hasLoadedSavedData,
    saveFormData,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('لطفاً نام و نام خانوادگی خود را وارد کنید');
      return;
    }

    if (fullName.trim() && !isValidName(fullName)) {
      setFormError('نام و نام خانوادگی باید شامل حروف فارسی یا انگلیسی باشد');
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!phone.trim() || !isValidIranianPhone(normalizedPhone)) {
      setFormError(
        'لطفاً یک شماره تلفن معتبر وارد کنید (از اعداد فارسی یا انگلیسی استفاده کنید)'
      );
      return;
    }

    if (!shippingAddress.trim()) {
      setFormError('لطفاً آدرس ارسال را وارد کنید');
      return;
    }

    onSubmit({
      fullName,
      phone: normalizedPhone,
      email,
      shippingAddress,
      postalCode,
    });
  };

  if (!_hasHydrated || (isLoadingProfile && session)) {
    if (compact) {
      return (
        <div className="text-center py-8 text-slate-500">
          در حال بارگذاری...
        </div>
      );
    }
    return (
      <Card className="mt-6">
        <div className="text-center py-8 text-slate-500">
          در حال بارگذاری...
        </div>
      </Card>
    );
  }

  const isLoggedIn = !!session;
  const hasProfileName = !!(isLoggedIn && initialProfileData.name);
  const hasProfilePhone = !!(isLoggedIn && initialProfileData.phone);
  const hasProfileEmail = !!(isLoggedIn && initialProfileData.email);

  const textareaClassName = [
    'w-full min-h-[96px] px-4 py-2',
    'text-slate-900 text-sm text-right placeholder:text-slate-400',
    'bg-white border border-slate-200 rounded-2xl',
    'focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100/80',
    'transition-all duration-200 ease-out',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500',
    'dark:focus:border-slate-500 dark:focus:ring-slate-700/60',
  ].join(' ');

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
          label="نام و نام خانوادگی *"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          dir="rtl"
          disabled={hasProfileName}
        />
        {hasProfileName && (
          <p className="text-sm text-slate-500 text-right mt-2">
            💡 برای تغییر نام، به{' '}
            <Link href="/profile" className="underline hover:text-slate-700">
              صفحه پروفایل
            </Link>{' '}
            مراجعه کنید
          </p>
        )}
      </div>

      <div>
        <Input
          id="phone"
          name="phone"
          label="شماره تلفن *"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09123456789"
          required
          dir="ltr"
          disabled={hasProfilePhone}
          autoComplete="off"
        />
        {hasProfilePhone && (
          <p className="text-sm text-slate-500 text-right mt-2">
            💡 برای تغییر شماره تلفن، به{' '}
            <Link href="/profile" className="underline hover:text-slate-700">
              صفحه پروفایل
            </Link>{' '}
            مراجعه کنید
          </p>
        )}
      </div>

      <div>
        <Input
          id="email"
          label="ایمیل (اختیاری)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          disabled={hasProfileEmail}
        />
        {hasProfileEmail && (
          <p className="text-sm text-slate-500 text-right mt-2">
            💡 برای تغییر ایمیل، به{' '}
            <Link href="/profile" className="underline hover:text-slate-700">
              صفحه پروفایل
            </Link>{' '}
            مراجعه کنید
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="shippingAddress"
          className="block text-sm font-medium text-slate-700 text-right mb-2"
        >
          آدرس ارسال *
        </label>
        <textarea
          id="shippingAddress"
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          rows={3}
          className={`${textareaClassName} resize-none`}
          required
          dir="rtl"
        />
      </div>

      <div>
        <Input
          id="postalCode"
          label="کد پستی (اختیاری)"
          type="text"
          value={postalCode}
          onChange={(e) =>
            setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 10))
          }
          placeholder="1234567890"
          maxLength={10}
          dir="ltr"
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-800 text-right">
          📦 هزینه ارسال به صورت پس کرایه درب منزل محاسبه خواهد شد.
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
          پرداخت
        </Button>
      )}
    </form>
  );

  if (compact) return formContent;

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-bold text-slate-900 text-right mb-4 border-b border-slate-100 pb-3">
        اطلاعات ارسال
      </h2>
      {formContent}
    </Card>
  );
}
