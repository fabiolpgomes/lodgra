import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

const FIELDS = [
  'contact_email',
  'contact_phone',
  'whatsapp_number',
  'website_url',
  'instagram_url',
  'public_contact_message',
  'address_line',
  'city',
  'country',
] as const

type PublicProfileField = (typeof FIELDS)[number]

const MAX_LENGTH: Record<PublicProfileField, number> = {
  contact_email: 254,
  contact_phone: 40,
  whatsapp_number: 40,
  website_url: 500,
  instagram_url: 500,
  public_contact_message: 180,
  address_line: 255,
  city: 120,
  country: 120,
}

function normalizeValue(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeUrl(value: string | null) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function isValidEmail(value: string | null) {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidUrl(value: string | null) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function getOrgId(params: Promise<{ orgId: string }>) {
  const { orgId } = await params
  return orgId
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  const orgId = await getOrgId(params)
  if (!orgId || auth.organizationId !== orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('organization_public_profile')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  return NextResponse.json(data ?? { organization_id: orgId }, { status: 200 })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const orgId = await getOrgId(params)
  if (!orgId || auth.organizationId !== orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const updateData: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  for (const field of FIELDS) {
    const value = normalizeValue(body[field])
    if (value && value.length > MAX_LENGTH[field]) {
      return NextResponse.json({ error: `${field} is too long` }, { status: 400 })
    }
    updateData[field] = value
  }

  updateData.website_url = normalizeUrl(updateData.website_url)
  updateData.instagram_url = normalizeUrl(updateData.instagram_url)

  if (!isValidEmail(updateData.contact_email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  if (!isValidUrl(updateData.website_url) || !isValidUrl(updateData.instagram_url)) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: existingProfile, error: fetchError } = await adminClient
    .from('organization_public_profile')
    .select('organization_id')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const query = existingProfile
    ? adminClient
        .from('organization_public_profile')
        .update(updateData)
        .eq('organization_id', orgId)
        .select()
        .single()
    : adminClient
        .from('organization_public_profile')
        .insert({ organization_id: orgId, ...updateData })
        .select()
        .single()

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Database save failed' }, { status: 500 })

  return NextResponse.json(data, { status: 200 })
}
