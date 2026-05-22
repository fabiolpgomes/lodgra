import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { put } from '@vercel/blob'
import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'

const LOGO_MAX_SIZE = 2 * 1024 * 1024
const FAVICON_MAX_SIZE = 100 * 1024
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg']
const ALLOWED_FAVICON_TYPES = ['image/png', 'image/x-icon']

export async function POST(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const orgId = (await params).orgId
  if (!orgId) return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  if (auth.organizationId !== orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const logoFile = formData.get('logo') as File | null
  const faviconFile = formData.get('favicon') as File | null

  if (!logoFile && !faviconFile) return NextResponse.json({ error: 'At least one file required' }, { status: 400 })

  const results: { logoUrl?: string; faviconUrl?: string } = {}

  if (logoFile) {
    if (!ALLOWED_LOGO_TYPES.includes(logoFile.type)) return NextResponse.json({ error: 'Logo must be PNG or JPEG' }, { status: 400 })
    if (logoFile.size > LOGO_MAX_SIZE) return NextResponse.json({ error: 'Logo must be less than 2MB' }, { status: 400 })
    try {
      const buffer = await logoFile.arrayBuffer()
      await sharp(buffer).metadata()
      const blob = await put(`orgs/${orgId}/logo.png`, buffer, { access: 'public', contentType: 'image/png' })
      results.logoUrl = blob.url
    } catch (error) {
      return NextResponse.json({ error: 'Logo upload failed' }, { status: 500 })
    }
  }

  if (faviconFile) {
    if (!ALLOWED_FAVICON_TYPES.includes(faviconFile.type)) return NextResponse.json({ error: 'Favicon must be PNG or ICO' }, { status: 400 })
    if (faviconFile.size > FAVICON_MAX_SIZE) return NextResponse.json({ error: 'Favicon must be less than 100KB' }, { status: 400 })
    try {
      const buffer = await faviconFile.arrayBuffer()
      await sharp(buffer).metadata()
      const blob = await put(`orgs/${orgId}/favicon.ico`, buffer, { access: 'public', contentType: 'image/x-icon' })
      results.faviconUrl = blob.url
    } catch (error) {
      return NextResponse.json({ error: 'Favicon upload failed' }, { status: 500 })
    }
  }

  const adminClient = createAdminClient()
  const { data: existingBranding, error: fetchError } = await adminClient.from('organization_branding').select('id').eq('organization_id', orgId).single()

  if (fetchError && fetchError.code !== 'PGRST116') return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const updateData: Record<string, string> = {}
  if (results.logoUrl) updateData.logo_url = results.logoUrl
  if (results.faviconUrl) updateData.favicon_url = results.faviconUrl
  updateData.updated_at = new Date().toISOString()

  let branding
  if (existingBranding) {
    const { data, error } = await adminClient.from('organization_branding').update(updateData).eq('organization_id', orgId).select().single()
    if (error) return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    branding = data
  } else {
    const { data, error } = await adminClient.from('organization_branding').insert({ organization_id: orgId, ...updateData }).select().single()
    if (error) return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
    branding = data
  }

  return NextResponse.json(branding, { status: 200 })
}
