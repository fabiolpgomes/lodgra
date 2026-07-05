import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/calendar/blocks/test (diagnóstico de bloqueios)
export async function GET(request: NextRequest) {
  try {
    const adminSupa = createAdminClient()
    const userSupa = await createClient()

    // Get current user
    const { data: { user } } = await userSupa.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user organization
    const { data: profile } = await userSupa
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const userOrgId = profile?.organization_id

    // Query property "Casa Típica Portuguesa"
    const { data: property } = await adminSupa
      .from('properties')
      .select('id, name, organization_id')
      .ilike('name', '%Casa Típica Portuguesa%')
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Get ALL blocks (admin bypass)
    const { data: allBlocks, error: adminError } = await adminSupa
      .from('calendar_blocks')
      .select('id, property_id, organization_id, start_date, end_date, block_type, external_uid, notes')
      .eq('property_id', property.id)
      .order('start_date', { ascending: false })

    // Get blocks visible to USER (with RLS)
    const { data: userBlocks, error: userError } = await userSupa
      .from('calendar_blocks')
      .select('id, property_id, organization_id, start_date, end_date, block_type, external_uid, notes')
      .eq('property_id', property.id)
      .order('start_date', { ascending: false })

    return NextResponse.json({
      user: { id: user.id, organization_id: userOrgId },
      property: { id: property.id, name: property.name, organization_id: property.organization_id },
      blocks: {
        admin_view: {
          total: allBlocks?.length || 0,
          data: (allBlocks || []).slice(0, 5), // Show first 5
        },
        user_view: {
          total: userBlocks?.length || 0,
          data: (userBlocks || []).slice(0, 5), // Show first 5
        },
        diagnostic: {
          admin_error: adminError?.message,
          user_error: userError?.message,
          blocks_exist: (allBlocks?.length || 0) > 0,
          user_can_see_blocks: (userBlocks?.length || 0) > 0,
          blocks_hidden_by_rls: (allBlocks?.length || 0) > (userBlocks?.length || 0),
          organization_match: property.organization_id === userOrgId,
          platform_sync_blocks: (allBlocks || []).filter(b => b.block_type === 'platform_sync').length,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
