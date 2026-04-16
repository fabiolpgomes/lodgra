import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session replay for debugging (optional, low sample rate)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Filter out noisy/expected errors
  beforeSend(event) {
    // Don't send rate limit errors — they're expected
    if (event.contexts?.response?.status_code === 429) {
      return null;
    }

    // Filter PII from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
          const sanitized = { ...breadcrumb.data };
          const piiKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'email', 'phone'];
          for (const key of Object.keys(sanitized)) {
            if (piiKeys.some(pii => key.toLowerCase().includes(pii))) {
              sanitized[key] = '[FILTERED]';
            }
          }
          return { ...breadcrumb, data: sanitized };
        }
        return breadcrumb;
      });
    }

    return event;
  },

  // Ignore common browser errors that are not actionable
  ignoreErrors: [
    "ResizeObserver loop",
    "Network request failed",
    "Load failed",
    "ChunkLoadError",
  ],
});
