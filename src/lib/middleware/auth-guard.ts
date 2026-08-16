import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { getCachedProfile, setCachedProfile } from '@/lib/cache/profileCache'
import { getCachedSubscriptionStatus, setCachedSubscriptionStatus } from '@/lib/cache/subscriptionCache'
import { isRestrictedGestor } from '@/lib/auth/permissions'

const PUBLIC_PATHS = [
  '/login', '/register', '/subscribe', '/api/stripe/', '/api/debug/',
  '/api/ical/', '/api/auth/', '/auth/', '/opengraph-image', '/sitemap.xml',
  '/robots.txt', '/privacy', '/terms', '/politica-de-privacidade', '/p/',
  '/properties', '/api/properties', '/api/public/', '/monitoring',
  '/landing', '/landing-vp', '/booking',
  '/cleaner', // Portal próprio: usa cleaner_session e não depende de subscrição SaaS
  '/checkout',   // Stripe success/cancel pages — always public
  '/forgot-password', '/reset-password', '/onboarding',
  '/features', '/pricing', '/docs', '/blog',  // Public marketing pages
  '/sync', '/api/',
]

export function isPublicPath(pathname: string): boolean {
  // Normalize pathname by removing locale prefix if present
  // e.g. /pt/login -> /login, /pt-BR/register -> /register
  const normalizedPath = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?(\/|$)/, '/')
  return normalizedPath === '/' || PUBLIC_PATHS.some(p => normalizedPath.startsWith(p))
}

export function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  // Keep the user's locale when redirecting from a localized protected route.
  // The localized login page is the canonical auth entry point in production;
  // the unscoped `/login` path is not available on the deployed app.
  const localeMatch = pathname.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)(?:\/|$)/)
  const locale = localeMatch?.[1] ?? 'pt-BR'
  const loginUrl = new URL(`/${locale}/login`, request.url)
  loginUrl.searchParams.set('redirectTo', pathname)
  return NextResponse.redirect(loginUrl)
}

export async function checkPasswordReset(
  request: NextRequest,
  supabase: SupabaseClient,
  userId: string,
): Promise<NextResponse | null> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('password_reset_required, guest_type')
    .eq('id', userId)
    .single()

  // Cleaners authenticate through a short-lived access link in the dedicated
  // portal. A stale Supabase session must not force them into the SaaS password flow.
  if (profile?.guest_type === 'cleaner') return null

  if (profile?.password_reset_required) {
    return NextResponse.redirect(new URL('/auth/change-password', request.url))
  }
  return null
}

export async function checkSubscriptionAndRole(
  request: NextRequest,
  supabase: SupabaseClient,
  userId: string,
  pathname: string,
): Promise<NextResponse | null> {
  let orgId: string | null = (await getCachedProfile(userId))?.organization_id ?? null
  let userRole: string | null = null
  let guestType: string | null = null
  let accessAllProperties = false

  if (!orgId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, access_all_properties, organization_id, guest_type')
      .eq('id', userId)
      .single()

    if (profile?.organization_id) {
      orgId = profile.organization_id
      userRole = profile.role
      guestType = profile.guest_type
      accessAllProperties = profile.access_all_properties === true
      await setCachedProfile(userId, {
        role: profile.role,
        access_all_properties: profile.access_all_properties,
        organization_id: profile.organization_id,
        guest_type: profile.guest_type,
      })
    }
  } else {
    const cached = await getCachedProfile(userId)
    if (cached) {
      userRole = cached.role
      guestType = cached.guest_type ?? null
      accessAllProperties = cached.access_all_properties === true
    }
  }

  if (!orgId) return null

  // Cleaner accounts are internal collaborators, not SaaS subscribers. A normal
  // Supabase session can exist after account provisioning, but access to the cleaner
  // portal still requires its dedicated token/session flow.
  if (userRole === 'guest' && guestType === 'cleaner') {
    return NextResponse.redirect(new URL('/cleaner/request-link', request.url))
  }

  // Check onboarding (has at least one property)
  const { count: propertyCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  if (!propertyCount || propertyCount === 0) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Check subscription status
  let subStatus = await getCachedSubscriptionStatus(orgId)

  if (subStatus === null) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_status')
      .eq('id', orgId)
      .single()

    if (org?.subscription_status) {
      subStatus = org.subscription_status
      await setCachedSubscriptionStatus(orgId, org.subscription_status)
    }
  }

  if (subStatus === 'cancelled' || subStatus === 'past_due') {
    return NextResponse.redirect(new URL('/subscribe', request.url))
  }

  // Extract locale from pathname for redirects
  const localeMatch = pathname.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)/)
  const locale = localeMatch ? localeMatch[1] : 'pt'

  // REMOVED: Auto-redirect to first property
  // The /calendar route now shows a hub view with all properties
  // Users can click individual properties to see property-specific calendars

  // Role-based access control
  if (isRestrictedGestor({ role: userRole, access_all_properties: accessAllProperties })) {
    // Normalize pathname: remove locale prefix for comparison
    const normalizedPath = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, '')
    const blockedPaths = ['/dashboard', '/dashboard/reports', '/financial', '/reports', '/admin']
    if (blockedPaths.some(p => normalizedPath === p || normalizedPath.startsWith(p + '/'))) {
      return NextResponse.redirect(new URL(`/${locale}/calendar`, request.url))
    }
  }

  if (userRole === 'guest') {
    // Normalize pathname for comparison
    const normalizedPath = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, '')

    if (guestType === 'staff') {
      if (!normalizedPath.startsWith('/calendar')) {
        return NextResponse.redirect(new URL(`/${locale}/calendar`, request.url))
      }
    } else if (guestType === 'owner') {
      const allowedPaths = ['/reports', '/reservations', '/calendar', '/account']
      if (!allowedPaths.some(p => normalizedPath.startsWith(p))) {
        return NextResponse.redirect(new URL(`/${locale}/reports`, request.url))
      }
    }
  }

  return null
}
