import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.homestay.pt'

  return {
    rules: [
      {
        userAgent: '*',
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
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
