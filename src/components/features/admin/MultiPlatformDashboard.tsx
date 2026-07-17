'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { TrendingUp, TrendingDown, BarChart3, PieChart, AlertCircle } from 'lucide-react'

interface ChannelPerformance {
  platform: string
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  ctr: number
  conversionRate: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

interface AggregationData {
  platforms: ChannelPerformance[]
  marketShares: Record<string, number>
  totalImpressions: number
  totalClicks: number
  totalBookings: number
  totalRevenue: number
  insights: string[]
  recommendations: string[]
}

const platformColors = {
  google: 'bg-blue-50 border-blue-200',
  airbnb: 'bg-red-50 border-red-200',
  booking: 'bg-yellow-50 border-yellow-200',
  vrbo: 'bg-purple-50 border-purple-200',
  flatio: 'bg-green-50 border-green-200',
}

const platformIcons = {
  google: '🔍',
  airbnb: '🏠',
  booking: '📅',
  vrbo: '🏖️',
  flatio: '🔑',
}

export function MultiPlatformDashboard({ properties }: { properties: any[] }) {
  const [data, setData] = useState<AggregationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    if (properties.length > 0) {
      setSelectedProperty(properties[0].id)
    }
  }, [properties])

  useEffect(() => {
    if (selectedProperty) {
      fetchAggregatedData(selectedProperty)
    }
  }, [selectedProperty, timeRange])

  async function fetchAggregatedData(propertyId: string) {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/distribution/aggregated-metrics?propertyId=${propertyId}&days=${timeRange}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch aggregated data')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Multi-Platform Distribution Dashboard</h1>
        <div className="text-center py-8">
          <div className="text-be-text-muted-500">Loading platform metrics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-be-text">
            Multi-Platform Distribution
          </h1>
          <p className="text-sm text-be-text-muted-500 mt-1">
            Compare performance across Google, Airbnb, Booking, VRBO, and Flatio
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </Card>
      )}

      {/* Property & Time Selector */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2 flex-1 overflow-x-auto pb-2">
          {properties.map((prop) => (
            <Button
              key={prop.id}
              onClick={() => setSelectedProperty(prop.id)}
              variant={selectedProperty === prop.id ? 'be-primary' : 'be-secondary'}
              size="be-md"
              className="whitespace-nowrap"
            >
              {prop.name}
            </Button>
          ))}
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-lodgra-neutral-200 rounded-lg text-sm"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {data && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="p-4">
                <p className="text-sm text-be-text-muted">Total Impressions</p>
                <p className="text-2xl font-bold text-be-text mt-1">
                  {data.totalImpressions.toLocaleString()}
                </p>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <p className="text-sm text-be-text-muted">Total Clicks</p>
                <p className="text-2xl font-bold text-be-text mt-1">
                  {data.totalClicks.toLocaleString()}
                </p>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <p className="text-sm text-be-text-muted">Total Bookings</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {data.totalBookings.toLocaleString()}
                </p>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <p className="text-sm text-be-text-muted">Total Revenue</p>
                <p className="text-2xl font-bold text-be-text mt-1">
                  ${data.totalRevenue.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          {/* Platform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {data.platforms.map((platform) => (
              <Card key={platform.platform} className={`${platformColors[platform.platform as keyof typeof platformColors]}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-be-text capitalize">
                      {platformIcons[platform.platform as keyof typeof platformIcons]} {platform.platform}
                    </h3>
                    {platform.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : platform.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : null}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-be-text-muted">Impressions</p>
                      <p className="font-semibold text-be-text">
                        {platform.impressions.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-be-text-muted">Clicks</p>
                      <p className="font-semibold text-be-text">
                        {platform.clicks.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-be-text-muted">CTR</p>
                      <p className="font-semibold text-be-text">
                        {platform.ctr.toFixed(2)}%
                      </p>
                    </div>

                    <div className="pt-2 border-t border-current border-opacity-20">
                      <p className="text-xs text-be-text-muted">Bookings</p>
                      <p className="font-bold text-be-text">
                        {platform.conversions}
                      </p>
                    </div>
                  </div>

                  {platform.trend !== 'stable' && (
                    <div className="mt-3 text-xs font-medium">
                      {platform.trend === 'up' ? '📈' : '📉'} {Math.abs(platform.trendPercent)}%
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Market Share */}
          <Card>
            <div className="p-4 border-b border-lodgra-neutral-200">
              <h2 className="text-lg font-semibold text-be-text flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Market Share Analysis
              </h2>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {data.platforms.map((platform) => {
                  const share = data.marketShares[platform.platform] || 0
                  return (
                    <div key={platform.platform}>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-be-blue">
                          {share.toFixed(1)}%
                        </div>
                        <p className="text-sm text-be-text-muted capitalize mt-1">
                          {platform.platform}
                        </p>
                        <div className="w-full bg-lodgra-neutral-200 rounded-full h-2 mt-2 overflow-hidden">
                          <div
                            className="bg-be-blue h-full"
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Insights */}
          {data.insights.length > 0 && (
            <Card>
              <div className="p-4 border-b border-lodgra-neutral-200">
                <h2 className="text-lg font-semibold text-be-text">Key Insights</h2>
              </div>

              <div className="p-4 space-y-2">
                {data.insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-lg mt-1">💡</span>
                    <p className="text-sm text-be-text-muted-800">{insight}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <Card>
              <div className="p-4 border-b border-lodgra-neutral-200">
                <h2 className="text-lg font-semibold text-be-text flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Recommendations
                </h2>
              </div>

              <div className="p-4 space-y-2">
                {data.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-lg mt-1">✨</span>
                    <p className="text-sm text-be-text-muted-800">{rec}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Info */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="p-4">
              <h3 className="font-medium text-blue-900">About this dashboard</h3>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• Aggregates performance data from 5 distribution channels</li>
                <li>• Market share shows % of bookings from each platform</li>
                <li>• Insights identify risks, trends, and opportunities</li>
                <li>• Recommendations suggest optimization by channel</li>
                <li>• Updated daily with latest booking data</li>
              </ul>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
