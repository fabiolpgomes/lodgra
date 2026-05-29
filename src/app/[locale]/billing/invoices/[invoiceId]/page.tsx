'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface InvoiceLine {
  description: string
  amount: number
  currency: string
  period: {
    start: string
    end: string
  }
}

interface InvoiceDetail {
  id: string
  number: string
  amount_paid: number
  amount_due: number
  currency: string
  status: string
  created: string
  due_date: string | null
  pdf_url: string
  paid_at: string | null
  subscription_id: string
  lines: InvoiceLine[]
}

export default function InvoiceDetailPage() {
  const locale = useLocale()
  const params = useParams()
  const invoiceId = params.invoiceId as string

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/billing/invoices/${invoiceId}`)
        if (!res.ok) throw new Error('Failed to fetch invoice')
        const data = await res.json()
        setInvoice(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (invoiceId) fetchInvoice()
  }, [invoiceId])

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'open':
        return 'bg-yellow-100 text-yellow-800'
      case 'void':
        return 'bg-gray-100 text-gray-800'
      case 'uncollectible':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago'
      case 'open':
        return 'Pendente'
      case 'void':
        return 'Anulado'
      case 'uncollectible':
        return 'Não Cobrável'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando fatura...</p>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar fatura: {error}</p>
          <Link href={`/${locale}/billing/invoices`} className="text-brand-600 hover:text-brand-700">
            Voltar à Lista de Faturas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href={`/${locale}/billing/invoices`} className="text-brand-600 hover:text-brand-700 mb-4 inline-block">
          ← Voltar à Lista de Faturas
        </Link>

        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="border-b border-gray-200 p-6 sm:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Fatura {invoice.number}</h1>
                <p className="text-gray-600">ID: {invoice.id}</p>
              </div>
              <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusBadgeColor(invoice.status)}`}>
                {getStatusLabel(invoice.status)}
              </span>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase mb-4">Detalhes</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-gray-600">Data de Emissão</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {new Date(invoice.created).toLocaleDateString('pt-PT')}
                    </dd>
                  </div>
                  {invoice.due_date && (
                    <div>
                      <dt className="text-sm text-gray-600">Data de Vencimento</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {new Date(invoice.due_date).toLocaleDateString('pt-PT')}
                      </dd>
                    </div>
                  )}
                  {invoice.paid_at && (
                    <div>
                      <dt className="text-sm text-gray-600">Data de Pagamento</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {new Date(invoice.paid_at).toLocaleDateString('pt-PT')}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase mb-4">Valores</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-gray-600">Valor Pago</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                    </dd>
                  </div>
                  {invoice.amount_due > 0 && (
                    <div>
                      <dt className="text-sm text-gray-600">Valor Devido</dt>
                      <dd className="text-lg font-semibold text-red-600">
                        {(invoice.amount_due / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Line Items */}
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Itens da Fatura</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Período
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-4 text-sm text-gray-900">{line.description}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(line.period.start).toLocaleDateString('pt-PT')} —{' '}
                          {new Date(line.period.end).toLocaleDateString('pt-PT')}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">
                          {(line.amount / 100).toFixed(2)} {line.currency.toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            <div className="mt-8 flex justify-end">
              <div className="text-right">
                <div className="flex gap-8 items-baseline">
                  <span className="text-gray-600">Total:</span>
                  <span className="text-3xl font-bold text-gray-900">
                    {(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 border-t border-gray-200 pt-8 flex gap-4">
              {invoice.pdf_url && (
                <a
                  href={invoice.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-medium"
                >
                  Baixar PDF
                </a>
              )}
              <Link
                href={`/${locale}/billing/invoices`}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
