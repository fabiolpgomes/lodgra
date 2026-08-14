/**
 * Delete Blocked Dates API - Remove a blocked date range
 * DELETE /api/properties/[id]/calendar/blocked-dates/[blockId]
 *
 * Requires authentication + ownership verification
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(({ startDate, endDate }) => startDate <= endDate, {
  message: 'startDate must be before or equal to endDate',
})

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return shifted.toISOString().slice(0, 10)
}

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
      .select('id, property_id, organization_id, start_date, end_date, notes, block_type')
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

    let requestedRange: z.infer<typeof dateRangeSchema> | null = null
    const requestUrl = new URL(request.url)
    const queryStartDate = requestUrl.searchParams.get('startDate')
    const queryEndDate = requestUrl.searchParams.get('endDate')

    if (queryStartDate || queryEndDate) {
      const parsed = dateRangeSchema.safeParse({
        startDate: queryStartDate,
        endDate: queryEndDate,
      })
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid startDate or endDate' },
          { status: 400 }
        )
      }
      requestedRange = parsed.data
    }

    const selectedStart = requestedRange?.startDate ?? block.start_date
    const selectedEnd = requestedRange?.endDate ?? block.end_date

    if (selectedEnd < block.start_date || selectedStart > block.end_date) {
      return NextResponse.json(
        { success: false, error: 'Selected dates do not overlap this block' },
        { status: 400 }
      )
    }

    const unlocksBlockStart = selectedStart <= block.start_date
    const unlocksBlockEnd = selectedEnd >= block.end_date
    let action: 'deleted' | 'trimmed-start' | 'trimmed-end' | 'split'
    let mutationError: { message?: string } | null = null

    if (unlocksBlockStart && unlocksBlockEnd) {
      action = 'deleted'
      const { error } = await supabase.from('calendar_blocks').delete().eq('id', blockId)
      mutationError = error
    } else if (unlocksBlockStart) {
      action = 'trimmed-start'
      const { error } = await supabase
        .from('calendar_blocks')
        .update({ start_date: shiftDate(selectedEnd, 1) })
        .eq('id', blockId)
      mutationError = error
    } else if (unlocksBlockEnd) {
      action = 'trimmed-end'
      const { error } = await supabase
        .from('calendar_blocks')
        .update({ end_date: shiftDate(selectedStart, -1) })
        .eq('id', blockId)
      mutationError = error
    } else {
      action = 'split'
      const rightStart = shiftDate(selectedEnd, 1)
      const { data: rightBlock, error: insertError } = await supabase
        .from('calendar_blocks')
        .insert({
          property_id: block.property_id,
          organization_id: block.organization_id,
          start_date: rightStart,
          end_date: block.end_date,
          notes: block.notes,
          block_type: block.block_type,
        })
        .select('id')
        .single()

      if (insertError) {
        mutationError = insertError
      } else {
        const { error: updateError } = await supabase
          .from('calendar_blocks')
          .update({ end_date: shiftDate(selectedStart, -1) })
          .eq('id', blockId)
        mutationError = updateError

        if (updateError && rightBlock?.id) {
          await supabase.from('calendar_blocks').delete().eq('id', rightBlock.id)
        }
      }
    }

    if (mutationError) {
      console.error('❌ Unblock dates error:', {
        blockId,
        propertyId,
        error: mutationError,
      })
      return NextResponse.json(
        { success: false, error: 'Failed to unblock selected dates' },
        { status: 500 }
      )
    }

    console.log('✅ Dates unblocked successfully:', {
      blockId,
      propertyId,
      selectedDates: `${selectedStart} to ${selectedEnd}`,
      action,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: blockId,
        start_date: block.start_date,
        end_date: block.end_date,
        notes: block.notes,
        action,
        unlocked_start_date: selectedStart,
        unlocked_end_date: selectedEnd,
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
