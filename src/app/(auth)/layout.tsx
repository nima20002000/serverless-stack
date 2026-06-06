import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-slate-950 dark:text-white">
            Commerce Starter
          </h1>
          <p className="text-slate-600 dark:text-slate-300">Account access</p>
        </div>

        {/* Auth Form Container */}
        {children}
      </div>
    </div>
  );
}
