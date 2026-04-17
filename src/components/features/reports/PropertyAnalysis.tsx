'use client'

import { Building2 } from 'lucide-react'
import { ExportToExcelButton } from './ExportToExcelButton'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface PropertyStat {
  id: string
  name: string
  currency: string
  revenue: number
  reservations: number
  nights: number
  availableNights: number
  management_percentage?: number
  management_fee?: number
  owner_net?: number
  owner_name?: string | null
}

interface PropertyAnalysisProps {
  propertyStats: PropertyStat[]
}

export function PropertyAnalysis({ propertyStats }: PropertyAnalysisProps) {
  const sortedStats = [...propertyStats].sort((a, b) => b.revenue - a.revenue)

  const exportData = sortedStats.map(stat => {
    const occupancy = stat.availableNights > 0 ? Math.min((stat.nights / stat.availableNights) * 100, 100) : 0
    const revpar = stat.availableNights > 0 ? stat.revenue / stat.availableNights : 0
    return {
      'Propriedade': stat.name,
      'Proprietário': stat.owner_name || '—',
      'Moeda': stat.currency || 'EUR',
      'Receita Total': stat.revenue.toFixed(2),
      'Comissão Gestão (%)': stat.management_percentage ?? 0,
      'Comissão Gestão': (stat.management_fee ?? 0).toFixed(2),
      'Líquido Proprietário': (stat.owner_net ?? stat.revenue).toFixed(2),
      'Reservas': stat.reservations,
      'Noites Reservadas': stat.nights,
      'ADR (Diária Média)': stat.nights > 0 ? (stat.revenue / stat.nights).toFixed(2) : '0.00',
      'RevPAR': revpar.toFixed(2),
      'Taxa de Ocupação (%)': occupancy.toFixed(1),
      'Valor Médio por Reserva': stat.reservations > 0 ? (stat.revenue / stat.reservations).toFixed(2) : '0.00',
    }
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Análise por Propriedade</h3>
        </div>
        {sortedStats.length > 0 && (
          <ExportToExcelButton
            data={exportData}
            filename="analise_propriedades"
            sheetName="Por Propriedade"
          />
        )}
      </div>

      {sortedStats.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum dado disponível</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedStats.map((stat) => {
            const currency = (stat.currency || 'EUR') as CurrencyCode
            const avgNightly = stat.nights > 0 ? stat.revenue / stat.nights : 0
            const occupancy = stat.availableNights > 0
              ? Math.min((stat.nights / stat.availableNights) * 100, 100)
              : 0
            const revpar = stat.availableNights > 0 ? stat.revenue / stat.availableNights : 0

            return (
              <div key={stat.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{stat.name}</h4>
                    {stat.owner_name && (
                      <p className="text-xs text-gray-500 mt-0.5">Proprietário: {stat.owner_name}</p>
                    )}
                  </div>
                  {(stat.management_percentage ?? 0) > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {stat.management_percentage}% gestão
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Receita Bruta</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stat.revenue, currency)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Reservas</p>
                    <p className="text-xl font-bold text-blue-600">{stat.reservations}</p>
                  </div>

                  {(stat.management_percentage ?? 0) > 0 && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Comissão Gestão</p>
                        <p className="text-lg font-semibold text-orange-600">{formatCurrency(stat.management_fee ?? 0, currency)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Líquido Proprietário</p>
                        <p className="text-lg font-semibold text-teal-600">{formatCurrency(stat.owner_net ?? stat.revenue, currency)}</p>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-sm text-gray-600">ADR (Diária)</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(avgNightly, currency)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">RevPAR</p>
                    <p className="text-lg font-semibold text-purple-700">{formatCurrency(revpar, currency)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Taxa de Ocupação</span>
                    <span className="font-semibold text-gray-900">
                      {stat.availableNights > 0 ? `${occupancy.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  {stat.availableNights > 0 && (
                    <div
                      className="w-full bg-gray-200 rounded-full h-2"
                      role="progressbar"
                      aria-valuenow={Math.round(occupancy)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Occupancy rate: ${occupancy.toFixed(1)}%`}
                    >
                      <div
                        className={`h-2 rounded-full transition-all ${occupancy >= 70 ? 'bg-green-500' : occupancy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(occupancy, 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">{stat.nights} noites reservadas</span>
                    <span className="text-gray-600">
                      {stat.reservations > 0 ? (stat.nights / stat.reservations).toFixed(1) : 0} noites/reserva
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
