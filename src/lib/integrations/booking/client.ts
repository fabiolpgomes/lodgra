/**
 * Booking.com API Client
 *
 * Bidirectional sync:
 * - Push prices and availability to Booking.com
 * - Retry logic with exponential backoff
 * - Rate limiting awareness
 */

interface BookingAPIError {
  statusCode: number
  message: string
  retryable: boolean
  retryAfter?: number
}

interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig,
  retryAfter?: number
): number {
  // Use Retry-After header if provided
  if (retryAfter) {
    return retryAfter * 1000
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)

  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1)
  const finalDelay = Math.min(delay + jitter, config.maxDelayMs)

  return Math.max(1000, Math.round(finalDelay)) // Min 1s
}

/**
 * Determine if error is retryable
 */
function isRetryableError(statusCode: number): boolean {
  // Retry on:
  // - 408 Request Timeout
  // - 429 Too Many Requests
  // - 500 Internal Server Error
  // - 502 Bad Gateway
  // - 503 Service Unavailable
  // - 504 Gateway Timeout
  const retryableStatuses = [408, 429, 500, 502, 503, 504]
  return retryableStatuses.includes(statusCode)
}

/**
 * Booking.com API Client
 */
export class BookingComClient {
  private apiBaseUrl: string
  private apiKey: string
  private propertyId: string
  private retryConfig: RetryConfig

  constructor(
    propertyId: string,
    apiKey: string,
    apiBaseUrl: string = 'https://secure-supply.booking.com/partner/click/property',
    retryConfig?: Partial<RetryConfig>
  ) {
    this.propertyId = propertyId
    this.apiKey = apiKey
    this.apiBaseUrl = apiBaseUrl
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  }

  /**
   * Push price update to Booking.com with retry logic
   *
   * @param amount Room price
   * @param currency ISO-4217 currency code
   * @param date YYYY-MM-DD format
   * @returns Success status
   */
  async pushPrice(
    amount: number,
    currency: string,
    date: string
  ): Promise<{ success: boolean; error?: string }> {
    const payload = {
      prices: [
        {
          date,
          price: amount,
          currency,
        },
      ],
    }

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.apiBaseUrl}/${this.propertyId}/prices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw {
          statusCode: response.status,
          message:
            errorData.message || `Booking.com API error: ${response.status}`,
          retryable: isRetryableError(response.status),
          retryAfter: response.headers.get('Retry-After')
            ? parseInt(response.headers.get('Retry-After')!, 10)
            : undefined,
        } as BookingAPIError
      }

      return { success: true }
    })
  }

  /**
   * Push availability update to Booking.com with retry logic
   *
   * @param available Number of available rooms
   * @param date YYYY-MM-DD format
   * @returns Success status
   */
  async pushAvailability(
    available: number,
    date: string
  ): Promise<{ success: boolean; error?: string }> {
    const payload = {
      availability: [
        {
          date,
          available: Math.max(0, available), // Ensure non-negative
        },
      ],
    }

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `${this.apiBaseUrl}/${this.propertyId}/availability`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw {
          statusCode: response.status,
          message:
            errorData.message || `Booking.com API error: ${response.status}`,
          retryable: isRetryableError(response.status),
          retryAfter: response.headers.get('Retry-After')
            ? parseInt(response.headers.get('Retry-After')!, 10)
            : undefined,
        } as BookingAPIError
      }

      return { success: true }
    })
  }

  /**
   * Push batch price updates with retry logic
   *
   * @param prices Array of { date, amount, currency }
   * @returns Array of results
   */
  async pushPrices(
    prices: Array<{ date: string; amount: number; currency: string }>
  ): Promise<Array<{ date: string; success: boolean; error?: string }>> {
    return Promise.all(
      prices.map((price) =>
        this.pushPrice(price.amount, price.currency, price.date).then(
          (result) => ({
            date: price.date,
            ...result,
          })
        )
      )
    )
  }

  /**
   * Push batch availability updates with retry logic
   *
   * @param availability Array of { date, available }
   * @returns Array of results
   */
  async pushAvailabilities(
    availability: Array<{ date: string; available: number }>
  ): Promise<Array<{ date: string; success: boolean; error?: string }>> {
    return Promise.all(
      availability.map((avail) =>
        this.pushAvailability(avail.available, avail.date).then(
          (result) => ({
            date: avail.date,
            ...result,
          })
        )
      )
    )
  }

  /**
   * Execute request with exponential backoff retry logic
   *
   * @param fn Async function to execute
   * @returns Result or error
   */
  private async executeWithRetry<T extends { success?: boolean }>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await fn()
      return { success: true, ...result }
    } catch (error) {
      const bookingError = error as BookingAPIError | Error

      // Extract error details
      const isBookingError = 'retryable' in bookingError
      const errorMessage =
        isBookingError && 'message' in bookingError
          ? (bookingError as BookingAPIError).message
          : error instanceof Error
            ? error.message
            : 'Unknown error'

      // Don't retry non-retryable errors
      if (isBookingError && !(bookingError as BookingAPIError).retryable) {
        console.error(`[Booking Client] Non-retryable error: ${errorMessage}`)
        return { success: false, error: errorMessage }
      }

      // Max retries exceeded
      if (attempt >= this.retryConfig.maxRetries) {
        console.error(
          `[Booking Client] Max retries exceeded (${this.retryConfig.maxRetries}): ${errorMessage}`
        )
        return { success: false, error: errorMessage }
      }

      // Calculate backoff and retry
      const delayMs = isBookingError
        ? calculateBackoffDelay(
            attempt,
            this.retryConfig,
            (bookingError as BookingAPIError).retryAfter
          )
        : calculateBackoffDelay(attempt, this.retryConfig)

      console.warn(
        `[Booking Client] Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} after ${delayMs}ms: ${errorMessage}`
      )

      await new Promise((resolve) => setTimeout(resolve, delayMs))

      return this.executeWithRetry(fn, attempt + 1)
    }
  }
}

/**
 * Factory to create authenticated Booking.com client from environment
 */
export function createBookingComClient(propertyId: string): BookingComClient {
  const apiKey = process.env.BOOKING_API_KEY

  if (!apiKey) {
    throw new Error(
      'BOOKING_API_KEY environment variable not configured for Booking.com API access'
    )
  }

  return new BookingComClient(propertyId, apiKey)
}
