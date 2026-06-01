'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import EnamadBadge from '@/components/badges/EnamadBadge';

const HIDDEN_PATHS = ['/checkout'];

export default function Footer() {
  const pathname = usePathname();
  const isHidden = HIDDEN_PATHS.some((path) => pathname.startsWith(path));

  if (isHidden) {
    return null;
  }

  return (
    <footer className="bg-gradient-to-b from-white to-rose-50/50 dark:from-slate-950 dark:to-slate-950 border-t border-rose-100 dark:border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Section */}
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-l from-rose-600 to-pink-500 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4">
              کیتیا
            </h3>
            <p className="text-rose-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
              فروشگاه آنلاین لیوان‌های سفری و ماگ‌های باکیفیت
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-rose-700 dark:text-slate-300 text-sm">
                <div className="w-8 h-8 bg-rose-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-rose-500 dark:text-slate-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <span>09912218463 - 09910258259</span>
              </div>
              <div className="flex items-start gap-3 text-rose-700 dark:text-slate-300 text-sm">
                <div className="w-8 h-8 bg-rose-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-rose-500 dark:text-slate-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <span>تهران - خیابان اردستانی</span>
              </div>
            </div>
            {/* Social Links */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://instagram.com/kitia.ir"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center text-white hover:shadow-[0_8px_20px_-8px_rgba(244,63,94,0.5)] dark:hover:shadow-none transition-all duration-300 hover:-translate-y-1"
                aria-label="اینستاگرام کیتیا"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="https://t.me/kitia_a"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center text-white hover:shadow-[0_8px_20px_-8px_rgba(244,63,94,0.5)] dark:hover:shadow-none transition-all duration-300 hover:-translate-y-1"
                aria-label="تلگرام کیتیا"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M21.943 3.233a1.5 1.5 0 0 0-1.7-.258L2.88 10.29a1.5 1.5 0 0 0 .152 2.78l4.552 1.684 1.86 5.597a1.5 1.5 0 0 0 2.782.227l2.828-3.355 4.92 3.642a1.5 1.5 0 0 0 2.38-.912l2.62-14.62a1.5 1.5 0 0 0-.03-.7ZM9.574 14.32l7.12-6.57c.13-.122.3.06.187.187l-5.88 7.1a1 1 0 0 0-.2.59l-.11 3.2-1.48-4.47a1 1 0 0 0-.64-.63l-3.6-1.33 4.6-1.77Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold text-rose-900 dark:text-slate-100 mb-5">
              دسترسی سریع
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/products"
                  className="text-rose-600 hover:text-rose-800 dark:text-slate-300 dark:hover:text-slate-100 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 bg-rose-300 dark:bg-slate-700 rounded-full group-hover:bg-rose-500 dark:group-hover:bg-slate-400 transition-colors"></span>
                  محصولات
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-rose-600 hover:text-rose-800 dark:text-slate-300 dark:hover:text-slate-100 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 bg-rose-300 dark:bg-slate-700 rounded-full group-hover:bg-rose-500 dark:group-hover:bg-slate-400 transition-colors"></span>
                  درباره ما
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-rose-600 hover:text-rose-800 dark:text-slate-300 dark:hover:text-slate-100 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 bg-rose-300 dark:bg-slate-700 rounded-full group-hover:bg-rose-500 dark:group-hover:bg-slate-400 transition-colors"></span>
                  تماس با ما
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-rose-600 hover:text-rose-800 dark:text-slate-300 dark:hover:text-slate-100 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 bg-rose-300 dark:bg-slate-700 rounded-full group-hover:bg-rose-500 dark:group-hover:bg-slate-400 transition-colors"></span>
                  سوالات متداول
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="text-lg font-bold text-rose-900 dark:text-slate-100 mb-5">
              راهنما و پشتیبانی
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/shipping"
                  className="text-rose-600 hover:text-rose-800 dark:text-slate-300 dark:hover:text-slate-100 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 bg-rose-300 dark:bg-slate-700 rounded-full group-hover:bg-rose-500 dark:group-hover:bg-slate-400 transition-colors"></span>
                  اطلاعات ارسال
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="text-rose-600 hover:text-rose-800 dark:text-slate-300 dark:hover:text-slate-100 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 bg-rose-300 dark:bg-slate-700 rounded-full group-hover:bg-rose-500 dark:group-hover:bg-slate-400 transition-colors"></span>
                  قوانین مرجوعی
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-rose-600 hover:text-rose-800 dark:text-slate-300 dark:hover:text-slate-100 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 bg-rose-300 dark:bg-slate-700 rounded-full group-hover:bg-rose-500 dark:group-hover:bg-slate-400 transition-colors"></span>
                  قوانین و مقررات
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-rose-600 hover:text-rose-800 dark:text-slate-300 dark:hover:text-slate-100 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 bg-rose-300 dark:bg-slate-700 rounded-full group-hover:bg-rose-500 dark:group-hover:bg-slate-400 transition-colors"></span>
                  حریم خصوصی
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust Badges */}
          <div>
            <h4 className="text-lg font-bold text-rose-900 dark:text-slate-100 mb-5">
              نماد اعتماد
            </h4>
            <div className="flex items-start gap-3 p-4 bg-white/80 dark:bg-slate-900/70 rounded-2xl border border-rose-100 dark:border-slate-800 shadow-[0_8px_20px_-12px_rgba(244,63,94,0.2)] dark:shadow-none">
              {/* Enamad Badge - Lazy loaded */}
              <EnamadBadge />
              {/* Union Badge */}
              <div
                className="w-16 h-24"
                dangerouslySetInnerHTML={{
                  // eslint-disable-next-line quotes
                  __html: `<img src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KCTxwYXRoIGQ9Im0xMjAgMjQzbDk0LTU0IDAtMTA5IC05NCA1NCAwIDEwOSAwIDB6IiBmaWxsPSIjODA4Mjg1Ii8+Cgk8cGF0aCBkPSJtMTIwIDI1NGwtMTAzLTYwIDAtMTE5IDEwMy02MCAxMDMgNjAgMCAxMTkgLTEwMyA2MHoiIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS13aWR0aDo1O3N0cm9rZTojMDBhZWVmIi8+Cgk8cGF0aCBkPSJtMjE0IDgwbC05NC01NCAtOTQgNTQgOTQgNTQgOTQtNTR6IiBmaWxsPSIjMDBhZWVmIi8+Cgk8cGF0aCBkPSJtMjYgODBsMCAxMDkgOTQgNTQgMC0xMDkgLTk0LTU0IDAgMHoiIGZpbGw9IiM1ODU5NWIiLz4KCTxwYXRoIGQ9Im0xMjAgMTU3bDQ3LTI3IDAtMjMgLTQ3LTI3IC00NyAyNyAwIDU0IDQ3IDI3IDQ3LTI3IiBzdHlsZT0iZmlsbDpub25lO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MTU7c3Ryb2tlOiNmZmYiLz4KCTx0ZXh0IHg9IjE1IiB5PSIzMDAiIGZvbnQtc2l6ZT0iMjVweCIgZm9udC1mYW1pbHk9IidCIFlla2FuJyIgc3R5bGU9ImZpbGw6IzI5Mjk1Mjtmb250LXdlaWdodDpib2xkIj7Yudi22Ygg2KfYqtit2KfYr9uM2Ycg2qnYtNmI2LHbjDwvdGV4dD4KCTx0ZXh0IHg9IjgiIHk9IjM0MyIgZm9udC1zaXplPSIyNXB4IiBmb250LWZhbWlseT0iJ0IgWWVrYW4nIiBzdHlsZT0iZmlsbDojMjkyOTUyO2ZvbnQtd2VpZ2h0OmJvbGQiPtqp2LPYqiDZiCDaqdin2LHZh9in24wg2YXYrNin2LLbjDwvdGV4dD4KPC9zdmc+ ' alt='عضو اتحادیه صنفی کسب و کار مجازی' onclick='window.open("https://ecunion.ir/verify/kitia.ir?token=76349176925b9ad345bc", "Popup","toolbar=no, location=no, statusbar=no, menubar=no, scrollbars=1, resizable=0, width=580, height=600, top=30")' style='cursor:pointer; width: 64px; height: 96px;' />`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-rose-200/60 dark:border-slate-800 mt-10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-rose-500 dark:text-slate-400 text-center md:text-right">
              © {new Date().getFullYear()} کیتیا. تمامی حقوق محفوظ است.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400 dark:text-slate-500">
                ساخته شده با
              </span>
              <svg
                className="w-4 h-4 text-rose-500 dark:text-slate-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-xs text-rose-400 dark:text-slate-500">
                در ایران
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
