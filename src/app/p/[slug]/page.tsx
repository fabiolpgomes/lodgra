import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { PropertyImage } from '@/types/property-images'
import { generatePropertyJsonLd } from '@/lib/seo/jsonld'
import type { ReviewSource, ReviewScoreData, PropertyReview } from '@/types/database'
import { locales } from '../../../../i18n.config'
import { PropertyPageV2 } from '@/components/common/public/PropertyPageV2'

export const revalidate = 60 // revalidate every 60 seconds for dynamic content

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string; minNightsError?: string; datesUnavailable?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('name, description, photos, city, country')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!property) {
    return { title: 'Propriedade não encontrada' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'
  const title = `${property.name} — Reserva Directa | Lodgra`
  const description = property.description || `${property.name} em ${property.city}, ${property.country}. Reserve directamente sem comissões.`
  const image = property.photos?.[0] ?? null
  const canonicalUrl = `${baseUrl}/p/${slug}`

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
      languages: Object.fromEntries(
        locales.map(locale => [locale, `${baseUrl}/${locale}/p/${slug}`])
      ),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Lodgra',
      type: 'website',
      locale: 'pt_PT',
      alternateLocale: ['pt_BR', 'en_US'],
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: property.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function PublicPropertyPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { checkIn, checkOut, guests, minNightsError, datesUnavailable } = await searchParams
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, description, city, country, address, photos, amenities, max_guests, bedrooms, bathrooms, property_type, slug, base_price, currency, postal_code, is_active, created_at, updated_at, min_nights, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type, checkin_from, checkin_until, checkout_until, latitude, longitude')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!property) {
    notFound()
  }

  // Load images from new property_images table
  const { data: galleryImages } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', property.id)
    .order('display_order')

  // Load variants for each image
  let imagesWithVariants: PropertyImage[] = []
  if (galleryImages && galleryImages.length > 0) {
    imagesWithVariants = await Promise.all(
      galleryImages.map(async (image) => {
        const { data: variants } = await supabase
          .from('image_variants')
          .select('*')
          .eq('property_image_id', image.id)
          .order('variant_type')
        return {
          ...image,
          variants: variants || [],
        }
      })
    )
  }

  // Consolidate all photos: prefer new gallery system, fall back to legacy photos[]
  let allPhotos: string[] = []
  
  if (imagesWithVariants.length > 0) {
    // Try new system first and convert storage_path to public URLs
    allPhotos = imagesWithVariants
      .map(img => {
        // Get the best variant available: desktop > tablet > mobile > thumb
        const variantPriority = ['desktop', 'tablet', 'mobile', 'thumb']
        let storagePath = ''
        
        for (const variant of variantPriority) {
          const found = img.variants?.find(v => v.variant_type === variant)?.storage_path
          if (found) {
            storagePath = found
            break
          }
        }
        
        // If no variant found, try original or fallback to main storage_path (but this won't have extension)
        if (!storagePath) {
          storagePath = img.variants?.find(v => v.variant_type === 'original')?.storage_path ?? 
                       img.storage_path ?? 
                       img.storagePath ?? 
                       ''
        }
        
        if (!storagePath) return ''
        
        // Convert storage_path to public URL using Supabase storage bucket
        const publicUrl = supabase.storage
          .from('property-images')
          .getPublicUrl(storagePath).data.publicUrl
        
        return publicUrl
      })
      .filter(Boolean)
  }
  
  // Fallback to legacy photos array if new system empty
  if (allPhotos.length === 0 && property.photos && property.photos.length > 0) {
    allPhotos = property.photos.filter(Boolean)
  }

  // Load pricing rules (admin client bypasses RLS for public page)
  const nowDate = new Date()
  const today = nowDate.toISOString().split('T')[0]
  const futureDate = new Date(nowDate.getFullYear() + 1, nowDate.getMonth(), nowDate.getDate()).toISOString().split('T')[0]
  const { data: pricingRulesRaw } = await adminClient
    .from('pricing_rules')
    .select('start_date, end_date, min_nights')
    .eq('property_id', property.id)
    .gte('end_date', today)
    .lte('start_date', futureDate)
    .order('start_date', { ascending: true })

  const pricingRules = (pricingRulesRaw ?? []).map((r: { start_date: string; end_date: string; min_nights: number }) => ({
    start_date: r.start_date,
    end_date: r.end_date,
    min_nights: r.min_nights,
  }))

  // Load listing IDs for this property (reservations link via property_listing_id, not property_id)
  const { data: propertyListingsData } = await adminClient
    .from('property_listings')
    .select('id')
    .eq('property_id', property.id)

  const listingIds = (propertyListingsData ?? []).map((l: { id: string }) => l.id)

  // Load blocked date ranges from confirmed/pending reservations (public availability)
  let blockedRanges: { start: string; end: string }[] = []
  if (listingIds.length > 0) {
    const { data: blockedReservationsRaw } = await adminClient
      .from('reservations')
      .select('check_in, check_out')
      .in('property_listing_id', listingIds)
      .in('status', ['confirmed', 'pending_payment', 'pending'])
      .gte('check_out', today)
      .lte('check_in', futureDate)

    blockedRanges = (blockedReservationsRaw ?? []).map(
      (r: { check_in: string; check_out: string }) => ({ start: r.check_in, end: r.check_out })
    )
  }

  // Load rooms from property_rooms (admin bypasses RLS for public page)
  const { data: propertyRoomsRaw } = await adminClient
    .from('property_rooms')
    .select('id, name, bed_type, bed_count, provides_linen')
    .eq('property_id', property.id)
    .order('sort_order')

  const propertyRooms = (propertyRoomsRaw ?? []) as Array<{
    id: string
    name: string | null
    bed_type: string
    bed_count: number
    provides_linen: boolean
  }>

  // Load bathrooms from property_bathrooms (admin bypasses RLS for public page)
  const { data: propertyBathroomsRaw } = await adminClient
    .from('property_bathrooms')
    .select('id, name, bathroom_type, amenities')
    .eq('property_id', property.id)
    .order('sort_order')

  const propertyBathrooms = (propertyBathroomsRaw ?? []) as Array<{
    id: string
    name: string | null
    bathroom_type: string
    amenities: string[]
  }>

  // Load amenities from property_amenities + amenities catalog (admin bypasses RLS)
  const { data: propertyAmenitiesRaw } = await adminClient
    .from('property_amenities')
    .select('amenities(id, name, icon, category)')
    .eq('property_id', property.id)

  type AmenityRow = { id: string; name: string; icon: string; category: string }
  const structuredAmenities: AmenityRow[] = (propertyAmenitiesRaw ?? [])
    .map((row: { amenities: AmenityRow | AmenityRow[] | null }) =>
      Array.isArray(row.amenities) ? row.amenities[0] : row.amenities
    )
    .filter((a): a is AmenityRow => a != null)

  // Load reviews for score aggregation (public — RLS allows select)
  const { data: reviewsRaw } = await adminClient
    .from('property_reviews')
    .select('source, rating')
    .eq('property_id', property.id)

  const reviews = reviewsRaw ?? []
  let reviewScore: ReviewScoreData | null = null

  if (reviews.length > 0) {
    // Escalas nativas: Airbnb/Google/TripAdvisor usam /5; Booking/Direct/Other usam /10
    const SOURCE_MAX: Record<string, number> = {
      booking: 10, airbnb: 5, google: 5, tripadvisor: 5, direct: 10, other: 10,
    }
    const toBase10 = (rating: number, source: string) =>
      (rating / (SOURCE_MAX[source] ?? 10)) * 10

    const globalAvg = Math.round(
      (reviews.reduce((s: number, r: { rating: number; source: string }) =>
        s + toBase10(Number(r.rating), r.source), 0) / reviews.length) * 10
    ) / 10

    const bySourceMap = new Map<string, number[]>()
    for (const r of reviews) {
      if (!bySourceMap.has(r.source)) bySourceMap.set(r.source, [])
      bySourceMap.get(r.source)!.push(Number(r.rating))
    }

    const bySource = Array.from(bySourceMap.entries()).map(([source, ratings]) => {
      const nativeMax = SOURCE_MAX[source] ?? 10
      const nativeAvg = Math.round((ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length) * 10) / 10
      const avg = Math.round((nativeAvg / nativeMax) * 100) / 10
      return { source: source as ReviewSource, avg, nativeAvg, nativeMax, count: ratings.length }
    })

    reviewScore = { globalAvg, totalCount: reviews.length, bySource }
  }

  // Load featured reviews for public page (all featured, no cap — component handles pagination)
  const { data: featuredReviewsRaw } = await adminClient
    .from('property_reviews')
    .select('*')
    .eq('property_id', property.id)
    .eq('is_featured', true)
    .order('review_date', { ascending: false })

  const featuredReviews = (featuredReviewsRaw ?? []) as PropertyReview[]

  // minNightsError now carries the actual required count (not a boolean flag)
  const minNightsErrorCount = minNightsError ? parseInt(minNightsError) : undefined

  const nonce = (await headers()).get('x-nonce') ?? undefined
  const jsonLd = generatePropertyJsonLd({
    ...property,
    imageUrls: allPhotos,
    structuredAmenities,
  })

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyPageV2
        property={property}
        allPhotos={allPhotos}
        currency={property.currency}
        initialCheckIn={checkIn}
        initialCheckOut={checkOut}
        initialGuests={guests ? parseInt(guests) : undefined}
        minNights={property.min_nights ?? 1}
        pricingRules={pricingRules}
        structuredAmenities={structuredAmenities}
        rooms={propertyRooms}
        bathrooms={propertyBathrooms}
        minNightsError={minNightsErrorCount && minNightsErrorCount > 0 ? minNightsErrorCount : undefined}
        datesUnavailable={datesUnavailable === '1'}
        cleaningFee={property.cleaning_fee}
        cleaningFeeType={property.cleaning_fee_type}
        petFee={property.pet_fee}
        petFeeType={property.pet_fee_type}
        checkinFrom={property.checkin_from}
        checkinUntil={property.checkin_until}
        checkoutUntil={property.checkout_until}
        blockedRanges={blockedRanges}
        reviewScore={reviewScore}
        featuredReviews={featuredReviews}
      />
    </>
  )
}
