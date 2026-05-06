import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { PropertyImage } from '@/types/property-images'
import { generatePropertyJsonLd } from '@/lib/seo/jsonld'
import { locales } from '../../../../i18n.config'
import { PropertyPageV2 } from '@/components/common/public/PropertyPageV2'

export const revalidate = 60 // revalidate every 60 seconds for dynamic content

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string; minNightsError?: string }>
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
  const { checkIn, checkOut, guests, minNightsError } = await searchParams
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, description, city, country, address, photos, amenities, max_guests, bedrooms, bathrooms, property_type, slug, base_price, currency, postal_code, is_active, created_at, updated_at, min_nights, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type, checkin_from, checkin_until, checkout_until')
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

  const jsonLd = generatePropertyJsonLd(property)

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

  // minNightsError now carries the actual required count (not a boolean flag)
  const minNightsErrorCount = minNightsError ? parseInt(minNightsError) : undefined

  return (
    <>
      <script
        type="application/ld+json"
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
        minNightsError={minNightsErrorCount && minNightsErrorCount > 0 ? minNightsErrorCount : undefined}
        cleaningFee={property.cleaning_fee}
        cleaningFeeType={property.cleaning_fee_type}
        petFee={property.pet_fee}
        petFeeType={property.pet_fee_type}
        checkinFrom={property.checkin_from}
        checkinUntil={property.checkin_until}
        checkoutUntil={property.checkout_until}
      />
    </>
  )
}
