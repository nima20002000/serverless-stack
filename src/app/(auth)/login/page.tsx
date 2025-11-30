'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import RateLimitError from '@/components/ui/RateLimitError';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'ایمیل الزامی است';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'فرمت ایمیل نامعتبر است';
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
      // Make a lightweight request to check rate limiting before actual login
      // We'll check the session endpoint which is also under /api/auth/
      const rateLimitCheck = await fetch('/api/auth/session');

      if (rateLimitCheck.status === 429) {
        const rateLimitData = await rateLimitCheck.json();
        setRateLimitRetryAfter(rateLimitData.retryAfter || Date.now() + 900000); // 15 min default
        setIsLoading(false);
        return;
      }

      // If not rate limited, proceed with sign in
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // Check if error message indicates rate limiting
        if (result.error.includes('بیش از حد مجاز') || result.error.includes('rate limit')) {
          setRateLimitRetryAfter(Date.now() + 900000); // 15 min default
        } else {
          setErrorMessage(result.error);
        }
      } else if (result?.ok) {
        // Successful login
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('خطا در ورود. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

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
        <Alert type="error" className="mb-4" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="ایمیل"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
          placeholder="example@email.com"
          dir="ltr"
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
        <p className="text-gray-600">
          حساب کاربری ندارید؟{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </Card>
  );
}
