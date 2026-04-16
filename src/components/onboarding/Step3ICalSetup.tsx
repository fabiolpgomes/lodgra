'use client'

import { useState } from 'react'
import { RefreshCcw, Loader2, CheckCircle, ExternalLink, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  propertyId?: string
  onFinish: () => void
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

export function Step3ICalSetup({ propertyId, onFinish }: Props) {
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
      const supabase = createClient()

      // Obter organization_id do usuário
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
        .single()

      if (!profile?.organization_id) {
        setError('Organização não encontrada')
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('property_listings')
        .insert({
          property_id: propertyId,
          platform_id: null,
          ical_url: icalUrl.trim(),
          is_active: true,
          sync_enabled: true,
          organization_id: profile.organization_id,
        })

      if (insertError) {
        setError(insertError.message)
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

        <Button
          type="submit"
          disabled={loading || !icalUrl.trim() || !propertyId}
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Ligar e ir para o painel →
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onFinish}
          className="w-full text-sm text-gray-400"
        >
          Saltar — configurar mais tarde em Propriedades
        </Button>
      </form>
    </div>
  )
}
