import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { locales, defaultLocale } from '../i18n.config'
import { applySecurityHeaders } from '@/lib/middleware/security-headers'
import { checkCsrf } from '@/lib/middleware/csrf'
import { getClientIp, applyRateLimit } from '@/lib/middleware/rate-limit'
import {
  isPublicPath,
  redirectToLogin,
  checkPasswordReset,
  checkSubscriptionAndRole,
} from '@/lib/middleware/auth-guard'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIp(request)

  // Generate per-request nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // 1. CSRF protection
  const csrfError = checkCsrf(request)
  if (csrfError) return csrfError

  // 2. Rate limiting
  const rateLimitError = await applyRateLimit(pathname, ip)
  if (rateLimitError) return rateLimitError

  // 3. Supabase session refresh
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
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = isPublicPath(pathname)

  // Redirect to login if not authenticated on private routes
  if (!user && !isPublic) {
    return redirectToLogin(request, pathname)
  }

  const isPageRoute = !pathname.startsWith('/api/') && !pathname.includes('.')

  // 3.5. Ensure localized path for private routes
  const hasLocale = locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`)
  
  if (user && isPageRoute && !isPublic && !hasLocale) {
    const url = new URL(`/${defaultLocale}${pathname}${request.nextUrl.search}`, request.url)
    return NextResponse.redirect(url)
  }

  // 4. Check password reset requirement
  if (user && isPageRoute && !isPublic) {
    const resetRedirect = await checkPasswordReset(request, supabase, user.id)
    if (resetRedirect) return resetRedirect
  }

  // 5. Subscription, onboarding, and role-based access
  const isSubscriptionExempt =
    isPublic ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/subscribe')

  if (user && isPageRoute && !isSubscriptionExempt) {
    const guardRedirect = await checkSubscriptionAndRole(request, supabase, user.id, pathname)
    if (guardRedirect) return guardRedirect
  }

  // 6. Apply security headers and expose nonce
  applySecurityHeaders(supabaseResponse, nonce)
  supabaseResponse.headers.set('x-nonce', nonce)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
