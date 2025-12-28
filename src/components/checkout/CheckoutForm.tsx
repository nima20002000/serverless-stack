'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Session } from 'next-auth';
import { signIn, useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
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
    createAccount: boolean;
    phoneVerified: boolean;
  }) => void;
  isProcessing: boolean;
  hideSubmitButton?: boolean;
  formRef?: React.RefObject<HTMLFormElement>;
}

export default function CheckoutForm({
  session,
  onSubmit,
  isProcessing,
  hideSubmitButton = false,
  formRef,
}: CheckoutFormProps) {
  const { update: updateSession } = useSession();
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
  const [createAccount, setCreateAccount] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false); // Track if user needs to be logged in on payment
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  const [loadedProfileForUserId, setLoadedProfileForUserId] = useState<
    string | null
  >(null);

  // Track initial profile values loaded from database (to determine which fields should be locked)
  const [initialProfileData, setInitialProfileData] = useState<{
    name: string | null;
    phone: string | null;
    email: string | null;
  }>({
    name: null,
    phone: null,
    email: null,
  });

  // Load user data: use session for basic info, fetch API only for shipping data
  // Wait for Zustand hydration before loading saved data
  useEffect(() => {
    // Don't load until Zustand has hydrated from localStorage
    if (!_hasHydrated) return;

    const currentUserId = session?.user?.id || null;

    // Skip if we've already loaded data for this specific user
    if (currentUserId && loadedProfileForUserId === currentUserId) {
      return;
    }

    const loadUserData = async () => {
      if (session?.user) {
        // Use session data directly for basic user info (no API call needed)
        // Session already contains: name, email, phone, isVerified
        setInitialProfileData({
          name: session.user.name || null,
          phone: session.user.phone || null,
          email: session.user.email || null,
        });

        setFullName(session.user.name || '');
        setPhone(session.user.phone || '');
        setEmail(session.user.email || '');

        // If user has a verified phone, mark as verified
        if (session.user.phone && session.user.isVerified) {
          setPhoneVerified(true);
        }

        // Only fetch from API if we need shipping data (not in session)
        // Use saved form data as fallback while fetching
        setShippingAddress(savedFormData.shippingAddress || '');
        setPostalCode(savedFormData.postalCode || '');

        // Fetch shipping data from API in background (non-blocking)
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            // Only update shipping fields if API has data
            if (data.shippingAddress) {
              setShippingAddress(data.shippingAddress);
            }
            if (data.postalCode) {
              setPostalCode(data.postalCode);
            }
          }
        } catch (error) {
          // Non-critical: shipping data fetch failed, user can still enter manually
          console.error('Error loading shipping data:', error);
        }

        // Mark that we've loaded data for this user
        setLoadedProfileForUserId(session.user.id);
      } else if (!hasLoadedSavedData) {
        // Guest user: load saved form data from localStorage (only once)
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

  // Cooldown timer for OTP
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [otpCooldown]);

  // Reset OTP state when createAccount is unchecked
  useEffect(() => {
    if (!createAccount && !session) {
      setOtpSent(false);
      setOtpCode('');
      setPhoneVerified(false);
      setOtpError('');
      setOtpSuccess('');
      setPendingLogin(false);
    }
  }, [createAccount, session]);

  // Save form data to localStorage when fields change (for persistence after failed payments)
  useEffect(() => {
    // Only save after initial data is loaded to prevent overwriting with empty values
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

  const handleSendOTP = async () => {
    // Validate phone - normalize first to handle Persian digits
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!phone || !isValidIranianPhone(normalizedPhone)) {
      setOtpError(
        'لطفاً یک شماره تلفن معتبر وارد کنید (مثال: ۰۹۱۲۳۴۵۶۷۸۹ یا 09123456789)'
      );
      return;
    }

    try {
      setIsSendingOTP(true);
      setOtpError('');
      setOtpSuccess('');

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          purpose: 'checkout', // Special purpose for checkout (allows both existing and new users)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در ارسال کد تایید');
      }

      setOtpSent(true);
      setOtpCooldown(60);
      setOtpSuccess('کد تایید به شماره تلفن شما ارسال شد');
    } catch (error) {
      setOtpError(
        error instanceof Error ? error.message : 'خطا در ارسال کد تایید'
      );
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('لطفاً کد 6 رقمی را وارد کنید');
      return;
    }

    if (!phone) {
      setOtpError('لطفاً شماره تلفن خود را وارد کنید');
      return;
    }

    // Normalize phone before sending
    const normalizedPhone = normalizePhoneNumber(phone);

    try {
      setIsVerifyingOTP(true);
      setOtpError('');
      setOtpSuccess('');

      const response = await fetch('/api/auth/checkout-verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          code: otpCode,
          purpose: 'checkout',
          createAccount: createAccount,
          name: fullName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'کد تایید اشتباه است');
      }

      // Handle different scenarios based on response
      if (data.action === 'login' || data.action === 'register') {
        // Set success message and mark for login on payment
        setPhoneVerified(true);
        setPendingLogin(true);
        setOtpSuccess(
          data.action === 'register'
            ? 'حساب کاربری با موفقیت ایجاد شد! اکنون می‌توانید پرداخت کنید'
            : 'ورود با موفقیت انجام شد! اکنون می‌توانید پرداخت کنید'
        );
        setOtpSent(false);
        setOtpCode('');

        // Store identifier for later login
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pendingLoginIdentifier', data.identifier);
        }
      }
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'خطا در تایید کد');
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setOtpError('');

    // Validation
    if (!fullName.trim()) {
      setOtpError('لطفاً نام و نام خانوادگی خود را وارد کنید');
      return;
    }

    if (fullName.trim() && !isValidName(fullName)) {
      setOtpError('نام و نام خانوادگی باید شامل حروف فارسی یا انگلیسی باشد');
      return;
    }

    // Normalize phone for validation
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!phone.trim() || !isValidIranianPhone(normalizedPhone)) {
      setOtpError(
        'لطفاً یک شماره تلفن معتبر وارد کنید (از اعداد فارسی یا انگلیسی استفاده کنید)'
      );
      return;
    }

    if (!shippingAddress.trim()) {
      setOtpError('لطفاً آدرس ارسال را وارد کنید');
      return;
    }

    // Only require OTP verification if user wants to create account
    if (!session && createAccount && !phoneVerified) {
      setOtpError('لطفاً ابتدا شماره تلفن خود را با کد تایید تایید کنید');
      return;
    }

    // If user verified OTP and needs login, log them in first
    if (pendingLogin && !session && typeof window !== 'undefined') {
      const identifier = sessionStorage.getItem('pendingLoginIdentifier');
      if (identifier) {
        try {
          // Sign in with NextAuth
          const result = await signIn('credentials', {
            identifier: identifier,
            password: '', // Passwordless login (OTP already verified)
            redirect: false,
          });

          if (result?.ok) {
            // Clear pending login state
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('pendingLoginIdentifier');
            }
            setPendingLogin(false);

            // Force NextAuth session to refresh
            await updateSession();

            // Wait a brief moment for session state to propagate
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Now proceed with checkout - session will be available on server
            onSubmit({
              fullName,
              phone,
              email,
              shippingAddress,
              postalCode,
              createAccount: false, // Account already created during OTP verification if needed
              phoneVerified,
            });
            return;
          } else {
            setOtpError('خطا در ورود به حساب کاربری. لطفاً دوباره تلاش کنید.');
            return;
          }
        } catch (error) {
          console.error('Login error:', error);
          setOtpError('خطا در ورود به حساب کاربری');
          return;
        }
      }
    }

    // Proceed with checkout - normalize phone before submitting
    onSubmit({
      fullName,
      phone: normalizedPhone,
      email,
      shippingAddress,
      postalCode,
      createAccount: false, // Account already created during OTP verification if needed
      phoneVerified,
    });
  };

  // Show loading while waiting for hydration or profile data
  if (!_hasHydrated || (isLoadingProfile && session)) {
    return (
      <Card className="mt-6">
        <div className="text-center py-8 text-gray-600">در حال بارگذاری...</div>
      </Card>
    );
  }

  const hasVerifiedPhone = !!(session?.user.phone && session.user.isVerified);
  const isLoggedIn = !!session;

  // Check which fields are already filled in user profile (based on initial data loaded from DB, not current form state)
  const hasProfileName = !!(isLoggedIn && initialProfileData.name);
  const hasProfilePhone = !!(isLoggedIn && initialProfileData.phone);
  const hasProfileEmail = !!(isLoggedIn && initialProfileData.email);

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-bold text-gray-900 text-right mb-4 border-b pb-3">
        اطلاعات ارسال
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* Form-level Error Message - shown for validation errors or when createAccount is off */}
        {otpError && (!createAccount || (createAccount && phoneVerified)) && (
          <Alert type="error" onClose={() => setOtpError('')}>
            {otpError}
          </Alert>
        )}

        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700 text-right mb-2"
          >
            نام و نام خانوادگی <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right ${hasProfileName ? 'bg-gray-100' : ''}`}
            required
            dir="rtl"
            disabled={hasProfileName}
          />
          {hasProfileName && (
            <p className="text-sm text-blue-600 text-right mt-2">
              💡 برای تغییر نام، به{' '}
              <Link href="/profile" className="underline hover:text-blue-800">
                صفحه پروفایل
              </Link>{' '}
              مراجعه کنید
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 text-right mb-2"
          >
            شماره تلفن <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right ${hasProfilePhone ? 'bg-gray-100' : ''}`}
            placeholder="09123456789"
            required
            dir="ltr"
            disabled={hasProfilePhone}
          />
          {hasProfilePhone && (
            <p className="text-sm text-blue-600 text-right mt-2">
              💡 برای تغییر شماره تلفن، به{' '}
              <Link href="/profile" className="underline hover:text-blue-800">
                صفحه پروفایل
              </Link>{' '}
              مراجعه کنید
            </p>
          )}
          {hasVerifiedPhone && !isLoggedIn && (
            <p className="text-sm text-green-600 text-right mt-2">
              ✓ شماره تلفن تایید شده
            </p>
          )}
        </div>

        {/* Email (Optional) */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 text-right mb-2"
          >
            ایمیل (اختیاری)
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right ${hasProfileEmail ? 'bg-gray-100' : ''}`}
            dir="ltr"
            disabled={hasProfileEmail}
          />
          {hasProfileEmail && (
            <p className="text-sm text-blue-600 text-right mt-2">
              💡 برای تغییر ایمیل، به{' '}
              <Link href="/profile" className="underline hover:text-blue-800">
                صفحه پروفایل
              </Link>{' '}
              مراجعه کنید
            </p>
          )}
        </div>

        {/* Shipping Address */}
        <div>
          <label
            htmlFor="shippingAddress"
            className="block text-sm font-medium text-gray-700 text-right mb-2"
          >
            آدرس ارسال <span className="text-red-500">*</span>
          </label>
          <textarea
            id="shippingAddress"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right resize-none"
            required
            dir="rtl"
          />
        </div>

        {/* Postal Code (Optional) */}
        <div>
          <label
            htmlFor="postalCode"
            className="block text-sm font-medium text-gray-700 text-right mb-2"
          >
            کد پستی (اختیاری)
          </label>
          <input
            type="text"
            id="postalCode"
            value={postalCode}
            onChange={(e) =>
              setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 10))
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            placeholder="1234567890"
            maxLength={10}
            dir="ltr"
          />
        </div>

        {/* Shipping Fee Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800 text-right">
            📦 هزینه ارسال به صورت پس کرایه درب منزل محاسبه خواهد شد.
          </p>
        </div>

        {/* Create Account Section (Only for guest users) */}
        {!session && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            {/* Checkbox Row */}
            <div className="flex items-center gap-2 justify-end">
              <label
                htmlFor="createAccount"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                ساخت حساب کاربری
              </label>
              <input
                type="checkbox"
                id="createAccount"
                checked={createAccount}
                onChange={(e) => setCreateAccount(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            {/* Helper Text */}
            <p className="text-xs text-gray-600 text-right">
              {createAccount
                ? 'با فعال کردن این گزینه و تایید شماره تلفن، حساب کاربری برای شما ایجاد می‌شود'
                : 'خرید به عنوان کاربر مهمان انجام می‌شود (نیازی به ایجاد حساب کاربری نیست)'}
            </p>

            {/* OTP Verification Section - Only shown when createAccount is checked */}
            {createAccount && (
              <div className="pt-2 border-t border-blue-300 space-y-2">
                {!phoneVerified ? (
                  <>
                    {!otpSent ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSendOTP}
                        disabled={otpCooldown > 0 || isSendingOTP}
                        className="w-full"
                        isLoading={isSendingOTP}
                      >
                        {otpCooldown > 0
                          ? `ارسال مجدد (${otpCooldown}ثانیه)`
                          : 'ارسال کد تایید'}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(
                              e.target.value.replace(/\D/g, '').slice(0, 6)
                            )
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                          placeholder="کد 6 رقمی را وارد کنید"
                          maxLength={6}
                          dir="ltr"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleVerifyOTP}
                          className="w-full"
                          disabled={isVerifyingOTP}
                          isLoading={isVerifyingOTP}
                        >
                          تایید کد
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 text-right">
                      ✓ شماره تلفن تایید شد
                    </p>
                  </div>
                )}

                {otpError && (
                  <Alert type="error" onClose={() => setOtpError('')}>
                    {otpError}
                  </Alert>
                )}

                {otpSuccess && (
                  <Alert type="success" onClose={() => setOtpSuccess('')}>
                    {otpSuccess}
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit Button - hidden on mobile when hideSubmitButton is true */}
        {!hideSubmitButton && (
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isProcessing}
            disabled={
              isProcessing || (!isLoggedIn && createAccount && !phoneVerified)
            }
          >
            {!isLoggedIn && createAccount && !phoneVerified
              ? 'ابتدا شماره تلفن را تایید کنید'
              : 'پرداخت'}
          </Button>
        )}
      </form>
    </Card>
  );
}
