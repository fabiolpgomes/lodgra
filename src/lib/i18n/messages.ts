/**
 * i18n Messages - Centralized translation keys and messages
 * Supports PT (Portuguese) and BR (Brazilian Portuguese) variants
 */

type Locale = 'pt' | 'pt-BR'
type MessageKey =
  | 'errors.minimum_stay_required'
  | 'validation.minimum_stay_nights'

interface Messages {
  [key: string]: {
    pt: string
    'pt-BR': string
  }
}

export const messages: Messages = {
  'errors.minimum_stay_required': {
    pt: 'Estadia mínima de {minNights} noite{plural}',
    'pt-BR': 'Estada mínima de {minNights} noite{plural}',
  },
  'validation.minimum_stay_nights': {
    pt: 'Estadia mínima requerida: {minNights} noite{plural}, fornecido{s} {nights} noite{plural}',
    'pt-BR': 'Estada mínima requerida: {minNights} noite{plural}, fornecido{s} {nights} noite{plural}',
  },
}

/**
 * Get translated message and interpolate variables
 * @param key Message key (e.g., 'errors.minimum_stay_required')
 * @param locale Language locale (default: 'pt')
 * @param variables Variables to interpolate ({minNights, nights, etc})
 * @returns Translated and interpolated message
 */
export function t(
  key: MessageKey,
  locale: Locale = 'pt',
  variables: Record<string, string | number> = {}
): string {
  const msg = messages[key]?.[locale]
  if (!msg) {
    console.warn(`Missing translation: ${key} [${locale}]`)
    return key
  }

  let result = msg
  Object.entries(variables).forEach(([varKey, varValue]) => {
    const placeholder = `{${varKey}}`
    result = result.replace(placeholder, String(varValue))
  })

  // Handle pluralization: {plural} → 's' if count > 1, else ''
  const minNights = variables.minNights
  const plural = (minNights !== undefined && minNights !== 1) ? 's' : ''
  result = result.replace('{plural}', plural)

  // Handle plural form for "fornecido/fornecidos"
  const nights = variables.nights
  if (result.includes('{s}')) {
    const suffix = (nights !== undefined && nights !== 1) ? 's' : ''
    result = result.replace('{s}', suffix)
  }

  return result
}

/**
 * Format minimum stay error message
 * @param minNights Minimum stay requirement
 * @param locale Language locale
 * @returns Formatted error message
 */
export function formatMinimumStayError(minNights: number, locale: Locale = 'pt'): string {
  return t('errors.minimum_stay_required', locale, { minNights })
}

/**
 * Format minimum stay validation error (for detailed messages)
 * @param minNights Required minimum nights
 * @param nights Actual nights provided
 * @param locale Language locale
 * @returns Formatted validation error message
 */
export function formatMinimumStayValidation(minNights: number, nights: number, locale: Locale = 'pt'): string {
  return t('validation.minimum_stay_nights', locale, { minNights, nights })
}

/**
 * Detect locale from request headers or use default
 * @param acceptLanguage Accept-Language header value
 * @returns Detected locale
 */
export function detectLocale(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return 'pt'

  // Simple detection: if 'br' or 'pt-BR' in Accept-Language, use 'pt-BR'
  if (acceptLanguage.toLowerCase().includes('pt-br') || acceptLanguage.toLowerCase().includes('br')) {
    return 'pt-BR'
  }

  // Default to 'pt' (Portugal)
  return 'pt'
}
