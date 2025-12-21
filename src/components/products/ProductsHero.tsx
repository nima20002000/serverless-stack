export default function ProductsHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-50 to-pink-50 rounded-2xl mb-8 shadow-lg">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-64 h-64 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      {/* Content */}
      <div className="relative px-6 py-12 sm:px-8 sm:py-16 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
          محصولات کیتیا
        </h1>
        <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
          مجموعه‌ای منحصر به فرد از لیوان‌های سفری و ماگ‌های زیبا، برای لحظات دلنشین شما
        </p>

        {/* Decorative line */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-12 h-1 bg-gradient-to-r from-transparent to-pink-400 rounded-full"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"></div>
          <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
          <div className="w-12 h-1 bg-gradient-to-r from-purple-400 to-transparent rounded-full"></div>
        </div>
      </div>
    </section>
  );
}
