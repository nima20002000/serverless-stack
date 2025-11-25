'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { signOut } from 'next-auth/react';

interface PromoCode {
  id: string;
  code: string;
  expiresAt: string;
  isUsed: boolean;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchPromoCode();
    }
  }, [session]);

  useEffect(() => {
    if (promoCode && !promoCode.isUsed) {
      const interval = setInterval(() => {
        const now = new Date();
        const expiry = new Date(promoCode.expiresAt);
        const diff = expiry.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining('منقضی شده');
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining(`${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [promoCode]);

  const fetchPromoCode = async () => {
    try {
      const response = await fetch('/api/promo/active');
      if (response.ok) {
        const data = await response.json();
        setPromoCode(data.promoCode);
      }
    } catch (error) {
      console.error('Error fetching promo code:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-right">
          پروفایل کاربری
        </h1>

        {/* User Info Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-right">
            اطلاعات کاربری
          </h2>
          <div className="space-y-3 text-right">
            <div>
              <span className="text-gray-600">نام:</span>{' '}
              <span className="font-medium text-gray-900">{user.name}</span>
            </div>
            <div>
              <span className="text-gray-600">ایمیل:</span>{' '}
              <span className="font-medium text-gray-900" dir="ltr">
                {user.email}
              </span>
            </div>
            <div>
              <span className="text-gray-600">نقش:</span>{' '}
              <span className="font-medium text-gray-900">
                {user.role === 'ADMIN' ? 'مدیر' : 'کاربر'}
              </span>
            </div>
          </div>
        </Card>

        {/* Promo Code Card */}
        {promoCode && !promoCode.isUsed && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-right">
              کد تخفیف ویژه شما
            </h2>
            <Alert type="info">
              <div className="text-right">
                <div className="mb-2">
                  <span className="text-lg font-bold">{promoCode.code}</span>
                </div>
                <div className="text-sm">
                  زمان باقی‌مانده: <span className="font-mono font-bold">{timeRemaining}</span>
                </div>
                <div className="text-xs mt-2 text-gray-600">
                  از این کد برای دریافت تخفیف در اولین خرید خود استفاده کنید!
                </div>
              </div>
            </Alert>
          </Card>
        )}

        {promoCode?.isUsed && (
          <Card className="mb-6">
            <Alert type="success">
              شما از کد تخفیف خود استفاده کرده‌اید.
            </Alert>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="danger"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            خروج از حساب کاربری
          </Button>
        </div>
      </div>
    </div>
  );
}
