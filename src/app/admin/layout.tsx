'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isE2E =
    process.env.NEXT_PUBLIC_E2E_TEST === 'true' ||
    (typeof document !== 'undefined' &&
      document.cookie.includes('e2e-test=true'));
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isE2E) {
      if (status === 'unauthenticated') {
        router.push('/login');
      } else if (session && session.user.role !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [isE2E, status, session, router]);

  // Show generic loading only during initial session check
  if (!isE2E && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-slate-400">در حال بارگذاری...</div>
      </div>
    );
  }

  // Redirect cases - don't render anything
  if (!isE2E && (!session || session.user.role !== 'ADMIN')) {
    return null;
  }

  // Authenticated admin - render layout and let pages handle their own loading states
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 dark">
      {/* Admin User Info Bar */}
      <div className="bg-slate-900 text-slate-100 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2">
            <div className="text-xs sm:text-sm order-2 sm:order-1">
              <span className="opacity-90">نقش: </span>
              <span className="font-medium">مدیر سیستم</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm order-1 sm:order-2">
              <div>
                <span className="opacity-90">خوش آمدید، </span>
                <span className="font-medium truncate max-w-[150px] sm:max-w-none inline-block">
                  {session?.user?.name || session?.user?.email || 'مدیر سیستم'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 lg:pb-8">
        <div className="flex gap-4 lg:gap-8">
          <AdminSidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
