'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import ReviewDecisionForm from '@/components/ReviewDecisionForm'

interface ReviewData {
  reservation_id: string
  guest_name: string
  property_name: string
  check_in: string
  check_out: string
  total_amount: number
  cancellation_reason: string
  description: string
  evidence_url: string
  token_valid: boolean
  expires_in_hours: number
}

export default function ReviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const reservationId = params.id as string

  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !reservationId) {
      setError('Token e ID de reserva são requeridos')
      setLoading(false)
      return
    }

    const fetchReviewData = async () => {
      try {
        const response = await fetch(`/api/admin/review/${reservationId}?token=${token}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao buscar dados')
        }

        const reviewData = await response.json()
        setData(reviewData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchReviewData()
  }, [token, reservationId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
          <p className="text-center text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const errorMessages: { [key: string]: string } = {
      'Token inválido ou expirado': 'Este link de revisão expirou ou é inválido. Solicite um novo caso ao sistema.',
      'Erro ao buscar reserva': 'Não conseguimos encontrar os dados desta reserva. Verifique se o link está correto.',
      'default': error,
    }

    const displayMessage = errorMessages[error] || errorMessages['default']

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Erro ao Carregar Revisão</h2>
            <p className="text-red-700 mb-4">{displayMessage}</p>
            <details className="text-sm text-red-600 mt-3">
              <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
              <p className="mt-2 font-mono text-xs">{error}</p>
            </details>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
          <p className="text-center text-gray-600">Nenhum dado encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-2">Revisar Caso</h1>
        <p className="text-gray-600 mb-6">Expira em {data.expires_in_hours}h</p>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-600">Hóspede</p>
            <p className="font-semibold">{data.guest_name}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-600">Propriedade</p>
            <p className="font-semibold">{data.property_name}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-600">Datas</p>
            <p className="font-semibold">
              {new Date(data.check_in).toLocaleDateString('pt-PT')} —{' '}
              {new Date(data.check_out).toLocaleDateString('pt-PT')}
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
            <p className="text-sm text-gray-600">Problema Reportado</p>
            <p className="font-semibold">{data.description}</p>
            {data.evidence_url && (
              <p className="text-sm text-blue-600 mt-2">
                <a href={data.evidence_url} target="_blank" rel="noopener noreferrer">
                  Ver evidência
                </a>
              </p>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <p className="text-sm text-gray-600">Valor da Reserva</p>
            <p className="font-bold text-lg">€{data.total_amount.toFixed(2)}</p>
          </div>
        </div>

        <ReviewDecisionForm reservationId={data.reservation_id} token={token!} totalAmount={data.total_amount} />
      </div>
    </div>
  )
}
