export const locales = ['pt-BR', 'en-US', 'es'] as const
export const defaultLocale = 'pt-BR' as const

export type Locale = (typeof locales)[number]

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English',
  es: 'Español',
}

export const localeLabels: Record<Locale, string> = {
  'pt-BR': 'BR',
  'en-US': 'EN',
  es: 'ES',
}
