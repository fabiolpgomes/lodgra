import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { locales } from '../../i18n.config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.homestay.pt'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  // Static pages with i18n alternates
  const localizedStaticPages: MetadataRoute.Sitemap = ['privacy', 'terms', 'politica-de-privacidade'].map(page => ({
    url: `${baseUrl}/${page}`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  }))

  // Dynamic property pages
  let propertyPages: MetadataRoute.Sitemap = []
  try {
    const supabase = createAdminClient()
    const { data: properties } = await supabase
      .from('properties')
      .select('slug, updated_at')
      .eq('is_public', true)
      .not('slug', 'is', null)

    if (properties) {
      propertyPages = properties.flatMap(property => {
        // Main URL (no locale prefix — canonical)
        const main: MetadataRoute.Sitemap[number] = {
          url: `${baseUrl}/p/${property.slug}`,
          lastModified: property.updated_at ? new Date(property.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: {
            languages: Object.fromEntries(
              locales.map(locale => [locale, `${baseUrl}/${locale}/p/${property.slug}`])
            ),
          },
        }
        return [main]
      })
    }
  } catch {
    // Sitemap should not fail if DB is unavailable
  }

  return [...staticPages, ...localizedStaticPages, ...propertyPages]
}
