import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from './i18n.config'

const PUBLIC_PATHS = [
  '/p/',     // public property pages — no locale needed
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/checkout', // Stripe success/cancel pages
  '/sync',
  '/auth',
  '/monitoring',
  '/api',
  '/_next',
  '/favicon',
  '/locales',
  '/images',
  '/robots.txt',
  '/sitemap.xml',
]

function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public paths, static files and API routes
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Skip if already has a locale prefix
  if (hasLocalePrefix(pathname)) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`

  // RSC navigation (fetch with redirect:manual) doesn't follow HTTP redirects —
  // the response becomes opaque (status 0) which Next.js reports as 404.
  // Use a transparent rewrite instead so the correct locale page is served
  // without the client needing to follow a redirect.
  const isRscNavigation =
    request.headers.get('RSC') === '1' ||
    request.nextUrl.searchParams.has('_rsc')

  return isRscNavigation
    ? NextResponse.rewrite(url)
    : NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
