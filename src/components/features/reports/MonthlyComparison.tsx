'use client'

import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { ExportToExcelButton } from './ExportToExcelButton'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface MonthlyStat {
  monthKey: string
  month: string
  currency: string
  revenue: number
  reservations: number
  nights: number
  availableNights: number
}

interface MonthlyComparisonProps {
  monthlyStats: MonthlyStat[]
}

export function MonthlyComparison({ monthlyStats }: MonthlyComparisonProps) {
  const currency = (monthlyStats.length > 0 ? monthlyStats[0].currency : 'EUR') as CurrencyCode

  const exportData = monthlyStats.map(stat => {
    const occupancy = stat.availableNights > 0 ? Math.min((stat.nights / stat.availableNights) * 100, 100) : 0
    return {
      'Mês': stat.month,
      'Moeda': stat.currency || 'EUR',
      'Receita': stat.revenue.toFixed(2),
      'Reservas': stat.reservations,
      'Noites': stat.nights,
      'ADR (Diária Média)': stat.nights > 0 ? (stat.revenue / stat.nights).toFixed(2) : '0.00',
      'Taxa de Ocupação (%)': occupancy.toFixed(1),
    }
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Comparativo Mensal</h3>
        </div>
        {monthlyStats.length > 0 && (
          <ExportToExcelButton
            data={exportData}
            filename="comparativo_mensal"
            sheetName="Por Mês"
          />
        )}
      </div>

      {monthlyStats.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum dado disponível</p>
        </div>
      ) : (
        <div className="space-y-3">
          {monthlyStats.map((stat, index: number) => {
            const statCurrency = (stat.currency || 'EUR') as CurrencyCode
            const prevStat = index > 0 ? monthlyStats[index - 1] : null
            const revenueChange = prevStat ? ((stat.revenue - prevStat.revenue) / prevStat.revenue) * 100 : 0
            const isIncrease = revenueChange > 0

            return (
              <div key={stat.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 capitalize">{stat.month}</p>
                  {(() => {
                    const occupancy = stat.availableNights > 0
                      ? Math.min((stat.nights / stat.availableNights) * 100, 100)
                      : 0
                    return (
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{stat.reservations} reservas</span>
                        <span>·</span>
                        <span>{stat.nights} noites</span>
                        <span>·</span>
                        <span>{formatCurrency(stat.nights > 0 ? stat.revenue / stat.nights : 0, statCurrency)} ADR</span>
                        {stat.availableNights > 0 && (
                          <>
                            <span>·</span>
                            <span
                              className={`font-medium ${occupancy >= 70 ? 'text-green-600' : occupancy >= 40 ? 'text-yellow-600' : 'text-red-600'}`}
                              role="meter"
                              aria-valuenow={Math.round(occupancy)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Occupancy rate: ${occupancy.toFixed(1)}%`}
                            >
                              {occupancy.toFixed(0)}% ocup.
                            </span>
                          </>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stat.revenue, statCurrency)}</p>

                  {prevStat && (
                    <div className={`flex items-center gap-1 text-sm ${
                      isIncrease ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isIncrease ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{Math.abs(revenueChange).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Resumo */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(monthlyStats.reduce((sum: number, s) => sum + s.revenue, 0), currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Média Mensal</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(monthlyStats.reduce((sum: number, s) => sum + s.revenue, 0) / monthlyStats.length, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Melhor Mês</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(Math.max(...monthlyStats.map((s) => s.revenue)), currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
