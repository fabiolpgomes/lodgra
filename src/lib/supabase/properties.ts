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

export interface SimilarProperty {
  id: string
  slug: string
  name: string
  city: string
  country: string
  location: string
  photo_url?: string
  rating?: number
  review_count?: number
  base_price: number
  currency: string
}

/**
 * Fetch propriedades similares por localização
 * Usado para sugerir propriedades relacionadas em páginas de detalhe
 * Otimizado com index em city + is_public
 */
export async function getSimilarProperties(
  currentPropertyId: string,
  options: { city: string; limit?: number } = { city: '', limit: 5 }
): Promise<SimilarProperty[]> {
  const supabase = await createClient()
  const limit = options.limit || 5

  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, slug, name, city, country, photos, rating, review_count, base_price, currency')
    .eq('city', options.city)
    .eq('is_public', true)
    .neq('id', currentPropertyId)
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error || !properties) {
    return []
  }

  return properties.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    city: p.city,
    country: p.country,
    location: `${p.city}, ${p.country}`,
    photo_url: p.photos?.[0],
    rating: p.rating,
    review_count: p.review_count,
    base_price: p.base_price,
    currency: p.currency || 'EUR',
  }))
}
