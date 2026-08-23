/**
 * Cleanup Endpoint - DELETE all blocked dates for a property
 * DELETE /api/properties/[id]/calendar/blocked-dates/cleanup
 *
 * ⚠️ WARNING: This deletes ALL blocks for a property. Use with caution!
 */

import { authorizePropertyManagement } from '@/lib/auth/authorizePropertyManagement'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const access = await authorizePropertyManagement(propertyId)
    if (!access.authorized) return access.response!
    const { admin } = access

    console.log(`[Cleanup] Deleting all blocks for property=${propertyId}`)

    // Get all blocks first to show what we're deleting
    const { data: blocks, error: fetchError } = await admin
      .from('calendar_blocks')
      .select('id, start_date, end_date, notes')
      .eq('property_id', propertyId)

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      return NextResponse.json(
        { error: `Failed to fetch blocks: ${fetchError.message}` },
        { status: 500 }
      )
    }

    console.log(`[Cleanup] Found ${blocks?.length || 0} blocks to delete`)

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No blocks found to delete',
        deleted: 0,
      })
    }

    // Delete all blocks
    const { error: deleteError } = await admin
      .from('calendar_blocks')
      .delete()
      .eq('property_id', propertyId)

    if (deleteError) {
      console.error('❌ Delete error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete blocks: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ Deleted ${blocks.length} blocks`)

    return NextResponse.json({
      success: true,
      message: `Deleted ${blocks.length} blocked date ranges`,
      deleted: blocks.length,
      details: blocks.map(b => ({
        id: b.id,
        dates: `${b.start_date} to ${b.end_date}`,
        notes: b.notes,
      })),
    })
  } catch (error) {
    console.error('❌ Cleanup exception:', error)
    return NextResponse.json(
      { error: 'Server error during cleanup' },
      { status: 500 }
    )
  }
}
