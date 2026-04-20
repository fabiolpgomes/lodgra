/**
 * Normalize text by removing accents and converting to lowercase
 * Useful for accent-insensitive string comparisons
 * @example
 * normalizeText('Portimão') // 'portimao'
 * normalizeText('São Paulo') // 'sao paulo'
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
}

/**
 * Check if text contains a search term (accent and case insensitive)
 * @example
 * containsNormalized('Portimão de Pêra', 'Portimao') // true
 */
export function containsNormalized(text: string, searchTerm: string): boolean {
  return normalizeText(text).includes(normalizeText(searchTerm))
}
