'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookingSummary } from './BookingSummary'
import { Loader2, ArrowLeft } from 'lucide-react'

interface CheckoutFormProps {
  slug: string
  propertyName: string
  city?: string | null
  checkin: string
  checkout: string
  guests: number
  totalPrice: number
}

type Step = 'summary' | 'guest' | 'payment'

interface GuestData {
  name: string
  email: string
  phone: string
  country: string
}

const COUNTRIES = [
  { code: 'PT', label: 'Portugal' },
  { code: 'BR', label: 'Brasil' },
  { code: 'ES', label: 'Espanha' },
  { code: 'FR', label: 'França' },
  { code: 'DE', label: 'Alemanha' },
  { code: 'GB', label: 'Reino Unido' },
  { code: 'IT', label: 'Itália' },
  { code: 'NL', label: 'Países Baixos' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'OTHER', label: 'Outro' },
]

export function CheckoutForm({
  slug,
  propertyName,
  city,
  checkin,
  checkout,
  guests,
  totalPrice,
}: CheckoutFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('summary')
  const [guestData, setGuestData] = useState<GuestData>({
    name: '',
    email: '',
    phone: '',
    country: 'PT',
  })
  const [errors, setErrors] = useState<Partial<GuestData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function validateGuest(): boolean {
    const newErrors: Partial<GuestData> = {}
    if (!guestData.name.trim() || guestData.name.trim().split(' ').length < 2) {
      newErrors.name = 'Introduza o nome completo (nome e apelido)'
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestData.email)
    if (!emailOk) newErrors.email = 'Email inválido'
    if (!guestData.phone.trim()) newErrors.phone = 'Telefone obrigatório'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handlePayment() {
    if (!validateGuest()) {
      setStep('guest')
      return
    }
    setSubmitting(true)
    setApiError(null)

    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          checkin,
          checkout,
          num_guests: guests,
          guest_name: guestData.name.trim(),
          guest_email: guestData.email.trim(),
          guest_phone: guestData.phone.trim(),
          guest_country: guestData.country,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error || 'Erro ao processar reserva. Tente novamente.')
        setSubmitting(false)
        return
      }

      // Redirect to Stripe Checkout
      router.push(data.checkout_url)
    } catch {
      setApiError('Erro de rede. Verifique a sua ligação e tente novamente.')
      setSubmitting(false)
    }
  }

  const stepNumber = step === 'summary' ? 1 : step === 'guest' ? 2 : 3
  const steps = ['Resumo', 'Os seus dados', 'Pagamento']

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                i + 1 === stepNumber
                  ? 'bg-gray-900 text-white'
                  : i + 1 < stepNumber
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1 < stepNumber ? '✓' : i + 1}
            </div>
            <span
              className={`text-sm ${i + 1 === stepNumber ? 'font-medium text-gray-900' : 'text-gray-400'}`}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="text-gray-200 text-sm">›</span>}
          </div>
        ))}
      </div>

      {/* Step 1 — Summary */}
      {step === 'summary' && (
        <div className="space-y-4">
          <BookingSummary
            propertyName={propertyName}
            city={city}
            checkin={checkin}
            checkout={checkout}
            guests={guests}
            totalPrice={totalPrice}
          />
          <button
            onClick={() => setStep('guest')}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Continuar
          </button>
          <button
            onClick={() => router.push(`/p/${slug}`)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Alterar datas
          </button>
        </div>
      )}

      {/* Step 2 — Guest details */}
      {step === 'guest' && (
        <div className="space-y-4">
          <BookingSummary
            propertyName={propertyName}
            city={city}
            checkin={checkin}
            checkout={checkout}
            guests={guests}
            totalPrice={totalPrice}
            compact
          />

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo *
              </label>
              <input
                type="text"
                value={guestData.name}
                onChange={(e) => setGuestData((d) => ({ ...d, name: e.target.value }))}
                placeholder="João Silva"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                autoComplete="name"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={guestData.email}
                onChange={(e) => setGuestData((d) => ({ ...d, email: e.target.value }))}
                placeholder="joao@exemplo.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Usaremos este número para enviar a confirmação do seu pagamento via SMS.
              </p>
              <input
                type="tel"
                value={guestData.phone}
                onChange={(e) => setGuestData((d) => ({ ...d, phone: e.target.value }))}
                placeholder="+351 912 345 678"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                autoComplete="tel"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                País
              </label>
              <select
                value={guestData.country}
                onChange={(e) => setGuestData((d) => ({ ...d, country: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('summary')}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
            <button
              onClick={() => {
                if (validateGuest()) setStep('payment')
              }}
              className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Payment */}
      {step === 'payment' && (
        <div className="space-y-4">
          <BookingSummary
            propertyName={propertyName}
            city={city}
            checkin={checkin}
            checkout={checkout}
            guests={guests}
            totalPrice={totalPrice}
            compact
          />

          <div className="rounded-lg border border-gray-200 p-4 space-y-2 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Resumo dos seus dados</p>
            <p>{guestData.name}</p>
            <p>{guestData.email}</p>
            <p>{guestData.phone}</p>
          </div>

          {apiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Ao clicar em Pagar, será redireccionado para a página segura de pagamento do Stripe.
          </p>

          <button
            onClick={handlePayment}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A processar...
              </>
            ) : (
              `Pagar ${totalPrice.toFixed(2)} €`
            )}
          </button>

          <button
            onClick={() => setStep('guest')}
            disabled={submitting}
            className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Corrigir dados
          </button>
        </div>
      )}
    </div>
  )
}
