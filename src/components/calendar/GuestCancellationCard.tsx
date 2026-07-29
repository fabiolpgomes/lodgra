'use client'

import { useState } from 'react'
import CancellationModal from '@/components/modals/CancellationModal'

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
      <div className="p-4 border-t">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-sm">Cancelamento</h3>
            <p className="text-xs text-gray-600 mt-1">
              Política: <strong className="capitalize">{policy.policy_type}</strong>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Reembolso estimado:{' '}
              <strong>€{estimatedRefund.toFixed(2)}</strong>
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded font-medium hover:bg-red-100 transition"
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
