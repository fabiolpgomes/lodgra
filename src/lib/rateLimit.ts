interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStores = new Map<string, Map<string, RateLimitEntry>>();

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

// Global cleanup interval for all namespaces
setInterval(() => {
  const now = Date.now();
  for (const store of rateLimitStores.values()) {
    for (const [ip, entry] of store.entries()) {
      if (now - entry.windowStart > 5 * 60 * 1000) { // Keep cleanup threshold generous
        store.delete(ip);
      }
    }
  }
}, 5 * 60 * 1000);
