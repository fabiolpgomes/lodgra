'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { AlertCircle, TrendingUp, Eye, MousePointerClick, BarChart3 } from 'lucide-react'

interface PerformanceMetric {
  id: string
  date: string
  impressions: number
  clicks: number
  conversions: number
  ctr?: number
  conversion_rate?: number
}

interface PerformanceSummary {
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  avgCtr: number
  avgConversionRate: number
  peakImpressions: number
  peakClicks: number
  peakConversions: number
}

export function GooglePerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchMetrics()
  }, [timeRange])

  async function fetchMetrics() {
    try {
      setLoading(true)
      setError(null)

      const days = parseInt(timeRange)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const response = await fetch(
        `/api/google/performance-metrics?startDate=${startDate}&endDate=${endDate}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const { data, summary: newSummary } = await response.json()

      setMetrics(data)
      setSummary(newSummary)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Error fetching metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  async function triggerManualSync() {
    try {
      setSyncing(true)
      const response = await fetch('/api/google/performance-metrics', { method: 'POST' })

      if (!response.ok) {
        throw new Error('Failed to trigger sync')
      }

      // Refetch metrics after sync
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await fetchMetrics()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to trigger sync'
      setError(message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-be-text">
            Google Vacation Rentals Performance
          </h1>
          <p className="text-sm text-be-text-muted-500 mt-1">
            Track impressions, clicks, and conversion metrics from Google
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-lodgra-neutral-200 rounded-lg text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>

          <Button
            onClick={triggerManualSync}
            disabled={syncing}
            variant="be-secondary"
            size="be-md"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Impressions Card */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-be-text-muted">Impressions</p>
                  <p className="text-2xl font-bold text-be-text mt-1">
                    {summary.totalImpressions.toLocaleString()}
                  </p>
                  <p className="text-xs text-be-text-muted-500 mt-1">
                    Peak: {summary.peakImpressions.toLocaleString()} per day
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Eye className="w-6 h-6 text-be-blue" />
                </div>
              </div>
            </div>
          </Card>

          {/* Clicks Card */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-be-text-muted">Clicks</p>
                  <p className="text-2xl font-bold text-be-text mt-1">
                    {summary.totalClicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-be-text-muted-500 mt-1">
                    Peak: {summary.peakClicks.toLocaleString()} per day
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <MousePointerClick className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </Card>

          {/* CTR Card */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-be-text-muted">
                    Avg. Click-Through Rate
                  </p>
                  <p className="text-2xl font-bold text-be-text mt-1">
                    {summary.avgCtr.toFixed(2)}%
                  </p>
                  <p className="text-xs text-be-text-muted-500 mt-1">Goal: 2-5%</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </Card>

          {/* Conversions Card */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-be-text-muted">Conversions</p>
                  <p className="text-2xl font-bold text-be-text mt-1">
                    {summary.totalConversions.toLocaleString()}
                  </p>
                  <p className="text-xs text-be-text-muted-500 mt-1">
                    Conv. Rate: {summary.avgConversionRate.toFixed(2)}%
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <div className="p-4 border-b border-lodgra-neutral-200">
          <h2 className="text-lg font-semibold text-be-text">Daily Metrics</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="text-be-text-muted-500">Loading metrics...</div>
          </div>
        ) : metrics.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-be-text-muted-500">
              No metrics available yet. Google updates metrics approximately 24 hours after
              occurrence.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-lodgra-neutral-50 border-b border-lodgra-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-be-text-muted-700">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-be-text-muted-700">
                    Impressions
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-be-text-muted-700">
                    Clicks
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-be-text-muted-700">
                    CTR
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-be-text-muted-700">
                    Conversions
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, idx) => (
                  <tr
                    key={metric.id}
                    className={
                      idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-lodgra-neutral-50'
                    }
                  >
                    <td className="px-4 py-3 text-sm text-be-text">
                      {new Date(metric.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-be-text">
                      {metric.impressions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-be-text">
                      {metric.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-be-text">
                      {metric.ctr ? metric.ctr.toFixed(2) : '-'}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                      {metric.conversions.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          <h3 className="font-medium text-blue-900">About these metrics</h3>
          <ul className="text-sm text-blue-800 mt-2 space-y-1">
            <li>• Data is updated daily from Google Merchant Center (approximately 24 hours delay)</li>
            <li>• Impressions = times your property appeared in search results</li>
            <li>• Clicks = times users clicked on your property</li>
            <li>• CTR (Click-Through Rate) = clicks ÷ impressions × 100</li>
            <li>• Conversions = completed bookings from Google clicks</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
