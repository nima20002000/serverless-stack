import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">کیتیا</h1>
          <p className="text-gray-600">فروشگاه آنلاین</p>
        </div>

        {/* Auth Form Container */}
        {children}
      </div>
    </div>
  );
}
