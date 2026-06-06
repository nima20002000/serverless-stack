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
    // Normalize phone number before validation.
    const normalizedPhone = normalizePhoneNumber(value);

    if (emailRegex.test(value)) return 'email';
    if (isValidPhoneNumber(normalizedPhone)) return 'phone';
    return 'invalid';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Email or phone number is required.';
    } else {
      const type = detectIdentifierType(formData.identifier);
      if (type === 'invalid') {
        newErrors.identifier = 'Enter a valid email address or phone number.';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
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
        throw new Error(data.error || 'Unable to sign in.');
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
          : 'Unable to sign in. Please try again.';
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
      <h2 className="mb-6 text-center text-2xl font-bold text-slate-950 dark:text-white">
        Sign in
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
          label="Email or phone number"
          name="identifier"
          type="text"
          value={formData.identifier}
          onChange={handleChange}
          error={errors.identifier}
          disabled={isLoading}
          placeholder="name@example.com or +12125551234"
          dir="ltr"
          helperText={
            identifierType === 'email'
              ? 'Email detected'
              : identifierType === 'phone'
                ? 'Phone number detected'
                : 'Enter your email address or phone number'
          }
        />

        <Input
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
          placeholder="Enter your password"
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-6"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-slate-600 dark:text-slate-300">
          Need an account?{' '}
          <Link
            href="/register"
            className="font-medium text-slate-950 underline-offset-4 hover:text-slate-700 hover:underline dark:text-white dark:hover:text-slate-200"
          >
            Create one
          </Link>
        </p>
      </div>
    </Card>
  );
}
