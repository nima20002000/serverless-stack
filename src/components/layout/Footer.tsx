import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">کیتیا</h3>
            <p className="text-gray-600 text-sm">
              فروشگاه آنلاین با بهترین محصولات و خدمات
            </p>
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
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  محصولات
                </Link>
              </li>
              <li>
                <Link
                  href="/profile"
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  پروفایل
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  سبد خرید
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust Badge */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              نماد اعتماد
            </h4>
            <div
              className="flex items-start"
              dangerouslySetInnerHTML={{
                __html: `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=676586&Code=bLSyuHwqurNSiHamVBVhFYohNhVDDhi0'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=676586&Code=bLSyuHwqurNSiHamVBVhFYohNhVDDhi0' alt='نماد اعتماد الکترونیکی' style='cursor:pointer' code='bLSyuHwqurNSiHamVBVhFYohNhVDDhi0'></a>`
              }}
            />
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
