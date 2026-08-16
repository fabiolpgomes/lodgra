/**
 * API Endpoint: Property Pricing Management
 * GET /api/properties/[id]/pricing — Fetch base + weekend prices
 * PUT /api/properties/[id]/pricing — Save base + weekend prices
 * Story 37.1: Card Preços (Funcional)
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

interface PricingData {
  base_price?: number
  basePrice?: number // Accept camelCase from frontend
  weekend_price?: number | null
  weekendPrice?: number | null
  smart_pricing_enabled?: boolean
  min_price?: number
  max_price?: number
}

/**
 * GET /api/properties/[id]/pricing
 * Fetch pricing configuration from property_prices table
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = await createClient()

    // Get current user from session cookie
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership via owners table JOIN
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, slug, owner_id, currency, owners(id, user_id)')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Verify user owns property by checking owners.user_id
    const owners = Array.isArray(property.owners) ? property.owners[0] : property.owners
    if (owners?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Fetch pricing
    const { data: pricing, error: pricingError } = await supabase
      .from('property_prices')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    if (pricingError && pricingError.code !== 'PGRST116') {
      console.error('Pricing fetch error:', pricingError)
      return NextResponse.json(
        { error: 'Failed to fetch pricing' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...(pricing || {
          property_id: propertyId,
          base_price: 0,
          weekend_price: null,
        }),
        currency: property.currency || 'EUR',
      },
    })
  } catch (error) {
    console.error('GET /api/properties/[id]/pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST & PUT /api/properties/[id]/pricing
 * Save pricing configuration to property_prices table
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = await createClient()

    // Get current user from session cookie
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[PUT /pricing] Auth error:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: PricingData = await req.json()

    // Normalize input (accept both camelCase and snake_case)
    const basePrice = body.base_price || body.basePrice
    const weekendPrice = body.weekend_price || body.weekendPrice

    // Validation
    if (!basePrice) {
      return NextResponse.json(
        { error: 'base_price is required' },
        { status: 400 }
      )
    }

    if (basePrice && basePrice < 1) {
      return NextResponse.json(
        { error: 'base_price must be >= 1' },
        { status: 400 }
      )
    }

    if (weekendPrice !== null && weekendPrice !== undefined && basePrice) {
      if (weekendPrice < basePrice) {
        return NextResponse.json(
          { error: 'weekend_price must be >= base_price' },
          { status: 400 }
        )
      }
    }

    // Verify ownership via owners table JOIN
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, slug, owner_id, owners(id, user_id)')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      console.error('[PUT /pricing] Property lookup error:', propertyError)
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Verify user owns property by checking owners.user_id
    const owners = Array.isArray(property.owners) ? property.owners[0] : property.owners
    const ownerUserId = owners?.user_id
    console.log('[PUT /pricing] Checking ownership:', {
      propertyId,
      ownerId: property.owner_id,
      ownerUserId,
      userId: user.id,
      match: ownerUserId === user.id
    })

    if (ownerUserId !== user.id) {
      console.error('[PUT /pricing] Ownership check FAILED:', {
        ownerUserId,
        userId: user.id,
        match: ownerUserId === user.id
      })
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check if pricing record exists
    const { data: existing, error: existingError } = await supabase
      .from('property_prices')
      .select('id')
      .eq('property_id', propertyId)
      .single()

    // Handle error - PGRST116 means no rows found (expected for new properties)
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[PUT /pricing] Error checking existing pricing:', {
        code: existingError.code,
        message: existingError.message,
        details: existingError,
        propertyId
      })
      return NextResponse.json(
        { error: 'Failed to check existing pricing', details: existingError.message },
        { status: 500 }
      )
    }

    console.log('[PUT /pricing] Pricing check:', {
      existing: !!existing,
      existingError: existingError?.code,
      propertyId
    })

    let result

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('property_prices')
        .update({
          base_price: basePrice,
          weekend_price: weekendPrice || null,
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', propertyId)
        .select()
        .single()

      if (error) {
        console.error('Update pricing error:', error)
        return NextResponse.json(
          { error: 'Failed to update pricing' },
          { status: 500 }
        )
      }
      result = data
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('property_prices')
        .insert({
          property_id: propertyId,
          base_price: basePrice,
          weekend_price: weekendPrice || null,
        })
        .select()
        .single()

      if (error) {
        console.error('Insert pricing error:', error)
        return NextResponse.json(
          { error: 'Failed to create pricing' },
          { status: 500 }
        )
      }
      result = data
    }

    // Keep the public property and checkout pages in sync with the new price.
    revalidatePath(`/p/${property.slug}`)
    revalidatePath(`/p/${property.slug}/checkout`)
    revalidatePath('/booking')

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('PUT /api/properties/[id]/pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
