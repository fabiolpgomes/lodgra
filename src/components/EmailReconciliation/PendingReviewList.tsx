'use client'

import React, { useState } from 'react'
import { PendingReview, ConfirmationAction, PendingReviewListProps } from '@/lib/email-reconciliation/ui-types'

/**
 * AC6: List of pending reviews with candidates
 * Shows needs_review items with up to 3 candidates side-by-side
 */
export function PendingReviewList({ items, onConfirm, onReject, loading }: PendingReviewListProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<{ [key: string]: string }>({})

  const handleConfirm = async (item: PendingReview) => {
    if (item.decision.status === 'needs_review' && !selectedCandidate[item.id]) {
      alert('Por favor, selecione um candidato')
      return
    }

    const action: ConfirmationAction = {
      type: item.decision.status,
      extraction_id: item.extraction_id,
      selected_candidate:
        item.decision.status === 'needs_review' ? selectedCandidate[item.id] : undefined,
      timestamp: new Date(),
    }

    try {
      await onConfirm(action)
    } catch (error) {
      console.error('Erro ao confirmar:', error)
    }
  }

  if (items.length === 0) {
    return <div className="p-8 text-center text-gray-500">Nenhuma revisão pendente</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Reconciliações Pendentes</h2>
        <p className="text-gray-600">{items.length} itens aguardando revisão</p>
      </div>

      {items.map((item) => (
        <PendingReviewItem
          key={item.id}
          item={item}
          selected={selectedCandidate[item.id]}
          onSelect={(candidateId) => setSelectedCandidate({ ...selectedCandidate, [item.id]: candidateId })}
          onConfirm={() => handleConfirm(item)}
          onReject={() => onReject(item.extraction_id)}
          loading={loading}
        />
      ))}
    </div>
  )
}

interface PendingReviewItemProps {
  item: PendingReview
  selected?: string
  onSelect: (candidateId: string) => void
  onConfirm: () => Promise<void>
  onReject: () => Promise<void>
  loading?: boolean
}

function PendingReviewItem({
  item,
  selected,
  onSelect,
  onConfirm,
  onReject,
  loading,
}: PendingReviewItemProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const extraction = item.extraction
  const candidates = item.decision.candidates

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Extraction Summary */}
      <div className="mb-6 rounded-md bg-blue-50 p-4">
        <h3 className="font-semibold">{extraction.guest_name}</h3>
        <p className="text-sm text-gray-600">
          {extraction.check_in} → {extraction.check_out}
        </p>
        {extraction.reservation_code && (
          <p className="text-xs text-gray-500">Código: {extraction.reservation_code}</p>
        )}
      </div>

      {/* Candidates (side-by-side) */}
      {item.decision.status === 'needs_review' && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-gray-700">
            Selecione o candidato mais relevante:
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {candidates.slice(0, 3).map((candidate, idx) => (
              <CandidateCard
                key={candidate.target_id}
                candidate={candidate}
                isSelected={selected === candidate.target_id}
                onSelect={() => onSelect(candidate.target_id)}
                rank={idx + 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Auto-Match Notification */}
      {item.decision.status === 'auto_matched' && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            ✓ <strong>Auto-match confirmado</strong> com score {item.decision.candidates[0].score}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={isProcessing || loading}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isProcessing ? 'Processando...' : 'Confirmar'}
        </button>
        <button
          onClick={onReject}
          disabled={isProcessing || loading}
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
        >
          Rejeitar
        </button>
      </div>
    </div>
  )
}

interface CandidateCardProps {
  candidate: any
  isSelected: boolean
  onSelect: () => void
  rank: number
}

function CandidateCard({ candidate, isSelected, onSelect, rank }: CandidateCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-md border-2 p-4 transition ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">#{rank}</span>
        <span className="rounded bg-gray-100 px-2 py-1 text-sm font-bold text-gray-800">
          {candidate.score}
        </span>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-1 text-xs text-gray-600">
        {candidate.details.reservation_code_match && <p>✓ Código de reserva encontrado</p>}
        {candidate.details.dates_exact && <p>✓ Datas exatas</p>}
        {candidate.details.dates_within_tolerance && (
          <p>✓ Datas dentro de ±{candidate.details.dates_within_tolerance.toFixed(1)} dia(s)</p>
        )}
        {candidate.details.source_platform_match && <p>✓ Plataforma compatível</p>}
        {candidate.details.property_similarity && (
          <p>✓ Propriedade similar ({(candidate.details.property_similarity * 100).toFixed(0)}%)</p>
        )}
      </div>

      {isSelected && (
        <div className="mt-3 rounded bg-blue-100 px-2 py-1 text-center text-xs font-semibold text-blue-700">
          Selecionado
        </div>
      )}
    </div>
  )
}
