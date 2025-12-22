'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import RateLimitError from '@/components/ui/RateLimitError';
import { normalizePhoneNumber, isValidIranianPhone } from '@/lib/utils/persian';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: '', // Email or phone
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(
    null
  );
  const [loginWithOTP, setLoginWithOTP] = useState(false);

  // Detect if identifier is email or phone
  const detectIdentifierType = (
    value: string
  ): 'email' | 'phone' | 'invalid' => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Normalize phone number first to handle Persian digits
    const normalizedPhone = normalizePhoneNumber(value);

    if (emailRegex.test(value)) return 'email';
    if (isValidIranianPhone(normalizedPhone)) return 'phone';
    return 'invalid';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'ایمیل یا شماره تلفن الزامی است';
    } else {
      const type = detectIdentifierType(formData.identifier);
      if (type === 'invalid') {
        newErrors.identifier =
          'فرمت ایمیل یا شماره تلفن نامعتبر است (از اعداد فارسی یا انگلیسی استفاده کنید)';
      }
    }

    // Password is only required for password-based login
    if (!loginWithOTP && !formData.password) {
      newErrors.password = 'رمز عبور الزامی است';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setRateLimitRetryAfter(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const identifierType = detectIdentifierType(formData.identifier);

      // LOGIN WITH OTP: Send OTP code (supports both phone and email)
      if (loginWithOTP) {
        // Allow OTP login for both phone and email
        if (identifierType !== 'phone' && identifierType !== 'email') {
          throw new Error('فرمت ایمیل یا شماره تلفن نامعتبر است');
        }

        // Normalize phone number if it's a phone identifier
        const identifier =
          identifierType === 'phone'
            ? normalizePhoneNumber(formData.identifier)
            : formData.identifier;

        const requestBody =
          identifierType === 'phone'
            ? { phone: identifier, purpose: 'login' }
            : { email: identifier, purpose: 'login' };

        const otpResponse = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (otpResponse.status === 429) {
          const rateLimitData = await otpResponse.json();
          setRateLimitRetryAfter(
            rateLimitData.retryAfter || Date.now() + 120000
          );
          setIsLoading(false);
          return;
        }

        const otpData = await otpResponse.json();

        if (!otpResponse.ok) {
          throw new Error(otpData.error || 'خطا در ارسال کد تایید');
        }

        // Redirect to OTP verification page
        const params = new URLSearchParams({
          [identifierType === 'phone' ? 'phone' : 'email']: identifier,
          purpose: 'login',
        });
        router.push(`/verify-otp?${params.toString()}`);
        return;
      }

      // NORMAL LOGIN WITH PASSWORD
      // Normalize identifier before sending
      const normalizedIdentifier =
        identifierType === 'phone'
          ? normalizePhoneNumber(formData.identifier)
          : formData.identifier;

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedIdentifier, // Using 'email' for backward compatibility
          password: formData.password,
        }),
      });

      // Check for rate limiting
      if (response.status === 429) {
        const rateLimitData = await response.json();
        setRateLimitRetryAfter(rateLimitData.retryAfter || Date.now() + 120000);
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در ورود');
      }

      // Use NextAuth's signIn to create the session
      const result = await signIn('credentials', {
        identifier: normalizedIdentifier,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage(result.error);
      } else if (result?.ok) {
        router.push('/');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'خطا در ورود. لطفاً دوباره تلاش کنید.';
      setErrorMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const identifierType = formData.identifier
    ? detectIdentifierType(formData.identifier)
    : null;
  const isPhone = identifierType === 'phone';
  const isEmail = identifierType === 'email';
  const canUseOTP = isPhone || isEmail;

  return (
    <Card>
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
        ورود
      </h2>

      {rateLimitRetryAfter && (
        <RateLimitError
          retryAfter={rateLimitRetryAfter}
          onRetryReady={() => setRateLimitRetryAfter(null)}
          className="mb-4"
        />
      )}

      {errorMessage && !rateLimitRetryAfter && (
        <Alert
          type="error"
          className="mb-4"
          onClose={() => setErrorMessage('')}
        >
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="ایمیل یا شماره تلفن"
          name="identifier"
          type="text"
          value={formData.identifier}
          onChange={handleChange}
          error={errors.identifier}
          disabled={isLoading}
          placeholder="example@email.com یا 09123456789"
          dir="ltr"
          helperText={
            identifierType === 'email'
              ? 'ایمیل وارد شده است'
              : identifierType === 'phone'
                ? 'شماره تلفن وارد شده است'
                : 'ایمیل یا شماره موبایل خود را وارد کنید'
          }
        />

        {!loginWithOTP && (
          <Input
            label="رمز عبور"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isLoading}
            placeholder="رمز عبور خود را وارد کنید"
          />
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-6"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {loginWithOTP ? 'ارسال کد تایید' : 'ورود'}
        </Button>

        {canUseOTP && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setLoginWithOTP(!loginWithOTP);
                setFormData((prev) => ({ ...prev, password: '' }));
                setErrors({});
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              disabled={isLoading}
            >
              {loginWithOTP
                ? 'ورود با رمز عبور'
                : isPhone
                  ? 'ورود با کد تایید (SMS)'
                  : 'ورود با کد تایید (Email)'}
            </button>
          </div>
        )}
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          حساب کاربری ندارید؟{' '}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </Card>
  );
}
