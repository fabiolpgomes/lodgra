import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ROOT_HOSTS = new Set(['lodgra.io', 'www.lodgra.io', 'homestay.pt', 'www.homestay.pt'])

const DEFAULT_ICONS = [
  { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

function getOrgSlug(request: NextRequest): string | null {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = (forwardedHost || request.headers.get('host') || '').split(',')[0].trim().toLowerCase().split(':')[0]
  if (!host || ROOT_HOSTS.has(host) || host.endsWith('.vercel.app')) return null
  if (host.endsWith('.lodgra.io') || host.endsWith('.homestay.pt')) {
    const [subdomain] = host.split('.')
    return subdomain && subdomain !== 'www' ? subdomain : null
  }
  return null
}

export async function GET(request: NextRequest) {
  const orgSlug = getOrgSlug(request)

  let orgName = 'Lodgra'
  let orgLogoUrl: string | null = null
  let themeColor = '#1E3A8A'
  let description = 'Reserve propriedades directamente'

  if (orgSlug) {
    try {
      const supabase = createAdminClient()
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', orgSlug)
        .single()

      if (org) {
        orgName = org.name || orgName

        const [brandingResult, profileResult] = await Promise.all([
          supabase
            .from('organization_branding')
            .select('logo_url, primary_color')
            .eq('organization_id', org.id)
            .maybeSingle(),
          supabase
            .from('organization_public_profile')
            .select('public_contact_message, city, country')
            .eq('organization_id', org.id)
            .maybeSingle(),
        ])

        orgLogoUrl = brandingResult.data?.logo_url ?? null
        themeColor = brandingResult.data?.primary_color || themeColor

        const loc = [profileResult.data?.city, profileResult.data?.country].filter(Boolean).join(', ')
        description = profileResult.data?.public_contact_message || (loc ? `Reserve propriedades em ${loc}` : description)
      }
    } catch {
      // fail gracefully — return default manifest
    }
  }

  const shortName = orgName.split(' ').slice(0, 2).join(' ')

  const icons = orgLogoUrl
    ? [
        { src: orgLogoUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: orgLogoUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
        ...DEFAULT_ICONS,
      ]
    : DEFAULT_ICONS

  const manifest = {
    name: orgName,
    short_name: shortName,
    description,
    start_url: '/booking',
    scope: '/booking',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: themeColor,
    lang: 'pt',
    dir: 'ltr',
    categories: ['travel', 'lifestyle'],
    prefer_related_applications: false,
    icons,
    screenshots: [],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
