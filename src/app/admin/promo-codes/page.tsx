'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { format } from 'date-fns-jalali';

interface PromoCode {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  expiresAt: string;
  createdAt: string;
  maxUsageCount: number | null;
  currentUsageCount: number | null;
  isActive: boolean | null;
  isUsed: boolean;
  description: string | null;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  userId: string | null;
}

export default function PromoCodesManagementPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED',
    discountValue: '',
    expiresAt: '',
    maxUsageCount: '',
    description: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    isActive: true,
  });

  const fetchPromoCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/promo-codes');
      if (!response.ok) throw new Error('خطا در دریافت کدهای تخفیف');
      const data = await response.json();
      setPromoCodes(data.data || []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
      setPromoCodes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingPromo
        ? `/api/admin/promo-codes/${editingPromo.id}`
        : '/api/admin/promo-codes';

      const method = editingPromo ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          discountType: formData.discountType,
          discountValue: formData.discountValue,
          expiresAt: formData.expiresAt,
          maxUsageCount: formData.maxUsageCount || null,
          description: formData.description || null,
          minOrderAmount: formData.minOrderAmount || null,
          maxDiscountAmount: formData.maxDiscountAmount || null,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در ذخیره کد تخفیف');
      }

      setSuccessMessage(
        editingPromo
          ? 'کد تخفیف با موفقیت ویرایش شد'
          : 'کد تخفیف با موفقیت ایجاد شد'
      );
      handleCancelForm();
      fetchPromoCodes();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);

    // Format date for datetime-local input
    const expiresDate = new Date(promo.expiresAt);
    const localDate = new Date(
      expiresDate.getTime() - expiresDate.getTimezoneOffset() * 60000
    );
    const formattedDate = localDate.toISOString().slice(0, 16);

    setFormData({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue.toString(),
      expiresAt: formattedDate,
      maxUsageCount: promo.maxUsageCount?.toString() || '',
      description: promo.description || '',
      minOrderAmount: promo.minOrderAmount?.toString() || '',
      maxDiscountAmount: promo.maxDiscountAmount?.toString() || '',
      isActive: promo.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`آیا از حذف کد تخفیف "${code}" اطمینان دارید؟`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در حذف کد تخفیف');
      }

      setSuccessMessage('کد تخفیف با موفقیت حذف شد');
      fetchPromoCodes();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPromo(null);
    setFormData({
      code: '',
      discountType: 'PERCENT',
      discountValue: '',
      expiresAt: '',
      maxUsageCount: '',
      description: '',
      minOrderAmount: '',
      maxDiscountAmount: '',
      isActive: true,
    });
  };

  const toggleActive = async (id: string, currentStatus: boolean | null) => {
    try {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error('خطا در تغییر وضعیت');

      setSuccessMessage('وضعیت کد تخفیف تغییر یافت');
      fetchPromoCodes();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fa-IR') + ' تومان';
  };

  const getStatusInfo = (promo: PromoCode) => {
    const now = new Date();
    const expiresAt = new Date(promo.expiresAt);

    if (!promo.isActive) {
      return {
        text: 'غیرفعال',
        className:
          'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300',
      };
    }
    if (expiresAt < now) {
      return {
        text: 'منقضی',
        className:
          'bg-red-100 text-red-800 dark:bg-rose-900/40 dark:text-rose-200',
      };
    }
    if (
      promo.maxUsageCount &&
      (promo.currentUsageCount ?? 0) >= promo.maxUsageCount
    ) {
      return {
        text: 'تکمیل',
        className:
          'bg-yellow-100 text-yellow-800 dark:bg-amber-900/40 dark:text-amber-200',
      };
    }
    return {
      text: 'فعال',
      className:
        'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-slate-400">
          در حال بارگذاری...
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'مدیریت کدهای تخفیف' }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          {showForm ? 'انصراف' : 'افزودن کد تخفیف جدید'}
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 order-1 sm:order-2">
          مدیریت کدهای تخفیف
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

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4 text-right">
              {editingPromo ? 'ویرایش کد تخفیف' : 'افزودن کد تخفیف جدید'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
                    کد تخفیف *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left font-mono dark:bg-slate-900 dark:text-slate-100"
                      placeholder="SUMMER2024"
                      required
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={generateRandomCode}
                    >
                      تولید
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
                    نوع تخفیف *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as 'PERCENT' | 'FIXED',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white dark:bg-slate-900 dark:text-slate-100"
                    required
                  >
                    <option value="PERCENT">درصدی</option>
                    <option value="FIXED">مبلغ ثابت</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
                    {formData.discountType === 'PERCENT'
                      ? 'درصد تخفیف *'
                      : 'مبلغ تخفیف (تومان) *'}
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                    placeholder={
                      formData.discountType === 'PERCENT' ? '10' : '50000'
                    }
                    min="0"
                    max={
                      formData.discountType === 'PERCENT' ? '100' : undefined
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
                    تاریخ انقضا *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      setFormData({ ...formData, expiresAt: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
                    حداکثر دفعات استفاده
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsageCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUsageCount: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                    placeholder="نامحدود"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
                    حداقل مبلغ سفارش (تومان)
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minOrderAmount: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                    placeholder="بدون محدودیت"
                    min="0"
                  />
                </div>
                {formData.discountType === 'PERCENT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
                      سقف تخفیف (تومان)
                    </label>
                    <input
                      type="number"
                      value={formData.maxDiscountAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxDiscountAmount: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                      placeholder="بدون سقف"
                      min="0"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
                  توضیحات
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right dark:bg-slate-900 dark:text-slate-100"
                  placeholder="مثال: کد تخفیف شب یلدا"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-right cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    فعال
                  </span>
                </label>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelForm}
                >
                  انصراف
                </Button>
                <Button type="submit" variant="primary" isLoading={isSaving}>
                  {editingPromo ? 'ذخیره تغییرات' : 'ایجاد کد تخفیف'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Promo Codes List */}
      <Card>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
                  عملیات
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
                  وضعیت
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
                  استفاده
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100 hidden lg:table-cell">
                  انقضا
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
                  تخفیف
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
                  کد
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {promoCodes.map((promo) => {
                const status = getStatusInfo(promo);
                return (
                  <tr
                    key={promo.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(promo)}
                        >
                          ویرایش
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(promo.id, promo.code)}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleActive(promo.id, promo.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}
                      >
                        {status.text}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-900 dark:text-slate-100">
                        {promo.currentUsageCount ?? 0}
                        {promo.maxUsageCount && ` / ${promo.maxUsageCount}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-slate-400 hidden lg:table-cell">
                      {format(new Date(promo.expiresAt), 'yyyy/MM/dd - HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-gray-900 dark:text-slate-100 font-medium">
                        {promo.discountType === 'PERCENT'
                          ? `${promo.discountValue}٪`
                          : formatPrice(promo.discountValue)}
                      </div>
                      {promo.minOrderAmount && (
                        <div className="text-xs text-gray-500 dark:text-slate-500">
                          حداقل: {formatPrice(promo.minOrderAmount)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <code className="text-sm font-mono bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {promo.code}
                      </code>
                      {promo.description && (
                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                          {promo.description}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {promoCodes.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-slate-500">
              هیچ کد تخفیفی وجود ندارد
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
