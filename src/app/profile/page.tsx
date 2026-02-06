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
  paymentMethod: 'STRIPE' | 'PAYPAL';
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

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormState, editFormActions] = useFormState();

  // Password management states
  const [isResettingWithOTP, setIsResettingWithOTP] = useState(false);

  // Ensure minimum skeleton display time
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadTimeElapsed(true);
    }, 500); // Minimum 500ms skeleton display

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchUserProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await fetch('/api/user/profile');

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
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

  const handleSaveProfile = useCallback(
    async (data: {
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
          editFormActions.setError(
            responseData.error || 'خطا در به‌روزرسانی پروفایل'
          );
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
    },
    [fetchUserProfile, update, editFormActions]
  );

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
      fetchUserProfile();
      fetchTransactions();
    }
  }, [session, fetchUserProfile, fetchTransactions]);

  // Show skeleton until minimum time elapsed AND data loaded
  if (
    status === 'loading' ||
    !minLoadTimeElapsed ||
    profileLoading ||
    !userProfile
  ) {
    return <ProfileSkeleton />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-rose-900 mb-8 text-right">
          پروفایل کاربری
        </h1>

        {/* Success/Error Messages */}
        {editFormState.success && (
          <Alert type="success" className="mb-6">
            {editFormState.success}
          </Alert>
        )}
        {editFormState.error && (
          <Alert
            type="error"
            className="mb-6"
            onClose={() => editFormActions.setError('')}
          >
            {editFormState.error}
          </Alert>
        )}

        {/* User Info Card */}
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-rose-900 text-right">
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
                <span className="text-rose-600">شناسه کاربری:</span>{' '}
                <code className="font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-xl text-sm border border-rose-100">
                  {userProfile.uid}
                </code>
              </div>
              <div>
                <span className="text-rose-600">نام:</span>{' '}
                <span className="font-medium text-rose-900">
                  {userProfile.name}
                </span>
              </div>
              <div>
                <span className="text-rose-600">ایمیل:</span>{' '}
                <span className="font-medium text-rose-900" dir="ltr">
                  {userProfile.email || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-rose-600">شماره تلفن:</span>{' '}
                <span className="font-medium text-rose-900" dir="ltr">
                  {userProfile.phone || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-rose-600">آدرس ارسال:</span>{' '}
                <span className="font-medium text-rose-900">
                  {userProfile.shippingAddress || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-rose-600">کد پستی:</span>{' '}
                <span className="font-medium text-rose-900" dir="ltr">
                  {userProfile.postalCode || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-rose-600">نقش:</span>{' '}
                <span className="font-medium text-rose-900">
                  {userProfile.role === 'ADMIN' ? 'مدیر' : 'کاربر'}
                </span>
              </div>
              <div>
                <span className="text-rose-600">عضو از:</span>{' '}
                <span className="font-medium text-rose-900">
                  {format(new Date(userProfile.createdAt), 'yyyy/MM/dd')}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Password Management Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-rose-900 mb-4 text-right">
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

        {/* Transaction History Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-rose-900 mb-4 text-right">
            تاریخچه تراکنش‌ها
          </h2>
          <TransactionHistory
            transactions={transactions}
            isLoading={transactionsLoading}
          />
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="danger"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            خروج از حساب کاربری
          </Button>
        </div>
      </div>
    </div>
  );
}
