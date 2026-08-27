'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/currency'

interface ReviewDecisionFormProps {
  reservationId: string
  token: string
  totalAmount: number
}

export default function ReviewDecisionForm({ reservationId, token, totalAmount }: ReviewDecisionFormProps) {
  const router = useRouter()
  const [decision, setDecision] = useState<'APPROVED' | 'PARTIAL' | 'DENIED'>('PARTIAL')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refundPercentage = {
    APPROVED: 100,
    PARTIAL: 50,
    DENIED: 0,
  }[decision]

  const refundAmount = (totalAmount * refundPercentage) / 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/review/${reservationId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          decision,
          refund_percentage: refundPercentage,
          notes: notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar decisão')
      }

      // Show success and redirect
      alert('Decisão registada com sucesso! Redirecionando...')
      router.push('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-3">Decisão</label>
        <div className="space-y-3">
          {[
            { value: 'APPROVED' as const, label: '✅ Reembolso Completo (100%)', color: 'border-emerald-300 bg-emerald-50' },
            { value: 'PARTIAL' as const, label: '⚠️ Reembolso Parcial (50%)', color: 'border-yellow-300 bg-yellow-50' },
            { value: 'DENIED' as const, label: '❌ Sem Reembolso', color: 'border-red-300 bg-red-50' },
          ].map((option) => (
            <label key={option.value} className={`flex items-center p-3 rounded border-2 cursor-pointer ${option.color} ${decision === option.value ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}>
              <input
                type="radio"
                name="decision"
                value={option.value}
                checked={decision === option.value}
                onChange={(e) => setDecision(e.target.value as typeof decision)}
                className="mr-3"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <p className="text-sm text-gray-600">Reembolso a Processar</p>
        <p className="text-2xl font-bold text-blue-600">{formatCurrency(refundAmount)}</p>
        <p className="text-xs text-gray-500 mt-1">{refundPercentage}% de {formatCurrency(totalAmount)}</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Notas (Opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Motivo da decisão, observações importantes..."
          className="w-full p-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
      >
        {loading ? 'Processando...' : 'Registar Decisão'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Ao submeter, o reembolso será processado no Stripe e os emails serão enviados.
      </p>
    </form>
  )
}
