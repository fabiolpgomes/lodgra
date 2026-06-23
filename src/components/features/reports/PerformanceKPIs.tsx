'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, HelpCircle } from 'lucide-react'
import { CurrencyStack } from '@/components/common/ui/CurrencyStack'

export interface Reservation {
  id: string
  total_amount?: number
  currency?: string
}

interface Metrics {
  occupancyRate: number
  adr: number
  revenue: number
  reservationCount: number
}

interface PerformanceKPIsProps {
  metrics: Metrics
  reservations: Reservation[]
  _startDate: string
  _endDate: string
}

export function PerformanceKPIs({
  metrics,
  reservations,
  _startDate,
  _endDate,
}: PerformanceKPIsProps) {
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null)

  const kpiDescriptions = [
    'Percentual de dias ocupados em relação ao total de dias no período. Acima de 70% é excelente.',
    'Valor médio ganhado por noite ocupada. Obtido dividindo a receita total pelo número de noites reservadas.',
    'Receita total gerada pelas reservas confirmadas no período selecionado.',
    'Quantidade total de reservas confirmadas no período. Não inclui reservas pendentes ou canceladas.',
  ]

  const kpiData = useMemo(() => {
    const getOccupancyColor = (rate: number) => {
      if (rate >= 70) return 'text-green-600'
      if (rate >= 40) return 'text-yellow-600'
      return 'text-red-600'
    }

    return [
      {
        title: 'Taxa de Ocupação',
        value: `${Math.round(metrics.occupancyRate)}%`,
        valueClass: getOccupancyColor(metrics.occupancyRate),
        subtitle: `${metrics.occupancyRate >= 70 ? 'Excelente' : metrics.occupancyRate >= 40 ? 'Boa' : 'Baixa'}`,
      },
      {
        title: 'ADR (Diária Média)',
        value: `€${metrics.adr.toFixed(2)}`,
        valueClass: 'text-blue-600',
        subtitle: `${metrics.reservationCount} reservas`,
      },
      {
        title: 'Receita',
        value: `€${metrics.revenue.toFixed(2)}`,
        valueClass: 'text-purple-600',
        subtitle: `${(metrics.revenue / metrics.occupancyRate || 0).toFixed(0)} por dia`,
      },
      {
        title: 'Nº de Reservas',
        value: metrics.reservationCount.toString(),
        valueClass: 'text-indigo-600',
        subtitle: 'Confirmadas',
      },
    ]
  }, [metrics])

  const currencyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    reservations.forEach((r) => {
      const currency = r.currency || 'EUR'
      totals[currency] = (totals[currency] || 0) + (r.total_amount || 0)
    })
    return totals
  }, [reservations])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
        <TrendingUp className="h-5 w-5" />
        KPIs de Desempenho
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, idx) => (
          <div
            key={idx}
            className="relative rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 group"
            onMouseEnter={() => setHoveredKpi(idx)}
            onMouseLeave={() => setHoveredKpi(null)}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-600 flex-1">{kpi.title}</p>
              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
            </div>

            <p className={`mt-2 text-2xl font-bold ${kpi.valueClass}`}>{kpi.value}</p>
            <p className="mt-1 text-xs text-gray-500">{kpi.subtitle}</p>

            {/* Tooltip */}
            {hoveredKpi === idx && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 whitespace-normal">
                {kpiDescriptions[idx]}
                <div className="absolute top-full left-4 h-0 w-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="mb-4 font-semibold text-gray-700">Distribuição de Receita</h3>
        <CurrencyStack totals={currencyTotals} />
      </div>
    </div>
  )
}
