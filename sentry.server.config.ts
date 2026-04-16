// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Enable logs
  enableLogs: true,

  // Do NOT send PII (emails, IPs, tokens) — RGPD/LGPD compliance
  sendDefaultPii: false,

  // Filter expected errors and strip sensitive headers
  beforeSend(event) {
    if (event.contexts?.response?.status_code === 429) {
      return null;
    }

    if (event.request?.headers) {
      const headers = { ...event.request.headers };
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
      for (const header of sensitiveHeaders) {
        if (headers[header]) {
          headers[header] = '[FILTERED]';
        }
      }
      event.request.headers = headers;
    }

    return event;
  },
});
