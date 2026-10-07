'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/common/ui/dialog'
import { useState } from 'react'
import Link from 'next/link'
import { X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
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
  /** Idioma das rotas (ex.: pt-BR) para o link "Abrir reserva". */
  locale?: string
  /** Chamado depois de cancelar, para recarregar o calendário. */
  onCancelled?: () => void
}

export function ReservationDetailsModal({
  isOpen,
  reservation,
  onClose,
  currency,
  locale = 'pt-BR',
  onCancelled,
}: ReservationDetailsModalProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  if (!reservation) return null

  const handleClose = () => {
    setConfirmingCancel(false)
    onClose()
  }

  const handleCancel = async () => {
    try {
      setCancelling(true)
      const response = await fetch(`/api/reservations/${reservation.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Cancelada no calendário' }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Falha ao cancelar')
      toast.success(payload?.already_cancelled ? 'A reserva já estava cancelada' : 'Reserva cancelada')
      onCancelled?.()
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar')
    } finally {
      setCancelling(false)
    }
  }
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%_-_1rem)] max-w-md p-4 sm:p-6" style={{ backgroundColor: '#FBFAF6' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#1B2430' }}>
            Detalhes da Reserva
          </DialogTitle>
          <button
            onClick={handleClose}
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

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row" style={{ borderColor: '#E5DFD2' }}>
            <Link
              href={`/${locale}/reservations/${reservation.id}`}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#10203E] px-4 text-sm font-semibold text-white hover:bg-[#0D1A2E]"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir reserva
            </Link>
            {!confirmingCancel ? (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Cancelar reserva
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelling ? 'A cancelar…' : 'Confirmar cancelamento'}
              </button>
            )}
          </div>
          {confirmingCancel && (
            <p className="text-xs" style={{ color: '#4D5566' }}>
              As datas ficam livres. Se a reserva foi paga online, o reembolso segue a política de cancelamento.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
