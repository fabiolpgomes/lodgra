'use client'

import { BarChart2, DollarSign } from 'lucide-react'
import { ExportToExcelButton } from './ExportToExcelButton'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface ChannelStat {
  name: string
  revenue: number
  reservations: number
  nights: number
  currency: string
}

interface ChannelAnalysisProps {
  channelStats: ChannelStat[]
  totalRevenue: number
  startDate: string
  endDate: string
}

function DependencyBar({ pct }: { pct: number }) {
  const color =
    pct > 50 ? 'bg-red-500' :
    pct >= 25 ? 'bg-yellow-500' :
    'bg-green-500'

  const riskLevel = pct > 50 ? 'high' : pct >= 25 ? 'moderate' : 'low'

  return (
    <div
      className="w-full bg-gray-200 rounded-full h-2 mt-1"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Revenue concentration: ${pct.toFixed(1)}% (${riskLevel} risk)`}
    >
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

export function ChannelAnalysis({ channelStats, totalRevenue, startDate, endDate }: ChannelAnalysisProps) {
  const exportData = channelStats.map(c => {
    const adr = c.nights > 0 ? c.revenue / c.nights : 0
    const pct = totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0
    return {
      'Canal': c.name,
      'Receita': c.revenue.toFixed(2),
      'Moeda': c.currency,
      'Reservas': c.reservations,
      'Noites': c.nights,
      'ADR': adr.toFixed(2),
      '% Dependência': pct.toFixed(1),
    }
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Receita por Canal</h3>
          <p className="text-sm text-gray-500 mt-1">
            {startDate} → {endDate}
          </p>
        </div>
        {exportData.length > 0 && (
          <ExportToExcelButton
            data={exportData}
            filename="receita_por_canal"
            sheetName="Canais"
          />
        )}
      </div>

      {channelStats.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>Nenhum dado disponível para o período selecionado.</p>
        </div>
      ) : (
        <>
          {/* Legenda de risco */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              Concentração alta (&gt;50%)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
              Moderada (25–50%)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
              Baixa (&lt;25%)
            </span>
          </div>

          <div className="space-y-5">
            {channelStats.map(channel => {
              const adr = channel.nights > 0 ? channel.revenue / channel.nights : 0
              const pct = totalRevenue > 0 ? (channel.revenue / totalRevenue) * 100 : 0

              return (
                <div key={channel.name}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 text-sm">{channel.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(channel.revenue, channel.currency as CurrencyCode)}
                    </span>
                  </div>

                  <DependencyBar pct={pct} />

                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <div className="flex gap-4">
                      <span>{channel.reservations} reservas</span>
                      <span>{channel.nights} noites</span>
                      <span>ADR: {formatCurrency(adr, channel.currency as CurrencyCode)}</span>
                    </div>
                    <span className={`font-semibold ${pct > 50 ? 'text-red-600' : pct >= 25 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
