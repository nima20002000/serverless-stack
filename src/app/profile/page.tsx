'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import PasswordManagementCard from '@/components/profile/PasswordManagementCard';
import TransactionHistory from '@/components/profile/TransactionHistory';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';
import { useFormState } from '@/hooks/useFormState';
import { formatDate } from '@/lib/utils/format';

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
  paymentProviderRef?: string | null;
  stripePaymentIntentId?: string | null;
  paypalOrderId?: string | null;
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
            responseData.error || 'Unable to update your profile.'
          );
          return;
        }

        editFormActions.setSuccess('Profile updated successfully.');
        setIsEditingProfile(false);
        await fetchUserProfile();
        await update(); // Update session
      } catch (error) {
        editFormActions.setError('Unable to update your profile.');
        console.error('Error updating profile:', error);
      } finally {
        editFormActions.setIsSubmitting(false);
      }
    },
    [fetchUserProfile, update, editFormActions]
  );

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
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-950 mb-8">
          Account profile
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
            <h2 className="text-xl font-semibold text-slate-950">
              Profile details
            </h2>
            {!isEditingProfile && (
              <Button variant="secondary" onClick={handleEditProfile}>
                Edit
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
            <div className="space-y-3">
              <div>
                <span className="text-slate-600">Account ID:</span>{' '}
                <code className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-sm border border-slate-200">
                  {userProfile.uid}
                </code>
              </div>
              <div>
                <span className="text-slate-600">Name:</span>{' '}
                <span className="font-medium text-slate-950">
                  {userProfile.name || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Email:</span>{' '}
                <span className="font-medium text-slate-950" dir="ltr">
                  {userProfile.email || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Phone number:</span>{' '}
                <span className="font-medium text-slate-950" dir="ltr">
                  {userProfile.phone || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Shipping address:</span>{' '}
                <span className="font-medium text-slate-950">
                  {userProfile.shippingAddress || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Postal code:</span>{' '}
                <span className="font-medium text-slate-950" dir="ltr">
                  {userProfile.postalCode || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Role:</span>{' '}
                <span className="font-medium text-slate-950">
                  {userProfile.role === 'ADMIN' ? 'Admin' : 'User'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Joined:</span>{' '}
                <span className="font-medium text-slate-950">
                  {formatDate(userProfile.createdAt)}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Password Management Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-slate-950 mb-4">
            Password
          </h2>

          <PasswordManagementCard
            hasPassword={userProfile.hasPassword}
            onPasswordUpdate={fetchUserProfile}
          />
        </Card>

        {/* Transaction History Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-slate-950 mb-4">
            Transactions
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
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
