'use client'

import { useState } from 'react'

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

interface CancellationModalProps {
  isOpen: boolean
  onClose: () => void
  reservation: Reservation
  policy: PropertyCancellationPolicy
}

export default function CancellationModal({
  isOpen,
  onClose,
  reservation,
  policy,
}: CancellationModalProps) {
  const [step, setStep] = useState<'type' | 'description' | 'confirm' | 'success'>('type')
  const [cancellationType, setCancellationType] = useState<'voluntary' | 'serious_issue' | null>(null)
  const [description, setDescription] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [estimatedRefund, setEstimatedRefund] = useState(0)
  const [isPending, setIsPending] = useState(false)

  const handleSelectType = async (type: 'voluntary' | 'serious_issue') => {
    setCancellationType(type)

    if (type === 'voluntary') {
      try {
        const checkInDate = new Date(reservation.check_in)
        const now = new Date()
        const daysUntilCheckin = Math.ceil(
          (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        const response = await fetch('/api/reservations/estimate-refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            policy_type: policy.policy_type,
            days_until_checkin: daysUntilCheckin,
            total_amount: reservation.total_amount,
            stay_duration: 'short',
          }),
        })
        const data = await response.json()
        setEstimatedRefund(data.refund_amount || 0)
      } catch (error) {
        console.error('Error calculating refund:', error)
        setEstimatedRefund(0)
      }
    }

    setStep('description')
  }

  const handleSubmit = async () => {
    if (description.length < 20) {
      alert('Descreva o motivo (mín. 20 caracteres)')
      return
    }

    setStep('confirm')
  }

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      const response = await fetch(`/api/reservations/${reservation.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellation_reason: cancellationType,
          cancellation_description: description,
          cancellation_evidence_url: evidenceUrl || undefined,
        }),
      })
      if (!response.ok) throw new Error('Cancelamento falhou')
      setStep('success')
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      alert('Erro ao processar cancelamento. Tente novamente.')
    } finally {
      setIsPending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Overlay */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Modal — abre de baixo */}
      <div className="bg-white rounded-t-2xl shadow-xl w-full max-w-[90vw] mx-auto pb-6 animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold">Cancelar Reserva</h2>
          <button onClick={onClose} className="text-2xl text-gray-400">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 min-h-[300px]">
          {/* STEP 1: Tipo de Cancelamento */}
          {step === 'type' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Por que deseja cancelar?</p>

              <button
                onClick={() => handleSelectType('voluntary')}
                className="w-full p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <div className="font-semibold text-sm">Saio Mais Cedo</div>
                <div className="text-xs text-gray-600 mt-1">
                  Mudança de planos, emergência, etc.
                </div>
              </button>

              <button
                onClick={() => handleSelectType('serious_issue')}
                className="w-full p-4 border-2 rounded-lg hover:border-red-500 hover:bg-red-50 transition text-left"
              >
                <div className="font-semibold text-sm">Problema no Alojamento</div>
                <div className="text-xs text-gray-600 mt-1">
                  Limpeza, anomalias, falta de comunicação
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: Descrição */}
          {step === 'description' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Descreva o motivo
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mínimo 20 caracteres..."
                  className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length} / 20 caracteres
                </p>
              </div>

              {cancellationType === 'serious_issue' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Evidência (URL foto/vídeo — opcional)
                  </label>
                  <input
                    type="text"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {cancellationType === 'voluntary' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium">Reembolso Estimado</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">
                    €{estimatedRefund.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Baseado na política {policy.policy_type}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Confirmação */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900">
                  Confirmar Cancelamento?
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Este reembolso é <strong>estimado</strong>. O valor final será processado após
                  revisão pelo gestor (casos de problema grave).
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Tipo:</p>
                <p className="text-sm font-semibold">
                  {cancellationType === 'voluntary' ? 'Saio Mais Cedo' : 'Problema Grave'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Sucesso */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <div>
                <p className="text-lg font-bold">Cancelamento Processado</p>
                <p className="text-sm text-gray-600 mt-2">
                  {cancellationType === 'serious_issue'
                    ? 'Seu caso foi reportado para revisão. Receberá notificações por email.'
                    : `Reembolso de €${estimatedRefund.toFixed(2)} será processado em breve.`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Voltar ao Calendário
              </button>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        {step !== 'success' && (
          <div className="flex gap-3 px-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 border rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={() => {
                if (step === 'type') onClose()
                else if (step === 'description') handleSubmit()
                else if (step === 'confirm') handleConfirm()
              }}
              disabled={
                (step === 'description' && description.length < 20) || isPending
              }
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Processando...' : 'Próximo'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
