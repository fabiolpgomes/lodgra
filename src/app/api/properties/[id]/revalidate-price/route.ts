import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/properties/:id/revalidate-price
 *
 * Manually trigger cache invalidation for a property after price update.
 * Invalidates the ISR cache immediately, causing next request to regenerate.
 *
 * Request body:
 * {
 *   "newPrice": 150,
 *   "reason": "manual update" | "booking sync" | "seasonal adjustment"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate propertyId exists
    if (!id) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Verify property exists and is public
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, slug')
      .eq('id', id)
      .eq('is_public', true)
      .single()

    if (fetchError || !property) {
      return NextResponse.json(
        { error: 'Property not found or not public' },
        { status: 404 }
      )
    }

    // Optional: Validate request body contains expected fields
    const body = await request.json().catch(() => ({}))
    const { newPrice, reason = 'manual-update' } = body

    // Log revalidation attempt (useful for debugging)
    console.log(
      `[Revalidate] Property ${property.slug} (${id}): price=${newPrice || 'N/A'}, reason=${reason}`
    )

    // Invalidate the public pages that surface the property price.
    revalidatePath(`/p/${property.slug}`)
    revalidatePath(`/p/${property.slug}/checkout`)
    revalidatePath('/booking')

    const timestamp = new Date().toISOString()

    return NextResponse.json(
      {
        success: true,
        message: `Property ${property.slug} cache invalidated`,
        propertyId: id,
        propertySlug: property.slug,
        revalidatedAt: timestamp,
        reason,
        nextUpdate: new Date(Date.now() + 86400000).toISOString(), // 24h from now
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Revalidate Error]', error)

    return NextResponse.json(
      {
        error: 'Failed to revalidate property cache',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/properties/:id/revalidate-price
 *
 * Health check / status endpoint
 * Shows when property was last revalidated
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json(
      { error: 'Property ID is required' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    endpoint: `/api/properties/${id}/revalidate-price`,
    method: 'POST',
    description: 'Manually trigger ISR cache invalidation after price update',
    usage: {
      body: {
        newPrice: 'number (optional)',
        reason: 'string (optional) - manual-update|booking-sync|seasonal-adjustment',
      },
      response: {
        success: 'boolean',
        propertyId: 'string',
        propertySlug: 'string',
        revalidatedAt: 'ISO timestamp',
        nextUpdate: 'ISO timestamp - when 24h cache expires',
      },
    },
    examples: {
      curl: `curl -X POST http://localhost:3000/api/properties/${id}/revalidate-price \\
  -H "Content-Type: application/json" \\
  -d '{"newPrice": 150, "reason": "seasonal-adjustment"}'`,
    },
  })
}
