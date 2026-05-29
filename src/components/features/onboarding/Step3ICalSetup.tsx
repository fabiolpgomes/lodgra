'use client'

import { useState } from 'react'
import { RefreshCcw, Loader2, CheckCircle, ExternalLink, Info } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'

interface Props {
  propertyId?: string
  onFinish: () => void
  checkoutLoading?: boolean
  checkoutError?: string | null
  onboardingSessionId?: string
}

const PLATFORM_INSTRUCTIONS = [
  {
    name: 'Airbnb',
    emoji: '🏠',
    steps: 'Gerir anúncio → Disponibilidade → Sincronizar calendários → Exportar calendário → Copiar link',
  },
  {
    name: 'Booking.com',
    emoji: '🔵',
    steps: 'Extranet → Calendário → Sync & export → iCal → Copiar URL',
  },
  {
    name: 'VRBO / Expedia',
    emoji: '✈️',
    steps: 'Dashboard → Calendário → Exportar → Copiar link iCal',
  },
]

export function Step3ICalSetup({ propertyId, onFinish, checkoutLoading, checkoutError, onboardingSessionId }: Props) {
  const [icalUrl, setIcalUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!icalUrl.trim() || !propertyId) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding/ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          ical_url: icalUrl.trim(),
          session_id: onboardingSessionId,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao guardar iCal')
        return
      }

      setSaved(true)
      setTimeout(onFinish, 2000)
    } catch {
      setError('Erro de ligação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (saved) {
    return (
      <div className="text-center py-8">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-green-100 rounded-full">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tudo configurado!</h2>
        <p className="text-gray-500">A sincronização vai começar em breve.</p>
        <p className="text-gray-400 text-sm mt-2">A redirecionar para o painel...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-purple-100 rounded-full">
          <RefreshCcw className="h-10 w-10 text-purple-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
        Ligar calendário iCal
      </h2>
      <p className="text-gray-500 text-center text-sm mb-6">
        Sincronize as reservas do Airbnb, Booking ou outra plataforma automaticamente.
      </p>

      {/* Dica */}
      <div className="flex gap-2 bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4">
        <Info className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
        <p className="text-xs text-purple-700">
          O URL iCal permite importar reservas automaticamente, sem precisar de inserir manualmente cada reserva.
        </p>
      </div>

      {/* Instruções por plataforma */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShowInstructions(!showInstructions)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4 px-0"
      >
        <ExternalLink className="h-4 w-4" />
        {showInstructions ? 'Ocultar instruções' : 'Como encontrar o URL iCal?'}
      </Button>

      {showInstructions && (
        <div className="space-y-2 mb-4">
          {PLATFORM_INSTRUCTIONS.map(p => (
            <div key={p.name} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-1">{p.emoji} {p.name}</p>
              <p className="text-xs text-gray-500">{p.steps}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Label htmlFor="ical-url" className="block text-sm font-medium text-gray-700 mb-1">
            URL iCal
          </Label>
          <Input
            id="ical-url"
            type="url"
            value={icalUrl}
            onChange={e => setIcalUrl(e.target.value)}
            placeholder="https://www.airbnb.com/calendar/ical/..."
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {checkoutError && (
          <Alert variant="destructive">
            <AlertDescription>{checkoutError}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={loading || checkoutLoading || !icalUrl.trim() || !propertyId}
          className="w-full"
        >
          {(loading || checkoutLoading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {checkoutLoading ? 'A finalizar...' : 'Ligar calendário e ver página'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onFinish}
          disabled={checkoutLoading}
          className="w-full text-sm text-gray-400"
        >
          {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Saltar e ver página agora'}
        </Button>
      </form>
    </div>
  )
}
