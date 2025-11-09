'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { format } from 'date-fns-jalali';

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
}

interface UsersResponse {
  users: User[];
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

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users?page=${currentPage}&limit=20`);
      if (!response.ok) throw new Error('خطا در دریافت کاربران');
      const result = await response.json();
      setData(result);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
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
    } catch (error: any) {
      setError(error.message);
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
    } catch (error: any) {
      setError(error.message);
    }
  };

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

      {data && (
        <>
          <Card>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  نمایش {data.users.length.toLocaleString('fa-IR')} کاربر از{' '}
                  {data.total.toLocaleString('fa-IR')} کاربر
                </div>
                <div className="text-sm text-gray-600">
                  صفحه {data.page.toLocaleString('fa-IR')} از{' '}
                  {data.totalPages.toLocaleString('fa-IR')}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      عملیات
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      تراکنش‌ها
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      تاریخ عضویت
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      نقش
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      نام
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      ایمیل
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
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
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-900">
                          {user._count.transactions.toLocaleString('fa-IR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {format(new Date(user.createdAt), 'yyyy/MM/dd')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {user.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.users.length === 0 && (
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
    </div>
  );
}
