import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Skeleton loader for admin product table rows
 * Matches the layout of SortableProductRow in admin products page
 */
export function ProductTableRowSkeleton() {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-900/60">
      {/* Drag Handle */}
      <td className="px-2 sm:px-4 py-3 text-center">
        <Skeleton
          variant="circular"
          className="w-4 h-4 sm:w-5 sm:h-5 mx-auto"
        />
      </td>

      {/* Checkbox */}
      <td className="px-2 sm:px-4 py-3 text-center">
        <Skeleton
          variant="rectangular"
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto rounded"
        />
      </td>

      {/* Actions */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <div className="flex gap-1 sm:gap-2 justify-end">
          <Skeleton variant="rectangular" className="h-8 w-16 sm:w-20" />
          <Skeleton variant="rectangular" className="h-8 w-12 sm:w-16" />
        </div>
      </td>

      {/* Status */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <Skeleton variant="rectangular" className="h-6 w-16 rounded-full" />
      </td>

      {/* Features */}
      <td className="px-2 sm:px-4 py-3 text-right hidden md:table-cell">
        <div className="flex gap-1 justify-end">
          <Skeleton variant="rectangular" className="h-6 w-12" />
        </div>
      </td>

      {/* Stock */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <Skeleton variant="text" className="h-5 w-8" />
      </td>

      {/* Price */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <Skeleton variant="text" className="h-5 w-24" />
      </td>

      {/* Name */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <Skeleton variant="text" className="h-5 w-32" />
      </td>
    </tr>
  );
}

/**
 * Complete skeleton for admin products table
 * Shows header and multiple skeleton rows
 */
export default function ProductTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px]">
        <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
          <tr>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-8 sm:w-12">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-slate-500 mx-auto"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-8 sm:w-12">
              <input
                type="checkbox"
                disabled
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded"
              />
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
              عملیات
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
              وضعیت
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 hidden md:table-cell">
              ویژگی‌ها
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
              موجودی
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
              قیمت
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
              نام محصول
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, i) => (
            <ProductTableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
