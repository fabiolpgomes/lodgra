/**
 * Converts a property name to a URL-safe slug.
 * Examples:
 *   "T1 Sesimbra" → "t1-sesimbra"
 *   "Apartamento Aveiro (Centro)" → "apartamento-aveiro-centro"
 *   "Quinta do Pinheiro" → "quinta-do-pinheiro"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')                          // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')           // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')             // remove non-alphanumeric
    .trim()
    .replace(/[\s_]+/g, '-')                   // spaces/underscores → hyphens
    .replace(/-+/g, '-')                       // collapse multiple hyphens
    .replace(/^-|-$/g, '')                     // trim leading/trailing hyphens
}
