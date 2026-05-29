'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'

interface Subscription {
  subscription_id: string | null
  plan: string | null
  status: string
  current_period_end: string
  trial_end: string | null
  trial_days_remaining: number | null
  items: Array<{ price_id: string; product: string }>
}

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

export default function BillingPage() {
  const router = useRouter()
  const locale = useLocale()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [subRes, invoiceRes] = await Promise.all([
          fetch('/api/billing/subscription'),
          fetch('/api/billing/invoices'),
        ])

        if (!subRes.ok || !invoiceRes.ok) {
          throw new Error('Failed to fetch billing data')
        }

        const subData = await subRes.json()
        const invoiceData = await invoiceRes.json()

        setSubscription(subData)
        setInvoices(invoiceData.invoices || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const planNames: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'text-green-600'
      case 'past_due':
        return 'text-red-600'
      case 'canceled':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'trialing':
        return 'Em Período de Teste'
      case 'active':
        return 'Ativo'
      case 'past_due':
        return 'Vencido'
      case 'canceled':
        return 'Cancelado'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando dados de faturamento...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar dados: {error}</p>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Faturamento</h1>

        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sua Subscrição</h2>

          {subscription && subscription.subscription_id ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Plano Atual</p>
                  <p className="text-lg font-semibold">
                    {planNames[subscription.plan ?? ''] || subscription.plan || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`text-lg font-semibold ${getStatusColor(subscription.status)}`}>
                    {getStatusLabel(subscription.status)}
                  </p>
                </div>
                {subscription.trial_days_remaining !== null && subscription.trial_days_remaining > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Dias de Teste Restantes</p>
                    <p className="text-lg font-semibold text-brand-600">
                      {subscription.trial_days_remaining} dias
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Próxima Renovação</p>
                  <p className="text-lg font-semibold">
                    {new Date(subscription.current_period_end).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>

              <Link
                href={`/${locale}/billing/subscription`}
                className="inline-block px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
              >
                Alterar Plano
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Você não tem uma subscrição ativa</p>
              <Link
                href={`/${locale}/billing/subscription`}
                className="inline-block px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
              >
                Escolher Plano
              </Link>
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Faturas Recentes</h2>
            <Link
              href={`/${locale}/billing/invoices`}
              className="text-brand-600 hover:text-brand-700 text-sm"
            >
              Ver Todas →
            </Link>
          </div>

          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.slice(0, 5).map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.created).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded text-white text-xs font-medium ${
                            invoice.status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'
                          }`}
                        >
                          {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {invoice.pdf_url && (
                          <a
                            href={invoice.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:text-brand-700"
                          >
                            PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">Nenhuma fatura ainda</p>
          )}
        </div>
      </div>
    </div>
  )
}
