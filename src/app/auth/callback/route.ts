import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeBR } from '@/lib/stripe/client-br'
import { NextResponse } from 'next/server'
import { UserRole } from '@/lib/auth/role-types'
import { createUserProfile } from '@/lib/auth/create-user-profile'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')

  // For OAuth: read next from cookie (set by SocialLoginButtons)
  let next = '/onboarding' // Default to onboarding for new users
  const cookieHeader = request.headers.get('cookie') || ''
  const authRedirectMatch = cookieHeader.match(/auth_redirect_next=([^;]+)/)
  if (authRedirectMatch) {
    next = decodeURIComponent(authRedirectMatch[1])
  }

  // Check if 'next' was explicitly provided in URL params
  const nextParam = searchParams.get('next')
  if (nextParam) {
    next = nextParam
  }

  const supabase = await createClient()

  // ── Email OTP path (invite, magic link, recovery via token_hash) ──────────
  // Supabase sends token_hash + type when email OTP verification is enabled.
  // For invite/recovery: delegate verifyOtp to the client page so the session
  // is established directly in the browser (server-side cookies are not
  // forwarded through NextResponse.redirect, causing session loss).
  if (token_hash && type) {
    if (type === 'invite') {
      return NextResponse.redirect(
        `${origin}/auth/reset-password-confirm?token_hash=${token_hash}&type=invite&from=invite`
      )
    }
    if (type === 'recovery') {
      return NextResponse.redirect(
        `${origin}/auth/reset-password-confirm?token_hash=${token_hash}&type=recovery`
      )
    }
    // For other OTP types (signup, magiclink, email_change) verify server-side
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'signup' | 'magiclink' | 'email_change',
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error(`[auth/callback] verifyOtp failed for type=${type}:`, error.message)
    return NextResponse.redirect(`${origin}/login?error=otp_error`)
  }

  // ── PKCE code path ────────────────────────────────────────────────────────
  if (code) {
    // Recovery: pass code to the client-side page (it calls exchangeCodeForSession)
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/reset-password-confirm?code=${code}`)
    }

    // Invite: exchange server-side then go straight to password creation
    if (type === 'invite') {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}/auth/reset-password-confirm?from=invite`)
      }
      console.error('[auth/callback] exchangeCodeForSession failed for invite:', error.message)
      return NextResponse.redirect(`${origin}/login?error=invite_error`)
    }

    // OAuth / generic code: exchange and create profile if missing
    console.log('[auth/callback] Exchanging code for session:', code?.substring(0, 20) + '...')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[auth/callback] exchangeCodeForSession result:', { error: error?.message })
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          try {
            const baseSlug    = (user.email || 'user').split('@')[0].toLowerCase().slice(0, 20)
            const uniqueSuffix = user.id.slice(0, 8)
            const orgSlug     = `${baseSlug}-${uniqueSuffix}`

            const adminClient = createAdminClient()

            const { data: newOrg } = await adminClient
              .from('organizations')
              .insert({
                name: user.user_metadata?.full_name || user.email || 'New Organization',
                slug: orgSlug,
                subscription_status: 'trial',
                plan: 'essencial',
              })
              .select('id')
              .single()

            if (newOrg) {
              if (!user.email) {
                console.error(`[auth/callback] User ${user.id} has no email, cannot create profile for org ${newOrg.id}`)
                return NextResponse.redirect(`${origin}/login?error=no_email`)
              }

              const isOAuthUser =
                user.app_metadata?.providers?.includes('google') ||
                user.identities?.some((id: { provider: string }) => id.provider === 'google')

              try {
                await createUserProfile({
                  userId: user.id,
                  email: user.email,
                  fullName: user.user_metadata?.full_name || '',
                  role: UserRole.ADMIN,
                  accessAllProperties: true,
                  organizationId: newOrg.id,
                  passwordResetRequired: !isOAuthUser,
                  passwordChangedAt: isOAuthUser ? new Date().toISOString() : null,
                })
              } catch (profileErr) {
                console.error(`[auth/callback] Failed to create profile for org ${newOrg.id}:`, profileErr)
                return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`)
              }

              try {
                const customer = await stripeBR.customers.create({
                  email: user.email || undefined,
                  name: user.user_metadata?.full_name || user.email || undefined,
                  metadata: {
                    organization_id: newOrg.id,
                  },
                })

                await adminClient
                  .from('organizations')
                  .update({ stripe_br_customer_id: customer.id })
                  .eq('id', newOrg.id)

                console.log('[auth/callback] Stripe customer created:', customer.id)
              } catch (stripeErr) {
                console.error('[auth/callback] Failed to create Stripe customer:', stripeErr)
              }
            }
          } catch (err) {
            console.error('[auth/callback] failed to create profile:', err)
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_error`)
}
