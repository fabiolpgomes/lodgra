/**
 * Open Graph and Twitter Card Meta Tag Generator
 * Creates optimized meta tags for social media sharing
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'

interface MetaTagProperty {
  name: string
  description: string
  imageUrl?: string
  locale?: string
  slug?: string
}

interface GeneratedMetaTags {
  openGraph: Record<string, string | string[] | Record<string, string> | Record<string, string | number>[]>
  twitter: Record<string, string>
}

export function generateMetaTags(property: MetaTagProperty): GeneratedMetaTags {
  const {
    name,
    description,
    imageUrl,
    locale = 'pt-PT',
    slug,
  } = property

  const url = slug ? `${APP_URL}/p/${slug}` : APP_URL

  // Optimize image dimensions (1200x630px for OG/Twitter)
  const ogImage = imageUrl
    ? {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: name,
        type: 'image/jpeg',
      }
    : undefined

  return {
    openGraph: {
      title: name,
      description,
      url,
      type: 'website',
      siteName: 'Lodgra',
      locale,
      alternateLocale: ['pt-PT', 'pt-BR', 'es-ES', 'en-US'],
      ...(ogImage && { images: [ogImage] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description,
      ...(imageUrl && { image: imageUrl }),
    },
  }
}

export function buildOpenGraphMeta(
  openGraph: Record<string, string | string[] | Record<string, string>>
): Array<{ property: string; content: string }> {
  const meta: Array<{ property: string; content: string }> = []

  const processValue = (
    key: string,
    value: string | string[] | Record<string, string>
  ) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        meta.push({ property: `og:${key}`, content: String(v) })
      })
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([k, v]) => {
        if (typeof v === 'object') {
          Object.entries(v).forEach(([subKey, subVal]) => {
            meta.push({
              property: `og:${key}:${k}:${subKey}`,
              content: String(subVal),
            })
          })
        } else {
          meta.push({
            property: `og:${key}:${k}`,
            content: String(v),
          })
        }
      })
    } else {
      meta.push({ property: `og:${key}`, content: String(value) })
    }
  }

  Object.entries(openGraph).forEach(([key, value]) => {
    processValue(key, value)
  })

  return meta
}

export function buildTwitterMeta(
  twitter: Record<string, string>
): Array<{ name: string; content: string }> {
  return Object.entries(twitter).map(([key, value]) => ({
    name: `twitter:${key}`,
    content: value,
  }))
}
