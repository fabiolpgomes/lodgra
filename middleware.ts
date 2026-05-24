import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from './i18n.config'

function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const requestHeaders = new Headers(request.headers)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  requestHeaders.set('x-nonce', nonce)

  const isPageRoute = !pathname.startsWith('/api/') && !pathname.includes('.')
  const hasLocale = hasLocalePrefix(pathname)

  // Add locale prefix for root path
  if (isPageRoute && !hasLocale && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = `/${defaultLocale}`
    return NextResponse.redirect(url)
  }

  // Let other requests pass through
  let response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('x-nonce', nonce)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
