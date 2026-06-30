/** Sleep for the given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  maxAttempts?: number;
  /** Base delay before retry (ms); doubles each attempt. */
  baseDelayMs?: number;
  /** Return true when the error is retryable (e.g. HTTP 429). */
  isRetryable?: (err: unknown) => boolean;
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxAttempts: 4,
  baseDelayMs: 15_000,
  isRetryable: () => false,
};

/**
 * Retries an async fn with exponential backoff when isRetryable returns true.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts, baseDelayMs, isRetryable } = {
    ...DEFAULT_RETRY,
    ...options,
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts || !isRetryable(err)) throw err;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
  throw lastError;
}

/** True for LLM 429 / quota errors (Groq, etc.). */
export function isLlmRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status === 429) return true;
  const message = (err as { message?: string }).message ?? "";
  return message.includes("429") || message.includes("quota") || message.includes("rate limit");
}
