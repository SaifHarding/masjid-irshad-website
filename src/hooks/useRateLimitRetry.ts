import { useState, useEffect, useCallback } from "react";
import { getErrorMessage, isRateLimitError } from "@/lib/errorUtils";

interface RateLimitState {
  isRateLimited: boolean;
  retryAfterSeconds: number;
  errorMessage: string;
}

export function useRateLimitRetry() {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isRateLimited: false,
    retryAfterSeconds: 0,
    errorMessage: "",
  });

  // Countdown timer
  useEffect(() => {
    if (rateLimitState.retryAfterSeconds <= 0) {
      if (rateLimitState.isRateLimited) {
        setRateLimitState((prev) => ({
          ...prev,
          isRateLimited: false,
          errorMessage: "",
        }));
      }
      return;
    }

    const timer = setInterval(() => {
      setRateLimitState((prev) => ({
        ...prev,
        retryAfterSeconds: Math.max(0, prev.retryAfterSeconds - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitState.retryAfterSeconds, rateLimitState.isRateLimited]);

  const handleRateLimitError = useCallback((error: unknown): boolean => {
    if (!isRateLimitError(error)) {
      return false;
    }

    // Default to 60 minutes cooldown (matches backend rate limit window)
    const cooldownSeconds = 60 * 60; // 1 hour
    const errorMsg = getErrorMessage(error);

    setRateLimitState({
      isRateLimited: true,
      retryAfterSeconds: cooldownSeconds,
      errorMessage: errorMsg || "Too many requests. Please try again later.",
    });
    return true;
  }, []);

  const clearRateLimit = useCallback(() => {
    setRateLimitState({
      isRateLimited: false,
      retryAfterSeconds: 0,
      errorMessage: "",
    });
  }, []);

  const formatTimeRemaining = useCallback((seconds: number): string => {
    if (seconds <= 0) return "";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }, []);

  return {
    isRateLimited: rateLimitState.isRateLimited,
    retryAfterSeconds: rateLimitState.retryAfterSeconds,
    errorMessage: rateLimitState.errorMessage,
    handleRateLimitError,
    clearRateLimit,
    formatTimeRemaining,
  };
}
