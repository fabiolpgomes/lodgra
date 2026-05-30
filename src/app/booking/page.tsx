import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingPageClient } from './BookingPageClient'
import type { PropertyCardProps } from '@/components/common/public/properties/PropertyCard'

const INITIAL_LIMIT = 12
const ROOT_HOSTS = new Set(['lodgra.io', 'www.lodgra.io', 'homestay.pt', 'www.homestay.pt'])
const ALGARVE_HOME_STAY_SLUG = 'algarve-home-stay'
const ALGARVE_HOME_STAY_URL = 'https://algarve-home-stay.lodgra.io/booking'
const ALGARVE_HOME_STAY_IMAGE_URL = 'https://algarve-home-stay.lodgra.io/logotipo/AHS-Brasil-Portugal.png'
const ALGARVE_HOME_STAY_DESCRIPTION = 'Reserve alojamentos no Algarve com a Algarve Home Stay'

export interface PublicContactProfile {
  contact_email: string | null
  contact_phone: string | null
  whatsapp_number: string | null
  website_url: string | null
  instagram_url: string | null
  public_contact_message: string | null
  address_line: string | null
  city: string | null
  country: string | null
}

function getOrgSlugFromHeaders(hdrs: Headers) {
  const explicitSlug = hdrs.get('x-org-slug')
  if (explicitSlug) return explicitSlug

  const forwardedHost = hdrs.get('x-forwarded-host')
  const host = (forwardedHost || hdrs.get('host') || '').split(',')[0].trim().toLowerCase()
  const hostname = host.split(':')[0]

  if (!hostname || ROOT_HOSTS.has(hostname) || hostname.endsWith('.vercel.app')) {
    return null
  }

  if (hostname.endsWith('.lodgra.io') || hostname.endsWith('.homestay.pt')) {
    const [subdomain] = hostname.split('.')
    return subdomain && subdomain !== 'www' ? subdomain : null
  }

  return null
}

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers()
  const orgSlug = getOrgSlugFromHeaders(hdrs)

  // PWA manifest dinâmico para todos os tenants (nome, ícone, cor da marca)
  const pwaBase: Metadata = {
    manifest: '/api/booking-manifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Lodgra Booking',
    },
  }

  if (orgSlug !== ALGARVE_HOME_STAY_SLUG) {
    return pwaBase
  }

  return {
    ...pwaBase,
    title: 'Algarve Home Stay',
    description: ALGARVE_HOME_STAY_DESCRIPTION,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Algarve Home Stay',
    },
    alternates: {
      canonical: ALGARVE_HOME_STAY_URL,
    },
    openGraph: {
      type: 'website',
      url: ALGARVE_HOME_STAY_URL,
      title: 'Algarve Home Stay',
      description: ALGARVE_HOME_STAY_DESCRIPTION,
      siteName: 'Algarve Home Stay',
      images: [{ url: ALGARVE_HOME_STAY_IMAGE_URL, width: 1377, height: 768, alt: 'Algarve Home Stay' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Algarve Home Stay',
      description: ALGARVE_HOME_STAY_DESCRIPTION,
      images: [ALGARVE_HOME_STAY_IMAGE_URL],
    },
  }
}

async function getInitialProperties(orgSlug: string | null) {
  const supabase = createAdminClient()

  let orgId: string | null = null
  let orgName: string | null = null
  let orgLogoUrl: string | null = null
  let publicProfile: PublicContactProfile | null = null

  if (orgSlug) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', orgSlug)
      .single()

    orgId = org?.id ?? null
    orgName = org?.name ?? null

    if (orgId) {
      const { data: branding } = await supabase
        .from('organization_branding')
        .select('logo_url')
        .eq('organization_id', orgId)
        .maybeSingle()

      orgLogoUrl = branding?.logo_url ?? null

      const { data: profile } = await supabase
        .from('organization_public_profile')
        .select('contact_email, contact_phone, whatsapp_number, website_url, instagram_url, public_contact_message, address_line, city, country')
        .eq('organization_id', orgId)
        .maybeSingle()

      publicProfile = profile ?? null
    }
  }

  let query = supabase
    .from('properties')
    .select('id, slug, name, city, country, photos, base_price, currency, amenities, bedrooms, bathrooms, max_guests, created_at', { count: 'exact' })
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(0, INITIAL_LIMIT - 1)

  if (orgId) {
    query = query.eq('organization_id', orgId)
  }

  const { data: propertiesRaw, count } = await query
  const properties = propertiesRaw ?? []
  const propertyIds = properties.map((property) => property.id)
  const imageMap = new Map<string, string>()

  if (propertyIds.length > 0) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const { data: propertyImages } = await supabase
      .from('property_images')
      .select('id, property_id, storage_path, display_order')
      .in('property_id', propertyIds)
      .order('display_order')

    const firstImages = new Map<string, { id: string; storage_path: string }>()
    for (const image of propertyImages ?? []) {
      if (!firstImages.has(image.property_id)) {
        firstImages.set(image.property_id, { id: image.id, storage_path: image.storage_path })
      }
    }

    const imageIds = Array.from(firstImages.values()).map((image) => image.id)
    const { data: variants } = imageIds.length > 0
      ? await supabase
        .from('image_variants')
        .select('property_image_id, storage_path, variant_type')
        .in('property_image_id', imageIds)
      : { data: [] }

    const priority = ['desktop', 'tablet', 'mobile', 'thumb', 'original']
    for (const [propertyId, image] of firstImages) {
      const imageVariants = variants?.filter((variant) => variant.property_image_id === image.id) ?? []
      let storagePath = ''
      for (const variantType of priority) {
        const found = imageVariants.find((variant) => variant.variant_type === variantType)?.storage_path
        if (found) {
          storagePath = found
          break
        }
      }
      if (!storagePath) storagePath = image.storage_path
      if (storagePath && supabaseUrl) {
        imageMap.set(propertyId, `${supabaseUrl}/storage/v1/object/public/property-images/${storagePath}`)
      }
    }
  }

  const cards: PropertyCardProps[] = properties.map((property) => ({
    id: property.id,
    slug: property.slug,
    name: property.name,
    city: property.city,
    country: property.country,
    image: imageMap.get(property.id) || property.photos?.[0] || '',
    price: property.base_price,
    currency: property.currency,
    amenities: property.amenities || [],
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.max_guests,
    rating: undefined,
    reviewCount: 0,
  }))

  return {
    orgName,
    orgLogoUrl,
    publicProfile,
    data: {
      properties: cards,
      pagination: {
        currentPage: 1,
        pageSize: INITIAL_LIMIT,
        totalItems: count ?? cards.length,
        totalPages: Math.max(1, Math.ceil((count ?? cards.length) / INITIAL_LIMIT)),
      },
    },
  }
}

export default async function BookingPage() {
  const hdrs = await headers()
  const orgSlug = getOrgSlugFromHeaders(hdrs)
  const { orgName, orgLogoUrl, publicProfile, data } = await getInitialProperties(orgSlug)

  return <BookingPageClient orgSlug={orgSlug} orgName={orgName} orgLogoUrl={orgLogoUrl} publicProfile={publicProfile} initialData={data} />
}
