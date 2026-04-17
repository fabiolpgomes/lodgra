export const locales = ['pt', 'pt-BR', 'en-US', 'es'] as const
export const defaultLocale = 'pt' as const

export type Locale = (typeof locales)[number]

export const localeNames: Record<Locale, string> = {
  pt: 'Português',
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English',
  es: 'Español',
}

export const localeLabels: Record<Locale, string> = {
  pt: 'PT',
  'pt-BR': 'BR',
  'en-US': 'EN',
  es: 'ES',
}
