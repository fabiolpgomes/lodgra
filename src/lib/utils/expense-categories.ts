/**
 * Single source of truth for expense category translations (PT-BR).
 * Includes legacy/alias keys that may exist in older DB records.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  // Canonical keys
  water: 'Água',
  electricity: 'Luz',
  gas: 'Gás',
  phone: 'Telefone',
  internet: 'Internet',
  condo: 'Condomínio',
  cleaning: 'Limpeza',
  laundry: 'Lavanderia',
  cleaning_supplies: 'Material de limpeza',
  repairs: 'Reparos',
  insurance: 'Seguro Residencial',
  management: 'Gestão do Imóvel',
  other: 'Outros',

  // Additional keys used in expense forms
  supplies: 'Suprimentos',
  maintenance: 'Manutenção',
  taxes: 'Impostos',
  utilities: 'Serviços',
  amenities: 'Comodidades',
  security: 'Segurança',
  garden: 'Jardim',
  pool: 'Piscina',
}

/** Ordered list of canonical categories for filters/selects */
export const CATEGORY_ORDER = [
  'water',
  'electricity',
  'gas',
  'phone',
  'internet',
  'condo',
  'cleaning',
  'laundry',
  'cleaning_supplies',
  'repairs',
  'insurance',
  'management',
  'other',
]

/** Returns translated label; falls back to the raw key if unknown */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}
