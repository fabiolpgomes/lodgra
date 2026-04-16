import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptToken } from '@/lib/email-parser/crypto'

export const dynamic = 'force-dynamic'

export async function DELETE() {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  const supabase = createAdminClient()

  // Obter token para revogar no Google
  const { data: connection } = await supabase
    .from('email_connections')
    .select('access_token')
    .eq('organization_id', auth.organizationId)
    .single()

  if (connection?.access_token) {
    try {
      const accessToken = decryptToken(connection.access_token)
      // Revogar token no Google (best-effort, não bloqueia se falhar)
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
      })
    } catch (err) {
      console.warn('Erro ao revogar token Google (continuando):', err)
    }
  }

  // Apagar registo da BD
  const { error } = await supabase
    .from('email_connections')
    .delete()
    .eq('organization_id', auth.organizationId)

  if (error) {
    console.error('Erro ao apagar email_connection:', error)
    return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
