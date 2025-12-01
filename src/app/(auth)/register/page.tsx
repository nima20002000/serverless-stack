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

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    identifier: '', // Can be email or phone
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);

  // Detect if identifier is email or phone
  const detectIdentifierType = (value: string): 'email' | 'phone' | 'invalid' => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^09\d{9}$/;

    if (emailRegex.test(value)) return 'email';
    if (phoneRegex.test(value)) return 'phone';
    return 'invalid';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name is optional - no validation needed

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'ایمیل یا شماره تلفن الزامی است';
    } else {
      const type = detectIdentifierType(formData.identifier);
      if (type === 'invalid') {
        newErrors.identifier = 'فرمت ایمیل یا شماره تلفن نامعتبر است';
      }
    }

    if (!formData.password) {
      newErrors.password = 'رمز عبور الزامی است';
    } else if (formData.password.length < 8) {
      newErrors.password = 'رمز عبور باید حداقل ۸ کاراکتر باشد';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'رمز عبور و تکرار آن مطابقت ندارند';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setRateLimitRetryAfter(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const identifierType = detectIdentifierType(formData.identifier);

      // PHONE FLOW: Send OTP and redirect to verification page
      if (identifierType === 'phone') {
        const otpResponse = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.identifier,
            purpose: 'register'
          })
        });

        if (otpResponse.status === 429) {
          const rateLimitData = await otpResponse.json();
          setRateLimitRetryAfter(rateLimitData.retryAfter || Date.now() + 120000);
          setIsLoading(false);
          return;
        }

        const otpData = await otpResponse.json();

        if (!otpResponse.ok) {
          throw new Error(otpData.error || 'خطا در ارسال کد تایید');
        }

        // Redirect to OTP verification page with data
        const params = new URLSearchParams({
          phone: formData.identifier,
          name: formData.name,
          password: formData.password,
          purpose: 'register'
        });
        router.push(`/verify-otp?${params.toString()}`);
        return;
      }

      // EMAIL FLOW: Direct registration (as before)
      if (identifierType === 'email') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.identifier,
            password: formData.password,
          }),
        });

        if (response.status === 429) {
          const rateLimitData = await response.json();
          setRateLimitRetryAfter(rateLimitData.retryAfter || Date.now() + 120000);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'خطا در ثبت‌نام');
        }

        // Auto-login after successful registration
        const loginResult = await signIn('credentials', {
          identifier: formData.identifier,
          password: formData.password,
          redirect: false
        });

        if (loginResult?.ok) {
          setSuccessMessage('ثبت‌نام با موفقیت انجام شد!');
          setTimeout(() => {
            router.push('/');
          }, 1000);
        } else {
          // Registration successful but login failed
          setSuccessMessage('ثبت‌نام با موفقیت انجام شد! در حال انتقال به صفحه ورود...');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.';
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

  const identifierType = formData.identifier ? detectIdentifierType(formData.identifier) : null;

  return (
    <Card>
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
        ثبت‌نام
      </h2>

      {rateLimitRetryAfter && (
        <RateLimitError
          retryAfter={rateLimitRetryAfter}
          onRetryReady={() => setRateLimitRetryAfter(null)}
          className="mb-4"
        />
      )}

      {successMessage && !rateLimitRetryAfter && (
        <Alert type="success" className="mb-4">
          {successMessage}
        </Alert>
      )}

      {errorMessage && !rateLimitRetryAfter && (
        <Alert type="error" className="mb-4" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="نام (اختیاری)"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          disabled={isLoading}
          placeholder="نام خود را وارد کنید"
        />

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
              ? 'شماره تلفن وارد شده است - کد تایید ارسال خواهد شد'
              : 'ایمیل یا شماره موبایل خود را وارد کنید'
          }
        />

        <Input
          label="رمز عبور"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
          placeholder="حداقل ۸ کاراکتر"
          helperText="رمز عبور باید حداقل ۸ کاراکتر باشد"
        />

        <Input
          label="تکرار رمز عبور"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          disabled={isLoading}
          placeholder="رمز عبور را دوباره وارد کنید"
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-6"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {identifierType === 'phone' ? 'ارسال کد تایید' : 'ثبت‌نام'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            وارد شوید
          </Link>
        </p>
      </div>
    </Card>
  );
}
