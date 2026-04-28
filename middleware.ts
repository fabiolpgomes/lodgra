import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from './i18n.config'

const PUBLIC_PATHS = [
  '/p/',     // public property pages — no locale needed
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
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

  // Redirect root to default locale
  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
