'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { PLAN_DISPLAY, PLAN_PRICES, formatPlanPrice, type BillingCurrency } from '@/lib/billing/plans'

export default function SubscribePage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [currency, setCurrency] = useState<BillingCurrency>('brl')

  async function handlePlanCheckout(planId: string) {
    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, currency }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erro ao iniciar checkout')
      }
    } catch {
      alert('Erro ao iniciar checkout')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-10">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Acesso suspenso</p>
            <p className="text-sm text-red-700">
              A sua subscrição foi cancelada ou o pagamento falhou. Escolha um plano abaixo para continuar.
            </p>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Escolha o seu plano</h1>
        <p className="text-gray-600 text-center mb-4">Retome o acesso imediatamente após o pagamento.</p>
        <div className="flex justify-center gap-2 mb-10">
          {(['brl', 'eur'] as BillingCurrency[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                currency === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {c === 'brl' ? 'R$ Real' : '€ Euro'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLAN_DISPLAY.map(plan => {
            const price = PLAN_PRICES[plan.id][currency]
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-sm border-2 p-6 flex flex-col relative ${
                  plan.highlighted ? 'border-brand-500 shadow-md' : 'border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[color:var(--be-blue-pale)]0 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Mais escolhido
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  <p className="text-sm text-gray-600 mt-0.5 leading-snug">{plan.description}</p>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">{formatPlanPrice(price.monthly, currency)}</span>
                    <span className="text-gray-600 text-xs">/mês</span>
                  </div>
                  <span className="inline-block mt-1 text-xs text-gray-600">
                    + {formatPlanPrice(price.extraProperty, currency)}/mês por propriedade adicional
                  </span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-[color:var(--be-blue)] shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePlanCheckout(plan.id)}
                  disabled={loadingPlan !== null}
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  {loadingPlan === plan.id ? '...' : <>Começar agora <ArrowRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </div>
            )
          })}
        </div>

        <p className="text-center mt-8 text-sm text-gray-600">
          Já tem conta?{' '}
          <Link href="/login" className="text-[color:var(--be-blue)] hover:underline">
            Entrar com outra conta
          </Link>
        </p>
      </div>
    </div>
  )
}
