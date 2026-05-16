/**
 * Story 12.4: Payment Error Handler
 * Centralized error handling for Stripe and payment processing failures
 */

import * as Sentry from '@sentry/nextjs'

export interface ParsedError {
  type: string
  retryable: boolean
  decline_code?: string
  fraud_signal?: boolean
  trial_issue?: boolean
  message: string
  userMessage: string
}

export interface ErrorHandlingResult {
  type: string
  retryable: boolean
  requiresReview: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: string
  userMessage: string
  context: Record<string, unknown>
}

const WEBHOOK_MAX_AGE_SECONDS = 2 * 60 * 60 // 2 hours

/**
 * Parse Stripe and generic errors into structured format
 */
export function parseStripeError(error: Error | Record<string, unknown>): ParsedError {
  const baseError: ParsedError = {
    type: 'unknown_error',
    retryable: false,
    message: error.message || String(error),
    userMessage: 'An error occurred processing your payment. Please try again.',
  }

  // Handle Stripe API errors
  if (error.type === 'StripeCardError' || error.name === 'StripeCardError') {
    return {
      ...baseError,
      type: 'card_error',
      retryable: false,
      decline_code: error.decline_code,
      userMessage: getCardErrorMessage(error.decline_code),
    }
  }

  if (error.type === 'StripeRateLimitError' || error.code === 'rate_limit') {
    return {
      ...baseError,
      type: 'rate_limit_error',
      retryable: true,
      userMessage: 'Too many requests. Please wait and try again.',
    }
  }

  if (
    error.type === 'StripeInvalidRequestError' ||
    error.name === 'StripeInvalidRequestError'
  ) {
    const result: ParsedError = {
      ...baseError,
      type: 'invalid_request_error',
      retryable: false,
    }

    if (error.code === 'subscription_trial_already_set') {
      result.trial_issue = true
      result.userMessage = 'You have already used a trial. Please upgrade to continue.'
    }

    if (error.code === 'fraud_warning' || error.message?.includes('fraud')) {
      result.fraud_signal = true
      result.userMessage = 'Your payment could not be processed. Please contact support.'
    }

    return result
  }

  // Handle fraud_warning directly
  if (error.code === 'fraud_warning' || error.message?.includes('fraud')) {
    return {
      ...baseError,
      type: 'invalid_request_error',
      fraud_signal: true,
      userMessage: 'Your payment could not be processed. Please contact support.',
    }
  }

  if (error.type === 'StripeAPIError' || error.name === 'StripeAPIError') {
    return {
      ...baseError,
      type: 'api_error',
      retryable: true,
      userMessage: 'Service temporarily unavailable. Please try again.',
    }
  }

  // Handle network errors
  if (isNetworkError(error)) {
    return {
      ...baseError,
      type: 'network_error',
      retryable: true,
      userMessage: 'Network error. Please check your connection and try again.',
    }
  }

  return baseError
}

/**
 * Determine if error is a network/connectivity issue
 */
function isNetworkError(error: Error | Record<string, unknown>): boolean {
  const errorMessage = error.message || String(error)
  const networkErrors = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'timeout',
    'EHOSTUNREACH',
    'ENETUNREACH',
  ]

  return networkErrors.some((pattern) => errorMessage.includes(pattern))
}

/**
 * Get user-friendly error message for card decline codes
 */
function getCardErrorMessage(declineCode: string): string {
  const declineMessages: Record<string, string> = {
    generic_decline: 'Your card was declined. Please try a different card.',
    insufficient_funds: 'Your card has insufficient funds. Please try another payment method.',
    lost_card: 'This card has been reported as lost.',
    stolen_card: 'This card has been reported as stolen.',
    card_not_supported: 'Your card is not supported. Please try another card.',
    expired_card: 'Your card has expired. Please use a valid card.',
    processing_error: 'An error occurred processing your card. Please try again.',
  }

  return declineMessages[declineCode] || 'Your card was declined. Please try again.'
}

/**
 * Handle payment error with context
 */
export async function handlePaymentError(
  error: Error | Record<string, unknown>,
  context: Record<string, unknown>
): Promise<ErrorHandlingResult> {
  const parsed = parseStripeError(error)
  const sanitizedContext = sanitizeContext(context)

  // Log to Sentry
  Sentry.captureException(error, {
    tags: {
      error_type: parsed.type,
      retryable: String(parsed.retryable),
    },
    contexts: {
      payment_error: sanitizedContext,
    },
  })

  const severity = determineSeverity(parsed)
  const action = determineAction(parsed)

  return {
    type: parsed.type,
    retryable: parsed.retryable,
    requiresReview: parsed.fraud_signal || false,
    severity,
    action,
    userMessage: parsed.userMessage,
    context: sanitizedContext,
  }
}

/**
 * Remove sensitive data from context before logging
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'cardToken',
    'card',
    'cvv',
    'cvn',
    'pin',
    'password',
    'secret',
    'apiKey',
    'token',
  ]

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(context)) {
    const isSensitive = sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
    sanitized[key] = isSensitive ? '[REDACTED]' : value
  }

  return sanitized
}

/**
 * Determine error severity level
 */
function determineSeverity(
  parsed: ParsedError
): 'low' | 'medium' | 'high' | 'critical' {
  if (parsed.fraud_signal) return 'critical'
  if (parsed.type === 'network_error') return 'medium'
  if (parsed.type === 'rate_limit_error') return 'low'
  if (parsed.type === 'card_error') return 'medium'
  if (parsed.trial_issue) return 'medium'
  if (parsed.type === 'api_error') return 'high'

  return 'medium'
}

/**
 * Determine recommended action for error
 */
function determineAction(parsed: ParsedError): string {
  if (parsed.fraud_signal) return 'manual_review_required'
  if (parsed.trial_issue) return 'upgrade_required'
  if (parsed.type === 'card_error' && parsed.decline_code === 'lost_card')
    return 'contact_support'
  if (!parsed.retryable) return 'user_action_required'

  return 'retry_later'
}

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: Record<string, unknown>): boolean {
  return !!(payload?.data?.object && payload?.type && payload?.id)
}

/**
 * Check if webhook event is a duplicate
 */
export function isDuplicateWebhookEvent(
  eventId: string,
  processedEvents: Set<string> | Array<{ id: string }>
): boolean {
  if (processedEvents instanceof Set) {
    return processedEvents.has(eventId)
  }
  return processedEvents.some((event) => event.id === eventId)
}

/**
 * Check if webhook event is within acceptable age (2 hours)
 */
export function isWebhookEventValid(event: Record<string, number>): boolean {
  const eventCreatedAt = event.created * 1000 // Convert to milliseconds
  const age = Date.now() - eventCreatedAt

  return age < WEBHOOK_MAX_AGE_SECONDS * 1000
}

/**
 * Error descriptions for logging/monitoring
 */
export const ERROR_DESCRIPTIONS = {
  network_error: 'Network connectivity issue',
  card_error: 'Card declined or invalid',
  fraud_signal: 'Potential fraudulent activity',
  trial_issue: 'Trial period problem',
  rate_limit_error: 'Too many requests',
  api_error: 'Stripe API service error',
}
