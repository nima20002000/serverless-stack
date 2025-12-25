import { Metadata } from 'next';
import {
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'اطلاعات ارسال - کیتیا',
  description:
    'راهنمای ارسال و تحویل سفارشات کیتیا. ارسال با تیپاکس، زمان تحویل ۱-۳ روز کاری، هزینه ارسال ۲۰۰ هزار تومان. پیگیری آنلاین سفارشات.',
  openGraph: {
    title: 'اطلاعات ارسال - کیتیا',
    description:
      'ارسال سریع با تیپاکس، تحویل ۱-۳ روز کاری، امکان پیگیری آنلاین',
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
    title: 'اطلاعات ارسال - کیتیا',
    description: 'راهنمای ارسال و تحویل سفارشات کیتیا',
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: getAbsoluteUrl('/shipping'),
  },
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TruckIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            اطلاعات ارسال
          </h1>
          <p className="text-lg text-gray-600">
            راهنمای ارسال و تحویل سفارشات کیتیا
          </p>
        </div>

        <div className="space-y-6">
          {/* Shipping Method */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <TruckIcon className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">روش ارسال</h2>
            </div>
            <div className="text-gray-700 text-right leading-relaxed space-y-4">
              <p className="text-lg">
                تمامی سفارشات از طریق{' '}
                <span className="font-bold text-blue-600">تیپاکس</span> ارسال
                می‌شوند.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="font-bold text-gray-900 mb-2">
                  مزایای ارسال با تیپاکس:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>سرعت بالا در ارسال</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>امکان پیگیری آنلاین با کد رهگیری</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>بیمه محموله</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>تحویل درب منزل</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Delivery Time */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <ClockIcon className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">زمان ارسال</h2>
            </div>
            <div className="text-gray-700 text-right leading-relaxed space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">زمان تحویل</p>
                <p className="text-3xl font-bold text-blue-600 mb-1">
                  ۱-۳ روز کاری
                </p>
                <p className="text-sm text-gray-600">برای سراسر کشور</p>
              </div>
              <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 mt-4">
                <p className="text-sm text-gray-700">
                  <span className="font-bold">توجه:</span> برای ارسال فوری در
                  تهران و کرج، می‌توانید با پشتیبانی تماس بگیرید. امکان ارسال با
                  اسنپ باکس در کمتر از ۲ ساعت وجود دارد.
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Cost */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCardIcon className="w-7 h-7 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">هزینه ارسال</h2>
            </div>
            <div className="text-gray-700 text-right leading-relaxed space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-3">هزینه ارسال تقریبی</p>
                <p className="text-4xl font-bold text-purple-600 mb-2">
                  ۲۰۰,۰۰۰ تومان
                </p>
                <p className="text-sm text-gray-600">
                  ± ۲۰٪ بسته به مقصد و وزن
                </p>
              </div>
            </div>
          </div>

          {/* Tracking */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg shadow-sm p-8 border border-indigo-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                <MapPinIcon className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                پیگیری مرسوله
              </h2>
            </div>
            <div className="text-gray-700 text-right leading-relaxed space-y-4">
              <div className="bg-white rounded-lg p-6 space-y-3">
                <p className="font-bold text-gray-900 mb-3">روش‌های پیگیری:</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                      ۱
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">
                        کانال تلگرام کیتیا
                      </p>
                      <p className="text-sm text-gray-600">
                        @kitia_a - کد رهگیری تیپاکس در کانال منتشر می‌شود
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                      ۲
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">پروفایل کاربری</p>
                      <p className="text-sm text-gray-600">
                        کد سفارش خود را در بخش سفارشات پروفایل مشاهده کنید
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                      ۳
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">سایت تیپاکس</p>
                      <p className="text-sm text-gray-600">
                        با کد رهگیری تیپاکس از طریق tipaxco.com پیگیری کنید
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">نکات مهم</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <span className="text-2xl">📦</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">
                    بسته‌بندی مطمئن
                  </p>
                  <p className="text-sm text-gray-600">
                    تمام محصولات با بسته‌بندی ایمن و استاندارد ارسال می‌شوند
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">
                    بازرسی هنگام تحویل
                  </p>
                  <p className="text-sm text-gray-600">
                    لطفاً بسته را هنگام تحویل بازرسی کنید
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">
                    شماره تماس صحیح
                  </p>
                  <p className="text-sm text-gray-600">
                    اطمینان حاصل کنید شماره تماس شما صحیح باشد تا پیک بتواند با
                    شما در ارتباط باشد
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">آدرس دقیق</p>
                  <p className="text-sm text-gray-600">
                    آدرس کامل و کد پستی صحیح را وارد کنید تا ارسال سریع‌تر انجام
                    شود
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
              سوالی در مورد ارسال دارید؟
            </h2>
            <div className="text-center space-y-3">
              <p className="text-gray-700">
                تیم پشتیبانی ما آماده پاسخگویی به سوالات شماست
              </p>
              <div>
                <p className="font-bold text-lg text-gray-900">
                  تلفن و واتساپ: 09912218463 - 09910258259
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  پاسخگویی از ساعت ۱۲ ظهر تا ۹ شب
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
