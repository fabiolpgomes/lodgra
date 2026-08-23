'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/common/ui/dialog'
import { X } from 'lucide-react'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface Reservation {
  id: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface ReservationDetailsModalProps {
  isOpen: boolean
  reservation: Reservation | null
  onClose: () => void
  currency?: CurrencyCode
}

export function ReservationDetailsModal({
  isOpen,
  reservation,
  onClose,
  currency = 'EUR',
}: ReservationDetailsModalProps) {
  if (!reservation) return null
  const resolvedCurrency = currency?.toUpperCase() as CurrencyCode

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
      <DialogContent className="max-w-md p-6" style={{ backgroundColor: '#FBFAF6' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#1B2430' }}>
            Detalhes da Reserva
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 opacity-70 hover:opacity-100"
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
              {formatCurrency(reservation.price, resolvedCurrency)}
            </p>
            <p className="text-sm mt-1" style={{ color: '#4D5566' }}>
              Total: {formatCurrency(reservation.price * nights, resolvedCurrency)}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
