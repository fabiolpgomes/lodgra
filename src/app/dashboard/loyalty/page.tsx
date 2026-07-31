import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Loyalty Dashboard - Lodgra',
  description: 'Guest loyalty analytics and metrics dashboard',
}

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

async function fetchLoyaltyStats(): Promise<LoyaltyStats | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dashboard/loyalty/stats`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      console.error('Failed to fetch loyalty stats:', response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching loyalty stats:', error)
    return null
  }
}

export default async function LoyaltyDashboard() {
  const stats = await fetchLoyaltyStats()

  if (!stats) {
    return (
      <div className="p-6 text-center text-gray-600">
        Unable to load loyalty dashboard data
      </div>
    )
  }

  const totalTierGuests =
    stats.tier_distribution.bronze +
    stats.tier_distribution.silver +
    stats.tier_distribution.gold +
    stats.tier_distribution.platinum

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Loyalty Analytics</h1>
          <p className="text-gray-600 mt-2">
            Guest loyalty metrics and business impact dashboard
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Guests Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Active Guests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.total_guests}
                </p>
              </div>
              <div className="text-3xl">👥</div>
            </div>
            <p className="text-sm text-gray-600">
              Avg Loyalty Score:{' '}
              <span className="font-semibold text-gray-900">{stats.avg_loyalty_score}/100</span>
            </p>
          </div>

          {/* Tier Distribution Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <p className="text-gray-600 text-sm font-medium">Tier Distribution</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Bronze:</span>
                <span className="font-semibold">
                  {stats.tier_distribution.bronze} ({totalTierGuests > 0 ? Math.round((stats.tier_distribution.bronze / totalTierGuests) * 100) : 0}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Silver:</span>
                <span className="font-semibold">
                  {stats.tier_distribution.silver} ({totalTierGuests > 0 ? Math.round((stats.tier_distribution.silver / totalTierGuests) * 100) : 0}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Gold:</span>
                <span className="font-semibold">
                  {stats.tier_distribution.gold} ({totalTierGuests > 0 ? Math.round((stats.tier_distribution.gold / totalTierGuests) * 100) : 0}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Platinum:</span>
                <span className="font-semibold">
                  {stats.tier_distribution.platinum} ({totalTierGuests > 0 ? Math.round((stats.tier_distribution.platinum / totalTierGuests) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* Total Discounts Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Discounts Given</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  €{stats.total_discounts_given.toFixed(2)}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
            <p className="text-xs text-gray-600">
              Cumulative discount amount
            </p>
          </div>

          {/* Revenue Impact Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-600 text-sm font-medium">Revenue Impact</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  €{stats.revenue_impact_estimated.toFixed(2)}
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
            <p className="text-xs text-gray-600">
              Estimated repeat value
            </p>
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top 10 Guests */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Top 10 Loyal Guests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Loyalty Score
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Bookings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.top_10_guests.map((guest, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {guest.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {guest.loyalty_score}/100
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          guest.tier === 'Platinum'
                            ? 'bg-purple-100 text-purple-800'
                            : guest.tier === 'Gold'
                              ? 'bg-yellow-100 text-yellow-800'
                              : guest.tier === 'Silver'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                          {guest.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {guest.bookings_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Churn Risk Guests */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Churn Risk (90+ days)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Loyalty Score
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Days Inactive
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.churn_risk_guests.length > 0 ? (
                    stats.churn_risk_guests.map((guest, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {guest.name}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {guest.loyalty_score}/100
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {guest.days_since_last_booking} days
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-600">
                        No guests at churn risk
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
