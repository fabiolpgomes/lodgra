'use client'

import React, { useState, useMemo } from 'react'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { MinimumOverrideBadge } from './MinimumOverrideBadge'

interface Reservation {
  id: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
  notes?: string | null
}

interface ReservationsListProps {
  reservations: Reservation[]
  monthName: string
  year: number
  currency?: CurrencyCode
}

const ITEMS_PER_PAGE = 6

function ReservationsListComponent({
  reservations,
  monthName,
  year,
  currency,
}: ReservationsListProps) {
  const [page, setPagination] = useState(0)
  const resolvedCurrency = currency?.toUpperCase() as CurrencyCode | undefined

  const paginatedReservations = useMemo(() => {
    const start = page * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return reservations.slice(start, end)
  }, [reservations, page])

  const totalPages = Math.ceil(reservations.length / ITEMS_PER_PAGE)

  const getMinimumOverrideLabel = (notes?: string | null) => {
    const reservationNotes = notes || ''
    const minimumOverrideMatch = reservationNotes.match(
      /Exceção aprovada para mínimo de noites:\s*(\d+)\s*noites?/i
    )

    return minimumOverrideMatch?.[1] || null
  }

  if (reservations.length === 0) return null

  return (
    <div className="border-t px-4 py-4 sm:p-4" style={{ borderColor: '#E5DFD2', backgroundColor: '#FBFAF6' }}>
      <h3 className="mb-3 text-lg font-bold text-[#1B2430]">
        Reservas do Mês ({reservations.length})
      </h3>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedReservations.map((res) => {
          const minimumOverrideLabel = getMinimumOverrideLabel(res.notes)

          return (
            <div
              key={res.id}
              className="min-w-0 rounded-2xl border p-3 shadow-sm"
              style={{
                backgroundColor: res.status === 'confirmed' ? '#E3F2FD' : '#FFF3E0',
                borderColor: res.status === 'confirmed' ? '#1976D2' : '#F57C00',
                color: res.status === 'confirmed' ? '#1976D2' : '#F57C00',
              }}
            >
              <div className="truncate text-sm font-semibold">{res.guestName}</div>
              <div className="mt-1 text-xs">
                {res.guestCount} {res.guestCount === 1 ? 'hóspede' : 'hóspedes'}
              </div>
              <div className="mt-1 text-base font-bold">
                {resolvedCurrency ? formatCurrency(res.price, resolvedCurrency) : res.price.toFixed(2)}
              </div>
              <div className="mt-1 text-xs opacity-75">
                {res.startDate.toLocaleDateString('pt-BR')} até{' '}
                {res.endDate.toLocaleDateString('pt-BR')}
              </div>
              <div className="mt-1 text-xs font-medium">
                {res.status === 'confirmed'
                  ? 'Confirmado'
                  : res.status === 'hosting'
                  ? 'Hospedado'
                  : res.status === 'completed'
                  ? 'Concluído'
                  : 'Pendente'}
              </div>
              {minimumOverrideLabel && (
                <div className="mt-2">
                  <MinimumOverrideBadge minimumNights={minimumOverrideLabel} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: '#E5DFD2' }}>
          <button
            onClick={() => setPagination(Math.max(0, page - 1))}
            disabled={page === 0}
            className="h-11 rounded-xl px-4 text-sm font-semibold"
            style={{
              backgroundColor: page === 0 ? '#E5DFD2' : '#10203E',
              color: page === 0 ? '#999' : 'white',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <span className="text-sm font-medium" style={{ color: '#4D5566' }}>
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPagination(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="h-11 rounded-xl px-4 text-sm font-semibold"
            style={{
              backgroundColor: page >= totalPages - 1 ? '#E5DFD2' : '#10203E',
              color: page >= totalPages - 1 ? '#999' : 'white',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}

export const ReservationsList = React.memo(ReservationsListComponent)
