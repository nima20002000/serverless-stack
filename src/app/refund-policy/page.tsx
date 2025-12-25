import { Metadata } from 'next';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'قوانین مرجوعی و بازگشت وجه - کیتیا',
  description:
    'شرایط مرجوعی کالا در کیتیا. مهلت ۷ روز، بازگشت وجه ظرف ۷ روز کاری، روند ساده مرجوعی. رضایت شما برای ما مهم است.',
  openGraph: {
    title: 'قوانین مرجوعی و بازگشت وجه - کیتیا',
    description: 'شرایط مرجوعی کالا، مهلت ۷ روز، بازگشت وجه ظرف ۷ روز کاری',
    type: 'website',
    locale: 'fa_IR',
    siteName: 'کیتیا',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'کیتیا - فروشگاه آنلاین',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'قوانین مرجوعی - کیتیا',
    description: 'شرایط مرجوعی کالا و بازگشت وجه در کیتیا',
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: getAbsoluteUrl('/refund-policy'),
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowPathIcon className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            قوانین مرجوعی و بازگشت وجه
          </h1>
          <p className="text-lg text-gray-600">رضایت شما برای ما مهم است</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              شرایط مرجوعی کالا
            </h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-4">
              <p>
                در کیتیا، رضایت شما اولویت ماست. شما می‌توانید در شرایط زیر
                محصول خریداری شده را مرجوع نمایید:
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">
                      محصول معیوب یا آسیب دیده
                    </p>
                    <p className="text-sm text-gray-600">
                      در صورتی که محصول معیوب یا آسیب دیده دریافت کرده‌اید
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">
                      عدم تطابق با توضیحات
                    </p>
                    <p className="text-sm text-gray-600">
                      محصول با توضیحات یا تصاویر سایت مطابقت ندارد
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">
                      ارسال محصول اشتباه
                    </p>
                    <p className="text-sm text-gray-600">
                      محصول ارسالی با سفارش شما متفاوت است
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              مهلت مرجوعی
            </h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <div className="bg-blue-50 border-r-4 border-blue-600 p-6">
                <p className="text-lg font-bold text-gray-900 mb-2">
                  ۷ روز از زمان تحویل
                </p>
                <p className="text-gray-700">
                  شما تا ۷ روز پس از تحویل محصول فرصت دارید درخواست مرجوعی ثبت
                  کنید.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              شرایط محصول برای مرجوعی
            </h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p className="mb-4">محصول مرجوعی باید شرایط زیر را داشته باشد:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>در بسته‌بندی اصلی و دست نخورده باشد</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>برچسب‌ها و لیبل‌های محصول سالم باشند</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>بدون استفاده یا خراشیدگی باشد</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>همراه با تمامی لوازم جانبی و دستورالعمل‌ها</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              موارد غیرقابل مرجوعی
            </h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <XCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">
                      محصولات استفاده شده
                    </p>
                    <p className="text-sm text-gray-600">
                      محصولاتی که استفاده شده‌اند قابل مرجوع نیستند
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">
                      بسته‌بندی آسیب دیده
                    </p>
                    <p className="text-sm text-gray-600">
                      محصولاتی با بسته‌بندی آسیب دیده توسط مشتری
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">گذشت از مهلت</p>
                    <p className="text-sm text-gray-600">
                      درخواست‌های بعد از ۷ روز از تحویل
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              روند مرجوعی کالا
            </h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    ۱
                  </div>
                  <div className="pt-2">
                    <p className="font-bold text-gray-900 mb-1">
                      تماس با پشتیبانی
                    </p>
                    <p className="text-gray-600">
                      با شماره ۰۹۹۱۲۲۱۸۴۶۳ تماس بگیرید و دلیل مرجوعی را اعلام
                      کنید
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    ۲
                  </div>
                  <div className="pt-2">
                    <p className="font-bold text-gray-900 mb-1">
                      بررسی درخواست
                    </p>
                    <p className="text-gray-600">
                      تیم ما درخواست شما را بررسی و تأیید می‌کند
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    ۳
                  </div>
                  <div className="pt-2">
                    <p className="font-bold text-gray-900 mb-1">ارسال محصول</p>
                    <p className="text-gray-600">
                      محصول را با بسته‌بندی مناسب به آدرس اعلامی ارسال کنید
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    ۴
                  </div>
                  <div className="pt-2">
                    <p className="font-bold text-gray-900 mb-1">بازرسی محصول</p>
                    <p className="text-gray-600">
                      پس از دریافت، محصول بررسی می‌شود
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    ۵
                  </div>
                  <div className="pt-2">
                    <p className="font-bold text-gray-900 mb-1">بازگشت وجه</p>
                    <p className="text-gray-600">
                      در صورت تأیید، وجه به حساب شما برگشت داده می‌شود
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              بازگشت وجه
            </h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>
                    بازگشت وجه ظرف ۷ روز کاری پس از تأیید مرجوعی انجام می‌شود
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>وجه به همان روش پرداخت اولیه برگشت داده می‌شود</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>در صورت عیب کالا، هزینه ارسال مرجوعی به عهده ماست</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>
                    در موارد دیگر، هزینه ارسال مرجوعی به عهده مشتری است
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t pt-8 bg-blue-50 -m-8 p-8 rounded-b-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              پشتیبانی مرجوعی
            </h2>
            <div className="text-gray-700 text-right leading-relaxed">
              <p className="mb-4">
                برای ثبت درخواست مرجوعی یا سوالات مربوط به آن، با ما تماس
                بگیرید:
              </p>
              <div className="space-y-2">
                <p className="font-bold">
                  تلفن و واتساپ: 09912218463 - 09910258259
                </p>
                <p className="text-sm text-gray-600">
                  پاسخگویی از ساعت ۱۲ ظهر تا ۹ شب
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
