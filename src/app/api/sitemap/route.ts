import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/sitemap.xml
 *
 * Generates dynamic XML sitemap for:
 * - Main pages (/, /booking, etc)
 * - All public property pages (/p/[slug])
 * - Last modified timestamps
 *
 * Used by search engines and AI crawlers for discovery
 */
export async function GET(request: Request) {
  try {
    // Detect host dynamically from request (supports subdomains like algarve-home-stay.lodgra.io)
    const host = request.headers.get('host') || 'lodgra.io'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    const supabase = createAdminClient()

    // Fetch all public properties with updated_at for lastmod
    const { data: properties, error } = await supabase
      .from('properties')
      .select('slug, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Sitemap Error]', error)
      throw error
    }

    // Build XML sitemap
    const propertyUrls = (properties || [])
      .map(
        (prop) => `
  <url>
    <loc>${baseUrl}/p/${prop.slug}</loc>
    <lastmod>${new Date(prop.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      )
      .join('')

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/booking</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Property pages -->
${propertyUrls}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('[Sitemap Generation Error]', error)

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
</urlset>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
        },
      }
    )
  }
}

/**
 * HEAD /api/sitemap.xml
 * Check sitemap availability
 */
export async function HEAD() {
  return new NextResponse(null, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
