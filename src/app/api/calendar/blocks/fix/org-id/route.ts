import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/calendar/blocks/fix/org-id
export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()

    // Find all blocks with NULL organization_id
    const { data: nullBlocks, error: findError } = await adminSupabase
      .from('calendar_blocks')
      .select('id, property_id')
      .is('organization_id', null)

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    console.log(`[Fix] Found ${nullBlocks?.length || 0} blocks with NULL organization_id`)

    if (!nullBlocks || nullBlocks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No blocks with NULL organization_id found',
        blocksFixed: 0,
      })
    }

    // Update all NULL blocks using the property's organization_id
    const { error: updateError, data: updated } = await adminSupabase
      .from('calendar_blocks')
      .update({
        organization_id: adminSupabase.rpc('get_property_organization_id', {
          prop_id: 'property_id',
        }),
      })
      .is('organization_id', null)
      .select('id, organization_id')

    // Since RPC might not work in update, use raw SQL approach via a different method
    // Instead, let's fix them one by one
    let fixedCount = 0
    const errors = []

    for (const block of nullBlocks) {
      // Get property's organization_id
      const { data: prop } = await adminSupabase
        .from('properties')
        .select('organization_id')
        .eq('id', block.property_id)
        .single()

      if (!prop?.organization_id) {
        errors.push(`Block ${block.id}: Property has no organization_id`)
        continue
      }

      // Update the block
      const { error: blockUpdateError } = await adminSupabase
        .from('calendar_blocks')
        .update({ organization_id: prop.organization_id })
        .eq('id', block.id)

      if (blockUpdateError) {
        errors.push(`Block ${block.id}: ${blockUpdateError.message}`)
      } else {
        fixedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} blocks with NULL organization_id`,
      blocksFixed: fixedCount,
      blocksFailed: errors.length,
      errors: errors.length > 0 ? errors : null,
    })
  } catch (error) {
    console.error('[Fix] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
