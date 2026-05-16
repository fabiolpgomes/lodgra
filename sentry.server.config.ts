// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Story 12.4: Enhanced payment error monitoring and webhook tracking

import * as Sentry from "@sentry/nextjs";

const environment = process.env.NODE_ENV || "development";
const isDevelopment = environment === "development";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: isDevelopment ? 1.0 : 0.5,
  profilesSampleRate: isDevelopment ? 1.0 : 0.1,

  // Environment
  environment,

  // Enable logs
  enableLogs: true,

  // Do NOT send PII (emails, IPs, tokens) — RGPD/LGPD compliance
  sendDefaultPii: false,

  // Integrations for payment tracking
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],

  // Filter expected errors and strip sensitive headers
  beforeSend(event) {
    // Ignore rate limit errors (expected)
    if (event.contexts?.response?.status_code === 429) {
      return null;
    }

    // Always capture payment-related errors (CRITICAL)
    const message = event.message || JSON.stringify(event);
    const tags = event.tags || {};
    if (
      message.toLowerCase().includes("payment") ||
      message.toLowerCase().includes("charge") ||
      message.toLowerCase().includes("webhook") ||
      tags.payment_flow === "booking"
    ) {
      return event;
    }

    // Filter sensitive data from headers
    if (event.request?.headers) {
      const headers = { ...event.request.headers };
      const sensitiveHeaders = [
        "authorization",
        "cookie",
        "x-api-key",
        "stripe-signature",
        "card",
        "cvv",
      ];
      for (const header of sensitiveHeaders) {
        if (headers[header]) {
          headers[header] = "[FILTERED]";
        }
      }
      event.request.headers = headers;
    }

    return event;
  },
});

/**
 * Story 12.4: Capture payment errors with context
 */
export function capturePaymentError(
  error: Error | unknown,
  context: {
    paymentId?: string;
    bookingId?: string;
    organizationId?: string;
    eventType?: string;
    amount?: number;
  }
) {
  if (!process.env.SENTRY_DSN) return;

  const errorInstance = error instanceof Error ? error : new Error(String(error));

  Sentry.captureException(errorInstance, {
    tags: {
      payment_flow: "booking",
      event_type: context.eventType || "unknown",
    },
    contexts: {
      payment: {
        paymentId: context.paymentId,
        bookingId: context.bookingId,
        amount: context.amount,
      },
      organization: {
        id: context.organizationId,
      },
    },
    level: "error",
  });
}

/**
 * Story 12.4: Capture webhook processing errors
 */
export function captureWebhookError(
  error: Error | unknown,
  context: {
    eventType: string;
    eventId: string;
    organizationId?: string;
  }
) {
  if (!process.env.SENTRY_DSN) return;

  const errorInstance = error instanceof Error ? error : new Error(String(error));

  Sentry.captureException(errorInstance, {
    tags: {
      webhook_event: context.eventType,
      event_id: context.eventId,
    },
    contexts: {
      webhook: {
        eventType: context.eventType,
        eventId: context.eventId,
      },
      organization: {
        id: context.organizationId,
      },
    },
    level: "warning",
  });
}

/**
 * Story 12.4: Add breadcrumb for payment flow tracking
 */
export function addPaymentBreadcrumb(
  message: string,
  data: Record<string, string | number | boolean>
) {
  Sentry.addBreadcrumb({
    category: "payment",
    message,
    level: "info",
    data,
  });
}

/**
 * Story 12.4: Set user context for error tracking
 */
export function setPaymentUserContext(userId: string, organizationId: string) {
  Sentry.setUser({
    id: userId,
    username: organizationId,
  });
}

/**
 * Story 12.4: Clear user context
 */
export function clearPaymentUserContext() {
  Sentry.setUser(null);
}

export default Sentry;
