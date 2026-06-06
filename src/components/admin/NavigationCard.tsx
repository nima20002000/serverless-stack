import Link from 'next/link';

interface NavigationCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
}

/**
 * Navigation card component for admin dashboard
 * Mobile-friendly card with icon, title, and description
 */
export default function NavigationCard({
  title,
  description,
  href,
  icon,
  color = 'blue',
}: NavigationCardProps) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 dark:group-hover:bg-blue-900/60',
    green:
      'bg-green-50 text-green-600 group-hover:bg-green-100 dark:bg-emerald-900/40 dark:text-emerald-200 dark:group-hover:bg-emerald-900/60',
    purple:
      'bg-purple-50 text-purple-600 group-hover:bg-purple-100 dark:bg-purple-900/40 dark:text-purple-200 dark:group-hover:bg-purple-900/60',
    orange:
      'bg-orange-50 text-orange-600 group-hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-200 dark:group-hover:bg-orange-900/60',
    red: 'bg-red-50 text-red-600 group-hover:bg-red-100 dark:bg-rose-900/40 dark:text-rose-200 dark:group-hover:bg-rose-900/60',
    indigo:
      'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-200 dark:group-hover:bg-indigo-900/60',
  };

  return (
    <Link href={href} className="group">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-slate-800 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300 dark:hover:border-slate-700 h-full">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-colors ${colorStyles[color]}`}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="mb-1 text-start text-base font-bold text-gray-900 transition-colors group-hover:text-blue-600 sm:text-lg dark:text-slate-100 dark:group-hover:text-blue-300">
              {title}
            </h3>
            <p className="text-start text-xs leading-relaxed text-gray-600 sm:text-sm dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
