type RetryOptions = {
  attempts?: number
  delaysMs?: number[]
  sleep?: (ms: number) => Promise<void>
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3
  const delaysMs = options.delaysMs ?? [5000, 30000, 300000]
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))

  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const delayMs = delaysMs[attempt]
      if (attempt < attempts - 1 && typeof delayMs === 'number' && delayMs > 0) {
        await sleep(delayMs)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Operation failed after retries')
}
