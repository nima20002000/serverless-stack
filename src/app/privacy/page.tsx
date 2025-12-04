import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">حریم خصوصی</h1>
          <p className="text-lg text-gray-600">
            حفظ اطلاعات شخصی شما برای ما اهمیت دارد
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">جمع‌آوری اطلاعات</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                کیتیا متعهد به حفظ حریم خصوصی کاربران خود است. اطلاعاتی که از شما جمع‌آوری می‌کنیم شامل:
              </p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>نام و نام خانوادگی</li>
                <li>شماره تماس</li>
                <li>آدرس ایمیل</li>
                <li>آدرس پستی برای ارسال سفارشات</li>
                <li>اطلاعات تراکنش‌های مالی</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">استفاده از اطلاعات</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                اطلاعات شما تنها برای موارد زیر استفاده می‌شود:
              </p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>پردازش و ارسال سفارشات</li>
                <li>ارتباط با شما در خصوص سفارشات</li>
                <li>بهبود خدمات و تجربه کاربری</li>
                <li>ارسال اطلاعیه‌های مهم (در صورت تمایل شما)</li>
                <li>پیشگیری از تقلب و سوء استفاده</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">حفاظت از اطلاعات</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                ما از روش‌های امنیتی استاندارد برای حفاظت از اطلاعات شما استفاده می‌کنیم:
              </p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>رمزنگاری اطلاعات حساس</li>
                <li>دسترسی محدود به اطلاعات شخصی</li>
                <li>استفاده از پروتکل‌های امن برای انتقال داده</li>
                <li>نگهداری امن پایگاه داده</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">اشتراک‌گذاری اطلاعات</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                اطلاعات شما با هیچ شخص ثالثی به اشتراک گذاشته نمی‌شود، به استثنای:
              </p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>سرویس‌های پرداخت آنلاین (زرین‌پال) برای پردازش تراکنش‌ها</li>
                <li>شرکت‌های حمل و نقل (تیپاکس) برای ارسال سفارشات</li>
                <li>در صورت الزام قانونی</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">کوکی‌ها</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                ما از کوکی‌ها برای بهبود تجربه کاربری استفاده می‌کنیم. کوکی‌ها شامل:
              </p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>کوکی‌های احراز هویت برای حفظ ورود شما</li>
                <li>کوکی‌های سبد خرید برای نگهداری محصولات انتخابی</li>
                <li>کوکی‌های تنظیمات برای ذخیره ترجیحات شما</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">حقوق شما</h2>
            <div className="text-gray-700 text-right leading-relaxed space-y-3">
              <p>
                شما حق دارید:
              </p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>درخواست دسترسی به اطلاعات شخصی خود</li>
                <li>درخواست اصلاح اطلاعات نادرست</li>
                <li>درخواست حذف اطلاعات خود (در صورت عدم تعهدات قانونی)</li>
                <li>لغو اشتراک از ایمیل‌های تبلیغاتی</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">تغییرات</h2>
            <div className="text-gray-700 text-right leading-relaxed">
              <p>
                ما ممکن است این سیاست حریم خصوصی را به‌روزرسانی کنیم. تغییرات مهم از طریق ایمیل یا اطلاعیه در وب‌سایت به اطلاع شما خواهد رسید.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t pt-8 bg-blue-50 -m-8 p-8 rounded-b-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">تماس با ما</h2>
            <div className="text-gray-700 text-right leading-relaxed">
              <p className="mb-2">
                در صورت داشتن هرگونه سوال یا نگرانی در مورد حریم خصوصی، با ما تماس بگیرید:
              </p>
              <p className="font-bold">تلفن: 09912218463</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
