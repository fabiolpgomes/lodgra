import { getTranslations as getIntlTranslations } from 'next-intl/server'

/**
 * Server-side helper for accessing translations
 * Wraps next-intl's getTranslations for consistent usage
 *
 * Usage in server components:
 * ```tsx
 * const t = await getTranslations('common');
 * return <h1>{t('appName')}</h1>
 * ```
 */
export async function getTranslations(namespace?: string) {
  return getIntlTranslations(namespace)
}
