import { ImageResponse } from 'next/og'
import { getPropertyBySlug } from '@/lib/supabase/properties'
import { PropertyOGImage } from '@/components/og/PropertyOGImage'
import { FallbackImage } from '@/components/og/FallbackImage'

export const runtime = 'nodejs'
export const revalidate = 86400 // Cache 24h

interface Params {
  slug: string
}

export default async function Image({ params }: { params: Params }) {
  try {
    const { slug } = params
    const property = await getPropertyBySlug(slug)

    if (!property) {
      return new ImageResponse(<FallbackImage />, {
        width: 1200,
        height: 630,
      })
    }

    return new ImageResponse(<PropertyOGImage property={property} />, {
      width: 1200,
      height: 630,
    })
  } catch (error) {
    console.error('Error generating OG image:', error)

    // Return fallback on error
    return new ImageResponse(<FallbackImage />, {
      width: 1200,
      height: 630,
    })
  }
}
