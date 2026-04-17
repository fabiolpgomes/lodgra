'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { PLAN_DISPLAY } from '@/lib/billing/plans'

export default function SubscribePage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handlePlanCheckout(planId: string) {
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
      <div className="max-w-4xl mx-auto">
        {/* Alert banner */}
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

        {/* 3 Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLAN_DISPLAY.map(plan => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-sm border-2 p-6 flex flex-col relative ${
                plan.highlighted ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Mais popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-extrabold text-gray-900">€{plan.price}</span>
                <span className="text-gray-500 text-sm">/mês</span>
              </div>
              <p className="text-xs text-gray-500 mb-5">{plan.properties}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
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
                  <>Começar agora <ArrowRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          ))}
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
