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
  className = '',
}: RateLimitErrorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [initialTime, setInitialTime] = useState<number>(0);

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
    setInitialTime(Math.max(0, Math.ceil((retryAfter - Date.now()) / 1000)));

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

  const progressPercentage =
    initialTime > 0
      ? Math.max(0, ((initialTime - timeRemaining) / initialTime) * 100)
      : 0;

  return (
    <Alert
      type="warning"
      title="تعداد درخواست‌های شما بیش از حد مجاز است"
      className={className}
    >
      <div className="flex flex-col gap-2">
        <p>لطفاً {formatTime(timeRemaining)} صبر کنید و دوباره تلاش نمایید.</p>
        <div className="mt-1 bg-yellow-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-yellow-600 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </Alert>
  );
}
