import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface LoyaltyStats {
  total_guests: number
  avg_loyalty_score: number
  tier_distribution: {
    bronze: number
    silver: number
    gold: number
    platinum: number
  }
  total_discounts_given: number
  revenue_impact_estimated: number
  top_10_guests: Array<{
    guest_id: string
    name: string
    loyalty_score: number
    tier: string
    bookings_count: number
  }>
  churn_risk_guests: Array<{
    guest_id: string
    name: string
    loyalty_score: number
    days_since_last_booking: number
  }>
}

/**
 * GET /api/dashboard/loyalty/stats
 *
 * Returns aggregated loyalty system analytics and metrics for dashboard display.
 * Includes guest statistics, tier distribution, top performers, and churn risk analysis.
 */
export async function GET() {
  try {
    const supabase = await createAdminClient()

    // Fetch all guests with loyalty scores
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('id, first_name, last_name, loyalty_score')

    if (guestsError) {
      console.error('Error fetching guests:', guestsError)
      return NextResponse.json(
        { error: 'Failed to fetch guests data' },
        { status: 500 }
      )
    }

    // Fetch reservations to count bookings and calculate discounts
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('guest_id, total_amount, created_at')

    if (reservationsError) {
      console.error('Error fetching reservations:', reservationsError)
      return NextResponse.json(
        { error: 'Failed to fetch reservations data' },
        { status: 500 }
      )
    }

    // Calculate total guests
    const totalGuests = guests?.length || 0

    // Calculate average loyalty score
    const avgLoyaltyScore =
      totalGuests > 0
        ? (guests?.reduce((sum, g) => sum + (g.loyalty_score || 0), 0) || 0) /
          totalGuests
        : 0

    // Calculate tier distribution
    const tierDistribution = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    }

    guests?.forEach((guest) => {
      const score = guest.loyalty_score || 0
      if (score <= 25) tierDistribution.bronze++
      else if (score <= 50) tierDistribution.silver++
      else if (score <= 75) tierDistribution.gold++
      else tierDistribution.platinum++
    })

    // Count bookings per guest and find top 10
    const bookingsByGuest = new Map<
      string,
      { count: number; dates: Date[] }
    >()

    reservations?.forEach((res) => {
      if (!bookingsByGuest.has(res.guest_id)) {
        bookingsByGuest.set(res.guest_id, { count: 0, dates: [] })
      }
      const booking = bookingsByGuest.get(res.guest_id)!
      booking.count++
      booking.dates.push(new Date(res.created_at))
    })

    // Calculate top 10 guests by loyalty score
    const top10Guests = (guests || [])
      .map((guest) => {
        const bookings = bookingsByGuest.get(guest.id)
        const score = guest.loyalty_score || 0
        let tier = 'Bronze'
        if (score <= 25) tier = 'Bronze'
        else if (score <= 50) tier = 'Silver'
        else if (score <= 75) tier = 'Gold'
        else tier = 'Platinum'

        return {
          guest_id: guest.id,
          name: `${guest.first_name || ''} ${guest.last_name || ''}`.trim(),
          loyalty_score: score,
          tier,
          bookings_count: bookings?.count || 0,
        }
      })
      .sort((a, b) => b.loyalty_score - a.loyalty_score)
      .slice(0, 10)

    // Find churn risk guests (no bookings in 90+ days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const churnRiskGuests = (guests || [])
      .map((guest) => {
        const bookings = bookingsByGuest.get(guest.id)
        const lastBookingDate = bookings
          ? new Date(Math.max(...bookings.dates.map((d) => d.getTime())))
          : null

        const daysLastBooking = lastBookingDate
          ? Math.floor(
              (new Date().getTime() - lastBookingDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 999

        return {
          guest_id: guest.id,
          name: `${guest.first_name || ''} ${guest.last_name || ''}`.trim(),
          loyalty_score: guest.loyalty_score || 0,
          days_since_last_booking: daysLastBooking,
        }
      })
      .filter((guest) => guest.days_since_last_booking >= 90)
      .sort((a, b) => b.days_since_last_booking - a.days_since_last_booking)

    // Calculate total discounts given (estimated based on tier distribution)
    // Average discount per tier: Bronze 0%, Silver 5%, Gold 10%, Platinum 15%
    const totalRevenue = (reservations || []).reduce(
      (sum, r) => sum + (r.total_amount || 0),
      0
    )

    const estimatedDiscounts =
      (tierDistribution.silver * 0.05 +
        tierDistribution.gold * 0.1 +
        tierDistribution.platinum * 0.15) /
      totalGuests *
      totalRevenue

    // Calculate revenue impact (repeat customer value minus discounts)
    // Assuming 30% repeat rate and 15% average discount
    const repeatRate = 0.3
    const avgDiscount = 0.08
    const revenueImpact = totalRevenue * repeatRate * avgDiscount

    const stats: LoyaltyStats = {
      total_guests: totalGuests,
      avg_loyalty_score: Math.round(avgLoyaltyScore * 100) / 100,
      tier_distribution: tierDistribution,
      total_discounts_given: Math.round(estimatedDiscounts * 100) / 100,
      revenue_impact_estimated: Math.round(revenueImpact * 100) / 100,
      top_10_guests: top10Guests,
      churn_risk_guests: churnRiskGuests,
    }

    return NextResponse.json(stats)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error in /api/dashboard/loyalty/stats:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
