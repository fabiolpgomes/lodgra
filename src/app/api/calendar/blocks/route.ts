import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// GET /api/calendar/blocks?from=YYYY-MM-DD&to=YYYY-MM-DD&property_id=uuid
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const propertyId = searchParams.get('property_id')

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required query params: from, to' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    let query = supabase
      .from('calendar_blocks')
      .select('id, property_id, start_date, end_date, notes, blocked_by, created_at')
      .gte('end_date', from)
      .lte('start_date', to)

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Blocks API] GET error:', error)
      return NextResponse.json(
        { error: 'Erro ao carregar bloqueios' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[Blocks API] GET exception:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao carregar bloqueios' },
      { status: 500 }
    )
  }
}

// POST /api/calendar/blocks
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user role (must be admin or gestor)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 403 }
      )
    }

    if (!['admin', 'gestor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admins and gestors can create blocks' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { property_id, start_date, end_date, notes } = body

    // Validate required fields
    if (!property_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: property_id, start_date, end_date' },
        { status: 400 }
      )
    }

    // Verify property belongs to user's organization
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, organization_id')
      .eq('id', property_id)
      .single()

    if (propError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    if (property.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Property does not belong to your organization' },
        { status: 403 }
      )
    }

    // Create block
    const { data, error } = await supabase
      .from('calendar_blocks')
      .insert({
        property_id,
        organization_id: profile.organization_id,
        start_date,
        end_date,
        notes,
        blocked_by: user.id,
        block_type: 'manual',
      })
      .select()
      .single()

    if (error) {
      console.error('[Blocks API] POST insert error:', error)
      return NextResponse.json(
        { error: 'Erro ao criar bloqueio' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[Blocks API] POST exception:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao criar bloqueio' },
      { status: 500 }
    )
  }
}
