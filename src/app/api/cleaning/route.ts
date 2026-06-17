import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_ITEMS = [
  'Trocar roupa de cama',
  'Trocar toalhas',
  'Limpar banheiro completo',
  'Limpar cozinha e fogão',
  'Passar aspirador',
  'Limpar piso',
  'Repor amenities (shampoo, sabonete)',
  'Verificar lâmpadas e tomadas',
  'Recolher lixo',
  'Verificar ar-condicionado/ventilador',
  'Fotografar estado do imóvel',
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    let query = supabase
      .from('cleaning_tasks')
      .select(`
        id, property_id, reservation_id, cleaner_id, scheduled_date, status, notes, completed_at, created_at,
        properties(id, name),
        cleaning_checklist_responses(id, is_done)
      `)
      .eq('organization_id', profile.organization_id)
      .order('scheduled_date', { ascending: true })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (status) query = query.eq('status', status)
    if (date) query = query.eq('scheduled_date', date)

    const { data, error } = await query
    if (error) {
      console.error('Error fetching cleaning tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('GET /api/cleaning error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { property_id, scheduled_date, scheduled_time, cleaner_id, reservation_id, notes } = body

  if (!property_id || !scheduled_date) {
    return NextResponse.json({ error: 'property_id and scheduled_date are required' }, { status: 400 })
  }

  const { data: task, error: taskError } = await supabase
    .from('cleaning_tasks')
    .insert({
      organization_id: profile.organization_id,
      property_id,
      scheduled_date,
      scheduled_time: scheduled_time || null,
      cleaner_id: cleaner_id || null,
      reservation_id: reservation_id || null,
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single()

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })

  // Generate access token if cleaner_id exists
  let accessLink = null
  if (cleaner_id) {
    try {
      const { generateAccessToken, hashToken } = await import('@/lib/cleaner-tokens')
      const plainToken = await generateAccessToken()
      const tokenHash = hashToken(plainToken)
      // Set expiration 7 days from now
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await supabase.from('cleaner_access_tokens').insert({
        cleaner_id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        ip_address: '0.0.0.0',
        user_agent: 'system',
      })

      accessLink = `/cleaner/auth?token=${plainToken}`
    } catch (tokenError) {
      console.error('Error generating access token:', tokenError)
    }
  }

  return NextResponse.json({ ...task, accessLink }, { status: 201 })
}
