interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStores = new Map<string, Map<string, RateLimitEntry>>();

export function resetRateLimitStores(): void {
  rateLimitStores.clear()
}

/**
 * IP-based rate limiter to prevent bot flooding and DoS.
 * In-process store — resets on server restart. Acceptable for this use case.
 * @param namespace The API endpoint namespace (e.g., 'consent', 'deletion')
 * @param ip The client IP address
 * @param maxRequests Maximum requests per window
 * @param windowMs Window duration in milliseconds (default 1 minute)
 */
export function checkRateLimit(
  namespace: string,
  ip: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): boolean {
  // The E2E suite runs as a single Playwright worker hitting localhost with
  // no x-forwarded-for header, so every request shares the same 'anonymous'
  // IP bucket across the whole test run and exhausts real rate limits within
  // minutes (unrelated to the endpoint or property under test). This flag is
  // set only by .github/workflows/e2e.yml's own job env — never in a real
  // deployment — so production rate limiting is untouched.
  if (process.env.PLAYWRIGHT_TEST_MODE === 'true') {
    return true
  }

  if (!rateLimitStores.has(namespace)) {
    rateLimitStores.set(namespace, new Map<string, RateLimitEntry>());
  }
  
  const store = rateLimitStores.get(namespace)!;
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// Global cleanup interval for all namespaces — .unref() prevents this from blocking process exit in tests
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const store of rateLimitStores.values()) {
    for (const [ip, entry] of store.entries()) {
      if (now - entry.windowStart > 5 * 60 * 1000) {
        store.delete(ip);
      }
    }
  }
}, 5 * 60 * 1000);

const interval = cleanupInterval as ReturnType<typeof setInterval> & { unref?: () => void }
if (typeof interval.unref === 'function') {
  interval.unref()
}
