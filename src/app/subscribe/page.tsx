'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { PLAN_DISPLAY } from '@/lib/billing/plans'

const FEE_LABELS: Record<string, string> = {
  growth: '+ €1 por reserva',
  pro:    '+ 1% da receita',
}

export default function SubscribePage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handlePlanCheckout(planId: string) {
    if (planId === 'enterprise') {
      window.location.href = '/register'
      return
    }
    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
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
        <p className="text-gray-500 text-center mb-10">Retome o acesso imediatamente após o pagamento.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLAN_DISPLAY.map(plan => {
            const feeLabel = FEE_LABELS[plan.id]
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-sm border-2 p-6 flex flex-col relative ${
                  plan.highlighted
                    ? 'border-blue-500 shadow-md'
                    : plan.enterprise
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Mais escolhido
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">{plan.description}</p>
                </div>

                {plan.enterprise ? (
                  <div className="mb-5">
                    <span className="text-2xl font-extrabold text-gray-900">Custom</span>
                  </div>
                ) : (
                  <div className="mb-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">€{plan.price}</span>
                      <span className="text-gray-500 text-xs">/unidade/mês</span>
                    </div>
                    {feeLabel && (
                      <span className="inline-block mt-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {feeLabel}
                      </span>
                    )}
                  </div>
                )}

                {!plan.enterprise && <div className="mb-4" />}

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
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
                  {loadingPlan === plan.id ? '...' : (
                    plan.enterprise
                      ? <>Falar com a equipa <ArrowRight className="h-4 w-4 ml-1" /></>
                      : <>Começar agora <ArrowRight className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          Já tem conta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Entrar com outra conta
          </Link>
        </p>
      </div>
    </div>
  )
}
