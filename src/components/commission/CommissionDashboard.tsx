'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CommissionMetrics } from './CommissionMetrics'
import { CommissionChart } from './CommissionChart'
import { CommissionHistory } from './CommissionHistory'
import { CommissionExport } from './CommissionExport'

interface PropertyData {
  id: string
  name: string
  total: number
  count: number
}

export function CommissionDashboard() {
  const [properties, setProperties] = useState<PropertyData[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoadingProperties(true)
        setError(null)
        const response = await fetch('/api/commissions/dashboard')

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const result = await response.json()
        setProperties(result.byProperty || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoadingProperties(false)
      }
    }

    fetchDashboard()
  }, [])

  // Calculate property breakdown chart data
  const chartData = properties.map((prop) => ({
    name: prop.name.length > 15 ? prop.name.substring(0, 12) + '...' : prop.name,
    value: prop.total,
    fullName: prop.name,
  }))

  const totalCommission = properties.reduce((sum, prop) => sum + prop.total, 0)
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Commission Overview</h2>
        <CommissionMetrics />
      </div>

      {/* Trend Chart */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Commission Trend</h2>
        <CommissionChart days={30} />
      </div>

      {/* Property Breakdown */}
      {!loadingProperties && !error && properties.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Commission by Property</h2>
          <Card className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
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
                  }}
                  formatter={(value) =>
                    typeof value === 'number' ? `€${value.toFixed(2)}` : value
                  }
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="value" name="Commission" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Property Summary Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Commission</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">% of Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((prop, index) => (
                    <tr key={prop.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          {prop.name}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900">
                        €{prop.total.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {totalCommission > 0
                          ? `${((prop.total / totalCommission) * 100).toFixed(1)}%`
                          : '0%'}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">
                        {prop.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Export Controls */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Export Data</h2>
        <CommissionExport />
      </div>

      {/* History Table */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Commission History</h2>
        <CommissionHistory />
      </div>
    </div>
  )
}
