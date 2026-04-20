/**
 * Analytics Client - Dormindo em teste, ativo em produção
 *
 * Usar: trackEvent('event_name', { data })
 * Ativa apenas quando NEXT_PUBLIC_ENABLE_ANALYTICS=true em .env
 */

export interface AnalyticsEvent {
  name: string
  data?: Record<string, unknown>
  timestamp?: number
}

type WindowWithAnalytics = Window & {
  gtag?: (command: string, eventName: string, data?: Record<string, unknown>) => void
  analytics?: { track: (eventName: string, data?: Record<string, unknown>) => void }
}

const isEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'

/**
 * Track custom event
 * @param eventName - Event name (snake_case)
 * @param eventData - Event data (optional)
 */
export function trackEvent(eventName: string, eventData?: Record<string, unknown>) {
  if (!isEnabled) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${eventName}`, eventData || {})
    }
    return
  }

  const event: AnalyticsEvent = {
    name: eventName,
    data: eventData,
    timestamp: Date.now(),
  }

  try {
    // Google Analytics
    if (typeof window !== 'undefined' && (window as WindowWithAnalytics).gtag) {
      (window as WindowWithAnalytics).gtag!('event', eventName, eventData || {})
    }

    // Segment (future)
    if (typeof window !== 'undefined' && (window as WindowWithAnalytics).analytics) {
      (window as WindowWithAnalytics).analytics!.track(eventName, eventData || {})
    }
  } catch (error) {
    console.error(`[Analytics] Error tracking event ${eventName}:`, error)
  }
}

/**
 * Track page view
 * @param pageName - Page name
 * @param pageData - Additional page data
 */
export function trackPageView(pageName: string, pageData?: Record<string, unknown>) {
  trackEvent('page_view', {
    page_name: pageName,
    ...pageData,
  })
}

/**
 * Track CTA click
 * @param buttonName - CTA button identifier
 * @param location - Where button is located (e.g., 'hero', 'pricing', 'footer')
 */
export function trackCTA(buttonName: string, location: string) {
  trackEvent('cta_click', {
    button: buttonName,
    location,
  })
}

/**
 * Track pricing plan selection
 * @param planId - Plan identifier (starter, pro, business)
 * @param action - Action taken (view, select, upgrade)
 */
export function trackPricingAction(planId: string, action: 'view' | 'select' | 'upgrade') {
  trackEvent('pricing_action', {
    plan_id: planId,
    action,
  })
}

/**
 * Track FAQ interaction
 * @param questionIndex - Index of FAQ question
 * @param action - Action taken (open, close)
 */
export function trackFAQInteraction(questionIndex: number, action: 'open' | 'close') {
  trackEvent('faq_interaction', {
    question_index: questionIndex,
    action,
  })
}

/**
 * Track language change
 * @param newLocale - New locale (pt-BR, en-US, es)
 * @param previousLocale - Previous locale
 */
export function trackLocaleChange(newLocale: string, previousLocale: string) {
  trackEvent('locale_change', {
    from: previousLocale,
    to: newLocale,
  })
}

/**
 * Track form submission
 * @param formName - Form identifier
 * @param formData - Form data (email, etc - sanitized)
 */
export function trackFormSubmission(formName: string, formData?: Record<string, unknown>) {
  trackEvent('form_submission', {
    form_name: formName,
    ...formData,
  })
}

export default {
  trackEvent,
  trackPageView,
  trackCTA,
  trackPricingAction,
  trackFAQInteraction,
  trackLocaleChange,
  trackFormSubmission,
}
