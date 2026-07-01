import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { PropertyImage } from '@/types/property-images'
import { generateLodgingBusinessJsonLd } from '@/lib/seo/lodgingBusinessSchema'
import { getSimilarProperties } from '@/lib/supabase/properties'
import type { ReviewSource, ReviewScoreData, PropertyReview } from '@/types/database'
import { locales } from '../../../../i18n.config'
import { PropertyPageV2 } from '@/components/common/public/PropertyPageV2'
import { normalizeToScale10, getScaleMaxForSource } from '@/lib/ratings/normalize'

export const revalidate = 86400 // ISR: 24 hours (2592000 = 30 days on-demand via API)
export const dynamicParams = true // Enable beyond static params from generateStaticParams

// Pre-render all public properties at build time
export async function generateStaticParams() {
  try {
    const supabase = createAdminClient()

    const { data: properties } = await supabase
      .from('properties')
      .select('slug')
      .eq('is_public', true)

    return (properties || []).map((property) => ({
      slug: property.slug,
    }))
  } catch (error) {
    // During build, DB may not be accessible - return empty array
    // Fallback to dynamicParams=true
    return []
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; checkin?: string; checkout?: string; guests?: string; minNightsError?: string; datesUnavailable?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: property, error } = await supabase
    .from('properties')
    .select('name, description, photos, city, country, address, postal_code, latitude, longitude, base_price, currency, amenities, bedrooms, bathrooms, max_guests, property_type, rating, review_count')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!property || error) {
    // Log erro para diagnóstico
    if (error) {
      console.error(`[generateMetadata] Error fetching property ${slug}:`, error.message, error.code)
    }
    return { title: 'Propriedade não encontrada | Algarve Home Stay', robots: { index: false } }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'
  const title = `${property.name} — Reserva Directa | Lodgra`
  const description = property.description || `${property.name} em ${property.city}, ${property.country}. Reserve directamente sem comissões.`
  const canonicalUrl = `${baseUrl}/p/${slug}`
  const ogImageUrl = `${baseUrl}/p/${slug}/opengraph-image`

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
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: property.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    // JSON-LD schema is injected via JSON.stringify in page component
    // Validated via: unit tests + Schema.org validator
  }
}

export default async function PublicPropertyPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams
  const checkIn  = sp.checkIn  ?? sp.checkin
  const checkOut = sp.checkOut ?? sp.checkout
  const { guests, minNightsError, datesUnavailable } = sp
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, description, city, country, address, photos, amenities, max_guests, bedrooms, bathrooms, property_type, slug, base_price, currency, postal_code, is_active, created_at, updated_at, min_nights, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type, checkin_from, checkin_until, checkout_until, latitude, longitude, organization_id')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!property) {
    notFound()
  }

  const similarProperties = await getSimilarProperties(property.id, {
    city: property.city || '',
    limit: 3,
  })

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
    // Normalize all ratings to 0-10 scale before calculating global average
    // Different platforms use different scales (Airbnb: 0-5, Booking/Google: 0-10)
    // We need to normalize before averaging to prevent incorrect calculations
    const bySourceMap = new Map<string, { ratings: number[]; nativeMax: number }>()
    const normalizedForGlobalAvg: number[] = []

    for (const r of reviews) {
      const nativeRating = Number(r.rating)
      const nativeMax = getScaleMaxForSource(r.source)

      if (!bySourceMap.has(r.source)) {
        bySourceMap.set(r.source, { ratings: [], nativeMax })
      }
      bySourceMap.get(r.source)!.ratings.push(nativeRating)

      // Normalize to 0-10 for global average calculation
      const normalized = normalizeToScale10(r.source, nativeRating)
      normalizedForGlobalAvg.push(normalized)
    }

    // Calculate global average from normalized ratings
    const globalAvg = Math.round(
      (normalizedForGlobalAvg.reduce((s: number, v: number) => s + v, 0) / normalizedForGlobalAvg.length) * 10
    ) / 10

    // Build per-source stats with native scales
    const bySource = Array.from(bySourceMap.entries()).map(([source, { ratings, nativeMax }]) => {
      const nativeAvg = Math.round((ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length) * 10) / 10
      return { source: source as ReviewSource, avg: nativeAvg, nativeAvg, nativeMax, count: ratings.length }
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

  // Load org public profile for contact bar
  let orgPublicProfile: { contact_email: string | null; contact_phone: string | null; whatsapp_number: string | null; website_url: string | null; instagram_url: string | null; public_contact_message: string | null; address_line: string | null; city: string | null; country: string | null } | null = null
  let orgName: string | null = null

  if (property.organization_id) {
    const { data: orgData } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('id', property.organization_id)
      .single()

    if (orgData) {
      orgName = orgData.name ?? null
      const { data: profileData } = await adminClient
        .from('organization_public_profile')
        .select('contact_email, contact_phone, whatsapp_number, website_url, instagram_url, public_contact_message, address_line, city, country')
        .eq('organization_id', orgData.id)
        .maybeSingle()
      orgPublicProfile = profileData ?? null
    }
  }

  // minNightsError now carries the actual required count (not a boolean flag)
  const minNightsErrorCount = minNightsError ? parseInt(minNightsError) : undefined

  const nonce = (await headers()).get('x-nonce') ?? undefined
  const jsonLd = generateLodgingBusinessJsonLd({
    ...property,
    imageUrls: allPhotos,
    structuredAmenities,
    telephone: orgPublicProfile?.contact_phone ?? undefined,
    reviewScore: reviewScore
      ? { globalAvg: reviewScore.globalAvg, totalCount: reviewScore.totalCount }
      : null,
    featuredReviews: featuredReviews.length > 0
      ? featuredReviews.map(r => ({
          reviewer_name: r.reviewer_name ?? null,
          rating: Number(r.rating),
          source: r.source,
          comment: r.review_text ?? null,
          review_date: r.review_date ?? null,
        }))
      : null,
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
        similarProperties={similarProperties}
        orgName={orgName}
        publicProfile={orgPublicProfile}
      />
    </>
  )
}
