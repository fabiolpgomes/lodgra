import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth/getUserAccess'

export const dynamic = 'force-dynamic'

// GET /api/auth/me — perfil do utilizador autenticado, lido no servidor (cookies da sessão).
// Usado como reserva pelo menu quando o cliente do browser não consegue ler a sessão.
export async function GET() {
  try {
    const supabase = await createClient()
    const access = await getUserAccess(supabase)
    if (!access) return NextResponse.json({ profile: null }, { status: 401 })
    return NextResponse.json({ profile: access.profile })
  } catch (err) {
    console.error('[auth/me]', err instanceof Error ? err.message : err)
    return NextResponse.json({ profile: null }, { status: 500 })
  }
}
