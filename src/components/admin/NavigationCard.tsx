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
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    red: 'bg-red-50 text-red-600 group-hover:bg-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
  };

  return (
    <Link href={href} className="group">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300 h-full">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-colors ${colorStyles[color]}`}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 text-right group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 text-right leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
