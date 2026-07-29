import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LoyaltyCalculator } from '@/lib/loyalty/loyalty-calculator'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/guests/[id]/loyalty-score
 *
 * Retrieves the loyalty score for a guest based on their booking history.
 * Uses admin client to bypass RLS restrictions.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing guest ID
 * @returns JSON with guest_id, loyalty_score, breakdown, and last_updated
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guestId = params.id

    // Validate guest ID
    if (!guestId || guestId.trim() === '') {
      return NextResponse.json(
        { error: 'guest_id inválido' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Fetch guest to ensure it exists
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, first_name, last_name, email')
      .eq('id', guestId)
      .single()

    if (guestError || !guest) {
      if (guestError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Convidado não encontrado' },
          { status: 404 }
        )
      }
      console.error('Erro ao buscar guest:', guestError)
      return NextResponse.json(
        { error: 'Erro ao buscar convidado' },
        { status: 500 }
      )
    }

    // Fetch guest's reservations (completed and cancelled)
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('id, status, check_in, check_out, cancelled_at, total_amount, created_at')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false })

    if (reservationsError) {
      console.error('Erro ao buscar reservations:', reservationsError)
      return NextResponse.json(
        { error: 'Erro ao buscar histórico de reservas' },
        { status: 500 }
      )
    }

    // Fetch referral count (guests referred by this guest)
    // Assuming referrals are tracked via a referral column or separate table
    // For now, we'll assume 0 referrals if not tracking separately
    const referralCount = 0

    // Transform reservations to Booking format
    const bookings = (reservations || []).map((res) => ({
      id: res.id,
      guest_id: guestId,
      status: (res.status as 'confirmed' | 'cancelled' | 'completed') || 'confirmed',
      check_in: res.check_in,
      check_out: res.check_out,
      cancelled_at: res.cancelled_at,
      total_amount: res.total_amount || 0,
      created_at: res.created_at,
    }))

    // Calculate loyalty score
    const result = LoyaltyCalculator.calculate({
      bookings,
      referral_count: referralCount,
    })

    // Validate score
    if (!LoyaltyCalculator.validateScore(result.loyalty_score)) {
      console.error('Invalid loyalty score calculated:', result.loyalty_score)
      return NextResponse.json(
        { error: 'Erro ao calcular pontuação de lealdade' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      guest_id: guestId,
      guest_name: `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Unknown',
      loyalty_score: result.loyalty_score,
      breakdown: result.breakdown,
      reasoning: result.reasoning,
      last_updated: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro em /api/guests/[id]/loyalty-score:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
