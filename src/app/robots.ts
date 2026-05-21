import { MetadataRoute } from 'next'

/**
 * robots.ts - SEO optimized
 * Task 1.5: Sitemap & Robots Optimization
 *
 * Rules:
 * - Allow: Public pages (homepage, /p/*, /login, /register, /features, /pricing, /docs, /blog)
 * - Disallow: Private pages (dashboard, admin, API endpoints, auth, account settings)
 * - Crawl-delay: None (no delay for Google/Bing, but can adjust if needed)
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'

  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/', '/p/', '/login', '/register', '/features', '/pricing', '/docs', '/blog', '/terms', '/privacy'],
        crawlDelay: 0,
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/p/', '/login', '/register', '/features', '/pricing', '/docs', '/blog', '/terms', '/privacy'],
        crawlDelay: 1,
      },
      {
        userAgent: '*', // All other bots
        allow: ['/', '/p/'],
        disallow: [
          '/admin',
          '/api/',
          '/reports',
          '/calendar',
          '/expenses',
          '/reservations',
          '/owners',
          '/properties',
          '/sync',
          '/financial',
          '/onboarding',
          '/subscribe',
          '/teste',
          '/dashboard',
          '/auth/',
          '/account',
          '/settings',
          '/monitoring',
          '/_next/',
          '/.*\\.json$', // Block JSON files
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`],
    host: baseUrl,
  }
}
