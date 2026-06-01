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
      return `${seconds} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute`;
    }
    return `${minutes} minute and ${remainingSeconds} seconds`;
  };

  if (timeRemaining === 0) {
    return null;
  }

  const progressPercentage =
    initialTime > 0
      ? Math.max(0, ((initialTime - timeRemaining) / initialTime) * 100)
      : 0;

  return (
    <Alert type="warning" title="Too many requests" className={className}>
      <div className="flex flex-col gap-2">
        <p>Please wait {formatTime(timeRemaining)} before trying again.</p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-warning-muted">
          <div
            className="h-full bg-warning transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </Alert>
  );
}
