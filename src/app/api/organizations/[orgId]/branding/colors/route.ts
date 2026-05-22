import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color)
}

function getContrastRatio(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const L1 = (0.299 * r1 + 0.587 * g1 + 0.114 * b1) / 255
  const L2 = (0.299 * r2 + 0.587 * g2 + 0.114 * b2) / 255
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) throw new Error('Invalid hex color')
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

function getDarkerVariant(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const darker = [Math.max(0, r - 50), Math.max(0, g - 50), Math.max(0, b - 50)]
  return `#${darker.map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const orgId = (await params).orgId
  if (!orgId) return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  if (auth.organizationId !== orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { primary_color, secondary_color, accent_color } = body

  if (primary_color && !isValidHexColor(primary_color)) return NextResponse.json({ error: 'Invalid primary_color format' }, { status: 400 })
  if (secondary_color && !isValidHexColor(secondary_color)) return NextResponse.json({ error: 'Invalid secondary_color format' }, { status: 400 })
  if (accent_color && !isValidHexColor(accent_color)) return NextResponse.json({ error: 'Invalid accent_color format' }, { status: 400 })

  if (primary_color) {
    const [r, g, b] = hexToRgb(primary_color)
    const whiteRgb: [number, number, number] = [255, 255, 255]
    const ratio = getContrastRatio(r, g, b, whiteRgb[0], whiteRgb[1], whiteRgb[2])
    if (ratio < 4.5) {
      return NextResponse.json({
        error: 'Color contrast too low',
        details: `Contrast ratio ${ratio.toFixed(2)}:1 (WCAG AA requires 4.5:1). Using darker variant.`,
        fallback_color: getDarkerVariant(primary_color),
      }, { status: 400 })
    }
  }

  const adminClient = createAdminClient()
  const { data: existingBranding, error: fetchError } = await adminClient.from('organization_branding').select('id').eq('organization_id', orgId).single()

  if (fetchError && fetchError.code !== 'PGRST116') return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const updateData: Record<string, string> = { updated_at: new Date().toISOString() }
  if (primary_color) updateData.primary_color = primary_color
  if (secondary_color) updateData.secondary_color = secondary_color
  if (accent_color) updateData.accent_color = accent_color

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
