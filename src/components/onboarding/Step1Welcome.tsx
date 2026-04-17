'use client'

import { Home, Calendar, BarChart3, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        <div className="p-4 bg-blue-100 rounded-full">
          <Home className="h-10 w-10 text-blue-600" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo ao Lodgra!</h1>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Configure a sua conta em 3 passos rápidos e comece a gerir os seus imóveis hoje.
      </p>

      {/* Seleção de Plano */}
      <div className="mb-8">
        <Label className="block text-sm font-medium text-gray-700 mb-3 text-left max-w-2xl mx-auto">
          Escolha o seu plano
        </Label>
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-4">
          {PLAN_DISPLAY.map((plan) => (
            <button
              key={plan.id}
              onClick={() => onPlanChange(plan.id as Plan)}
              className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                selectedPlan === plan.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${plan.highlighted ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
            >
              {selectedPlan === plan.id && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <p className="font-semibold text-gray-900">{plan.name}</p>
              <p className="text-sm text-gray-500 mb-2">{plan.description}</p>
              <p className="text-lg font-bold text-blue-600 mb-2">€{plan.price}/mês</p>
              <p className="text-xs text-gray-600 mb-3">{plan.properties}</p>
              <ul className="text-xs text-gray-600 space-y-1">
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
