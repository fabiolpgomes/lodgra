'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartDataPoint {
  date: string
  commission: number
  count: number
}

type TimeRange = 'daily' | 'weekly' | 'monthly'

interface CommissionChartProps {
  days?: number
}

export function CommissionChart({ days = 30 }: CommissionChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('daily')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all history for aggregation
        const response = await fetch(`/api/commissions/history?limit=1000`)

        if (!response.ok) {
          throw new Error('Failed to fetch commission history')
        }

        const result = await response.json()
        const commissions = result.data || []

        // Aggregate by date based on timeRange
        const aggregated = aggregateByTimeRange(commissions, timeRange, days)
        setData(aggregated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [timeRange, days])

  const aggregateByTimeRange = (
    commissions: Array<{
      calculatedAt: string
      commissionAmount: number
    }>,
    range: TimeRange,
    daysBack: number
  ): ChartDataPoint[] => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    const grouped: Record<string, { total: number; count: number }> = {}

    commissions.forEach((item) => {
      const date = new Date(item.calculatedAt)
      if (date < cutoffDate) return

      let key: string
      if (range === 'daily') {
        key = date.toISOString().split('T')[0] // YYYY-MM-DD
      } else if (range === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = `Week of ${weekStart.toISOString().split('T')[0]}`
      } else {
        // monthly
        key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0 }
      }
      grouped[key].total += item.commissionAmount
      grouped[key].count += 1
    })

    return Object.entries(grouped)
      .map(([date, { total, count }]) => ({
        date,
        commission: parseFloat(total.toFixed(2)),
        count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-80 w-full" />
      </Card>
    )
  }

  if (error || data.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-600 text-center py-8">
          {error ? `Error: ${error}` : 'No commission data available for the selected period'}
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Commission Trend</h3>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px',
            }}
            formatter={(value) => [
              typeof value === 'number' ? `€${value.toFixed(2)}` : value,
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="commission"
            stroke="#2563eb"
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
            strokeWidth={2}
            name="Commission Amount"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Showing {data.length} {timeRange} periods
      </div>
    </Card>
  )
}
