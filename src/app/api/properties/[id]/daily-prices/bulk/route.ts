/**
 * Story 36.5: Bulk daily prices endpoints
 * POST/DELETE /api/properties/:id/daily-prices/bulk
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params

  try {
    const access = await authorizePropertyManagement(id, [
      'admin',
      'gestor',
      'manager',
      'owner',
    ])
    if (!access.authorized) return access.response! as NextResponse<ApiResponse>
    const { admin, property } = access

    const body = await req.json()
    const { operations } = body

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid operations array' },
        { status: 422 }
      )
    }

    for (const op of operations) {
      if (!op.date || !/^\d{4}-\d{2}-\d{2}$/.test(op.date)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format (YYYY-MM-DD)' },
          { status: 422 }
        )
      }

      if (typeof op.price !== 'number' || op.price < 0) {
        return NextResponse.json(
          { success: false, error: 'Price must be a non-negative number' },
          { status: 422 }
        )
      }
    }

    const records = operations.map((op: BulkPriceOperation) => ({
      property_id: id,
      date: op.date,
      base_price: op.price,
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await admin
      .from('daily_prices')
      .upsert(records, { onConflict: 'property_id,date' })
      .select()

    if (error) throw error

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
  } catch (err) {
    console.error('Error in bulk pricing operation:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params

  try {
    const access = await authorizePropertyManagement(id, [
      'admin',
      'gestor',
      'manager',
      'owner',
    ])
    if (!access.authorized) return access.response! as NextResponse<ApiResponse>
    const { admin, property } = access

    const body = await req.json()
    const { dates } = body

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid dates array' },
        { status: 422 }
      )
    }

    for (const date of dates) {
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format (YYYY-MM-DD)' },
          { status: 422 }
        )
      }
    }

    const { error } = await admin
      .from('daily_prices')
      .delete()
      .eq('property_id', id)
      .in('date', dates)

    if (error) throw error

    if (property.slug) {
      revalidatePath(`/p/${property.slug}`)
      revalidatePath(`/p/${property.slug}/checkout`)
    }
    revalidatePath('/booking')

    return NextResponse.json(
      {
        success: true,
        message: `Deleted ${dates.length} prices`,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error in bulk delete operation:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
