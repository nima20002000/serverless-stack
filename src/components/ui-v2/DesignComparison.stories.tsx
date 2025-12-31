'use client';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

// New components
import ButtonV2 from './Button';
import CardV2, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
import InputV2 from './Input';
import AlertV2 from './Alert';
import ModalV2, { ModalFooter } from './Modal';
import SelectV2 from './Select';
import BadgeV2 from './Badge';
import SkeletonV2, { SkeletonText, SkeletonAvatar } from './Skeleton';

// Old components
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import Modal from '../ui/Modal';

const meta: Meta = {
  title: 'Design Comparison/Side by Side',
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

export const ButtonComparison: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f8f9fa] p-8">
      <h1 className="text-2xl font-bold text-[#212529] mb-8 text-center">
        مقایسه دکمه‌ها
      </h1>

      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Old Design */}
        <div className="bg-white p-6 rounded-xl border border-[#e9ecef]">
          <h2 className="text-lg font-semibold text-[#dc2626] mb-4 text-center">
            طراحی قدیم
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

        {/* New Design */}
        <div className="bg-white p-6 rounded-xl border border-[#e9ecef]">
          <h2 className="text-lg font-semibold text-[#16a34a] mb-4 text-center">
            طراحی جدید
          </h2>
          <div className="flex flex-col gap-4 items-center">
            <ButtonV2 variant="primary">دکمه اصلی</ButtonV2>
            <ButtonV2 variant="secondary">دکمه ثانویه</ButtonV2>
            <ButtonV2 variant="danger">حذف</ButtonV2>
            <ButtonV2 variant="ghost">شفاف</ButtonV2>
            <ButtonV2 isLoading>در حال بارگذاری</ButtonV2>
            <ButtonV2 disabled>غیرفعال</ButtonV2>
          </div>
        </div>
      </div>

      <div className="mt-8 max-w-2xl mx-auto bg-white p-6 rounded-xl border border-[#e9ecef]">
        <h3 className="font-semibold text-[#212529] mb-3 text-right">
          تفاوت‌های کلیدی:
        </h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>✓ رنگ اصلی خاکستری تیره به جای آبی (حرفه‌ای‌تر)</li>
          <li>✓ انیمیشن scale هنگام کلیک</li>
          <li>✓ سایه‌های نرم‌تر</li>
          <li>✓ variant جدید: outline</li>
          <li>✓ پشتیبانی از آیکون</li>
        </ul>
      </div>
    </div>
  ),
};

export const CardComparison: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f8f9fa] p-8">
      <h1 className="text-2xl font-bold text-[#212529] mb-8 text-center">
        مقایسه کارت‌ها
      </h1>

      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Old Design */}
        <div className="bg-white p-6 rounded-xl border border-[#e9ecef]">
          <h2 className="text-lg font-semibold text-[#dc2626] mb-4 text-center">
            طراحی قدیم
          </h2>
          <div className="flex flex-col gap-4">
            <Card>
              <h3 className="font-semibold text-right">عنوان کارت</h3>
              <p className="text-sm text-gray-600 text-right mt-2">
                توضیحات کارت قدیم
              </p>
            </Card>
            <Card padding="lg">
              <h3 className="font-semibold text-right">کارت با پدینگ بیشتر</h3>
              <p className="text-sm text-gray-600 text-right mt-2">
                محتوای کارت
              </p>
            </Card>
          </div>
        </div>

        {/* New Design */}
        <div className="bg-white p-6 rounded-xl border border-[#e9ecef]">
          <h2 className="text-lg font-semibold text-[#16a34a] mb-4 text-center">
            طراحی جدید
          </h2>
          <div className="flex flex-col gap-4">
            <CardV2>
              <CardHeader>
                <CardTitle>عنوان کارت</CardTitle>
                <CardDescription>توضیحات کارت جدید</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#495057] text-right">
                  محتوای ساختاریافته
                </p>
              </CardContent>
            </CardV2>
            <CardV2 variant="elevated" hoverable>
              <CardTitle>کارت تعاملی</CardTitle>
              <p className="text-sm text-[#868e96] text-right mt-2">
                با افکت هاور
              </p>
            </CardV2>
          </div>
        </div>
      </div>

      <div className="mt-8 max-w-2xl mx-auto bg-white p-6 rounded-xl border border-[#e9ecef]">
        <h3 className="font-semibold text-[#212529] mb-3 text-right">
          تفاوت‌های کلیدی:
        </h3>
        <ul className="text-sm text-[#495057] space-y-2 text-right">
          <li>✓ سایه‌های نرم‌تر و طبیعی‌تر</li>
          <li>✓ گوشه‌های xl به جای lg</li>
          <li>✓ کامپوننت‌های فرعی (Header, Title, Footer)</li>
          <li>✓ ۴ نوع variant مختلف</li>
          <li>✓ حالت hoverable با انیمیشن</li>
        </ul>
      </div>
    </div>
  ),
};

export const InputComparison: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f8f9fa] p-8">
      <h1 className="text-2xl font-bold text-[#212529] mb-8 text-center">
        مقایسه فیلدهای ورودی
      </h1>

      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Old Design */}
        <div className="bg-white p-6 rounded-xl border border-[#e9ecef]">
          <h2 className="text-lg font-semibold text-[#dc2626] mb-4 text-center">
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
        </div>

        {/* New Design */}
        <div className="bg-white p-6 rounded-xl border border-[#e9ecef]">
          <h2 className="text-lg font-semibold text-[#16a34a] mb-4 text-center">
            طراحی جدید
          </h2>
          <div className="flex flex-col gap-4">
            <InputV2 label="نام" placeholder="نام خود را وارد کنید" />
            <InputV2
              label="ایمیل"
              placeholder="ایمیل"
              error="ایمیل نامعتبر است"
            />
            <InputV2
              label="جستجو"
              placeholder="جستجو..."
              icon={<SearchIcon />}
            />
            <InputV2 label="غیرفعال" disabled defaultValue="مقدار ثابت" />
          </div>
        </div>
      </div>
    </div>
  ),
};

export const AlertComparison: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f8f9fa] p-8">
      <h1 className="text-2xl font-bold text-[#212529] mb-8 text-center">
        مقایسه اعلان‌ها
      </h1>

      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Old Design */}
        <div className="bg-white p-6 rounded-xl border border-[#e9ecef]">
          <h2 className="text-lg font-semibold text-[#dc2626] mb-4 text-center">
            طراحی قدیم
          </h2>
          <div className="flex flex-col gap-4">
            <Alert type="success">عملیات موفق</Alert>
            <Alert type="error">خطا رخ داد</Alert>
            <Alert type="warning">هشدار</Alert>
            <Alert type="info">اطلاعات</Alert>
          </div>
        </div>

        {/* New Design */}
        <div className="bg-white p-6 rounded-xl border border-[#e9ecef]">
          <h2 className="text-lg font-semibold text-[#16a34a] mb-4 text-center">
            طراحی جدید
          </h2>
          <div className="flex flex-col gap-4">
            <AlertV2 type="success">عملیات موفق</AlertV2>
            <AlertV2 type="error">خطا رخ داد</AlertV2>
            <AlertV2 type="warning">هشدار</AlertV2>
            <AlertV2 type="info">اطلاعات</AlertV2>
          </div>
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
        <div className="min-h-screen bg-[#f8f9fa]">
          {/* Header */}
          <header className="bg-white border-b border-[#e9ecef] px-6 py-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ButtonV2 variant="ghost" size="sm">
                  پروفایل
                </ButtonV2>
                <ButtonV2 variant="outline" size="sm">
                  تنظیمات
                </ButtonV2>
              </div>
              <h1 className="text-xl font-bold text-[#212529]">
                داشبورد طراحی جدید
              </h1>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-6xl mx-auto p-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { title: 'کاربران', value: '۱,۲۳۴', change: '+۱۲٪' },
                { title: 'سفارشات', value: '۵۶۷', change: '+۸٪' },
                { title: 'درآمد', value: '۴۵.۶M', change: '+۲۳٪' },
                { title: 'محصولات', value: '۸۹', change: '+۳٪' },
              ].map((stat, i) => (
                <CardV2 key={i}>
                  <div className="text-right">
                    <div className="flex items-center justify-between mb-2">
                      <BadgeV2 variant="success" size="sm">
                        {stat.change}
                      </BadgeV2>
                      <span className="text-sm text-[#868e96]">
                        {stat.title}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-[#212529]">
                      {stat.value}
                    </span>
                  </div>
                </CardV2>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Recent Orders */}
              <div className="col-span-2">
                <CardV2>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <ButtonV2 variant="ghost" size="sm">
                        مشاهده همه
                      </ButtonV2>
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
                        },
                        {
                          id: 'KT-123457',
                          status: 'warning',
                          label: 'در حال پردازش',
                        },
                        { id: 'KT-123458', status: 'info', label: 'جدید' },
                      ].map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between py-3 border-b border-[#f1f3f5] last:border-0"
                        >
                          <BadgeV2
                            variant={
                              order.status as 'success' | 'warning' | 'info'
                            }
                            dot
                          >
                            {order.label}
                          </BadgeV2>
                          <span className="font-mono text-[#495057]">
                            {order.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CardV2>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <CardV2>
                  <CardTitle>عملیات سریع</CardTitle>
                  <div className="mt-4 space-y-3">
                    <ButtonV2 fullWidth>افزودن محصول</ButtonV2>
                    <ButtonV2 variant="secondary" fullWidth>
                      گزارش‌گیری
                    </ButtonV2>
                    <ButtonV2
                      variant="outline"
                      fullWidth
                      onClick={() => setIsModalOpen(true)}
                    >
                      تنظیمات
                    </ButtonV2>
                  </div>
                </CardV2>

                <AlertV2 type="info" compact>
                  ۳ سفارش جدید منتظر بررسی است.
                </AlertV2>
              </div>
            </div>

            {/* Form Section */}
            <CardV2 className="mt-6">
              <CardHeader>
                <CardTitle>جستجوی پیشرفته</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <InputV2
                    label="نام محصول"
                    placeholder="جستجو..."
                    icon={<SearchIcon />}
                  />
                  <SelectV2
                    label="دسته‌بندی"
                    options={[
                      { value: 'all', label: 'همه' },
                      { value: 'electronics', label: 'الکترونیک' },
                      { value: 'clothing', label: 'پوشاک' },
                    ]}
                    placeholder="انتخاب کنید"
                  />
                  <SelectV2
                    label="وضعیت"
                    options={[
                      { value: 'all', label: 'همه' },
                      { value: 'active', label: 'فعال' },
                      { value: 'inactive', label: 'غیرفعال' },
                    ]}
                    placeholder="انتخاب کنید"
                  />
                </div>
                <div className="flex justify-start gap-3 mt-4">
                  <ButtonV2 variant="ghost">پاک کردن</ButtonV2>
                  <ButtonV2>جستجو</ButtonV2>
                </div>
              </CardContent>
            </CardV2>
          </main>

          {/* Modal */}
          <ModalV2
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="تنظیمات"
            description="تنظیمات سیستم را ویرایش کنید"
          >
            <div className="space-y-4">
              <InputV2 label="نام فروشگاه" defaultValue="کیتیا" />
              <InputV2 label="ایمیل پشتیبانی" placeholder="support@kitia.ir" />
              <SelectV2
                label="زبان"
                options={[
                  { value: 'fa', label: 'فارسی' },
                  { value: 'en', label: 'English' },
                ]}
                defaultValue="fa"
              />
            </div>
            <ModalFooter>
              <ButtonV2 variant="ghost" onClick={() => setIsModalOpen(false)}>
                انصراف
              </ButtonV2>
              <ButtonV2>ذخیره</ButtonV2>
            </ModalFooter>
          </ModalV2>
        </div>
      );
    };

    return <DashboardDemo />;
  },
};

export const DesignPrinciples: Story = {
  render: () => (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#212529] mb-2 text-center">
          اصول طراحی Kitia v2
        </h1>
        <p className="text-[#868e96] text-center mb-12">
          مینیمال، تمیز، متمرکز بر تجربه کاربری
        </p>

        <div className="space-y-8">
          {/* Color Palette */}
          <section>
            <h2 className="text-xl font-semibold text-[#212529] mb-4 text-right">
              پالت رنگی
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {[
                { color: '#212529', name: 'Primary 900' },
                { color: '#495057', name: 'Primary 700' },
                { color: '#868e96', name: 'Primary 600' },
                { color: '#dee2e6', name: 'Primary 300' },
                { color: '#f8f9fa', name: 'Primary 50' },
              ].map((c) => (
                <div key={c.color} className="text-center">
                  <div
                    className="w-full aspect-square rounded-lg mb-2 border border-[#e9ecef]"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs text-[#868e96]">{c.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-xl font-semibold text-[#212529] mb-4 text-right">
              تایپوگرافی
            </h2>
            <CardV2 variant="ghost">
              <div className="space-y-3 text-right">
                <p className="text-2xl font-bold text-[#212529]">
                  عنوان اصلی - Bold 24px
                </p>
                <p className="text-lg font-semibold text-[#212529]">
                  عنوان فرعی - Semibold 18px
                </p>
                <p className="text-base text-[#495057]">
                  متن بدنه - Regular 16px
                </p>
                <p className="text-sm text-[#868e96]">
                  متن کوچک - Regular 14px
                </p>
              </div>
            </CardV2>
          </section>

          {/* Spacing */}
          <section>
            <h2 className="text-xl font-semibold text-[#212529] mb-4 text-right">
              فاصله‌گذاری
            </h2>
            <div className="flex items-end gap-2">
              {[4, 8, 12, 16, 24, 32, 48].map((space) => (
                <div key={space} className="text-center">
                  <div
                    className="bg-[#212529] rounded"
                    style={{ width: space, height: space }}
                  />
                  <span className="text-xs text-[#868e96] mt-2 block">
                    {space}px
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Principles */}
          <section>
            <h2 className="text-xl font-semibold text-[#212529] mb-4 text-right">
              اصول طراحی
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  title: 'مینیمالیسم',
                  desc: 'حذف عناصر غیرضروری، تمرکز بر محتوا',
                },
                { title: 'فضای منفی', desc: 'استفاده هوشمندانه از فضای خالی' },
                {
                  title: 'سلسله‌مراتب بصری',
                  desc: 'هدایت چشم کاربر با کنتراست و اندازه',
                },
                { title: 'انتقال‌های نرم', desc: 'انیمیشن‌های ظریف و هدفمند' },
              ].map((principle) => (
                <CardV2 key={principle.title} variant="outlined">
                  <h3 className="font-semibold text-[#212529] text-right">
                    {principle.title}
                  </h3>
                  <p className="text-sm text-[#868e96] mt-1 text-right">
                    {principle.desc}
                  </p>
                </CardV2>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  ),
};
