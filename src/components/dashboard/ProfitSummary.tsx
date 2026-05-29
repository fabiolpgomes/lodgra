'use client'

import React, { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils/currency'

interface ProfitData {
  revenue: number
  expenses: number
  profit: number
}

type SupportedCurrency = 'EUR' | 'BRL' | 'USD' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF'

function isSupportedCurrency(curr: string): curr is SupportedCurrency {
  const supported: SupportedCurrency[] = ['EUR', 'BRL', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF']
  return supported.includes(curr as SupportedCurrency)
}

interface ProfitSummaryProps {
  currency?: string
  month?: string
  className?: string
}

export function ProfitSummary({ currency, month, className = '' }: ProfitSummaryProps) {
  const [data, setData] = useState<Record<string, ProfitData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfit = async () => {
      try {
        const params = new URLSearchParams()
        if (currency) params.append('currency', currency)
        if (month) params.append('month', month)

        const response = await fetch(`/api/dashboard/profit?${params}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profit data')
      } finally {
        setLoading(false)
      }
    }

    fetchProfit()
  }, [currency, month])

  if (loading) return <div className={className}>Loading profit data...</div>
  if (error) return <div className={className}>Error: {error}</div>
  if (!data) return <div className={className}>No data available</div>

  return (
    <div className={className}>
      {Object.entries(data).map(([curr, profit]) => (
        <div key={curr} className="mb-6 p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50">
          <h3 className="text-lg font-semibold mb-4">{curr} Profit</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2">
              <span className="text-gray-700">Revenue (Real):</span>
              <span className="font-semibold">
                {isSupportedCurrency(curr)
                  ? formatCurrency(profit.revenue, curr)
                  : `${profit.revenue.toFixed(2)} ${curr}`}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2">
              <span className="text-gray-700">Total Expenses:</span>
              <span className="font-semibold text-red-600">
                -{isSupportedCurrency(curr)
                  ? formatCurrency(profit.expenses, curr)
                  : `${profit.expenses.toFixed(2)} ${curr}`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2">
              <span className="text-lg font-bold">Real Profit:</span>
              <span
                className={`text-2xl font-bold ${profit.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {isSupportedCurrency(curr)
                  ? formatCurrency(profit.profit, curr)
                  : `${profit.profit.toFixed(2)} ${curr}`}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-brand-50 rounded text-sm text-gray-700">
            <p className="mb-1">
              <strong>Formula:</strong> Real Profit = Revenue (Real) - Total Expenses
            </p>
            <p className="text-xs text-gray-600">
              Revenue shown is actual revenue for the current month (not including predicted future months)
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
