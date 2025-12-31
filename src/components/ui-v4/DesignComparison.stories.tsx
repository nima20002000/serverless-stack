'use client';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import ButtonV4 from './Button';
import CardV4, { CardContent, CardTitle, CardDescription } from './Card';
import InputV4 from './Input';
import BadgeV4 from './Badge';
import PillV4 from './Pill';
import StatCardV4 from './StatCard';

import ButtonV3 from '../ui-v3/Button';
import CardV3 from '../ui-v3/Card';
import InputV3 from '../ui-v3/Input';
import BadgeV3 from '../ui-v3/Badge';

const meta: Meta = {
  title: 'Design System v4 (Girlish)/Comparison',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

export const Overview: Story = {
  render: () => (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff1f2_0%,_#ffffff_45%,_#fce7f3_100%)] p-8">
      <header className="text-center mb-10">
        <h1 className="text-3xl font-bold text-rose-900">
          مقایسه طراحی v4 و v3
        </h1>
        <p className="text-rose-400 mt-2">نسخه جدید: مینیمال، مدرن و دخترانه</p>
      </header>

      <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm">
          <h2 className="text-lg font-semibold text-rose-500 mb-4 text-center">
            v3 (قدیمی)
          </h2>
          <div className="flex flex-col gap-4 items-center">
            <ButtonV3 variant="primary">دکمه اصلی</ButtonV3>
            <ButtonV3 variant="soft">دکمه نرم</ButtonV3>
            <InputV3 label="ایمیل" placeholder="example@kitia.ir" />
            <BadgeV3 variant="premium">ویژه</BadgeV3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-[0_20px_45px_-30px_rgba(236,72,153,0.45)]">
          <h2 className="text-lg font-semibold text-rose-600 mb-4 text-center">
            v4 (جدید)
          </h2>
          <div className="flex flex-col gap-4 items-center">
            <ButtonV4 variant="primary">دکمه اصلی</ButtonV4>
            <ButtonV4 variant="soft">دکمه نرم</ButtonV4>
            <InputV4 label="ایمیل" placeholder="example@kitia.ir" />
            <BadgeV4 variant="premium">ویژه</BadgeV4>
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-5xl mx-auto">
        <h3 className="text-xl font-semibold text-rose-800 mb-6 text-center">
          کارت‌ها و تجربه فرم
        </h3>
        <div className="grid grid-cols-2 gap-8">
          <CardV3 className="p-6">
            <h4 className="font-semibold text-right">کارت کلاسیک</h4>
            <p className="text-sm text-rose-500 mt-2 text-right">
              ساختار ساده با تاکید کمتر بر فضای خالی.
            </p>
          </CardV3>
          <CardV4 variant="elevated" hoverable>
            <CardContent>
              <CardTitle>کارت هوادار</CardTitle>
              <CardDescription>
                فضای تنفس بیشتر با لبه نرم و سایه ظریف.
              </CardDescription>
            </CardContent>
          </CardV4>
        </div>
      </div>

      <div className="mt-12 max-w-5xl mx-auto">
        <h3 className="text-xl font-semibold text-rose-800 mb-6 text-center">
          کامپوننت‌های جدید v4
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <CardV4 variant="soft">
            <CardContent>
              <CardTitle>پیل‌های احساس</CardTitle>
              <div className="flex flex-wrap gap-2 justify-end mt-4">
                <PillV4 tone="rose" icon={<HeartIcon />}>
                  محبوب
                </PillV4>
                <PillV4 tone="peach">جدید</PillV4>
                <PillV4 tone="mint">ارسال سریع</PillV4>
              </div>
            </CardContent>
          </CardV4>
          <StatCardV4
            label="رضایت مشتری"
            value="۹۶٪"
            trend="+۴٪"
            accent="pink"
            icon={<HeartIcon />}
          />
          <CardV4 variant="outlined">
            <CardContent>
              <CardTitle>نشان‌های ظریف</CardTitle>
              <div className="flex flex-wrap gap-2 justify-end mt-4">
                <BadgeV4 variant="default">پیش‌فرض</BadgeV4>
                <BadgeV4 variant="outline">ملایم</BadgeV4>
                <BadgeV4 variant="success">موفق</BadgeV4>
              </div>
            </CardContent>
          </CardV4>
        </div>
      </div>
    </div>
  ),
};
