'use client';

export default function PaymentVerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-slate-400">
          Verifying payment...
        </p>
      </div>
    </div>
  );
}
