/**
 * Type-safe error handling utilities
 */

// Supabase function invoke error structure
export interface SupabaseFunctionError {
  message?: string;
  context?: {
    status?: number;
    body?: {
      error?: string;
    };
  };
}

/**
 * Extracts a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') {
      return err.message;
    }
    // Check nested context for Supabase errors
    if (typeof err.context === 'object' && err.context !== null) {
      const context = err.context as Record<string, unknown>;
      if (typeof context.body === 'object' && context.body !== null) {
        const body = context.body as Record<string, unknown>;
        if (typeof body.error === 'string') {
          return body.error;
        }
      }
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Checks if an error is a rate limit error (HTTP 429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const err = error as SupabaseFunctionError;
    if (err.context?.status === 429) {
      return true;
    }
  }

  const message = getErrorMessage(error).toLowerCase();
  return message.includes('too many requests') || message.includes('rate limit');
}
