import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const DEFAULTS = { booking_headline: 'Properties', featured_property_ids: [], show_all_properties: true, cta_button_text: 'Book Now', template_type: 'standard' }

export async function GET(request: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const orgSlug = (await params).orgSlug
  if (!orgSlug) return NextResponse.json({ error: 'Organization slug required' }, { status: 400 })

  try {
    const supabase = createClient()
    const { data: org, error: orgError } = await supabase.from('organizations').select('id').eq('slug', orgSlug).single()

    if (orgError || !org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const { data: template, error: templateError } = await supabase.from('organization_templates').select('*').eq('organization_id', org.id).single()

    if (templateError && templateError.code !== 'PGRST116') return NextResponse.json({ error: 'Database error' }, { status: 500 })

    const result = template || { organization_id: org.id, ...DEFAULTS }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
