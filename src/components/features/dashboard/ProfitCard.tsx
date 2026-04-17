'use client'

import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface ProfitCardProps {
  revenue: number
  expenses: number
  currency: string
}

export function ProfitCard({ revenue, expenses, currency }: ProfitCardProps) {
  const profit = revenue - expenses
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0
  const isProfit = profit >= 0

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-blue-100 rounded-lg">
          <DollarSign className="h-6 w-6 text-blue-600" />
        </div>
        <span className="text-sm text-gray-500">Lucro</span>
      </div>
      
      <div className="space-y-3">
        {/* Lucro Líquido */}
        <div>
          <h3 className={`text-3xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit, currency as CurrencyCode)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">Lucro Líquido</p>
        </div>

        {/* Detalhamento */}
        <div className="pt-3 border-t space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>Receita</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatCurrency(revenue, currency as CurrencyCode)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span>Despesas</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatCurrency(expenses, currency as CurrencyCode)}
            </span>
          </div>

          {/* Margem */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-gray-600">Margem</span>
            <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              {profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
