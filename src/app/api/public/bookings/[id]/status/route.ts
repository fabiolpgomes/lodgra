import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { isPendingPaymentStale } from '@/lib/bookings/availability-conflict.server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NO_STORE = { 'Cache-Control': 'private, no-store' } as const

/**
 * GET /api/public/bookings/:id/status — estado do pagamento de uma reserva direta.
 * Público: o id (UUID aleatório) é o segredo que o hóspede recebeu ao reservar. Só devolve o estado.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Não encontrada' }, { status: 404, headers: NO_STORE })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  // O ecrã do Pix consulta a cada poucos segundos durante ~30 min.
  if (!checkRateLimit('public:booking-status', ip, 600, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados pedidos' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } })
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('reservations')
    .select('status, created_at, booking_source')
    .eq('id', id)
    .maybeSingle()

  if (!data || data.booking_source !== 'direct') {
    return NextResponse.json({ error: 'Não encontrada' }, { status: 404, headers: NO_STORE })
  }

  let state: 'confirmed' | 'pending' | 'expired' | 'cancelled'
  if (data.status === 'confirmed') state = 'confirmed'
  else if (data.status === 'pending_payment') state = isPendingPaymentStale(data.created_at) ? 'expired' : 'pending'
  else state = 'cancelled'

  return NextResponse.json({ status: state }, { headers: NO_STORE })
}
