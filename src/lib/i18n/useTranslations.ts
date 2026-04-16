'use client'

import { useTranslations as useIntlTranslations } from 'next-intl'

/**
 * Client-side hook for accessing translations
 * Wraps next-intl's useTranslations for consistent usage
 *
 * Usage in client components:
 * ```tsx
 * const t = useTranslations('common');
 * return <h1>{t('appName')}</h1>
 * ```
 */
export function useTranslations(namespace?: string) {
  return useIntlTranslations(namespace)
}
