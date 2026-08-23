/**
 * Bulk update pricing for multiple dates
 * POST /api/properties/:id/pricing/bulk-update
 */

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizePropertyManagement } from '@/lib/auth/authorizePropertyManagement'
import { ApiResponse } from '@/types/pricing.types'

interface BulkPriceOperation {
  date: string
  price: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id: propertyId } = await params

  try {
    const access = await authorizePropertyManagement(propertyId, [
      'admin',
      'gestor',
      'manager',
      'owner',
    ])
    if (!access.authorized) return access.response! as NextResponse<ApiResponse>
    const { admin, property } = access

    const body = await request.json()
    const { startDate, endDate, price, dates, base_price } = body

    let datesArray: string[] = []
    let priceValue: number

    if (startDate && endDate && price !== undefined) {
      priceValue = price
      const start = new Date(startDate)
      const end = new Date(endDate)
      const current = new Date(start)
      while (current <= end) {
        datesArray.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
    } else if (dates && base_price !== undefined) {
      datesArray = dates
      priceValue = base_price
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }

    if (!datesArray.length) {
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

    const records = datesArray.map((date) => ({
      property_id: propertyId,
      date,
      base_price: priceValue,
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await admin
      .from('daily_prices')
      .upsert(records, { onConflict: 'property_id,date' })
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

    if (property.slug) {
      revalidatePath(`/p/${property.slug}`)
      revalidatePath(`/p/${property.slug}/checkout`)
    }
    revalidatePath('/booking')

    return NextResponse.json(
      {
        success: true,
        data,
        message: `Updated ${records.length} prices`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error in bulk price update:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
