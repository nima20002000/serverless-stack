import { Metadata } from 'next';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: "قوانین و مقررات - کیتیا",
  description: "شرایط استفاده از خدمات فروشگاه کیتیا، قوانین ثبت نام، سفارش، پرداخت، ارسال و مرجوعی محصولات. آشنایی با حقوق و تعهدات خریداران.",
  openGraph: {
    title: "قوانین و مقررات - کیتیا",
    description: "شرایط استفاده از خدمات فروشگاه کیتیا و قوانین خرید",
    type: "website",
    locale: "fa_IR",
    siteName: "کیتیا",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "کیتیا - فروشگاه آنلاین",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "قوانین و مقررات - کیتیا",
    description: "شرایط استفاده از خدمات فروشگاه کیتیا",
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: getAbsoluteUrl('/terms'),
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">قوانین و مقررات</h1>
          <p className="text-lg text-gray-600">
            شرایط استفاده از خدمات فروشگاه کیتیا
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۱. پذیرش شرایط</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                با استفاده از وب‌سایت و خدمات کیتیا، شما تمامی قوانین و شرایط ذکر شده در این صفحه را می‌پذیرید. در صورت عدم موافقت با این شرایط، لطفاً از خدمات ما استفاده نکنید.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۲. ثبت نام و حساب کاربری</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>اطلاعات ارائه شده باید صحیح و کامل باشد</li>
                <li>شما مسئول حفظ امنیت حساب کاربری خود هستید</li>
                <li>هرگونه فعالیت غیرمجاز را سریعاً به ما اطلاع دهید</li>
                <li>هر فرد تنها مجاز به ایجاد یک حساب کاربری است</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۳. سفارش و خرید</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>تمامی قیمت‌ها به تومان است و شامل مالیات می‌شود</li>
                <li>پرداخت از طریق درگاه امن زرین‌پال انجام می‌شود</li>
                <li>سفارش پس از پرداخت موفق قطعی می‌شود</li>
                <li>ما حق تغییر قیمت‌ها را بدون اطلاع قبلی محفوظ می‌داریم</li>
                <li>موجودی محصولات ممکن است تغییر کند</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۴. پرداخت</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>پرداخت باید هنگام ثبت سفارش انجام شود</li>
                <li>در صورت ناموفق بودن پرداخت، سفارش لغو می‌شود</li>
                <li>وجوه پرداختی در صورت لغو سفارش طبق قوانین مرجوع می‌شود</li>
                <li>فاکتور الکترونیکی پس از پرداخت ارسال می‌شود</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۵. ارسال و تحویل</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>زمان ارسال ۳ تا ۷ روز کاری است</li>
                <li>هزینه ارسال بر عهده مشتری است</li>
                <li>کد رهگیری تیپاکس در پروفایل شما قرار می‌گیرد</li>
                <li>مسئولیت تحویل به آدرس صحیح بر عهده مشتری است</li>
                <li>تأخیرهای خارج از کنترل ما (مانند شرایط جوی) مسئولیت ما نیست</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۶. مرجوعی و بازگشت وجه</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>محصولات معیوب قابل مرجوع هستند</li>
                <li>مرجوعی باید ظرف ۷ روز از تحویل انجام شود</li>
                <li>محصول باید در بسته‌بندی اصلی و بدون استفاده باشد</li>
                <li>هزینه ارسال مرجوعی (در صورت عدم نقص) بر عهده مشتری است</li>
                <li>بازگشت وجه ظرف ۷ روز کاری انجام می‌شود</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۷. استفاده مجاز</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>استفاده از وب‌سایت فقط برای اهداف قانونی مجاز است. موارد زیر ممنوع است:</p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>استفاده از اطلاعات سایت برای اهداف تجاری بدون مجوز</li>
                <li>تلاش برای دسترسی غیرمجاز به سیستم‌های ما</li>
                <li>ارسال محتوای مخرب یا ویروس</li>
                <li>نقض حقوق مالکیت معنوی</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۸. مالکیت معنوی</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                تمامی محتوا، طراحی، لوگو، و عناصر بصری وب‌سایت کیتیا متعلق به ما بوده و محافظت می‌شوند. استفاده غیرمجاز از آن‌ها ممنوع است.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۹. محدودیت مسئولیت</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>ما تلاش می‌کنیم وب‌سایت همیشه در دسترس باشد اما تضمینی نداریم</li>
                <li>مسئولیت خسارات غیرمستقیم یا تبعی را نمی‌پذیریم</li>
                <li>اطلاعات محصولات تا حد امکان دقیق است اما ممکن است اشتباه باشد</li>
              </ul>
            </div>
          </section>

          {/* Section 10 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">۱۰. تغییرات</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                ما حق تغییر این قوانین و مقررات را در هر زمان محفوظ می‌داریم. تغییرات از زمان انتشار در وب‌سایت اعمال می‌شود.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t pt-8 bg-blue-50 -m-8 p-8 rounded-b-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">تماس با ما</h2>
            <div className="text-gray-700 text-right leading-relaxed">
              <p className="mb-2">
                برای سوالات در مورد قوانین و مقررات، با ما تماس بگیرید:
              </p>
              <p className="font-bold">تلفن: 09912218463 - 09910258259</p>
              <p className="text-sm text-gray-600 mt-2">
                آخرین بروزرسانی: آذر ۱۴۰۴
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
