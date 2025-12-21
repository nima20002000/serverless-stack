'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import BulkActionsToolbar, { BulkAction } from '@/components/admin/BulkActionsToolbar';

interface User {
  id: string;
  uid: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  _count: {
    transactions: number;
    promoCodes: number;
  };
}

interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export default function UsersManagementPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const roleParam = roleFilter !== 'all' ? `&role=${roleFilter}` : '';
      const response = await fetch(`/api/admin/users?page=${currentPage}&limit=20${searchParam}${roleParam}`);
      if (!response.ok) throw new Error('خطا در دریافت کاربران');
      const result = await response.json();
      setData(result);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setCurrentPage(1);
  };

  const handleChangeRole = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    if (!confirm(`آیا از تغییر نقش این کاربر به ${newRole === 'ADMIN' ? 'مدیر' : 'کاربر'} اطمینان دارید؟`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('خطا در تغییر نقش کاربر');

      setSuccessMessage('نقش کاربر با موفقیت تغییر کرد');
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`آیا از حذف کاربر "${userName}" اطمینان دارید؟\n\nاین عمل غیرقابل بازگشت است و تمام اطلاعات کاربر حذف خواهد شد.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در حذف کاربر');
      }

      setSuccessMessage('کاربر با موفقیت حذف شد');
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedUsers.size === data.data.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(data.data.map(u => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          userIds: Array.from(selectedUsers),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در حذف کاربران');
      }

      const result = await response.json();
      setSuccessMessage(result.message);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleBulkPromoteToAdmin = async () => {
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          userIds: Array.from(selectedUsers),
          updates: { role: 'ADMIN' as const },
        }),
      });

      if (!response.ok) throw new Error('خطا در ارتقای کاربران');

      const result = await response.json();
      setSuccessMessage(result.message);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleBulkDemoteToUser = async () => {
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          userIds: Array.from(selectedUsers),
          updates: { role: 'USER' as const },
        }),
      });

      if (!response.ok) throw new Error('خطا در تنزل کاربران');

      const result = await response.json();
      setSuccessMessage(result.message);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const bulkActions: BulkAction[] = [
    {
      label: 'حذف',
      variant: 'danger',
      onClick: handleBulkDelete,
      requiresConfirmation: true,
      confirmationMessage: `آیا از حذف ${selectedUsers.size} کاربر انتخاب‌شده اطمینان دارید؟ (فقط کاربران عادی حذف خواهند شد)`,
    },
    {
      label: 'ارتقا به مدیر',
      variant: 'primary',
      onClick: handleBulkPromoteToAdmin,
    },
    {
      label: 'تنزل به کاربر',
      variant: 'secondary',
      onClick: handleBulkDemoteToUser,
    },
  ];

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          مدیر
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        کاربر
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'مدیریت کاربران' }]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 text-right">مدیریت کاربران</h1>
        <p className="text-gray-600 text-right mt-2">
          مشاهده و مدیریت کاربران سیستم
        </p>
      </div>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert type="success" className="mb-4" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {/* Search Bar */}
      <Card className="mb-6">
        <div className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام یا ایمیل..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right order-2 sm:order-1"
            />
            <Button type="submit" variant="primary" className="w-full sm:w-auto order-1 sm:order-2">
              جستجو
            </Button>
          </form>
        </div>
      </Card>

      {/* Role Filter */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 w-full">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
              >
                <option value="all">همه</option>
                <option value="USER">کاربران</option>
                <option value="ADMIN">مدیران</option>
              </select>
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">نقش:</label>
            </div>

            <Button
              variant="secondary"
              onClick={clearFilters}
              size="sm"
              className="w-full sm:w-auto"
            >
              پاک کردن فیلترها
            </Button>
          </div>
        </div>
      </Card>

      {data && (
        <>
          <Card>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  نمایش {data.data.length.toLocaleString('fa-IR')} کاربر از{' '}
                  {data.total.toLocaleString('fa-IR')} کاربر
                </div>
                <div className="text-sm text-gray-600">
                  صفحه {data.page.toLocaleString('fa-IR')} از{' '}
                  {data.totalPages.toLocaleString('fa-IR')}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={data.data.length > 0 && selectedUsers.size === data.data.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      عملیات
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 hidden lg:table-cell">
                      تراکنش‌ها
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      نقش
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 hidden md:table-cell">
                      ایمیل / شماره تلفن
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      نام کاربر
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 hidden sm:table-cell">
                      شناسه
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          {user.role === 'USER' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleChangeRole(user.id, 'ADMIN')}
                            >
                              ارتقا به مدیر
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleChangeRole(user.id, 'USER')}
                            >
                              تنزل به کاربر
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={user.role === 'ADMIN'}
                          >
                            حذف
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          {user._count.transactions.toLocaleString('fa-IR')} تراکنش
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900 hidden md:table-cell">
                        {user.email || user.phone || 'ندارد'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {user.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                          {user.uid}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.data.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هیچ کاربری یافت نشد
                </div>
              )}
            </div>
          </Card>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                قبلی
              </Button>
              <span className="text-sm text-gray-600">
                صفحه {currentPage.toLocaleString('fa-IR')} از{' '}
                {data.totalPages.toLocaleString('fa-IR')}
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={currentPage === data.totalPages}
              >
                بعدی
              </Button>
            </div>
          )}
        </>
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedUsers.size}
        actions={bulkActions}
        onClearSelection={() => setSelectedUsers(new Set())}
      />
    </div>
  );
}
