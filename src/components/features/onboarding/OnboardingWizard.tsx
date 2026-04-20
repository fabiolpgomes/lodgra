'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Home, Wifi, PartyPopper, User2 } from 'lucide-react'
import { Button } from '@/components/common/ui/button'

type ProfileType = 'own' | 'third_party' | 'both'
type PropertyCount = '1' | '2' | '3' | '4-5'

interface Step1Data {
  profileType: ProfileType | null
  propertyCount: PropertyCount | null
}

interface Step2Data {
  propertyName: string
  city: string
  currency: string
  pricePerNight: string
}

interface Step3Data {
  airbnbIcal: string
  bookingIcal: string
  vrboIcal: string
}

interface OnboardingWizardProps {
  locale: string
}

const STEPS = [
  { icon: User2, label: 'Perfil' },
  { icon: Home, label: 'Imóvel' },
  { icon: Wifi, label: 'Canais' },
  { icon: PartyPopper, label: 'Pronto' },
]

const CURRENCIES = [
  { value: 'BRL', label: 'R$ (BRL)' },
  { value: 'EUR', label: '€ (EUR)' },
  { value: 'USD', label: '$ (USD)' },
]

export function OnboardingWizard({ locale }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdPropertyName, setCreatedPropertyName] = useState('')

  const [step1, setStep1] = useState<Step1Data>({ profileType: null, propertyCount: null })
  const [step2, setStep2] = useState<Step2Data>({ propertyName: '', city: '', currency: 'BRL', pricePerNight: '' })
  const [step3, setStep3] = useState<Step3Data>({ airbnbIcal: '', bookingIcal: '', vrboIcal: '' })

  async function handleStep2Submit() {
    if (!step2.propertyName.trim() || !step2.city.trim()) {
      setError('Nome e cidade são obrigatórios')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: step2.propertyName.trim(),
          city: step2.city.trim(),
          currency: step2.currency,
          base_price: step2.pricePerNight ? Number(step2.pricePerNight) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar imóvel')
      }
      setCreatedPropertyName(step2.propertyName.trim())
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep3Submit(skip = false) {
    if (skip) { setStep(3); return }
    const channels = [
      { url: step3.airbnbIcal, name: 'Airbnb' },
      { url: step3.bookingIcal, name: 'Booking' },
      { url: step3.vrboIcal, name: 'VRBO' },
    ].filter(c => c.url.trim())

    if (channels.length === 0) { setStep(3); return }

    setLoading(true)
    setError(null)
    try {
      await Promise.allSettled(
        channels.map(c =>
          fetch('/api/ical/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ical_url: c.url.trim(), channel_name: c.name }),
          })
        )
      )
    } catch {
      // fail-open: sync errors don't block onboarding
    } finally {
      setLoading(false)
      setStep(3)
    }
  }

  function handleFinish() {
    router.push(`/${locale}/dashboard`)
  }

  const canAdvanceStep1 = step1.profileType !== null && step1.propertyCount !== null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = i < step
            const active = i === step
            return (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    done ? 'bg-lodgra-primary text-white' :
                    active ? 'bg-lodgra-primary/10 border-2 border-lodgra-primary text-lodgra-primary' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${active ? 'text-lodgra-primary' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-16 sm:w-24 mx-2 mb-5 transition-colors ${i < step ? 'bg-lodgra-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 sm:p-8">

          {/* Step 0: Perfil */}
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Bem-vindo(a) à Lodgra! 🏠</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Vamos configurar sua conta em menos de 15 minutos.</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Qual é o seu perfil?
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'own' as ProfileType, label: '🏠 Tenho imóveis próprios' },
                    { value: 'third_party' as ProfileType, label: '🤝 Administro imóveis de terceiros' },
                    { value: 'both' as ProfileType, label: '✨ Os dois' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStep1(s => ({ ...s, profileType: opt.value }))}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        step1.profileType === opt.value
                          ? 'border-lodgra-primary bg-lodgra-primary/5 text-lodgra-primary font-medium'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Quantos imóveis você gerencia?
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(['1', '2', '3', '4-5'] as PropertyCount[]).map(n => (
                    <button
                      key={n}
                      onClick={() => setStep1(s => ({ ...s, propertyCount: n }))}
                      className={`py-3 rounded-xl border-2 font-semibold text-lg transition-all ${
                        step1.propertyCount === n
                          ? 'border-lodgra-primary bg-lodgra-primary/5 text-lodgra-primary'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!canAdvanceStep1}
                onClick={() => setStep(1)}
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 1: Imóvel */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Adicionar primeiro imóvel</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Você pode adicionar mais depois.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do imóvel *
                  </label>
                  <input
                    type="text"
                    value={step2.propertyName}
                    onChange={e => setStep2(s => ({ ...s, propertyName: e.target.value }))}
                    placeholder="Ex: Apto Centro SP"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-lodgra-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={step2.city}
                    onChange={e => setStep2(s => ({ ...s, city: e.target.value }))}
                    placeholder="Ex: São Paulo"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-lodgra-primary focus:border-transparent outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moeda</label>
                    <select
                      value={step2.currency}
                      onChange={e => setStep2(s => ({ ...s, currency: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-lodgra-primary outline-none"
                    >
                      {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preço/noite
                    </label>
                    <input
                      type="number"
                      value={step2.pricePerNight}
                      onChange={e => setStep2(s => ({ ...s, pricePerNight: e.target.value }))}
                      placeholder="0,00"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-lodgra-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>← Voltar</Button>
                <Button
                  className="flex-1"
                  disabled={loading || !step2.propertyName.trim() || !step2.city.trim()}
                  onClick={handleStep2Submit}
                >
                  {loading ? 'A criar...' : <>Próximo <ChevronRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Canais */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Conectar seus canais</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Cole o link iCal de cada canal.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              <div className="space-y-4 mb-4">
                {[
                  { key: 'airbnbIcal' as const, label: '🟠 Airbnb', placeholder: 'https://www.airbnb.com/calendar/ical/...' },
                  { key: 'bookingIcal' as const, label: '🔵 Booking.com', placeholder: 'https://admin.booking.com/hotel/ical/...' },
                  { key: 'vrboIcal' as const, label: '🟢 VRBO', placeholder: 'https://www.vrbo.com/icalendar/...' },
                ].map(ch => (
                  <div key={ch.key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ch.label}</label>
                    <input
                      type="url"
                      value={step3[ch.key]}
                      onChange={e => setStep3(s => ({ ...s, [ch.key]: e.target.value }))}
                      placeholder={ch.placeholder}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-lodgra-primary focus:border-transparent outline-none text-sm"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mb-6">
                💡 Onde encontrar? No Airbnb: Calendário → Exportar Calendário → Copiar link
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleStep3Submit(true)} disabled={loading}>
                  Pular
                </Button>
                <Button className="flex-1" onClick={() => handleStep3Submit(false)} disabled={loading}>
                  {loading ? 'A sincronizar...' : <>Conectar <ChevronRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Concluído */}
          {step === 3 && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tudo pronto!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Seu imóvel <strong className="text-gray-700 dark:text-gray-200">{createdPropertyName}</strong> foi criado com sucesso.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-8 text-left space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">O que você pode fazer agora:</p>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>→ Ver suas reservas no calendário</p>
                  <p>→ Registrar despesas do imóvel</p>
                  {(step1.profileType === 'third_party' || step1.profileType === 'both') && (
                    <p>→ Gerar relatório para o proprietário</p>
                  )}
                </div>
              </div>

              <Button className="w-full" onClick={handleFinish}>
                Ir para o Dashboard →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
