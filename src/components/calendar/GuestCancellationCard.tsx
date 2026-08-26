'use client'

import { useState } from 'react'
import CancellationModal from '@/components/modals/CancellationModal'
import { formatCurrency } from '@/lib/utils/currency'

interface Reservation {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  total_amount: number
}

interface PropertyCancellationPolicy {
  policy_type: 'flexible' | 'moderate' | 'limited' | 'firm' | 'rigid'
}

interface CancellationCardProps {
  reservation: Reservation
  policy: PropertyCancellationPolicy
  estimatedRefund: number
}

export function GuestCancellationCard({
  reservation,
  policy,
  estimatedRefund,
}: CancellationCardProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="border-t px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">Cancelamento</h3>
            <p className="text-xs text-gray-600 mt-1">
              Política: <strong className="capitalize">{policy.policy_type}</strong>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Reembolso estimado:{' '}
              <strong>{formatCurrency(estimatedRefund)}</strong>
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="h-11 w-full rounded bg-red-50 px-3 text-xs font-medium text-red-700 transition hover:bg-red-100 sm:w-auto"
          >
            Cancelar
          </button>
        </div>
      </div>

      <CancellationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        reservation={reservation}
        policy={policy}
      />
    </>
  )
}
