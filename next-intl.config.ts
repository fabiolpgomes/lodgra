/**
 * next-intl Configuration
 *
 * Enables getTranslations() and useLocale() without automatic routing redirects
 * Routing is handled manually in src/middleware.ts
 */

import { locales, defaultLocale } from './i18n.config'

const nextIntlConfig = {
  locales,
  defaultLocale,
  // Messages are loaded per-locale via dynamic imports in pages/middleware
  messages: {},
}

export default nextIntlConfig
