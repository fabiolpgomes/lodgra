import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizationFromCheckoutSession } from '@/lib/onboarding/checkout-session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const propertyId = body.property_id?.trim()
    const icalUrl = body.ical_url?.trim()
    const sessionId = body.session_id?.trim()

    if (!propertyId) return NextResponse.json({ error: 'Propriedade obrigatória' }, { status: 400 })
    if (!icalUrl) return NextResponse.json({ error: 'URL iCal obrigatória' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let organizationId: string | null = null

    if (sessionId) {
      const { organization } = await getOrganizationFromCheckoutSession(sessionId)
      organizationId = organization.id
    } else if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      organizationId = profile?.organization_id ?? null
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: property } = await adminClient
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!property) {
      return NextResponse.json({ error: 'Propriedade não encontrada' }, { status: 404 })
    }

    const { error } = await adminClient
      .from('property_listings')
      .insert({
        property_id: propertyId,
        platform_id: null,
        ical_url: icalUrl,
        is_active: true,
        sync_enabled: true,
        organization_id: organizationId,
      })

    if (error) {
      console.error('[onboarding/ical] Insert error:', error)
      return NextResponse.json({ error: 'Erro ao guardar iCal' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[onboarding/ical] Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
