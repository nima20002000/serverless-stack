'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import RateLimitError from '@/components/ui/RateLimitError';
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidName,
} from '@/lib/utils/text';

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
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(
    null
  );

  // Detect if identifier is email or phone
  const detectIdentifierType = (
    value: string
  ): 'email' | 'phone' | 'invalid' => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Normalize phone number first to handle localized digits
    const normalizedPhone = normalizePhoneNumber(value);

    if (emailRegex.test(value)) return 'email';
    if (isValidPhoneNumber(normalizedPhone)) return 'phone';
    return 'invalid';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate name if provided (optional but must be valid if present)
    if (formData.name.trim() && !isValidName(formData.name)) {
      newErrors.name = 'نام باید شامل حروف فارسی یا انگلیسی باشد';
    }

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'ایمیل یا شماره تلفن الزامی است';
    } else {
      const type = detectIdentifierType(formData.identifier);
      if (type === 'invalid') {
        newErrors.identifier =
          'فرمت ایمیل یا شماره تلفن نامعتبر است (از اعداد فارسی یا انگلیسی استفاده کنید)';
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

      if (identifierType !== 'phone' && identifierType !== 'email') {
        throw new Error('فرمت ایمیل یا شماره تلفن نامعتبر است');
      }

      const identifier =
        identifierType === 'phone'
          ? normalizePhoneNumber(formData.identifier)
          : formData.identifier;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          password: formData.password,
          name: formData.name,
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

      const signInResult = await signIn('credentials', {
        identifier,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setSuccessMessage(
          'ثبت‌نام انجام شد. برای ورود از فرم ورود استفاده کنید.'
        );
        return;
      }

      if (signInResult?.ok) {
        router.push('/');
        return;
      }

      setSuccessMessage(
        'ثبت‌نام انجام شد. برای ورود از فرم ورود استفاده کنید.'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.';
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

  return (
    <Card>
      <h2 className="text-2xl font-bold text-center mb-6 text-rose-900">
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
                ? 'شماره تلفن وارد شده است'
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
          ثبت‌نام
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-rose-500">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link
            href="/login"
            className="text-rose-600 hover:text-rose-700 font-medium"
          >
            وارد شوید
          </Link>
        </p>
      </div>
    </Card>
  );
}
