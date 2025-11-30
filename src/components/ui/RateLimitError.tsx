import { useEffect, useState } from 'react';
import Alert from './Alert';

interface RateLimitErrorProps {
  retryAfter: number; // Unix timestamp in milliseconds
  onRetryReady?: () => void;
  className?: string;
}

export default function RateLimitError({
  retryAfter,
  onRetryReady,
  className = ''
}: RateLimitErrorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((retryAfter - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0 && onRetryReady) {
        onRetryReady();
      }
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [retryAfter, onRetryReady]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} ثانیه`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} دقیقه`;
    }
    return `${minutes} دقیقه و ${remainingSeconds} ثانیه`;
  };

  if (timeRemaining === 0) {
    return null;
  }

  return (
    <Alert type="warning" className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-yellow-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <strong>تعداد درخواست‌های شما بیش از حد مجاز است</strong>
        </div>
        <p className="text-sm">
          لطفاً {formatTime(timeRemaining)} صبر کنید و دوباره تلاش نمایید.
        </p>
        <div className="mt-2 bg-yellow-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-yellow-600 h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.max(0, 100 - (timeRemaining / Math.ceil((retryAfter - Date.now() + timeRemaining * 1000) / 1000)) * 100)}%`
            }}
          />
        </div>
      </div>
    </Alert>
  );
}
