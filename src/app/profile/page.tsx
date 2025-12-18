'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { format } from 'date-fns-jalali';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import PasswordManagementCard from '@/components/profile/PasswordManagementCard';
import OTPPasswordReset from '@/components/profile/OTPPasswordReset';
import TransactionHistory from '@/components/profile/TransactionHistory';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';
import { useFormState } from '@/hooks/useFormState';

interface PromoCode {
  id: string;
  code: string;
  expiresAt: string;
  isUsed: boolean;
}

interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string | null;
  phone: string | null;
  shippingAddress: string | null;
  postalCode: string | null;
  role: string;
  createdAt: string;
  hasPassword: boolean;
}

interface Transaction {
  id: string;
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentMethod: 'ZARINPAL' | 'DIGIPAY';
  isGuest: boolean;
  transactionCode: string;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    price: string;
    product: {
      id: string;
      name: string;
      price: string;
      media: Array<{
        url: string;
        alt: string | null;
      }>;
    };
    variant: {
      id: string;
      name: string;
      color: string | null;
      size: string | null;
      material: string | null;
    } | null;
  }[];
  invoice: {
    invoiceNumber: string;
    generatedAt: string;
    pdfUrl: string | null;
  } | null;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormState, editFormActions] = useFormState();

  // Password management states
  const [isResettingWithOTP, setIsResettingWithOTP] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
    return undefined;
  }, [promoCode]);

  const fetchPromoCode = useCallback(async () => {
    try {
      const response = await fetch('/api/promo/active');
      if (response.ok) {
        const data = await response.json();
        setPromoCode(data.promoCode);
      } else {
        setPromoCode(null);
      }
    } catch (error) {
      console.error('Error fetching promo code:', error);
      setPromoCode(null);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      // Ensure minimum skeleton display time (300ms) for better UX
      const [response] = await Promise.all([
        fetch('/api/user/profile'),
        new Promise(resolve => setTimeout(resolve, 300))
      ]);

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const response = await fetch('/api/user/transactions?limit=5');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const handleEditProfile = useCallback(() => {
    setIsEditingProfile(true);
    editFormActions.clearMessages();
  }, [editFormActions]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingProfile(false);
    editFormActions.clearMessages();
  }, [editFormActions]);

  const handleSaveProfile = useCallback(async (data: {
    name: string;
    email: string;
    phone: string;
    shippingAddress: string;
    postalCode: string;
  }) => {
    editFormActions.setIsSubmitting(true);
    editFormActions.clearMessages();

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        editFormActions.setError(responseData.error || 'خطا در به‌روزرسانی پروفایل');
        return;
      }

      editFormActions.setSuccess('پروفایل با موفقیت به‌روزرسانی شد');
      setIsEditingProfile(false);
      await fetchUserProfile();
      await update(); // Update session
    } catch (error) {
      editFormActions.setError('خطا در به‌روزرسانی پروفایل');
      console.error('Error updating profile:', error);
    } finally {
      editFormActions.setIsSubmitting(false);
    }
  }, [fetchUserProfile, update, editFormActions]);

  const handleStartOtpReset = useCallback(() => {
    setIsResettingWithOTP(true);
  }, []);

  const handleCancelOtpReset = useCallback(() => {
    setIsResettingWithOTP(false);
  }, []);

  const handleOtpResetSuccess = useCallback(async () => {
    setIsResettingWithOTP(false);
    await fetchUserProfile();
  }, [fetchUserProfile]);

  // This useEffect depends on callbacks, so must be after their definition
  useEffect(() => {
    if (session?.user) {
      fetchPromoCode();
      fetchUserProfile();
      fetchTransactions();
    }
  }, [session, fetchPromoCode, fetchUserProfile, fetchTransactions]);

  if (status === 'loading' || !userProfile) {
    return <ProfileSkeleton />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-right">
          پروفایل کاربری
        </h1>

        {/* Success/Error Messages */}
        {editFormState.success && (
          <Alert type="success" className="mb-6">
            {editFormState.success}
          </Alert>
        )}
        {editFormState.error && (
          <Alert type="error" className="mb-6">
            {editFormState.error}
          </Alert>
        )}

        {/* User Info Card */}
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 text-right">
              اطلاعات کاربری
            </h2>
            {!isEditingProfile && (
              <Button variant="secondary" onClick={handleEditProfile}>
                ویرایش
              </Button>
            )}
          </div>

          {isEditingProfile ? (
            <ProfileEditForm
              initialData={{
                name: userProfile.name || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
                shippingAddress: userProfile.shippingAddress || '',
                postalCode: userProfile.postalCode || '',
              }}
              onSave={handleSaveProfile}
              onCancel={handleCancelEdit}
              isUpdating={editFormState.isSubmitting}
              onValidationError={editFormActions.setError}
            />
          ) : (
            <div className="space-y-3 text-right">
              <div>
                <span className="text-gray-600">شناسه کاربری:</span>{' '}
                <code className="font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                  {userProfile.uid}
                </code>
              </div>
              <div>
                <span className="text-gray-600">نام:</span>{' '}
                <span className="font-medium text-gray-900">{userProfile.name}</span>
              </div>
              <div>
                <span className="text-gray-600">ایمیل:</span>{' '}
                <span className="font-medium text-gray-900" dir="ltr">
                  {userProfile.email || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">شماره تلفن:</span>{' '}
                <span className="font-medium text-gray-900" dir="ltr">
                  {userProfile.phone || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">آدرس ارسال:</span>{' '}
                <span className="font-medium text-gray-900">
                  {userProfile.shippingAddress || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">کد پستی:</span>{' '}
                <span className="font-medium text-gray-900" dir="ltr">
                  {userProfile.postalCode || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">نقش:</span>{' '}
                <span className="font-medium text-gray-900">
                  {userProfile.role === 'ADMIN' ? 'مدیر' : 'کاربر'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">عضو از:</span>{' '}
                <span className="font-medium text-gray-900">
                  {format(new Date(userProfile.createdAt), 'yyyy/MM/dd')}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Password Management Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-right">
            مدیریت رمز عبور
          </h2>

          {isResettingWithOTP ? (
            <OTPPasswordReset
              userPhone={userProfile.phone}
              userEmail={userProfile.email}
              onSuccess={handleOtpResetSuccess}
              onCancel={handleCancelOtpReset}
            />
          ) : (
            <PasswordManagementCard
              hasPassword={userProfile.hasPassword}
              onPasswordUpdate={fetchUserProfile}
              onStartOtpReset={handleStartOtpReset}
              showOtpResetOption={!!(userProfile.phone || userProfile.email)}
            />
          )}
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
            <Alert type="success">شما از کد تخفیف خود استفاده کرده‌اید.</Alert>
          </Card>
        )}

        {/* Transaction History Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-right">
            تاریخچه تراکنش‌ها
          </h2>
          <TransactionHistory
            transactions={transactions}
            isLoading={transactionsLoading}
          />
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button variant="danger" onClick={() => signOut({ callbackUrl: '/login' })}>
            خروج از حساب کاربری
          </Button>
        </div>
      </div>
    </div>
  );
}
