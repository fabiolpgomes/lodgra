'use client'

import React, { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils/currency'

interface Reservation {
  id: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface ReservationsListProps {
  reservations: Reservation[]
  monthName: string
  year: number
}

const ITEMS_PER_PAGE = 6

function ReservationsListComponent({
  reservations,
  monthName,
  year,
}: ReservationsListProps) {
  const [page, setPagination] = useState(0)

  const paginatedReservations = useMemo(() => {
    const start = page * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return reservations.slice(start, end)
  }, [reservations, page])

  const totalPages = Math.ceil(reservations.length / ITEMS_PER_PAGE)

  if (reservations.length === 0) return null

  return (
    <div className="p-4 border-t" style={{ borderColor: '#E5DFD2', backgroundColor: '#FBFAF6' }}>
      <h3 className="font-bold mb-3" style={{ color: '#1B2430' }}>
        Reservas do Mês ({reservations.length})
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        {paginatedReservations.map((res) => (
          <div
            key={res.id}
            className="p-3 rounded border min-w-[200px]"
            style={{
              backgroundColor: res.status === 'confirmed' ? '#E3F2FD' : '#FFF3E0',
              borderColor: res.status === 'confirmed' ? '#1976D2' : '#F57C00',
              color: res.status === 'confirmed' ? '#1976D2' : '#F57C00',
            }}
          >
            <div className="font-semibold text-sm truncate">{res.guestName}</div>
            <div className="text-xs mt-1">
              {res.guestCount} {res.guestCount === 1 ? 'hóspede' : 'hóspedes'}
            </div>
            <div className="text-sm font-bold mt-1">€{res.price.toFixed(2)}</div>
            <div className="text-sm font-bold mt-1">{formatCurrency(res.price)}</div>
            <div className="text-xs mt-1 opacity-75">
              {res.startDate.toLocaleDateString('pt-BR')} até{' '}
              {res.endDate.toLocaleDateString('pt-BR')}
            </div>
            <div className="text-xs mt-1">
              {res.status === 'confirmed'
                ? 'Confirmado'
                : res.status === 'hosting'
                ? 'Hospedado'
                : res.status === 'completed'
                ? 'Concluído'
                : 'Pendente'}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: '#E5DFD2' }}>
          <button
            onClick={() => setPagination(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm rounded"
            style={{
              backgroundColor: page === 0 ? '#E5DFD2' : '#10203E',
              color: page === 0 ? '#999' : 'white',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <span style={{ color: '#4D5566' }}>
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPagination(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 text-sm rounded"
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
