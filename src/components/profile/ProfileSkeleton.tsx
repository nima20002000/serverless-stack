import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

/**
 * Skeleton loader for profile page
 * Shown while user profile data is being fetched
 */
export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4">
        <Skeleton className="h-9 w-48 mb-8" />

        {/* User Info Card Skeleton */}
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </Card>

        {/* Password Management Card Skeleton */}
        <Card className="mb-6">
          <Skeleton className="h-7 w-40 mb-4" />
          <div className="space-y-4">
            <SkeletonText lines={2} />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </Card>

        {/* Transaction History Card Skeleton */}
        <Card className="mb-6">
          <Skeleton className="h-7 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-b border-gray-200 pb-3 dark:border-slate-800"
              >
                <div className="flex justify-between items-center mb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions Skeleton */}
        <div className="flex gap-4 justify-end">
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
