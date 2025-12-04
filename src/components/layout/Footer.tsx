import Link from 'next/link';
import ZarinpalFooterBadge from '@/components/payment/ZarinpalFooterBadge';

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
                <span className="font-bold">تلفن:</span> 09912218463
              </p>
              <p className="text-gray-600 text-sm">
                <span className="font-bold">آدرس:</span> تهران - خیابان اردستانی
              </p>
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
            <div className="flex items-start gap-4 flex-wrap">
              {/* Enamad Badge */}
              <div
                dangerouslySetInnerHTML={{
                  __html: `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=676586&Code=bLSyuHwqurNSiHamVBVhFYohNhVDDhi0'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=676586&Code=bLSyuHwqurNSiHamVBVhFYohNhVDDhi0' alt='نماد اعتماد الکترونیکی' style='cursor:pointer' code='bLSyuHwqurNSiHamVBVhFYohNhVDDhi0'></a>`
                }}
              />
              {/* Union Badge */}
              <div
                dangerouslySetInnerHTML={{
                  __html: `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KCTxwYXRoIGQ9Im0xMjAgMjQzbDk0LTU0IDAtMTA5IC05NCA1NCAwIDEwOSAwIDB6IiBmaWxsPSIjODA4Mjg1Ii8+Cgk8cGF0aCBkPSJtMTIwIDI1NGwtMTAzLTYwIDAtMTE5IDEwMy02MCAxMDMgNjAgMCAxMTkgLTEwMyA2MHoiIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS13aWR0aDo1O3N0cm9rZTojMDBhZWVmIi8+Cgk8cGF0aCBkPSJtMjE0IDgwbC05NC01NCAtOTQgNTQgOTQgNTQgOTQtNTR6IiBmaWxsPSIjMDBhZWVmIi8+Cgk8cGF0aCBkPSJtMjYgODBsMCAxMDkgOTQgNTQgMC0xMDkgLTk0LTU0IDAgMHoiIGZpbGw9IiM1ODU5NWIiLz4KCTxwYXRoIGQ9Im0xMjAgMTU3bDQ3LTI3IDAtMjMgLTQ3LTI3IC00NyAyNyAwIDU0IDQ3IDI3IDQ3LTI3IiBzdHlsZT0iZmlsbDpub25lO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MTU7c3Ryb2tlOiNmZmYiLz4KCTx0ZXh0IHg9IjE1IiB5PSIzMDAiIGZvbnQtc2l6ZT0iMjVweCIgZm9udC1mYW1pbHk9IidCIFlla2FuJyIgc3R5bGU9ImZpbGw6IzI5Mjk1Mjtmb250LXdlaWdodDpib2xkIj7Yudi22Ygg2KfYqtit2KfYr9uM2Ycg2qnYtNmI2LHbjDwvdGV4dD4KCTx0ZXh0IHg9IjgiIHk9IjM0MyIgZm9udC1zaXplPSIyNXB4IiBmb250LWZhbWlseT0iJ0IgWWVrYW4nIiBzdHlsZT0iZmlsbDojMjkyOTUyO2ZvbnQtd2VpZ2h0OmJvbGQiPtqp2LPYqiDZiCDaqdin2LHZh9in24wg2YXYrNin2LLbjDwvdGV4dD4KPC9zdmc+ " alt="عضو اتحادیه صنفی کسب و کار مجازی" onclick="window.open('https://ecunion.ir/verify/kitia.ir?token=76349176925b9ad345bc', 'Popup','toolbar=no, location=no, statusbar=no, menubar=no, scrollbars=1, resizable=0, width=580, height=600, top=30')" style="cursor:pointer; width: 96px;height: 144px;">`
                }}
              />
              {/* Zarinpal Badge */}
              <div>
                <ZarinpalFooterBadge />
              </div>
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
