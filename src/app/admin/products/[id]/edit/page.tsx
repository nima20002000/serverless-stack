'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

interface EditProductPageProps {
  params: { id: string };
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`);
      if (!response.ok) throw new Error('محصول یافت نشد');

      const data = await response.json();
      const product = data.product;

      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        stock: product.stock.toString(),
        isActive: product.isActive,
      });
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'نام محصول الزامی است';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'توضیحات محصول الزامی است';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'قیمت باید بیشتر از صفر باشد';
    }

    if (!formData.stock || parseInt(formData.stock) < 0) {
      newErrors.stock = 'موجودی نمی‌تواند منفی باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در به‌روزرسانی محصول');
      }

      router.push('/admin/products');
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
      <Breadcrumbs
        items={[
          { label: 'مدیریت محصولات', href: '/admin/products' },
          { label: 'ویرایش محصول' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 text-right">
          ویرایش محصول
        </h1>
      </div>

      {errorMessage && (
        <Alert type="error" className="mb-4" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="نام محصول"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            disabled={isSaving}
            placeholder="مثال: لپ‌تاپ ایسوس"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              توضیحات محصول
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={isSaving}
              rows={5}
              className="w-full px-4 py-2 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="توضیحات کامل محصول را وارد کنید"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 text-right">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="قیمت (تومان)"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              error={errors.price}
              disabled={isSaving}
              placeholder="1500000"
              dir="ltr"
            />

            <Input
              label="موجودی"
              name="stock"
              type="number"
              value={formData.stock}
              onChange={handleChange}
              error={errors.stock}
              disabled={isSaving}
              placeholder="10"
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={isSaving}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              محصول فعال باشد
            </label>
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
