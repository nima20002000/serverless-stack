import { Metadata } from 'next';
import {
  HeartIcon,
  SparklesIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: 'درباره ما - کیتیا',
  description:
    'کیتیا، فروشگاه آنلاین لیوان‌های سفری و ماگ‌های باکیفیت. بخشی از درآمد به کمک گربه‌های خیابانی اختصاص می‌یابد. کیفیت برتر، مسئولیت اجتماعی و قیمت مناسب.',
  openGraph: {
    title: 'درباره ما - کیتیا',
    description:
      'کیتیا، فروشگاه آنلاین لیوان‌های سفری و ماگ‌های باکیفیت. با هر خرید از کیتیا، قدمی کوچک برای یک دنیای بهتر برمی‌داریم.',
    type: 'website',
    locale: siteLocale.ogLocale,
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
    title: 'درباره ما - کیتیا',
    description:
      'کیتیا، فروشگاه آنلاین لیوان‌های سفری و ماگ‌های باکیفیت. بخشی از درآمد به کمک گربه‌های خیابانی اختصاص می‌یابد.',
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: getAbsoluteUrl('/about'),
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-rose-900 mb-4">
            درباره کیتیا
          </h1>
          <p className="text-lg text-rose-600">
            فروشگاه آنلاین لیوان‌های سفری و ماگ‌های باکیفیت
          </p>
        </div>

        {/* Story Section */}
        <div className="bg-white/90 rounded-3xl shadow-[0_18px_40px_-28px_rgba(236,72,153,0.35)] border border-rose-100 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <SparklesIcon className="w-8 h-8 text-rose-500" />
            <h2 className="text-2xl font-bold text-rose-900">داستان ما</h2>
          </div>
          <div className="prose prose-lg text-rose-700 text-right leading-relaxed space-y-4">
            <p>
              کیتیا با هدف ارائه بهترین لیوان‌های سفری و ماگ‌های باکیفیت برای
              همراهان همیشگی شما در سفرهای روزانه راه‌اندازی شد. ما معتقدیم که
              یک لیوان خوب می‌تواند تجربه نوشیدن نوشیدنی مورد علاقه‌تان را به یک
              لحظه خاص تبدیل کند.
            </p>
            <p>
              محصولات ما با دقت انتخاب شده‌اند تا در کنار کیفیت بالا، دوام و
              زیبایی را نیز برای شما به ارمغان بیاورند. از لیوان‌های ترمال که
              نوشیدنی شما را ساعت‌ها گرم یا سرد نگه می‌دارند تا ماگ‌های طراحی
              شده با سلیقه‌های مختلف.
            </p>
          </div>
        </div>

        {/* Charity Section */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-100 rounded-3xl shadow-[0_18px_40px_-28px_rgba(236,72,153,0.35)] p-8 mb-8 border border-rose-200">
          <div className="flex items-center gap-3 mb-6">
            <HeartIcon className="w-8 h-8 text-rose-500" />
            <h2 className="text-2xl font-bold text-rose-900">
              مسئولیت اجتماعی ما
            </h2>
          </div>
          <div className="text-rose-700 text-right leading-relaxed space-y-4">
            <p className="text-lg">
              در کیتیا، ما فقط به فروش محصول فکر نمی‌کنیم. بخشی از درآمد حاصل از
              فروش هر محصول به تغذیه گربه‌های خیابانی و درمان آن‌هایی که نیاز به
              مراقبت دارند اختصاص می‌یابد.
            </p>
            <p>
              ما معتقدیم که کسب‌وکار باید همراه با مسئولیت اجتماعی باشد. با هر
              خرید از کیتیا، شما نه تنها یک محصول باکیفیت دریافت می‌کنید، بلکه
              به بهبود زندگی حیوانات بی‌صاحب نیز کمک می‌کنید.
            </p>
            <div className="bg-white/70 rounded-2xl p-6 mt-6 border border-rose-100">
              <p className="text-center text-rose-600 italic">
                &quot;با هر خرید از کیتیا، قدمی کوچک برای یک دنیای بهتر
                برمی‌داریم&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 rounded-3xl shadow-[0_18px_40px_-28px_rgba(236,72,153,0.35)] border border-rose-100 p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-rose-900 mb-2">کیفیت برتر</h3>
            <p className="text-rose-600 text-sm">
              تمام محصولات ما با دقت انتخاب و کنترل کیفیت می‌شوند
            </p>
          </div>

          <div className="bg-white/90 rounded-3xl shadow-[0_18px_40px_-28px_rgba(236,72,153,0.35)] border border-rose-100 p-6 text-center">
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeartIcon className="w-6 h-6 text-pink-500" />
            </div>
            <h3 className="text-lg font-bold text-rose-900 mb-2">
              مسئولیت اجتماعی
            </h3>
            <p className="text-rose-600 text-sm">
              بخشی از درآمد به کمک حیوانات خیابانی اختصاص می‌یابد
            </p>
          </div>

          <div className="bg-white/90 rounded-3xl shadow-[0_18px_40px_-28px_rgba(236,72,153,0.35)] border border-rose-100 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CurrencyDollarIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-rose-900 mb-2">قیمت مناسب</h3>
            <p className="text-rose-600 text-sm">
              بهترین کیفیت را با قیمتی منصفانه ارائه می‌دهیم
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
