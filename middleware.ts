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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIp(request)

  // Per-request nonce for CSP inline scripts (JSON-LD, Google Analytics)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // Tenant subdomain detection (e.g. "pousada" from "pousada.lodgra.io")
  const hostname = request.headers.get('host') ?? ''
  const rootDomains = ['lodgra.io', 'homestay.pt', 'localhost:3000', 'vercel.app']
  const isRootDomain = rootDomains.some(d => hostname === d || hostname.endsWith('.vercel.app'))
  const subdomain = !isRootDomain ? hostname.split('.')[0] : null
  if (subdomain && subdomain !== 'www') {
    requestHeaders.set('x-org-slug', subdomain)
  }

  // 1. CSRF protection
  const csrfError = checkCsrf(request)
  if (csrfError) return csrfError

  // 2. Rate limiting
  const rateLimitError = await applyRateLimit(pathname, ip)
  if (rateLimitError) return rateLimitError

  // 3. Supabase session refresh (required to keep auth cookies fresh)
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

  // Redirect to login for unauthenticated requests to private routes
  if (!user && !isPublic) {
    return redirectToLogin(request, pathname)
  }

  const isPageRoute = !pathname.startsWith('/api/') && !pathname.includes('.')
  const hasLocale = hasLocalePrefix(pathname)

  // Add locale prefix for page routes that don't already have one.
  // RSC navigation (Next.js App Router) fetches with redirect:manual — HTTP
  // redirects become opaque (status 0). Use rewrite instead so the correct
  // locale page is served transparently without a client-side redirect.
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

  // 4. Check password reset requirement
  if (user && isPageRoute && !isPublic) {
    const resetRedirect = await checkPasswordReset(request, supabase, user.id)
    if (resetRedirect) return resetRedirect
  }

  // 5. Subscription and role-based access
  const isSubscriptionExempt =
    isPublic ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/subscribe')

  if (user && isPageRoute && !isSubscriptionExempt) {
    const guardRedirect = await checkSubscriptionAndRole(request, supabase, user.id, pathname)
    if (guardRedirect) return guardRedirect
  }

  // 6. Apply security headers (CSP with nonce) and expose nonce to server components
  applySecurityHeaders(supabaseResponse, nonce)
  supabaseResponse.headers.set('x-nonce', nonce)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
