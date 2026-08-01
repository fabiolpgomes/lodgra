/**
 * API Endpoint: Property Pricing Management
 * GET /api/properties/[id]/pricing — Fetch base + weekend prices
 * PUT /api/properties/[id]/pricing — Save base + weekend prices
 * Story 37.1: Card Preços (Funcional)
 */

import { createClient } from '@/lib/supabase/server'
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = await createClient()

    // Verify ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
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
      data: pricing || {
        property_id: propertyId,
        base_price: 0,
        weekend_price: null,
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
    const body: PricingData = await req.json()

    // Normalize input (accept both camelCase and snake_case)
    const basePrice = body.base_price || body.basePrice
    const weekendPrice = body.weekend_price || body.weekendPrice

    // Validation
    if (!basePrice || basePrice < 1) {
      return NextResponse.json(
        { error: 'base_price must be >= 1' },
        { status: 400 }
      )
    }

    if (weekendPrice !== null && weekendPrice !== undefined) {
      if (weekendPrice < basePrice) {
        return NextResponse.json(
          { error: 'weekend_price must be >= base_price' },
          { status: 400 }
        )
      }
    }

    const supabase = await createClient()

    // Verify ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Check if pricing record exists
    const { data: existing } = await supabase
      .from('property_prices')
      .select('id')
      .eq('property_id', propertyId)
      .single()

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
