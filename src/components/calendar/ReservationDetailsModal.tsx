'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/common/ui/dialog'
import { X } from 'lucide-react'
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

interface ReservationDetailsModalProps {
  isOpen: boolean
  reservation: Reservation | null
  onClose: () => void
  currency?: CurrencyCode | null
}

export function ReservationDetailsModal({
  isOpen,
  reservation,
  onClose,
  currency,
}: ReservationDetailsModalProps) {
  if (!reservation) return null
  const resolvedCurrency = currency?.toUpperCase() as CurrencyCode | undefined
  const reservationNotes = reservation.notes || ''
  const minimumOverrideMatch = reservationNotes.match(
    /Exceção aprovada para mínimo de noites:\s*(\d+)\s*noites?/i
  )
  const hasApprovedMinimumOverride = Boolean(minimumOverrideMatch)

  const nights = Math.ceil(
    (reservation.endDate.getTime() - reservation.startDate.getTime()) /
      (1000 * 60 * 60 * 24)
  )

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const statusColors: Record<string, string> = {
    pending: '#F57C00',
    confirmed: '#1976D2',
    hosting: '#388E3C',
    completed: '#5E35B1',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    hosting: 'Hospedado',
    completed: 'Concluído',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%_-_1rem)] max-w-md p-4 sm:p-6" style={{ backgroundColor: '#FBFAF6' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#1B2430' }}>
            Detalhes da Reserva
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full opacity-70 hover:opacity-100"
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Guest Name */}
          <div className="border-b" style={{ borderColor: '#E5DFD2' }}>
            <p className="text-sm font-semibold" style={{ color: '#4D5566' }}>
              Hóspede
            </p>
            <p className="text-lg font-bold" style={{ color: '#1B2430' }}>
              {reservation.guestName}
            </p>
          </div>

          {/* Guest Count */}
          <div className="border-b" style={{ borderColor: '#E5DFD2' }}>
            <p className="text-sm font-semibold" style={{ color: '#4D5566' }}>
              Número de Hóspedes
            </p>
            <p className="text-lg font-bold" style={{ color: '#1B2430' }}>
              {reservation.guestCount || 1} {reservation.guestCount === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </div>

          {/* Dates */}
          <div className="border-b" style={{ borderColor: '#E5DFD2' }}>
            <p className="text-sm font-semibold" style={{ color: '#4D5566' }}>
              Período
            </p>
            <p className="text-sm" style={{ color: '#1B2430' }}>
              <span className="font-semibold">Check-in:</span> {formatDate(reservation.startDate)}
            </p>
            <p className="text-sm" style={{ color: '#1B2430' }}>
              <span className="font-semibold">Check-out:</span> {formatDate(reservation.endDate)}
            </p>
            <p className="text-sm mt-1" style={{ color: '#4D5566' }}>
              ({nights} noite{nights === 1 ? '' : 's'})
            </p>
          </div>

          {/* Price */}
          <div className="border-b" style={{ borderColor: '#E5DFD2' }}>
            <p className="text-sm font-semibold" style={{ color: '#4D5566' }}>
              Valor por Noite
            </p>
            <p className="text-lg font-bold" style={{ color: '#1B2430' }}>
              {resolvedCurrency ? formatCurrency(reservation.price, resolvedCurrency) : reservation.price.toFixed(2)}
            </p>
            <p className="text-sm mt-1" style={{ color: '#4D5566' }}>
              Total: {resolvedCurrency ? formatCurrency(reservation.price * nights, resolvedCurrency) : (reservation.price * nights).toFixed(2)}
            </p>
          </div>

          {/* Status */}
          <div>
            <p className="text-sm font-semibold" style={{ color: '#4D5566' }}>
              Status
            </p>
            <div className="mt-2">
              <span
                className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: statusColors[reservation.status] }}
              >
                {statusLabels[reservation.status]}
              </span>
            </div>
          </div>

          {hasApprovedMinimumOverride && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <MinimumOverrideBadge minimumNights={minimumOverrideMatch?.[1] || '-'} />
              <p className="text-sm text-amber-900 mt-1">
                Esta reserva foi aprovada manualmente abaixo do mínimo do período.
              </p>
            </div>
          )}

          <div className="border-t pt-4" style={{ borderColor: '#E5DFD2' }}>
            <p className="text-sm font-semibold" style={{ color: '#4D5566' }}>
              Notas
            </p>
            <p className="text-sm mt-2 bg-[#F7F5EF] p-3 rounded-lg border border-[#E5DFD2] whitespace-pre-wrap" style={{ color: '#1B2430' }}>
              {reservationNotes || <span style={{ color: '#4D5566', fontStyle: 'italic' }}>Sem notas</span>}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
