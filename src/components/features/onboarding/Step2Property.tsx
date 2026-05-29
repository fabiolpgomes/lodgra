'use client'

import { useState } from 'react'
import { Home, Loader2, Info, TrendingUp } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import Link from 'next/link'

interface Props {
  onNext: (propertyId: string) => void
  onSkip: () => void
  onContinueExisting?: () => void
  onboardingSessionId?: string
}

export function Step2Property({ onNext, onSkip, onContinueExisting, onboardingSessionId }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Brasil')
  const [basePrice, setBasePrice] = useState('')
  const [maxGuests, setMaxGuests] = useState('2')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [limitReached, setLimitReached] = useState<{ limit: number; plan: string; extraPropertyPrice?: number } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !city.trim()) return
    setLoading(true)
    setError('')
    setLimitReached(null)

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          city: city.trim(),
          country: country.trim() || 'Brasil',
          currency: country.trim().toLowerCase() === 'brasil' ? 'BRL' : 'EUR',
          base_price: basePrice ? Number(basePrice) : 0,
          max_guests: Number(maxGuests) || 2,
          session_id: onboardingSessionId,
        }),
      })
      const data = await res.json()

      if (res.status === 403 && data.error === 'property_limit_reached') {
        setLimitReached({ limit: data.limit, plan: data.plan, extraPropertyPrice: data.extraPropertyPrice })
        return
      }

      if (!res.ok) {
        setError(data.error || 'Erro ao criar imóvel')
        return
      }

      onNext(data.id)
    } catch {
      setError('Erro de ligação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-green-100 rounded-full">
          <Home className="h-10 w-10 text-green-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
        Adicione o seu primeiro imóvel
      </h2>
      <p className="text-gray-600 text-center text-sm mb-6">
        Estes dados mínimos colocam o imóvel na sua página pública de reservas.
      </p>

      {/* Dica */}
      <div className="flex gap-2 bg-brand-50 border border-brand-100 rounded-lg p-3 mb-6">
        <Info className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-700">
          Um imóvel pode ter vários anúncios — por exemplo o mesmo apartamento anunciado no Airbnb e no Booking ao mesmo tempo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="property-name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome do imóvel <span className="text-red-500">*</span>
          </Label>
          <Input
            id="property-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Apartamento Lisboa Centro"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Use um nome que o ajude a identificar facilmente.</p>
        </div>

        <div>
          <Label htmlFor="property-address" className="block text-sm font-medium text-gray-700 mb-1">
            Endereço <span className="text-gray-500">(opcional)</span>
          </Label>
          <Input
            id="property-address"
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Ex: Rua Augusta, 100, Lisboa"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="property-city" className="block text-sm font-medium text-gray-700 mb-1">
              Cidade <span className="text-red-500">*</span>
            </Label>
            <Input
              id="property-city"
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Ex: Rio de Janeiro"
              required
            />
          </div>

          <div>
            <Label htmlFor="property-country" className="block text-sm font-medium text-gray-700 mb-1">
              País
            </Label>
            <Input
              id="property-country"
              type="text"
              value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="Ex: Brasil"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="property-price" className="block text-sm font-medium text-gray-700 mb-1">
              Diária base <span className="text-gray-500">(opcional)</span>
            </Label>
            <Input
              id="property-price"
              type="number"
              min="0"
              step="1"
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
              placeholder="Ex: 350"
            />
          </div>

          <div>
            <Label htmlFor="property-guests" className="block text-sm font-medium text-gray-700 mb-1">
              Hóspedes
            </Label>
            <Input
              id="property-guests"
              type="number"
              min="1"
              step="1"
              value={maxGuests}
              onChange={e => setMaxGuests(e.target.value)}
            />
          </div>
        </div>

        {limitReached && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Limite de {limitReached.limit} {limitReached.limit === 1 ? 'propriedade' : 'propriedades'} atingido.
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Adicione uma propriedade extra por R${limitReached.extraPropertyPrice ?? 49}/mês ou faça upgrade do plano.{' '}
                <Link href="/#pricing" className="font-medium underline hover:text-amber-900">Ver planos</Link>
              </p>
              {onContinueExisting && (
                <button
                  type="button"
                  onClick={onContinueExisting}
                  className="text-sm font-medium text-amber-900 underline mt-2"
                >
                  Continuar com imóvel existente
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={loading || !name.trim() || !city.trim()}
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Publicar imóvel e continuar →
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          className="w-full text-sm text-gray-500"
        >
          Saltar por agora
        </Button>
      </form>
    </div>
  )
}
