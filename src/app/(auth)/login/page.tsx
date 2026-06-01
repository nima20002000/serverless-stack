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
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/utils/text';

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

  return (
    <Card>
      <h2 className="text-2xl font-bold text-center mb-6 text-rose-900">
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

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-6"
          isLoading={isLoading}
          disabled={isLoading}
        >
          ورود
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-rose-500">
          حساب کاربری ندارید؟{' '}
          <Link
            href="/register"
            className="text-rose-600 hover:text-rose-700 font-medium"
          >
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </Card>
  );
}
