import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getPlanLimits } from '@/lib/billing/plans'
import { containsNormalized } from '@/lib/utils/normalize-text'
import { getOrganizationFromCheckoutSession } from '@/lib/onboarding/checkout-session'
import type { PropertyCardProps } from '@/components/common/public/properties/PropertyCard'

export interface PropertiesQuery {
  location?: string
  checkIn?: string
  checkOut?: string
  priceMin?: number
  priceMax?: number
  amenities?: string[]
  type?: string
  minRating?: number
  sort?: 'price' | 'rating' | 'newest'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
  orgSlug?: string
}

export interface PropertiesResponse {
  success: boolean
  data?: {
    properties: PropertyCardProps[]
    pagination: {
      currentPage: number
      pageSize: number
      totalItems: number
      totalPages: number
    }
  }
  error?: string
}

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 100

function toSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)

  return slug || 'propriedade'
}

function parseQuery(searchParams: URLSearchParams): PropertiesQuery {
  const location = searchParams.get('location') || undefined
  const checkIn = searchParams.get('checkIn') || undefined
  const checkOut = searchParams.get('checkOut') || undefined
  const priceMin = searchParams.get('priceMin')
    ? parseFloat(searchParams.get('priceMin')!)
    : undefined
  const priceMax = searchParams.get('priceMax')
    ? parseFloat(searchParams.get('priceMax')!)
    : undefined
  const amenities = searchParams.getAll('amenities').filter(Boolean)
  const type = searchParams.get('type') || undefined
  const minRating = searchParams.get('minRating')
    ? parseFloat(searchParams.get('minRating')!)
    : undefined
  const sort =
    (searchParams.get('sort') as 'price' | 'rating' | 'newest') || 'newest'
  const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc'
  const page = searchParams.get('page')
    ? parseInt(searchParams.get('page')!, 10)
    : 1
  const limit = searchParams.get('limit')
    ? parseInt(searchParams.get('limit')!, 10)
    : DEFAULT_LIMIT
  const orgSlug = searchParams.get('orgSlug') || undefined

  return {
    location,
    checkIn,
    checkOut,
    priceMin,
    priceMax,
    amenities: amenities.length > 0 ? amenities : undefined,
    type,
    minRating,
    sort,
    order,
    page,
    limit,
    orgSlug,
  }
}

function validateQuery(query: PropertiesQuery): string | null {
  if (query.limit && (query.limit < 1 || query.limit > MAX_LIMIT)) {
    return `Limit must be between 1 and ${MAX_LIMIT}`
  }

  if (query.page && query.page < 1) {
    return 'Page must be >= 1'
  }

  if (
    query.priceMin !== undefined &&
    query.priceMax !== undefined &&
    query.priceMin > query.priceMax
  ) {
    return 'Price min cannot be greater than max'
  }

  if (query.minRating !== undefined && (query.minRating < 0 || query.minRating > 10)) {
    return 'Rating must be between 0 and 10'
  }

  return null
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const query = parseQuery(searchParams)

    // Validate query parameters
    const validationError = validateQuery(query)
    if (validationError) {
      return Response.json(
        { success: false, error: validationError },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT)
    const page = Math.max(query.page || 1, 1)
    const offset = (page - 1) * limit

    // Resolve org ID from slug if provided
    let orgId: string | undefined
    if (query.orgSlug) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', query.orgSlug)
        .single()
      if (!org) {
        return Response.json({ success: false, error: 'Organization not found' }, { status: 404 })
      }
      orgId = org.id
    }

    // Build base query
    let queryBuilder = supabase
      .from('properties')
      .select(
        `
        id,
        slug,
        name,
        city,
        country,
        photos,
        base_price,
        currency,
        amenities,
        bedrooms,
        bathrooms,
        max_guests,
        property_type,
        created_at
      `,
        { count: 'exact' }
      )
      .eq('is_public', true)

    if (orgId) {
      queryBuilder = queryBuilder.eq('organization_id', orgId)
    }

    // Note: Location filter is applied after fetching data with accent normalization
    // This allows matching "Portimao" with "Portimão" in the database

    if (query.priceMin !== undefined) {
      queryBuilder = queryBuilder.gte('base_price', query.priceMin)
    }

    if (query.priceMax !== undefined) {
      queryBuilder = queryBuilder.lte('base_price', query.priceMax)
    }

    // Amenity filtering is done in JS (case-insensitive) after fetching

    if (query.type) {
      queryBuilder = queryBuilder.eq('property_type', query.type)
    }

    // Apply sorting (before fetching)
    if (query.sort === 'price') {
      queryBuilder = queryBuilder.order('base_price', {
        ascending: query.order === 'asc',
      })
    } else if (query.sort === 'rating') {
      // Rating is computed client-side after fetch
      queryBuilder = queryBuilder.order('created_at', {
        ascending: query.order === 'asc',
      })
    } else {
      // newest (default)
      queryBuilder = queryBuilder.order('created_at', {
        ascending: query.order === 'asc',
      })
    }

    // Fetch properties
    interface PropertyRecord {
      id: string
      slug: string
      name: string
      city: string
      country: string
      photos?: string[]
      base_price: number
      currency: string
      amenities?: string[]
      bedrooms: number
      bathrooms: number
      max_guests: number
      property_type?: string
      created_at: string
    }

    const { data, error } = await queryBuilder.range(offset, offset + limit - 1)

    if (error) {
      console.error('[GET /api/properties] Database error:', error)
      return Response.json(
        { success: false, error: 'Failed to fetch properties' },
        { status: 500 }
      )
    }

    // Check availability for date range if provided
    const availablePropertyIds = new Set<string>()
    if (query.checkIn && query.checkOut) {
      const checkInDate = new Date(query.checkIn)
      const checkOutDate = new Date(query.checkOut)

      // Get all reservations that overlap with the search dates
      const { data: reservations, error: reservationError } = await supabase
        .from('reservations')
        .select('property_id')
        .lt('check_out', checkOutDate.toISOString())
        .gt('check_in', checkInDate.toISOString())

      if (!reservationError && reservations) {
        // Get all property IDs from the results
        const bookedPropertyIds = new Set(reservations.map(r => r.property_id))
        // Available properties are those NOT in the booked list
        const allProps = data as PropertyRecord[]
        allProps.forEach(prop => {
          if (!bookedPropertyIds.has(prop.id)) {
            availablePropertyIds.add(prop.id)
          }
        })
      } else if (!reservationError) {
        // If no reservations found, all properties are available
        const allProps = data as PropertyRecord[]
        allProps.forEach(prop => {
          availablePropertyIds.add(prop.id)
        })
      }
    }

    // Fetch first image per property from property_images table (new system)
    const propertyIds = (data as PropertyRecord[] || []).map(p => p.id)
    const imageMap = new Map<string, string>()

    if (propertyIds.length > 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

      // Step 1: get first property_image per property
      const { data: propImages } = await supabase
        .from('property_images')
        .select('id, property_id, storage_path, display_order')
        .in('property_id', propertyIds)
        .order('display_order')

      if (propImages && propImages.length > 0) {
        // Keep only the first image per property
        const firstImageMap = new Map<string, { id: string; storage_path: string }>()
        for (const img of propImages) {
          if (!firstImageMap.has(img.property_id)) {
            firstImageMap.set(img.property_id, { id: img.id, storage_path: img.storage_path })
          }
        }

        // Step 2: fetch variants for those image IDs
        const imageIds = Array.from(firstImageMap.values()).map(v => v.id)
        const { data: variants } = await supabase
          .from('image_variants')
          .select('property_image_id, storage_path, variant_type')
          .in('property_image_id', imageIds)

        const variantPriority = ['desktop', 'tablet', 'mobile', 'thumb', 'original']

        for (const [propertyId, imgInfo] of firstImageMap) {
          const imgVariants = variants?.filter(v => v.property_image_id === imgInfo.id) ?? []
          let storagePath = ''
          for (const vt of variantPriority) {
            const found = imgVariants.find(v => v.variant_type === vt)?.storage_path
            if (found) { storagePath = found; break }
          }
          if (!storagePath) storagePath = imgInfo.storage_path ?? ''
          if (storagePath && supabaseUrl) {
            imageMap.set(propertyId, `${supabaseUrl}/storage/v1/object/public/property-images/${storagePath}`)
          }
        }
      }
    }

    // Transform and filter properties
    // Additional filtering for location with accent normalization
    const properties = (data as PropertyRecord[] || [])
      .filter(prop => {
        // If checking availability, only include available properties
        if (query.checkIn && query.checkOut && availablePropertyIds.size > 0) {
          if (!availablePropertyIds.has(prop.id)) {
            return false
          }
        }

        // Amenity filter: case-insensitive partial match
        if (query.amenities && query.amenities.length > 0) {
          const propAmenities = (prop.amenities || []).map((a: string) => a.toLowerCase())
          const hasAll = query.amenities.every(filter =>
            propAmenities.some(a => a.includes(filter.toLowerCase()) || filter.toLowerCase().includes(a))
          )
          if (!hasAll) return false
        }

        // If location filter is set, do accent-insensitive comparison
        if (query.location) {
          const cityMatch = containsNormalized(prop.city, query.location)
          const countryMatch = containsNormalized(prop.country, query.location)
          return cityMatch || countryMatch
        }
        return true
      })
      .map((prop: PropertyRecord) => {
        const image = imageMap.get(prop.id) || prop.photos?.[0] || ''

        return {
          id: prop.id,
          slug: prop.slug,
          name: prop.name,
          city: prop.city,
          country: prop.country,
          image,
          price: prop.base_price,
          currency: prop.currency,
          amenities: prop.amenities || [],
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          maxGuests: prop.max_guests,
          rating: undefined,
          reviewCount: 0,
          checkIn: query.checkIn,
          checkOut: query.checkOut,
        } as PropertyCardProps
      })

    // Recalculate total
    const totalItems = properties.length
    const totalPages = Math.ceil(totalItems / limit)

    // Apply pagination to results
    const paginatedProperties = properties.slice(offset, offset + limit)

    return Response.json(
      {
        success: true,
        data: {
          properties: paginatedProperties,
          pagination: {
            currentPage: page,
            pageSize: limit,
            totalItems,
            totalPages,
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('[GET /api/properties] Error:', error)
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/properties — criar imóvel (utilizador autenticado, durante onboarding ou painel)
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let organizationId: string | null = null

    if (body.session_id) {
      try {
        const { organization } = await getOrganizationFromCheckoutSession(body.session_id)
        organizationId = organization.id
      } catch (error) {
        console.warn('[POST /api/properties] Checkout session access failed:', error)
        return Response.json({ error: 'Pagamento ainda não confirmado' }, { status: 409 })
      }
    }

    if (!user && !organizationId) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!organizationId && user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      organizationId = profile?.organization_id ?? null
    }

    if (!organizationId) {
      return Response.json({ error: 'Organização não encontrada' }, { status: 400 })
    }

    const name: string = body.name?.trim() ?? ''
    const address: string | null = body.address?.trim() || null
    const city: string | null = body.city?.trim() || null
    const country: string = body.country?.trim() || 'Brasil'
    const currency: string = body.currency?.trim() || (country === 'Brasil' ? 'BRL' : 'EUR')
    const basePrice = Number(body.base_price ?? body.basePrice ?? 0)
    const maxGuests = Number(body.max_guests ?? body.maxGuests ?? 2)

    if (!name) {
      return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    if (!city) {
      return Response.json({ error: 'Cidade é obrigatória' }, { status: 400 })
    }

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return Response.json({ error: 'Preço inválido' }, { status: 400 })
    }

    if (!Number.isFinite(maxGuests) || maxGuests < 1) {
      return Response.json({ error: 'Número de hóspedes inválido' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: org } = await adminClient
      .from('organizations')
      .select('plan, subscription_plan, premium_extra_properties_count')
      .eq('id', organizationId)
      .single()

    if (org) {
      const plan = org.subscription_plan || org.plan || 'essencial'
      const limits = getPlanLimits(plan)
      const includedLimit = limits.maxProperties
      const extraCount = Number(org.premium_extra_properties_count ?? 0)
      const allowedProperties = includedLimit === null ? null : includedLimit + extraCount

      if (allowedProperties !== null) {
        const { count, error: countError } = await adminClient
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)

        if (countError) {
          console.error('[POST /api/properties] Count error:', countError)
          return Response.json({ error: 'Erro ao validar limite de imóveis' }, { status: 500 })
        }

        if ((count ?? 0) >= allowedProperties) {
          return Response.json(
            {
              error: 'property_limit_reached',
              limit: allowedProperties,
              includedLimit,
              extraCount,
              plan,
              extraPropertyPrice: limits.extraPropertyPrice,
            },
            { status: 403 }
          )
        }
      }
    }

    const baseSlug = toSlug(name)
    let slug = baseSlug
    let attempt = 0

    while (attempt < 20) {
      const { data: existing } = await adminClient
        .from('properties')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (!existing) break
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const { data: property, error: dbError } = await adminClient
      .from('properties')
      .insert({
        name,
        address,
        city,
        country,
        currency,
        slug,
        base_price: basePrice,
        max_guests: maxGuests,
        organization_id: organizationId,
        is_active: true,
        is_public: true,
      })
      .select('id, name, slug')
      .single()

    if (dbError) {
      console.error('[POST /api/properties] DB error:', dbError)
      return Response.json({ error: 'Erro ao criar imóvel' }, { status: 500 })
    }

    return Response.json(property, { status: 201 })
  } catch (error) {
    console.error('[POST /api/properties] Error:', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
