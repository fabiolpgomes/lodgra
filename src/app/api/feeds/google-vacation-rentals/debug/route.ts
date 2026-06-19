/**
 * DEBUG ENDPOINT: Google Vacation Rentals Feed - Image Debug
 * GET /api/feeds/google-vacation-rentals/debug
 *
 * Shows raw image data from property_images table for debugging
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Fetch a single property with all its images
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name')
      .limit(1)

    if (propError || !properties || properties.length === 0) {
      return NextResponse.json({ error: 'No properties found' }, { status: 404 })
    }

    const propertyId = properties[0].id

    // Fetch images for this property
    const { data: images, error: imgError } = await supabase
      .from('property_images')
      .select('id, storage_path, alt_text, display_order, is_primary')
      .eq('property_id', propertyId)
      .order('display_order', { ascending: true })
      .limit(5)

    return NextResponse.json(
      {
        property: properties[0],
        imageQueryError: imgError,
        imageCount: images?.length || 0,
        images: images || [],
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        debug: {
          note: 'If imageCount = 0, images not found in property_images table',
          note2: 'If storage_path is empty, check if column name is correct',
          note3: 'NEXT_PUBLIC_SUPABASE_URL must be set for URLs to work',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
