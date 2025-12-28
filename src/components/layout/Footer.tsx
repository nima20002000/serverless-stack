import Link from 'next/link';
import ZarinpalFooterBadge from '@/components/payment/ZarinpalFooterBadge';
import EnamadBadge from '@/components/badges/EnamadBadge';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">کیتیا</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              فروشگاه آنلاین لیوان‌های سفری و ماگ‌های باکیفیت
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-gray-600 text-sm">
                <span className="font-bold">تلفن:</span> 09912218463 -
                09910258259
              </p>
              <p className="text-gray-600 text-sm">
                <span className="font-bold">آدرس:</span> تهران - خیابان اردستانی
              </p>
            </div>
            {/* Social Links */}
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://instagram.com/kitia.ir"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-pink-600 transition-colors"
                aria-label="اینستاگرام کیتیا"
              >
                <svg
                  className="w-6 h-6"
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
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              دسترسی سریع
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/products"
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  محصولات
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  درباره ما
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  تماس با ما
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  سوالات متداول
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              راهنما و پشتیبانی
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/shipping"
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  اطلاعات ارسال
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  قوانین مرجوعی
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  قوانین و مقررات
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  حریم خصوصی
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust Badges */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              نماد اعتماد
            </h4>
            <div className="flex items-start gap-3">
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
              {/* Zarinpal Badge */}
              <ZarinpalFooterBadge />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} کیتیا. تمامی حقوق محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
}
