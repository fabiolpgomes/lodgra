'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Step1Welcome } from '@/components/features/onboarding/Step1Welcome'
import { Step2Property } from '@/components/features/onboarding/Step2Property'
import { Step3ICalSetup } from '@/components/features/onboarding/Step3ICalSetup'
import { Step4BookingReady } from '@/components/features/onboarding/Step4BookingReady'
import { Logo } from '@/components/common/ui/Logo'
import { Button } from '@/components/common/ui/button'
import { type Plan } from '@/lib/billing/plans'

const STEPS = ['Empresa', 'Propriedade', 'Calendário', 'Página pronta']

export default function OnboardingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = (params?.locale as string) ?? 'pt-BR'
  const onboardingSessionId = searchParams.get('session_id') || undefined
  const [step, setStep] = useState(0)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [organizationCode, setOrganizationCode] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan>('essencial')
  const [propertyId, setPropertyId] = useState<string | undefined>()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [startedPendingOnboarding, setStartedPendingOnboarding] = useState(false)

  useEffect(() => {
    const setupUrl = onboardingSessionId
      ? `/api/organization/setup?session_id=${encodeURIComponent(onboardingSessionId)}`
      : '/api/organization/setup'

    fetch(setupUrl, { cache: 'no-store' })
      .then(async res => {
        setIsAuthenticated(res.status !== 401)
        if (!res.ok) return

        const data = await res.json()
        const org = data.organization

        if (org?.name && org.name !== 'Default') setOrgName(org.name)
        if (org?.slug && org.slug !== 'default') setOrgSlug(org.slug)
        if (data.organizationCode) setOrganizationCode(data.organizationCode)
        if (org?.subscription_plan) setSelectedPlan(org.subscription_plan as Plan)
        if (data.existingPropertyId) {
          setPropertyId(data.existingPropertyId)
          setStep(3)
        }
      })
      .catch(() => setIsAuthenticated(false))
  }, [onboardingSessionId])

  async function handleStep1Next() {
    if (!orgName.trim()) return

    setOrgLoading(true)
    setOrgError(null)

    try {
      const res = await fetch('/api/organization/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: orgName.trim(), session_id: onboardingSessionId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setOrgError(data.error || 'Erro ao guardar organização')
        return
      }

      setOrgSlug(data.slug)
      if (data.organizationCode) setOrganizationCode(data.organizationCode)
      if (data.existingPropertyId) {
        setPropertyId(data.existingPropertyId)
        setStep(3)
        return
      }

      setStep(1)
    } catch {
      setOrgError('Erro de ligação. Tente novamente.')
    } finally {
      setOrgLoading(false)
    }
  }

  function handleStep2Next(id: string) {
    setPropertyId(id)
    setStep(2)
  }

  async function handleFinish() {
    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      // Se já tem subscrição ativa (pagou via landing page), activar conta e ir ao dashboard
      const setupUrl = onboardingSessionId
        ? `/api/organization/setup?session_id=${encodeURIComponent(onboardingSessionId)}`
        : '/api/organization/setup'
      const setupRes = await fetch(setupUrl, { cache: 'no-store' })
      const setupData = setupRes.ok ? await setupRes.json() : null
      const orgStatus = setupData?.organization?.subscription_status

      if (orgStatus === 'active' || orgStatus === 'trialing') {
        if (!onboardingSessionId) {
          await fetch('/api/user/complete-onboarding', { method: 'POST' })
        }
        setStep(3)
        setCheckoutLoading(false)
        return
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          source: 'onboarding',
          locale,
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutError(data.error || 'Erro ao iniciar checkout')
        setCheckoutLoading(false)
      }
    } catch {
      setCheckoutError('Erro de ligação. Tente novamente.')
      setCheckoutLoading(false)
    }
  }

  async function handleGoToDashboard() {
    setCheckoutLoading(true)
    if (onboardingSessionId) {
      window.location.href = `/${locale}/onboarding?session_id=${encodeURIComponent(onboardingSessionId)}`
      return
    }
    await fetch('/api/user/complete-onboarding', { method: 'POST' })
    window.location.href = `/${locale}/dashboard`
  }

  // A verificar autenticação
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  // Não autenticado — mostrar confirmação pós-pagamento sem opções de login.
  if (!isAuthenticated) {
    if (startedPendingOnboarding) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <header className="bg-white border-b border-gray-100 py-4 px-6">
            <div className="max-w-2xl mx-auto flex items-center">
              <Logo size="md" />
            </div>
          </header>

          <div className="bg-white border-b border-gray-100 py-4 px-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                          i === 0
                            ? 'bg-brand-100 text-brand-600 border-2 border-brand-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className={`text-sm font-medium hidden sm:block ${i === 0 ? 'text-brand-600' : 'text-gray-500'}`}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="h-px flex-1 bg-gray-200" style={{ minWidth: 24 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <main className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-lg">
              <Step1Welcome
                orgName={orgName}
                onOrgNameChange={setOrgName}
                onNext={() => {}}
                loading={false}
                error={null}
                buttonLabel="Aguardando ativação da conta"
                buttonDisabled
              />
              <p className="mt-5 text-center text-xs text-gray-600">
                O pagamento já foi recebido. A Lodgra está preparando o acesso administrativo vinculado ao e-mail usado no checkout.
              </p>
            </div>
          </main>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Logo size="lg" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento concluído!</h2>
              <p className="text-gray-600 text-sm">
                Vamos iniciar o onboarding da sua conta em 4 etapas simples.
              </p>
            </div>

            <div className="space-y-3">
              {STEPS.map((label, index) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-600">
                      {index === 0 && 'Nome da organização e subdomínio de reserva direta.'}
                      {index === 1 && 'Cadastro da primeira propriedade.'}
                      {index === 2 && 'Conexão e sincronização do calendário.'}
                      {index === 3 && 'Página de reserva direta pronta para vender.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setStartedPendingOnboarding(true)}
              className="w-full mb-6"
            >
              Iniciar onboarding
            </Button>

            <p className="mt-6 text-center text-sm text-gray-600">
              Clique acima para configurar sua organização e publicar sua primeira página de reserva direta.
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
        <div className="max-w-2xl mx-auto flex items-center">
          <Logo size="md" />
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
                        ? 'bg-brand-600 text-white'
                        : i === step
                        ? 'bg-brand-100 text-brand-600 border-2 border-brand-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      i === step ? 'text-brand-600' : i < step ? 'text-gray-700' : 'text-gray-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 ${i < step ? 'bg-brand-600' : 'bg-gray-200'}`} style={{ minWidth: 24 }} />
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
              onOrgNameChange={setOrgName}
              onNext={handleStep1Next}
              loading={orgLoading}
              error={orgError}
              organizationCode={organizationCode}
            />
          )}
          {step === 1 && (
            <Step2Property
              onNext={handleStep2Next}
              onSkip={() => setStep(2)}
              onContinueExisting={() => setStep(3)}
              onboardingSessionId={onboardingSessionId}
            />
          )}
          {step === 2 && (
            <Step3ICalSetup
              propertyId={propertyId}
              onFinish={handleFinish}
              checkoutLoading={checkoutLoading}
              checkoutError={checkoutError}
              onboardingSessionId={onboardingSessionId}
            />
          )}
          {step === 3 && (
            <Step4BookingReady
              orgName={orgName}
              orgSlug={orgSlug}
              onDashboard={handleGoToDashboard}
              dashboardLoading={checkoutLoading}
            />
          )}
        </div>
      </main>
    </div>
  )
}
