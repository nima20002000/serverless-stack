'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { formatDateTime, formatNumber, formatPrice } from '@/lib/utils/format';

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  _count: {
    transactions: number;
    promoCodes: number;
  };
  transactions: Array<{
    id: string;
    transactionCode: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  promoCodes: Array<{
    id: string;
    code: string;
    expiresAt: string;
    isUsed: boolean;
  }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if viewing own profile
  const isOwnProfile = session?.user?.id === id;

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users/${id}`);
      if (!response.ok) throw new Error('Unable to load user');
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleChangeRole = async (newRole: 'USER' | 'ADMIN') => {
    if (
      !confirm(
        `Change this user's role to ${newRole === 'ADMIN' ? 'Admin' : 'User'}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Unable to update user role');

      setSuccessMessage('User role updated.');
      fetchUser();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to update user role'
      );
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    if (
      !confirm(`Delete user "${user.name}"?\n\nThis action cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to delete user');
      }

      setSuccessMessage('User deleted.');
      setTimeout(() => router.push('/admin/users'), 1500);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to delete user'
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      COMPLETED:
        'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200',
      PENDING:
        'bg-yellow-100 text-yellow-800 dark:bg-amber-900/40 dark:text-amber-200',
      FAILED: 'bg-red-100 text-red-800 dark:bg-rose-900/40 dark:text-rose-200',
    };
    const labels = {
      COMPLETED: 'Completed',
      PENDING: 'Pending',
      FAILED: 'Failed',
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: 'Users', href: '/admin/users' },
            { label: 'User details' },
          ]}
        />
        <Alert type="error">User not found</Alert>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[{ label: 'Users', href: '/admin/users' }, { label: user.name }]}
      />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 text-left">
          User details
        </h1>
      </div>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert
          type="success"
          className="mb-4"
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      <div className="space-y-6">
        {/* User Info Card */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4 text-left">
              User profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Name:
                </span>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {user.name}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Email:
                </span>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {user.email}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Role:
                </span>
                <p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {user.role === 'ADMIN' ? 'Admin' : 'User'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Created:
                </span>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {formatDateTime(user.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Quantity Transactions:
                </span>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {formatNumber(user._count.transactions)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Quantity codes Discount:
                </span>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {formatNumber(user._count.promoCodes)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3 justify-start">
              <Button
                variant="secondary"
                onClick={() => router.push('/admin/users')}
              >
                Back
              </Button>
              {!isOwnProfile && (
                <>
                  {user.role === 'USER' ? (
                    <Button
                      variant="primary"
                      onClick={() => handleChangeRole('ADMIN')}
                    >
                      Promote to admin
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => handleChangeRole('USER')}
                    >
                      Demote to user
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={handleDeleteUser}
                    disabled={user.role === 'ADMIN'}
                  >
                    Delete User
                  </Button>
                </>
              )}
              {isOwnProfile && (
                <div className="text-sm text-gray-500 dark:text-slate-400 px-4 py-2 bg-gray-50 dark:bg-slate-900/60 rounded">
                  You cannot change or delete your own admin account here.
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Transactions Card */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4 text-left">
              User transactions ({formatNumber(user.transactions.length)})
            </h2>
            {user.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Transaction code
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {user.transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-900/60"
                      >
                        <td className="px-4 py-3 text-left">
                          {getStatusBadge(transaction.status)}
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-gray-600 dark:text-slate-400">
                          {formatDateTime(transaction.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-left font-medium">
                          {formatPrice(Number(transaction.amount))}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <code className="text-sm bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {transaction.transactionCode}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-slate-500">
                No transactions found.
              </div>
            )}
          </div>
        </Card>

        {/* Promo Codes Card */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4 text-left">
              Promo codes ({formatNumber(user.promoCodes.length)})
            </h2>
            {user.promoCodes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Code
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {user.promoCodes.map((promo) => (
                      <tr
                        key={promo.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-900/60"
                      >
                        <td className="px-4 py-3 text-left">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              promo.isUsed
                                ? 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200'
                                : new Date(promo.expiresAt) < new Date()
                                  ? 'bg-red-100 text-red-800 dark:bg-rose-900/40 dark:text-rose-200'
                                  : 'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                            }`}
                          >
                            {promo.isUsed
                              ? 'Already used'
                              : new Date(promo.expiresAt) < new Date()
                                ? 'Expired'
                                : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-gray-600 dark:text-slate-400">
                          {formatDateTime(promo.expiresAt)}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <code className="text-sm bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded font-bold">
                            {promo.code}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-slate-500">
                No promo codes found.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
