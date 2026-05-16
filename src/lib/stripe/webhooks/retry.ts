/**
 * Story 12.4: Webhook Retry Logic with Exponential Backoff
 * Implements resilient webhook event processing with configurable retries
 */

const MAX_RETRIES = 3
const BACKOFF_MS = 1000 // 1s base, then 2s, 4s

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Process function with exponential backoff retry
 * Retries up to 3 times with backoff: 1s, 2s, 4s
 * @param fn - Async function to execute
 * @param retryCount - Current retry attempt (0-based)
 * @returns Promise resolving to function result
 * @throws Error if all retries exhausted
 */
export async function processWithRetry<T>(
  fn: () => Promise<T>,
  retryCount: number = 0
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delayMs = BACKOFF_MS * Math.pow(2, retryCount)
      console.log(
        `[webhook-retry] Attempt ${retryCount + 1} failed, retrying in ${delayMs}ms...`
      )
      await sleep(delayMs)
      return processWithRetry(fn, retryCount + 1)
    }

    console.error(
      `[webhook-retry] All ${MAX_RETRIES} retries exhausted:`,
      error
    )
    throw error
  }
}

interface WebhookContext {
  [key: string]: string | number | boolean | object | undefined
}

/**
 * Process webhook event with automatic retry and logging
 * Wraps processWithRetry with context logging
 */
export async function processWebhookWithRetry<T>(
  eventId: string,
  fn: () => Promise<T>,
  context?: WebhookContext
): Promise<T> {
  try {
    return await processWithRetry(fn)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(
      `[webhook] Event ${eventId} failed after ${MAX_RETRIES} retries:`,
      {
        error: errorMsg,
        context,
      }
    )
    throw error
  }
}

/**
 * Configuration export for story documentation
 */
export const RETRY_CONFIG = {
  maxRetries: MAX_RETRIES,
  backoffMs: BACKOFF_MS,
  intervals: [BACKOFF_MS, BACKOFF_MS * 2, BACKOFF_MS * 4],
  description: `Retry up to ${MAX_RETRIES} times with exponential backoff (${BACKOFF_MS}ms, ${BACKOFF_MS * 2}ms, ${BACKOFF_MS * 4}ms)`,
}
