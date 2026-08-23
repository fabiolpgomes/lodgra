/**
 * Story 36.1: Individual daily price endpoint
 * DELETE /api/properties/:id/daily-prices/:date
 */

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizePropertyManagement } from '@/lib/auth/authorizePropertyManagement'
import { ApiResponse } from '@/types/pricing.types'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, date } = await params

  try {
    const access = await authorizePropertyManagement(id, [
      'admin',
      'gestor',
      'manager',
      'owner',
    ])
    if (!access.authorized) return access.response! as NextResponse<ApiResponse>
    const { admin, property } = access

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const { error } = await admin
      .from('daily_prices')
      .delete()
      .eq('property_id', id)
      .eq('date', date)

    if (error) throw error

    if (property.slug) {
      revalidatePath(`/p/${property.slug}`)
      revalidatePath(`/p/${property.slug}/checkout`)
    }
    revalidatePath('/booking')

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (err) {
    console.error('Error deleting daily price:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
