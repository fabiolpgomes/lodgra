import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type TrafficEventInput = {
  organization_slug?: string
  path?: string
  event_name?: string
  hostname?: string
  referrer?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrafficEventInput
    const organizationSlug = body.organization_slug?.trim()
    const path = body.path?.trim() || '/'
    const eventName = body.event_name?.trim() || 'page_view'
    const hostname = body.hostname?.trim() || request.headers.get('host') || 'unknown'
    const referrer = body.referrer?.trim() || request.headers.get('referer') || null
    const userAgent = request.headers.get('user-agent')

    if (!organizationSlug) {
      return NextResponse.json({ error: 'organization_slug is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id, slug')
      .eq('slug', organizationSlug)
      .single()

    if (organizationError || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { error } = await supabase.from('organization_traffic_events').insert({
      organization_id: organization.id,
      event_name: eventName,
      path,
      hostname,
      referrer,
      user_agent: userAgent,
    })

    if (error) {
      console.error('[analytics/traffic] Failed to store event:', error)
      return NextResponse.json({ error: 'Failed to store traffic event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[analytics/traffic] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    )
  }
}

