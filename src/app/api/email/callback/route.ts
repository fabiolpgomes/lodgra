import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptToken } from '@/lib/email-parser/crypto'

export const dynamic = 'force-dynamic'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/settings?email_error=access_denied`)
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/settings?email_error=config_missing`)
  }

  try {
    const redirectUri = `${NEXT_PUBLIC_APP_URL}/api/email/callback`

    // Trocar code por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokenRes.ok || !tokens.access_token) {
      console.error('Erro ao trocar code por tokens:', tokens)
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/settings?email_error=token_exchange`)
    }

    // Obter email da conta Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoRes.json()
    const email = userInfo.email as string

    if (!email) {
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/settings?email_error=no_email`)
    }

    // Calcular expiração do token
    const tokenExpiry = new Date(Date.now() + (tokens.expires_in as number) * 1000)

    // Encriptar tokens antes de guardar
    const encryptedAccess = encryptToken(tokens.access_token as string)
    const encryptedRefresh = encryptToken((tokens.refresh_token as string) || '')

    // Guardar em Supabase (upsert — substitui ligação existente)
    const supabase = createAdminClient()
    const { error: dbError } = await supabase
      .from('email_connections')
      .upsert({
        organization_id: auth.organizationId,
        email,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expiry: tokenExpiry.toISOString(),
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        connected_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' })

    if (dbError) {
      console.error('Erro ao guardar token Gmail:', dbError)
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/settings?email_error=db_error`)
    }

    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/settings?email_connected=true`)
  } catch (err) {
    console.error('Erro no OAuth callback:', err)
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/settings?email_error=unexpected`)
  }
}
