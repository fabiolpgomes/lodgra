/**
 * Story 37.5: Auto-apply Loyalty Discount
 * GET /api/guests/[id]/loyalty-discount
 *
 * Determines if a guest is eligible for loyalty discount and returns the percentage.
 * Used during booking creation to auto-apply loyalty discount.
 *
 * Loyalty Score Tiers:
 * - 0-19: No discount (new guest)
 * - 20-49: 5% discount (occasional guest)
 * - 50-79: 10% discount (loyal guest)
 * - 80-100: 15% discount (VIP guest)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LoyaltyCalculator } from '@/lib/loyalty/loyalty-calculator'

interface LoyaltyDiscountResponse {
  guest_id: string
  guest_name: string
  loyalty_score: number
  loyalty_tier: 'new' | 'occasional' | 'loyal' | 'vip'
  discount_percent: number
  is_eligible: boolean
  reasoning: string
}

/**
 * Determine loyalty discount tier based on score
 */
function calculateDiscountTier(score: number): {
  tier: 'new' | 'occasional' | 'loyal' | 'vip'
  discount: number
} {
  if (score >= 80) {
    return { tier: 'vip', discount: 15 }
  }
  if (score >= 50) {
    return { tier: 'loyal', discount: 10 }
  }
  if (score >= 20) {
    return { tier: 'occasional', discount: 5 }
  }
  return { tier: 'new', discount: 0 }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<LoyaltyDiscountResponse | { error: string }>> {
  try {
    const { id: guestId } = await params

    if (!guestId || guestId.trim() === '') {
      return NextResponse.json(
        { error: 'guest_id inválido' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Fetch guest
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, first_name, last_name')
      .eq('id', guestId)
      .single()

    if (guestError || !guest) {
      return NextResponse.json(
        { error: 'Convidado não encontrado' },
        { status: 404 }
      )
    }

    // Fetch guest's reservation history
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('id, status, check_in, check_out, total_amount, created_at')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false })

    if (reservationsError) {
      console.error('Erro ao buscar histórico:', reservationsError)
      return NextResponse.json(
        { error: 'Erro ao buscar histórico de reservas' },
        { status: 500 }
      )
    }

    // Transform to Booking format
    const bookings = (reservations || []).map((res) => ({
      id: res.id,
      guest_id: guestId,
      status: (res.status as 'confirmed' | 'cancelled' | 'completed') || 'confirmed',
      check_in: res.check_in,
      check_out: res.check_out,
      cancelled_at: null,
      total_amount: res.total_amount || 0,
      created_at: res.created_at,
    }))

    // Calculate loyalty score
    const result = LoyaltyCalculator.calculate({
      bookings,
      referral_count: 0,
    })

    // Determine discount tier
    const { tier, discount } = calculateDiscountTier(result.loyalty_score)

    // Generate reasoning
    const reasoning =
      discount > 0
        ? `Guest é ${tier} (score ${result.loyalty_score}). ${bookings.length} stays anteriormente. Desconto automático ${discount}% aplicado.`
        : `Guest é novo ou inativo (score ${result.loyalty_score}). Sem desconto de lealdade.`

    return NextResponse.json({
      guest_id: guestId,
      guest_name: `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Unknown',
      loyalty_score: result.loyalty_score,
      loyalty_tier: tier,
      discount_percent: discount,
      is_eligible: discount > 0,
      reasoning,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro em /api/guests/[id]/loyalty-discount:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
