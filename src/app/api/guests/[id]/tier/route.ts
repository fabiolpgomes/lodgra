import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TierCalculator } from '@/lib/loyalty/tier-system'
import { LoyaltyCalculator } from '@/lib/loyalty/loyalty-calculator'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/guests/[id]/tier
 *
 * Retrieves the tier information for a guest based on their loyalty score.
 * Calculates tier, discount, and progression to next tier.
 * Uses admin client to bypass RLS restrictions.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing guest ID
 * @returns JSON with guest_id, current_tier, loyalty_score, base_discount, next_tier info
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
      .select('id, first_name, last_name, email, loyalty_score')
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

    // Get or calculate loyalty score
    let loyaltyScore = guest.loyalty_score || 0

    // If no stored loyalty score, calculate from booking history
    if (loyaltyScore === 0 || loyaltyScore === null) {
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('id, status, check_in, check_out, cancelled_at, total_amount, created_at')
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false })

      if (reservationsError) {
        console.error('Erro ao buscar reservations:', reservationsError)
        // Continue with score 0 if we can't fetch reservations
      } else {
        // Calculate loyalty score
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

        const result = LoyaltyCalculator.calculate({
          bookings,
          referral_count: 0,
        })

        loyaltyScore = result.loyalty_score
      }
    }

    // Calculate tier
    const tier = TierCalculator.calculateTier(loyaltyScore)
    const nextTierInfo = TierCalculator.getNextTierInfo(loyaltyScore)

    return NextResponse.json({
      guest_id: guestId,
      guest_name: `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Unknown',
      current_tier: tier.tier_name,
      loyalty_score: loyaltyScore,
      base_discount_percent: tier.base_discount_percent,
      points_min: tier.points_min,
      points_max: tier.points_max,
      perks: tier.perks,
      next_tier: nextTierInfo.next_tier,
      points_to_next: nextTierInfo.points_needed,
      discount_gain_at_next: nextTierInfo.discount_gain,
      last_updated: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro em /api/guests/[id]/tier:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
