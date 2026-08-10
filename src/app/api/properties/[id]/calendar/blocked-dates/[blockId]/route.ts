/**
 * Delete Blocked Dates API - Remove a blocked date range
 * DELETE /api/properties/[id]/calendar/blocked-dates/[blockId]
 *
 * Requires authentication + ownership verification
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const { id: propertyId, blockId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 403 }
      )
    }

    // Verify block exists and belongs to this property and user's organization
    const { data: block, error: blockError } = await supabase
      .from('calendar_blocks')
      .select('id, property_id, organization_id, start_date, end_date, notes')
      .eq('id', blockId)
      .eq('property_id', propertyId)
      .single()

    if (blockError || !block) {
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404 }
      )
    }

    // Verify ownership via organization
    if (block.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this block' },
        { status: 403 }
      )
    }

    // Delete the block
    const { error: deleteError } = await supabase
      .from('calendar_blocks')
      .delete()
      .eq('id', blockId)

    if (deleteError) {
      console.error('❌ Delete block error:', {
        blockId,
        propertyId,
        error: deleteError,
      })
      return NextResponse.json(
        { success: false, error: 'Failed to delete block' },
        { status: 500 }
      )
    }

    console.log('✅ Block deleted successfully:', {
      blockId,
      propertyId,
      dates: `${block.start_date} to ${block.end_date}`,
      notes: block.notes,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: blockId,
        start_date: block.start_date,
        end_date: block.end_date,
        notes: block.notes,
      },
    })
  } catch (error) {
    console.error('❌ Error deleting block:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
