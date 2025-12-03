'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { signIn } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

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
}

export default function CheckoutForm({ session, onSubmit, isProcessing }: CheckoutFormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [createAccount, setCreateAccount] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  // Load user profile data if logged in
  useEffect(() => {
    const loadUserProfile = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            setFullName(data.name || '');
            setPhone(data.phone || '');
            setEmail(data.email || '');
            setShippingAddress(data.shippingAddress || '');
            setPostalCode(data.postalCode || '');

            // If user already has a verified phone, mark as verified
            if (data.phone && data.isVerified) {
              setPhoneVerified(true);
            }
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
      setIsLoadingProfile(false);
    };

    loadUserProfile();
  }, [session]);

  // Cooldown timer for OTP
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const handleSendOTP = async () => {
    // Validate phone or email
    const identifier = phone || email;
    if (!identifier) {
      setOtpError('لطفاً شماره تلفن یا ایمیل خود را وارد کنید');
      return;
    }

    const isEmail = identifier.includes('@');

    // Validate format
    if (!isEmail && !phone.match(/^09\d{9}$/)) {
      setOtpError('لطفاً یک شماره تلفن معتبر وارد کنید (مثال: 09123456789)');
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
          [isEmail ? 'email' : 'phone']: identifier,
          purpose: 'login',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در ارسال کد تایید');
      }

      setOtpSent(true);
      setOtpCooldown(60);
      setOtpSuccess(
        isEmail
          ? 'کد تایید به ایمیل شما ارسال شد'
          : 'کد تایید به شماره تلفن شما ارسال شد'
      );
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'خطا در ارسال کد تایید');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('لطفاً کد 6 رقمی را وارد کنید');
      return;
    }

    const identifier = phone || email;
    if (!identifier) {
      setOtpError('لطفاً شماره تلفن یا ایمیل خود را وارد کنید');
      return;
    }

    const isEmail = identifier.includes('@');

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
          [isEmail ? 'email' : 'phone']: identifier,
          code: otpCode,
          purpose: 'login',
          createAccount: !session && createAccount,
          name: fullName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'کد تایید اشتباه است');
      }

      // Handle different scenarios based on response
      if (data.action === 'login' || data.action === 'register') {
        // User logged in or registered - create NextAuth session
        setOtpSuccess(data.message);

        // Sign in with NextAuth using passwordless credentials
        const result = await signIn('credentials', {
          identifier: data.identifier,
          password: '', // Passwordless login (OTP already verified)
          redirect: false,
        });

        if (result?.ok) {
          // Reload the page to get updated session
          window.location.reload();
        } else if (result?.error) {
          setOtpError(result.error);
        }
      } else if (data.action === 'guest_verified') {
        // Guest verification only
        setPhoneVerified(true);
        setOtpSuccess('شماره تلفن با موفقیت تایید شد');
        setOtpSent(false);
        setOtpCode('');
      }
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'خطا در تایید کد');
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fullName.trim()) {
      alert('لطفاً نام و نام خانوادگی خود را وارد کنید');
      return;
    }

    if (!phone.trim() || !phone.match(/^09\d{9}$/)) {
      alert('لطفاً یک شماره تلفن معتبر وارد کنید');
      return;
    }

    if (!shippingAddress.trim()) {
      alert('لطفاً آدرس ارسال را وارد کنید');
      return;
    }

    // For non-logged-in users, require phone verification
    if (!session && !phoneVerified) {
      alert('لطفاً ابتدا شماره تلفن خود را با کد تایید تایید کنید');
      return;
    }

    onSubmit({
      fullName,
      phone,
      email,
      shippingAddress,
      postalCode,
      createAccount: false, // Account already created during OTP verification if needed
      phoneVerified,
    });
  };

  if (isLoadingProfile && session) {
    return (
      <Card className="mt-6">
        <div className="text-center py-8 text-gray-600">در حال بارگذاری...</div>
      </Card>
    );
  }

  const hasVerifiedPhone = !!(session?.user.phone && session.user.isVerified);
  const isLoggedIn = !!session;
  const showOTPVerification = !isLoggedIn || (!hasVerifiedPhone && !phoneVerified);

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-bold text-gray-900 text-right mb-4 border-b pb-3">
        اطلاعات ارسال
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 text-right mb-2">
            نام و نام خانوادگی <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            required
            dir="rtl"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 text-right mb-2">
            شماره تلفن <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              placeholder="09123456789"
              required
              dir="ltr"
              disabled={!!hasVerifiedPhone}
            />

            {/* Show OTP verification for non-logged-in users OR logged-in users without verified phone */}
            {showOTPVerification && (
              <div className="space-y-2">
                {!otpSent ? (
                  <div className="space-y-2">
                    {!isLoggedIn && createAccount && (
                      <p className="text-xs text-gray-600 text-right">
                        با تایید شماره تلفن، حساب کاربری برای شما ایجاد می‌شود
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSendOTP}
                      disabled={otpCooldown > 0 || isSendingOTP}
                      className="w-full"
                      isLoading={isSendingOTP}
                    >
                      {otpCooldown > 0 ? `ارسال مجدد (${otpCooldown}ثانیه)` : 'ارسال کد تایید'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleVerifyOTP}
                      className="flex-1"
                      disabled={isVerifyingOTP}
                      isLoading={isVerifyingOTP}
                    >
                      تایید کد
                    </Button>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      placeholder="کد 6 رقمی"
                      maxLength={6}
                      dir="ltr"
                    />
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

            {hasVerifiedPhone && (
              <p className="text-sm text-green-600 text-right">✓ شماره تلفن تایید شده</p>
            )}

            {phoneVerified && !hasVerifiedPhone && (
              <p className="text-sm text-green-600 text-right">✓ شماره تلفن تایید شد</p>
            )}
          </div>
        </div>

        {/* Email (Optional) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-right mb-2">
            ایمیل (اختیاری)
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            dir="ltr"
          />
        </div>

        {/* Shipping Address */}
        <div>
          <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700 text-right mb-2">
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
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 text-right mb-2">
            کد پستی (اختیاری)
          </label>
          <input
            type="text"
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            placeholder="1234567890"
            maxLength={10}
            dir="ltr"
          />
        </div>

        {/* Create Account Checkbox (Only for guest users) */}
        {!session && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 justify-end mb-2">
              <label htmlFor="createAccount" className="text-sm font-medium text-gray-700 cursor-pointer">
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
            <p className="text-xs text-gray-600 text-right">
              {createAccount
                ? 'با فعال بودن این گزینه، پس از تایید شماره تلفن، حساب کاربری برای شما ایجاد می‌شود'
                : 'خرید به عنوان کاربر مهمان انجام می‌شود'}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isProcessing}
          disabled={isProcessing || (!isLoggedIn && !phoneVerified)}
        >
          {!isLoggedIn && !phoneVerified ? 'ابتدا شماره تلفن را تایید کنید' : 'پرداخت'}
        </Button>
      </form>
    </Card>
  );
}
