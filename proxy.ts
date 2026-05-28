import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { locales, defaultLocale } from './i18n.config'
import { applySecurityHeaders } from '@/lib/middleware/security-headers'
import { checkCsrf } from '@/lib/middleware/csrf'
import { getClientIp, applyRateLimit } from '@/lib/middleware/rate-limit'
import {
  isPublicPath,
  redirectToLogin,
  checkPasswordReset,
  checkSubscriptionAndRole,
} from '@/lib/middleware/auth-guard'

function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIp(request)

  if (pathname === '/landing-vp' || pathname.endsWith('/landing-vp')) {
    return NextResponse.redirect(new URL('/', request.url), 308)
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const hostname = request.headers.get('host') ?? ''
  const rootDomains = ['lodgra.io', 'homestay.pt', 'localhost:3000', 'vercel.app']
  const isRootDomain = rootDomains.some(d => hostname === d || hostname.endsWith('.vercel.app'))
  const subdomain = !isRootDomain ? hostname.split('.')[0] : null
  if (subdomain && subdomain !== 'www') {
    requestHeaders.set('x-org-slug', subdomain)
  }

  const csrfError = checkCsrf(request)
  if (csrfError) return csrfError

  const rateLimitError = await applyRateLimit(pathname, ip)
  if (rateLimitError) return rateLimitError

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublic = isPublicPath(pathname)

  if (!user && !isPublic) {
    return redirectToLogin(request, pathname)
  }

  const isPageRoute = !pathname.startsWith('/api/') && !pathname.includes('.')
  const hasLocale = hasLocalePrefix(pathname)

  if (isPageRoute && !hasLocale && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`

    const isRscNavigation =
      request.headers.get('RSC') === '1' ||
      request.nextUrl.searchParams.has('_rsc')

    return isRscNavigation
      ? NextResponse.rewrite(url)
      : NextResponse.redirect(url)
  }

  if (user && isPageRoute && !isPublic) {
    const resetRedirect = await checkPasswordReset(request, supabase, user.id)
    if (resetRedirect) return resetRedirect
  }

  const isSubscriptionExempt =
    isPublic ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/subscribe')

  if (user && isPageRoute && !isSubscriptionExempt) {
    const guardRedirect = await checkSubscriptionAndRole(request, supabase, user.id, pathname)
    if (guardRedirect) return guardRedirect
  }

  applySecurityHeaders(supabaseResponse, nonce)
  supabaseResponse.headers.set('x-nonce', nonce)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
