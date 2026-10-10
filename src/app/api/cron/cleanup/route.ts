import { NextRequest, NextResponse } from 'next/server'
import { addMonthsToDateOnly } from '@/lib/dates/date-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pendingPaymentStaleCutoff } from '@/lib/bookings/availability-conflict.server'

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
    const cutoffDate = addMonthsToDateOnly(new Date().toISOString().slice(0, 10), -24)

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

    // Tentativas de reserva direta abandonadas: mesmo prazo a partir do qual as datas já
    // voltam a ficar livres (disponibilidade). Só as SEM cobrança Pix: uma reserva com Pix
    // (asaas_payment_id) é cancelada pelo webhook do Asaas (PAYMENT_OVERDUE/DELETED), e cancelá-la
    // aqui faria um Pix pago mais tarde cair em "DEVOLVER PIX" em vez de ser confirmado.
    const staleCutoff = pendingPaymentStaleCutoff()

    const { data: expiredPendingPayment, error: expiredError } = await adminClient
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('status', 'pending_payment')
      .eq('booking_source', 'direct')
      .is('asaas_payment_id', null)
      .lt('created_at', staleCutoff)
      .select('id')

    if (expiredError) {
      console.error('Erro ao cancelar reservas expiradas (pending_payment):', expiredError)
    }

    const { data: expiredPending, error: expiredPendingError } = await adminClient
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .eq('booking_source', 'direct')
      .is('asaas_payment_id', null)
      .lt('created_at', staleCutoff)
      .select('id')

    if (expiredPendingError) {
      console.error('Erro ao cancelar reservas expiradas (pending):', expiredPendingError)
    }

    const cancelledPendingCount = (expiredPendingPayment?.length ?? 0) + (expiredPending?.length ?? 0)
    if (cancelledPendingCount > 0) {
      console.log(`Reservas direct expiradas canceladas (>35 min): ${cancelledPendingCount}`)
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

    // email_unsubscribes NÃO tem retenção: apagar um descadastro permitiria voltar a enviar
    // emails a quem pediu para não os receber (RGPD / CAN-SPAM). Fica para sempre.

    const oldEmailSentCount = oldEmailSent?.length ?? 0

    console.log(`Reservas canceladas antigas (>2 anos): ${oldCancelledCount}`)
    if (oldEmailSentCount > 0) {
      console.log(`Retenção de email limpa (>90 dias): email_sent=${oldEmailSentCount}`)
    }

    return NextResponse.json({
      ...result,
      retentionCutoff,
      oldEmailSentDeleted: oldEmailSentCount,
    })

  } catch (error: unknown) {
    console.error('Erro no cron job de limpeza:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro no cron job' },
      { status: 500 }
    )
  }
}
