/**
 * Predefined Analytics Events
 * Use these constants to track consistent events across the app
 */

export const ANALYTICS_EVENTS = {
  // Landing Page
  LANDING_PAGE_VIEW: 'landing_page_view',
  LANDING_LANGUAGE_CHANGE: 'landing_language_change',

  // CTAs
  CTA_HERO_PRIMARY: 'cta_hero_primary_click',
  CTA_HERO_SECONDARY: 'cta_hero_secondary_click',
  CTA_PRICING_STARTER: 'cta_pricing_starter_click',
  CTA_PRICING_PRO: 'cta_pricing_pro_click',
  CTA_PRICING_BUSINESS: 'cta_pricing_business_click',
  CTA_FINAL_CTA: 'cta_final_cta_click',
  CTA_NAVBAR_SIGNUP: 'cta_navbar_signup_click',
  CTA_NAVBAR_LOGIN: 'cta_navbar_login_click',

  // Pricing
  PRICING_PLAN_VIEW: 'pricing_plan_view',
  PRICING_PLAN_SELECT: 'pricing_plan_select',
  PRICING_PLAN_UPGRADE: 'pricing_plan_upgrade',

  // FAQ
  FAQ_OPEN: 'faq_open',
  FAQ_CLOSE: 'faq_close',

  // Navigation
  NAV_FEATURE_LINK: 'nav_feature_link_click',
  NAV_PRICING_LINK: 'nav_pricing_link_click',
  NAV_FAQ_LINK: 'nav_faq_link_click',
  NAV_LANGUAGE_CHANGE: 'nav_language_change',

  // Forms
  FORM_EMAIL_SIGNUP: 'form_email_signup_submit',
  FORM_CHECKOUT: 'form_checkout_submit',

  // Engagement
  SCROLL_TO_FEATURES: 'scroll_to_features',
  SCROLL_TO_PRICING: 'scroll_to_pricing',
  SCROLL_TO_FAQ: 'scroll_to_faq',
  SCROLL_TO_FOOTER: 'scroll_to_footer',
} as const

export type AnalyticsEventKey = keyof typeof ANALYTICS_EVENTS

export const EVENT_LOCATIONS = {
  HERO: 'hero',
  NAVBAR: 'navbar',
  FEATURES: 'features',
  PRICING: 'pricing',
  FAQ: 'faq',
  FOOTER: 'footer',
  FINAL_CTA: 'final_cta',
} as const

export type EventLocation = (typeof EVENT_LOCATIONS)[keyof typeof EVENT_LOCATIONS]
