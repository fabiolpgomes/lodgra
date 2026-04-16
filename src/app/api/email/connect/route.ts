import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

export async function GET() {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: 'Google OAuth não configurado' }, { status: 500 })
  }

  const redirectUri = `${NEXT_PUBLIC_APP_URL}/api/email/callback`

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
