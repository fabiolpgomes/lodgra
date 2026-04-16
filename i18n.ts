/**
 * next-intl configuration file
 * Defines locales and dynamic message loading for server-side getTranslations()
 */

import { getRequestConfig } from 'next-intl/server'
import { locales, defaultLocale } from './i18n.config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translationCache: Map<string, any> = new Map()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadMessages(locale: string): Promise<any> {
  const cacheKey = `messages-${locale}`

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  try {
    // Combine all translation namespaces for the locale
    const namespaces = ['common', 'navigation', 'dashboard', 'calendar', 'reports', 'forms', 'errors', 'consent', 'legal']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any = {}

    for (const ns of namespaces) {
      try {
        const nsMessages = await import(`./src/locales/${locale}/${ns}.json`)
        messages[ns] = nsMessages.default || nsMessages
      } catch {
        // Namespace not found, skip it
        messages[ns] = {}
      }
    }

    translationCache.set(cacheKey, messages)
    return messages
  } catch (error) {
    console.warn(`Failed to load messages for locale ${locale}:`, error)
    return {}
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the requested locale exists
  // requestLocale might be a Promise, so handle both cases
  const resolvedLocale = requestLocale instanceof Promise
    ? await requestLocale
    : requestLocale

  const requestedLocale = resolvedLocale || defaultLocale

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locale = locales.includes(requestedLocale as any) ? requestedLocale : defaultLocale

  // Load all messages for the locale
  const messages = await loadMessages(locale)

  return {
    locale,
    messages,
  }
})
