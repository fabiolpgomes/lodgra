'use client'

import { Home, Calendar, BarChart3, Check } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Logo } from '@/components/common/ui/Logo'
import { PLAN_DISPLAY, type Plan } from '@/lib/billing/plans'

interface Props {
  orgName: string
  selectedPlan: Plan
  onOrgNameChange: (v: string) => void
  onPlanChange: (plan: Plan) => void
  onNext: () => void
}

export function Step1Welcome({ orgName, selectedPlan, onOrgNameChange, onPlanChange, onNext }: Props) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <Logo size="lg" />
      </div>

      <h1 className="text-3xl font-bold text-lodgra-blue mb-2" style={{ fontFamily: 'var(--font-poppins, Poppins, sans-serif)' }}>Bem-vindo à Lodgra!</h1>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Configure a sua conta em 3 passos rápidos e comece a gerir os seus imóveis hoje.
      </p>

      {/* Seleção de Plano */}
      <div className="mb-8">
        <Label className="block text-sm font-medium text-gray-700 mb-6 text-left max-w-4xl mx-auto">
          Escolha o seu plano
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto mb-4 pt-4 px-4 md:px-0">
          {PLAN_DISPLAY.filter(p => !p.enterprise).map((plan) => (
            <button
              key={plan.id}
              onClick={() => onPlanChange(plan.id as Plan)}
              className={`relative rounded-xl border-2 p-6 text-left transition-all duration-200 transform ${
                selectedPlan === plan.id
                  ? 'border-lodgra-blue bg-blue-50 scale-100 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-lodgra-blue hover:shadow-xl hover:scale-105'
              } ${plan.highlighted ? 'ring-2 ring-lodgra-blue ring-offset-2' : ''}`}
            >
              {selectedPlan === plan.id && (
                <div className="absolute top-3 right-3 bg-lodgra-blue text-white rounded-full p-1.5 shadow-md">
                  <Check className="h-5 w-5" />
                </div>
              )}
              {plan.highlighted && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-lodgra-blue text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                  Mais escolhido
                </span>
              )}
              <div className="mb-4">
                <p className="font-bold text-lg text-gray-900">{plan.name}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{plan.description}</p>
              </div>

              <div className="mb-5 pb-5 border-b border-gray-200">
                <p className="text-3xl font-bold text-lodgra-blue">€{plan.price}</p>
                <p className="text-xs text-gray-500 mt-1">/unidade/mês</p>
              </div>

              <ul className="text-sm text-gray-700 space-y-2">
                {plan.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex items-start">
                    <span className="text-lodgra-blue mr-2 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      {/* O que vem a seguir */}
      <div className="grid grid-cols-3 gap-3 mb-8 text-left max-w-2xl mx-auto">
        {[
          { icon: Home, color: 'blue', step: '1', label: 'Adicionar imóvel', desc: 'Nome e endereço' },
          { icon: Calendar, color: 'purple', step: '2', label: 'Ligar calendário', desc: 'URL iCal do Airbnb' },
          { icon: BarChart3, color: 'green', step: '3', label: 'Ver lucro', desc: 'Dashboard pronto' },
        ].map(({ icon: Icon, color, step, label, desc }) => (
          <div key={step} className={`bg-${color}-50 rounded-xl p-3 border border-${color}-100`}>
            <div className={`p-2 bg-${color}-100 rounded-lg inline-flex mb-2`}>
              <Icon className={`h-4 w-4 text-${color}-600`} />
            </div>
            <p className="text-xs font-semibold text-gray-700">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Nome da organização */}
      <div className="text-left max-w-2xl mx-auto mb-6">
        <Label htmlFor="org-name" className="block text-sm font-medium text-gray-700 mb-1">
          Como chama o seu negócio?
        </Label>
        <Input
          id="org-name"
          type="text"
          value={orgName}
          onChange={e => onOrgNameChange(e.target.value)}
          placeholder="Ex: Alojamentos Silva"
        />
        <p className="text-xs text-gray-400 mt-1">
          Pode ser o seu nome, o nome da empresa ou o nome dos seus imóveis.
        </p>
      </div>

      <Button
        onClick={onNext}
        disabled={!orgName.trim()}
        className="w-full max-w-sm"
      >
        Continuar →
      </Button>
    </div>
  )
}
