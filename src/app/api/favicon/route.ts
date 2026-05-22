import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return NextResponse.redirect('/favicon.ico', { status: 301 })

  try {
    const supabase = createClient()
    const { data: org, error: orgError } = await supabase.from('organizations').select('id').eq('slug', orgSlug).single()

    if (orgError || !org) return NextResponse.redirect('/favicon.ico', { status: 301 })

    const { data: branding, error: brandingError } = await supabase.from('organization_branding').select('favicon_url').eq('organization_id', org.id).single()

    if (brandingError && brandingError.code !== 'PGRST116') return NextResponse.redirect('/favicon.ico', { status: 301 })

    if (!branding?.favicon_url) return NextResponse.redirect('/favicon.ico', { status: 301 })

    return NextResponse.redirect(branding.favicon_url, {
      headers: { 'Cache-Control': 'public, max-age=86400, immutable' },
      status: 301,
    })
  } catch (error) {
    console.error('Error fetching favicon:', error)
    return NextResponse.redirect('/favicon.ico', { status: 301 })
  }
}
