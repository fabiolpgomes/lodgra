import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Data limite: 2 anos atrás
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const cutoffDate = twoYearsAgo.toISOString().split('T')[0]

    // Contar reservas antigas canceladas
    const { count: oldCancelledCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .lt('check_out', cutoffDate)

    // Opcional: Deletar ou arquivar
    // const { error: deleteError } = await supabase
    //   .from('reservations')
    //   .delete()
    //   .eq('status', 'cancelled')
    //   .lt('check_out', cutoffDate)

    // Cancel expired pending_payment reservations (>30 min without payment)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const adminClient = createAdminClient()

    const { data: expiredPending, error: expiredError } = await adminClient
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('status', 'pending_payment')
      .eq('booking_source', 'direct')
      .lt('created_at', thirtyMinAgo)
      .select('id')

    if (expiredError) {
      console.error('Erro ao cancelar reservas expiradas:', expiredError)
    }

    const cancelledPendingCount = expiredPending?.length ?? 0
    if (cancelledPendingCount > 0) {
      console.log(`Reservas pending_payment canceladas (>30 min): ${cancelledPendingCount}`)
    }

    const result = {
      success: true,
      cutoffDate,
      oldCancelledReservations: oldCancelledCount || 0,
      expiredPendingPaymentCancelled: cancelledPendingCount,
      action: 'counted',
      timestamp: new Date().toISOString(),
    }

    console.log(`Reservas canceladas antigas (>2 anos): ${oldCancelledCount}`)

    return NextResponse.json(result)

  } catch (error: unknown) {
    console.error('Erro no cron job de limpeza:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro no cron job' },
      { status: 500 }
    )
  }
}
