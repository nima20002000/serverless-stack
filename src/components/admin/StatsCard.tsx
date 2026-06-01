import Card from '@/components/ui/Card';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatsCard({
  title,
  value,
  icon,
  subtitle,
  trend,
}: StatsCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center justify-start gap-1 mt-2">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive
                    ? 'text-green-600 dark:text-green-300'
                    : 'text-red-600 dark:text-rose-300'
                }`}
              >
                {trend.isPositive ? '+' : '-'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-200">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
