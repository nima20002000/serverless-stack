'use client';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

// v3 components (new girlish design)
import ButtonV3 from './Button';
import CardV3, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
import InputV3 from './Input';
import AlertV3 from './Alert';
import ModalV3, { ModalFooter } from './Modal';
import SelectV3 from './Select';
import BadgeV3 from './Badge';
import SkeletonV3, {
  SkeletonText,
  SkeletonAvatar,
  SkeletonProduct,
} from './Skeleton';

// Old v1 components for comparison
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Alert from '../ui/Alert';

const meta: Meta = {
  title: 'Design System v3 (Girlish)/Comparison',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

const SearchIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
    />
  </svg>
);

export const ButtonComparison: Story = {
  render: () => (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 p-8">
      <h1 className="text-3xl font-bold text-rose-900 mb-2 text-center">
        مقایسه دکمه‌ها
      </h1>
      <p className="text-rose-400 text-center mb-8">
        طراحی قدیم در مقابل طراحی جدید دخترانه
      </p>

      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Old Design */}
        <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-600 mb-6 text-center border-b pb-3">
            طراحی قدیم (v1)
          </h2>
          <div className="flex flex-col gap-4 items-center">
            <Button variant="primary">دکمه اصلی</Button>
            <Button variant="secondary">دکمه ثانویه</Button>
            <Button variant="danger">حذف</Button>
            <Button variant="ghost">شفاف</Button>
            <Button isLoading>در حال بارگذاری</Button>
            <Button disabled>غیرفعال</Button>
          </div>
        </div>

        {/* New Girlish Design */}
        <div className="bg-gradient-to-br from-white to-rose-50/50 p-8 rounded-2xl border-2 border-rose-200 shadow-lg shadow-rose-100/50">
          <h2 className="text-lg font-semibold text-rose-600 mb-6 text-center border-b border-rose-100 pb-3">
            طراحی جدید (v3 - دخترانه)
          </h2>
          <div className="flex flex-col gap-4 items-center">
            <ButtonV3 variant="primary">دکمه اصلی</ButtonV3>
            <ButtonV3 variant="secondary">دکمه ثانویه</ButtonV3>
            <ButtonV3 variant="soft">دکمه نرم</ButtonV3>
            <ButtonV3 variant="outline">حاشیه‌دار</ButtonV3>
            <ButtonV3 variant="ghost">شفاف</ButtonV3>
            <ButtonV3 variant="danger">حذف</ButtonV3>
            <ButtonV3 isLoading>در حال پردازش</ButtonV3>
            <ButtonV3 disabled>غیرفعال</ButtonV3>
          </div>
        </div>
      </div>

      {/* Button Features */}
      <div className="mt-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-rose-800 mb-6 text-center">
          ویژگی‌های جدید دکمه‌ها
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <CardV3 variant="gradient" hoverable>
            <div className="text-center">
              <ButtonV3 rounded="full" size="sm" icon={<HeartIcon />}>
                علاقه‌مندی
              </ButtonV3>
              <p className="text-xs text-rose-400 mt-3">گوشه کاملاً گرد</p>
            </div>
          </CardV3>
          <CardV3 variant="gradient" hoverable>
            <div className="text-center">
              <ButtonV3 icon={<ShoppingBagIcon />} iconPosition="end">
                سبد خرید
              </ButtonV3>
              <p className="text-xs text-rose-400 mt-3">آیکون در انتها</p>
            </div>
          </CardV3>
          <CardV3 variant="gradient" hoverable>
            <div className="text-center">
              <ButtonV3 fullWidth variant="soft">
                عرض کامل
              </ButtonV3>
              <p className="text-xs text-rose-400 mt-3">عرض ۱۰۰٪</p>
            </div>
          </CardV3>
          <CardV3 variant="gradient" hoverable>
            <div className="text-center">
              <ButtonV3 size="lg">بزرگ</ButtonV3>
              <p className="text-xs text-rose-400 mt-3">سایز بزرگ</p>
            </div>
          </CardV3>
        </div>
      </div>
    </div>
  ),
};

export const CardComparison: Story = {
  render: () => (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 p-8">
      <h1 className="text-3xl font-bold text-rose-900 mb-2 text-center">
        مقایسه کارت‌ها
      </h1>
      <p className="text-rose-400 text-center mb-8">
        انواع مختلف کارت در طراحی جدید
      </p>

      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Old Design */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-600 mb-4 text-center">
            طراحی قدیم
          </h2>
          <Card>
            <h3 className="font-semibold text-right">کارت ساده</h3>
            <p className="text-sm text-gray-600 text-right mt-2">
              محتوای کارت قدیمی
            </p>
          </Card>
          <Card padding="lg">
            <h3 className="font-semibold text-right">کارت با پدینگ بیشتر</h3>
            <p className="text-sm text-gray-600 text-right mt-2">
              توضیحات اضافی
            </p>
          </Card>
        </div>

        {/* New Design Variants */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-rose-600 mb-4 text-center">
            طراحی جدید (انواع)
          </h2>
          <CardV3 variant="default">
            <CardTitle>کارت پیش‌فرض</CardTitle>
            <CardDescription>با سایه نرم و حاشیه صورتی</CardDescription>
          </CardV3>
          <CardV3 variant="elevated" hoverable>
            <CardTitle>کارت برجسته</CardTitle>
            <CardDescription>با سایه عمیق‌تر و افکت هاور</CardDescription>
          </CardV3>
          <CardV3 variant="gradient">
            <CardTitle>کارت گرادیانی</CardTitle>
            <CardDescription>پس‌زمینه گرادیان ملایم</CardDescription>
          </CardV3>
          <CardV3 variant="glass">
            <CardTitle>کارت شیشه‌ای</CardTitle>
            <CardDescription>افکت بلور پس‌زمینه</CardDescription>
          </CardV3>
        </div>
      </div>

      {/* Structured Card Example */}
      <div className="mt-12 max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold text-rose-800 mb-6 text-center">
          کارت ساختاریافته
        </h3>
        <CardV3 variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <BadgeV3 variant="premium">ویژه</BadgeV3>
              <CardTitle>عنوان کارت</CardTitle>
            </div>
            <CardDescription>توضیحات مختصر درباره محتوای کارت</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-rose-700 text-right">
              این یک نمونه از کارت ساختاریافته است که شامل هدر، محتوا و فوتر
              می‌باشد.
            </p>
          </CardContent>
          <CardFooter>
            <ButtonV3 variant="ghost" size="sm">
              انصراف
            </ButtonV3>
            <ButtonV3 size="sm">تایید</ButtonV3>
          </CardFooter>
        </CardV3>
      </div>
    </div>
  ),
};

export const InputComparison: Story = {
  render: () => (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 p-8">
      <h1 className="text-3xl font-bold text-rose-900 mb-2 text-center">
        مقایسه فیلدهای ورودی
      </h1>
      <p className="text-rose-400 text-center mb-8">
        سه نوع استایل در طراحی جدید
      </p>

      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Old Design */}
        <CardV3 variant="default">
          <h2 className="text-lg font-semibold text-gray-600 mb-6 text-center border-b border-rose-100 pb-3">
            طراحی قدیم
          </h2>
          <div className="flex flex-col gap-4">
            <Input label="نام" placeholder="نام خود را وارد کنید" />
            <Input
              label="ایمیل"
              placeholder="ایمیل"
              error="ایمیل نامعتبر است"
            />
            <Input label="غیرفعال" disabled value="مقدار ثابت" />
          </div>
        </CardV3>

        {/* New Design - Default */}
        <CardV3 variant="gradient">
          <h2 className="text-lg font-semibold text-rose-600 mb-6 text-center border-b border-rose-100 pb-3">
            طراحی جدید - پیش‌فرض
          </h2>
          <div className="flex flex-col gap-4">
            <InputV3 label="نام" placeholder="نام خود را وارد کنید" />
            <InputV3
              label="ایمیل"
              placeholder="ایمیل"
              error="ایمیل نامعتبر است"
            />
            <InputV3
              label="جستجو"
              placeholder="جستجو..."
              icon={<SearchIcon />}
            />
            <InputV3 label="غیرفعال" disabled defaultValue="مقدار ثابت" />
          </div>
        </CardV3>
      </div>

      {/* Input Variants */}
      <div className="mt-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-rose-800 mb-6 text-center">
          انواع فیلد ورودی
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <CardV3>
            <h4 className="text-sm font-medium text-rose-600 mb-4 text-center">
              پیش‌فرض
            </h4>
            <InputV3 variant="default" placeholder="حاشیه‌دار" />
          </CardV3>
          <CardV3>
            <h4 className="text-sm font-medium text-rose-600 mb-4 text-center">
              پر شده
            </h4>
            <InputV3 variant="filled" placeholder="پس‌زمینه صورتی" />
          </CardV3>
          <CardV3>
            <h4 className="text-sm font-medium text-rose-600 mb-4 text-center">
              مینیمال
            </h4>
            <InputV3 variant="minimal" placeholder="فقط خط زیر" />
          </CardV3>
        </div>
      </div>
    </div>
  ),
};

export const AlertComparison: Story = {
  render: () => (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 p-8">
      <h1 className="text-3xl font-bold text-rose-900 mb-2 text-center">
        مقایسه اعلان‌ها
      </h1>
      <p className="text-rose-400 text-center mb-8">
        سه نوع استایل: نرم، پر، حاشیه‌دار
      </p>

      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Old Design */}
        <CardV3>
          <h2 className="text-lg font-semibold text-gray-600 mb-6 text-center border-b border-rose-100 pb-3">
            طراحی قدیم
          </h2>
          <div className="flex flex-col gap-4">
            <Alert type="success">عملیات موفق</Alert>
            <Alert type="error">خطا رخ داد</Alert>
            <Alert type="warning">هشدار</Alert>
            <Alert type="info">اطلاعات</Alert>
          </div>
        </CardV3>

        {/* New Design - Soft */}
        <CardV3 variant="gradient">
          <h2 className="text-lg font-semibold text-rose-600 mb-6 text-center border-b border-rose-100 pb-3">
            طراحی جدید - نرم
          </h2>
          <div className="flex flex-col gap-4">
            <AlertV3 type="success" variant="soft">
              عملیات با موفقیت انجام شد
            </AlertV3>
            <AlertV3 type="error" variant="soft">
              خطایی رخ داده است
            </AlertV3>
            <AlertV3 type="warning" variant="soft">
              توجه کنید
            </AlertV3>
            <AlertV3 type="info" variant="soft">
              اطلاعات مهم
            </AlertV3>
          </div>
        </CardV3>
      </div>

      {/* Alert Variants */}
      <div className="mt-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-rose-800 mb-6 text-center">
          سایر انواع اعلان
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-rose-600 text-center">
              پر شده
            </h4>
            <AlertV3 type="success" variant="filled">
              موفقیت
            </AlertV3>
            <AlertV3 type="error" variant="filled">
              خطا
            </AlertV3>
            <AlertV3 type="warning" variant="filled">
              هشدار
            </AlertV3>
            <AlertV3 type="info" variant="filled">
              اطلاعات
            </AlertV3>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-rose-600 text-center">
              حاشیه‌دار
            </h4>
            <AlertV3 type="success" variant="outlined">
              موفقیت
            </AlertV3>
            <AlertV3 type="error" variant="outlined">
              خطا
            </AlertV3>
            <AlertV3 type="warning" variant="outlined">
              هشدار
            </AlertV3>
            <AlertV3 type="info" variant="outlined">
              اطلاعات
            </AlertV3>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const BadgeShowcase: Story = {
  render: () => (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 p-8">
      <h1 className="text-3xl font-bold text-rose-900 mb-2 text-center">
        نشان‌ها (Badge)
      </h1>
      <p className="text-rose-400 text-center mb-8">
        انواع مختلف نشان در طراحی جدید
      </p>

      <div className="max-w-3xl mx-auto">
        <CardV3 variant="elevated">
          <CardHeader>
            <CardTitle>انواع نشان‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Variants */}
              <div>
                <h4 className="text-sm font-medium text-rose-600 mb-3 text-right">
                  رنگ‌بندی
                </h4>
                <div className="flex flex-wrap gap-3 justify-end">
                  <BadgeV3 variant="default">پیش‌فرض</BadgeV3>
                  <BadgeV3 variant="outline">حاشیه‌دار</BadgeV3>
                  <BadgeV3 variant="success">موفق</BadgeV3>
                  <BadgeV3 variant="warning">هشدار</BadgeV3>
                  <BadgeV3 variant="error">خطا</BadgeV3>
                  <BadgeV3 variant="info">اطلاعات</BadgeV3>
                  <BadgeV3 variant="premium">ویژه</BadgeV3>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <h4 className="text-sm font-medium text-rose-600 mb-3 text-right">
                  اندازه‌ها
                </h4>
                <div className="flex flex-wrap gap-3 justify-end items-center">
                  <BadgeV3 size="sm">کوچک</BadgeV3>
                  <BadgeV3 size="md">متوسط</BadgeV3>
                  <BadgeV3 size="lg">بزرگ</BadgeV3>
                </div>
              </div>

              {/* With Dot */}
              <div>
                <h4 className="text-sm font-medium text-rose-600 mb-3 text-right">
                  با نقطه وضعیت
                </h4>
                <div className="flex flex-wrap gap-3 justify-end">
                  <BadgeV3 variant="success" dot>
                    آنلاین
                  </BadgeV3>
                  <BadgeV3 variant="warning" dot>
                    در انتظار
                  </BadgeV3>
                  <BadgeV3 variant="error" dot>
                    آفلاین
                  </BadgeV3>
                </div>
              </div>

              {/* With Pulse */}
              <div>
                <h4 className="text-sm font-medium text-rose-600 mb-3 text-right">
                  با انیمیشن ضربان
                </h4>
                <div className="flex flex-wrap gap-3 justify-end">
                  <BadgeV3 variant="success" dot pulse>
                    زنده
                  </BadgeV3>
                  <BadgeV3 variant="error" dot pulse>
                    فوری
                  </BadgeV3>
                  <BadgeV3 variant="premium" dot pulse>
                    جدید
                  </BadgeV3>
                </div>
              </div>
            </div>
          </CardContent>
        </CardV3>
      </div>
    </div>
  ),
};

export const SkeletonShowcase: Story = {
  render: () => (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 p-8">
      <h1 className="text-3xl font-bold text-rose-900 mb-2 text-center">
        اسکلتون بارگذاری
      </h1>
      <p className="text-rose-400 text-center mb-8">
        پیش‌نمایش بارگذاری با انیمیشن shimmer
      </p>

      <div className="max-w-4xl mx-auto grid grid-cols-2 gap-8">
        {/* Basic Skeletons */}
        <CardV3>
          <CardHeader>
            <CardTitle>اسکلتون‌های پایه</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-rose-500 mb-2 text-right">متن</p>
                <SkeletonV3 variant="text" />
              </div>
              <div>
                <p className="text-sm text-rose-500 mb-2 text-right">
                  دایره‌ای
                </p>
                <div className="flex gap-3 justify-end">
                  <SkeletonV3 variant="circular" width={40} height={40} />
                  <SkeletonV3 variant="circular" width={50} height={50} />
                  <SkeletonV3 variant="circular" width={60} height={60} />
                </div>
              </div>
              <div>
                <p className="text-sm text-rose-500 mb-2 text-right">گرد</p>
                <SkeletonV3 variant="rounded" height={100} />
              </div>
            </div>
          </CardContent>
        </CardV3>

        {/* Skeleton Patterns */}
        <CardV3>
          <CardHeader>
            <CardTitle>الگوهای آماده</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-rose-500 mb-2 text-right">
                  پاراگراف
                </p>
                <SkeletonText lines={3} />
              </div>
              <div>
                <p className="text-sm text-rose-500 mb-2 text-right">پروفایل</p>
                <div className="flex gap-4 items-center justify-end">
                  <div className="flex-1">
                    <SkeletonV3 variant="text" width="60%" className="mb-2" />
                    <SkeletonV3 variant="text" width="40%" />
                  </div>
                  <SkeletonAvatar size={50} />
                </div>
              </div>
            </div>
          </CardContent>
        </CardV3>
      </div>

      {/* Product Card Skeleton */}
      <div className="mt-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-rose-800 mb-6 text-center">
          اسکلتون کارت محصول
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <SkeletonProduct />
          <SkeletonProduct />
          <SkeletonProduct />
        </div>
      </div>
    </div>
  ),
};

export const FullDashboard: Story = {
  render: () => {
    const DashboardDemo = () => {
      const [isModalOpen, setIsModalOpen] = useState(false);

      return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-sm border-b border-rose-100 px-6 py-4 sticky top-0 z-10">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ButtonV3 variant="ghost" size="sm">
                  پروفایل
                </ButtonV3>
                <ButtonV3 variant="soft" size="sm">
                  تنظیمات
                </ButtonV3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                  کیتیا
                </span>
                <HeartIcon />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-6xl mx-auto p-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                {
                  title: 'کاربران',
                  value: '۱,۲۳۴',
                  change: '+۱۲٪',
                  color: 'success',
                },
                {
                  title: 'سفارشات',
                  value: '۵۶۷',
                  change: '+۸٪',
                  color: 'info',
                },
                {
                  title: 'درآمد',
                  value: '۴۵.۶M',
                  change: '+۲۳٪',
                  color: 'premium',
                },
                {
                  title: 'محصولات',
                  value: '۸۹',
                  change: '+۳٪',
                  color: 'warning',
                },
              ].map((stat, i) => (
                <CardV3 key={i} variant="gradient" hoverable>
                  <div className="text-right">
                    <div className="flex items-center justify-between mb-2">
                      <BadgeV3
                        variant={
                          stat.color as
                            | 'success'
                            | 'info'
                            | 'premium'
                            | 'warning'
                        }
                        size="sm"
                        dot
                        pulse
                      >
                        {stat.change}
                      </BadgeV3>
                      <span className="text-sm text-rose-400">
                        {stat.title}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-rose-900">
                      {stat.value}
                    </span>
                  </div>
                </CardV3>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Recent Orders */}
              <div className="col-span-2">
                <CardV3 variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <ButtonV3 variant="ghost" size="sm">
                        مشاهده همه
                      </ButtonV3>
                      <CardTitle>سفارشات اخیر</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          id: 'KT-123456',
                          status: 'success',
                          label: 'تکمیل شده',
                          amount: '۲۵۰,۰۰۰ تومان',
                        },
                        {
                          id: 'KT-123457',
                          status: 'warning',
                          label: 'در حال پردازش',
                          amount: '۱۸۰,۰۰۰ تومان',
                        },
                        {
                          id: 'KT-123458',
                          status: 'info',
                          label: 'جدید',
                          amount: '۳۲۰,۰۰۰ تومان',
                        },
                      ].map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between py-3 border-b border-rose-50 last:border-0"
                        >
                          <BadgeV3
                            variant={
                              order.status as 'success' | 'warning' | 'info'
                            }
                            dot
                          >
                            {order.label}
                          </BadgeV3>
                          <span className="text-rose-500 text-sm">
                            {order.amount}
                          </span>
                          <span className="font-mono text-rose-700">
                            {order.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CardV3>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <CardV3 variant="glass">
                  <CardTitle>عملیات سریع</CardTitle>
                  <div className="mt-4 space-y-3">
                    <ButtonV3 fullWidth icon={<ShoppingBagIcon />}>
                      افزودن محصول
                    </ButtonV3>
                    <ButtonV3 variant="secondary" fullWidth>
                      گزارش‌گیری
                    </ButtonV3>
                    <ButtonV3
                      variant="outline"
                      fullWidth
                      onClick={() => setIsModalOpen(true)}
                    >
                      تنظیمات
                    </ButtonV3>
                  </div>
                </CardV3>

                <AlertV3 type="info" variant="soft" compact>
                  ۳ سفارش جدید منتظر بررسی است.
                </AlertV3>
              </div>
            </div>

            {/* Form Section */}
            <CardV3 className="mt-6" variant="gradient">
              <CardHeader>
                <CardTitle>جستجوی پیشرفته</CardTitle>
                <CardDescription>
                  فیلتر محصولات بر اساس معیارهای مختلف
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <InputV3
                    label="نام محصول"
                    placeholder="جستجو..."
                    icon={<SearchIcon />}
                    variant="filled"
                  />
                  <SelectV3
                    label="دسته‌بندی"
                    options={[
                      { value: 'all', label: 'همه' },
                      { value: 'cosmetics', label: 'آرایشی' },
                      { value: 'accessories', label: 'اکسسوری' },
                    ]}
                    placeholder="انتخاب کنید"
                    variant="filled"
                  />
                  <SelectV3
                    label="وضعیت"
                    options={[
                      { value: 'all', label: 'همه' },
                      { value: 'active', label: 'فعال' },
                      { value: 'inactive', label: 'غیرفعال' },
                    ]}
                    placeholder="انتخاب کنید"
                    variant="filled"
                  />
                </div>
                <div className="flex justify-start gap-3 mt-6">
                  <ButtonV3 variant="ghost">پاک کردن</ButtonV3>
                  <ButtonV3>جستجو</ButtonV3>
                </div>
              </CardContent>
            </CardV3>
          </main>

          {/* Modal */}
          <ModalV3
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="تنظیمات"
            description="تنظیمات سیستم را ویرایش کنید"
          >
            <div className="space-y-4">
              <InputV3
                label="نام فروشگاه"
                defaultValue="کیتیا"
                variant="filled"
              />
              <InputV3
                label="ایمیل پشتیبانی"
                placeholder="support@kitia.ir"
                variant="filled"
              />
              <SelectV3
                label="زبان"
                options={[
                  { value: 'fa', label: 'فارسی' },
                  { value: 'en', label: 'English' },
                ]}
                defaultValue="fa"
                variant="filled"
              />
            </div>
            <ModalFooter>
              <ButtonV3 variant="ghost" onClick={() => setIsModalOpen(false)}>
                انصراف
              </ButtonV3>
              <ButtonV3>ذخیره تغییرات</ButtonV3>
            </ModalFooter>
          </ModalV3>
        </div>
      );
    };

    return <DashboardDemo />;
  },
};

export const DesignPrinciples: Story = {
  render: () => (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-rose-900 mb-2 text-center">
          اصول طراحی Kitia v3
        </h1>
        <p className="text-rose-400 text-center mb-12">
          طراحی دخترانه، مینیمال، متمرکز بر تجربه کاربری
        </p>

        <div className="space-y-8">
          {/* Color Palette */}
          <section>
            <h2 className="text-xl font-semibold text-rose-800 mb-4 text-right">
              پالت رنگی
            </h2>
            <CardV3 variant="gradient">
              <div className="grid grid-cols-6 gap-3">
                {[
                  { color: 'rgb(136,19,55)', name: 'Rose 900' },
                  { color: 'rgb(190,18,60)', name: 'Rose 700' },
                  { color: 'rgb(244,63,94)', name: 'Rose 500' },
                  { color: 'rgb(251,113,133)', name: 'Rose 400' },
                  { color: 'rgb(254,205,211)', name: 'Rose 200' },
                  { color: 'rgb(255,241,242)', name: 'Rose 50' },
                ].map((c) => (
                  <div key={c.name} className="text-center">
                    <div
                      className="w-full aspect-square rounded-xl mb-2 shadow-md"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-xs text-rose-500">{c.name}</span>
                  </div>
                ))}
              </div>
            </CardV3>
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-xl font-semibold text-rose-800 mb-4 text-right">
              تایپوگرافی
            </h2>
            <CardV3 variant="glass">
              <div className="space-y-4 text-right">
                <p className="text-3xl font-bold text-rose-900">
                  عنوان اصلی - Bold 30px
                </p>
                <p className="text-xl font-semibold text-rose-800">
                  عنوان فرعی - Semibold 20px
                </p>
                <p className="text-base text-rose-700">
                  متن بدنه - Regular 16px
                </p>
                <p className="text-sm text-rose-500">متن کوچک - Regular 14px</p>
                <p className="text-xs text-rose-400">متن ریز - Regular 12px</p>
              </div>
            </CardV3>
          </section>

          {/* Design Principles */}
          <section>
            <h2 className="text-xl font-semibold text-rose-800 mb-4 text-right">
              ویژگی‌های کلیدی
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  title: 'رنگ‌های نرم',
                  desc: 'پالت صورتی و رز برای حس دخترانه و لطیف',
                },
                {
                  title: 'گرادیان‌های ملایم',
                  desc: 'انتقال رنگ نرم برای عمق بصری',
                },
                {
                  title: 'گوشه‌های گرد',
                  desc: 'حاشیه‌های ۲XL برای ظاهر دوستانه',
                },
                {
                  title: 'سایه‌های رنگی',
                  desc: 'سایه‌های صورتی برای یکپارچگی',
                },
                {
                  title: 'انتقال‌های نرم',
                  desc: 'انیمیشن ۳۰۰ms برای تعاملات روان',
                },
                { title: 'افکت شیشه‌ای', desc: 'بلور پس‌زمینه برای مدرن بودن' },
              ].map((principle) => (
                <CardV3 key={principle.title} variant="elevated" hoverable>
                  <h3 className="font-semibold text-rose-700 text-right">
                    {principle.title}
                  </h3>
                  <p className="text-sm text-rose-400 mt-1 text-right">
                    {principle.desc}
                  </p>
                </CardV3>
              ))}
            </div>
          </section>

          {/* Comparison Summary */}
          <section>
            <h2 className="text-xl font-semibold text-rose-800 mb-4 text-right">
              مقایسه با نسخه‌های قبلی
            </h2>
            <CardV3 variant="elevated">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rose-100">
                      <th className="py-3 px-4 text-right text-rose-600">
                        v3 (جدید)
                      </th>
                      <th className="py-3 px-4 text-right text-gray-500">v2</th>
                      <th className="py-3 px-4 text-right text-gray-400">v1</th>
                      <th className="py-3 px-4 text-right text-rose-700">
                        ویژگی
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-right">
                    <tr className="border-b border-rose-50">
                      <td className="py-3 px-4 text-rose-600">صورتی/رز</td>
                      <td className="py-3 px-4 text-gray-500">خاکستری/سیاه</td>
                      <td className="py-3 px-4 text-gray-400">آبی/خاکستری</td>
                      <td className="py-3 px-4 font-medium text-rose-700">
                        پالت رنگی
                      </td>
                    </tr>
                    <tr className="border-b border-rose-50">
                      <td className="py-3 px-4 text-rose-600">۲XL (۱۶px)</td>
                      <td className="py-3 px-4 text-gray-500">XL (۱۲px)</td>
                      <td className="py-3 px-4 text-gray-400">LG (۸px)</td>
                      <td className="py-3 px-4 font-medium text-rose-700">
                        گوشه‌گردی
                      </td>
                    </tr>
                    <tr className="border-b border-rose-50">
                      <td className="py-3 px-4 text-rose-600">Shimmer</td>
                      <td className="py-3 px-4 text-gray-500">Pulse</td>
                      <td className="py-3 px-4 text-gray-400">ندارد</td>
                      <td className="py-3 px-4 font-medium text-rose-700">
                        اسکلتون
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-rose-600">گرادیان نرم</td>
                      <td className="py-3 px-4 text-gray-500">یکدست</td>
                      <td className="py-3 px-4 text-gray-400">یکدست</td>
                      <td className="py-3 px-4 font-medium text-rose-700">
                        پس‌زمینه
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardV3>
          </section>
        </div>
      </div>
    </div>
  ),
};
