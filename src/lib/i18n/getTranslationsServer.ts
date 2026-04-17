/**
 * Server-side getTranslations implementation
 * Works without next-intl plugin, loads translations from disk
 */

import { locales } from '@/i18n.config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translationCache: Map<string, any> = new Map()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadTranslation(locale: string, namespace: string): Promise<any> {
  const cacheKey = `${locale}/${namespace}`

  // Return from cache if available
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  try {
    // Dynamically load the translation file
    const messages = await import(`../../../src/locales/${locale}/${namespace}.json`)
    const data = messages.default || messages
    translationCache.set(cacheKey, data)
    return data
  } catch {
    console.warn(`Translation not found: ${locale}/${namespace}`)
    // Return empty object as fallback
    return {}
  }
}

/**
 * Server-side getTranslations
 * Mimics next-intl API but loads translations from files
 */
export async function getTranslations({
  locale,
  namespace = 'common',
}: {
  locale: string
  namespace?: string
}) {
  // Validate locale
  if (!locales.includes(locale as unknown as typeof locales[number])) {
    console.warn(`Invalid locale: ${locale}, using default`)
    locale = 'pt'
  }

  const messages = await loadTranslation(locale, namespace)

  // Return a translation function
  return (key: string, defaultValue: string = key): string => {
    // Handle nested keys like "common.welcome"
    const keys = key.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = messages

    for (const k of keys) {
      value = value?.[k]
      if (!value) break
    }

    return value || defaultValue
  }
}
