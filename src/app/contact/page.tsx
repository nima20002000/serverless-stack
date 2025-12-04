import { PhoneIcon, MapPinIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">تماس با ما</h1>
          <p className="text-lg text-gray-600">
            ما همیشه آماده پاسخگویی به سوالات شما هستیم
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Phone Contact */}
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <PhoneIcon className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">تماس تلفنی</h2>
            </div>
            <div className="space-y-3">
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-2">شماره تماس و واتساپ:</p>
                <a
                  href="tel:09912218463"
                  className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors dir-ltr inline-block"
                >
                  09912218463
                </a>
              </div>
              <p className="text-sm text-gray-500 pt-4 border-t">
                پاسخگویی از ساعت ۹ صبح تا ۹ شب
              </p>
            </div>
          </div>

          {/* WhatsApp Contact */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm p-8 border border-green-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">واتساپ</h2>
            </div>
            <div className="space-y-3">
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-2">ارتباط سریع از طریق واتساپ:</p>
                <a
                  href="https://wa.me/989912218463"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <span>شروع گفتگو</span>
                </a>
              </div>
              <p className="text-sm text-gray-600 pt-4 border-t border-green-200">
                پاسخ سریع به پیام‌های شما
              </p>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8 border border-gray-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <MapPinIcon className="w-7 h-7 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">آدرس</h2>
          </div>
          <div className="text-right">
            <p className="text-lg text-gray-700 leading-relaxed">
              تهران - خیابان اردستانی - مجتمع مهسان - بلوک آ2
            </p>
          </div>
        </div>

        {/* Order Tracking Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-8 border border-blue-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
            پیگیری سفارش
          </h2>
          <div className="space-y-4 text-center">
            <p className="text-gray-700">
              برای پیگیری وضعیت سفارش خود می‌توانید به کانال تلگرام ما مراجعه کنید:
            </p>
            <a
              href="https://t.me/kitia_a"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>کانال تلگرام کیتیا</span>
            </a>
            <div className="pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-600">
                کد رهگیری تیپاکس خود را در پروفایل کاربری‌تان مشاهده کنید و از طریق سایت تیپاکس پیگیری نمایید.
              </p>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
            ساعات پاسخگویی
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">شنبه تا پنج‌شنبه</p>
              <p className="text-lg font-bold text-gray-900">۹:۰۰ - ۲۱:۰۰</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">جمعه</p>
              <p className="text-lg font-bold text-gray-900">تعطیل</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
