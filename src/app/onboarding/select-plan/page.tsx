'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/common/ui/button'

interface Plan {
  id: 'essencial' | 'expansao' | 'premium'
  name: string
  price: number
  period: string
  description: string
  properties: string
  features: string[]
}

const PLANS: Plan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: 59,
    period: '/mês',
    description: 'Saia da planilha. Controle uma unidade com lucro claro.',
    properties: '1 unidade incluída',
    features: [
      'Motor de Reserva Direta',
      'Sync iCal',
      'Calendário unificado',
      'Gestão básica de reservas',
      'Dashboard de lucros',
      'Suporte por email',
    ],
  },
  {
    id: 'expansao',
    name: 'Expansão',
    price: 149,
    period: '/mês',
    description: 'Coordene sem caos. Até 3 unidades e automações de limpeza.',
    properties: '3 unidades incluídas',
    features: [
      'Tudo do Essencial',
      'Portal de Limpadores (WhatsApp)',
      'Relatórios por Proprietário',
      'Equipe até 5 pessoas',
      'Automação de workflows',
      'Suporte por chat e email',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 397,
    period: '/mês',
    description: 'Automatize operação e receita. Inteligência para grandes portfólios.',
    properties: '10 unidades incluídas',
    features: [
      'Tudo do Expansão',
      'API Completa',
      'Forecast & BI Avançado',
      'Gerente Dedicado',
      'Unidades extras sob demanda',
      'Suporte prioritário 24/7',
    ],
  },
]

export default function SelectPlanPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<'essencial' | 'expansao' | 'premium'>('expansao')
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectPlan = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          source: 'onboarding',
          currency: 'brl',
        }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error redirecting to checkout:', error)
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[color:var(--be-blue-pale)] to-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Escolha seu plano
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comece com o plano que melhor se adequa às suas necessidades. Você pode fazer upgrade ou downgrade a qualquer momento.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`rounded-lg border-2 p-8 cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'border-brand-900 bg-[color:var(--be-blue-pale)] ring-2 ring-brand-900'
                  : 'border-gray-200 bg-white hover:border-brand-500'
              } ${plan.id === 'expansao' ? 'md:scale-105 md:shadow-xl' : ''}`}
            >
              {/* Badge for recommended */}
              {plan.id === 'expansao' && (
                <div className="mb-4">
                  <span className="inline-block bg-brand-900 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Recomendado
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-2xl font-bold mb-2 text-gray-900">{plan.name}</h3>
              <p className="text-gray-600 mb-6 text-sm">{plan.description}</p>

              {/* Price */}
              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-900">
                  R${plan.price}
                  <span className="text-lg text-gray-600 font-normal">{plan.period}</span>
                </div>
              </div>

              {/* Properties Included */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{plan.properties}</p>
                <p className="text-xs text-gray-600 mt-1">+R$49 por unidade extra</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Selection Indicator */}
              <div
                className={`h-1 rounded-full transition-all ${
                  selectedPlan === plan.id ? 'bg-brand-900 h-2' : 'bg-gray-200'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <Button
            onClick={handleSelectPlan}
            disabled={isLoading}
            className="flex-1 bg-brand-900 hover:bg-brand-800 text-white font-semibold py-3 rounded-lg"
          >
            {isLoading ? 'Redirecionando...' : `Começar com ${PLANS.find(p => p.id === selectedPlan)?.name}`}
          </Button>
          <button
            onClick={handleSkip}
            className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
          >
            Pular por enquanto
          </button>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-600 text-sm mt-8">
          Teste grátis por 7 dias. Sem cartão de crédito necessário. Cancelar a qualquer momento.
        </p>
      </div>
    </main>
  )
}
