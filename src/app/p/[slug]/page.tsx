import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { PropertyImage } from '@/components/features/properties/types/property-images'
import { generatePropertyJsonLd } from '@/lib/seo/jsonld'
import { locales } from '../../../../i18n.config'
import { PropertyPageV2 } from '@/components/common/public/PropertyPageV2'

export const revalidate = 60 // revalidate every 60 seconds for dynamic content

interface PageProps {
  params: Promise<{ slug: string }>
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lodgra.pt'
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

export default async function PublicPropertyPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, description, city, country, address, photos, amenities, max_guests, bedrooms, bathrooms, property_type, slug, base_price')
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyPageV2 property={property} allPhotos={allPhotos} />
    </>
  )
}
