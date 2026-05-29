'use client'

import { useLocale } from '@/lib/i18n/routing'
import commonEn from '@/locales/en-US/common.json'
import consentEn from '@/locales/en-US/consent.json'
import dashboardEn from '@/locales/en-US/dashboard.json'
import errorsEn from '@/locales/en-US/errors.json'
import formsEn from '@/locales/en-US/forms.json'
import legalEn from '@/locales/en-US/legal.json'
import navigationEn from '@/locales/en-US/navigation.json'
import commonEs from '@/locales/es/common.json'
import consentEs from '@/locales/es/consent.json'
import dashboardEs from '@/locales/es/dashboard.json'
import errorsEs from '@/locales/es/errors.json'
import formsEs from '@/locales/es/forms.json'
import legalEs from '@/locales/es/legal.json'
import navigationEs from '@/locales/es/navigation.json'
import commonPtBr from '@/locales/pt-BR/common.json'
import consentPtBr from '@/locales/pt-BR/consent.json'
import dashboardPtBr from '@/locales/pt-BR/dashboard.json'
import errorsPtBr from '@/locales/pt-BR/errors.json'
import formsPtBr from '@/locales/pt-BR/forms.json'
import legalPtBr from '@/locales/pt-BR/legal.json'
import navigationPtBr from '@/locales/pt-BR/navigation.json'
import { defaultLocale, type Locale } from '@/i18n.config'

const messagesByLocale = {
  'pt-BR': {
    common: commonPtBr,
    consent: consentPtBr,
    dashboard: dashboardPtBr,
    errors: errorsPtBr,
    forms: formsPtBr,
    legal: legalPtBr,
    navigation: navigationPtBr,
  },
  'en-US': {
    common: commonEn,
    consent: consentEn,
    dashboard: dashboardEn,
    errors: errorsEn,
    forms: formsEn,
    legal: legalEn,
    navigation: navigationEn,
  },
  es: {
    common: commonEs,
    consent: consentEs,
    dashboard: dashboardEs,
    errors: errorsEs,
    forms: formsEs,
    legal: legalEs,
    navigation: navigationEs,
  },
} as const

function getByPath(source: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part]
    }
    return undefined
  }, source)

  return typeof value === 'string' ? value : undefined
}

/**
 * Client-side hook for accessing translations
 * Uses local JSON catalogs without requiring the next-intl runtime provider.
 *
 * Usage in client components:
 * ```tsx
 * const t = useTranslations('common');
 * return <h1>{t('appName')}</h1>
 * ```
 */
function interpolate(message: string, values?: Record<string, string | number | Date>): string {
  if (!values) return message

  return Object.entries(values).reduce((current, [key, value]) => {
    return current.replaceAll(`{{${key}}}`, String(value))
  }, message)
}

export function useTranslations(namespace?: string) {
  const locale = (useLocale() || defaultLocale) as Locale
  const messages = messagesByLocale[locale] || messagesByLocale[defaultLocale]

  return (key: string, values?: Record<string, string | number | Date>) => {
    const path = namespace ? `${namespace}.${key}` : key
    return interpolate(getByPath(messages, path) || key, values)
  }
}
