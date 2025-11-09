import Header from '@/components/layout/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            به کیتیا خوش آمدید
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            فروشگاه آنلاین با بهترین محصولات
          </p>
          <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              در حال توسعه
            </h2>
            <p className="text-gray-600">
              این پلتفرم در حال توسعه است. به زودی محصولات جدید اضافه خواهند شد.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
