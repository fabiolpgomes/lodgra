import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_BRANDING = {
  logo_url: null,
  favicon_url: null,
  primary_color: '#1E40AF',
  secondary_color: '#6B7280',
  accent_color: '#FFC000',
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const orgSlug = (await params).orgSlug
  if (!orgSlug) return NextResponse.json({ error: 'Organization slug required' }, { status: 400 })

  try {
    const supabase = createClient()
    const { data: org, error: orgError } = await supabase.from('organizations').select('id').eq('slug', orgSlug).single()

    if (orgError || !org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const { data: branding, error: brandingError } = await supabase.from('organization_branding').select('logo_url, favicon_url, primary_color, secondary_color, accent_color').eq('organization_id', org.id).single()

    if (brandingError && brandingError.code !== 'PGRST116') return NextResponse.json({ error: 'Database error' }, { status: 500 })

    const result = branding || DEFAULT_BRANDING
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('Error fetching branding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
