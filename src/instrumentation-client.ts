// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Enable logs
  enableLogs: true,

  // Session replay for debugging (low sample rate in prod)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Do NOT send PII — RGPD/LGPD compliance
  sendDefaultPii: false,

  // Filter out noisy/expected errors
  beforeSend(event) {
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
