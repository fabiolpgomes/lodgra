/**
 * Story 12.4: Sentry Alerts for Payment Failures & Webhook Issues
 * Configures alert rules for critical payment and webhook events
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Alert severity levels for payment monitoring
 */
export enum PaymentAlertSeverity {
  CRITICAL = 'critical', // Payment processing failure
  HIGH = 'high', // Webhook failure, retry exhausted
  MEDIUM = 'medium', // Partial failure, rate limiting
  LOW = 'low', // Non-blocking issues
}

/**
 * Alert types for payment system
 */
export enum PaymentAlertType {
  PAYMENT_FAILED = 'payment_failed',
  WEBHOOK_FAILURE = 'webhook_failure',
  REFUND_FAILED = 'refund_failed',
  SUBSCRIPTION_ERROR = 'subscription_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  STRIPE_CONNECT_ISSUE = 'stripe_connect_issue',
}

/**
 * Configuration for Sentry alerts
 * Rules are evaluated by Sentry's alert service
 */
export const SENTRY_ALERT_RULES = {
  // Alert on payment failures
  payment_failed: {
    type: PaymentAlertType.PAYMENT_FAILED,
    severity: PaymentAlertSeverity.CRITICAL,
    condition: {
      tags: { payment_flow: 'booking' },
      level: 'error',
    },
    notification: {
      channels: ['email', 'slack'],
      recipients: ['alerts@lodgra.com'],
    },
    threshold: {
      count: 5, // Alert if 5+ failures in 5 minutes
      timeWindow: 300, // 5 minutes
    },
    description: 'Payment processing failed for booking',
  },

  // Alert on webhook processing failures
  webhook_failure: {
    type: PaymentAlertType.WEBHOOK_FAILURE,
    severity: PaymentAlertSeverity.HIGH,
    condition: {
      tags: { webhook_event: '*' },
      level: 'warning',
    },
    notification: {
      channels: ['email', 'slack'],
      recipients: ['alerts@lodgra.com'],
    },
    threshold: {
      count: 3, // Alert if 3+ webhook failures in 10 minutes
      timeWindow: 600,
    },
    description: 'Webhook processing failed, retry exhausted',
  },

  // Alert on refund failures
  refund_failed: {
    type: PaymentAlertType.REFUND_FAILED,
    severity: PaymentAlertSeverity.HIGH,
    condition: {
      message: 'refund',
      level: 'error',
    },
    notification: {
      channels: ['email', 'slack'],
      recipients: ['alerts@lodgra.com'],
    },
    threshold: {
      count: 1, // Alert immediately on refund failure
      timeWindow: 1,
    },
    description: 'Refund processing failed',
  },

  // Alert on rate limiting (excessive)
  rate_limit_exceeded: {
    type: PaymentAlertType.RATE_LIMIT_EXCEEDED,
    severity: PaymentAlertSeverity.MEDIUM,
    condition: {
      status: 429,
    },
    notification: {
      channels: ['slack'],
      recipients: ['alerts@lodgra.com'],
    },
    threshold: {
      count: 10, // Alert if 10+ 429s in 1 minute (suspicious)
      timeWindow: 60,
    },
    description: 'Excessive rate limit violations detected',
  },

  // Alert on Stripe Connect issues
  stripe_connect_issue: {
    type: PaymentAlertType.STRIPE_CONNECT_ISSUE,
    severity: PaymentAlertSeverity.CRITICAL,
    condition: {
      message: 'stripe_pt_connect',
    },
    notification: {
      channels: ['email', 'slack'],
      recipients: ['alerts@lodgra.com'],
    },
    threshold: {
      count: 1, // Alert immediately
      timeWindow: 1,
    },
    description: 'Stripe Connect account issue detected',
  },
}

/**
 * Trigger alert for payment failure
 * Called from payment processing code
 */
export function triggerPaymentAlert(
  message: string,
  severity: PaymentAlertSeverity,
  context: {
    paymentId?: string
    bookingId?: string
    amount?: number
    error?: string
  }
) {
  const level = {
    [PaymentAlertSeverity.CRITICAL]: 'error',
    [PaymentAlertSeverity.HIGH]: 'warning',
    [PaymentAlertSeverity.MEDIUM]: 'info',
    [PaymentAlertSeverity.LOW]: 'debug',
  }[severity] as Sentry.SeverityLevel

  Sentry.captureMessage(message, {
    level,
    tags: {
      alert_type: PaymentAlertType.PAYMENT_FAILED,
      severity,
    },
    contexts: {
      payment_alert: {
        paymentId: context.paymentId,
        bookingId: context.bookingId,
        amount: context.amount,
        error: context.error,
      },
    },
  })
}

/**
 * Trigger alert for webhook failure
 */
export function triggerWebhookAlert(
  message: string,
  context: {
    eventType: string
    eventId: string
    retryCount?: number
    error?: string
  }
) {
  Sentry.captureMessage(message, {
    level: 'warning',
    tags: {
      alert_type: PaymentAlertType.WEBHOOK_FAILURE,
      webhook_event: context.eventType,
      event_id: context.eventId,
      retry_count: String(context.retryCount || 0),
    },
    contexts: {
      webhook_alert: {
        eventType: context.eventType,
        eventId: context.eventId,
        retryCount: context.retryCount,
        error: context.error,
      },
    },
  })
}

/**
 * Trigger alert for refund failure
 */
export function triggerRefundAlert(
  message: string,
  context: {
    bookingId: string
    chargeId: string
    amount: number
    error: string
  }
) {
  Sentry.captureMessage(message, {
    level: 'error',
    tags: {
      alert_type: PaymentAlertType.REFUND_FAILED,
    },
    contexts: {
      refund_alert: {
        bookingId: context.bookingId,
        chargeId: context.chargeId,
        amount: context.amount,
        error: context.error,
      },
    },
  })
}

/**
 * Record payment success metric (for monitoring)
 */
export function recordPaymentSuccess(context: {
  bookingId: string
  amount: number
  processingTimeMs: number
}) {
  Sentry.addBreadcrumb({
    category: 'payment',
    message: 'Payment processed successfully',
    level: 'info',
    data: {
      bookingId: context.bookingId,
      amount: context.amount,
      processingTimeMs: context.processingTimeMs,
    },
  })
}

/**
 * Record webhook processing success
 */
export function recordWebhookSuccess(context: {
  eventType: string
  eventId: string
  processingTimeMs: number
}) {
  Sentry.addBreadcrumb({
    category: 'webhook',
    message: 'Webhook processed successfully',
    level: 'info',
    data: {
      eventType: context.eventType,
      eventId: context.eventId,
      processingTimeMs: context.processingTimeMs,
    },
  })
}

/**
 * Export alert configuration for dashboard setup
 * This can be used to programmatically configure alerts in Sentry
 */
export function getAlertConfiguration() {
  return {
    environment: process.env.NODE_ENV || 'development',
    alertRules: SENTRY_ALERT_RULES,
    documentation:
      'Configure these alert rules in Sentry dashboard under: Settings → Alerts → Alert Rules',
  }
}
