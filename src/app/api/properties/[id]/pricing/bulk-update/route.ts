/**
 * Bulk update pricing for multiple dates
 * POST /api/properties/:id/pricing/bulk-update
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = await createClient()

    // Get current user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      )
    }

    // Verify user owns property
    if (property.owner_id !== user.id) {
      console.error('[bulk-update /pricing] Ownership check failed:', {
        propertyOwnerId: property.owner_id,
        userId: user.id,
        match: property.owner_id === user.id,
        propertyId
      })
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { startDate, endDate, price, dates, base_price } = body

    // Support both formats: (startDate/endDate/price) or (dates/base_price)
    let datesArray: string[] = []
    let priceValue: number

    if (startDate && endDate && price !== undefined) {
      // Format from CalendarWithSettings
      priceValue = price
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Generate all dates between startDate and endDate
      const current = new Date(start)
      while (current <= end) {
        datesArray.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
    } else if (dates && base_price !== undefined) {
      // Legacy format
      datesArray = dates
      priceValue = base_price
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }

    if (!datesArray || datesArray.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid dates' },
        { status: 400 }
      )
    }

    if (typeof priceValue !== 'number' || priceValue < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid price' },
        { status: 400 }
      )
    }

    // Update pricing for each date
    const updates = datesArray.map(date => ({
      property_id: propertyId,
      date,
      base_price: priceValue,
      updated_at: new Date().toISOString(),
    }))

    // Upsert prices for all dates
    console.log('📊 Bulk Update Request:', {
      propertyId,
      dateCount: datesArray.length,
      priceValue,
      firstDate: datesArray[0],
      lastDate: datesArray[datesArray.length - 1],
    })

    const { data, error } = await supabase
      .from('daily_prices')
      .upsert(datesArray.map(date => ({
        property_id: propertyId,
        date,
        base_price: priceValue,
        updated_at: new Date().toISOString(),
      })), { onConflict: 'property_id,date' })
      .select()

    if (error) {
      console.error('❌ Upsert failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Upsert successful:', { upserted: data?.length || 0 })

    return NextResponse.json({
      success: true,
      data: {
        updated_dates: datesArray.length,
        price: priceValue,
      },
    })
  } catch (error) {
    console.error('❌ Error in bulk price update:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
