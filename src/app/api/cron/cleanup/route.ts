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
    const adminClient = createAdminClient()
    
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

    const { data: expiredPendingPayment, error: expiredError } = await adminClient
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('status', 'pending_payment')
      .eq('booking_source', 'direct')
      .lt('created_at', thirtyMinAgo)
      .select('id')

    if (expiredError) {
      console.error('Erro ao cancelar reservas expiradas (pending_payment):', expiredError)
    }

    // Cancel expired pending (direct) reservations (>30 min) — orphaned booking attempts
    const { data: expiredPending, error: expiredPendingError } = await adminClient
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .eq('booking_source', 'direct')
      .lt('created_at', thirtyMinAgo)
      .select('id')

    if (expiredPendingError) {
      console.error('Erro ao cancelar reservas expiradas (pending):', expiredPendingError)
    }

    const cancelledPendingCount = (expiredPendingPayment?.length ?? 0) + (expiredPending?.length ?? 0)
    if (cancelledPendingCount > 0) {
      console.log(`Reservas direct expiradas canceladas (>30 min): ${cancelledPendingCount}`)
    }

    const result = {
      success: true,
      cutoffDate,
      oldCancelledReservations: oldCancelledCount || 0,
      expiredDirectCancelled: cancelledPendingCount,
      action: 'counted-and-cleaned',
      timestamp: new Date().toISOString(),
    }

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const retentionCutoff = ninetyDaysAgo.toISOString()

    const { data: oldEmailSent, error: oldEmailSentError } = await adminClient
      .from('email_sent')
      .delete()
      .lt('sent_at', retentionCutoff)
      .select('id')

    if (oldEmailSentError) {
      console.error('Erro ao limpar email_sent antigos:', oldEmailSentError)
    }

    const { data: oldUnsubscribes, error: oldUnsubscribesError } = await adminClient
      .from('email_unsubscribes')
      .delete()
      .lt('unsubscribed_at', retentionCutoff)
      .select('id')

    if (oldUnsubscribesError) {
      console.error('Erro ao limpar email_unsubscribes antigos:', oldUnsubscribesError)
    }

    const oldEmailSentCount = oldEmailSent?.length ?? 0
    const oldUnsubscribesCount = oldUnsubscribes?.length ?? 0

    console.log(`Reservas canceladas antigas (>2 anos): ${oldCancelledCount}`)
    if (oldEmailSentCount > 0 || oldUnsubscribesCount > 0) {
      console.log(
        `Retenção de email limpa (>90 dias): email_sent=${oldEmailSentCount}, email_unsubscribes=${oldUnsubscribesCount}`,
      )
    }

    return NextResponse.json({
      ...result,
      retentionCutoff,
      oldEmailSentDeleted: oldEmailSentCount,
      oldUnsubscribesDeleted: oldUnsubscribesCount,
    })

  } catch (error: unknown) {
    console.error('Erro no cron job de limpeza:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro no cron job' },
      { status: 500 }
    )
  }
}
