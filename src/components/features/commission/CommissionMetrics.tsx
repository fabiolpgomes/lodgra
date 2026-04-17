'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Skeleton } from '@/components/common/ui/skeleton'

interface MetricData {
  total: number
  count: number
  avgPerBooking: number
}

interface DashboardData {
  currentMonth: MetricData
  yearToDate: MetricData
  allTime: MetricData
  currentRate: number
}

export function CommissionMetrics() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/commissions/dashboard')

        if (!response.ok) {
          throw new Error('Failed to fetch commission dashboard data')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 col-span-full">
          <p className="text-red-600 text-sm font-medium">{error || 'Failed to load metrics'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </Card>
      </div>
    )
  }

  const metrics = [
    {
      title: 'Current Month',
      label: 'March 2026',
      ...data.currentMonth,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Year to Date',
      label: '2026',
      ...data.yearToDate,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'All Time',
      label: 'Since Launch',
      ...data.allTime,
      color: 'from-purple-500 to-purple-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <Card
          key={metric.title}
          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 font-medium">{metric.title}</p>
              <p className="text-xs text-gray-500">{metric.label}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-900">
              €{metric.total.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {metric.count} booking{metric.count !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Avg per booking</span>
              <span className="font-semibold text-gray-900">
                €{metric.avgPerBooking.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Commission rate</span>
              <span className="font-semibold text-gray-900">
                {(data.currentRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
