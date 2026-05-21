import { createClient } from './server'

export interface PropertyForOG {
  id: string
  name: string
  city: string
  country: string
  location: string // "City, Country"
  photos?: string[]
  photo_url?: string
  rating?: number
  review_count?: number
  base_price: number
  currency: string
}

/**
 * Fetch propriedade por slug para geração de OG image
 * Otimizado para performance (apenas colunas necessárias)
 */
export async function getPropertyBySlug(slug: string): Promise<PropertyForOG | null> {
  const supabase = await createClient()

  const { data: property, error } = await supabase
    .from('properties')
    .select('id, name, city, country, photos, base_price, currency')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle()

  if (error || !property) {
    return null
  }

  return {
    id: property.id,
    name: property.name,
    city: property.city,
    country: property.country,
    location: `${property.city}, ${property.country}`,
    photos: property.photos,
    photo_url: property.photos?.[0],
    base_price: property.base_price,
    currency: property.currency || 'EUR',
  }
}
