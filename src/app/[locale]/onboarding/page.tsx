'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import Link from 'next/link'
import { Step1Welcome } from '@/components/features/onboarding/Step1Welcome'
import { Step2Property } from '@/components/features/onboarding/Step2Property'
import { Step3ICalSetup } from '@/components/features/onboarding/Step3ICalSetup'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { createClient } from '@/lib/supabase/client'
import { Home } from 'lucide-react'
import { type Plan } from '@/lib/billing/plans'

const STEPS = ['Bem-vindo', 'Propriedade', 'Calendário']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [orgName, setOrgName] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan>('starter')
  const [propertyId, setPropertyId] = useState<string | undefined>()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user)
    })
  }, [])

  async function handleStep1Next() {
    // Actualizar nome da organização e plano selecionado
    if (orgName.trim()) {
      try {
        await fetch('/api/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: orgName.trim(),
            plan: selectedPlan,
          }),
        })
      } catch {
        // Ignorar erro — prosseguir de qualquer forma
      }
    }
    setStep(1)
  }

  function handleStep2Next(id: string) {
    setPropertyId(id)
    setStep(2)
  }

  async function handleFinish() {
    // Promover usuário para admin ao completar onboarding
    try {
      await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Erro ao completar onboarding:', error)
      // Continuar de qualquer forma (não bloquear por erro)
    }

    router.push('/')
    router.refresh()
  }

  // A verificar autenticação
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Não autenticado — mostrar ecrã de criação de conta
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Home className="h-10 w-10 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Lodgra</h1>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento concluído!</h2>
              <p className="text-gray-600 text-sm">
                Entre na sua conta para continuar a configuração.
              </p>
            </div>
            <SocialLoginButtons next="/onboarding" />
            <p className="text-center text-sm text-gray-500 mt-4">
              Prefere email e password?{' '}
              <Link href="/login?next=/onboarding" className="text-blue-600 hover:underline font-medium">
                Entrar aqui
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <Home className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900 text-lg">Lodgra</span>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      i < step
                        ? 'bg-blue-600 text-white'
                        : i === step
                        ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      i === step ? 'text-blue-600' : i < step ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} style={{ minWidth: 24 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-lg">
          {step === 0 && (
            <Step1Welcome
              orgName={orgName}
              selectedPlan={selectedPlan}
              onOrgNameChange={setOrgName}
              onPlanChange={setSelectedPlan}
              onNext={handleStep1Next}
            />
          )}
          {step === 1 && (
            <Step2Property
              onNext={handleStep2Next}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step3ICalSetup
              propertyId={propertyId}
              onFinish={handleFinish}
            />
          )}
        </div>
      </main>
    </div>
  )
}
