import { NextRequest, NextResponse } from 'next/server'

// Safety-net: if Supabase redirects to /{locale}/auth/callback (e.g. /pt-BR/auth/callback),
// forward to the real handler at /auth/callback preserving all query params.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const params = searchParams.toString()
  return NextResponse.redirect(`${origin}/auth/callback${params ? `?${params}` : ''}`)
}
