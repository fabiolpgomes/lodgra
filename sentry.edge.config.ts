// This file configures the initialization of Sentry for edge features (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Lower sample rate for edge (middleware runs on every request)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Enable logs
  enableLogs: true,

  // Do NOT send PII — RGPD/LGPD compliance
  sendDefaultPii: false,

  // Filter expected errors
  beforeSend(event) {
    if (event.contexts?.response?.status_code === 429) {
      return null;
    }
    return event;
  },
});
