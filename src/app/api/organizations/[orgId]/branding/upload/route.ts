import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'

const LOGO_MAX_SIZE = 2 * 1024 * 1024
const FAVICON_MAX_SIZE = 512 * 1024
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg']
const ALLOWED_FAVICON_TYPES = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon']
const ALLOWED_LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg']
const ALLOWED_FAVICON_EXTENSIONS = ['png', 'ico']

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
  const adminClient = createAdminClient()

  if (logoFile) {
    if (!isAllowedFile(logoFile, ALLOWED_LOGO_TYPES, ALLOWED_LOGO_EXTENSIONS)) return NextResponse.json({ error: 'Logo must be PNG or JPEG' }, { status: 400 })
    if (logoFile.size > LOGO_MAX_SIZE) return NextResponse.json({ error: 'Logo must be less than 2MB' }, { status: 400 })
    try {
      const buffer = await logoFile.arrayBuffer()
      await sharp(buffer).metadata()
      const logoContentType = getImageContentType(logoFile, 'image/png')
      results.logoUrl = await uploadBrandingImage(adminClient, {
        orgId,
        buffer,
        filename: `logo-${Date.now()}.${logoContentType === 'image/jpeg' ? 'jpg' : 'png'}`,
        contentType: logoContentType,
      })
    } catch (error) {
      console.error('Logo upload failed:', error)
      return NextResponse.json({ error: getUploadErrorMessage(error, 'Logo upload failed') }, { status: 500 })
    }
  }

  if (faviconFile) {
    if (!isAllowedFile(faviconFile, ALLOWED_FAVICON_TYPES, ALLOWED_FAVICON_EXTENSIONS)) return NextResponse.json({ error: 'Favicon must be PNG or ICO' }, { status: 400 })
    if (faviconFile.size > FAVICON_MAX_SIZE) return NextResponse.json({ error: 'Favicon must be less than 512KB' }, { status: 400 })
    try {
      const buffer = await faviconFile.arrayBuffer()
      const pngBuffer = await sharp(buffer).resize(64, 64, { fit: 'contain' }).png().toBuffer()
      results.faviconUrl = await uploadBrandingImage(adminClient, {
        orgId,
        buffer: pngBuffer,
        filename: `favicon-${Date.now()}.png`,
        contentType: 'image/png',
      })
    } catch (error) {
      console.error('Favicon upload failed:', error)
      return NextResponse.json({ error: getUploadErrorMessage(error, 'Favicon upload failed') }, { status: 500 })
    }
  }

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

async function uploadBrandingImage(
  adminClient: ReturnType<typeof createAdminClient>,
  {
    orgId,
    buffer,
    filename,
    contentType,
  }: {
    orgId: string
    buffer: ArrayBuffer | Buffer
    filename: string
    contentType: string
  }
): Promise<string> {
  const path = `branding/${orgId}/${filename}`
  const { error } = await adminClient.storage
    .from('property-images')
    .upload(path, buffer, {
      cacheControl: '31536000',
      contentType,
      upsert: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = adminClient.storage.from('property-images').getPublicUrl(path)
  return data.publicUrl
}

function getUploadErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return `${fallback}: ${error.message}`
  }

  return fallback
}

function isAllowedFile(file: File, allowedTypes: string[], allowedExtensions: string[]): boolean {
  if (allowedTypes.includes(file.type)) return true

  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension ? allowedExtensions.includes(extension) : false
}

function getImageContentType(file: File, fallback: 'image/png' | 'image/jpeg'): 'image/png' | 'image/jpeg' {
  if (file.type === 'image/jpeg') return 'image/jpeg'
  if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) return 'image/jpeg'

  return fallback
}
