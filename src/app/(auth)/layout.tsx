import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-950 mb-2">
            Commerce Starter
          </h1>
          <p className="text-slate-600">Account access</p>
        </div>

        {/* Auth Form Container */}
        {children}
      </div>
    </div>
  );
}
