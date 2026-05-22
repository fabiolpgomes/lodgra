import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULTS = {
  booking_headline: 'Properties',
  featured_property_ids: [],
  show_all_properties: true,
  cta_button_text: 'Book Now',
  template_type: 'standard',
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const orgId = (await params).orgId
  if (!orgId) return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  if (auth.organizationId !== orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data: template, error } = await adminClient.from('organization_templates').select('*').eq('organization_id', orgId).single()

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: 'Database error' }, { status: 500 })

  if (!template) {
    return NextResponse.json({ id: null, organization_id: orgId, ...DEFAULTS, created_at: null, updated_at: null })
  }

  return NextResponse.json(template)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const orgId = (await params).orgId
  if (!orgId || auth.organizationId !== orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { booking_headline, booking_description, featured_property_ids, show_all_properties, template_type, cta_button_text } = body

  if (booking_headline && booking_headline.length > 100) return NextResponse.json({ error: 'Headline max 100 chars' }, { status: 400 })
  if (booking_description && booking_description.length > 500) return NextResponse.json({ error: 'Description max 500 chars' }, { status: 400 })
  if (template_type && !['standard', 'luxury', 'budget'].includes(template_type)) return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: existingTemplate } = await adminClient.from('organization_templates').select('id').eq('organization_id', orgId).single()

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
  if (booking_headline !== undefined) updateData.booking_headline = booking_headline
  if (booking_description !== undefined) updateData.booking_description = booking_description
  if (featured_property_ids !== undefined) updateData.featured_property_ids = featured_property_ids
  if (show_all_properties !== undefined) updateData.show_all_properties = show_all_properties
  if (template_type !== undefined) updateData.template_type = template_type
  if (cta_button_text !== undefined) updateData.cta_button_text = cta_button_text

  let template
  if (existingTemplate) {
    const { data, error } = await adminClient.from('organization_templates').update(updateData).eq('organization_id', orgId).select().single()
    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    template = data
  } else {
    const { data, error } = await adminClient.from('organization_templates').insert({ organization_id: orgId, ...updateData }).select().single()
    if (error) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    template = data
  }

  return NextResponse.json(template)
}
