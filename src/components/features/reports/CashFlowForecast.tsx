'use client'

import { Calendar, TrendingUp, DollarSign, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { ExportToExcelButton } from './ExportToExcelButton'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { normalizeChannelName } from '@/lib/utils/channels'

interface FutureReservation {
  id: string
  check_in: string
  check_out: string
  total_amount: number | null
  currency: string | null
  source: string | null
  property_listings: {
    property_id: string
    properties: { id: string; name: string }
  } | null
  guests: { first_name: string | null; last_name: string | null } | null
}

interface HorizonSummary {
  revenueByCurrency: Record<string, number>
  reservations: number
  nights: number
}

interface CashFlowForecastProps {
  horizon30: HorizonSummary
  horizon60: HorizonSummary
  horizon90: HorizonSummary
  futureByMonth: Record<string, { month: string; reservations: FutureReservation[] }>
}

function HorizonCard({
  label,
  sublabel,
  summary,
  color,
}: {
  label: string
  sublabel: string
  summary: HorizonSummary
  color: string
}) {
  const hasData = Object.values(summary.revenueByCurrency).some(v => v > 0)

  return (
    <div className={`bg-white rounded-lg shadow p-5 border-t-4 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-gray-500" />
        <div>
          <p className="font-semibold text-gray-900 text-sm">{label}</p>
          <p className="text-xs text-gray-500">{sublabel}</p>
        </div>
      </div>
      <div className="space-y-1 mb-3">
        {hasData ? (
          Object.entries(summary.revenueByCurrency).map(([cur, amount]) => (
            <p key={cur} className="text-2xl font-bold text-gray-900">
              {formatCurrency(amount, cur as CurrencyCode)}
            </p>
          ))
        ) : (
          <p className="text-2xl font-bold text-gray-400">—</p>
        )}
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>{summary.reservations} reservas</span>
        <span>{summary.nights} noites</span>
      </div>
    </div>
  )
}

function MonthGroup({
  month,
  reservations,
}: {
  month: string
  reservations: FutureReservation[]
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <span className="font-semibold text-gray-800 capitalize">{month}</span>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
            {reservations.length} reservas
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {formatCurrency(
            reservations.reduce((s, r) => s + (r.total_amount ? Number(r.total_amount) : 0), 0),
            (reservations[0]?.currency || 'EUR') as CurrencyCode
          )}
        </span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {reservations.map(r => {
            const listing = r.property_listings as { properties: { id: string; name: string } } | null
            const propName = listing?.properties?.name ?? '—'
            const guestName = r.guests
              ? `${r.guests.first_name ?? ''} ${r.guests.last_name ?? ''}`.trim() || '—'
              : '—'
            const channel = r.source ? normalizeChannelName(r.source) : 'Directo'
            const nights = Math.ceil(
              (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60 * 24)
            )

            return (
              <div key={r.id} className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm items-center">
                <div>
                  <p className="font-medium text-gray-900">{propName}</p>
                  <p className="text-xs text-gray-500">{guestName}</p>
                </div>
                <div>
                  <p className="text-gray-700">{r.check_in}</p>
                  <p className="text-xs text-gray-500">→ {r.check_out} ({nights}n)</p>
                </div>
                <div className="hidden md:block">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {channel}
                  </span>
                </div>
                <div className="hidden md:block" />
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {r.total_amount
                      ? formatCurrency(Number(r.total_amount), (r.currency || 'EUR') as CurrencyCode)
                      : '—'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function CashFlowForecast({
  horizon30,
  horizon60,
  horizon90,
  futureByMonth,
}: CashFlowForecastProps) {
  const allFuture = Object.values(futureByMonth).flatMap(m => m.reservations)

  const exportData = allFuture.map(r => {
    const listing = r.property_listings as { properties: { id: string; name: string } } | null
    const guestName = r.guests
      ? `${r.guests.first_name ?? ''} ${r.guests.last_name ?? ''}`.trim()
      : ''
    const nights = Math.ceil(
      (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60 * 24)
    )
    return {
      'Propriedade': listing?.properties?.name ?? '',
      'Hóspede': guestName,
      'Check-in': r.check_in,
      'Check-out': r.check_out,
      'Noites': nights,
      'Canal': r.source ? normalizeChannelName(r.source) : 'Directo',
      'Valor': r.total_amount ? Number(r.total_amount).toFixed(2) : '0.00',
      'Moeda': r.currency || 'EUR',
    }
  })

  const monthEntries = Object.entries(futureByMonth).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Fluxo de Caixa Previsto
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Baseado em reservas confirmadas a partir de hoje · Independente dos filtros de data
            </p>
          </div>
          {exportData.length > 0 && (
            <ExportToExcelButton
              data={exportData}
              filename="fluxo_caixa_previsto"
              sheetName="Previsão"
            />
          )}
        </div>
      </div>

      {allFuture.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Sem reservas futuras confirmadas.</p>
          <p className="text-sm mt-1">As reservas confirmadas aparecerão aqui assim que forem criadas.</p>
        </div>
      ) : (
        <>
          {/* Cards de horizonte */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HorizonCard
              label="Próximos 30 dias"
              sublabel="A partir de hoje"
              summary={horizon30}
              color="border-green-500"
            />
            <HorizonCard
              label="31–60 dias"
              sublabel="Médio prazo"
              summary={horizon60}
              color="border-yellow-500"
            />
            <HorizonCard
              label="61–90 dias"
              sublabel="Longo prazo"
              summary={horizon90}
              color="border-blue-500"
            />
          </div>

          {/* Listagem por mês */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-1">
              Detalhe por mês
            </h4>
            {monthEntries.map(([key, { month, reservations }]) => (
              <MonthGroup key={key} month={month} reservations={reservations} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
