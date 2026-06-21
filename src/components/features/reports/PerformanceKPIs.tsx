'use client'

import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { CurrencyStack } from '@/components/shared/CurrencyStack'

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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
        <TrendingUp className="h-5 w-5" />
        KPIs de Desempenho
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
            <p className="text-sm text-gray-600">{kpi.title}</p>
            <p className={`mt-2 text-2xl font-bold ${kpi.valueClass}`}>{kpi.value}</p>
            <p className="mt-1 text-xs text-gray-500">{kpi.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="mb-4 font-semibold text-gray-700">Distribuição de Receita</h3>
        <CurrencyStack reservations={reservations} />
      </div>
    </div>
  )
}
