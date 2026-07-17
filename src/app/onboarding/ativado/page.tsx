'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Logo } from '@/components/common/ui/Logo'

const STEPS = [
  {
    title: 'Empresa',
    description: 'Nome da organização e subdomínio de reserva direta.',
  },
  {
    title: 'Propriedade',
    description: 'Cadastro da primeira propriedade.',
  },
  {
    title: 'Calendário',
    description: 'Conexão e sincronização do calendário.',
  },
  {
    title: 'Página pronta',
    description: 'Página de reserva direta pronta para vender.',
  },
]

export default function OnboardingAtivadoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [redirecting, setRedirecting] = useState(false)
  const locale = searchParams.get('locale') || 'pt-BR'
  const sessionId = searchParams.get('session_id')
  const onboardingUrl = sessionId
    ? `/${locale}/onboarding?session_id=${encodeURIComponent(sessionId)}`
    : `/${locale}/onboarding`

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--be-blue-pale)] to-[color:var(--be-blue-light)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        <div className="flex justify-center mb-4">
          <div className="p-3 bg-green-100 rounded-full">
            <Check className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pagamento concluído!
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Vamos iniciar o onboarding da sua conta em 4 etapas simples.
        </p>

        <div className="space-y-3 mb-6">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--be-blue-pale)] text-sm font-bold text-[color:var(--be-blue-hover)]">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={() => {
            setRedirecting(true)
            router.push(onboardingUrl)
          }}
          disabled={redirecting}
          className="w-full font-semibold py-3 rounded-lg"
        >
          {redirecting ? 'Iniciando onboarding...' : 'Iniciar onboarding'}
        </Button>

        <p className="text-xs text-gray-500 mt-6">
          Clique acima para configurar sua organização e publicar sua primeira página de reserva direta.
        </p>
      </div>
    </div>
  )
}
