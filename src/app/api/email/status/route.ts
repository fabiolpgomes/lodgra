import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  try {
    const supabase = await createAdminClient()

    const { data: connection, error } = await supabase
      .from('email_connections')
      .select('email, token_expiry, last_sync_at, connected_at')
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !connection) {
      return NextResponse.json({
        status: 'disconnected',
        message: 'Nenhuma conexão Gmail configurada',
      })
    }

    const now = new Date()
    const expiry = new Date(connection.token_expiry)
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
    const isExpired = hoursUntilExpiry < 0
    const isExpiringSoon = hoursUntilExpiry < 24 && hoursUntilExpiry > 0

    return NextResponse.json({
      status: isExpired ? 'expired' : isExpiringSoon ? 'expiring_soon' : 'connected',
      email: connection.email,
      tokenExpiry: connection.token_expiry,
      hoursUntilExpiry: Math.round(hoursUntilExpiry * 10) / 10,
      lastSync: connection.last_sync_at,
      connectedAt: connection.connected_at,
      needsReconnection: isExpired,
      warning: isExpiringSoon ? `Token expira em ${Math.round(hoursUntilExpiry)}h` : null,
    })
  } catch (err) {
    console.error('[email-status] Erro:', err)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}
