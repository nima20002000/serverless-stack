'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import OTPInput from '@/components/auth/OTPInput';
import Alert from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phone = searchParams.get('phone');
  const email = searchParams.get('email');
  const identifier = phone || email;
  const isEmail = !!email;
  const name = searchParams.get('name');
  const password = searchParams.get('password');
  const purpose = (searchParams.get('purpose') || 'register') as 'register' | 'login';
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  // Redirect if no identifier
  useEffect(() => {
    if (!identifier) {
      router.push('/login');
    }
  }, [identifier, router]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Allow resend after 120 seconds (2 minutes)
    const resendTimer = setTimeout(() => {
      setCanResend(true);
    }, 120000);

    return () => {
      clearInterval(timer);
      clearTimeout(resendTimer);
    };
  }, []);

  const handleVerify = async (otp: string) => {
    setIsVerifying(true);
    setError('');

    try {
      const requestBody = isEmail
        ? { email, otp, name, password, purpose }
        : { phone, otp, name, password, purpose };

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در تایید کد');
      }

      // Auto-login with NextAuth after successful verification
      // For register: use password that was set
      // For login: no password needed (OTP already verified)
      if (!identifier) {
        throw new Error('ایمیل یا شماره تلفن یافت نشد');
      }

      let signInData: Record<string, string | boolean>;

      if (purpose === 'register' && password) {
        // Registration: provide password
        signInData = {
          identifier: identifier,
          password: password,
          redirect: false
        };
      } else {
        // Login with OTP: no password (passwordless auth)
        signInData = {
          identifier: identifier,
          redirect: false
        };
      }

      console.log('Calling signIn with:', { identifier, hasPassword: !!signInData.password, purpose });

      const result = await signIn('credentials', signInData);

      if (result?.error) {
        console.error('NextAuth sign in error:', result.error);
        throw new Error(result.error || 'خطا در ورود به حساب کاربری');
      }

      if (result?.ok) {
        router.push(redirectTo);
      } else {
        throw new Error('خطا در ورود به حساب کاربری');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تایید کد');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setError('');

    try {
      const requestBody = isEmail
        ? { email, purpose }
        : { phone, purpose };

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'خطا در ارسال مجدد کد');
      }

      // Reset timer
      setTimeLeft(300);

      // Allow resend again after 120 seconds (2 minutes)
      setTimeout(() => {
        setCanResend(true);
      }, 120000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارسال مجدد کد');
      setCanResend(true);
    }
  };

  if (!identifier) {
    return null;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Card>
      <h2 className="text-2xl font-bold text-center mb-2">
        {isEmail ? 'تایید ایمیل' : 'تایید شماره تلفن'}
      </h2>

      <p className="text-center text-gray-600 mb-6">
        کد تایید ۶ رقمی به {isEmail ? 'ایمیل' : 'شماره'}{' '}
        <span className="font-bold text-gray-900" dir="ltr">{identifier}</span>
        {' '}ارسال شد
      </p>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <OTPInput
        length={6}
        onComplete={handleVerify}
        disabled={isVerifying || timeLeft === 0}
        autoFocus
      />

      <div className="mt-4 text-center">
        {timeLeft > 0 ? (
          <p className="text-sm text-gray-600">
            زمان باقی‌مانده:{' '}
            <span className="font-mono font-bold text-gray-900">
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
          </p>
        ) : (
          <p className="text-sm text-red-600 font-medium">
            زمان کد تایید به پایان رسید. لطفاً کد جدید درخواست کنید.
          </p>
        )}
      </div>

      <Button
        onClick={handleResend}
        disabled={!canResend || isVerifying}
        variant="secondary"
        className="w-full mt-4"
      >
        {canResend ? 'ارسال مجدد کد' : 'ارسال مجدد کد (۲ دقیقه صبر کنید)'}
      </Button>

      <div className="mt-4 text-center">
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          disabled={isVerifying}
        >
          بازگشت
        </button>
      </div>
    </Card>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <Card>
        <div className="text-center">در حال بارگذاری...</div>
      </Card>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
