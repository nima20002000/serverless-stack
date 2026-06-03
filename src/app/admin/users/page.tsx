'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import BulkActionsToolbar, {
  BulkAction,
} from '@/components/admin/BulkActionsToolbar';
import { formatNumber } from '@/lib/utils/format';

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
      const searchParam = searchQuery
        ? `&search=${encodeURIComponent(searchQuery)}`
        : '';
      const roleParam = roleFilter !== 'all' ? `&role=${roleFilter}` : '';
      const response = await fetch(
        `/api/admin/users?page=${currentPage}&limit=20${searchParam}${roleParam}`
      );
      if (!response.ok) throw new Error('Unable to load users');
      const result = await response.json();
      setData(result);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
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

  const handleChangeRole = async (
    userId: string,
    newRole: 'USER' | 'ADMIN'
  ) => {
    if (
      !confirm(
        `Change this user's role to ${newRole === 'ADMIN' ? 'Admin' : 'User'}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Unable to update user role');

      setSuccessMessage('User role updated.');
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(`Delete user "${userName}"?\n\nThis action cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to delete user');
      }

      setSuccessMessage('User deleted.');
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedUsers.size === data.data.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(data.data.map((u) => u.id)));
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
        throw new Error(errorData.error || 'Unable to delete users');
      }

      const result = await response.json();
      setSuccessMessage(result.message);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
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

      if (!response.ok) throw new Error('Unable to update users');

      const result = await response.json();
      setSuccessMessage(result.message);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
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

      if (!response.ok) throw new Error('Unable to update users');

      const result = await response.json();
      setSuccessMessage(result.message);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
    }
  };

  const bulkActions: BulkAction[] = [
    {
      label: 'Delete',
      variant: 'danger',
      onClick: handleBulkDelete,
      requiresConfirmation: true,
      confirmationMessage: `Delete ${selectedUsers.size} selected user(s)? Admin users are skipped.`,
    },
    {
      label: 'Promote to admin',
      variant: 'primary',
      onClick: handleBulkPromoteToAdmin,
    },
    {
      label: 'Demote to user',
      variant: 'secondary',
      onClick: handleBulkDemoteToUser,
    },
  ];

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
          Admin
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200">
        User
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

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Users' }]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 text-left">
          Users
        </h1>
        <p className="text-gray-600 dark:text-slate-400 text-left mt-2">
          Review customers, order counts, and admin access.
        </p>
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

      {/* Search Bar */}
      <Card className="mb-6">
        <div className="p-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left order-2 sm:order-1 dark:bg-slate-900 dark:text-slate-100"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Search
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
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-left dark:text-slate-100"
              >
                <option value="all">All roles</option>
                <option value="USER">Users</option>
                <option value="ADMIN">Admins</option>
              </select>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                Role:
              </label>
            </div>

            <Button
              variant="secondary"
              onClick={clearFilters}
              size="sm"
              className="w-full sm:w-auto"
            >
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {data && (
        <>
          <Card>
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {formatNumber(data.data.length)} of{' '}
                  {formatNumber(data.total)} users
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Page {formatNumber(data.page)} of{' '}
                  {formatNumber(data.totalPages)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={
                          data.data.length > 0 &&
                          selectedUsers.size === data.data.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Actions
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hidden lg:table-cell">
                      Transactions
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hidden md:table-cell">
                      Email / Phone number
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Name User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hidden sm:table-cell">
                      Id
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {data.data.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex gap-2 justify-start">
                          {user.role === 'USER' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleChangeRole(user.id, 'ADMIN')}
                            >
                              Promote
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleChangeRole(user.id, 'USER')}
                            >
                              Demote
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={user.role === 'ADMIN'}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left hidden lg:table-cell">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 hover:underline text-sm"
                        >
                          {formatNumber(user._count.transactions)} Transaction
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-left">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-gray-900 dark:text-slate-100 hidden md:table-cell">
                        {user.email || user.phone || 'Not provided'}
                      </td>
                      <td className="px-4 py-3 text-left font-medium text-gray-900 dark:text-slate-100">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 hover:underline"
                        >
                          {user.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-left hidden sm:table-cell">
                        <code className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-2 py-1 rounded font-medium">
                          {user.uid}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.data.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-slate-500">
                  No users found.
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
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Page {formatNumber(currentPage)} of{' '}
                {formatNumber(data.totalPages)}
              </span>
              <Button
                variant="secondary"
                onClick={() =>
                  setCurrentPage((p) => Math.min(data.totalPages, p + 1))
                }
                disabled={currentPage === data.totalPages}
              >
                Next
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
