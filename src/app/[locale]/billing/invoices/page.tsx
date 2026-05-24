'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'

interface Invoice {
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
}

export default function InvoicesPage() {
  const locale = useLocale()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all')

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch('/api/billing/invoices')
        if (!res.ok) throw new Error('Failed to fetch invoices')
        const data = await res.json()
        setInvoices(data.invoices || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [])

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

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'paid') return invoice.status === 'paid'
    if (filter === 'pending') return invoice.status !== 'paid'
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando faturas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar faturas: {error}</p>
          <Link href={`/${locale}/billing`} className="text-blue-600 hover:text-blue-700">
            Voltar ao Faturamento
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href={`/${locale}/billing`} className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Voltar ao Faturamento
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Todas as Faturas</h1>
          <p className="text-gray-600">Histórico completo de faturas e pagamentos</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas ({invoices.length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'paid'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pagas ({invoices.filter((i) => i.status === 'paid').length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pendentes ({invoices.filter((i) => i.status !== 'paid').length})
          </button>
        </div>

        {/* Invoices Table */}
        {filteredInvoices.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.created).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.due_date
                          ? new Date(invoice.due_date).toLocaleDateString('pt-PT')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                        {(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        {invoice.pdf_url && (
                          <a
                            href={invoice.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            PDF
                          </a>
                        )}
                        <Link
                          href={`/${locale}/billing/invoices/${invoice.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">Nenhuma fatura encontrada</p>
            <Link href={`/${locale}/billing`} className="text-blue-600 hover:text-blue-700">
              Voltar ao Faturamento
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
