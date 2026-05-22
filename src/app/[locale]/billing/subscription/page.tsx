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
}

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  description: string
  features: string[]
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 59,
    currency: 'BRL',
    description: 'Para começar',
    features: [
      'Até 5 propriedades',
      'Sincronização básica',
      'Calendário unificado',
      'Suporte por email',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 89,
    currency: 'BRL',
    description: 'Para crescer',
    features: [
      'Propriedades ilimitadas',
      'Sincronização em tempo real',
      'Automações',
      'Relatórios financeiros',
      'Suporte prioritário',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 130,
    currency: 'BRL',
    description: 'Para escalar',
    features: [
      'Tudo do Professional',
      'API completa',
      'Onboarding dedicado',
      'SLA garantido',
      'Suporte 24/7',
    ],
  },
]

export default function SubscriptionPage() {
  const router = useRouter()
  const locale = useLocale()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch('/api/billing/subscription')
        if (!res.ok) throw new Error('Failed to fetch subscription')
        const data = await res.json()
        setSubscription(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [])

  const handlePlanChange = async (planId: string) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const method = subscription?.subscription_id ? 'PUT' : 'POST'
      const res = await fetch('/api/billing/subscription', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to update subscription')
      }

      const data = await res.json()
      setSubscription(data)
      const planName = PLANS.find((p) => p.id === planId)?.name || planId
      setSuccess(`Plano alterado para ${planName}`)

      setTimeout(() => {
        router.push(`/${locale}/billing`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando planos...</p>
      </div>
    )
  }

  const currentPlan = subscription?.plan

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href={`/${locale}/billing`} className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Voltar ao Faturamento
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Escolher Plano</h1>
          <p className="text-gray-600">
            {currentPlan
              ? 'Altere seu plano a qualquer momento. Cobranças pro-rata serão aplicadas.'
              : 'Escolha um plano para começar. Incluindo 14 dias de avaliação gratuita.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-lg overflow-hidden transition-transform ${
                currentPlan === plan.id ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">/{plan.currency}/mês</span>
                </div>

                {currentPlan === plan.id ? (
                  <div className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium text-center mb-6">
                    Plano Atual
                  </div>
                ) : (
                  <button
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-6"
                  >
                    {isSubmitting ? 'Processando...' : 'Escolher'}
                  </button>
                )}

                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Funcionalidades:</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg
                          className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {subscription?.subscription_id && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações da Subscrição Atual</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Próxima Cobrança</p>
                <p className="text-lg font-semibold">
                  {new Date(subscription.current_period_end).toLocaleDateString('pt-PT')}
                </p>
              </div>
              {subscription.trial_days_remaining !== null && subscription.trial_days_remaining > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Dias de Teste Restantes</p>
                  <p className="text-lg font-semibold text-blue-600">{subscription.trial_days_remaining} dias</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
