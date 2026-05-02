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

      <h1 className="text-3xl font-bold text-lodgra-blue mb-2" style={{ fontFamily: 'var(--font-poppins, Poppins, sans-serif)' }}>Bem-vindo ao Lodgra!</h1>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Configure a sua conta em 3 passos rápidos e comece a gerir os seus imóveis hoje.
      </p>

      {/* Seleção de Plano */}
      <div className="mb-8">
        <Label className="block text-sm font-medium text-gray-700 mb-3 text-left max-w-2xl mx-auto">
          Escolha o seu plano
        </Label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto mb-4 pt-4">
          {PLAN_DISPLAY.filter(p => !p.enterprise).map((plan) => (
            <button
              key={plan.id}
              onClick={() => onPlanChange(plan.id as Plan)}
              className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                selectedPlan === plan.id
                  ? 'border-lodgra-blue bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${plan.highlighted ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
            >
              {selectedPlan === plan.id && (
                <div className="absolute top-2 right-2 bg-lodgra-blue text-white rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}
              {plan.highlighted && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-lodgra-blue text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                  Mais escolhido
                </span>
              )}
              <p className="font-semibold text-gray-900">{plan.name}</p>
              <p className="text-xs text-gray-500 mb-2 leading-snug">{plan.description}</p>
              <p className="text-base font-bold text-lodgra-blue">€{plan.price}</p>
              <p className="text-[10px] text-gray-500 mb-2">/unidade/mês</p>
              <ul className="text-xs text-gray-600 space-y-0.5">
                {plan.features.slice(0, 2).map((f) => (
                  <li key={f}>• {f}</li>
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
