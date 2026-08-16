import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptToken } from '@/lib/email-parser/crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  try {
    const supabase = await createAdminClient()

    const { data: connection, error } = await supabase
      .from('email_connections')
      .select('email, token_expiry, last_sync_at, connected_at, refresh_token')
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
    const hasUsableRefreshToken = (() => {
      if (!connection.refresh_token) return false
      try {
        return Boolean(decryptToken(connection.refresh_token).trim())
      } catch {
        return false
      }
    })()

    const isExpired = hoursUntilExpiry < 0
    const isExpiringSoon = !hasUsableRefreshToken && hoursUntilExpiry < 24 && hoursUntilExpiry > 0
    const status = hasUsableRefreshToken ? 'connected' : isExpired ? 'expired' : isExpiringSoon ? 'expiring_soon' : 'connected'

    return NextResponse.json({
      status,
      email: connection.email,
      tokenExpiry: connection.token_expiry,
      hoursUntilExpiry: Math.round(hoursUntilExpiry * 10) / 10,
      lastSync: connection.last_sync_at,
      connectedAt: connection.connected_at,
      needsReconnection: !hasUsableRefreshToken && isExpired,
      autoRefreshEnabled: hasUsableRefreshToken,
      warning: isExpiringSoon ? `Token expira em ${Math.round(hoursUntilExpiry)}h` : null,
    })
  } catch (err) {
    console.error('[email-status] Erro:', err)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}
