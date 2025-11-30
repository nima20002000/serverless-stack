import { useState, useCallback } from 'react';

interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter: number | null;
  error: string | null;
}

interface UseApiWithRateLimitResult {
  rateLimitInfo: RateLimitInfo;
  clearRateLimit: () => void;
  fetchWithRateLimit: <T>(
    fetchFn: () => Promise<Response>
  ) => Promise<T | null>;
}

export function useApiWithRateLimit(): UseApiWithRateLimitResult {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    isRateLimited: false,
    retryAfter: null,
    error: null,
  });

  const clearRateLimit = useCallback(() => {
    setRateLimitInfo({
      isRateLimited: false,
      retryAfter: null,
      error: null,
    });
  }, []);

  const fetchWithRateLimit = useCallback(
    async <T,>(fetchFn: () => Promise<Response>): Promise<T | null> => {
      try {
        const response = await fetchFn();

        // Check for rate limit
        if (response.status === 429) {
          const data = await response.json();
          setRateLimitInfo({
            isRateLimited: true,
            retryAfter: data.retryAfter || Date.now() + 60000, // Default 1 minute
            error: data.error || 'تعداد درخواست‌های شما بیش از حد مجاز است',
          });
          return null;
        }

        // Check for other errors
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'خطا در دریافت اطلاعات');
        }

        // Clear any previous rate limit info on success
        if (rateLimitInfo.isRateLimited) {
          clearRateLimit();
        }

        return await response.json();
      } catch (error) {
        // Only set error if it's not a rate limit error
        if (!rateLimitInfo.isRateLimited) {
          console.error('API Error:', error);
          throw error;
        }
        return null;
      }
    },
    [rateLimitInfo.isRateLimited, clearRateLimit]
  );

  return {
    rateLimitInfo,
    clearRateLimit,
    fetchWithRateLimit,
  };
}
