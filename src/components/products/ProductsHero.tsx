export default function ProductsHero() {
  return (
    <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
        Catalog
      </p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl dark:text-white">
        Products
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        Browse the live product catalog, sort by the fields exposed by the data
        contract, and add available items to your cart.
      </p>
    </section>
  );
}
